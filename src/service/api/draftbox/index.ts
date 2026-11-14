import { request } from '@/service/http'

export interface DraftBoxEntity {
  id: number
  cuser: number
  ctime: string
  utime: string
  types: string
  data: string
  memo: string
}

/** 草稿箱 */
export default {
  /** 获取草稿信息 */
  get: (id: number) => {
    return request.Get<Service.Result<DraftBoxEntity>>(`draftbox/get`, {
      params: { id },
    })
  },
  /** 查询草稿列表 */
  list: (types: string) => {
    return request.Get<Service.Result<DraftBoxEntity[]>>(`draftbox/list`, {
      params: { types },
    })
  },
  /** 查询草稿分页列表 */
  search: (data: any) => {
    return request.Post<Service.Result<Recordable>>(`draftbox/search`, data)
  },
  /** 保存草稿 */
  save: (types: string, data: Recordable, memo?: string) => {
    return request.Post<Service.Result<string>>(`draftbox/save`, {
      types,
      data: JSON.stringify(data),
      memo,
    })
  },
  /** 删除草稿 */
  remove: (id: number) => {
    return request.Post<Service.Response>(`draftbox/remove`, { id })
  },
}
