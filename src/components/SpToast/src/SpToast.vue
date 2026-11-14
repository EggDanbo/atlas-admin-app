<script setup lang="ts">
import { useDidHide, useDidShow } from '@tarojs/taro'
import { ref } from 'vue'
import styles from './SpToast.module.scss'
import { toastState } from './toast'

// 页面栈里会有多个实例，只让当前显示的页面弹提示
const pageActive = ref(true)
useDidShow(() => {
  pageActive.value = true
})
useDidHide(() => {
  pageActive.value = false
})

const ICON: Record<string, string> = {
  success: '✓',
  error: '!',
  info: 'i',
}
</script>

<template>
  <view v-if="toastState.visible && pageActive" :class="styles.host">
    <view :class="styles.toast">
      <view :class="[styles.icon, styles[`icon--${toastState.type}`]]">
        <text :class="styles['icon-text']">
          {{ ICON[toastState.type] }}
        </text>
      </view>
      <text :class="styles.text">
        {{ toastState.title }}
      </text>
    </view>
  </view>
</template>
