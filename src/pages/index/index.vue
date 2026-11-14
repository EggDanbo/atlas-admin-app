<script setup lang="ts">
import Taro, { useDidShow } from '@tarojs/taro'
import { watch } from 'vue'
import { AuthLayout } from '@/components/AuthLayout'
import { useAuthStore } from '@/stores/auth'
import { routes } from '@/utils/router'
import { storage } from '@/utils/storage'
import MenuGrid from './components/MenuGrid.vue'
import TodoList from './components/TodoList.vue'
import UserCard from './components/UserCard.vue'
import styles from './index.module.scss'

const authStore = useAuthStore()

// 首页是应用入口：确认登录态，未登录直接进入登录页。
//
// 但登录页挂载时会走 ensureKey（微信 / 企业微信分支曾整页跳回应用根路径），
// 首页再把人弹回登录页，就形成「首页 → 登录页 → 首页」的无限刷新。
// 现在 ensureKey 已不再整页跳转，这里再补一层冷却：短时间内重复触发说明在回环，
// 直接停在未登录引导，绝不无限跳。
const GUARD_KEY = 'login_guard_at'
const GUARD_COOLDOWN = 8000
let redirecting = false

/** 刚刚跳过登录页？用于兜底阻断回环 */
function recentlyRedirected() {
  const last = storage.get<number>(GUARD_KEY)
  return !!last && Date.now() - last < GUARD_COOLDOWN
}

function ensureLoggedIn() {
  if (authStore.status !== 'guest' || redirecting || recentlyRedirected())
    return
  redirecting = true
  storage.set(GUARD_KEY, Date.now())
  Taro.reLaunch({
    url: routes.login,
    complete: () => {
      redirecting = false
    },
  })
}

watch(() => authStore.status, (status) => {
  if (status === 'guest')
    ensureLoggedIn()
}, { immediate: true })

useDidShow(() => ensureLoggedIn())

function goCheckin() {
  // 打卡已不是 tabBar 页面，用 navigateTo 打开（switchTab 会失败）
  Taro.navigateTo({ url: routes.checkin })
}

function goRules() {
  Taro.navigateTo({ url: routes.ruleList })
}
</script>

<template>
  <view class="sp-page" :class="[styles.page]">
    <AuthLayout>
      <UserCard />

      <view :class="styles.actions">
        <view :class="[styles.action, styles['action--checkin']]" @click="goCheckin">
          <text :class="styles['action-kicker']">
            考勤
          </text>
          <text :class="styles['action-title']">
            去打卡
          </text>
          <text :class="styles['action-desc']">
            总部固定班次 · 09:00
          </text>
        </view>
        <view :class="[styles.action, styles['action--expense']]" @click="goRules">
          <text :class="styles['action-kicker']">
            规则
          </text>
          <text :class="styles['action-title']">
            考勤规则
          </text>
          <text :class="styles['action-desc']">
            固定 · 自由 · 排班
          </text>
        </view>
      </view>

      <TodoList />
      <MenuGrid />

      <view class="sp-footnote">
        <text class="sp-footnote-text">
          数据由本地引擎生成 · 仅用于演示
        </text>
      </view>
    </AuthLayout>
  </view>
</template>
