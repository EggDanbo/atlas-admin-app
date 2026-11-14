export default definePageConfig({
  navigationBarTitleText: '打卡记录',
  ...(process.env.TARO_ENV === 'h5' ? { navigationStyle: 'custom' } : {}),
})
