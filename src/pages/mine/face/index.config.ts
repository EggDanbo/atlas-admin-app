export default definePageConfig({
  navigationBarTitleText: '人脸照片',
  ...(process.env.TARO_ENV === 'h5' ? { navigationStyle: 'custom' } : {}),
})
