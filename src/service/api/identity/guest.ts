import { request } from '@/service/http'

const authPrefix = process.env.TARO_APP_API_AUTH_PREFIX || 'mis'
const guestPrefix = `/${authPrefix}/authorize/guest`
const guestProfilePrefix = `/${authPrefix}/guest/profile`

/** 访客认证 API */
export default {
  /** 访客登录（微信 OAuth code 换身份） */
  login: (data: { code: string, state: string }) => {
    const method = request.Post<Service.Result<WechatAuth.LoginTokenDto>>(
      `${guestPrefix}/login`,
      data,
    )
    method.meta = { withToken: false, showErr: false }
    return method
  },

  /** 访客登记（提交个人信息获取 JWT） */
  register: (data: GuestAuth.RegisterReq) => {
    const method = request.Post<Service.Result<WechatAuth.LoginTokenDto>>(
      `${guestPrefix}/register`,
      data,
    )
    method.meta = { withToken: false, showErr: false }
    return method
  },

  /** 获取当前访客信息 */
  getProfile: () => {
    return request.Get<Service.Result<GuestAuth.GuestInfo>>(`${guestProfilePrefix}/get`)
  },

  /** 获取访客详细信息 */
  getInfo: () => {
    return request.Get<Service.Result<GuestAuth.GuestProfile>>(`${guestProfilePrefix}/info`)
  },

  /** 更新访客信息 */
  updateProfile: (data: GuestAuth.UpdateProfileReq) => {
    return request.Post<Service.Response>(`${guestProfilePrefix}/updateprofile`, data)
  },

  /** 人脸照片上传 */
  updateFace: (data: GuestAuth.UpdateFaceReq) => {
    return request.Post<Service.Response>(`${guestProfilePrefix}/updateface`, data)
  },

  /** 获取访客二维码（base64） */
  getQrCode: () => {
    return request.Get<Service.Result<string>>(`${guestProfilePrefix}/qrcode`)
  },
}
