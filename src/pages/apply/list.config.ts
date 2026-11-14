export default definePageConfig({
  navigationBarTitleText: '我的申请',
  ...(process.env.TARO_ENV === 'h5' ? { navigationStyle: 'custom' } : {}),
})
