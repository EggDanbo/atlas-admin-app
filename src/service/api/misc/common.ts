import { request } from '@/service/http'

export default {
  /** 获取应用配置信息 */
  appinfo: () => {
    const method = request.Get<Service.Result<AppInfo>>('/common/appinfo')
    method.meta = {
      withToken: false,
      authRole: null,
    }
    return method
  },
  /** 枚举列表（访客） */
  enums: () => {
    return request.Get<Service.Result<Recordable<SystemEnums>>>('/common/enums')
  },
}
