import { createApp, watch } from 'vue'
import { setupDirectives } from '@/directives'
import { useUpdateChecker } from '@/hooks/useUpdateChecker'
import { setupGlobalComponent } from '@/setups/globalComponent'
import pinia from '@/stores'
import { useAppStore } from '@/stores/app'
import { useAppInfoStore } from '@/stores/appinfo'
import { useAuthStore } from '@/stores/auth'
import { useEnumStoreWithOut } from '@/stores/enums'
import { storage } from '@/utils/storage'
import './app.scss'

// AbortController polyfill（微信小程序基础库未内置）
if (typeof AbortController === 'undefined') {
  globalThis.AbortController = class AbortController {
    signal = { aborted: false }
    abort() { this.signal.aborted = true }
  } as unknown as typeof AbortController
}

const App = createApp({
  // onLaunch 在 app mount 后，此时 pinia 已挂载
  onLaunch() {
    const appStore = useAppStore()
    appStore.initSystemInfo()
    const appInfoStore = useAppInfoStore()
    appInfoStore.asyncAppInfo()

    // 认证初始化（异步，不阻塞渲染）
    const authStore = useAuthStore()
    authStore.init()

    // 小程序更新检查
    useUpdateChecker()

    // 枚举随认证状态加载：登录成功后预加载，登出/降级后清空
    const enumStore = useEnumStoreWithOut()
    watch(() => authStore.status, (status) => {
      if (status === 'auth') {
        void enumStore.ensureLoaded()
        // 登录成功即解除首页守卫的防回环冷却，避免登出后短时间内不再跳登录页
        storage.remove('login_guard_at')
      }
      else if (status === 'guest') {
        enumStore.resetStore()
      }
    }, { immediate: true })
  },
})

setupDirectives(App)
setupGlobalComponent(App)
App.use(pinia)

export default App
