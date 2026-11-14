import Taro from '@tarojs/taro'

/** 认证平台类型 */
export type AuthPlatform = 'weapp' | 'h5-wechat' | 'h5-wecom' | 'h5-browser'

type H5Platform = Exclude<AuthPlatform, 'weapp'>

/** URL from 参数和 sessionStorage 的有效值 */
const VALID_H5_PLATFORMS: readonly H5Platform[] = ['h5-wecom', 'h5-wechat', 'h5-browser']

const SESSION_KEY = 'auth_platform'

const WECOM_UA_REGEX = /wxwork/i
const WECHAT_UA_REGEX = /MicroMessenger/i

/** 从 URL 或 sessionStorage 读取平台参数 */
function resolveFromOverride(): H5Platform | null {
  // ① URL from 参数（最高优先级）
  if (typeof window !== 'undefined') {
    const from = new URLSearchParams(window.location.search).get('from')
    if (from && (VALID_H5_PLATFORMS as readonly string[]).includes(from)) {
      const platform = from as H5Platform
      try {
        sessionStorage.setItem(SESSION_KEY, platform)
      }
      catch {}
      return platform
    }

    // ② sessionStorage（OAuth 回调后 URL 参数丢失，靠此兜底）
    try {
      const cached = sessionStorage.getItem(SESSION_KEY)
      if (cached && (VALID_H5_PLATFORMS as readonly string[]).includes(cached)) {
        return cached as H5Platform
      }
    }
    catch {}
  }

  return null
}

/** 从 UA 检测 H5 平台 */
function resolveFromUA(): H5Platform {
  if (typeof navigator === 'undefined')
    return 'h5-browser'

  const ua = navigator.userAgent
  // wxwork 先判断（wxwork UA 也包含 MicroMessenger）
  if (WECOM_UA_REGEX.test(ua))
    return 'h5-wecom'
  if (WECHAT_UA_REGEX.test(ua))
    return 'h5-wechat'

  // 非 WeChat 环境，兜底普通浏览器
  return 'h5-browser'
}

/** 获取当前认证平台类型 */
export function getAuthPlatform(): AuthPlatform {
  const env = Taro.getEnv()
  if (env === Taro.ENV_TYPE.WEAPP)
    return 'weapp'

  if (env === Taro.ENV_TYPE.WEB) {
    const override = resolveFromOverride()
    if (override)
      return override
    return resolveFromUA()
  }

  return 'h5-browser'
}

/** 是否为微信小程序环境 */
export function isWeapp(): boolean {
  return getAuthPlatform() === 'weapp'
}

/** 是否为 H5 微信浏览器环境 */
export function isH5Wechat(): boolean {
  return getAuthPlatform() === 'h5-wechat'
}

/** 是否为 H5 企业微信环境 */
export function isH5Wecom(): boolean {
  return getAuthPlatform() === 'h5-wecom'
}

/** 是否为 H5 普通浏览器环境 */
export function isH5Browser(): boolean {
  return getAuthPlatform() === 'h5-browser'
}
