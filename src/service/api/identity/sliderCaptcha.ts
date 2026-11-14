import type { CaptchaDataResponse, TrailPoint, VerifyResult } from '@/components/SpSliderCaptcha/src/types'
import { request } from '@/service/http'

/** 滑块验证码 API */
export default {
  /** 获取滑块验证码配置 */
  getCaptcha: () => {
    const method = request.Get<Service.Result<CaptchaDataResponse>>('/captcha/slider')
    method.meta = { withToken: false }
    return method
  },

  /** 校验滑块验证码 */
  verify: (key: string, sliderX: number, sliderTime: number, trail?: TrailPoint[]) => {
    const method = request.Post<Service.Result<VerifyResult>>('/captcha/slider/verify', {
      key,
      slideX: sliderX,
      slideTime: sliderTime,
      trail,
    })
    method.meta = { withToken: false }
    return method
  },
}
