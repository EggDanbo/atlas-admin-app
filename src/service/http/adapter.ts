import { createMockAdapter } from '@/mock/adapter'

/**
 * 全站本地数据适配器
 *
 * 演示版没有后端：所有接口都由 src/mock/engine.ts 在本地生成，
 * 请求不会离开浏览器 / 小程序运行时。
 */
export const mockAdapter = createMockAdapter()
