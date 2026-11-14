<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { safeBack } from '@/utils/auth'
import { getCurrentPageInfo } from '@/utils/router'

const props = withDefaults(defineProps<{
  title?: string
}>(), {
  title: '',
})

const IS_H5 = process.env.TARO_ENV === 'h5'

const entryMode = ref<'normal' | 'external'>('normal')

onMounted(() => {
  const { params } = getCurrentPageInfo()
  if (params.mode === 'external') {
    entryMode.value = 'external'
  }
})

function handleBack() {
  safeBack(entryMode.value === 'external' ? 'external' : undefined)
}
</script>

<template>
  <nut-navbar
    v-if="IS_H5"
    :title="props.title"
    left-show
    fixed
    placeholder
    @click-back="handleBack"
  />
</template>
