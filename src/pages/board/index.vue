<script setup lang="ts">
import type { DashboardSummary } from '@/service/api/dashboard'
import { useDidShow } from '@tarojs/taro'
import { computed, ref } from 'vue'
import { AuthLayout } from '@/components/AuthLayout'
import { PageNavbar } from '@/components/PageNavbar'
import dashboardApi from '@/service/api/dashboard'
import styles from './index.module.scss'

const summary = ref<DashboardSummary | null>(null)
const loading = ref(true)

async function load() {
  loading.value = true
  const { isSuccess, data } = await dashboardApi.summary()
  if (isSuccess && data)
    summary.value = data
  loading.value = false
}

useDidShow(() => void load())

const trend = computed(() => summary.value?.trend || [])
const maxTrend = computed(() => Math.max(...trend.value.map(d => d.value), 1))
const depts = computed(() => summary.value?.depts || [])
const maxDept = computed(() => Math.max(...depts.value.map(d => d.total), 1))
const types = computed(() => summary.value?.types || [])

const today = computed(() => {
  const now = new Date()
  return `${now.getMonth() + 1} 月 ${now.getDate()} 日`
})
</script>

<template>
  <AuthLayout>
    <view class="sp-page" :class="styles.page">
      <PageNavbar title="数据看板" />

      <!-- 概览 -->
      <view :class="styles.hero">
        <view :class="styles['hero-top']">
          <text :class="styles['hero-label']">
            运营概览
          </text>
          <text :class="styles['hero-date']">
            {{ today }}
          </text>
        </view>
        <view :class="styles['hero-main']">
          <text :class="styles['hero-value']">
            {{ summary?.pending ?? 0 }}
          </text>
          <text :class="styles['hero-unit']">
            单待处理
          </text>
        </view>
        <text :class="styles['hero-hint']">
          审批通过率 {{ summary?.rate ?? 0 }}% · 共 {{ summary?.kpis[1]?.value ?? 0 }} 张单据
        </text>
      </view>

      <!-- 指标 -->
      <view :class="styles.grid">
        <view v-for="kpi in summary?.kpis || []" :key="kpi.label" :class="styles.tile">
          <view :class="styles['tile-value']">
            <text>{{ kpi.value }}</text>
            <text :class="styles['tile-unit']">
              {{ kpi.unit }}
            </text>
          </view>
          <text :class="styles['tile-label']">
            {{ kpi.label }}
          </text>
        </view>
      </view>

      <!-- 走势 -->
      <view :class="styles.card">
        <view :class="styles['card-head']">
          <text :class="styles['card-title']">
            近 7 日单据量
          </text>
          <text :class="styles['card-hint']">
            单位：单
          </text>
        </view>
        <view v-if="loading && !trend.length" :class="styles.tip">
          加载中…
        </view>
        <view v-else :class="styles.chart">
          <view v-for="day in trend" :key="day.label" :class="styles.bar">
            <text :class="styles['bar-value']">
              {{ day.value }}
            </text>
            <view :class="styles['bar-track']">
              <view :class="styles['bar-fill']" :style="{ height: `${Math.round((day.value / maxTrend) * 100)}%` }" />
            </view>
            <text :class="styles['bar-label']">
              {{ day.label }}
            </text>
          </view>
        </view>
      </view>

      <!-- 部门分布 -->
      <view :class="styles.card">
        <view :class="styles['card-head']">
          <text :class="styles['card-title']">
            部门分布
          </text>
          <text :class="styles['card-hint']">
            {{ depts.length }} 个部门
          </text>
        </view>
        <view v-for="dept in depts" :key="dept.name" :class="styles.row">
          <view :class="styles['row-head']">
            <text :class="styles['row-name']">
              {{ dept.name }}
            </text>
            <text :class="styles['row-value']">
              {{ dept.total }} 单 · 待处理 {{ dept.pending }}
            </text>
          </view>
          <view :class="styles.track">
            <view :class="styles.fill" :style="{ width: `${Math.round((dept.total / maxDept) * 100)}%` }" />
          </view>
        </view>
      </view>

      <!-- 单据类型 -->
      <view :class="styles.card">
        <view :class="styles['card-head']">
          <text :class="styles['card-title']">
            单据类型 TOP5
          </text>
          <text :class="styles['card-hint']">
            占比
          </text>
        </view>
        <view v-for="type in types" :key="type.name" :class="styles['type-row']">
          <text :class="styles['type-name']">
            {{ type.name }}
          </text>
          <view :class="styles['type-track']">
            <view :class="styles['type-fill']" :style="{ width: `${type.ratio}%` }" />
          </view>
          <text :class="styles['type-value']">
            {{ type.value }}
          </text>
        </view>
      </view>

      <view class="sp-footnote">
        <text class="sp-footnote-text">
          数据由本地引擎实时汇总 · 仅用于演示
        </text>
      </view>
    </view>
  </AuthLayout>
</template>
