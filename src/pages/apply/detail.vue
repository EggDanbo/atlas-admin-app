<script setup lang="ts">
import Taro, { useDidShow } from '@tarojs/taro'
import { computed, ref } from 'vue'
import { AuthLayout } from '@/components/AuthLayout'
import { PageNavbar } from '@/components/PageNavbar'
import { showToast } from '@/components/SpToast'
import { apply as workflowApply } from '@/service/api/workflow'
import { safeBack } from '@/utils/auth'
import { getCurrentPageInfo } from '@/utils/router'
import styles from './detail.module.scss'

const id = getCurrentPageInfo().params.id || ''

const detail = ref<Recordable | null>(null)
const loading = ref(true)

async function load() {
  if (!id) {
    loading.value = false
    return
  }
  loading.value = true
  const { isSuccess, data } = await workflowApply.get(id)
  if (isSuccess && data)
    detail.value = data
  loading.value = false
}

useDidShow(() => void load())

const steps = computed<Recordable[]>(() => detail.value?.steps || [])

const canRevoke = computed(() => !!detail.value && ['待审批', '审批中'].includes(detail.value.status))

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

const infoRows = computed(() => {
  const d = detail.value
  if (!d)
    return []
  return [
    { label: '单据类型', value: d.biz_title },
    { label: '单据编号', value: d.biz_no },
    { label: '发起人', value: d.user_name },
    { label: '所属部门', value: d.team_name },
    { label: '发起时间', value: d.ctime },
    { label: '最近更新', value: d.utime || '—' },
  ]
})

function handleRevoke() {
  Taro.showModal({
    title: '撤回申请',
    content: '撤回后该单据不再流转，如需继续办理要重新发起。',
    confirmText: '确认撤回',
    confirmColor: '#dc2626',
  }).then(async (res) => {
    if (!res.confirm)
      return
    const { isSuccess, message } = await workflowApply.revoke(id)
    showToast(isSuccess ? '已撤回' : (message || '撤回失败'))
    if (isSuccess) {
      await load()
      setTimeout(safeBack, 800)
    }
  })
}
</script>

<template>
  <AuthLayout>
    <view class="sp-page" :class="styles.page">
      <PageNavbar title="申请详情" />

      <view v-if="loading" :class="styles.tip">
        加载中…
      </view>

      <SpEmpty v-else-if="!detail" description="单据不存在或已被删除" />

      <template v-else>
        <!-- 概览 -->
        <view :class="styles.hero">
          <view :class="styles['hero-top']">
            <text :class="styles['hero-cat']">
              {{ detail.biz_category }}
            </text>
            <text :class="[styles['hero-status'], styles[`hero-status--${tone(detail.status)}`]]">
              {{ detail.status }}
            </text>
          </view>
          <text :class="styles['hero-title']">
            {{ detail.biz_title }}
          </text>
          <text :class="styles['hero-no']">
            {{ detail.biz_no }}
          </text>
        </view>

        <!-- 基本信息 -->
        <SpCard title="基本信息" variant="detail">
          <SpKvRow
            v-for="row in infoRows"
            :key="row.label"
            :label="row.label"
            :value="row.value"
          />
        </SpCard>

        <!-- 审批流程 -->
        <SpCard title="审批流程" :hint="detail.status" variant="detail">
          <view
            v-for="(step, index) in steps"
            :key="step.name"
            :class="[styles.step, index === steps.length - 1 && styles['step--last']]"
          >
            <view :class="styles['step-rail']">
              <view :class="[styles.dot, styles[`dot--${step.state}`]]" />
              <view v-if="index !== steps.length - 1" :class="styles.line" />
            </view>
            <view :class="styles['step-body']">
              <view :class="styles['step-head']">
                <text :class="[styles['step-name'], step.state === 'pending' && styles['step-name--muted']]">
                  {{ step.name }}
                </text>
                <text :class="styles['step-time']">
                  {{ step.time }}
                </text>
              </view>
              <text v-if="step.handler" :class="styles['step-handler']">
                {{ step.handler }}
              </text>
              <text v-if="step.remark" :class="[styles['step-remark'], step.state === 'error' && styles['step-remark--error']]">
                {{ step.remark }}
              </text>
            </view>
          </view>
        </SpCard>

        <!-- 撤回 -->
        <view v-if="canRevoke" :class="styles.actions">
          <view :class="styles.revoke" @click="handleRevoke">
            撤回申请
          </view>
          <text :class="styles['actions-hint']">
            仅「待审批 / 审批中」的单据可撤回
          </text>
        </view>

        <view class="sp-footnote">
          <text class="sp-footnote-text">
            数据由本地引擎生成 · 仅用于演示
          </text>
        </view>
      </template>
    </view>
  </AuthLayout>
</template>
