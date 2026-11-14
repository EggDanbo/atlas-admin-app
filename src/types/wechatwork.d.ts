/** 企业微信认证相关类型定义 */
declare namespace WechatWorkAuth {
  /** 获取 ConnectOAuth2 授权 URL 请求参数 */
  interface GetOAuth2UrlReq {
    /** 回调地址 */
    redirect_uri: string
  }

  /** Code 换身份请求参数 */
  interface TokenReq {
    /** 企业微信 OAuth 授权码 */
    code: string
    /** OAuth URL 中的 state 参数 */
    state: string
  }

  /** 短信验证码绑定请求参数 */
  interface BindReq {
    /** token 接口返回的加密 key */
    key: string
    /** 短信验证码 */
    code: string
  }

  /** 发送短信验证码请求参数 */
  interface SendVerifyCodeReq {
    /** token 接口返回的加密 key */
    key: string
    /** 手机号码 */
    mobile: string
  }

  /** JSSDK 签名请求参数 */
  interface JSSDKSignatureReq {
    /** 当前页面 URL（注意 urlencode） */
    url: string
  }

  /** 企业微信应用信息 */
  interface AppInfo {
    /** 应用 ID */
    appid: string
    /** AgentID */
    agentid: string
  }
}
