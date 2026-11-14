<script setup lang="ts">
import type { CheckinStatus } from '@/service/api/checkin'
import { Right } from '@nutui/icons-vue-taro'
import Taro, { useDidShow } from '@tarojs/taro'
import { computed, ref, watch } from 'vue'
import { AuthLayout } from '@/components/AuthLayout'
import checkinApi from '@/service/api/checkin'
import { useAppInfoStore } from '@/stores/appinfo'
import { useAuthStore } from '@/stores/auth'
import { routes } from '@/utils/router'
import styles from './index.module.scss'

const authStore = useAuthStore()
const appInfoStore = useAppInfoStore()

const userInfo = computed(() => authStore.userInfo)
const isAdmin = computed(() => authStore.isAdmin)

const version = computed(() => {
  const raw = String(appInfoStore.version || '1.0.0001')
  return /^v/i.test(raw) ? raw : `v${raw}`
})
const avatarUrl = computed(() => userInfo.value?.avatarurl || userInfo.value?.faceurl || '')
const avatarText = computed(() => (userInfo.value?.name || 'A').charAt(0))
const teamText = computed(() => userInfo.value?.team_name || 'Atlas 总部')
const wknoText = computed(() => (userInfo.value?.wkno ? `工号 ${userInfo.value.wkno}` : ''))
const metaText = computed(() => [teamText.value, wknoText.value].filter(Boolean).join(' · '))
const mobileText = computed(() => {
  const mobile = String(userInfo.value?.mobile_number || '')
  return /^\d{11}$/.test(mobile) ? `${mobile.slice(0, 3)}****${mobile.slice(7)}` : mobile
})

const checkin = ref<CheckinStatus | null>(null)

async function loadCheckin() {
  if (!authStore.isLoggedIn) {
    checkin.value = null
    return
  }
  const { isSuccess, data } = await checkinApi.status()
  if (isSuccess && data)
    checkin.value = data
}

useDidShow(() => void loadCheckin())
// 登录态是异步恢复的：从 loading 切到 auth 后补一次数据，避免统计一直是「—」
watch(() => authStore.isLoggedIn, (loggedIn) => {
  if (loggedIn)
    void loadCheckin()
}, { immediate: true })

/** 今日打卡状态：未打卡 / 已上班 / 已完成（附带时间或工时） */
const duty = computed(() => {
  const today = checkin.value?.today
  if (!today?.inTime)
    return { key: 'idle', label: '未打卡', extra: '' }
  if (!today.outTime)
    return { key: 'in', label: '已上班', extra: today.inTime }

  const [inH, inM] = today.inTime.split(':').map(Number)
  const [outH, outM] = today.outTime.split(':').map(Number)
  let minutes = (outH * 60 + outM) - (inH * 60 + inM)
  if (minutes < 0)
    minutes += 24 * 60
  // 不足 1 小时显示分钟，否则保留一位小数的工时
  const extra = minutes < 1
    ? ''
    : minutes < 60 ? `${minutes}min` : `${Math.round((minutes / 60) * 10) / 10}h`
  return { key: 'done', label: '已完成', extra }
})

/** 本月考勤概览：出勤 / 迟到 / 加班 */
const monthStats = computed(() => {
  const month = checkin.value?.month
  return [
    { label: '本月出勤', value: month ? `${month.days}` : '—', unit: '天' },
    { label: '迟到', value: month ? `${month.late}` : '—', unit: '次' },
    { label: '加班', value: month ? `${month.overtime}` : '—', unit: '小时' },
  ]
})

function go(url: string) {
  Taro.navigateTo({ url })
}

const aboutVisible = ref(false)
const companyText = computed(() => appInfoStore.companyname || 'Atlas Demo')

function openAbout() {
  aboutVisible.value = true
}

// 弹层在页面容器里，tabBar 的层级更高会压住底部按钮：打开时先隐藏 tabBar
watch(aboutVisible, (visible) => {
  const task = visible
    ? Taro.hideTabBar({ animation: true })
    : Taro.showTabBar({ animation: true })
  task.catch(() => {})
})

async function handleLogout() {
  const res = await Taro.showModal({
    title: '退出登录',
    content: '退出后需要重新登录才能查看考勤与单据',
    confirmText: '退出',
    confirmColor: '#e11d48',
  })
  if (!res.confirm)
    return
  await authStore.logout()
}
</script>

<template>
  <view class="sp-page" :class="styles.page">
    <AuthLayout>
      <!-- 个人卡：身份 + 本月考勤概览 -->
      <view :class="styles.hero">
        <view :class="styles['hero-glow']" />
        <view :class="styles['hero-glow2']" />

        <view :class="styles['hero-brand']">
          <view :class="styles['brand-main']">
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

          <view :class="styles['hero-action']" @click="go(routes.profile)">
            <text>个人资料</text>
            <Right size="12" color="rgba(255,255,255,0.82)" />
          </view>
        </view>

        <view :class="styles['hero-main']">
          <nut-avatar v-if="avatarUrl" size="large">
            <img :src="avatarUrl">
          </nut-avatar>
          <view v-else :class="styles['hero-avatar-text']">
            {{ avatarText }}
          </view>

          <view :class="styles['hero-info']">
            <view :class="styles['hero-title']">
              <text :class="styles['hero-name']">
                {{ userInfo?.name || '未登录' }}
              </text>

              <view
                :class="[styles['hero-status'], styles[`hero-status--${duty.key}`]]"
                @click="go(routes.checkin)"
              >
                <view :class="styles['status-dot']" />
                <text :class="styles['status-label']">
                  {{ duty.label }}
                </text>
                <text v-if="duty.extra" :class="styles['status-time']">
                  {{ duty.extra }}
                </text>
              </view>
            </view>

            <text :class="styles['hero-meta']">
              {{ metaText }}
            </text>
          </view>
        </view>

        <view :class="styles['hero-stats']" @click="go(routes.checkinStats)">
          <view v-for="item in monthStats" :key="item.label" :class="styles.stat">
            <view :class="styles['stat-value']">
              <text>{{ item.value }}</text>
              <text :class="styles['stat-unit']">
                {{ item.unit }}
              </text>
            </view>
            <text :class="styles['stat-label']">
              {{ item.label }}
            </text>
          </view>
        </view>
      </view>

      <!-- 账号与安全 -->
      <view :class="styles.panel">
        <view :class="styles['panel-head']">
          <text :class="styles['panel-title']">
            账号与安全
          </text>
        </view>

        <template v-if="!isAdmin">
          <view :class="styles.row" @click="go(routes.profile)">
            <text :class="styles['row-label']">
              个人信息
            </text>
            <text :class="styles['row-value']">
              {{ mobileText || '查看' }}
            </text>
            <Right size="14" color="#c2c6d4" />
          </view>
          <view :class="styles.row" @click="go(routes.facePhoto)">
            <text :class="styles['row-label']">
              人脸采集
            </text>
            <text :class="styles['row-value']">
              {{ userInfo?.faceurl ? '已采集' : '未采集' }}
            </text>
            <Right size="14" color="#c2c6d4" />
          </view>
          <view :class="styles.row" @click="go(routes.password)">
            <text :class="styles['row-label']">
              修改密码
            </text>
            <text :class="styles['row-value']" />
            <Right size="14" color="#c2c6d4" />
          </view>
        </template>
        <view v-else :class="styles.note">
          当前为管理员账号，个人考勤资料由后台统一维护
        </view>
      </view>

      <!-- 其他 -->
      <view :class="styles.panel">
        <view :class="styles['panel-head']">
          <text :class="styles['panel-title']">
            其他
          </text>
        </view>
        <view :class="styles.row" @click="openAbout">
          <text :class="styles['row-label']">
            关于应用
          </text>
          <text :class="styles['row-value']">
            {{ version }}
          </text>
          <Right size="14" color="#c2c6d4" />
        </view>
      </view>

      <view :class="styles.logout" @click="handleLogout">
        退出登录
      </view>

      <view class="sp-footnote">
        <text class="sp-footnote-text">
          数据由本地引擎生成 · 仅用于演示
        </text>
      </view>

      <!-- 关于应用 -->
      <nut-popup
        v-model:visible="aboutVisible"
        position="bottom"
        round
        :z-index="2200"
      >
        <view :class="styles.about">
          <view :class="styles['about-grip']" />

          <view :class="styles['about-logo']">
            <text :class="[styles['brand-bar'], styles['brand-bar--1']]" />
            <text :class="[styles['brand-bar'], styles['brand-bar--2']]" />
            <text :class="[styles['brand-bar'], styles['brand-bar--3']]" />
          </view>

          <text :class="styles['about-name']">
            {{ appInfoStore.appname }}
          </text>
          <view :class="styles['about-chip']">
            {{ version }}
          </view>
          <text :class="styles['about-desc']">
            移动考勤与协同工作台，支持打卡、审批、通讯录与数据看板
          </text>

          <view :class="styles['about-list']">
            <view :class="styles['about-row']">
              <text :class="styles['about-label']">
                开发者
              </text>
              <text :class="styles['about-value']">
                {{ companyText }}
              </text>
            </view>
            <view :class="styles['about-row']">
              <text :class="styles['about-label']">
                运行环境
              </text>
              <text :class="styles['about-value']">
                H5 / 微信小程序
              </text>
            </view>
            <view :class="styles['about-row']">
              <text :class="styles['about-label']">
                数据来源
              </text>
              <text :class="styles['about-value']">
                本地演示数据
              </text>
            </view>
          </view>

          <view :class="styles['about-actions']">
            <view :class="styles['about-close']" @click="aboutVisible = false">
              知道了
            </view>
          </view>

          <text :class="styles['about-copy']">
            © 2026 {{ companyText }} · 仅供演示
          </text>
        </view>
      </nut-popup>
    </AuthLayout>
  </view>
</template>
