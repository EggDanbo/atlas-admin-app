<script setup lang="ts">
import { IconFont, Loading } from '@nutui/icons-vue-taro'
import { nextTick, onBeforeUnmount, onMounted, ref } from 'vue'
import { profile as profileApi } from '@/service/api/identity'
import { file as fileApi } from '@/service/api/misc'
import styles from './FaceStreamCapture.module.scss'

const emit = defineEmits<{
  'success': []
  'cancel': []
  'switch-photo': []
}>()

const videoBoxRef = ref<any>(null)
const phase = ref<'init' | 'ready' | 'submitting' | 'success' | 'failed'>('init')
const cameraError = ref(false)
const statusText = ref('请正对摄像头，面部置于取景框内')
const resultText = ref<string | null>(null)
let video: HTMLVideoElement | null = null
let stream: MediaStream | null = null

onMounted(() => {
  if (typeof navigator === 'undefined' || !navigator.mediaDevices?.getUserMedia) {
    cameraError.value = true
    return
  }

  navigator.mediaDevices
    .getUserMedia({
      audio: false,
      video: {
        // 不用 exact: 'user'，部分安卓机/外接摄像头会直接 OverconstrainedError
        facingMode: 'user',
        width: { ideal: 1280 },
        height: { ideal: 720 },
      },
    })
    .then((mediaStream) => {
      stream = mediaStream
      nextTick(() => {
        const el = document.createElement('video')
        el.setAttribute('playsinline', '')
        el.setAttribute('webkit-playsinline', '')
        el.muted = true
        el.autoplay = true
        el.style.cssText = 'width:100vw;height:100vh;object-fit:cover;transform:scaleX(-1);'
        const box = videoBoxRef.value?.$el ?? videoBoxRef.value
        if (!box) {
          mediaStream.getTracks().forEach(track => track.stop())
          cameraError.value = true
          return
        }
        box.appendChild(el)
        el.srcObject = mediaStream
        video = el
        el.play().catch(() => {
          cleanup()
          cameraError.value = true
        })
        phase.value = 'ready'
      })
    })
    .catch((err) => {
      console.log('视频流摄像头不可用', err)
      cameraError.value = true
    })
})

onBeforeUnmount(() => {
  cleanup()
})

function cleanup() {
  stream?.getTracks().forEach(track => track.stop())
  stream = null
  video?.remove()
  video = null
}

/** 抓取登记帧（base64，不带 data:image 前缀）；镜像处理与考勤识别帧保持一致 */
function captureFrame(): string {
  const vw = video!.videoWidth
  const vh = video!.videoHeight
  const width = Math.min(640, vw)
  const height = Math.round(vh * (width / vw))
  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  const ctx = canvas.getContext('2d')!
  ctx.translate(width, 0)
  ctx.scale(-1, 1)
  ctx.drawImage(video!, 0, 0, width, height)
  return canvas.toDataURL('image/jpeg', 0.85).split(',')[1]
}

function markFail(message: string) {
  if (phase.value !== 'submitting')
    return
  phase.value = 'failed'
  resultText.value = message
}

async function submit() {
  if (phase.value !== 'ready' || !video?.videoWidth) {
    statusText.value = '相机画面尚未准备完成，请稍候'
    return
  }

  phase.value = 'submitting'
  resultText.value = '照片上传中，请稍候...'

  const upload = await fileApi.uploadImageTemp({ data: captureFrame() }).catch(() => null)
  if (!upload?.isSuccess || !upload.data) {
    markFail('照片上传失败，请重试')
    return
  }

  const update = await profileApi.updateFace({ image_pic: upload.data.id }).catch(() => null)
  if (!update?.isSuccess) {
    markFail(update?.message || '人脸照片不合规，请重新拍摄')
    return
  }

  phase.value = 'success'
  resultText.value = '登记成功'
  setTimeout(() => {
    cleanup()
    emit('success')
  }, 1000)
}

function restart() {
  phase.value = 'ready'
  resultText.value = null
  statusText.value = '请正对摄像头，面部置于取景框内'
}

function handleCancel() {
  cleanup()
  emit('cancel')
}

function handleSwitchPhoto() {
  cleanup()
  emit('switch-photo')
}
</script>

<template>
  <view :class="styles.stream_box">
    <view v-if="cameraError" :class="styles.camera_error">
      <view :class="styles.on1">
        相机权限被拒绝或不可用，请尝试如下操作：
      </view>
      <view>· 刷新页面后重试；</view>
      <view>· 在系统中检测当前App或浏览器的相机权限是否被禁用；</view>
      <view :class="styles.btns">
        <nut-button :class="styles.btn_error" @click="handleSwitchPhoto">
          切换拍照上传
        </nut-button>
      </view>
    </view>

    <template v-else>
      <view ref="videoBoxRef" :class="styles.video_box" />
      <view :class="styles.mask" />

      <view :class="styles.status_bar">
        <view :class="styles.status_text">
          {{ statusText }}
        </view>
      </view>

      <view v-if="phase === 'ready'" :class="styles.shutter_bar">
        <nut-button type="primary" :class="styles.btn_primary" @click="submit">
          开始采集
        </nut-button>
        <nut-button :class="styles.btn_switch" @click="handleSwitchPhoto">
          切换拍照上传
        </nut-button>
      </view>

      <view :class="styles.close_bar">
        <nut-button :class="styles.btn_white" @click="handleCancel">
          取消
        </nut-button>
      </view>

      <view v-if="phase === 'submitting' || phase === 'success' || phase === 'failed'" :class="styles.result_errors">
        <view :class="styles.content">
          <Loading v-if="phase === 'submitting'" size="80" color="#999999" />
          <IconFont
            v-else
            :name="phase === 'success' ? 'checked' : 'issue'"
            size="80"
            :color="phase === 'success' ? '#57842D' : '#F14B5E'"
          />
          <view :class="styles.text">
            {{ resultText }}
          </view>
        </view>
        <view v-if="phase === 'failed'" :class="styles.footer_btn">
          <nut-button :class="styles.btn_retry" @click="restart">
            重新拍摄
          </nut-button>
          <nut-button :class="styles.btn_retry" @click="handleSwitchPhoto">
            切换拍照上传
          </nut-button>
        </view>
      </view>
    </template>
  </view>
</template>
