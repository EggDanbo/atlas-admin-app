export default definePageConfig({
  navigationBarTitleText: '文件预览',
  ...(process.env.TARO_ENV === 'h5' ? { navigationStyle: 'custom' } : {}),
})
