<script setup lang="ts">
import type { CheckinStatus } from '@/service/api/checkin'
import Taro, { useDidShow } from '@tarojs/taro'
import { computed, onUnmounted, ref } from 'vue'
import { AuthLayout } from '@/components/AuthLayout'
import { PageNavbar } from '@/components/PageNavbar'
import { showToast } from '@/components/SpToast'
import checkinApi from '@/service/api/checkin'
import { routes } from '@/utils/router'
import styles from './index.module.scss'

const status = ref<CheckinStatus | null>(null)
const loading = ref(true)
const submitting = ref(false)
const clock = ref('')

let timer: ReturnType<typeof setInterval> | null = null

function tick() {
  const d = new Date()
  clock.value = `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
}

async function load() {
  loading.value = true
  const { isSuccess, data } = await checkinApi.status()
  if (isSuccess && data)
    status.value = data
  loading.value = false
}

/** 当前该做什么：in 上班 / out 下班 / done 已完成 */
const phase = computed<'in' | 'out' | 'done'>(() => {
  if (!status.value)
    return 'in'
  if (!status.value.today.inTime)
    return 'in'
  if (!status.value.today.outTime)
    return 'out'
  return 'done'
})

const dialTitle = computed(() => ({ in: '上班打卡', out: '下班打卡', done: '今日已完成' }[phase.value]))
const dialHint = computed(() => {
  if (loading.value)
    return '正在加载考勤信息'
  return { in: '点击记录上班时间', out: '点击记录下班时间', done: '下班记得按时打卡' }[phase.value]
})

function goRecords() {
  Taro.navigateTo({ url: routes.checkinRecords })
}

async function handlePunch() {
  if (loading.value || submitting.value)
    return
  if (phase.value === 'done') {
    showToast('今日打卡已完成')
    return
  }
  submitting.value = true
  const { isSuccess, data } = await checkinApi.submit(phase.value === 'in' ? 'in' : 'out')
  submitting.value = false
  if (!isSuccess || !data) {
    showToast('打卡失败，请重试')
    return
  }
  status.value = data
  showToast(phase.value === 'in' ? '上班打卡成功' : '下班打卡成功')
}

useDidShow(() => {
  tick()
  if (!timer)
    timer = setInterval(tick, 10_000)
  void load()
})

onUnmounted(() => {
  if (timer)
    clearInterval(timer)
  timer = null
})
</script>

<template>
  <AuthLayout>
    <view class="sp-page" :class="styles.page">
      <PageNavbar title="打卡" />

      <!-- 顶部信息卡 -->
      <view :class="styles.hero">
        <view :class="styles['hero-date']">
          <text>{{ status?.date || '—' }}</text>
          <text :class="styles['hero-weekday']">
            {{ status?.weekday || '' }}
          </text>
        </view>
        <text :class="styles['hero-time']">
          {{ clock }}
        </text>
        <view :class="styles['hero-shift']">
          <view :class="styles['hero-dot']" />
          <text>{{ status?.shift.name || '总部固定班次' }} · {{ status?.shift.start || '09:00' }} - {{ status?.shift.end || '18:00' }}</text>
        </view>
      </view>

      <!-- 打卡按钮 -->
      <view :class="[styles.dial, styles[`dial--${phase}`], { [styles['dial--busy']]: submitting }]" @click="handlePunch">
        <view :class="styles['dial-inner']">
          <view :class="styles['dial-icon']">
            <view :class="styles['dial-pulse']" />
          </view>
          <text :class="styles['dial-title']">
            {{ dialTitle }}
          </text>
          <text :class="styles['dial-hint']">
            {{ dialHint }}
          </text>
        </view>
      </view>

      <!-- 今日记录 -->
      <view :class="styles.card">
        <view :class="styles['card-head']">
          <text :class="styles['card-title']">
            今日记录
          </text>
          <text :class="styles['card-more']">
            {{ status?.today.inTime ? '正常' : '待打卡' }}
          </text>
        </view>
        <view :class="styles.row">
          <view :class="styles['row-left']">
            <view :class="[styles.dot, styles['dot--in']]" />
            <text>上班</text>
          </view>
          <text :class="[styles['row-value'], { [styles['row-value--empty']]: !status?.today.inTime }]">
            {{ status?.today.inTime || '未打卡' }}
          </text>
        </view>
        <view :class="[styles.row, styles['row--last']]">
          <view :class="styles['row-left']">
            <view :class="[styles.dot, styles['dot--out']]" />
            <text>下班</text>
          </view>
          <text :class="[styles['row-value'], { [styles['row-value--empty']]: !status?.today.outTime }]">
            {{ status?.today.outTime || '未打卡' }}
          </text>
        </view>
      </view>

      <!-- 本月统计 -->
      <view :class="styles.card">
        <view :class="styles['card-head']">
          <text :class="styles['card-title']">
            本月统计
          </text>
          <text :class="styles['card-more']" @click="goRecords">
            查看记录 ›
          </text>
        </view>
        <view :class="styles.stats">
          <view :class="styles.stat">
            <text :class="styles['stat-num']">
              {{ status?.month.days ?? 0 }}
            </text>
            <text :class="styles['stat-label']">
              出勤天数
            </text>
          </view>
          <view :class="styles.stat">
            <text :class="styles['stat-num']">
              {{ status?.month.late ?? 0 }}
            </text>
            <text :class="styles['stat-label']">
              迟到
            </text>
          </view>
          <view :class="styles.stat">
            <text :class="styles['stat-num']">
              {{ status?.month.overtime ?? 0 }}
            </text>
            <text :class="styles['stat-label']">
              加班时长
            </text>
          </view>
        </view>
      </view>

      <view class="sp-footnote">
        <text class="sp-footnote-text">
          定位与设备信息为演示数据
        </text>
      </view>
    </view>
  </AuthLayout>
</template>
