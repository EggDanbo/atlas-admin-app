/**
 * 颜色常量（与 variables.scss 保持同步）
 *
 * 主色定义在 variables.scss 的 $primary-color，
 * 同时通过 app.scss 的 --nut-primary-color 覆盖 NutUI 运行时主题。
 * 此文件供 JS/TS 侧引用，修改主色时需同步更新三处。
 */
export const colors = {
  primary: '#4f46e5',
  success: '#16a34a',
  danger: '#dc2626',
  warning: '#f59e0b',
  info: '#4f46e5',
  purple: '#7232dd',
  blue: '#4f46e5',
} as const
