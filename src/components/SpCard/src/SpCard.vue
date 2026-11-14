<script setup lang="ts">
import { computed, useSlots } from 'vue'
import styles from './SpCard.module.scss'

const props = withDefaults(defineProps<{
  title?: string
  /** 标题右侧的辅助说明 */
  hint?: string
  /** form：表单卡；detail：详情卡（内边距与标题间距更宽松） */
  variant?: 'form' | 'detail'
}>(), {
  title: '',
  hint: '',
  variant: 'form',
})

const slots = useSlots()
const hasHead = computed(() => !!(props.title || props.hint || slots.title || slots.extra))
</script>

<template>
  <view :class="[styles.card, styles[`card--${variant}`]]">
    <view v-if="hasHead" :class="styles.head">
      <text v-if="title || slots.title" data-role="card-title" :class="styles.title">
        <slot name="title">
          {{ title }}
        </slot>
      </text>
      <slot name="extra">
        <text v-if="hint" :class="styles.hint">
          {{ hint }}
        </text>
      </slot>
    </view>
    <slot />
  </view>
</template>
