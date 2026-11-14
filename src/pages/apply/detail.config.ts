export default definePageConfig({
  navigationBarTitleText: '申请详情',
  ...(process.env.TARO_ENV === 'h5' ? { navigationStyle: 'custom' } : {}),
})
