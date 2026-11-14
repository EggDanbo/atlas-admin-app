<script setup lang="ts">
import Taro from '@tarojs/taro'
import { getCurrentPageInfo } from '@/utils/router'

/**
 * H5 OAuth 回调页
 * 微信 OAuth 回调后浏览器重载，authStore.init() 在 app.ts onLaunch 中自动检测 URL 的 code+state 并处理认证。
 * 此页面仅负责读取 path 参数并导航回原页面。
 */
Taro.useLoad(() => {
  const { params } = getCurrentPageInfo()
  const path = params.path as string | undefined

  if (path) {
    const decodedPath = decodeURIComponent(path)
    const targetPath = decodedPath.split('?')[0]
    const isTab = ['/pages/index/index', '/pages/mine/index'].includes(targetPath)
    if (isTab) {
      Taro.switchTab({ url: decodedPath })
    }
    else {
      Taro.redirectTo({ url: decodedPath })
    }
  }
  else {
    Taro.switchTab({ url: '/pages/index/index' })
  }
})
</script>

<template>
  <view class="sp-center" />
</template>
