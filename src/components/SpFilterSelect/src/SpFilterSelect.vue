<script setup lang="ts">
import type { FilterOption } from './types'
import { computed, ref } from 'vue'
import styles from './SpFilterSelect.module.scss'

const props = withDefaults(defineProps<{
  /** 当前选中的 key（v-model） */
  modelValue?: string
  options: FilterOption[]
}>(), {
  modelValue: '',
})

const emit = defineEmits<{
  'update:modelValue': [value: string]
  'change': [option: FilterOption]
}>()

const open = ref(false)

const current = computed(() => props.options.find(opt => opt.key === props.modelValue))
const currentLabel = computed(() => current.value?.label ?? props.options[0]?.label ?? '')

function toggle() {
  open.value = !open.value
}

function select(option: FilterOption) {
  open.value = false
  if (option.key === props.modelValue)
    return
  emit('update:modelValue', option.key)
  emit('change', option)
}
</script>

<template>
  <view :class="styles.wrap">
    <view
      data-role="filter-trigger"
      :class="[styles.trigger, (open || !!modelValue) && styles['trigger--active']]"
      @click="toggle"
    >
      <text :class="styles.label">
        {{ currentLabel }}
      </text>
      <view :class="[styles.chevron, open && styles['chevron--up']]" />
    </view>

    <view v-if="open" :class="styles.dropdown">
      <view
        v-for="option in options"
        :key="option.key || 'all'"
        data-role="filter-option"
        :class="[styles.option, modelValue === option.key && styles['option--active']]"
        @click="select(option)"
      >
        <text :class="styles['option-label']">
          {{ option.label }}
        </text>
        <text v-if="modelValue === option.key" :class="styles['option-check']">
          ✓
        </text>
      </view>
    </view>

    <!-- 点击空白关闭 -->
    <view v-if="open" :class="styles.mask" @click="open = false" />
  </view>
</template>
