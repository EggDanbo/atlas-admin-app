<script setup lang="ts">
import { Loading } from '@nutui/icons-vue-taro'
import styles from './SpListStatus.module.scss'

withDefaults(defineProps<{
  loading?: boolean
  finished?: boolean
  isEmpty?: boolean
  hasData?: boolean
  emptyText?: string
}>(), {
  loading: false,
  finished: false,
  isEmpty: false,
  hasData: false,
  emptyText: '暂无数据',
})

defineEmits<{
  loadMore: []
}>()
</script>

<template>
  <view>
    <!-- 首次加载中 -->
    <view v-if="loading && !hasData" :class="styles.loadingWrap">
      <Loading :class="styles.loadingIcon" />
      <text :class="styles.loadingText">
        加载中...
      </text>
    </view>

    <!-- 空列表 -->
    <SpEmpty v-else-if="isEmpty && !loading" :description="emptyText" />

    <!-- 列表正常显示 -->
    <template v-else-if="hasData">
      <slot />

      <!-- 底部加载状态：非加载中 -->
      <view v-if="!loading" :class="styles.loadStatus">
        <text :class="styles.loadStatusText">
          {{ finished ? '没有更多了' : '上拉加载更多' }}
        </text>
      </view>

      <!-- 底部加载状态：加载更多中 -->
      <view v-else :class="styles.loadStatus">
        <Loading :class="styles.loadingIcon" />
      </view>
    </template>
  </view>
</template>
