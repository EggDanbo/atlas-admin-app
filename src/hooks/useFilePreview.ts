import type { PreviewableItem } from '@/components/File/shared'
import Taro from '@tarojs/taro'
import { buildFileUrl, buildPreviewUrl, FileKind, getFileKind } from '@/components/File/shared'
import { showToast } from '@/components/SpToast'
import { isH5Wechat, isH5Wecom } from '@/utils/platform'
import { buildQuery, routes } from '@/utils/router'

const IS_H5 = process.env.TARO_ENV === 'h5'

/**
 * 文件预览 composable：按类型与运行端分发。
 * - 图片：两端均用 Taro.previewImage 原生放大
 * - 文档：H5 跳独立预览服务（配置 TARO_APP_FILE_PREVIEW_BASE）或内置预览页（仅开发模式）；
 *   小程序 downloadFile + openDocument
 */
export function useFilePreview() {
  async function previewFile(item: PreviewableItem): Promise<void> {
    const fileUrl = buildFileUrl(item)
    const kind = getFileKind(item)

    if (kind === FileKind.Image) {
      Taro.previewImage({ current: fileUrl, urls: [fileUrl] })
      return
    }

    if (IS_H5) {
      // 独立预览服务：新窗口打开；未配置则走内置预览页（生产必须配置，见 .env）
      const previewUrl = buildPreviewUrl(item)
      if (previewUrl) {
        // 微信/企微 webview 会拦截 window.open（静默失败），需用当前页导航
        if (isH5Wechat() || isH5Wecom())
          window.location.href = previewUrl
        else
          window.open(previewUrl)
        return
      }
      Taro.navigateTo({
        url: `${routes.minePreview}?${buildQuery({ url: fileUrl, name: item.name })}`,
      })
      return
    }

    await previewByOpenDocument(fileUrl)
  }

  return { previewFile }
}

/** 小程序：下载后用系统能力打开；不支持格式（如 md）则 toast 提示 */
async function previewByOpenDocument(fileUrl: string): Promise<void> {
  Taro.showLoading({ title: '加载中', mask: true })
  try {
    const res = await Taro.downloadFile({ url: fileUrl })
    if (res.statusCode !== 200) {
      showToast('文件下载失败')
      return
    }
    await Taro.openDocument({
      filePath: res.tempFilePath,
      showMenu: true,
      fail: () => showToast('小程序暂不支持该格式预览'),
    })
  }
  catch {
    showToast('文件下载失败')
  }
  finally {
    Taro.hideLoading()
  }
}
