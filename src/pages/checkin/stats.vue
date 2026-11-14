<script setup lang="ts">
import type { CheckinStats } from '@/service/api/checkin'
import { useDidShow } from '@tarojs/taro'
import { computed, ref } from 'vue'
import { AuthLayout } from '@/components/AuthLayout'
import { PageNavbar } from '@/components/PageNavbar'
import checkinApi from '@/service/api/checkin'
import styles from './stats.module.scss'

const stats = ref<CheckinStats | null>(null)
const loading = ref(true)

const maxHours = computed(() => Math.max(10, ...(stats.value?.recent ?? []).map(r => r.hours)))

async function load() {
  loading.value = true
  const { isSuccess, data } = await checkinApi.stats()
  if (isSuccess && data)
    stats.value = data
  loading.value = false
}

useDidShow(() => void load())

function barHeight(hours: number) {
  return `${Math.round((hours / maxHours.value) * 100)}%`
}
</script>

<template>
  <AuthLayout>
    <view class="sp-page" :class="styles.page">
      <PageNavbar title="考勤统计" />

      <view :class="styles.header">
        <text :class="styles['header-title']">
          {{ stats?.month || '' }}考勤概览
        </text>
        <text :class="styles['header-sub']">
          截止今天，数据每 5 分钟同步一次
        </text>
      </view>

      <view :class="styles.grid">
        <view :class="styles.tile">
          <text :class="styles['tile-value']">
            {{ stats?.days ?? 0 }}
          </text>
          <text :class="styles['tile-label']">
            出勤天数
          </text>
        </view>
        <view :class="styles.tile">
          <text :class="[styles['tile-value'], styles['tile-value--warn']]">
            {{ stats?.late ?? 0 }}
          </text>
          <text :class="styles['tile-label']">
            迟到次数
          </text>
        </view>
        <view :class="styles.tile">
          <text :class="styles['tile-value']">
            {{ stats?.average ?? '0.0' }}
          </text>
          <text :class="styles['tile-label']">
            平均工时
          </text>
        </view>
        <view :class="styles.tile">
          <text :class="[styles['tile-value'], styles['tile-value--accent']]">
            {{ stats?.overtime ?? 0 }}
          </text>
          <text :class="styles['tile-label']">
            加班时长
          </text>
        </view>
      </view>

      <view :class="styles.card">
        <view :class="styles['card-head']">
          <text :class="styles['card-title']">
            近 7 个工作日
          </text>
          <text :class="styles['card-hint']">
            单位：小时
          </text>
        </view>

        <view v-if="loading" :class="styles.tip">
          加载中…
        </view>
        <view v-else :class="styles.chart">
          <view v-for="item in stats?.recent || []" :key="item.label" :class="styles.bar">
            <view :class="styles['bar-track']">
              <view
                :class="[styles['bar-fill'], item.status === '迟到' ? styles['bar-fill--warn'] : '']"
                :style="{ height: barHeight(item.hours) }"
              />
            </view>
            <text :class="styles['bar-value']">
              {{ item.hours }}
            </text>
            <text :class="styles['bar-label']">
              {{ item.label }}
            </text>
          </view>
        </view>
      </view>

      <view :class="styles.card">
        <view :class="styles['card-head']">
          <text :class="styles['card-title']">
            规则说明
          </text>
        </view>
        <view :class="styles.rule">
          标准班次 09:00 - 18:00，弹性打卡 30 分钟
        </view>
        <view :class="styles.rule">
          单日工时满 8 小时计为正常出勤
        </view>
        <view :class="[styles.rule, styles['rule--last']]">
          因公迟到可在 3 个工作日内提交补卡
        </view>
      </view>
    </view>
  </AuthLayout>
</template>
