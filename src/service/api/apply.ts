import { request } from '@/service/http'

const url = 'atlas/apply'

export default {
  /** 提交申请（请假 / 加班） */
  submit: (data: Recordable) => {
    return request.Post<Service.Result<{ ok: boolean, no: string }>>(`${url}/submit`, data)
  },
}
