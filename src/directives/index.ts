import type { App } from 'vue'

import { perm, permHide } from './permission'

/**
 * 注册全局自定义指令
 * 对齐 fw-ui/src/directives 结构
 */
export function setupDirectives(app: App) {
  /**
   * 权限控制指令
   * 使用方式：v-permission="{ action: 'user:add', effect: 'disabled' }"
   * - action: 权限标识
   * - effect: 'disabled'（禁用）或 'remove'（移除元素）
   */
  app.directive('permission', perm)
  app.directive('perm', perm)
  app.directive('permHide', permHide)
}
