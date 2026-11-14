import { request } from '@/service/http'

/** 单位信息 */
export default {
  /**
   * 获取树状选择
   * @param data 请求数据
   */
  tree: (data?: Recordable) => {
    return request.Post<Service.Result<Recordable[]>>(`organ/team/tree`, data || {})
  },
  /**
   * 获取编辑的详细信息
   * @param id ID
   */
  get: (id: string) => {
    return request.Get<Service.Result<Recordable>>(`organ/team/get`, {
      params: { id },
    })
  },
  /**
   * 获取分页列表
   * @param data 请求数据
   */
  search: (data: Service.SearchCondition) => {
    return request.Post<Service.ResultPage<Recordable>>(`organ/team/search`, data)
  },
  /**
   * 新增
   * @param data 请求数据
   */
  create: (data: Recordable) => {
    return request.Post<Service.Result<string>>(`organ/team/create`, data)
  },
  /**
   * 修改
   * @param data 请求数据
   */
  update: (data: Recordable) => {
    return request.Post<Service.Response>(`organ/team/update`, data)
  },
  /**
   * 删除
   * @param data 请求数据
   */
  delete: (data: Recordable) => {
    return request.Post<Service.Response>(`organ/team/delete`, data)
  },
  /**
   * 停用/启用
   * @param data 请求数据
   */
  updateStoped: (data: Recordable) => {
    return request.Post<Service.Response>(`organ/team/updatestoped`, data)
  },
  /**
   * 导出Excel
   * @param data 请求数据
   */
  export: (data: Service.SearchCondition) => {
    return request.Post<Service.Result<string>>(`organ/team/export`, data, { timeout: 1000 * 60 * 2 })
  },
  /**
   * 打印
   * @param data 请求数据
   */
  print: (data: Service.SearchCondition) => {
    return request.Post<Service.Result<string>>(`organ/team/print`, data, { timeout: 1000 * 60 * 2 })
  },
  /**
   * 批量导入
   * @param data 请求数据
   */
  batchImport: (data: Recordable) => {
    return request.Post<Service.Response>(`organ/team/createbatchimport`, data, { timeout: 1000 * 60 * 2 })
  },
}
