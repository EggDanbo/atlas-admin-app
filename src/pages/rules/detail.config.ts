export default definePageConfig({
  navigationBarTitleText: '规则详情',
  ...(process.env.TARO_ENV === 'h5' ? { navigationStyle: 'custom' } : {}),
})
