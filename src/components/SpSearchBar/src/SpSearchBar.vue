<script setup lang="ts">
import { ref, watch } from 'vue'
import styles from './SpSearchBar.module.scss'

const props = withDefaults(defineProps<{
  /** 关键字（v-model） */
  modelValue?: string
  placeholder?: string
  confirmType?: 'send' | 'search' | 'next' | 'go' | 'done'
  /** 有内容时是否显示清除按钮 */
  clearable?: boolean
  /** 页面顶层使用时自带左右 16px 留白；放进工具栏时传 false */
  inset?: boolean
}>(), {
  modelValue: '',
  placeholder: '搜索',
  confirmType: 'search',
  clearable: true,
  inset: true,
})

const emit = defineEmits<{
  'update:modelValue': [value: string]
  'confirm': [value: string]
  'clear': []
}>()

// 本地镜像：confirm 要拿到「刚输入完」的值，等父级 props 回流会滞后一拍
const inner = ref(props.modelValue)

watch(() => props.modelValue, (value) => {
  if (value !== inner.value)
    inner.value = value ?? ''
})

function handleInput(e: any) {
  inner.value = e?.detail?.value ?? ''
  emit('update:modelValue', inner.value)
}

function handleConfirm() {
  emit('confirm', inner.value)
}

function handleClear() {
  inner.value = ''
  emit('update:modelValue', '')
  emit('clear')
}
</script>

<template>
  <view :class="[styles.search, { [styles['search--inset']]: inset }]">
    <view :class="styles['search-icon']" />
    <input
      :value="inner"
      :class="styles['search-input']"
      :placeholder="placeholder"
      :placeholder-class="styles['search-placeholder']"
      :confirm-type="confirmType"
      @input="handleInput"
      @confirm="handleConfirm"
    >
    <view
      v-if="clearable && inner"
      :class="styles['search-clear']"
      @click="handleClear"
    >
      <text :class="styles['search-clear-icon']">
        ×
      </text>
    </view>
  </view>
</template>
