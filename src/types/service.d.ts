/** 请求的相关类型 */
declare namespace Service {
  type RequestErrorType = 'Response Error' | 'Business Error' | null
  type RequestCode = string | number

  /** 基础响应接口 */
  interface BaseResponse {
    response?: any
    errorType: RequestErrorType
    code: RequestCode
    message: string
    data?: any
  }

  /** 响应结果 */
  interface Response extends BaseResponse {
    isSuccess: boolean
  }

  /** 数据响应结果 */
  interface Result<T = any> extends Response {
    data: T
  }

  /** 分页参数 */
  interface Pagination {
    page?: null | number
    pagesize?: null | number
  }

  /** 高级查询筛选条件 */
  interface SearchFilter {
    column?: null | string
    value?: null | string
    express?: null | string
  }

  /** 排序字段 */
  interface SearchOrder {
    column?: null | string
    value?: number
  }

  /** 高级查询筛选条件 */
  interface SearchCondition extends Pagination {
    [key: string]: any
    totalenabled?: boolean
    ids?: null | string[]
    format?: null | string
    searchfilter?: null | SearchFilter[]
    searchorder?: null | SearchOrder[]
  }

  /** 分页信息 */
  interface Paged {
    isempty?: boolean
    totalcount?: number
    page?: number
    pageindex: number
    pagesize: number
    totalpages?: number
    haspreviouspage?: boolean
    hasnextpage?: boolean
  }

  /** 分页列表模型类 */
  interface PagedList<T = any> extends Paged {
    list: T[]
  }

  /** 分页数据响应结果 */
  interface ResultPage<T = any> extends Result<PagedList<T>> {}
}
