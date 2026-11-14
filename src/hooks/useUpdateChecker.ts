import Taro from '@tarojs/taro'
import { showToast } from '@/components/SpToast'
import { isWeapp } from '@/utils/platform'

/**
 * 小程序更新检查 Hook
 *
 * 在 onShow 时检测小程序新版本，下载完成后弹窗提示用户更新。
 * 仅在小程序环境下生效，H5 自动跳过。
 */
export function useUpdateChecker() {
  Taro.useDidShow(() => {
    if (!isWeapp())
      return

    const updateManager = Taro.getUpdateManager()

    updateManager.onCheckForUpdate((res) => {
      if (!res.hasUpdate)
        return

      updateManager.onUpdateReady(() => {
        Taro.showModal({
          title: '更新提示',
          content: '新版本已准备好，是否重启应用？',
          confirmText: '立即重启',
          cancelText: '稍后再说',
          success(result) {
            if (result.confirm)
              updateManager.applyUpdate()
          },
        })
      })

      updateManager.onUpdateFailed(() => {
        showToast('新版本下载失败', { duration: 2000 })
      })
    })
  })
}
