import type { Ref } from 'vue'
import Taro from '@tarojs/taro'
import { ref } from 'vue'

export interface CameraAdapter {
  start: () => Promise<void>
  capture: () => Promise<string>
  stop: () => void
  isReady: Ref<boolean>
}

export function useCameraWeapp(): CameraAdapter {
  const isReady = ref(false)
  let cameraContext: Taro.CameraContext | null = null

  async function start() {
    await new Promise(resolve => setTimeout(resolve, 500))
    cameraContext = Taro.createCameraContext()
    isReady.value = true
  }

  function capture(): Promise<string> {
    return new Promise((resolve, reject) => {
      if (!cameraContext) {
        reject(new Error('相机未初始化'))
        return
      }
      cameraContext.takePhoto({
        quality: 'high',
        success: res => resolve(res.tempImagePath),
        fail: err => reject(new Error(err.errMsg || '拍照失败')),
      })
    })
  }

  function stop() {
    cameraContext = null
    isReady.value = false
  }

  return { start, capture, stop, isReady }
}
