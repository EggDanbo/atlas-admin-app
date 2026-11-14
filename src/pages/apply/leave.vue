<script setup lang="ts">
import { useDidShow, useReachBottom } from '@tarojs/taro'
import { ref } from 'vue'
import { AuthLayout } from '@/components/AuthLayout'
import { PageNavbar } from '@/components/PageNavbar'
import BillListPanel from './components/BillListPanel.vue'
import styles from './leave.module.scss'

const panel = ref()

useDidShow(() => panel.value?.refresh())
useReachBottom(() => panel.value?.loadMore())
</script>

<template>
  <AuthLayout>
    <view class="sp-page sp-page--with-fab" :class="styles.page">
      <PageNavbar title="请假申请" />
      <BillListPanel
        ref="panel"
        module="leave"
        :show-category="false"
        with-fab
        placeholder="搜索单号或请假类型"
        empty-text="还没有请假记录，点右下角发起一条"
        footnote="仅展示请假类单据 · 加班可在申请页切换"
      />
    </view>
  </AuthLayout>
</template>
