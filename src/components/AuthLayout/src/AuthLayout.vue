<script setup lang="ts">
import { SpToast } from '@/components/SpToast'
import { useAuthStore } from '@/stores/auth'
import styles from './AuthLayout.module.scss'
import LoginPrompt from './LoginPrompt.vue'

const authStore = useAuthStore()
</script>

<template>
  <view :class="styles.container">
    <!-- loading 状态：骨架屏 -->
    <view v-if="authStore.status === 'loading'" :class="styles.loadingWrapper">
      <nut-skeleton width="250px" height="15px" animated avatar avatar-size="60px" row="3" />
    </view>

    <!-- auth 状态：正常渲染 -->
    <slot v-else-if="authStore.status === 'auth'" />

    <!-- guest 状态：登录引导 -->
    <LoginPrompt v-else />

    <!-- 全局提示 -->
    <SpToast />
  </view>
</template>
