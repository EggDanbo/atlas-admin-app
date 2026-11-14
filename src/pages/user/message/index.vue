<script setup lang="ts">
import type { FilterOption } from '@/components/SpFilterSelect'
import Taro, { useDidShow, useLoad, useReachBottom } from '@tarojs/taro'
import { computed, ref } from 'vue'
import { AuthLayout } from '@/components/AuthLayout'
import { PageNavbar } from '@/components/PageNavbar'
import { SpListStatus } from '@/components/SpListStatus'
import { showToast } from '@/components/SpToast'
import { useListPage } from '@/hooks/list'
import messageApi from '@/service/api/message'
import styles from './index.module.scss'

/** 类型筛选项：key 为空表示全部 */
const TYPE_OPTIONS: FilterOption[] = [
  { key: '', label: '全部类型' },
  { key: '0', label: '待办' },
  { key: '1', label: '消息' },
  { key: '2', label: '通知' },
]

const active = ref('')
const keyword = ref('')

const { list, total, loading, finished, isEmpty, queryModel, search, loadMore } = useListPage({
  api: {
    search: params => messageApi.search({ ...params, kind: 'ATLAS' }),
  },
  createQueryModel: () => ({
    filter: undefined as string | undefined,
    types: undefined as string | undefined,
    read: null as string | null,
    date: null as [number, number] | null,
    title: undefined as string | undefined,
    biz_id: undefined as string | undefined,
  }),
  idField: 'id',
  immediate: false,
})

useDidShow(() => search())

// 支持从工作台「待办 → 查看全部」带类型进来（types=0 待办 / 1 消息 / 2 通知）
useLoad((options) => {
  const types = options?.types
  if (types === undefined)
    return
  const matched = TYPE_OPTIONS.find(opt => opt.key === String(types))
  if (!matched)
    return
  active.value = matched.key
  queryModel.types = matched.key || undefined
})

useReachBottom(() => loadMore())

const unreadCount = computed(() => list.value.filter(item => !item.utime).length)

/** 切换待办 / 消息 / 通知 */
function onTypeChange(option: FilterOption) {
  queryModel.types = option.key || undefined
  search()
}

function onSearch() {
  queryModel.filter = keyword.value.trim() || undefined
  search()
}

function clearKeyword() {
  keyword.value = ''
  if (queryModel.filter) {
    queryModel.filter = undefined
    search()
  }
}

function typeLabel(item: Recordable) {
  return TYPE_OPTIONS.find(opt => opt.key === String(item.types))?.label || '消息'
}

/** 类型 → 标签配色 */
function typeTone(item: Recordable) {
  const types = String(item.types)
  if (types === '0')
    return 'todo'
  if (types === '1')
    return 'info'
  return 'notice'
}

function isUnread(item: Recordable) {
  return !item.utime
}

function nowText() {
  const d = new Date()
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`
}

/** 点开即视为已读，再展示内容 */
async function handleView(item: Recordable) {
  if (!item.utime) {
    const { isSuccess } = await messageApi.read(item.id)
    if (isSuccess)
      item.utime = nowText()
  }
  Taro.showModal({
    title: item.title || '消息详情',
    content: item.content || '暂无详细内容',
    showCancel: false,
    confirmText: '知道了',
  })
}

async function handleReadAll() {
  if (!unreadCount.value)
    return
  const { confirm } = await Taro.showModal({
    title: '全部已读',
    content: `当前列表有 ${unreadCount.value} 条未读，确认全部标记为已读？`,
    confirmText: '全部已读',
  })
  if (!confirm)
    return
  const { isSuccess } = await messageApi.readAll('ATLAS')
  showToast(isSuccess ? '已全部标记为已读' : '操作失败')
  if (isSuccess)
    search()
}
</script>

<template>
  <AuthLayout>
    <view class="sp-page" :class="styles.page">
      <PageNavbar title="消息中心" />

      <!-- 搜索 + 类型筛选 -->
      <view :class="styles.toolbar">
        <SpSearchBar
          v-model="keyword"
          :inset="false"
          placeholder="搜索消息标题或内容"
          @confirm="onSearch"
          @clear="clearKeyword"
        />

        <view :class="styles['filter-bar']">
          <SpFilterSelect
            v-model="active"
            :options="TYPE_OPTIONS"
            @change="onTypeChange"
          />

          <text :class="styles['filter-count']">
            共 {{ total }} 条
          </text>

          <text
            v-if="unreadCount > 0"
            :class="styles['read-all']"
            @click="handleReadAll"
          >
            全部已读
          </text>
        </view>
      </view>

      <view :class="styles.list">
        <SpListStatus
          :loading="loading"
          :finished="finished || (total > 0 && list.length >= total)"
          :is-empty="isEmpty"
          :has-data="list.length > 0"
          empty-text="没有符合条件的消息"
        >
          <view
            v-for="item in list"
            :key="item.id"
            :class="styles.card"
            @click="handleView(item)"
          >
            <view :class="styles['card-head']">
              <view :class="styles['card-heading']">
                <text :class="[styles['card-cat'], styles[`card-cat--${typeTone(item)}`]]">
                  {{ typeLabel(item) }}
                </text>
                <text :class="styles['card-title']">
                  {{ item.title }}
                </text>
              </view>
              <text v-if="isUnread(item)" :class="styles.unread">
                未读
              </text>
            </view>

            <text :class="styles.content">
              {{ item.content }}
            </text>

            <view :class="styles['card-foot']">
              <text :class="styles['card-time']">
                {{ item.ctime }}
              </text>
              <text :class="styles['card-link']">
                查看详情
              </text>
            </view>
          </view>
        </SpListStatus>
      </view>

      <view class="sp-footnote">
        <text class="sp-footnote-text">
          数据由本地引擎生成 · 仅用于演示
        </text>
      </view>
    </view>
  </AuthLayout>
</template>
