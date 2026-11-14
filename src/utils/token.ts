import { storage } from './storage'

const TOKEN_KEY = 'ACCESS-TOKEN'

/** Token 管理 */
export const token = {
  get(): Auth.AccessToken | null {
    return storage.get<Auth.AccessToken>(TOKEN_KEY)
  },

  set(data: Auth.AccessToken): void {
    const timestamp = Date.now()
    data.expires_time = timestamp + 1000 * data.expires_in
    data.update_time = timestamp
    storage.set(TOKEN_KEY, data)
  },

  remove(): void {
    storage.remove(TOKEN_KEY)
  },

  isExpired(): boolean {
    const data = this.get()
    if (!data || !data.expires_time)
      return true
    // 提前3分钟判定过期
    return data.expires_time - Date.now() < 180 * 1000
  },
}
