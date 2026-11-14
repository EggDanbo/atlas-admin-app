export default definePageConfig({
  navigationBarTitleText: '申请',
  ...(process.env.TARO_ENV === 'h5' ? { navigationStyle: 'custom' } : {}),
})
