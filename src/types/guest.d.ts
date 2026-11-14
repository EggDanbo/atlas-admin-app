/** 访客认证相关类型定义 */
declare namespace GuestAuth {
  interface RegisterReq {
    key: string
    mobile: string
    user_mobile: string
    user_card: string
    user_name: string
  }

  /** 当前访客信息（/guest/profile/get） */
  interface GuestInfo {
    userid: number
    name?: string
    faceurl?: string
    mobile_number?: string
    watermark: boolean
  }

  /** 访客详细信息（/guest/profile/info） */
  interface GuestProfile {
    userid: number
    name?: string
    mobile?: string
    card?: string
    face_url?: string
    face_pic?: string | null
    watermark: boolean
  }

  /** 更新访客信息请求 */
  interface UpdateProfileReq {
    name: string
    mobile: string
    card: string
    face_id?: string
  }

  /** 人脸照片上传请求 */
  interface UpdateFaceReq {
    image_pic: string
  }
}
