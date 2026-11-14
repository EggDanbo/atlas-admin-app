export default definePageConfig({
  navigationBarTitleText: '请假申请',
  ...(process.env.TARO_ENV === 'h5' ? { navigationStyle: 'custom' } : {}),
})
