<script setup lang="ts">
import type { UploadTask } from './useFileUpload'
import { IconFont } from '@nutui/icons-vue-taro'
import { Video } from '@tarojs/components'
import { computed, ref, watch } from 'vue'
import styles from './FileUpload.module.scss'
import { fileUploadProps } from './props'
import { useFilePreview } from './useFilePreview'
import { useFileSelect } from './useFileSelect'
import { useFileUpload } from './useFileUpload'

const props = defineProps({ ...fileUploadProps })
const emit = defineEmits<{
  'update:modelValue': [value: FileStorage.FileResourceModel[]]
  'change': [value: FileStorage.FileResourceModel[]]
  'delete': [file: FileStorage.FileResourceModel, index: number]
}>()

const { selectFiles } = useFileSelect()
const { createTask, runTask } = useFileUpload()
const { videoPreview, isImage, isVideo, preview, closeVideoPreview } = useFilePreview()

// 卡片尺寸样式（内联注入，因 v-bind 不支持外部 CSS Modules）
const cardStyle = computed(() => ({
  width: `${props.width}px`,
  height: props.showFileName ? `${props.height + 36}px` : `${props.height}px`,
}))

// 已上传的文件列表
const fileList = ref<FileStorage.FileResourceModel[]>([...props.modelValue])
// 正在上传的任务列表
const uploadingTasks = ref<UploadTask[]>([])
// 上传中锁，防止重复点击
const isUploading = ref(false)

// 监听外部 modelValue 变化
watch(() => props.modelValue, (val) => {
  fileList.value = [...val]
}, { deep: true })

// 剩余可选数量
const remaining = computed(() => {
  const max = props.maxNumber
  if (!Number.isFinite(max))
    return 99
  return Math.max(0, max - fileList.value.length - uploadingTasks.value.length)
})

// 是否显示上传按钮
const showAddBtn = computed(() => !props.disabled && remaining.value > 0)

/** 获取文件类型图标名称 */
function getFileIcon(item: FileStorage.FileResourceModel): string {
  if (isVideo(item))
    return 'play-circle-fill'
  return 'order'
}

/** 选择并上传文件 */
async function handleAdd() {
  if (isUploading.value)
    return
  isUploading.value = true
  try {
    await doUpload()
  }
  finally {
    isUploading.value = false
  }
}

async function doUpload() {
  const files = await selectFiles(props.mode, props.accepts, remaining.value, props.sourceType)
  if (files.length === 0)
    return

  // 大小校验
  const maxSizeBytes = props.maxSize * 1024 * 1024
  const validFiles = files.filter((f) => {
    if (f.size > maxSizeBytes) {
      console.warn(`文件 ${f.name} 超过大小限制 ${props.maxSize}MB`)
      return false
    }
    return true
  })

  if (validFiles.length === 0)
    return

  const watermarkOptions = {
    watermark: props.watermark,
    watermarkPos: props.watermarkPos,
    watermarkText: props.watermarkText,
  }

  // 逐个上传
  for (const file of validFiles) {
    const task = createTask(file)
    uploadingTasks.value.push(task)

    await runTask(
      task,
      watermarkOptions,
      (updatedTask) => {
        const idx = uploadingTasks.value.findIndex(t => t.uid === updatedTask.uid)
        if (idx >= 0)
          uploadingTasks.value[idx] = { ...updatedTask }
      },
    )

    if (task.status === 'success' && task.result) {
      fileList.value.push(task.result)
      emit('update:modelValue', [...fileList.value])
      emit('change', [...fileList.value])
      uploadingTasks.value = uploadingTasks.value.filter(t => t.uid !== task.uid)
    }
  }
}

/** 重试上传 */
async function handleRetry(task: UploadTask) {
  task.status = 'uploading'
  task.progress = 0

  const watermarkOptions = {
    watermark: props.watermark,
    watermarkPos: props.watermarkPos,
    watermarkText: props.watermarkText,
  }

  await runTask(
    task,
    watermarkOptions,
    (updatedTask) => {
      const idx = uploadingTasks.value.findIndex(t => t.uid === updatedTask.uid)
      if (idx >= 0)
        uploadingTasks.value[idx] = { ...updatedTask }
    },
  )

  if (task.status === 'success' && task.result) {
    fileList.value.push(task.result)
    emit('update:modelValue', [...fileList.value])
    emit('change', [...fileList.value])
    uploadingTasks.value = uploadingTasks.value.filter(t => t.uid !== task.uid)
  }
}

/** 删除已上传文件 */
function handleDelete(index: number) {
  const removed = fileList.value.splice(index, 1)[0]
  emit('delete', removed, index)
  emit('update:modelValue', [...fileList.value])
  emit('change', [...fileList.value])
}

/** 点击已上传文件卡片 */
function handleFileClick(item: FileStorage.FileResourceModel) {
  preview(item, fileList.value)
}

/** 获取缩略图 URL（服务端裁切，避免加载原图） */
function getThumbUrl(item: FileStorage.FileResourceModel): string {
  if (!item.url)
    return ''
  const sep = item.url.includes('?') ? '&' : '?'
  return `${item.url}${sep}width=${props.width}&height=${props.height}`
}

/** 点击上传中的卡片（无操作） */
function handleUploadingClick(_task: UploadTask) {
  // 上传中不可操作
}
</script>

<template>
  <view :class="styles.container">
    <!-- 已上传文件卡片 -->
    <view
      v-for="(item, index) in fileList"
      :key="`file_${index}`"
      :class="styles.card"
      :style="cardStyle"
      @tap="handleFileClick(item)"
    >
      <view :class="styles.cardContent">
        <!-- 图片缩略图 -->
        <image
          v-if="isImage(item)"
          :src="getThumbUrl(item)"
          mode="aspectFill"
          :class="styles.thumbnail"
        />
        <!-- 视频图标 -->
        <view v-else-if="isVideo(item)" :class="styles.iconWrapper">
          <IconFont name="play-circle-fill" size="48" />
        </view>
        <!-- 文件类型图标 -->
        <view v-else :class="styles.iconWrapper">
          <IconFont :name="getFileIcon(item)" size="48" />
        </view>
      </view>
      <!-- 文件名 -->
      <view v-if="showFileName" :class="styles.cardFooter" :style="{ width: `${props.width}px` }">
        {{ item.name }}
      </view>
      <!-- 删除按钮 -->
      <view
        v-if="!disabled"
        :class="styles.deleteBtn"
        @tap.stop="handleDelete(index)"
      >
        <IconFont name="close" size="12" color="#fff" />
      </view>
    </view>

    <!-- 上传中/上传失败卡片 -->
    <view
      v-for="task in uploadingTasks"
      :key="task.uid"
      :class="[styles.card, task.status === 'error' ? styles.error : styles.uploading]"
      :style="cardStyle"
      @tap="task.status === 'error' ? handleRetry(task) : handleUploadingClick(task)"
    >
      <view :class="styles.cardContent">
        <!-- 上传中 -->
        <template v-if="task.status === 'uploading'">
          <view :class="styles.progressWrapper">
            <nut-progress
              :percentage="task.progress"
              :text-inside="true"
              :stroke-width="16"
              :show-text="true"
              color="var(--nut-primary-color)"
            />
            <text :class="styles.progressText">
              上传中...
            </text>
          </view>
        </template>
        <!-- 上传失败 -->
        <template v-else-if="task.status === 'error'">
          <view :class="styles.errorWrapper">
            <IconFont name="failure" size="32" color="var(--nut-primary-color)" />
            <text>上传失败</text>
            <view :class="styles.retryBtn">
              点击重试
            </view>
          </view>
        </template>
      </view>
      <view v-if="showFileName" :class="styles.cardFooter" :style="{ width: `${props.width}px` }">
        {{ task.name }}
      </view>
    </view>

    <!-- 添加按钮 -->
    <view
      v-if="showAddBtn"
      :class="[styles.addBtn, isUploading && styles.addBtnDisabled]"
      :style="cardStyle"
      @tap="handleAdd"
    >
      <IconFont name="plus" size="24" :class="styles.addIcon" />
      <text :class="styles.addText">
        {{ uploadTitle }}
      </text>
    </view>
  </view>

  <!-- 视频预览弹窗 -->
  <view v-if="videoPreview.visible" :class="styles.videoOverlay">
    <view :class="styles.videoCloseBtn" @tap="closeVideoPreview">
      <IconFont name="close" size="20" color="#fff" />
    </view>
    <Video
      :src="videoPreview.url"
      :class="styles.videoPlayer"
      controls
      autoplay
      :show-fullscreen-btn="true"
      :show-play-btn="true"
      object-fit="contain"
    />
  </view>
</template>
