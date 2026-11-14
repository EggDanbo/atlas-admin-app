export default definePageConfig({
  navigationBarTitleText: '修改密码',
  ...(process.env.TARO_ENV === 'h5' ? { navigationStyle: 'custom' } : {}),
})
