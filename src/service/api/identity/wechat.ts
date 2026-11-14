import { request } from '@/service/http'

const authPrefix = process.env.TARO_APP_API_AUTH_PREFIX || 'mis'
const wechatPrefix = `/${authPrefix}/authorize/wechat`

/** 微信认证 API */
export default {
  /** 获取微信 OAuth 授权 URL（仅 H5） */
  getAuthorizeUrl: (params: WechatAuth.GetAuthorizeUrlReq) => {
    const method = request.Get<Service.Result<string>>(
      `${wechatPrefix}/getauthorizeurl`,
      { params },
    )
    method.meta = { withToken: false, showErr: false }
    return method
  },

  /** Code 换身份 — 公众号（仅 H5） */
  getWxToken: (data: WechatAuth.WxTokenReq) => {
    const method = request.Post<Service.Result<WechatAuth.LoginTokenDto>>(
      `${wechatPrefix}/token`,
      data,
    )
    method.meta = { withToken: false, showErr: false }
    return method
  },

  /** Code 换身份 — 小程序 */
  getWxappToken: (data: WechatAuth.WxappTokenReq) => {
    const method = request.Post<Service.Result<WechatAuth.LoginTokenDto>>(
      `${wechatPrefix}/apptoken`,
      data,
    )
    method.meta = { withToken: false, showErr: false }
    return method
  },

  /** 短信验证码登录 + 绑定（H5） */
  bindWxUser: (data: WechatAuth.WxBindReq) => {
    const method = request.Post<Service.Result<WechatAuth.LoginTokenDto>>(
      `${wechatPrefix}/bind`,
      data,
    )
    method.meta = { withToken: false, showErr: false }
    return method
  },

  /** 短信验证码登录 + 绑定（小程序） */
  bindWxappUser: (data: WechatAuth.WxappBindReq) => {
    const method = request.Post<Service.Result<WechatAuth.LoginTokenDto>>(
      `${wechatPrefix}/appbind`,
      data,
    )
    method.meta = { withToken: false, showErr: false }
    return method
  },

  /** 微信手机号一键登录（仅小程序） */
  phoneLoginToken: (data: WechatAuth.WxappPhoneReq) => {
    const method = request.Post<Service.Result<WechatAuth.LoginTokenDto>>(
      `${wechatPrefix}/appphonelogintoken`,
      data,
    )
    method.meta = { withToken: false, showErr: false }
    return method
  },

  /** 发送短信验证码（H5） */
  sendVerifyCode: (data: WechatAuth.SendVerifyCodeReq) => {
    const method = request.Post<Service.Response>(
      `/authorize/wechat/sendverifycode`,
      data,
    )
    method.meta = { withToken: false, showErr: false }
    return method
  },

  /** 发送短信验证码（小程序） */
  sendAppVerifyCode: (data: WechatAuth.SendVerifyCodeReq) => {
    const method = request.Post<Service.Response>(
      `/authorize/wechat/appsendverifycode`,
      data,
    )
    method.meta = { withToken: false, showErr: false }
    return method
  },

  /** JSSDK 签名（仅 H5） */
  signJSSDK: (data: WechatAuth.JSSDKSignatureReq) => {
    const method = request.Post<Service.Result<Record<string, string>>>(
      `${wechatPrefix}/signjssdk`,
      data,
    )
    method.meta = { withToken: false }
    return method
  },
}
