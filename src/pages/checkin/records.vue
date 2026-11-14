<script setup lang="ts">
import type { CheckinRecord, CheckinStats } from '@/service/api/checkin'
import { useDidShow } from '@tarojs/taro'
import { ref } from 'vue'
import { AuthLayout } from '@/components/AuthLayout'
import { PageNavbar } from '@/components/PageNavbar'
import checkinApi from '@/service/api/checkin'
import styles from './records.module.scss'

const list = ref<CheckinRecord[]>([])
const stats = ref<CheckinStats | null>(null)
const loading = ref(true)

async function load() {
  loading.value = true
  const [recordRes, statsRes] = await Promise.all([
    checkinApi.records({ page: 1, pagesize: 60 }),
    checkinApi.stats(),
  ])
  if (recordRes.isSuccess && recordRes.data)
    list.value = recordRes.data.list ?? []
  if (statsRes.isSuccess && statsRes.data)
    stats.value = statsRes.data
  loading.value = false
}

useDidShow(() => void load())
</script>

<template>
  <AuthLayout>
    <view class="sp-page" :class="styles.page">
      <PageNavbar title="打卡记录" />

      <view :class="styles.summary">
        <view :class="styles['summary-item']">
          <text :class="styles['summary-value']">
            {{ stats?.days ?? 0 }}
          </text>
          <text :class="styles['summary-label']">
            本月出勤
          </text>
        </view>
        <view :class="styles['summary-divider']" />
        <view :class="styles['summary-item']">
          <text :class="styles['summary-value']">
            {{ stats?.average ?? '0.0' }}
          </text>
          <text :class="styles['summary-label']">
            平均工时
          </text>
        </view>
        <view :class="styles['summary-divider']" />
        <view :class="styles['summary-item']">
          <text :class="styles['summary-value']">
            {{ stats?.late ?? 0 }}
          </text>
          <text :class="styles['summary-label']">
            迟到次数
          </text>
        </view>
      </view>

      <view :class="styles.card">
        <view :class="styles['card-head']">
          <text :class="styles['card-title']">
            每日明细
          </text>
          <text :class="styles['card-hint']">
            共 {{ list.length }} 条
          </text>
        </view>

        <view v-if="loading" :class="styles.tip">
          加载中…
        </view>
        <SpEmpty v-else-if="!list.length" description="本月还没有打卡记录" />
        <template v-else>
          <view v-for="item in list" :key="item.id" :class="styles.row">
            <view :class="styles['row-date']">
              <text :class="styles['row-day']">
                {{ item.date }}
              </text>
              <text :class="styles['row-week']">
                {{ item.weekday }}
              </text>
            </view>
            <view :class="styles['row-time']">
              <text :class="styles['row-in']">
                {{ item.inTime }}
              </text>
              <text :class="styles['row-arrow']">
                —
              </text>
              <text :class="styles['row-out']">
                {{ item.outTime }}
              </text>
            </view>
            <text :class="styles['row-hours']">
              {{ item.hours }}h
            </text>
            <text :class="[styles.tag, item.status === '迟到' ? styles['tag--warn'] : styles['tag--ok']]">
              {{ item.status }}
            </text>
          </view>
        </template>
      </view>

      <view class="sp-footnote">
        <text class="sp-footnote-text">
          数据由本地引擎生成 · 仅用于演示
        </text>
      </view>
    </view>
  </AuthLayout>
</template>
