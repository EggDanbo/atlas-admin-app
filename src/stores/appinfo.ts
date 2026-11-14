import { defineStore } from 'pinia'
import { computed, ref } from 'vue'
import { common } from '@/service/api/misc'
import { isObject } from '@/utils/is'

export const useAppInfoStore = defineStore('appinfo-store', () => {
  const appInfo = ref<AppInfo | null>(null)

  /** 异步加载应用信息 */
  async function asyncAppInfo() {
    try {
      const { isSuccess, data } = await common.appinfo()
      if (!isSuccess)
        return appInfo.value
      if (data && isObject(data)) {
        appInfo.value = {
          ...appInfo.value,
          ...data,
        }
      }
      return appInfo.value
    }
    catch (error) {
      console.error('获取应用信息失败:', error)
      return appInfo.value
    }
  }

  const appname = computed(() => appInfo.value?.appname)
  const logincaptcha = computed(() => appInfo.value?.logincaptcha)
  const version = computed(() => appInfo.value?.version)

  return {
    appInfo,
    asyncAppInfo,
    appname,
    logincaptcha,
    version,
  }
})
