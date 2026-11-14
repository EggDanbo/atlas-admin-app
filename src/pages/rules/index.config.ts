export default definePageConfig({
  navigationBarTitleText: '考勤规则',
  ...(process.env.TARO_ENV === 'h5' ? { navigationStyle: 'custom' } : {}),
})
