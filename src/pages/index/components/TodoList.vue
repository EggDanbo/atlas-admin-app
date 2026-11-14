<script setup lang="ts">
import { Right } from '@nutui/icons-vue-taro'
import Taro from '@tarojs/taro'
import { onMounted, ref } from 'vue'
import api from '@/service/api/message'
import { routes } from '@/utils/router'
import styles from './TodoList.module.scss'

const todoData = ref<any[]>([])
const total = ref(0)

async function getList() {
  const { isSuccess, data } = await api.search({
    page: 1,
    pagesize: 3,
    kind: 'ATLAS',
    unread: false,
  })
  if (!isSuccess || !data)
    return
  const list = Array.isArray(data.list) ? data.list : []
  todoData.value = list.slice(0, 3)
  total.value = Number(data.totalcount || list.length)
}

onMounted(() => getList())

/** 进消息中心时带上「待办」类型，免去再筛一次 */
function goTodoList() {
  Taro.navigateTo({ url: `${routes.userMessage}?types=0` })
}

function handleMore() {
  goTodoList()
}

function handleItemClick() {
  // 业务详情页已不在演示范围内，统一进消息中心
  goTodoList()
}

function typeLabel(types: number) {
  return ['待办', '消息', '通知'][Number(types)] || '消息'
}
</script>

<template>
  <view :class="styles.section">
    <view :class="styles['section-head']" @click="handleMore">
      <view :class="styles['head-left']">
        <text :class="styles['section-title']">
          待办事项
        </text>
        <text v-if="total" :class="styles['section-count']">
          {{ total }}
        </text>
      </view>
      <view :class="styles['head-more']">
        <text :class="styles['head-more-text']">
          查看全部
        </text>
        <Right size="12" color="#9aa0b4" />
      </view>
    </view>

    <view v-if="todoData.length" :class="styles.list">
      <view
        v-for="item in todoData"
        :key="item.id"
        :class="styles.item"
        @click="handleItemClick(item)"
      >
        <view :class="[styles.dot, item.types === 0 ? styles['dot--todo'] : styles['dot--msg']]" />
        <view :class="styles['item-main']">
          <view :class="styles['item-title-row']">
            <text :class="styles['item-title']">
              {{ item.title }}
            </text>
            <text :class="styles['item-tag']">
              {{ typeLabel(item.types) }}
            </text>
          </view>
          <text :class="styles['item-desc']">
            {{ item.user_name }} · {{ item.ctime }}
          </text>
        </view>
        <Right size="12" color="#c4c8d6" />
      </view>
    </view>

    <SpEmpty v-else description="暂无待办" />
  </view>
</template>
