<script setup lang="ts">
import {
  Date,
  Edit,
  Marshalling,
  My,
  Notice,
  Order,
  People,
  Setting,
} from '@nutui/icons-vue-taro'
import Taro from '@tarojs/taro'
import { routes } from '@/utils/router'
import styles from './MenuGrid.module.scss'

interface MenuItem {
  icon: any
  label: string
  color: string
  bg: string
  url: string
}

/**
 * 管理端菜单
 *
 * 移动端只保留「必须在手机上完成」的动作：审批、单据、组织、考勤、看板、消息。
 * 台账录入、报表设计、权限配置这类重操作留给 PC 后台。
 */
const menuList: MenuItem[] = [
  { icon: Setting, label: '考勤规则', color: '#4f46e5', bg: '#eef2ff', url: routes.ruleList },
  { icon: Order, label: '我的申请', color: '#e11d48', bg: '#fff1f2', url: routes.myApply },
  { icon: Edit, label: '请假申请', color: '#0d9488', bg: '#ecfdf5', url: routes.applyLeave },
  { icon: People, label: '组织通讯录', color: '#d97706', bg: '#fffbeb', url: routes.contact },
  { icon: My, label: '成员管理', color: '#7c3aed', bg: '#f5f3ff', url: routes.team },
  { icon: Date, label: '考勤统计', color: '#0891b2', bg: '#ecfeff', url: routes.checkinStats },
  { icon: Marshalling, label: '数据看板', color: '#0284c7', bg: '#eff6ff', url: routes.board },
  { icon: Notice, label: '消息中心', color: '#be185d', bg: '#fdf2f8', url: routes.userMessage },
]

function handleMenuClick(item: MenuItem) {
  Taro.navigateTo({ url: item.url })
}
</script>

<template>
  <view :class="styles.section">
    <view :class="styles['section-head']">
      <text :class="styles['section-title']">
        管理菜单
      </text>
      <text :class="styles['section-hint']">
        考勤 · 单据 · 数据
      </text>
    </view>

    <view :class="styles.grid">
      <view
        v-for="item in menuList"
        :key="item.label"
        :class="styles.tile"
        @click="handleMenuClick(item)"
      >
        <view :class="styles['tile-icon']" :style="{ backgroundColor: item.bg }">
          <component :is="item.icon" :size="19" :color="item.color" />
        </view>
        <text :class="styles['tile-label']">
          {{ item.label }}
        </text>
      </view>
    </view>
  </view>
</template>
