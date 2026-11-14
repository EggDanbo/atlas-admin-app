import { request } from '@/service/http'

const authPrefix = process.env.TARO_APP_API_AUTH_PREFIX || 'mis'

/** 登录授权 API */
export default {
  /** 账号密码登录 */
  token: (data: Auth.PasswordTokenCommand) => {
    const method = request.Post<Service.Result<Auth.AccessToken>>(
      `/${authPrefix}/authorize/tokensafety`,
      data,
    )
    method.meta = {
      withToken: false,
      authRole: null,
      showErr: false,
    }
    return method
  },

  /** 注销令牌 */
  unToken: (refresh_token: string | undefined) => {
    const method = request.Get(`/identity/authorize/untoken`, {
      params: { refresh_token },
    })
    method.meta = {
      authRole: 'refreshToken',
      isReturnNativeResponse: true,
      isTransformResponse: false,
    }
    return method
  },

  /** 刷新令牌 */
  refreshToken: (refresh_token: string) => {
    const method = request.Get<Service.Result<Auth.AccessToken>>(
      `/${authPrefix}/authorize/refreshtoken`,
      { params: { key: refresh_token } },
    )
    method.meta = {
      withToken: false,
      authRole: 'refreshToken',
    }
    return method
  },
  /**
   * 发送登录验证码
   * @param data
   */
  sendVerifyCode: (data: Auth.SendVerifyCodeCommand) => {
    const method = request.Post<Service.Response>(`/${authPrefix}/authorize/sendverifycode`, data)
    method.meta = {
      withToken: false,
      authRole: null,
      showErr: false,
    }
    return method
  },
  /**
   * 基于短信验证码获取API授权令牌
   * @param data 请求数据
   */
  sms: (data: Auth.VerifyCodeTokenCommand) => {
    const method = request.Post<Service.Result<Auth.AccessToken>>(`/${authPrefix}/authorize/sms`, data)
    method.meta = {
      withToken: false,
      authRole: null,
      showErr: false,
    }
    return method
  },
}
