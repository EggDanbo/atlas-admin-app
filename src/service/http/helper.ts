import { showToast } from '@/components/SpToast'
import { NO_ERROR_TIP_CODES } from '@/constants/enum'
import authorize from '@/service/api/identity/authorize'
import { token } from '@/utils/token'
import { responseStatus } from './config'

/** 统一成功和失败返回类型 */
export function handleServiceResult(response: any, data: any, isSuccess = true) {
  return {
    response,
    isSuccess,
    errorType: null as any,
    ...data,
  }
}

/** 处理业务错误 */
export function handleBusinessError(
  data: Record<string, any>,
  config: AlovaService.Config,
  showErr?: boolean,
): Service.BaseResponse {
  const error: Service.BaseResponse = {
    errorType: 'Business Error',
    code: data[config.codeField],
    message: data[config.messageField] || 'Unknown error',
    data: data[config.dataField],
  }
  if (showErr === undefined || showErr === true)
    showError(error)
  return error
}

/** 处理响应错误 */
export function handleResponseError(response: any): Service.BaseResponse {
  const status = response.status ?? response.statusCode ?? 0
  const error: Service.BaseResponse = {
    errorType: 'Response Error',
    code: status,
    message: (responseStatus as any)[status] || '请求错误',
    data: null,
  }
  showError(error)
  return error
}

/** 处理 Token 凭证注入 */
export function handlerToken(config: AlovaService.Config, method: any) {
  if (method.meta?.withToken !== false) {
    const accessToken = token.get()
    if (accessToken) {
      if (!method.config.headers) {
        method.config.headers = {}
      }
      method.config.headers[config.tokenField]
        = `${accessToken.token_type} ${accessToken.access_token}`
    }
  }
}

/** URL 路径小写转换（不转换查询参数） */
export function normalizeUrlToLowerCase(method: any) {
  const url = method.url as string
  if (!url)
    return
  const [path, query] = url.split('?')
  method.url = query ? `${path.toLowerCase()}?${query}` : path.toLowerCase()
}

/** 显示错误提示 */
export function showError(error: Service.BaseResponse) {
  const code = Number(error.code)
  if (NO_ERROR_TIP_CODES.includes(code))
    return
  showToast(error.message || '请求失败', { duration: 2000 })
}

// 刷新 Token 的 Promise 缓存
let refreshTokenPromise: Promise<void> | null = null

/** 刷新 Token */
export async function handleRefreshToken() {
  if (refreshTokenPromise)
    return refreshTokenPromise

  const accessToken = token.get()

  // 无 refresh_token（guest 用户），静默 reject
  if (!accessToken || !accessToken.refresh_token) {
    token.remove()
    return
  }

  refreshTokenPromise = (async () => {
    try {
      const { data, isSuccess } = await authorize.refreshToken(accessToken.refresh_token!)
      if (isSuccess && data) {
        token.set(data)
      }
      else {
        // 刷新失败，降级为 guest
        downgradeAuth()
      }
    }
    catch {
      // 刷新异常，降级为 guest
      downgradeAuth()
    }
    finally {
      refreshTokenPromise = null
    }
  })()

  return refreshTokenPromise
}

/** 认证降级（延迟导入避免循环依赖） */
function downgradeAuth() {
  token.remove()
  // 延迟导入 authStore 避免循环依赖
  import('@/stores/auth').then(({ useAuthStore }) => {
    const authStore = useAuthStore()
    authStore.downgrade()
  })
}
