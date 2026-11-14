<script setup lang="ts">
import type { CaptchaData, CaptchaDataResponse, SliderCaptchaExpose, TrailPoint, VerifyResult } from './types'
import { computed, ref } from 'vue'
import sliderCaptchaApi from '@/service/api/identity/sliderCaptcha'
import { spSliderCaptchaProps } from './props'
import styles from './SliderCaptcha.module.scss'

const props = defineProps(spSliderCaptchaProps)

const emit = defineEmits<{
  success: [token: string]
  fail: [reason: number | string]
  locked: [message: string]
  close: []
}>()

// ========== 状态管理 ==========
const show = ref(false)
const loading = ref(false)
const verifying = ref(false)
const captchaData = ref<CaptchaData | null>(null)
const loadTime = ref(0)

// 滑块状态
const sliderX = ref(0)
const isDragging = ref(false)
const startX = ref(0)
const startY = ref(0)
const trail = ref<TrailPoint[]>([])
const trailStartTime = ref(0)

// 验证结果状态
const verifyStatus = ref<'idle' | 'success' | 'fail' | 'locked'>('idle')
const verifyMessage = ref('')

// Promise 回调
let resolveVerify: ((token: string) => void) | null = null
let rejectVerify: ((error: Error) => void) | null = null

// ========== 计算属性 ==========
const sliderSize = computed(() => props.sliderWidth + props.protrusionRadius * 2)
const maxSliderX = computed(() => props.width - sliderSize.value)
const clampedSliderX = computed(() => Math.max(0, Math.min(sliderX.value, maxSliderX.value)))

// ========== 工具函数 ==========
function clearPromiseCallbacks() {
  resolveVerify = null
  rejectVerify = null
}

function resetSlider() {
  sliderX.value = 0
  trail.value = []
}

function resetVerifyState() {
  resetSlider()
  verifyStatus.value = 'idle'
  verifyMessage.value = ''
}

function isExpired() {
  return Date.now() - loadTime.value > props.captchaExpiration * 1000
}

function isVerifyResult(data: unknown): data is VerifyResult {
  return typeof data === 'object' && data !== null && 'success' in data
}

function getFailMessage(reason: number | string): string {
  const messages: Record<number | string, string> = {
    0: '验证失败，请重试',
    1: '验证码不存在',
    2: '验证码已过期',
    3: '滑块位置错误',
    4: '轨迹验证失败',
    5: '参数错误',
    6: '服务异常',
    tooslow: '滑动过慢，请重试',
    toofast: '滑动过快，请重试',
    locked: '操作过于频繁，请稍后再试',
  }
  return messages[reason] || '验证失败，请重试'
}

// ========== 核心业务逻辑 ==========
async function loadCaptcha() {
  loading.value = true
  try {
    const result = await sliderCaptchaApi.getCaptcha()
    if (result.isSuccess && result.data) {
      const data = result.data as CaptchaDataResponse
      captchaData.value = {
        key: data.key || data.Key || data.id || data.Id || '',
        background: data.background || data.Background || data.backgroundimage || data.BackgroundImage || '',
        slider: data.slider || data.Slider || data.sliderimage || data.SliderImage || '',
        y: data.y ?? data.Y ?? data.slidery ?? data.SliderY ?? 0,
      }
      loadTime.value = Date.now()
    }
    else {
      verifyMessage.value = '验证码加载失败'
      verifyStatus.value = 'fail'
    }
  }
  catch {
    verifyMessage.value = '验证码加载失败'
    verifyStatus.value = 'fail'
  }
  finally {
    loading.value = false
  }
}

async function refreshCaptcha() {
  resetVerifyState()
  await loadCaptcha()
}

function handleVerifyFail(reason: number | string, message?: string) {
  const isLocked = reason === 7 || reason === 'locked'
  if (isLocked) {
    verifyStatus.value = 'locked'
    verifyMessage.value = message || '操作过于频繁，请稍后再试'
    emit('locked', verifyMessage.value)
    rejectVerify?.(new Error(verifyMessage.value))
    clearPromiseCallbacks()
    return
  }

  verifyStatus.value = 'fail'
  verifyMessage.value = message || getFailMessage(reason)
  emit('fail', reason)

  if (isExpired()) {
    refreshCaptcha()
  }
  else {
    setTimeout(resetSlider, 300)
    setTimeout(resetVerifyState, 1500)
  }
}

function handleVerifySuccess(token: string) {
  verifyStatus.value = 'success'
  emit('success', token)
  resolveVerify?.(token)
  clearPromiseCallbacks()
  if (props.autoClose) {
    setTimeout(close, props.successDuration)
  }
}

function handleVerifyResult(result: VerifyResult) {
  if (result.success) {
    handleVerifySuccess(result.verifytoken || '')
  }
  else {
    handleVerifyFail(result.reason || 0, result.message)
  }
}

async function submitVerify() {
  if (!captchaData.value)
    return

  verifying.value = true
  const sliderTime = trail.value.at(-1)?.t ?? 0
  const slideX = Math.round(clampedSliderX.value + props.protrusionRadius)

  try {
    const result = await sliderCaptchaApi.verify(
      captchaData.value.key,
      slideX,
      sliderTime,
      trail.value,
    )

    if (result.isSuccess && isVerifyResult(result.data)) {
      handleVerifyResult(result.data)
    }
    else {
      handleVerifyFail(6)
    }
  }
  catch {
    handleVerifyFail(6)
  }
  finally {
    verifying.value = false
  }
}

// ========== 触摸事件处理（兼容小程序和 H5） ==========
function onTouchStart(e: TouchEvent) {
  if (verifyStatus.value !== 'idle' || !captchaData.value)
    return

  const touch = e.touches[0]
  isDragging.value = true
  startX.value = touch.clientX - sliderX.value
  startY.value = touch.clientY
  trailStartTime.value = Date.now()
  trail.value = [{ x: Math.round(sliderX.value), y: 0, t: 0 }]
}

function onTouchMove(e: TouchEvent) {
  if (!isDragging.value)
    return

  e.preventDefault?.()
  const touch = e.touches[0]
  sliderX.value = Math.max(0, Math.min(touch.clientX - startX.value, maxSliderX.value))

  // 节流采集轨迹点（约 16ms 间隔）
  const now = Date.now()
  const lastPoint = trail.value.at(-1)
  if (trail.value.length < props.maxTrailPoints && (!lastPoint || now - (trailStartTime.value + lastPoint.t) > 16)) {
    trail.value.push({
      x: Math.round(sliderX.value),
      y: Math.round(touch.clientY - startY.value),
      t: now - trailStartTime.value,
    })
  }
}

async function onTouchEnd() {
  if (!isDragging.value)
    return

  isDragging.value = false
  if (captchaData.value && trail.value.length > 0) {
    await submitVerify()
  }
}

// ========== 公开方法 ==========
function open() {
  show.value = true
  resetVerifyState()
  loadCaptcha()
}

function close() {
  show.value = false
  emit('close')
  if (rejectVerify) {
    rejectVerify(new Error('验证已取消'))
    clearPromiseCallbacks()
  }
}

function verify(): Promise<string> {
  return new Promise((resolve, reject) => {
    resolveVerify = resolve
    rejectVerify = reject
    open()
  })
}

defineExpose<SliderCaptchaExpose>({ verify, close })
</script>

<template>
  <view v-if="show" :class="styles['captcha-overlay']" :style="{ padding: '20px' }">
    <view :class="styles['captcha-dialog']" :style="{ maxWidth: `${width + 40}px` }">
      <!-- 头部 -->
      <view :class="styles['captcha-header']" :style="{ padding: '12px 12px 0' }">
        <text :class="styles['captcha-title']" :style="{ fontSize: '15px' }">
          {{ title }}
        </text>
        <view :class="styles['captcha-close']" :style="{ fontSize: '20px', padding: '0 4px' }" @click="close">
          ×
        </view>
      </view>

      <!-- 验证区域 -->
      <view
        :class="styles['captcha-area']"
        :style="{
          width: `${width}px`,
          height: `${height}px`,
          margin: '8px auto 0',
          borderRadius: '8px',
          border: '1px solid #e0e0e0',
        }"
      >
        <!-- 加载中 -->
        <view v-if="loading" :class="styles['captcha-loading']">
          <text>加载中...</text>
        </view>

        <!-- 验证码图片 -->
        <template v-else-if="captchaData">
          <image :src="captchaData.background" :class="styles['captcha-bg']" mode="aspectFill" draggable="false" />

          <!-- 刷新按钮 -->
          <view
            :class="[styles['refresh-btn'], (verifying || verifyStatus === 'locked') && styles.disabled]"
            :style="{ top: '8px', right: '8px', width: '28px', height: '28px', fontSize: '16px' }"
            @click="(!verifying && verifyStatus !== 'locked') && refreshCaptcha()"
          >
            ↻
          </view>

          <!-- 滑块图 -->
          <image
            :src="captchaData.slider"
            :class="styles['captcha-slider']"
            :style="{
              top: `${captchaData.y - protrusionRadius}px`,
              left: `${clampedSliderX}px`,
              width: `${sliderSize}px`,
              height: `${sliderSize}px`,
            }"
            mode="aspectFit"
            draggable="false"
          />

          <!-- 验证结果遮罩 -->
          <view
            v-if="verifyStatus === 'fail' || verifyStatus === 'locked'"
            :class="[styles['captcha-result-mask'], styles[`is-${verifyStatus}`]]"
          >
            <view :class="styles['result-content']">
              <text :class="[styles['result-icon'], styles[verifyStatus === 'fail' ? 'is-fail' : 'is-locked']]" :style="{ fontSize: '32px', marginBottom: '8px' }">
                {{ verifyStatus === 'fail' ? '✕' : '🔒' }}
              </text>
              <text :class="styles['result-text']" :style="{ fontSize: '13px' }">
                {{ verifyMessage }}
              </text>
            </view>
          </view>
        </template>

        <!-- 加载失败 -->
        <view v-else :class="styles['captcha-error']">
          <text>加载失败</text>
          <text :class="styles['retry-text']" @click="refreshCaptcha">
            重试
          </text>
        </view>
      </view>

      <!-- 滑块轨道 -->
      <view
        :class="styles['slider-track']"
        :style="{
          width: `${width}px`,
          height: '42px',
          margin: '16px auto 12px',
          borderRadius: '8px',
          border: '1px solid #e0e0e0',
        }"
      >
        <view v-if="sliderX === 0 && verifyStatus === 'idle'" :class="styles['slider-bg']">
          <text :class="styles['slider-hint']" :style="{ fontSize: '13px' }">
            向右拖动完成验证
          </text>
        </view>

        <view :class="styles['slider-fill']" :style="{ width: `${clampedSliderX + handleSize / 2}px` }" />

        <!-- 滑块手柄（使用 view + touch 事件，兼容小程序） -->
        <view
          :class="[styles['slider-handle'], isDragging && styles['is-dragging'], verifyStatus === 'success' && styles['is-success']]"
          :style="{
            width: `${handleSize}px`,
            height: `${handleSize}px`,
            transform: `translateX(${clampedSliderX}px)`,
          }"
          @touchstart="onTouchStart"
          @touchmove="onTouchMove"
          @touchend="onTouchEnd"
          @touchcancel="onTouchEnd"
        >
          <text
            :class="[styles['handle-icon'], verifyStatus === 'success' && styles['is-success']]"
            :style="{ fontSize: '18px' }"
          >
            {{ verifyStatus === 'success' ? '✓' : verifying ? '⟳' : '›' }}
          </text>
        </view>
      </view>
    </view>
  </view>
</template>
