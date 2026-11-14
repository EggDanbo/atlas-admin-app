/**
 * 通用回调转 Promise 工厂函数
 * 覆盖 Taro 未完全 Promise 化的 API 和 JSSDK 调用类 API（{ success, fail } 风格）
 */
export function promisify<T = any>(
  fn: (options: Record<string, any>) => void,
  options: Record<string, any> = {},
): Promise<T> {
  return new Promise((resolve, reject) => {
    fn({
      ...options,
      success: (res: T) => resolve(res),
      fail: (err: any) => reject(err),
    })
  })
}
