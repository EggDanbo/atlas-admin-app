import { request } from '@/service/http'

/** 用户信息 API */
export default {
  /**
   * 获取当前登录用户信息
   */
  get: () => {
    return request.Get<Service.Result<Auth.UserCurrent>>(`identity/profile/get`)
  },
  /**
   * 我的信息
   */
  info: () => {
    return request.Get<Service.Result<Auth.UserProfile>>(`identity/profile/info`)
  },
  /**
   * 统计信息
   */
  stats: () => {
    return request.Get<Service.Result<DropDownItem>>(`identity/profile/stats`)
  },
  /**
   * 我的密码修改
   */
  changePassword: (data: Auth.ChangePassWordCommand) => {
    return request.Post<Service.Response>(`identity/profile/changepassword`, data)
  },
  /**
   * 我的信息修改
   */
  updateProfile: (data: Auth.UpdateProfileCommand) => {
    return request.Post<Service.Response>(`identity/profile/updateprofile`, data)
  },
  /**
   * 人脸照片更新（调用方自行展示服务端错误文案，避免重复全局提示）
   */
  updateFace: (data: { image_pic: string, image_url?: string }) => {
    const method = request.Post<Service.Response>(`identity/profile/updateface`, data)
    method.meta = { showErr: false }
    return method
  },
}
