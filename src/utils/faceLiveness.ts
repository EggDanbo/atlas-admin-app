import { appConfig } from '@/constants/config'

// 前端静默活体：YuNet 人脸检测 -> 人脸框 x cropScale 裁剪 -> MiniFASNet 双模型集成（Silent-Face-Anti-Spoofing）。
// 管线与后端 Cv 库 MiniFasNetLivenessDetector 完全对齐（80x80、BGR、0-255、NCHW、暗光 Gamma 提亮、
// softmax 真人概率双模型取平均）；必须按人脸框裁剪——摄像头翻拍的摩尔纹在中心大区域的高倍降采样下会被抹掉导致漏网。
// 仅 H5 端可用（WASM + DOM canvas）；小程序端 isLivenessEnabled 恒为 false，走帧差预检 + 服务端判定降级。

const MODEL_BASE = appConfig.faceLivenessModelUrl
// 活体模型与各自的人脸框裁剪外扩倍数（与后端 appsettings 对应）
const LIVENESS_MODELS = [
  { file: '2.7_80x80_MiniFASNetV2.onnx', cropScale: 2.7 },
  { file: '4.0_80x80_MiniFASNetV1SE.onnx', cropScale: 4.0 },
]
// 人脸检测模型（与后端同款 YuNet 2026may，230KB）
const DETECTOR_FILE = 'yunet.onnx'
// YuNet 检测输入尺寸与解码参数（对齐后端 FaceRecognitionOptions 默认值）
const DETECTOR_INPUT = 320
const DETECTOR_STRIDES = [8, 16, 32]
// 检测置信度阈值：视频压缩帧质量低于拍照，对齐线上 DetectionScoreThreshold=0.7 适当放宽
const DETECTOR_SCORE = 0.6
const DETECTOR_NMS = 0.3
// 与后端 LowLightMeanThreshold 一致
const LOW_LIGHT_MEAN = 130

/** 活体判定参数统一出口：调参只改环境变量/此处默认值 */
export function getLivenessParams() {
  return {
    threshold: 0.75,
    passFrames: 3,
    fastPathScore: 0.95,
    sampleInterval: 400,
    maxLowScores: 6,
  }
}

type LivenessState = 'idle' | 'loading' | 'ready' | 'unavailable'
let state: LivenessState = 'idle'
let pending: Promise<boolean> | null = null
let detectorSession: any = null
let livenessSessions: Array<{ session: any, cropScale: number }> = []
let ortScriptPromise: Promise<any> | null = null
/** 最近一次加载/推理失败的原因，供界面展示排查 */
let lastError: string | null = null

export function getLivenessError(): string | null {
  return lastError
}

const isH5 = typeof process !== 'undefined' && process.env.TARO_ENV === 'h5'

const detectCanvas = isH5 && typeof document !== 'undefined' ? document.createElement('canvas') : null
if (detectCanvas) {
  detectCanvas.width = DETECTOR_INPUT
  detectCanvas.height = DETECTOR_INPUT
}
const detectCtx: CanvasRenderingContext2D | null = detectCanvas
  ? detectCanvas.getContext('2d', { willReadFrequently: true })
  : null
const cropCanvas = isH5 && typeof document !== 'undefined' ? document.createElement('canvas') : null
if (cropCanvas) {
  cropCanvas.width = 80
  cropCanvas.height = 80
}
const cropCtx: CanvasRenderingContext2D | null = cropCanvas
  ? cropCanvas.getContext('2d', { willReadFrequently: true })
  : null

export function isLivenessEnabled(): boolean {
  // 小程序端没有 WASM/DOM 环境，直接视为不可用，走帧差+服务端活体降级
  return isH5 && appConfig.faceLivenessEnable && !!MODEL_BASE
}

// module 脚本桥接加载 ESM 入口：企业微信 WebView 的传统脚本不支持动态 import（UMD 版不可用）；
// wasm 专用构建加载同目录的 ort-wasm-simd-threaded.mjs/.wasm，全功能构建会额外请求 .jsep. 变体（约 20MB）。
function loadOrtModule(): Promise<any> {
  if (typeof window !== 'undefined' && (window as any).ort)
    return Promise.resolve((window as any).ort)
  if (ortScriptPromise)
    return ortScriptPromise
  ortScriptPromise = new Promise((resolve, reject) => {
    const script = document.createElement('script')
    script.type = 'module'
    script.textContent
      = `import * as ort from '${MODEL_BASE}/ort.wasm.min.mjs';`
        + `window.ort = ort;window.dispatchEvent(new Event('ort-module-ready'));`
    const timer = setTimeout(() => {
      window.removeEventListener('ort-module-ready', onReady)
      reject(new Error('ort 模块加载超时'))
    }, 20000)
    function onReady() {
      clearTimeout(timer)
      resolve((window as any).ort)
    }
    window.addEventListener('ort-module-ready', onReady, { once: true })
    script.onerror = () => {
      clearTimeout(timer)
      window.removeEventListener('ort-module-ready', onReady)
      ortScriptPromise = null
      reject(new Error('ort.wasm.min.mjs 脚本执行失败'))
    }
    document.head.appendChild(script)
  })
  return ortScriptPromise
}

/** 预加载活体模型；resolve true 表示可用，false 表示不可用（调用方降级）。结果会话级缓存。 */
export function preloadLiveness(): Promise<boolean> {
  if (state === 'ready')
    return Promise.resolve(true)
  if (state === 'unavailable')
    return Promise.resolve(false)
  if (pending)
    return pending
  if (!isLivenessEnabled() || typeof WebAssembly === 'undefined') {
    state = 'unavailable'
    return Promise.resolve(false)
  }
  state = 'loading'
  pending = (async () => {
    try {
      const ort = await loadOrtModule()
      // wasm 二进制与入口同目录
      ort.env.wasm.wasmPaths = `${MODEL_BASE}/`
      const load = async (file: string) => {
        const res = await fetch(`${MODEL_BASE}/${file}`)
        if (!res.ok)
          throw new Error(`模型下载失败 ${file} ${res.status}`)
        const buffer = new Uint8Array(await res.arrayBuffer())
        return ort.InferenceSession.create(buffer, { executionProviders: ['wasm'] })
      }
      detectorSession = await load(DETECTOR_FILE)
      const loaded: typeof livenessSessions = []
      for (const m of LIVENESS_MODELS)
        loaded.push({ session: await load(m.file), cropScale: m.cropScale })
      livenessSessions = loaded
      state = 'ready'
      return true
    }
    catch (e: any) {
      console.log('前端活体模型加载失败，降级为服务端判定', e)
      lastError = (e && e.message) || String(e)
      state = 'unavailable'
      return false
    }
    finally {
      pending = null
    }
  })()
  return pending
}

/** IoU（NMS 用） */
function iou(a: number[], b: number[]): number {
  const x1 = Math.max(a[0], b[0])
  const y1 = Math.max(a[1], b[1])
  const x2 = Math.min(a[2], b[2])
  const y2 = Math.min(a[3], b[3])
  const inter = Math.max(0, x2 - x1) * Math.max(0, y2 - y1)
  const areaA = (a[2] - a[0]) * (a[3] - a[1])
  const areaB = (b[2] - b[0]) * (b[3] - b[1])
  return inter / (areaA + areaB - inter)
}

/**
 * YuNet 后处理解码（对齐 OpenCV FaceDetectorYN）：
 * 分数 = sqrt(clamp01(cls) * clamp01(obj))；框 = ((格子+偏移)*stride 中心, exp(宽高)*stride)；NMS 后返回原图坐标人脸框
 */
async function detectFaces(video: HTMLVideoElement): Promise<number[][]> {
  const vw = video.videoWidth
  const vh = video.videoHeight
  // 保持比例 letterbox（对齐后端 DetectAll 的输入方式），并记录映射参数
  const scale = Math.min(DETECTOR_INPUT / vw, DETECTOR_INPUT / vh)
  const lw = Math.max(1, Math.round(vw * scale))
  const lh = Math.max(1, Math.round(vh * scale))
  const ox = (DETECTOR_INPUT - lw) / 2
  const oy = (DETECTOR_INPUT - lh) / 2
  detectCtx!.clearRect(0, 0, DETECTOR_INPUT, DETECTOR_INPUT)
  detectCtx!.drawImage(video, ox, oy, lw, lh)
  const data = detectCtx!.getImageData(0, 0, DETECTOR_INPUT, DETECTOR_INPUT).data

  // BGR 0-255 NCHW（对齐 FaceDetectorYN 的裸图输入）
  const plane = DETECTOR_INPUT * DETECTOR_INPUT
  const input = new Float32Array(3 * plane)
  for (let i = 0, j = 0; i < data.length; i += 4, j++) {
    input[plane + j] = data[i + 1]
    input[2 * plane + j] = data[i]
    input[j] = data[i + 2]
  }
  const out = await detectorSession.run({
    [detectorSession.inputNames[0]]: new (window as any).ort.Tensor('float32', input, [1, 3, DETECTOR_INPUT, DETECTOR_INPUT]),
  })

  const clamp01 = (x: number) => Math.min(1, Math.max(0, x))
  const dets: number[][] = []
  for (const stride of DETECTOR_STRIDES) {
    const cols = DETECTOR_INPUT / stride
    const n = cols * cols
    const cls: Float32Array = out[`cls_${stride}`].data
    const obj: Float32Array = out[`obj_${stride}`].data
    const bbox: Float32Array = out[`bbox_${stride}`].data
    for (let i = 0; i < n; i++) {
      const conf = Math.sqrt(clamp01(cls[i]) * clamp01(obj[i]))
      if (conf < DETECTOR_SCORE || !Number.isFinite(conf))
        continue
      const c = i % cols
      const r = Math.floor(i / cols)
      const cx = (c + bbox[i * 4]) * stride
      const cy = (r + bbox[i * 4 + 1]) * stride
      const w = Math.exp(bbox[i * 4 + 2]) * stride
      const h = Math.exp(bbox[i * 4 + 3]) * stride
      // letterbox 逆映射回原图坐标
      dets.push([
        (cx - w / 2 - ox) / scale,
        (cy - h / 2 - oy) / scale,
        (cx + w / 2 - ox) / scale,
        (cy + h / 2 - oy) / scale,
        conf,
      ])
    }
  }
  dets.sort((a, b) => b[4] - a[4])
  const kept: number[][] = []
  for (const d of dets) {
    if (kept.every(k => iou(k, d) < DETECTOR_NMS))
      kept.push(d)
  }
  return kept
}

/** 后端 ComputeCropRect 复刻：人脸框 x cropScale 外扩、中心对齐、越界时整体内移 */
function cropRect(vw: number, vh: number, face: number[], cropScale: number): number[] {
  const fx = face[0]
  const fy = face[1]
  const fw = face[2] - face[0]
  const fh = face[3] - face[1]
  const s = Math.min(cropScale, (vw - 1) / fw, (vh - 1) / fh)
  const cw = fw * s
  const ch = fh * s
  const cx = fx + fw / 2
  const cy = fy + fh / 2
  let left = cx - cw / 2
  let right = cx + cw / 2
  let top = cy - ch / 2
  let bottom = cy + ch / 2
  if (left < 0) {
    right -= left
    left = 0
  }
  if (right > vw - 1) {
    left -= right - vw + 1
    right = vw - 1
  }
  if (top < 0) {
    bottom -= top
    top = 0
  }
  if (bottom > vh - 1) {
    top -= bottom - vh + 1
    bottom = vh - 1
  }
  return [
    Math.max(0, left),
    Math.max(0, top),
    Math.min(vw - 1, right) - Math.max(0, left),
    Math.min(vh - 1, bottom) - Math.max(0, top),
  ]
}

/** Gamma 提亮 LUT（与后端 EnhanceLowLight 一致：均值映射到 128，指数限制 [0.45, 1)） */
function gammaLut(mean: number): Uint8Array {
  const gamma = Math.min(1, Math.max(0.45, Math.log(0.5) / Math.log(Math.max(mean, 1) / 255)))
  const lut = new Uint8Array(256)
  for (let i = 0; i < 256; i++)
    lut[i] = Math.round(255 * (i / 255) ** gamma)
  return lut
}

/** 对 video 当前帧打真人分（0~1）；无脸/多脸返回 0，推理异常返回 null（调用方降级放行由服务端兜底）。 */
export async function scoreLiveness(video: HTMLVideoElement | null): Promise<number | null> {
  if (state !== 'ready' || !detectorSession || !livenessSessions.length || !detectCtx || !cropCtx)
    return null
  if (!video || !video.videoWidth)
    return null
  try {
    const vw = video.videoWidth
    const vh = video.videoHeight
    const faces = await detectFaces(video)
    // 与后端一致：恰好一张脸才有效；无脸/多脸直接 0 分（前端提前拦截）
    if (faces.length !== 1)
      return 0

    let total = 0
    for (const { session, cropScale } of livenessSessions) {
      const [x, y, cw, ch] = cropRect(vw, vh, faces[0], cropScale)
      cropCtx.drawImage(video, x, y, cw, ch, 0, 0, 80, 80)
      let data: Uint8ClampedArray = cropCtx.getImageData(0, 0, 80, 80).data

      let sum = 0
      for (let i = 0; i < data.length; i += 4)
        sum += data[i] * 0.299 + data[i + 1] * 0.587 + data[i + 2] * 0.114
      const mean = sum / (data.length / 4)
      if (mean < LOW_LIGHT_MEAN) {
        const lut = gammaLut(mean)
        const enhanced = new Uint8ClampedArray(data)
        for (let i = 0; i < enhanced.length; i += 4) {
          enhanced[i] = lut[enhanced[i]]
          enhanced[i + 1] = lut[enhanced[i + 1]]
          enhanced[i + 2] = lut[enhanced[i + 2]]
        }
        data = enhanced
      }

      // BGR 通道顺序、0-255 不缩放、NCHW（与后端 BlobFromImage swapRB:false 一致）
      const input = new Float32Array(3 * 80 * 80)
      for (let i = 0, j = 0; i < data.length; i += 4, j++) {
        input[80 * 80 + j] = data[i + 1] // G
        input[2 * 80 * 80 + j] = data[i] // R
        input[j] = data[i + 2] // B
      }
      const output = await session.run({
        [session.inputNames[0]]: new (window as any).ort.Tensor('float32', input, [1, 3, 80, 80]),
      })
      const logits = (Object.values(output)[0] as any).data as Float32Array
      if (!logits || logits.length !== 3)
        throw new Error('活体模型输出维度无效')
      const max = Math.max(logits[0], logits[1], logits[2])
      const exp = [Math.exp(logits[0] - max), Math.exp(logits[1] - max), Math.exp(logits[2] - max)]
      total += exp[1] / (exp[0] + exp[1] + exp[2])
    }
    return total / livenessSessions.length
  }
  catch (e: any) {
    console.log('前端活体推理失败，降级为服务端判定', e)
    lastError = (e && e.message) || String(e)
    return null
  }
}
