<script setup lang="ts">
import { useDidShow } from '@tarojs/taro'
import { computed, onMounted, ref } from 'vue'
import userAuth from '@/service/api/identity/profile'
import { useAuthStore } from '@/stores/auth'
import styles from './UserCard.module.scss'

const authStore = useAuthStore()
const userInfo = computed(() => authStore.userInfo)

const stats = ref<any[]>([])
async function getStats() {
  const { isSuccess, data } = await userAuth.stats()
  if (!isSuccess || !Array.isArray(data))
    return
  stats.value = data
}

useDidShow(() => getStats())
onMounted(() => getStats())

const greeting = computed(() => {
  const hour = new Date().getHours()
  if (hour < 6)
    return '夜深了'
  if (hour < 9)
    return '早上好'
  if (hour < 12)
    return '上午好'
  if (hour < 14)
    return '中午好'
  if (hour < 18)
    return '下午好'
  return '晚上好'
})

const dateText = computed(() => {
  const now = new Date()
  const week = ['日', '一', '二', '三', '四', '五', '六'][now.getDay()]
  return `${now.getMonth() + 1} 月 ${now.getDate()} 日 · 星期${week}`
})

const avatarUrl = computed(() => userInfo.value?.avatarurl || userInfo.value?.faceurl || '')
const displayName = computed(() => userInfo.value?.name || userInfo.value?.nickname || '访客')
const teamName = computed(() => userInfo.value?.team_name || 'Atlas 总部')
</script>

<template>
  <view :class="styles.hero">
    <view :class="styles['hero-glow']" />
    <view :class="styles['hero-glow2']" />

    <view :class="styles['hero-brand']">
      <view :class="styles['brand-mark']">
        <text :class="[styles['brand-bar'], styles['brand-bar--1']]" />
        <text :class="[styles['brand-bar'], styles['brand-bar--2']]" />
        <text :class="[styles['brand-bar'], styles['brand-bar--3']]" />
      </view>
      <text :class="styles['brand-name']">
        ATLAS
      </text>
      <text :class="styles['brand-sub']">
        WORKSPACE
      </text>
    </view>

    <view :class="styles['hero-main']">
      <view :class="styles['hero-info']">
        <text :class="styles['hero-date']">
          {{ dateText }}
        </text>
        <text :class="styles['hero-greeting']">
          {{ greeting }}，{{ displayName }}
        </text>
        <text :class="styles['hero-meta']">
          {{ teamName }}
        </text>
      </view>
      <nut-avatar v-if="avatarUrl" size="large">
        <img :src="avatarUrl">
      </nut-avatar>
      <view v-else :class="styles['hero-avatar-text']">
        {{ displayName.charAt(0) }}
      </view>
    </view>

    <view v-if="stats.length" :class="styles['hero-stats']">
      <view v-for="item in stats" :key="item.label" :class="styles.stat">
        <text :class="styles['stat-value']">
          {{ item.value }}
        </text>
        <text :class="styles['stat-label']">
          {{ item.label }}
        </text>
      </view>
    </view>
  </view>
</template>
