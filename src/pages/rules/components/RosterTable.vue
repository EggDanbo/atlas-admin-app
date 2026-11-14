<script setup lang="ts">
import type { RosterAssignment, ShiftSlot } from '@/service/api/rules'
import { computed } from 'vue'
import { dayOfMonth, REST_SHIFT, scheduleLabel, weekdayLabel } from '@/utils/attendance'
import styles from './RosterTable.module.scss'

const props = withDefaults(defineProps<{
  members: string[]
  dates: string[]
  assignments: RosterAssignment[]
  shifts: ShiftSlot[]
  selected?: string[]
  editable?: boolean
  /** 「人员|日期」→ 前一天的跨天班次，用于显示「续」 */
  crossOver?: Record<string, string>
}>(), {
  selected: () => [],
  editable: false,
  crossOver: () => ({}),
})

const emit = defineEmits<{ (e: 'cell-click', member: string, date: string): void }>()

const PALETTE = [
  { fg: '#b45309', bg: '#fff7ed' },
  { fg: '#1d4ed8', bg: '#eff6ff' },
  { fg: '#4f46e5', bg: '#eef2ff' },
  { fg: '#0d9488', bg: '#ecfdf5' },
  { fg: '#be185d', bg: '#fdf2f8' },
  { fg: '#7c3aed', bg: '#f5f3ff' },
]

const cellMap = computed(() => {
  const map: Record<string, string[]> = {}
  props.assignments.forEach((row) => {
    if (!row.shift)
      return
    const key = `${row.member}|${row.date}`
    map[key] = [...(map[key] || []), row.shift]
  })
  return map
})

function namesOf(member: string, date: string) {
  return cellMap.value[`${member}|${date}`] || []
}

function cellText(member: string, date: string) {
  const names = namesOf(member, date)
  if (names.length)
    return scheduleLabel(names)
  const cross = props.crossOver[`${member}|${date}`]
  return cross ? '续' : ''
}

function cellStyle(member: string, date: string) {
  const names = namesOf(member, date)
  if (!names.length)
    return { backgroundColor: '#fafbfd' }
  if (names[0] === REST_SHIFT)
    return { color: '#94a3b8', backgroundColor: '#f6f7fb' }
  const index = props.shifts.findIndex(item => item.name === names[0])
  const color = PALETTE[(index < 0 ? 0 : index) % PALETTE.length]
  return { color: color.fg, backgroundColor: color.bg }
}

function isSelected(member: string, date: string) {
  return props.selected.includes(`${member}|${date}`)
}

function isWeekend(date: string) {
  const label = weekdayLabel(date)
  return label === '六' || label === '日'
}

function cellId(member: string, date: string) {
  return `roster-${member}-${date}`
}

function onCell(member: string, date: string) {
  if (!props.editable)
    return
  emit('cell-click', member, date)
}
</script>

<template>
  <view :class="styles.roster">
    <view :class="styles.names">
      <view :class="[styles['names-cell'], styles['names-head']]">
        姓名
      </view>
      <view v-for="member in members" :key="member" :class="styles['names-cell']">
        {{ member }}
      </view>
    </view>

    <scroll-view scroll-x :class="styles.scroll">
      <view :class="styles.inner">
        <view :class="[styles.row, styles['row--head']]">
          <view v-for="date in dates" :key="date" :class="styles['day-cell']">
            <text :class="[styles['day-num'], isWeekend(date) && styles['day-num--weekend']]">
              {{ dayOfMonth(date) }}
            </text>
            <text :class="[styles['day-week'], isWeekend(date) && styles['day-week--weekend']]">
              {{ weekdayLabel(date) }}
            </text>
          </view>
        </view>

        <view v-for="member in members" :key="member" :class="styles.row">
          <view
            v-for="date in dates"
            :id="cellId(member, date)"
            :key="date"
            :class="[styles.cell, isSelected(member, date) && styles['cell--on']]"
            :style="cellStyle(member, date)"
            @click="onCell(member, date)"
          >
            <text :class="styles['cell-text']">
              {{ cellText(member, date) }}
            </text>
          </view>
        </view>
      </view>
    </scroll-view>
  </view>
</template>
