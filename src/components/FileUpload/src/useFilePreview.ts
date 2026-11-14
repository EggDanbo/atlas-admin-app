import type { PreviewableItem } from '@/components/File/shared'
import Taro from '@tarojs/taro'
import { ref } from 'vue'
import { useFilePreview as usePublicFilePreview } from '@/hooks/useFilePreview'

/** 视频预览状态 */
export interface VideoPreviewState {
  visible: boolean
  url: string
}

/**
 * FileUpload 组件的文件预览（基于公共 useFilePreview）。
 * - 图片：Taro.previewImage（保留多图滑动）
 * - 视频：组件内全屏弹层
 * - 文档（pdf/word/excel/md 等）：公共 previewFile（H5 预览页 file-viewer / 小程序 openDocument）
 */
export function useFilePreview() {
  const { previewFile } = usePublicFilePreview()
  const videoPreview = ref<VideoPreviewState>({
    visible: false,
    url: '',
  })

  /** 判断是否为图片 */
  function isImage(item: FileStorage.FileResourceModel): boolean {
    if (item.image)
      return true
    return item.content_type?.toLowerCase().startsWith('image/') ?? false
  }

  /** 判断是否为视频 */
  function isVideo(item: FileStorage.FileResourceModel): boolean {
    return item.content_type?.toLowerCase().startsWith('video/') ?? false
  }

  /** 视频预览（全屏弹窗） */
  function previewVideo(item: FileStorage.FileResourceModel): void {
    videoPreview.value = {
      visible: true,
      url: item.url,
    }
  }

  /** 关闭视频预览 */
  function closeVideoPreview(): void {
    videoPreview.value = {
      visible: false,
      url: '',
    }
  }

  /**
   * 预览文件
   * @param item 文件资源
   * @param allImages 所有图片文件列表（用于图片多图滑动预览）
   */
  function preview(item: FileStorage.FileResourceModel, allImages?: FileStorage.FileResourceModel[]): void {
    if (isVideo(item)) {
      previewVideo(item)
      return
    }
    if (isImage(item)) {
      const urls = allImages?.filter(f => isImage(f)).map(f => f.url) || [item.url]
      Taro.previewImage({
        current: item.url,
        urls,
      })
      return
    }
    // 文档：公共预览（H5 跳预览页 file-viewer；小程序 downloadFile + openDocument）
    const previewable: PreviewableItem = { url: item.url, name: item.name }
    previewFile(previewable)
  }

  return {
    videoPreview,
    isImage,
    isVideo,
    preview,
    closeVideoPreview,
  }
}
