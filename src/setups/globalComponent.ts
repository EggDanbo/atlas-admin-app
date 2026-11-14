/**
 * 全局注册自定义组件
 * @param app
 */
import type { App } from 'vue'
import { SpEmpty } from '@/components/SpEmpty'
import { Watermark } from '@/components/Watermark'

export function setupGlobalComponent(app: App) {
  app.component('Watermark', Watermark)
  app.component('SpEmpty', SpEmpty)
}
