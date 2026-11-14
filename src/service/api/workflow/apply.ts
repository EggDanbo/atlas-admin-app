import { request } from '@/service/http'

const url = 'workflow/apply'

export default {
  /**
   * 获取分页列表
   * @param data 请求数据
   */
  search: (data?: Recordable) => {
    return request.Post<Service.ResultPage<Recordable>>(`${url}/search`, data || {})
  },
  /**
   * 单据详情（含审批流）
   * @param id 单据 id
   */
  get: (id: string) => {
    return request.Get<Service.Result<Recordable>>(`${url}/get`, { params: { id } })
  },
  /**
   * 撤回申请（仅待审批 / 审批中可撤回）
   * @param id 单据 id
   */
  revoke: (id: string) => {
    return request.Post<Service.Result<string>>(`${url}/revoke`, { id })
  },
  /**
   * 导出Excel
   * @param data 请求数据
   */
  export: (data: Service.SearchCondition) => {
    return request.Post<Service.Result<string>>(`${url}/export`, data, { timeout: 1000 * 60 * 2 })
  },
  /**
   * 打印
   * @param data 请求数据
   */
  print: (data: Service.SearchCondition) => {
    return request.Post<Service.Result<string>>(`${url}/print`, data, { timeout: 1000 * 60 * 2 })
  },
}
