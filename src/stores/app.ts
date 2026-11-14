import Taro from '@tarojs/taro'
import { defineStore } from 'pinia'
import { computed, ref } from 'vue'

export const useAppStore = defineStore('app-store', () => {
  const systemInfo = ref<Taro.getSystemInfoSync.Result>({} as any)
  const networkType = ref('unknown')

  function initSystemInfo() {
    try {
      systemInfo.value = Taro.getSystemInfoSync()
    }
    catch {}
    try {
      Taro.getNetworkType({
        success: (res) => {
          networkType.value = res.networkType
        },
      })
    }
    catch {}
  }

  const statusBarHeight = computed(() => systemInfo.value.statusBarHeight || 0)
  const windowHeight = computed(() => systemInfo.value.windowHeight || 0)
  const platform = computed(() => systemInfo.value.platform || 'unknown')

  return {
    systemInfo,
    networkType,
    statusBarHeight,
    windowHeight,
    platform,
    initSystemInfo,
  }
})
