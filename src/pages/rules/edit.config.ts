export default definePageConfig({
  navigationBarTitleText: '考勤规则设置',
  ...(process.env.TARO_ENV === 'h5' ? { navigationStyle: 'custom' } : {}),
})
