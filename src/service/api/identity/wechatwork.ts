import { request } from '@/service/http'

const authPrefix = process.env.TARO_APP_API_AUTH_PREFIX || 'mis'
const wecomPrefix = `/${authPrefix}/authorize/wechatwork`

/** 企业微信认证 API */
export default {
  /** 获取企业微信 ConnectOAuth2 授权 URL */
  getOAuth2Url: (data: WechatWorkAuth.GetOAuth2UrlReq) => {
    const method = request.Post<Service.Result<string>>(
      `${wecomPrefix}/urlforconnectoauth2`,
      data,
    )
    method.meta = { withToken: false, showErr: false }
    return method
  },

  /** Code 换身份 */
  getToken: (data: WechatWorkAuth.TokenReq) => {
    const method = request.Post<Service.Result<WechatAuth.LoginTokenDto>>(
      `${wecomPrefix}/token`,
      data,
    )
    method.meta = { withToken: false, showErr: false }
    return method
  },

  /** 短信验证码绑定企业微信用户 */
  bind: (data: WechatWorkAuth.BindReq) => {
    const method = request.Post<Service.Result<WechatAuth.LoginTokenDto>>(
      `${wecomPrefix}/bind`,
      data,
    )
    method.meta = { withToken: false, showErr: false }
    return method
  },

  /** 发送短信验证码 */
  sendVerifyCode: (data: WechatWorkAuth.SendVerifyCodeReq) => {
    const method = request.Post<Service.Response>(
      '/authorize/wechatwork/sendverifycode',
      data,
    )
    method.meta = { withToken: false, showErr: false }
    return method
  },

  /** JSSDK 签名 */
  signJSSDK: (data: WechatWorkAuth.JSSDKSignatureReq) => {
    const method = request.Post<Service.Result<Record<string, string>>>(
      `${wecomPrefix}/signjssdk`,
      data,
    )
    method.meta = { withToken: false }
    return method
  },

  /** 获取企业微信应用信息 */
  getApp: () => {
    const method = request.Get<Service.Result<WechatWorkAuth.AppInfo>>(
      `${wecomPrefix}/getapp`,
    )
    method.meta = { withToken: false }
    return method
  },

  /** 获取 OAuth state（CSRF 验证） */
  getState: () => {
    const method = request.Get<Service.Result<string>>(
      '/authorize/wechatwork/getstate',
    )
    method.meta = { withToken: false }
    return method
  },
}
