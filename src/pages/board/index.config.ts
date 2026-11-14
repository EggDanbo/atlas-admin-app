export default definePageConfig({
  navigationBarTitleText: '数据看板',
  ...(process.env.TARO_ENV === 'h5' ? { navigationStyle: 'custom' } : {}),
})
