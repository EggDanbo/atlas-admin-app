import { request } from '@/service/http'

/** 人脸识别 API */
export default {
  /** 人脸对比（拍照链路，image 为临时文件 ID） */
  math: (data: Recordable) => {
    return request.Post<Service.ResultPage<Recordable>>('face/math', data)
  },
  /** 视频流单帧人脸验证（本地活体预检 + 服务端比对/活体判定，image 为 base64 JPEG） */
  verify: (data: Recordable) => {
    const method = request.Post<Service.Result<Recordable>>('face/verify', data)
    // 组件内部按 errcode 自行提示与重试，不弹全局错误 toast
    method.meta = { showErr: false }
    return method
  },
}
