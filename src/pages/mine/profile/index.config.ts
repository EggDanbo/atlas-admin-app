export default definePageConfig({
  navigationBarTitleText: '个人信息',
  ...(process.env.TARO_ENV === 'h5' ? { navigationStyle: 'custom' } : {}),
})
