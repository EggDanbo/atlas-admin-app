import { request } from '@/service/http'

/** 外部机构 */
export default {
  /**
   * 根据列表选择
   * @param data 请求数据
   */
  list: (data: Recordable) => {
    return request.Post<Service.ResultPage<Recordable>>(`organ/outer/list`, data)
  },
  /**
   * 获取编辑的详细信息
   * @param id ID
   */
  get: (id: string) => {
    return request.Get<Service.Result<Recordable>>(`organ/outer/get`, {
      params: { id },
    })
  },
  /**
   * 获取分页列表
   * @param data 请求数据
   */
  search: (data: Service.SearchCondition) => {
    return request.Post<Service.ResultPage<Recordable>>(`organ/outer/search`, data)
  },
  /**
   * 新增
   * @param data 请求数据
   */
  create: (data: Recordable) => {
    return request.Post<Service.Result<string>>(`organ/outer/create`, data)
  },
  /**
   * 修改
   * @param data 请求数据
   */
  update: (data: Recordable) => {
    return request.Post<Service.Response>(`organ/outer/update`, data)
  },
  /**
   * 删除
   * @param data 请求数据
   */
  delete: (data: Recordable) => {
    return request.Post<Service.Response>(`organ/outer/delete`, data)
  },
  /**
   * 合并客户
   * @param data 请求数据
   */
  merge: (data: Recordable) => {
    return request.Post<Service.Response>(`organ/outer/merge`, data)
  },
  /**
   * 修改名称
   * @param data 请求数据
   */
  updateName: (data: Recordable) => {
    return request.Post<Service.Response>(`organ/outer/updatename`, data)
  },
  /**
   * 停用/启用
   * @param data 请求数据
   */
  updateStoped: (data: Recordable) => {
    return request.Post<Service.Response>(`organ/outer/updatestoped`, data)
  },
  /**
   * 导出Excel
   * @param data 请求数据
   */
  export: (data: Service.SearchCondition) => {
    return request.Post<Service.Result<string>>(`organ/outer/export`, data, { timeout: 1000 * 60 * 2 })
  },
  /**
   * 打印
   * @param data 请求数据
   */
  print: (data: Service.SearchCondition) => {
    return request.Post<Service.Result<string>>(`organ/outer/print`, data, { timeout: 1000 * 60 * 2 })
  },
  /**
   * 批量导入
   * @param data 请求数据
   */
  batchImport: (data: Recordable) => {
    return request.Post<Service.Response>(`organ/outer/createbatchimport`, data, { timeout: 1000 * 60 * 2 })
  },
}
