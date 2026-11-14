<script setup lang="ts">
import officePreset from '@file-viewer/preset-office'
import { textRenderer } from '@file-viewer/renderer-text'
import { mountViewer } from '@file-viewer/web'
import { useLoad } from '@tarojs/taro'
import { nextTick, onUnmounted, ref, watch } from 'vue'
import { PageNavbar } from '@/components/PageNavbar'
import styles from './index.module.scss'

// 小程序端 @file-viewer 由 webpack IgnorePlugin 排除（依赖浏览器 API，仅 H5 使用）
const IS_H5 = process.env.TARO_ENV === 'h5'
const fileUrl = ref('')
const errorMsg = ref('')
let controller: ReturnType<typeof mountViewer> | null = null

useLoad((options) => {
  // Taro useLoad 的 query 参数未自动解码，需手动 decode
  fileUrl.value = options?.url ? decodeURIComponent(options.url) : ''
  console.log('[preview] fileUrl', fileUrl.value)
})

// 资产部署在 H5 publicPath + static/vendor/（由 CopyWebpackPlugin 拷贝）
const ASSET_BASE = `/${process.env.TARO_APP_H5_BASENAME || 'app'}/static/vendor`
const viewerOptions = {
  preset: officePreset,
  renderers: [textRenderer],
  rendererMode: 'replace',
  theme: 'light',
  toolbar: { position: 'top-center', download: true, print: true, exportHtml: false },
  pdf: {
    workerUrl: `${ASSET_BASE}/pdf/pdf.worker.mjs`,
    cMapUrl: `${ASSET_BASE}/pdf/cmaps/`,
    wasmUrl: `${ASSET_BASE}/pdf/wasm/`,
    standardFontDataUrl: `${ASSET_BASE}/pdf/standard_fonts/`,
  },
  docx: {
    workerUrl: `${ASSET_BASE}/docx/docx.worker.js`,
    workerJsZipUrl: `${ASSET_BASE}/docx/jszip.min.js`,
  },
  presentation: { workerUrl: `${ASSET_BASE}/pptx/pptx.worker.js` },
  spreadsheet: { workerUrl: `${ASSET_BASE}/xlsx/sheet.worker.js` },
}

function mountNow(url: string) {
  const el = document.getElementById('fv-container')
  console.log('[preview] mountNow el=', !!el, 'size=', el?.offsetWidth, 'x', el?.offsetHeight)
  if (!el)
    return
  // H5：file-viewer 需容器有明确高度；用视口高度（PageNavbar 约 44px）
  el.style.height = `${window.innerHeight - 44}px`
  try {
    // file-viewer 的 Vue 组件在 Taro production build 下挂载崩溃，
    // 改用 @file-viewer/web 的 mountViewer 命令式 API（Pure Web，不经 Vue 组件）
    controller = mountViewer(el, {
      url,
      options: viewerOptions,
      onEvent(event) {
        console.log('[preview] event', event.type, event.payload)
      },
    })
    console.log('[preview] controller created', !!controller)
  }
  catch (e) {
    console.log('[preview] mount error', e)
    errorMsg.value = '文件预览失败，请下载后查看'
  }
}

// useLoad 设置 fileUrl 后触发挂载；nextTick 等 #fv-container 渲染到 DOM
watch(fileUrl, (url) => {
  if (!IS_H5 || !url)
    return
  nextTick(() => mountNow(url))
})

onUnmounted(() => {
  controller?.destroy?.()
  controller = null
})
</script>

<template>
  <view :class="styles.page">
    <PageNavbar title="文件预览" />
    <view :class="styles.content">
      <view v-if="errorMsg" :class="styles.tip">
        <text>{{ errorMsg }}</text>
      </view>
      <view v-else id="fv-container" :class="styles.viewer" />
    </view>
  </view>
</template>
