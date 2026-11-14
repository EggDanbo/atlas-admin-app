export default definePageConfig({
  navigationBarTitleText: '成员管理',
  ...(process.env.TARO_ENV === 'h5' ? { navigationStyle: 'custom' } : {}),
})
