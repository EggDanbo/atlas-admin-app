import Taro from '@tarojs/taro'

/** 路由常量 */
export const routes = {
  redirect: '/pages/redirect/index',
  home: '/pages/index/index',
  mine: '/pages/mine/index',
  login: '/pages/login/index',
  checkin: '/pages/checkin/index',
  checkinRecords: '/pages/checkin/records',
  checkinStats: '/pages/checkin/stats',
  apply: '/pages/apply/index',
  applyLeave: '/pages/apply/leave',
  contact: '/pages/contact/index',
  ruleList: '/pages/rules/index',
  ruleDetail: '/pages/rules/detail',
  ruleEdit: '/pages/rules/edit',
  board: '/pages/board/index',
  team: '/pages/team/index',
  profile: '/pages/mine/profile/index',
  password: '/pages/mine/password/index',
  facePhoto: '/pages/mine/face/index',
  userMessage: '/pages/user/message/index',
  myApply: '/pages/apply/list',
  myApplyDetail: '/pages/apply/detail',
  minePreview: '/pages/mine/preview/index',
} as const

/** TabBar 页面列表 */
export const tabPages: string[] = [routes.home, routes.mine]

/** 判断是否为 TabBar 页面 */
export function isTabBarPage(url: string): boolean {
  return tabPages.includes(url.split('?')[0])
}

/** 构建查询字符串 */
export function buildQuery(params: Record<string, string | number | undefined>): string {
  const searchParams = new URLSearchParams()
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== '') {
      searchParams.append(key, String(value))
    }
  })
  return searchParams.toString()
}

/** H5 子路径部署前缀 */
export const H5_BASENAME = `/${process.env.TARO_APP_H5_BASENAME || 'app'}`

/**
 * 去除路径中的 H5 basename 前缀
 *
 * Taro H5 使用 basename 配置子路径部署，router.path 可能包含该前缀。
 * 此函数统一剥离，确保路由跳转时不会产生双重前缀。
 */
export function stripBasename(path: string): string {
  return path.startsWith(H5_BASENAME) ? path.slice(H5_BASENAME.length) : path
}

/**
 * 获取当前页面的干净路径和参数
 *
 * Taro H5 的 router.path 包含内部 stamp 参数（如 ?stamp=AA），
 * router.params 包含 stamp 和 $taroTimestamp 等 Taro 内部参数，
 * 此函数统一剥离这些内部干扰，返回纯净的页面信息。
 */
export function getCurrentPageInfo() {
  const instance = Taro.getCurrentInstance()
  const router = instance?.router
  // H5 中 router.path 包含 Taro 内部 stamp 参数，需剥离
  const path = (router?.path || '').split('?')[0]
  // 过滤 Taro 内部参数：stamp（页面标识）、$ 前缀（如 $taroTimestamp）
  const params: Record<string, string> = {}
  if (router?.params) {
    for (const [key, val] of Object.entries(router.params)) {
      if (key !== 'stamp' && !key.startsWith('$'))
        params[key] = String(val)
    }
  }
  return { path, params }
}
