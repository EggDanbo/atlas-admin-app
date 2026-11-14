<script setup lang="ts">
import { Check, My, Photograph, PlayCircleFill } from '@nutui/icons-vue-taro'
import Taro from '@tarojs/taro'
import { computed, ref } from 'vue'
import { AuthLayout } from '@/components/AuthLayout'
import { PageNavbar } from '@/components/PageNavbar'
import { SpFaceCamera } from '@/components/SpFaceCamera'
import { showToast } from '@/components/SpToast'
import { useAuthLoad } from '@/hooks/useAuthLoad'
import { profile as api } from '@/service/api/identity'
import { useAuthStore } from '@/stores/auth'
import FaceStreamCapture from './components/FaceStreamCapture.vue'
import styles from './index.module.scss'

const authStore = useAuthStore()

// 视频流采集仅 H5 支持，小程序直接使用拍照链路
const IS_WEAPP = process.env.TARO_ENV === 'weapp'

const faceModel = ref<FileStorage.FileResourceModel | null>(null)
const faceUtime = ref('')
const captureMode = ref<'photo' | 'stream'>('photo')
const method = ref<'photo' | 'stream'>(IS_WEAPP ? 'photo' : 'stream')
const cameraRef = ref<any>(null)

const hasFace = computed(() => !!faceModel.value)
const faceUrl = computed(() => faceModel.value?.url || '')
/** 采集时间去掉年份，适合放在状态卡的一行里 */
const faceUtimeText = computed(() => faceUtime.value.replace(/^\d{4}-/, '') || '—')
const ctaText = computed(() => (hasFace.value ? '重新采集人脸' : '开始采集'))

/** 采集流程三步说明 */
const steps = ['对准取景框', '拍摄自动核验', '完成启用']

/** 拍摄要求 */
const tips = [
  '正对镜头，人脸完整落在取景框内',
  '光线均匀，避免逆光、阴影与强反光',
  '不戴帽子口罩，眼镜镜片不反光',
  '背景干净，画面中只有你一张脸',
]

async function loadFace() {
  const { isSuccess, data } = await api.info()
  if (isSuccess && data?.face_url) {
    faceModel.value = {
      id: data.face_pic || '',
      url: data.face_url,
      name: 'face.jpg',
      image: true,
      content_type: 'image/jpeg',
      size: '0',
    }
    faceUtime.value = data.face_utime || ''
  }
  else {
    faceModel.value = null
    faceUtime.value = ''
  }
}

/** 人脸照片变化后同步全局用户信息，「我的」页可即时看到采集状态 */
async function syncAuth() {
  const { isSuccess, data } = await api.get()
  if (isSuccess && data)
    authStore.userInfo = { ...authStore.userInfo, ...data }
}

/** 开始采集：已采集过先确认，避免误覆盖 */
async function startCapture() {
  if (hasFace.value) {
    const { confirm } = await Taro.showModal({
      title: '重新采集',
      content: '重新采集会覆盖现有人脸照片，确定继续吗？',
      confirmText: '继续采集',
    })
    if (!confirm)
      return
  }

  if (method.value === 'stream' && !IS_WEAPP) {
    captureMode.value = 'stream'
    return
  }
  cameraRef.value?.startCamera()
}

function chooseStream() {
  if (IS_WEAPP) {
    showToast('小程序端请使用拍照采集')
    return
  }
  method.value = 'stream'
}

async function handleStreamSuccess() {
  captureMode.value = 'photo'
  await loadFace()
  await syncAuth()
  showToast('人脸照片更新成功')
}

function handleStreamCancel() {
  captureMode.value = 'photo'
}

function handleStreamSwitchPhoto() {
  captureMode.value = 'photo'
  method.value = 'photo'
}

async function handleFaceChange(file: FileStorage.FileResourceModel | null) {
  if (!file)
    return

  const { isSuccess, message } = await api.updateFace({
    image_pic: file.id,
    image_url: file.url,
  })

  if (!isSuccess) {
    showToast(message || '人脸照片上传失败', { duration: 3000 })
    return
  }

  await loadFace()
  await syncAuth()
  showToast('人脸照片更新成功')
}

useAuthLoad(async () => {
  await loadFace()
})
</script>

<template>
  <AuthLayout>
    <view class="sp-page sp-page--with-bar" :class="styles.page">
      <PageNavbar title="人脸采集" />
      <Watermark />

      <!-- 状态卡 -->
      <view :class="styles.hero">
        <view :class="styles['hero-glow']" />
        <view :class="styles['hero-glow2']" />

        <view :class="styles['hero-main']">
          <view :class="styles['face-shell']">
            <image
              v-if="faceUrl"
              :class="styles.face"
              :src="faceUrl"
              mode="aspectFill"
            />
            <view v-else :class="styles['face-empty']">
              <My size="42" color="rgba(255, 255, 255, 0.72)" />
            </view>
            <view :class="[styles['face-badge'], { [styles['face-badge--done']]: hasFace }]">
              <Check v-if="hasFace" size="13" color="#0f766e" />
              <text v-else :class="styles['face-badge-plus']">
                ＋
              </text>
            </view>
          </view>

          <view :class="styles['hero-info']">
            <view :class="styles['hero-title']">
              <text :class="styles['hero-name']">
                {{ hasFace ? '人脸已采集' : '还未采集人脸' }}
              </text>
              <view :class="[styles['hero-pill'], { [styles['hero-pill--done']]: hasFace }]">
                <view :class="styles['pill-dot']" />
                <text>{{ hasFace ? '已启用' : '待采集' }}</text>
              </view>
            </view>
            <text :class="styles['hero-meta']">
              {{ hasFace ? `更新于 ${faceUtimeText}` : '采集后可用于人脸识别打卡' }}
            </text>
            <text :class="styles['hero-hint']">
              {{ hasFace ? '如需停用人脸识别，请联系管理员' : '整个采集过程约需 10 秒' }}
            </text>
          </view>
        </view>

        <view :class="styles['hero-steps']">
          <view v-for="(step, index) in steps" :key="step" :class="styles.step">
            <view :class="styles['step-index']">
              {{ index + 1 }}
            </view>
            <text :class="styles['step-text']">
              {{ step }}
            </text>
          </view>
        </view>
      </view>

      <!-- 采集方式 -->
      <SpCard title="采集方式" :hint="IS_WEAPP ? '小程序端' : '推荐视频采集'">
        <view
          :class="[styles.method, { [styles['method--active']]: method === 'photo' }]"
          @click="method = 'photo'"
        >
          <view :class="styles['method-icon']">
            <Photograph size="20" color="#4f46e5" />
          </view>
          <view :class="styles['method-body']">
            <text :class="styles['method-title']">
              拍照采集
            </text>
            <text :class="styles['method-desc']">
              拍摄一张清晰的正面照片
            </text>
          </view>
          <view :class="[styles.radio, { [styles['radio--on']]: method === 'photo' }]">
            <Check v-if="method === 'photo'" size="11" color="#fff" />
          </view>
        </view>

        <view
          :class="[
            styles.method,
            { [styles['method--active']]: method === 'stream' },
            { [styles['method--disabled']]: IS_WEAPP },
          ]"
          @click="chooseStream"
        >
          <view :class="[styles['method-icon'], styles['method-icon--teal']]">
            <PlayCircleFill size="20" color="#0d9488" />
          </view>
          <view :class="styles['method-body']">
            <view :class="styles['method-title-row']">
              <text :class="styles['method-title']">
                视频采集
              </text>
              <text v-if="!IS_WEAPP" :class="styles['method-tag']">
                推荐
              </text>
            </view>
            <text :class="styles['method-desc']">
              {{ IS_WEAPP ? '小程序端暂不支持，请使用拍照采集' : '实时取景，活体检测更可靠' }}
            </text>
          </view>
          <view :class="[styles.radio, { [styles['radio--on']]: method === 'stream' }]">
            <Check v-if="method === 'stream'" size="11" color="#fff" />
          </view>
        </view>
      </SpCard>

      <!-- 拍摄要求 -->
      <SpCard title="拍摄要求" hint="一次拍好，减少重试">
        <view :class="styles.tips">
          <view v-for="(tip, index) in tips" :key="tip" :class="styles.tip">
            <view :class="styles['tip-index']">
              {{ index + 1 }}
            </view>
            <text :class="styles['tip-text']">
              {{ tip }}
            </text>
          </view>
        </view>
      </SpCard>

      <!-- 隐私说明 -->
      <view :class="styles.privacy">
        <view :class="styles['privacy-icon']">
          <Check size="16" color="#0d9488" />
        </view>
        <view :class="styles['privacy-body']">
          <text :class="styles['privacy-title']">
            隐私说明
          </text>
          <text :class="styles['privacy-text']">
            人脸照片仅用于考勤身份核验，加密存储，不会用于其他用途；重新采集会覆盖原有照片。
          </text>
        </view>
      </view>

      <!-- 底部操作栏 -->
      <view class="sp-bottom-bar">
        <view class="sp-bottom-bar-inner">
          <nut-button
            type="primary"
            style="flex: 1;"
            @click="startCapture"
          >
            {{ ctaText }}
          </nut-button>
        </view>
      </view>

      <!-- 拍照采集：相机 / 预览 / 上传由组件全屏承载 -->
      <SpFaceCamera
        ref="cameraRef"
        v-model="faceModel"
        :show-idle="false"
        @change="handleFaceChange"
      />
    </view>
  </AuthLayout>

  <FaceStreamCapture
    v-if="captureMode === 'stream'"
    @success="handleStreamSuccess"
    @cancel="handleStreamCancel"
    @switch-photo="handleStreamSwitchPhoto"
  />
</template>
