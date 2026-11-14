import type { ObjectDirective } from 'vue'
import { usePermission } from '@/hooks/permission/usePermission'

/**
 * v-permission 指令
 * 用法：v-permission="{ action: ['PERMISSION_CODE'], effect: 'disabled' | 'hidden' }"
 */
export const permission: ObjectDirective = {
  mounted(el: any, binding) {
    if (binding.value === undefined)
      return
    const { action, effect } = binding.value
    const { hasPermission } = usePermission()
    if (!hasPermission(action)) {
      if (effect === 'disabled') {
        el.disabled = true
        el.setAttribute('disabled', '')
      }
      else {
        // 小程序兼容：用 display:none 替代 removeChild
        el.style.display = 'none'
      }
    }
  },
}

/**
 * v-perm 指令
 * 用法：v-perm="['PERMISSION_CODE']"
 * 无权限时 disabled
 */
export const perm: ObjectDirective = {
  mounted(el: any, binding) {
    if (binding.value === undefined)
      return
    const perms = binding.value
    const { hasPermission } = usePermission()
    if (!hasPermission(perms)) {
      el.disabled = true
      el.setAttribute('disabled', '')
    }
  },
}

/**
 * v-permHide 指令
 * 用法：v-permHide="['PERMISSION_CODE']"
 * 无权限时隐藏元素（小程序兼容）
 */
export const permHide: ObjectDirective = {
  mounted(el: any, binding) {
    if (binding.value === undefined)
      return
    const perms = binding.value
    const { hasPermission } = usePermission()
    if (!hasPermission(perms)) {
      // 小程序兼容：用 display:none 替代 removeChild
      el.style.display = 'none'
    }
  },
}
