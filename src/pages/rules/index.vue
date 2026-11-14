<script setup lang="ts">
import type { AttendanceRule } from '@/service/api/rules'
import Taro, { useDidShow } from '@tarojs/taro'
import { computed, ref } from 'vue'
import { AuthLayout } from '@/components/AuthLayout'
import { PageNavbar } from '@/components/PageNavbar'
import rulesApi from '@/service/api/rules'
import { modeLabel, ruleMainText, ruleModeHint } from '@/utils/attendance'
import { routes } from '@/utils/router'
import styles from './index.module.scss'

const list = ref<AttendanceRule[]>([])
const keyword = ref('')
const loading = ref(true)

async function load() {
  loading.value = true
  const { isSuccess, data } = await rulesApi.list({
    page: 1,
    pagesize: 50,
    filter: keyword.value.trim() || undefined,
  })
  if (isSuccess && data)
    list.value = data.list || []
  loading.value = false
}

useDidShow(() => void load())

const activeCount = computed(() => list.value.filter(item => item.status === 1).length)

const modeCount = computed(() => {
  const count: Record<string, number> = { fixed: 0, free: 0, shift: 0 }
  list.value.forEach((item) => {
    const key = item.mode || 'fixed'
    count[key] = (count[key] || 0) + 1
  })
  return [
    { key: 'fixed', label: '固定班次', count: count.fixed },
    { key: 'free', label: '自由打卡', count: count.free },
    { key: 'shift', label: '排班制', count: count.shift },
  ]
})

function onSearch() {
  void load()
}

function clearKeyword() {
  keyword.value = ''
  void load()
}

function openDetail(item: AttendanceRule) {
  Taro.navigateTo({ url: `${routes.ruleDetail}?id=${item.id}` })
}

function createRule() {
  Taro.navigateTo({ url: routes.ruleEdit })
}
</script>

<template>
  <AuthLayout>
    <view class="sp-page sp-page--with-fab" :class="styles.page">
      <PageNavbar title="考勤规则" />

      <view :class="styles.toolbar">
        <SpSearchBar
          v-model="keyword"
          :inset="false"
          placeholder="搜索规则名称或适用部门"
          @confirm="onSearch"
          @clear="clearKeyword"
        />

        <view :class="styles.summary">
          <text :class="styles['summary-text']">
            共 {{ list.length }} 条规则
          </text>
          <text :class="styles['summary-hint']">
            启用 {{ activeCount }}
          </text>
        </view>

        <view :class="styles['mode-stats']">
          <view v-for="item in modeCount" :key="item.key" :class="styles['mode-stat']">
            <text :class="[styles['mode-dot'], styles[`mode-dot--${item.key}`]]" />
            <text :class="styles['mode-stat-text']">
              {{ item.label }} {{ item.count }}
            </text>
          </view>
        </view>
      </view>

      <view v-if="loading && !list.length" :class="styles.tip">
        加载中…
      </view>
      <SpEmpty v-else-if="!list.length" description="还没有考勤规则，点右下角新建" />
      <template v-else>
        <view
          v-for="item in list"
          :key="item.id"
          :class="styles.card"
          @click="openDetail(item)"
        >
          <view :class="styles['card-head']">
            <view :class="styles['card-title']">
              <text :class="styles['card-name']">
                {{ item.name }}
              </text>
              <text :class="[styles.mode, styles[`mode--${item.mode || 'fixed'}`]]">
                {{ modeLabel(item.mode) }}
              </text>
            </view>
            <text :class="[styles.tag, item.status === 1 ? styles['tag--on'] : styles['tag--off']]">
              {{ item.status === 1 ? '启用' : '停用' }}
            </text>
          </view>

          <view :class="styles.meta">
            <text>{{ item.scope }}</text>
            <text :class="styles.dot">
              ·
            </text>
            <text>{{ item.member_count }} 人</text>
          </view>

          <view :class="styles.shift">
            <text :class="styles['shift-time']">
              {{ ruleMainText(item) }}
            </text>
            <text :class="styles['shift-tag']">
              {{ ruleModeHint(item) }}
            </text>
          </view>

          <view :class="styles.chips">
            <text v-for="way in item.ways" :key="way" :class="styles.chip">
              {{ way }}
            </text>
            <text :class="styles.chip">
              {{ item.gps_range }}m
            </text>
          </view>

          <view :class="styles['card-foot']">
            <text :class="styles['card-time']">
              更新 {{ item.utime }}
            </text>
            <text :class="styles['card-link']">
              查看详情
            </text>
          </view>
        </view>
      </template>

      <view :class="styles.fab" @click="createRule">
        <text :class="styles['fab-plus']">
          +
        </text>
      </view>
    </view>
  </AuthLayout>
</template>
