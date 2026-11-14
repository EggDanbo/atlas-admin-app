export default definePageConfig({
  navigationBarTitleText: '消息中心',
  ...(process.env.TARO_ENV === 'h5' ? { navigationStyle: 'custom' } : {}),
})
