// Alova 请求封装类型定义
declare namespace AlovaService {
  interface Config {
    urlPrefix?: string
    codeField: string
    dataField: string
    messageField: string
    successCode: number
    tokenField: string
    authenticationScheme?: string
    joinTime?: boolean
    baseURL: string
    alovaConfig: {
      cacheLogger?: boolean
      cacheFor?: null
      timeout?: number
    }
  }
}
