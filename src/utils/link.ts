/** 生成外部链接（中转页格式） */
export function buildExternalLink(targetPage: string, params: Record<string, string> = {}) {
  // 确保路径以 / 开头
  const target = targetPage.startsWith('/') ? targetPage : `/${targetPage}`
  const query = new URLSearchParams({ target, ...params })
  return `/pages/redirect/index?${query.toString()}`
}
