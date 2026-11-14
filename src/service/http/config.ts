// Mock 配置
export const defaultMockConfig = {
  // mock 接口响应延迟，单位毫秒
  delay: 300,
}

// 请求配置
export const defaultConfig: AlovaService.Config = {
  codeField: 'code',
  messageField: 'message',
  dataField: 'data',
  successCode: 0,
  tokenField: 'Authorization',
  authenticationScheme: '',
  joinTime: false,
  baseURL: '',
  alovaConfig: {
    cacheLogger: typeof process !== 'undefined' && process.env.NODE_ENV === 'development',
    cacheFor: null,
    timeout: 15 * 1000,
  },
}

// 错误信息配置
export const errorConfig = {
  isShowMessage: true,
  default: '请求失败',
  500: '服务器错误',
  701: '请求失败',
  720: '请求超时',
  730: '参数错误',
  900: '暂无权限',
  901: '缺少凭证',
  902: '凭证校验失败',
  903: '账号异常',
  912: '需要登录',
} as const

// HTTP 状态码对应信息
export const responseStatus = {
  400: '请求出现语法错误',
  401: '用户未授权',
  403: '服务器拒绝访问',
  404: '请求的资源不存在',
  405: '请求方法未允许',
  408: '网络请求超时',
  500: '服务器内部错误',
  502: '错误网关',
  503: '服务不可用',
  504: '网关超时',
} as const
