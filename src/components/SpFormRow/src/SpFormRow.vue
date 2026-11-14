<script setup lang="ts">
import styles from './SpFormRow.module.scss'

withDefaults(defineProps<{
  /** 左侧标签 */
  label?: string
  /** 必填星号 */
  required?: boolean
  /** 行下错误提示 */
  error?: string
  /** 行下成功提示（与 error 互斥，error 优先） */
  success?: string
  /** 行尾右侧箭头（选择器类行） */
  arrow?: boolean
}>(), {
  label: '',
  required: false,
  error: '',
  success: '',
  arrow: false,
})
</script>

<template>
  <view :class="styles.item">
    <view :class="[styles.row, error && styles['row--error']]">
      <text v-if="label" :class="styles.label">
        {{ label }}<text v-if="required" :class="styles.req">
          *
        </text>
      </text>

      <slot />

      <view v-if="arrow" :class="styles.arrow" />
    </view>

    <view v-if="error" data-role="form-error" :class="styles.error">
      {{ error }}
    </view>
    <view v-else-if="success" :class="styles.success">
      {{ success }}
    </view>
  </view>
</template>
