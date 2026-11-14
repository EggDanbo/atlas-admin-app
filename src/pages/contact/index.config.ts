export default definePageConfig({
  navigationBarTitleText: '通讯录',
  ...(process.env.TARO_ENV === 'h5' ? { navigationStyle: 'custom' } : {}),
})
