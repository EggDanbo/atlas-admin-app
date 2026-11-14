<script setup lang="ts">
import { useDidShow, useReachBottom } from '@tarojs/taro'
import { ref } from 'vue'
import { AuthLayout } from '@/components/AuthLayout'
import { PageNavbar } from '@/components/PageNavbar'
import BillListPanel from './components/BillListPanel.vue'
import styles from './list.module.scss'

const panel = ref()

useDidShow(() => panel.value?.refresh())
useReachBottom(() => panel.value?.loadMore())
</script>

<template>
  <AuthLayout>
    <view class="sp-page" :class="styles.page">
      <PageNavbar title="我的申请" />
      <BillListPanel ref="panel" />
    </view>
  </AuthLayout>
</template>
