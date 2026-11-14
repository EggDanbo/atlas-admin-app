/** 账号密码登录开关（开发调试用，读取 TARO_APP_PASSWORD_LOGIN 环境变量） */
export const PASSWORD_LOGIN = process.env.TARO_APP_PASSWORD_LOGIN === 'true'
