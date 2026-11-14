<script setup lang="ts">
import Taro, { useLoad } from '@tarojs/taro'
import { computed, ref } from 'vue'
import { AuthLayout } from '@/components/AuthLayout'
import { PageNavbar } from '@/components/PageNavbar'
import { showToast } from '@/components/SpToast'
import applyApi from '@/service/api/apply'
import { safeBack } from '@/utils/auth'
import styles from './index.module.scss'

type ApplyType = 'leave' | 'overtime'

const type = ref<ApplyType>('leave')
const startDate = ref('')
const endDate = ref('')
const startTime = ref('09:00')
const leaveKind = ref('事假')
const hours = ref(2)
const reason = ref('')
const submitting = ref(false)
/** 已提交成功：防止触摸 + click 双重事件重复下单 */
const submitted = ref(false)

const today = new Date()
const todayText = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`

useLoad((options) => {
  type.value = options?.type === 'overtime' ? 'overtime' : 'leave'
  startDate.value = todayText
  endDate.value = todayText
})

const title = computed(() => (type.value === 'leave' ? '请假申请' : '加班申请'))

/** 请假天数（含首尾） */
const leaveDays = computed(() => {
  if (!startDate.value || !endDate.value)
    return 1
  const diff = (new Date(endDate.value).getTime() - new Date(startDate.value).getTime()) / 86400000
  return Math.max(1, Math.round(diff) + 1)
})

const durationText = computed(() => (type.value === 'leave' ? `${leaveDays.value} 天` : `${hours.value} 小时`))

const canSubmit = computed(() => !!startDate.value && !!reason.value.trim() && !submitting.value)

function switchType(next: ApplyType) {
  type.value = next
}

function onDateChange(field: 'start' | 'end', e: any) {
  const value = e.detail?.value as string
  if (field === 'start') {
    startDate.value = value
    if (endDate.value < value)
      endDate.value = value
  }
  else {
    endDate.value = value
  }
}

function onTimeChange(e: any) {
  startTime.value = e.detail?.value as string
}

async function submit() {
  if (submitting.value || submitted.value)
    return
  if (!startDate.value) {
    showToast(type.value === 'leave' ? '请选择开始日期' : '请选择加班日期')
    return
  }
  if (!reason.value.trim()) {
    showToast('请填写申请事由')
    return
  }
  submitting.value = true
  const { isSuccess, data } = await applyApi.submit({
    type: type.value,
    startDate: startDate.value,
    endDate: type.value === 'leave' ? endDate.value : startDate.value,
    startTime: type.value === 'overtime' ? startTime.value : '',
    duration: durationText.value,
    kind: type.value === 'leave' ? leaveKind.value : '加班',
    reason: reason.value,
  })
  submitting.value = false
  if (!isSuccess) {
    showToast('提交失败，请重试')
    return
  }
  submitted.value = true
  await Taro.showModal({
    title: '提交成功',
    content: `单号 ${data?.no || '—'}，已进入审批流程`,
    showCancel: false,
    confirmText: '知道了',
  })
  safeBack()
}
</script>

<template>
  <AuthLayout>
    <view class="sp-page" :class="styles.page">
      <PageNavbar :title="title" />

      <view :class="styles.segment">
        <view :class="[styles['segment-item'], type === 'leave' ? styles['segment-item--active'] : '']" @click="switchType('leave')">
          请假
        </view>
        <view :class="[styles['segment-item'], type === 'overtime' ? styles['segment-item--active'] : '']" @click="switchType('overtime')">
          加班
        </view>
      </view>

      <view :class="styles.card">
        <picker mode="date" :value="startDate" @change="onDateChange('start', $event)">
          <view :class="styles.row">
            <text :class="styles['row-label']">
              {{ type === 'leave' ? '开始日期' : '加班日期' }}
            </text>
            <text :class="styles['row-value']">
              {{ startDate || '请选择' }}
            </text>
          </view>
        </picker>

        <picker v-if="type === 'leave'" mode="date" :value="endDate" @change="onDateChange('end', $event)">
          <view :class="styles.row">
            <text :class="styles['row-label']">
              结束日期
            </text>
            <text :class="styles['row-value']">
              {{ endDate || '请选择' }}
            </text>
          </view>
        </picker>

        <picker v-else mode="time" :value="startTime" @change="onTimeChange">
          <view :class="styles.row">
            <text :class="styles['row-label']">
              开始时间
            </text>
            <text :class="styles['row-value']">
              {{ startTime }}
            </text>
          </view>
        </picker>

        <view :class="styles.row">
          <text :class="styles['row-label']">
            时长
          </text>
          <text :class="[styles['row-value'], styles['row-value--strong']]">
            {{ durationText }}
          </text>
        </view>

        <view :class="[styles.row, styles['row--last']]">
          <text :class="styles['row-label']">
            {{ type === 'leave' ? '请假类型' : '加班时长' }}
          </text>
          <view :class="styles.chips">
            <template v-if="type === 'leave'">
              <text
                v-for="kind in ['事假', '病假', '年假']" :key="kind"
                :class="[styles.chip, leaveKind === kind ? styles['chip--active'] : '']"
                @click="leaveKind = kind"
              >
                {{ kind }}
              </text>
            </template>
            <template v-else>
              <text
                v-for="h in [1, 2, 3, 4]" :key="h"
                :class="[styles.chip, hours === h ? styles['chip--active'] : '']"
                @click="hours = h"
              >
                {{ h }}h
              </text>
            </template>
          </view>
        </view>
      </view>

      <view :class="styles.card">
        <view :class="styles['card-title']">
          申请事由
        </view>
        <textarea
          v-model="reason"
          :class="styles.textarea"
          :maxlength="200"
          placeholder="请简要说明申请原因，便于审批人了解"
          :placeholder-class="styles.placeholder"
        />
        <view :class="styles.counter">
          {{ reason.length }}/200
        </view>
      </view>

      <view :class="styles.tips">
        · 提交后进入直属主管审批，可在「我的申请」中查看进度
      </view>

      <view :class="styles['submit-wrap']">
        <view :class="[styles.submit, canSubmit ? '' : styles['submit--disabled']]" @click="submit">
          {{ submitting ? '提交中…' : '提交申请' }}
        </view>
      </view>
    </view>
  </AuthLayout>
</template>
