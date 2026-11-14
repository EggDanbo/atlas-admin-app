<script setup lang="ts">
import type { FilterOption } from '@/components/SpFilterSelect'
import Taro from '@tarojs/taro'
import { onMounted, ref } from 'vue'
import { SpListStatus } from '@/components/SpListStatus'
import { useListPage } from '@/hooks/list'
import { apply as workflowApply } from '@/service/api/workflow'
import { routes } from '@/utils/router'
import ApplyBillCard from './ApplyBillCard.vue'
import styles from './BillListPanel.module.scss'

const props = withDefaults(defineProps<{
  /** 只取某类单据（leave = 请假），不传则全部 */
  module?: string
  /** 搜索框占位文案 */
  placeholder?: string
  /** 空态文案 */
  emptyText?: string
  /** 卡片上是否展示单据类别标签 */
  showCategory?: boolean
  /** 右下角悬浮新增按钮 */
  withFab?: boolean
  /** 页脚说明 */
  footnote?: string
}>(), {
  module: undefined,
  placeholder: '搜索单号或类型',
  emptyText: '没有符合条件的申请单据',
  showCategory: true,
  withFab: false,
  footnote: '数据由本地引擎生成 · 仅用于演示',
})

/** 状态筛选项：key 为空表示全部 */
const STATUS_OPTIONS: FilterOption[] = [
  { key: '', label: '全部状态' },
  { key: 'wait', label: '待审批' },
  { key: 'progressing', label: '审批中' },
  { key: 'pass', label: '已通过' },
  { key: 'back', label: '已退回' },
]

const active = ref('')
const keyword = ref('')

const { list, total, loading, finished, isEmpty, queryModel, search, loadMore } = useListPage({
  api: {
    search: params => workflowApply.search(params),
  },
  createQueryModel: () => ({
    module: props.module,
    status: undefined as string | undefined,
    filter: undefined as string | undefined,
  }),
  idField: 'id',
  immediate: false,
})

function reload() {
  keyword.value = ''
  active.value = ''
  queryModel.status = undefined
  queryModel.filter = undefined
  search()
}

// 首次进入由组件自己拉一次；页面级的 show / 触底再通过 expose 调用
onMounted(() => search())

defineExpose({ refresh: () => search(), loadMore })

function onStatusChange(option: FilterOption) {
  queryModel.status = option.key || undefined
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

function handleView(item: Recordable) {
  Taro.navigateTo({ url: `${routes.myApplyDetail}?id=${item.id}` })
}

function handleCreate() {
  Taro.navigateTo({ url: `${routes.apply}?type=leave` })
}
</script>

<template>
  <!-- 搜索 + 状态筛选 -->
  <view :class="styles.toolbar">
    <SpSearchBar
      v-model="keyword"
      :inset="false"
      :placeholder="placeholder"
      @confirm="onSearch"
      @clear="clearKeyword"
    />

    <view :class="styles['filter-bar']">
      <SpFilterSelect
        v-model="active"
        :options="STATUS_OPTIONS"
        @change="onStatusChange"
      />

      <text :class="styles['filter-count']">
        共 {{ total }} 条
      </text>
    </view>
  </view>

  <view :class="styles.list">
    <SpListStatus
      :loading="loading"
      :finished="finished || (total > 0 && list.length >= total)"
      :is-empty="isEmpty"
      :has-data="list.length > 0"
      :empty-text="emptyText"
    >
      <ApplyBillCard
        v-for="item in list"
        :key="item.id"
        :item="item"
        :show-category="showCategory"
        @view="handleView"
      />
    </SpListStatus>
  </view>

  <!-- 空态时给一个重置入口 -->
  <view v-if="!loading && !list.length" :class="styles.refresh" @click="reload">
    重置筛选
  </view>

  <view class="sp-footnote">
    <text class="sp-footnote-text">
      {{ footnote }}
    </text>
  </view>

  <!-- 悬浮新增 -->
  <view v-if="withFab" :class="styles.fab" @click="handleCreate">
    <text :class="styles['fab-plus']">
      +
    </text>
  </view>
</template>
