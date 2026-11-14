<script setup lang="ts">
import {
  Notice,
  People,
  Right,
  Share,
  Success,
} from '@nutui/icons-vue-taro'
import Taro from '@tarojs/taro'
import { computed } from 'vue'
import { showToast } from '@/components/SpToast'
import { useAuthStore } from '@/stores/auth'
import { colors } from '@/styles/theme'
import { buildQuery, getCurrentPageInfo, routes, stripBasename } from '@/utils/router'
import styles from './LoginPrompt.module.scss'

const demoMenus = [
  { icon: Share, label: '我的申请', color: colors.blue },
  { icon: Success, label: '我的审批', color: colors.blue },
  { icon: Notice, label: '我的消息', color: colors.blue },
]

function handleMenuTap() {
  showToast('请先登录')
}

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

const stats = computed(() => [
  { value: 0, label: '申请' },
  { value: 0, label: '待办' },
  { value: 0, label: '已办' },
])

const authStore = useAuthStore()

function handleLogin() {
  const { path, params } = getCurrentPageInfo()
  const pagePath = stripBasename(path)

  // 排除 OAuth 内部参数，仅保留业务参数
  const businessParams = Object.fromEntries(
    Object.entries(params).filter(([key]) => !['code', 'state', 'path'].includes(key)),
  )
  const queryString = buildQuery(businessParams)
  const fullPath = queryString ? `${pagePath}?${queryString}` : pagePath
  authStore.saveLoginRedirect(fullPath)
  Taro.navigateTo({ url: routes.login })
}
</script>

<template>
  <view>
    <!-- 仿用户卡片（点击登录） -->
    <view :class="styles['demo-card']">
      <view :class="styles['demo-card-bg']" style="border-radius: 10px;">
        <view :class="[styles['demo-deco'], styles['demo-deco--1']]" />
        <view :class="[styles['demo-deco'], styles['demo-deco--2']]" />

        <view :class="styles['demo-card-content']" @tap="handleLogin">
          <view :class="styles['demo-avatar']">
            <People size="24" color="#ffffff" />
          </view>
          <view :class="styles['demo-card-info']">
            <text :class="styles['demo-card-greeting']">
              {{ greeting }}，
            </text>
            <view :class="styles['demo-card-name-wrap']">
              <text :class="styles['demo-card-name']">
                点击登录
              </text>
              <Right size="14" color="rgba(255,255,255,0.8)" />
            </view>
          </view>
        </view>

        <view :class="styles['user-card-stats']">
          <view
            v-for="(item, idx) in stats"
            :key="item.label"
            :class="styles['stat-item']"
          >
            <text :class="styles['stat-value']">
              {{ item.value }}
            </text>
            <text :class="styles['stat-label']">
              {{ item.label }}
            </text>
            <view v-if="Number(idx) < stats.length - 1" :class="styles['stat-item-divider']" />
          </view>
        </view>
      </view>
    </view>

    <!-- 仿菜单网格 -->
    <view :class="styles['demo-menu']">
      <nut-grid :column-num="3" :clickable="true">
        <nut-grid-item
          v-for="item in demoMenus"
          :key="item.label"
          :text="item.label"
          @click="handleMenuTap()"
        >
          <component :is="item.icon" :size="20" :color="false ? '#ccc' : item.color" />
        </nut-grid-item>
      </nut-grid>
    </view>
  </view>
</template>
