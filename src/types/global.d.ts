declare module '*.vue' {
  import type { DefineComponent } from 'vue'

  const component: DefineComponent<object, object, any>
  export default component
}

declare module '*.module.scss' {
  const classes: Record<string, string>
  export default classes
}

declare global {
  // 自定义类型
  type Nullable<T> = T | null
  type Recordable<T = any> = Record<string, T>
  type TimeoutHandle = ReturnType<typeof setTimeout>
  interface Fn<T = any, R = T> {
    (...arg: T[]): R
  }

  /** Taro 环境变量类型 */
  interface TaroEnv {
    TARO_APP_API_URL: string
    TARO_APP_API_URL_PREFIX: string
    TARO_APP_API_AUTH_PREFIX: string
    TARO_APP_USE_MOCK: string
    TARO_APP_FILE_PREVIEW_BASE: string
  }

  /** 下拉框数据模型 */
  interface DropDownItem {
    /** 值 */
    value?: string
    /** 显示文本 */
    label?: string
  }

  /** 应用信息 */
  interface AppInfo {
    /** 应用名称 */
    appname: string
    /** 公司名称 */
    companyname: string
    /** 地图定位默认坐标:经度 GCJ02 */
    longitude: number
    /** 地图定位默认坐标:纬度 GCJ02 */
    latitude: number
    /** 分页查询每页显示的最大记录行数 */
    pagelimit: number
    /** 是否开启登录验证码 */
    logincaptcha: boolean
    /** 版本号 */
    version: string
  }

  /** 枚举列表 */
  interface SystemEnums {
  /** 枚举类型的显示名称 */
    name: string
    /** 枚举项集合 */
    items: SystemEnumItem[]
  }

  /** 枚举项 */
  interface SystemEnumItem {
  /** 枚举项名称 */
    name: string
    /** 枚举项标签（描述） */
    label: string
    /** 枚举项字符串值 */
    value: string
  }
}

export {}
