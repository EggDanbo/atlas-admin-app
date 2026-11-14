import Taro from '@tarojs/taro'

const STORAGE_PREFIX = 'lhapp:'

function prefixKey(key: string): string {
  return `${STORAGE_PREFIX}${key}`
}

/** Taro Storage 封装（带项目前缀，避免同源多项目 key 冲突） */
export const storage = {
  get<T = any>(key: string): T | null {
    try {
      const val = Taro.getStorageSync(prefixKey(key))
      return val !== '' && val !== undefined ? (val as T) : null
    }
    catch {
      return null
    }
  },

  set(key: string, value: any): void {
    try {
      Taro.setStorageSync(prefixKey(key), value)
    }
    catch {
      // ignore storage errors
    }
  },

  remove(key: string): void {
    try {
      Taro.removeStorageSync(prefixKey(key))
    }
    catch {
      // ignore storage errors
    }
  },

  clear(): void {
    try {
      const { keys } = Taro.getStorageInfoSync()
      for (const key of keys) {
        if (key.startsWith(STORAGE_PREFIX)) {
          Taro.removeStorageSync(key)
        }
      }
    }
    catch {
      // ignore storage errors
    }
  },
}
