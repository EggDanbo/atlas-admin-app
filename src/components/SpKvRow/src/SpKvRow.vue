<script setup lang="ts">
import styles from './SpKvRow.module.scss'

withDefaults(defineProps<{
  label: string
  /** 右侧值；需要富文本时用默认插槽 */
  value?: string
  /** 强调显示（金额、数字等） */
  strong?: boolean
}>(), {
  value: '',
  strong: false,
})
</script>

<template>
  <view :class="styles.row">
    <text :class="styles.label">
      {{ label }}
    </text>
    <text :class="[styles.value, strong && styles['value--strong']]">
      <slot>
        {{ value }}
      </slot>
    </text>
  </view>
</template>
