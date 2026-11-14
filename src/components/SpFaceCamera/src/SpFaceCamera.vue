<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, ref, watch } from 'vue'
import { spFaceCameraProps } from './props'
import styles from './SpFaceCamera.module.scss'
import { useCamera } from './useCamera'

const props = defineProps(spFaceCameraProps)
const emit = defineEmits<{
  'update:modelValue': [value: FileStorage.FileResourceModel | null]
  'update:visible': [value: boolean]
  'change': [value: FileStorage.FileResourceModel | null]
}>()

const h5ContainerRef = ref()
const {
  IS_WEAPP,
  state,
  tempImagePath,
  uploadProgress,
  startCamera,
  capture,
  cancelCamera,
  retake,
  upload,
  cleanup,
} = useCamera(h5ContainerRef)

const isIdle = computed(() => state.value === 'idle')
const isCamera = computed(() => state.value === 'camera')
const isPreview = computed(() => state.value === 'preview')
const isUploading = computed(() => state.value === 'uploading')

function handleClose() {
  emit('update:visible', false)
  cleanup()
}

async function handleConfirm() {
  const result = await upload()
  if (result) {
    emit('update:modelValue', result)
    emit('change', result)
    if (props.popup)
      handleClose()
    else
      cleanup()
  }
  else {
    state.value = 'preview'
  }
}

watch(() => props.visible, (val) => {
  if (val)
    nextTick(() => startCamera())
  if (!val)
    cleanup()
})

onBeforeUnmount(() => {
  cleanup()
})

// 页面自带的采集入口需要主动拉起相机，空态由页面渲染
defineExpose({ startCamera, retake, state })
</script>

<template>
  <view :class="[styles.container, { [styles['container--bare']]: !showIdle && isIdle }]">
    <!-- idle：无照片 -->
    <view v-if="isIdle && !modelValue && showIdle" :class="styles.idleView" @tap="startCamera">
      <view :class="styles.placeholderCircle">
        <text :class="styles.placeholderIcon">
          📷
        </text>
      </view>
      <text :class="styles.actionText">
        拍摄人脸照片
      </text>
    </view>

    <!-- idle：已有照片 -->
    <view v-if="isIdle && modelValue && showIdle" :class="styles.idleView">
      <view :class="styles.existingPhotoWrap">
        <image :class="styles.existingPhoto" :src="modelValue.url" mode="aspectFill" />
        <view v-if="!disabled" :class="styles.retakeOverlay" @tap="startCamera">
          <text :class="styles.retakeText">
            重新拍摄
          </text>
        </view>
        <view v-if="disabled" :class="styles.lockedOverlay">
          <text :class="styles.lockedText">
            照片已锁定
          </text>
        </view>
      </view>
    </view>

    <!-- camera：fixed 全屏覆盖 -->
    <view v-if="isCamera" :class="styles.cameraContainer">
      <view :class="styles.cameraView">
        <camera
          v-if="IS_WEAPP"
          device-position="front"
          flash="auto"
          :class="styles.cameraInner"
        />
        <view v-else ref="h5ContainerRef" :class="styles.cameraInner" />
        <view :class="styles.overlay">
          <view :class="styles.frameCircle" />
        </view>
      </view>
      <text :class="styles.hintText">
        请将面部对准框内
      </text>
      <view :class="styles.cameraActions">
        <view :class="styles.cancelBtn" @tap="cancelCamera">
          取消
        </view>
        <view :class="styles.captureBtn" @tap="capture" />
        <view :class="styles.cancelBtn" />
      </view>
    </view>

    <!-- preview -->
    <view v-if="isPreview" :class="styles.previewContainer">
      <view :class="styles.previewHead">
        <text :class="styles.previewTitle">
          确认人脸照片
        </text>
        <text :class="styles.previewHint">
          确保面部清晰、无遮挡，照片将用于考勤识别
        </text>
      </view>
      <view :class="styles.previewImageWrap">
        <image :class="styles.previewImage" :src="tempImagePath" mode="aspectFill" />
        <view :class="styles.previewCircleBorder" />
      </view>
      <view :class="styles.previewActions">
        <view :class="styles.previewBtnGhost" @click="retake">
          重新拍摄
        </view>
        <view :class="styles.previewBtnPrimary" @click="handleConfirm">
          确认上传
        </view>
      </view>
    </view>

    <!-- uploading -->
    <view v-if="isUploading" :class="styles.uploadingView">
      <view :class="styles.uploadingRing" />
      <text :class="styles.uploadingText">
        正在上传人脸照片
      </text>
      <text :class="styles.uploadingHint">
        {{ uploadProgress }}%
      </text>
      <view :class="styles.uploadingTrack">
        <view :class="styles.uploadingBar" :style="{ width: `${uploadProgress}%` }" />
      </view>
    </view>
  </view>
</template>
