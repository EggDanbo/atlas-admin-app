export default definePageConfig({
  navigationBarTitleText: '考勤统计',
  ...(process.env.TARO_ENV === 'h5' ? { navigationStyle: 'custom' } : {}),
})
