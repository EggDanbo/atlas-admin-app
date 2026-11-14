/** 从环境变量读取应用配置 */
// Taro 通过 webpack DefinePlugin 在编译时替换 process.env.TARO_APP_* 字面量

const LEADING_SLASH_RE = /^\//

export const appConfig = {
  /** API 地址 */
  get apiUrl(): string {
    return process.env.TARO_APP_API_URL || ''
  },

  /** API 前缀 */
  get apiUrlPrefix(): string {
    return process.env.TARO_APP_API_URL_PREFIX || '/api'
  },

  /** 认证模块前缀 */
  get apiAuthPrefix(): string {
    return process.env.TARO_APP_API_AUTH_PREFIX || 'mis'
  },

  /** 是否启用 Mock */
  get useMock(): boolean {
    return process.env.TARO_APP_USE_MOCK === 'true'
  },

  /** 独立文件预览服务地址（留空=内置预览页，仅开发模式有效） */
  get filePreviewBase(): string {
    return process.env.TARO_APP_FILE_PREVIEW_BASE || ''
  },

  /** 视频流人脸活体检测（H5 端 YuNet+MiniFASNet 静默活体；小程序端无 WASM 环境自动降级服务端判定） */
  get faceLivenessEnable(): boolean {
    return process.env.TARO_APP_FACE_LIVENESS_ENABLE !== 'false'
  },

  /**
   * 活体模型资源目录（须含 ort.wasm.min.mjs、ort-wasm-simd-threaded.mjs/.wasm、yunet.onnx、两个 MiniFASNet onnx）；
   *  与 H5 页面不同域时，该静态目录需配置 CORS（module 脚本跨域加载强制校验）
   */
  get faceLivenessModelUrl(): string {
    return process.env.TARO_APP_FACE_LIVENESS_MODEL_URL || ''
  },

  /** 完整 API Base URL */
  get baseUrl(): string {
    if (appConfig.apiUrl) {
      const prefix = appConfig.apiUrlPrefix.replace(LEADING_SLASH_RE, '')
      return `${appConfig.apiUrl}/${prefix}`
    }
    return appConfig.apiUrlPrefix
  },
}
