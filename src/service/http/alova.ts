import { createAlova } from 'alova'
import { createServerTokenAuthentication } from 'alova/client'
import VueHook from 'alova/vue'
import { showToast } from '@/components/SpToast'
import { appConfig } from '@/constants/config'
import { mockAdapter } from './adapter'
import { defaultConfig } from './config'
import {
  handleBusinessError,
  handleRefreshToken,
  handleResponseError,
  handlerToken,
  handleServiceResult,
  normalizeUrlToLowerCase,
} from './helper'

/** 获取响应状态码（兼容 Taro 的 statusCode） */
function getResponseStatus(response: any): number {
  return response.status ?? response.statusCode ?? 0
}

// 判断 Token 是否过期
function checkTokenExpired(response: any, method: any): boolean {
  if (method.meta?.isExpired)
    return false
  const jsonResult = response.data || {}
  return (
    (getResponseStatus(response) === 401 || jsonResult[defaultConfig.codeField] === 42001)
    && !method.meta?.isExpired
  )
}

function markMethodAsExpired(method: any): void {
  if (!method.meta) {
    method.meta = { isExpired: true }
  }
  else {
    method.meta.isExpired = true
  }
}

const { onAuthRequired, onResponseRefreshToken } = createServerTokenAuthentication({
  assignToken: (method) => {
    handlerToken(defaultConfig, method)
  },
  refreshTokenOnSuccess: {
    isExpired: async (response, method) => checkTokenExpired(response, method),
    handler: async (_response, method) => {
      markMethodAsExpired(method)
      await handleRefreshToken()
    },
  },
  refreshTokenOnError: {
    isExpired: async (response, method) => checkTokenExpired(response, method),
    handler: async (_response, method) => {
      markMethodAsExpired(method)
      await handleRefreshToken()
    },
  },
})

export function createInstance(config: AlovaService.Config) {
  return createAlova({
    ...defaultConfig.alovaConfig,
    baseURL: config.baseURL,
    statesHook: VueHook,
    requestAdapter: mockAdapter,
    beforeRequest: onAuthRequired((method) => {
      normalizeUrlToLowerCase(method)
    }),
    responded: onResponseRefreshToken({
      onSuccess: async (response, method) => {
        const status = getResponseStatus(response)

        if (status !== 200) {
          const errorResult = handleResponseError(response)
          return handleServiceResult(response, errorResult, false)
        }

        if (method.meta?.isReturnNativeResponse) {
          return response
        }

        if (method.meta?.isTransformResponse === false) {
          return (response as any)?.data
        }

        const jsonResult = (response as any).data
        const code = jsonResult[config.codeField]
        const dataSource = jsonResult[config.dataField]

        if (code === 0) {
          return handleServiceResult(response, { data: dataSource })
        }

        const errorResult = handleBusinessError(jsonResult, config, method.meta?.showErr)
        return handleServiceResult(response, errorResult, false)
      },
      onError(error) {
        try {
          const response = (error as any).response
          let code = (error as any).code
          let message = (error as any).message

          if (response) {
            const jsonResult = response.data || {}
            code = jsonResult[config.codeField] || code
            message = jsonResult[config.messageField] || message
          }
          console.error('Error occurred:', { code, message })

          if (response && getResponseStatus(response) === 403) {
            showToast('没有权限访问')
          }
          return Promise.reject(message || 'Unknown error')
        }
        catch {
          return Promise.reject(new Error('Error handling failed'))
        }
      },
    }),
  })
}

export const request = createInstance({
  ...defaultConfig,
  baseURL: appConfig.baseUrl,
})
