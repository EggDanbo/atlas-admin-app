import type { AlovaRequestAdapter } from 'alova'
import { respond } from './engine'

/** 模拟网络延迟：保留 loading 态，交互更像真实请求 */
const DELAY = 180

/**
 * 本地数据适配器
 *
 * 与 @alova/mock 不同，这里不区分「命中/未命中」：
 * 所有请求都在浏览器内闭环，永不发起网络请求。
 */
export function createMockAdapter(delay = DELAY): AlovaRequestAdapter<any, any, any> {
  return (_elements, method) => {
    let body: any
    try {
      body = respond(method as any, _elements)
    }
    catch (error) {
      // 数据生成异常不能让页面白屏：打印原因并返回失败响应
      console.error('[atlas-mock]', (method as any).url, error)
      body = { code: 500, data: null, message: String(error) }
    }

    const response = () =>
      new Promise((resolve) => {
        setTimeout(() => {
          resolve({
            status: 200,
            statusText: 'OK',
            data: body,
            headers: {},
          })
        }, delay)
      })

    return {
      response,
      headers: () => Promise.resolve({}),
      abort: () => {},
    } as any
  }
}
