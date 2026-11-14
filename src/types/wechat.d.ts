/** 微信认证相关类型定义 */
declare namespace WechatAuth {
  /** 微信认证响应（union type） */
  type LoginTokenDto
    = | ({ bound: true } & Auth.AccessToken)
      | { bound: false, key: string }

  /** 获取微信 OAuth 授权 URL 请求参数 */
  interface GetAuthorizeUrlReq {
    /** 回调地址 */
    redirect_uri: string
  }

  /** Code 换身份 — 公众号请求参数 */
  interface WxTokenReq {
    /** 微信 OAuth 授权码 */
    code: string
    /** OAuth URL 中的 state 参数（CSRF 验证，5 分钟有效） */
    state: string
  }

  /** Code 换身份 — 小程序请求参数 */
  interface WxappTokenReq {
    /** wx.login() 获取的授权码 */
    code: string
  }

  /** 短信验证码登录 + 绑定（H5）请求参数 */
  interface WxBindReq {
    /** token 接口返回的加密 key（包含 openid） */
    key: string
    /** 短信验证码 */
    code: string
  }

  /** 短信验证码登录 + 绑定（小程序）请求参数 */
  interface WxappBindReq {
    /** apptoken 接口返回的加密 key */
    key: string
    /** 短信验证码 */
    sms_code: string
    /** wx.login() 获取的授权码 */
    code: string
  }

  /** 微信手机号一键登录请求参数（仅小程序） */
  interface WxappPhoneReq {
    /** getPhoneNumber 返回的 code（新版基础库 2.21.2+） */
    code_phone: string
    /** wx.login() 获取的 code */
    code: string
  }

  /** 发送短信验证码请求参数 */
  interface SendVerifyCodeReq {
    /** token/apptoken 接口返回的加密 key */
    key: string
    /** 手机号码 */
    mobile: string
  }

  /** JSSDK 签名请求参数（仅 H5） */
  interface JSSDKSignatureReq {
    /** 当前页面 URL（注意 urlencode） */
    url: string
  }
}
