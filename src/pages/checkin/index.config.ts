export default definePageConfig({
  navigationBarTitleText: '打卡',
  ...(process.env.TARO_ENV === 'h5' ? { navigationStyle: 'custom' } : {}),
  enablePullDownRefresh: false,
})
