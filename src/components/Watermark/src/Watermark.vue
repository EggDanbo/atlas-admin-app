<script setup lang="ts">
import { computed } from 'vue'
import { useAuthStore } from '@/stores/auth'
import styles from './Watermark.module.scss'

const authStore = useAuthStore()

const watermarkText = computed(() => {
  const name = authStore.userInfo?.name || ''
  const mobile = authStore.userInfo?.mobile_number || ''
  const tail = mobile.length >= 4 ? mobile.slice(-4) : ''
  if (name && tail)
    return `${name} ${tail}`
  if (name)
    return name
  return '未登录'
})
</script>

<template>
  <view :class="styles.watermark">
    <view v-for="row in 12" :key="row" :class="styles['watermark-row']">
      <view v-for="col in 4" :key="col" :class="styles['watermark-item']">
        {{ watermarkText }}
      </view>
    </view>
  </view>
</template>
