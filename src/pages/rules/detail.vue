<script setup lang="ts">
import type { AttendanceRule } from '@/service/api/rules'
import Taro, { useDidShow } from '@tarojs/taro'
import { computed, ref } from 'vue'
import { AuthLayout } from '@/components/AuthLayout'
import { PageNavbar } from '@/components/PageNavbar'
import { showToast } from '@/components/SpToast'
import rulesApi from '@/service/api/rules'
import { addDays, isCrossShift, modeDesc, modeLabel, monthDates, monthLabelOf, rosterCrossOver, rosterStats, shiftHours, shiftRestLabel, startOfWeek, weekDates, workDaysText } from '@/utils/attendance'
import { getCurrentPageInfo, routes } from '@/utils/router'
import RosterTable from './components/RosterTable.vue'
import styles from './detail.module.scss'

const id = getCurrentPageInfo().params.id || ''

const rule = ref<AttendanceRule | null>(null)
const loading = ref(true)
const acting = ref(false)

async function load() {
  if (!id) {
    loading.value = false
    return
  }
  const { isSuccess, data } = await rulesApi.get(id)
  loading.value = false
  if (isSuccess && data)
    rule.value = data
}

useDidShow(() => void load())

const freeRows = computed(() => {
  const r = rule.value
  if (!r)
    return []
  return [
    { label: '工作日', value: workDaysText(r.work_days), strong: false },
    { label: '每日应出勤', value: `${r.work_hours} 小时`, strong: true },
    { label: '每日打卡次数', value: `${r.free_times} 次`, strong: true },
    { label: '最晚下班打卡', value: `${r.latest} 前`, strong: false },
    { label: '迟到判定', value: '不做迟到判定，仅统计工时', strong: false },
  ]
})

const cursor = ref(new Date())
const viewMode = ref<'week' | 'month'>('week')

const dates = computed(() => viewMode.value === 'week'
  ? weekDates(startOfWeek(cursor.value))
  : monthDates(cursor.value.getFullYear(), cursor.value.getMonth()))

const rangeLabel = computed(() => {
  if (viewMode.value === 'month')
    return `${cursor.value.getFullYear()} 年 ${cursor.value.getMonth() + 1} 月`
  const list = dates.value
  const first = monthLabelOf(list[0])
  if (list[6].slice(5, 7) !== list[0].slice(5, 7))
    return `${first} - ${Number(list[6].slice(5, 7))} 月`
  return first
})

const weekStats = computed(() => rosterStats(rule.value?.assignments, dates.value))
const crossOver = computed(() => rosterCrossOver(rule.value?.assignments, rule.value?.shifts || []))

const handoverText = computed(() => {
  const minutes = rule.value?.handover_minutes || 0
  return minutes > 0 ? `${minutes} 分钟` : '不要求间隔'
})

function shiftRange(delta: number) {
  if (viewMode.value === 'week')
    cursor.value = addDays(cursor.value, delta * 7)
  else
    cursor.value = new Date(cursor.value.getFullYear(), cursor.value.getMonth() + delta, 1)
}

const basicRows = computed(() => {
  const r = rule.value
  if (!r)
    return []
  return [
    { label: '规则人数', value: `${r.member_count} 人` },
    { label: '打卡范围', value: r.mode === 'free' ? `不限制（${r.gps_range} 米内更精确）` : `${r.gps_range} 米` },
    { label: '办公地点', value: r.address },
    { label: '每月补卡', value: `${r.make_up} 次` },
  ]
})

function goEdit() {
  Taro.navigateTo({ url: `${routes.ruleEdit}?id=${id}` })
}

async function handleToggle() {
  if (!rule.value || acting.value)
    return
  const turningOff = rule.value.status === 1
  const { confirm } = await Taro.showModal({
    title: turningOff ? '停用规则' : '启用规则',
    content: turningOff
      ? '停用后该规则下的员工将无法按此班次打卡，确认停用？'
      : '启用后该规则立即对适用人员生效。',
    confirmText: turningOff ? '停用' : '启用',
    confirmColor: turningOff ? '#dc2626' : '#4f46e5',
  })
  if (!confirm)
    return

  acting.value = true
  const { isSuccess, message } = await rulesApi.toggle(id)
  acting.value = false
  showToast(isSuccess ? (turningOff ? '已停用' : '已启用') : (message || '操作失败'))
  if (isSuccess)
    await load()
}
</script>

<template>
  <AuthLayout>
    <view class="sp-page" :class="styles.page">
      <PageNavbar title="规则详情" />

      <view v-if="loading" :class="styles.tip">
        加载中…
      </view>

      <SpEmpty v-else-if="!rule" description="规则不存在或已被删除" />

      <template v-else>
        <!-- 概览 -->
        <view :class="styles.hero">
          <view :class="styles['hero-top']">
            <text :class="styles['hero-label']">
              考勤规则 · {{ modeLabel(rule.mode) }}
            </text>
            <text :class="[styles['hero-status'], rule.status === 1 ? styles['hero-status--on'] : styles['hero-status--off']]">
              {{ rule.status === 1 ? '启用中' : '已停用' }}
            </text>
          </view>
          <text :class="styles['hero-name']">
            {{ rule.name }}
          </text>
          <text :class="styles['hero-meta']">
            适用 {{ rule.scope }} · {{ rule.member_count }} 人
          </text>
          <text :class="styles['hero-desc']">
            {{ modeDesc(rule.mode) }}
          </text>
        </view>

        <!-- 固定班次 -->
        <SpCard
          v-if="rule.mode === 'fixed' || !rule.mode"
          title="班次设置"
          :hint="`${rule.shifts.length} 个班次`"
          variant="detail"
        >
          <view :class="styles.slots">
            <view v-for="slot in rule.shifts" :key="slot.name" :class="styles.slot">
              <view :class="styles['slot-main']">
                <view :class="styles['slot-title']">
                  <text :class="styles['slot-name']">
                    {{ slot.name }}
                  </text>
                  <text v-if="isCrossShift(slot)" :class="styles['slot-cross']">
                    次日
                  </text>
                </view>
                <text :class="styles['slot-time']">
                  {{ workDaysText(slot.work_days) }} · {{ slot.start }} - {{ slot.end }}
                </text>
                <text :class="styles['slot-time']">
                  休息 {{ shiftRestLabel(slot) }}
                </text>
              </view>
              <text :class="styles['slot-hours']">
                {{ shiftHours(slot) }}
              </text>
            </view>
          </view>

          <SpKvRow
            label="弹性打卡"
            :value="rule.flex ? `开启 · 前后 ${rule.flex_minutes} 分钟` : '关闭'"
          />
        </SpCard>

        <!-- 自由打卡 -->
        <SpCard
          v-else-if="rule.mode === 'free'"
          title="自由打卡设置"
          hint="不限定上下班时间"
          variant="detail"
        >
          <SpKvRow
            v-for="row in freeRows"
            :key="row.label"
            :label="row.label"
            :value="row.value"
            :strong="row.strong"
          />
        </SpCard>

        <!-- 排班制 -->
        <SpCard
          v-else
          title="排班设置"
          :hint="`共 ${rule.shifts.length} 个班次`"
          variant="detail"
        >
          <view :class="styles.slots">
            <view v-for="slot in rule.shifts" :key="slot.name" :class="styles.slot">
              <view :class="styles['slot-main']">
                <view :class="styles['slot-title']">
                  <text :class="styles['slot-name']">
                    {{ slot.name }}
                  </text>
                  <text v-if="isCrossShift(slot)" :class="styles['slot-cross']">
                    次日
                  </text>
                </view>
                <text :class="styles['slot-time']">
                  {{ slot.start }} - {{ slot.end }} · 休息 {{ shiftRestLabel(slot) }}
                </text>
              </view>
              <text :class="styles['slot-hours']">
                {{ shiftHours(slot) }}
              </text>
            </view>
          </view>

          <view :class="styles.divider" />

          <view :class="styles['cal-head']">
            <text :class="styles['cal-title']">
              排班表
            </text>
            <text :class="styles['cal-hint']">
              {{ rule.members.length }} 人 · {{ rule.assignments.length }} 人次
            </text>
          </view>

          <view :class="styles['roster-nav']">
            <view :class="styles['cal-nav']">
              <view :class="styles['cal-arrow']" @click="shiftRange(-1)">
                ‹
              </view>
              <text :class="styles['cal-month']">
                {{ rangeLabel }}
              </text>
              <view :class="styles['cal-arrow']" @click="shiftRange(1)">
                ›
              </view>
            </view>
            <view :class="styles['range-tabs']">
              <text
                :class="[styles['range-tab'], viewMode === 'week' && styles['range-tab--on']]"
                @click="viewMode = 'week'"
              >
                周
              </text>
              <text
                :class="[styles['range-tab'], viewMode === 'month' && styles['range-tab--on']]"
                @click="viewMode = 'month'"
              >
                月
              </text>
            </view>
          </view>

          <RosterTable
            :members="rule.members"
            :dates="dates"
            :assignments="rule.assignments"
            :shifts="rule.shifts"
            :cross-over="crossOver"
          />

          <view :class="styles['cal-summary']">
            <text :class="styles['cal-summary-text']">
              {{ viewMode === 'week' ? '本周' : '本月' }}已排 {{ weekStats.scheduled }} 人天 · 休息 {{ weekStats.rest }}
            </text>
            <text :class="styles['cal-summary-text']">
              交接间隔 {{ handoverText }}
            </text>
          </view>
        </SpCard>

        <!-- 打卡要求 -->
        <SpCard title="打卡要求" :hint="`${rule.ways.length} 种方式`" variant="detail">
          <view :class="styles.ways">
            <text v-for="way in rule.ways" :key="way" :class="styles.way">
              {{ way }}
            </text>
          </view>

          <SpKvRow
            v-for="row in basicRows"
            :key="row.label"
            :label="row.label"
            :value="row.value"
          />
        </SpCard>

        <!-- 说明 -->
        <view :class="styles.note">
          <text :class="styles['note-line']">
            · 规则对适用部门全员生效，员工可在打卡页看到对应班次
          </text>
          <text v-if="rule.mode === 'free'" :class="styles['note-line']">
            · 自由打卡不判定迟到早退，当日累计工时达标即记为正常出勤
          </text>
          <text v-else-if="rule.mode === 'shift'" :class="styles['note-line']">
            · 班次按人员逐日安排，员工可在打卡页查看当日班次
          </text>
          <text v-else :class="styles['note-line']">
            · 修改班次后立即生效，历史打卡记录不受影响
          </text>
          <text :class="styles['note-line']">
            · 最后更新 {{ rule.utime }} · 创建于 {{ rule.ctime }}
          </text>
        </view>

        <!-- 操作 -->
        <view :class="styles.actions">
          <view :class="[styles.btn, styles['btn--ghost'], acting && styles['btn--disabled']]" @click="handleToggle">
            {{ rule.status === 1 ? '停用规则' : '启用规则' }}
          </view>
          <view :class="[styles.btn, styles['btn--primary']]" @click="goEdit">
            修改规则
          </view>
        </view>
      </template>
    </view>
  </AuthLayout>
</template>
