import Taro from '@tarojs/taro'
import { defineStore } from 'pinia'
import { computed, ref } from 'vue'
import authorize from '@/service/api/identity/authorize'
import permit from '@/service/api/identity/permit'
import profile from '@/service/api/identity/profile'
import wechatAuth from '@/service/api/identity/wechat'
import wechatWorkAuth from '@/service/api/identity/wechatwork'
import { getAuthPlatform } from '@/utils/platform'
import { buildQuery, getCurrentPageInfo, H5_BASENAME, stripBasename } from '@/utils/router'
import { storage } from '@/utils/storage'
import { token } from '@/utils/token'

export type AuthStatus = 'loading' | 'auth' | 'guest'

export interface AuthState {
  status: AuthStatus
  key: string | null
  userInfo: Auth.UserCurrent | null
  permissions: string[]
  allPermissions: Auth.Permission[]
  loginLoading: boolean
}

const REDIRECT_KEY = 'login_redirect_url'

interface LoginRedirect {
  url: string
  type: 'navigate' | 'redirect'
}

export const useAuthStore = defineStore('auth-store', () => {
  // ==================== 状态 ====================
  const status = ref<AuthStatus>('loading')
  const key = ref<string | null>(null)
  const userInfo = ref<Auth.UserCurrent | null>(null)
  const permissions = ref<string[]>([])
  const allPermissions = ref<Auth.Permission[]>([])
  const loginLoading = ref(false)

  // ==================== 计算属性 ====================
  const isLoggedIn = computed(() => status.value === 'auth')
  const isAdmin = computed(() => userInfo.value?.code === 'atlas')

  // ==================== 私有方法 ====================

  /** 从 oauthCallback 页面导航到目标页面 */
  function navigateFromOAuthCallback(pathParam?: string) {
    const targetUrl = pathParam
      ? decodeURIComponent(pathParam)
      : '/pages/index/index'
    Taro.reLaunch({
      url: targetUrl,
      complete: () => {
        // Taro H5 从 subPackage 页面跳转后可能不刷新导航栏标题，显式重置
        Taro.setNavigationBarTitle({ title: 'Atlas 工作台' })
      },
    })
  }

  /** 加载用户信息和权限（所有认证成功路径统一调用） */
  async function loadUserProfile(): Promise<boolean> {
    try {
      const [profileRes, permRes] = await Promise.all([
        profile.get(),
        permit.get(),
      ])
      if (profileRes.isSuccess && profileRes.data)
        userInfo.value = { ...userInfo.value, ...profileRes.data }

      if (permRes.isSuccess && permRes.data)
        allPermissions.value = permRes.data

      const userPermRes = await permit.currentUser()
      if (userPermRes.isSuccess && userPermRes.data)
        permissions.value = userPermRes.data

      return !!userInfo.value?.userid
    }
    catch (error) {
      console.error('加载用户信息失败:', error)
      return false
    }
  }

  /** 处理 LoginTokenDto 响应 */
  function handleLoginTokenDto(data: WechatAuth.LoginTokenDto): boolean {
    if (data.bound) {
      token.set(data)
      return true
    }
    else {
      key.value = data.key
      return false
    }
  }

  // ==================== 登录重定向管理 ====================

  /** 保存登录跳转目标 */
  function saveLoginRedirect(url: string, type: 'navigate' | 'redirect' = 'navigate') {
    storage.set(REDIRECT_KEY, { url, type })
  }

  /** 消费登录跳转目标（一次性） */
  function consumeLoginRedirect(): LoginRedirect | null {
    const redirect = storage.get<LoginRedirect>(REDIRECT_KEY)
    if (!redirect)
      return null
    storage.remove(REDIRECT_KEY)
    return redirect
  }

  /**
   * 登录成功后跳转
   *
   * 统一使用 reLaunch（而非 switchTab/redirectTo）：
   * - 从首页进入登录 → 登录后 reLaunch 回首页，导航栈只有首页
   * - 从明细页直接进入登录（如分享链接）→ reLaunch 回明细页，导航栈只有该页，
   *   此时后退无历史是正确行为（不应回到登录页或产生空页面）
   * - reLaunch 确保目标页面以全新实例重建，避免旧数据残留
   */
  function navigateAfterLogin() {
    const redirect = consumeLoginRedirect()
    if (redirect) {
      let url = redirect.url
      url = stripBasename(url)
      Taro.reLaunch({ url })
    }
    else {
      Taro.switchTab({ url: '/pages/index/index' })
    }
  }

  // ==================== Actions ====================

  /** 初始化认证状态（app.ts onLaunch 调用） */
  async function init(): Promise<void> {
    const accessToken = token.get()

    // ① 有 token → 加载用户信息
    if (accessToken) {
      const loaded = await loadUserProfile()
      if (loaded) {
        status.value = 'auth'
        return
      }
      // 加载失败（token 可能已失效），清除后走无 token 流程
      token.remove()
    }

    // ② 无 token → 获取身份标识（平台分流）
    const platform = getAuthPlatform()

    if (platform === 'weapp') {
      await initWeapp()
    }
    else if (platform === 'h5-wecom') {
      await initH5Wecom()
    }
    else if (platform === 'h5-wechat') {
      await initH5Wechat()
    }
    else {
      // 非微信浏览器
      status.value = 'guest'
    }
  }

  /** 小程序初始化 */
  async function initWeapp(): Promise<void> {
    try {
      const { code } = await Taro.login()
      const { isSuccess, data } = await wechatAuth.getWxappToken({ code })
      if (isSuccess && data) {
        if (handleLoginTokenDto(data)) {
          await loadUserProfile()
          status.value = 'auth'
        }
        else {
          status.value = 'guest'
        }
      }
      else {
        status.value = 'guest'
      }
    }
    catch {
      status.value = 'guest'
    }
  }

  /** H5 微信浏览器初始化 */
  async function initH5Wechat(): Promise<void> {
    // 先检查 URL 是否有 code + state（OAuth 回调）
    const { path, params } = getCurrentPageInfo()
    const code = params.code as string | undefined
    const state = params.state as string | undefined

    if (code && state) {
      // OAuth 回调处理
      try {
        const { isSuccess, data } = await wechatAuth.getWxToken({ code, state })
        if (isSuccess && data) {
          if (handleLoginTokenDto(data)) {
            await loadUserProfile()
            status.value = 'auth'
          }
          else {
            status.value = 'guest'
          }
        }
        else {
          status.value = 'guest'
        }
      }
      catch {
        status.value = 'guest'
      }
      // OAuth 回调处理完毕，导航到目标页面
      navigateFromOAuthCallback(params.path as string | undefined)
      return
    }

    // 无 code → 跳转微信 OAuth 授权
    try {
      let redirectPath = stripBasename(path)
      const queryString = buildQuery(params)
      if (queryString)
        redirectPath += `?${queryString}`
      const redirectUri = `${window.location.origin}${H5_BASENAME}/pages/oauthCallback/index?path=${encodeURIComponent(redirectPath)}`
      const { isSuccess, data } = await wechatAuth.getAuthorizeUrl({ redirect_uri: redirectUri })
      if (isSuccess && data) {
        window.location.href = data
      }
      else {
        status.value = 'guest'
      }
    }
    catch {
      status.value = 'guest'
    }
  }

  /** H5 企业微信初始化 */
  async function initH5Wecom(): Promise<void> {
    // 先检查 URL 是否有 code + state（OAuth 回调）
    const { path, params } = getCurrentPageInfo()
    const code = params.code as string | undefined
    const state = params.state as string | undefined

    if (code && state) {
      try {
        const { isSuccess, data } = await wechatWorkAuth.getToken({ code, state })
        if (isSuccess && data) {
          if (handleLoginTokenDto(data)) {
            await loadUserProfile()
            status.value = 'auth'
          }
          else {
            status.value = 'guest'
          }
        }
        else {
          status.value = 'guest'
        }
      }
      catch {
        status.value = 'guest'
      }
      // OAuth 回调处理完毕，导航到目标页面
      navigateFromOAuthCallback(params.path as string | undefined)
      return
    }

    // 无 code → 跳转企业微信 OAuth
    try {
      let redirectPath = stripBasename(path)
      const queryString = buildQuery(params)
      if (queryString)
        redirectPath += `?${queryString}`
      const redirectUri = `${window.location.origin}${H5_BASENAME}/pages/oauthCallback/index?path=${encodeURIComponent(redirectPath)}`
      const { isSuccess, data } = await wechatWorkAuth.getOAuth2Url({ redirect_uri: redirectUri })
      if (isSuccess && data) {
        window.location.href = data
      }
      else {
        status.value = 'guest'
      }
    }
    catch {
      status.value = 'guest'
    }
  }

  /** 获取新的 key（登录页前置检查使用） */
  async function ensureKey(): Promise<boolean> {
    if (key.value)
      return true

    const platform = getAuthPlatform()
    if (platform === 'weapp') {
      try {
        const { code } = await Taro.login()
        const { isSuccess, data } = await wechatAuth.getWxappToken({ code })
        if (isSuccess && data) {
          if (handleLoginTokenDto(data)) {
            await loadUserProfile()
            status.value = 'auth'
            return true // 已绑定用户，无需 key
          }
          return true // 拿到 key
        }
      }
      catch {}
      return false
    }

    // H5 微信/企业微信浏览器在这条路径上不再做整页跳转。
    // OAuth 由 init()（应用入口）统一触发；登录页挂载时再整页跳回根路径，
    // 会和首页的登录守卫形成 首页 → 登录页 → 首页 的死循环。
    return false
  }

  /** 登录 */
  async function login(params: {
    type: 'sms' | 'password' | 'phone'
    mobile?: string
    verifyCode?: string
    username?: string
    password?: string
    phoneCode?: string
    loginCode?: string
    verifyToken?: string
  }): Promise<{ isSuccess: boolean, message?: string }> {
    try {
      loginLoading.value = true

      let result: { isSuccess: boolean, data?: any, message?: string }

      switch (params.type) {
        case 'phone': {
          // 微信手机号一键登录
          result = await wechatAuth.phoneLoginToken({
            code_phone: params.phoneCode!,
            code: params.loginCode!,
          })
          if (result.isSuccess && result.data) {
            if (!handleLoginTokenDto(result.data))
              return { isSuccess: false, message: '绑定失败，请重试' }
          }
          break
        }
        case 'sms': {
          // 短信验证码登录
          if (!key.value)
            return { isSuccess: false, message: '身份标识已过期，请返回重试' }
          const platform = getAuthPlatform()
          let bindResult
          if (platform === 'weapp') {
            // 小程序：获取最新 wx.login 授权码
            const { code: wxCode } = await Taro.login()
            bindResult = await wechatAuth.bindWxappUser({ key: key.value, sms_code: params.verifyCode!, code: wxCode })
          }
          else if (platform === 'h5-wecom') {
            bindResult = await wechatWorkAuth.bind({ key: key.value, code: params.verifyCode! })
          }
          else {
            bindResult = await wechatAuth.bindWxUser({ key: key.value, code: params.verifyCode! })
          }

          result = bindResult
          if (bindResult.isSuccess && bindResult.data) {
            if (!handleLoginTokenDto(bindResult.data))
              return { isSuccess: false, message: '绑定失败，请重试' }
          }
          break
        }
        case 'password': {
          // 密码登录
          const { encrypt } = await import('@/utils/crypto')
          result = await authorize.token({
            username: encrypt(params.username!) || '',
            password: encrypt(params.password!) || '',
            verifyToken: params.verifyToken,
          })
          if (result.isSuccess && result.data) {
            token.set(result.data)
          }
          break
        }
        default:
          return { isSuccess: false, message: '不支持的登录方式' }
      }

      if (result.isSuccess) {
        await loadUserProfile()
        status.value = 'auth'
        navigateAfterLogin()
        return { isSuccess: true }
      }

      return { isSuccess: false, message: result.message }
    }
    catch (error: any) {
      return { isSuccess: false, message: error?.message || '登录失败' }
    }
    finally {
      loginLoading.value = false
    }
  }

  /** 退出登录 */
  async function logout(): Promise<void> {
    const accessToken = token.get()
    if (accessToken?.refresh_token) {
      try {
        await authorize.unToken(accessToken.refresh_token)
      }
      catch {}
    }
    userInfo.value = null
    permissions.value = []
    allPermissions.value = []
    token.remove()
    // 不清除 key，不跳转；key 在有效期内可复用
    status.value = 'guest'
  }

  /** 降级（拦截器 token 刷新失败时调用） */
  function downgrade(): void {
    token.remove()
    status.value = 'guest'
    // 不跳转，不弹 toast
  }

  return {
    // 状态
    status,
    key,
    userInfo,
    permissions,
    allPermissions,
    loginLoading,
    // 计算属性
    isLoggedIn,
    isAdmin,
    // 重定向
    saveLoginRedirect,
    consumeLoginRedirect,
    navigateAfterLogin,
    // Actions
    init,
    ensureKey,
    login,
    logout,
    downgrade,
  }
})
