<script setup lang="ts">
import styles from './ApplyBillCard.module.scss'

withDefaults(defineProps<{
  item: Recordable
  /** 列表内业务域单一时可隐藏分类标签 */
  showCategory?: boolean
}>(), {
  showCategory: true,
})

const emit = defineEmits<{ view: [Recordable] }>()

/** 状态 → 标签配色 */
function tone(status: string) {
  if (status === '待审批')
    return 'wait'
  if (status === '审批中')
    return 'progressing'
  if (status === '已通过')
    return 'pass'
  if (status === '已退回')
    return 'back'
  return 'muted'
}
</script>

<template>
  <view :class="styles.card" @click="emit('view', item)">
    <view :class="styles['card-head']">
      <view :class="styles['card-heading']">
        <text v-if="showCategory" :class="styles['card-cat']">
          {{ item.biz_category }}
        </text>
        <text :class="styles['card-title']">
          {{ item.biz_title }}
        </text>
      </view>
      <text :class="[styles.tag, styles[`tag--${tone(item.status)}`]]">
        {{ item.status }}
      </text>
    </view>

    <view :class="styles['card-meta']">
      <text :class="styles['card-no']">
        {{ item.biz_no }}
      </text>
      <text :class="styles['card-dot']">
        ·
      </text>
      <text>{{ item.team_name }}</text>
    </view>

    <view :class="styles['card-foot']">
      <text :class="styles['card-time']">
        {{ item.ctime }}
      </text>
      <text :class="styles['card-link']">
        查看详情
      </text>
    </view>
  </view>
</template>
