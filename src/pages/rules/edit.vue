<script setup lang="ts">
import type { AttendanceMode, RosterAssignment, ShiftSlot } from '@/service/api/rules'
import { useLoad } from '@tarojs/taro'
import { computed, ref } from 'vue'
import { AuthLayout } from '@/components/AuthLayout'
import { PageNavbar } from '@/components/PageNavbar'
import { showToast } from '@/components/SpToast'
import rulesApi from '@/service/api/rules'
import { addDays, DEFAULT_WORK_DAYS, defaultRestRange, findFixedShiftClash, findRosterClash, fixedShiftDays, isCrossShift, isRestWithinShift, MODE_OPTIONS, monthDates, monthLabelOf, REST_SHIFT, rosterCrossOver, shiftsOverlap, shiftWorkMinutes, startOfWeek, weekDates, WEEKDAY_OPTIONS, weekdayFull, workDaysText } from '@/utils/attendance'
import { safeBack } from '@/utils/auth'
import { getCurrentPageInfo } from '@/utils/router'
import RosterTable from './components/RosterTable.vue'
import styles from './edit.module.scss'

const id = getCurrentPageInfo().params.id || ''
const isEdit = computed(() => !!id)

const DEPTS = [
  '技术中心',
  '产品部',
  '设计部',
  '市场部',
  '销售部',
  '客户成功部',
  '财务部',
  '人力资源部',
  '行政部',
  '法务部',
  '供应链中心',
  '质量管理部',
]
const DEPT_MEMBERS: Record<string, string[]> = {
  技术中心: ['陈昊', '林悦', '周启', '苏雯'],
  产品部: ['赵一鸣', '钱多多', '孙可'],
  设计部: ['李沐', '吴桐'],
  市场部: ['郑楠', '冯悦'],
  销售部: ['陈锋', '许静', '邓超'],
  客户成功部: ['王琳', '李哲', '周舟', '陈默', '赵敏', '孙浩'],
  财务部: ['何静', '徐磊'],
  人力资源部: ['王倩', '郑凯'],
  行政部: ['刘敏', '杨帆'],
  法务部: ['沈川'],
  供应链中心: ['张伟', '刘洋', '王强', '李娜', '赵磊'],
  质量管理部: ['黄磊', '孙婷'],
}
const WAYS = ['GPS 定位', 'Wi-Fi', '人脸识别']
const RANGES = [100, 300, 500, 1000]
const MAKE_UPS = [0, 3, 5]
const FLEX_MINUTES = [15, 30, 60]
const FREE_TIMES = [2, 4]
const HANDOVERS = [0, 15, 30, 60]

const name = ref('')
const scope = ref<string[]>(['技术中心'])
const deptOpen = ref(false)
const mode = ref<AttendanceMode>('fixed')
const start = ref('09:00')
const end = ref('18:00')
const flex = ref(false)
const flexMinutes = ref(30)
const workDays = ref<number[]>([...DEFAULT_WORK_DAYS])
const workHours = ref(8)
const freeTimes = ref(2)
const latest = ref('21:00')
/** 固定班次：默认一个「标准班」，周一到周五 09:00-18:00 */
function createFixedShift(name = '标准班'): ShiftSlot {
  return {
    name,
    start: '09:00',
    end: '18:00',
    cross: false,
    rest: defaultRestRange('09:00', '18:00'),
    work_days: [...DEFAULT_WORK_DAYS],
  }
}

const shifts = ref<ShiftSlot[]>([createFixedShift()])
const members = ref<string[]>([])
const assignments = ref<RosterAssignment[]>([])
const handoverMinutes = ref(30)
const ways = ref<string[]>(['GPS 定位'])
const gpsRange = ref(300)
const makeUp = ref(3)
const saving = ref(false)

/* 排班表：按人 × 日期 */
const cursor = ref(new Date())
const viewMode = ref<'week' | 'month'>('week')
const selectedCells = ref<string[]>([])
const pendingShifts = ref<string[]>([])
const memberOpen = ref(false)

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

const crossOver = computed(() => rosterCrossOver(assignments.value, shifts.value))

const candidateMembers = computed(() => {
  // 已选人员置顶，方便快速取消
  const list: string[] = [...members.value]
  Object.values(DEPT_MEMBERS).forEach((group) => {
    group.forEach((member) => {
      if (!list.includes(member))
        list.push(member)
    })
  })
  return list
})

function shiftRange(delta: number) {
  if (viewMode.value === 'week')
    cursor.value = addDays(cursor.value, delta * 7)
  else
    cursor.value = new Date(cursor.value.getFullYear(), cursor.value.getMonth() + delta, 1)
}

function clearSelection() {
  selectedCells.value = []
  pendingShifts.value = []
}

function togglePick(name: string) {
  if (name === REST_SHIFT) {
    pendingShifts.value = pendingShifts.value.includes(REST_SHIFT) ? [] : [REST_SHIFT]
    return
  }
  const picked = pendingShifts.value.filter(item => item !== REST_SHIFT)
  pendingShifts.value = picked.includes(name)
    ? picked.filter(item => item !== name)
    : [...picked, name]
}

function toggleMember(member: string) {
  if (members.value.includes(member)) {
    members.value = members.value.filter(item => item !== member)
    assignments.value = assignments.value.filter(row => row.member !== member)
    selectedCells.value = selectedCells.value.filter(key => !key.startsWith(`${member}|`))
    return
  }
  members.value = [...members.value, member]
}

function toggleCell(member: string, date: string) {
  if (!shifts.value.length) {
    showToast('请先添加班次，再排班')
    return
  }
  const key = `${member}|${date}`
  selectedCells.value = selectedCells.value.includes(key)
    ? selectedCells.value.filter(item => item !== key)
    : [...selectedCells.value, key]
}

/** 新建规则时按所选部门带出排班人员 */
function syncMembersFromScope() {
  const list: string[] = []
  scope.value.forEach((dept) => {
    (DEPT_MEMBERS[dept] || []).forEach((member) => {
      if (!list.includes(member))
        list.push(member)
    })
  })
  members.value = list
}

const scopeText = computed(() => {
  if (!scope.value.length)
    return '请选择适用部门'
  return scope.value.join('、')
})

useLoad(() => {
  if (id)
    void loadRule()
})

async function loadRule() {
  const { isSuccess, data } = await rulesApi.get(id)
  if (!isSuccess || !data)
    return
  name.value = data.name
  mode.value = data.mode || 'fixed'
  scope.value = data.scope.split(' / ')
  start.value = data.start
  end.value = data.end
  flex.value = data.flex
  flexMinutes.value = data.flex_minutes || 30
  workDays.value = data.work_days?.length ? [...data.work_days] : [...DEFAULT_WORK_DAYS]
  workHours.value = data.work_hours || 8
  freeTimes.value = data.free_times || 2
  latest.value = data.latest || '21:00'
  if (data.shifts?.length) {
    shifts.value = data.shifts.map(item => ({ ...item, work_days: [...(item.work_days || [])] }))
  }
  else if ((data.mode || 'fixed') === 'fixed') {
    // 兼容只存了单一上下班时间的旧数据
    shifts.value = [{
      name: '标准班',
      start: data.start,
      end: data.end,
      cross: isCrossShift({ start: data.start, end: data.end }),
      rest: data.rest,
      work_days: data.work_days?.length ? [...data.work_days] : [...DEFAULT_WORK_DAYS],
    }]
  }
  members.value = [...(data.members || [])]
  assignments.value = (data.assignments || []).map(item => ({ ...item }))
  handoverMinutes.value = data.handover_minutes ?? 30
  ways.value = [...data.ways]
  gpsRange.value = data.gps_range
  makeUp.value = data.make_up
}

function selectMode(next: AttendanceMode) {
  if (next === mode.value)
    return
  mode.value = next
  // 固定班次的班次要带工作日，排班制是纯班次库，切换时重置避免脏数据
  if (next === 'shift') {
    if (!isEdit.value)
      shifts.value = []
    if (!members.value.length && !isEdit.value)
      syncMembersFromScope()
    return
  }
  if (next === 'fixed' && !shifts.value.length)
    shifts.value = [createFixedShift()]
}

function toggleDept(dept: string) {
  scope.value = scope.value.includes(dept)
    ? scope.value.filter(item => item !== dept)
    : [...scope.value, dept]
  if (!isEdit.value)
    syncMembersFromScope()
}

function toggleWorkDay(day: number) {
  workDays.value = workDays.value.includes(day)
    ? workDays.value.filter(item => item !== day)
    : [...workDays.value, day].sort((a, b) => a - b)
}

/** 工时输入：允许小数与空值，失焦时再归一化 */
function onWorkHoursInput(e: any) {
  const raw = String(e.detail?.value ?? '').replace(/[^\d.]/g, '')
  if (raw === '')
    return
  const next = Number(raw)
  if (Number.isNaN(next))
    return
  workHours.value = Math.min(Math.max(next, 0.5), 24)
}

function stepHours(delta: number) {
  const next = Math.round((workHours.value + delta) * 10) / 10
  workHours.value = Math.min(Math.max(next, 0.5), 24)
}

function normalizeWorkHours() {
  const next = Math.round(Number(workHours.value || 0) * 10) / 10
  workHours.value = Math.min(Math.max(next || 8, 0.5), 24)
}

function toggleWay(way: string) {
  if (ways.value.includes(way)) {
    if (ways.value.length === 1) {
      showToast('至少保留一种打卡方式')
      return
    }
    ways.value = ways.value.filter(item => item !== way)
    return
  }
  ways.value = [...ways.value, way]
}

function onLatestChange(e: any) {
  const value = e.detail?.value as string
  if (value)
    latest.value = value
}

/* ==================== 班次库 ==================== */

function addHours(time: string, hours: number) {
  const [h, m] = time.split(':').map(Number)
  const total = (h * 60 + m + hours * 60) % (24 * 60)
  return `${String(Math.floor(total / 60)).padStart(2, '0')}:${String(total % 60).padStart(2, '0')}`
}

function updateSlot(index: number, patch: Partial<ShiftSlot>) {
  shifts.value = shifts.value.map((item, i) => (i === index ? { ...item, ...patch } : item))
}

function onSlotTime(index: number, field: 'start' | 'end', e: any) {
  const value = e.detail?.value as string
  if (!value)
    return
  const current = shifts.value[index]
  const next = { ...current, [field]: value }

  // 选上班时间后，若下班时间不晚于上班时间，默认按上班时间 +3 小时
  if (field === 'start' && next.end <= value)
    next.end = addHours(value, 3)
  next.cross = isCrossShift(next)
  // 休息时段跟着上下班重新取中间 1 小时
  if (restParts(current).enabled)
    next.rest = defaultRestRange(next.start, next.end)
  updateSlot(index, next)
}

function restParts(slot: ShiftSlot) {
  if (!slot.rest || slot.rest === '不休息' || !slot.rest.includes('-'))
    return { enabled: false, start: '12:00', end: '13:00' }
  const [start, end] = slot.rest.split('-')
  return { enabled: true, start, end }
}

function toggleSlotRest(index: number) {
  const slot = shifts.value[index]
  if (restParts(slot).enabled) {
    updateSlot(index, { rest: '不休息' })
    return
  }
  // 打开前先校验上下班时间，再按中间 1 小时生成
  if (slot.start === slot.end) {
    showToast('上下班时间相同，请先调整班次时间')
    return
  }
  const next = defaultRestRange(slot.start, slot.end)
  if (next === '不休息') {
    showToast('班次时长不足 1 小时，无法设置休息')
    return
  }
  updateSlot(index, { rest: next })
}

function onSlotRest(index: number, field: 'start' | 'end', e: any) {
  const value = e.detail?.value as string
  if (!value)
    return
  const slot = shifts.value[index]
  const parts = restParts(slot)
  const next = { ...parts, [field]: value }
  const nextRest = `${next.start}-${next.end}`
  if (!isRestWithinShift(slot, nextRest)) {
    showToast('休息时间需要在上下班之间')
    return
  }
  updateSlot(index, { rest: nextRest })
}

/** 该工作日是否已被其它班次占用，返回占用方名称 */
function dayLockedBy(day: number, index: number) {
  const self = shifts.value[index]
  if ((self?.work_days || []).includes(day))
    return ''
  const other = shifts.value.find((item, i) => i !== index && (item.work_days || []).includes(day))
  return other ? (other.name.trim() || '其它班次') : ''
}

/** 7 天是否已被现有班次排满（排满后不能再新增班次） */
const allDaysUsed = computed(() => fixedShiftDays(shifts.value).length >= 7)

function toggleSlotDay(index: number, day: number) {
  const locked = dayLockedBy(day, index)
  if (locked) {
    showToast(`${weekdayFull(day)}已被「${locked}」占用`)
    return
  }
  const slot = shifts.value[index]
  const days = (slot.work_days || []).includes(day)
    ? (slot.work_days || []).filter(item => item !== day)
    : [...(slot.work_days || []), day].sort((a, b) => a - b)
  updateSlot(index, { work_days: days })
}

function onSlotName(index: number, e: any) {
  const next = String(e.detail?.value ?? '')
  const prev = shifts.value[index].name
  if (prev === next)
    return
  shifts.value = shifts.value.map((item, i) => (i === index ? { ...item, name: next } : item))
  // 改名同步已排班记录，避免引用丢失
  if (prev)
    assignments.value = assignments.value.map(row => (row.shift === prev ? { ...row, shift: next } : row))
}

function nextShiftName() {
  let index = shifts.value.length + 1
  while (shifts.value.some(item => item.name === `班次${index}`))
    index += 1
  return `班次${index}`
}

function addShift() {
  if (mode.value === 'fixed' && allDaysUsed.value) {
    showToast('7 天都已排上班次，无法继续添加班次')
    return
  }
  if (shifts.value.length >= 6) {
    showToast('最多添加 6 个班次')
    return
  }
  // 固定班次新增时默认勾选还没被占用的工作日，避免新班次一片空白
  const used = fixedShiftDays(shifts.value)
  const remaining = [1, 2, 3, 4, 5, 6, 7].filter(day => !used.includes(day))
  const preset = remaining.length === 7 ? [...DEFAULT_WORK_DAYS] : remaining

  shifts.value = [
    ...shifts.value,
    {
      name: nextShiftName(),
      start: '09:00',
      end: '18:00',
      cross: false,
      rest: defaultRestRange('09:00', '18:00'),
      work_days: mode.value === 'fixed' ? preset : [],
    },
  ]
}

function removeShift(index: number) {
  const target = shifts.value[index]
  if (shifts.value.length === 1) {
    showToast('至少保留一个班次')
    return
  }
  shifts.value = shifts.value.filter((_, i) => i !== index)
  if (target?.name) {
    assignments.value = assignments.value.filter(row => row.shift !== target.name)
  }
}

/* ==================== 按人排班 ==================== */

function commitShift() {
  if (!shifts.value.length) {
    showToast('请先添加班次，再排班')
    return
  }
  if (!selectedCells.value.length) {
    showToast('请先选择要排班的人员和日期')
    return
  }
  if (!pendingShifts.value.length) {
    showToast('请先选择班次')
    return
  }

  const restMode = pendingShifts.value.includes(REST_SHIFT)
  const picked = restMode
    ? []
    : pendingShifts.value
        .map(name => shifts.value.find(item => item.name === name))
        .filter((item): item is ShiftSlot => !!item)

  // 所选班次之间时间重叠：提示并取消这次选择
  if (picked.length > 1) {
    for (let i = 0; i < picked.length; i += 1) {
      for (let j = i + 1; j < picked.length; j += 1) {
        if (shiftsOverlap(picked[i], picked[j])) {
          showToast(`${picked[i].name}与${picked[j].name}时间重叠，请重新选择`)
          pendingShifts.value = []
          return
        }
      }
    }
  }

  const conflicts: { member: string, date: string, shift: string, reason: 'clash' | 'daily', clash?: ReturnType<typeof findRosterClash> }[] = []
  let next = [...assignments.value]

  selectedCells.value.forEach((key) => {
    const [member, date] = key.split('|')

    // 设为休息：清掉当天全部班次，只保留休息标记
    if (restMode) {
      next = next.filter(row => !(row.member === member && row.date === date))
      next.push({ member, date, shift: REST_SHIFT })
      return
    }

    picked.forEach((target) => {
      const sameDay = next.filter(row => row.member === member && row.date === date && row.shift)
      // 重复排同一个班次直接忽略
      if (sameDay.some(row => row.shift === target.name))
        return
      // 加班次前去掉休息占位
      next = next.filter(row => !(row.member === member && row.date === date && row.shift === REST_SHIFT))

      // 一天总工作时长（含跨天）不能超过 24 小时
      const dayMinutes = next
        .filter(row => row.member === member && row.date === date && row.shift && row.shift !== REST_SHIFT)
        .reduce((sum, row) => {
          const slot = shifts.value.find(item => item.name === row.shift)
          return sum + (slot ? shiftWorkMinutes(slot) : 0)
        }, 0)
      if (dayMinutes + shiftWorkMinutes(target) > 24 * 60) {
        conflicts.push({ member, date, shift: target.name, reason: 'daily' })
        return
      }

      const clash = findRosterClash(next, member, date, target, shifts.value, handoverMinutes.value)
      if (clash) {
        conflicts.push({ member, date, shift: target.name, reason: 'clash', clash })
        return
      }
      next.push({ member, date, shift: target.name })
    })
  })

  const shiftOrder = (name: string) => {
    const index = shifts.value.findIndex(item => item.name === name)
    return index < 0 ? shifts.value.length : index
  }
  assignments.value = next.sort((a, b) =>
    a.date.localeCompare(b.date)
    || members.value.indexOf(a.member) - members.value.indexOf(b.member)
    || shiftOrder(a.shift) - shiftOrder(b.shift),
  )

  // 成功不打扰，只有冲突才提示
  if (conflicts.length) {
    const first = conflicts[0]
    const day = Number(first.date.slice(8))
    let title = ''
    if (first.reason === 'daily') {
      title = `${first.member} ${day} 号已排满 24 小时，${first.shift}未排入`
    }
    else {
      const clash = first.clash
      if (clash) {
        const clashDay = Number(clash.date.slice(8))
        title = clash.date === first.date
          ? `${first.member} ${day} 号已排「${clash.shift}」，与${first.shift}时间重叠`
          : `${first.member} ${clashDay} 号「${clash.shift}」跨天占用到 ${day} 号，与${first.shift}冲突`
        if (handoverMinutes.value > 0)
          title += `，需间隔 ${handoverMinutes.value} 分钟`
      }
    }
    if (conflicts.length > 1)
      title += `（共 ${conflicts.length} 个被跳过）`
    showToast(title, { duration: 3200 })
  }
  selectedCells.value = []
  pendingShifts.value = []
}

/** 固定班次保存前校验：班次、工作日、工作日去重、跨班次时间冲突 */
function validateFixedShifts() {
  if (!shifts.value.length) {
    showToast('请先添加班次')
    return false
  }
  const names = shifts.value.map(item => item.name.trim())
  if (names.some(item => !item)) {
    showToast('请填写班次名称')
    return false
  }
  if (new Set(names).size !== names.length) {
    showToast('班次名称不能重复')
    return false
  }

  for (const slot of shifts.value) {
    if (slot.start === slot.end) {
      showToast(`「${slot.name.trim()}」上下班时间不能相同`)
      return false
    }
    if (!(slot.work_days || []).length) {
      showToast(`请为「${slot.name.trim()}」选择工作日`)
      return false
    }
  }

  // 工作日不能重复分配给两个班次
  const used = new Map<number, string>()
  for (const slot of shifts.value) {
    for (const day of slot.work_days || []) {
      const owner = used.get(day)
      if (owner) {
        showToast(`${weekdayFull(day)}同时属于「${owner}」和「${slot.name.trim()}」，工作日不能重复`)
        return false
      }
      used.set(day, slot.name.trim())
    }
  }

  // 前后班次时间冲突（含跨天占用次日）
  for (const slot of shifts.value) {
    const clash = findFixedShiftClash(shifts.value, slot)
    if (clash) {
      showToast(
        `「${slot.name.trim()}」${weekdayFull(clash.day)} ${slot.start}-${slot.end} 与「${clash.slot.name}」${weekdayFull(clash.otherDay)} 时间重叠`,
        { duration: 3200 },
      )
      return false
    }
  }
  return true
}

async function save() {
  if (saving.value)
    return
  if (!name.value.trim()) {
    showToast('请输入规则名称')
    return
  }
  if (!scope.value.length) {
    showToast('请选择适用部门')
    return
  }
  if (mode.value === 'free' && !workDays.value.length) {
    showToast('请至少选择一个工作日')
    return
  }
  if (mode.value === 'free' && (!workHours.value || workHours.value < 0.5)) {
    showToast('每日应出勤工时不能小于 0.5 小时')
    return
  }
  if (mode.value === 'fixed' && !validateFixedShifts())
    return
  if (mode.value === 'shift') {
    if (!shifts.value.length) {
      showToast('请先添加班次')
      return
    }
    const names = shifts.value.map(item => item.name.trim())
    if (names.some(item => !item)) {
      showToast('请填写班次名称')
      return
    }
    if (new Set(names).size !== names.length) {
      showToast('班次名称不能重复')
      return
    }
    if (!members.value.length) {
      showToast('请先选择排班人员')
      return
    }
    if (!assignments.value.length) {
      showToast('请先给人员排班')
      return
    }
  }

  const firstShift = shifts.value[0]
  saving.value = true
  const payload = {
    id: id || undefined,
    name: name.value.trim(),
    mode: mode.value,
    scope: scope.value.join(' / '),
    // 固定班次的规则级字段取第一个班次，供列表 / 概览展示
    start: mode.value === 'fixed' && firstShift ? firstShift.start : start.value,
    end: mode.value === 'fixed' && firstShift ? firstShift.end : end.value,
    rest: mode.value === 'fixed' && firstShift ? firstShift.rest : '不休息',
    flex: flex.value,
    flex_minutes: flex.value ? flexMinutes.value : 0,
    work_days: mode.value === 'fixed'
      ? fixedShiftDays(shifts.value)
      : mode.value === 'free' ? [...workDays.value].sort((a, b) => a - b) : [],
    work_hours: workHours.value,
    free_times: freeTimes.value,
    latest: latest.value,
    shifts: mode.value === 'fixed' || mode.value === 'shift'
      ? shifts.value.map(item => ({
          ...item,
          name: item.name.trim(),
          cross: isCrossShift(item),
          work_days: mode.value === 'fixed' ? [...(item.work_days || [])] : [],
        }))
      : [],
    members: mode.value === 'shift' ? members.value : [],
    assignments: mode.value === 'shift' ? assignments.value : [],
    handover_minutes: mode.value === 'shift' ? handoverMinutes.value : 0,
    ways: ways.value,
    gps_range: gpsRange.value,
    make_up: makeUp.value,
  }
  const { isSuccess, message } = isEdit.value
    ? await rulesApi.update(payload)
    : await rulesApi.create(payload)
  saving.value = false

  showToast(isSuccess ? '保存成功' : (message || '保存失败'))
  if (isSuccess)
    setTimeout(safeBack, 600)
}
</script>

<template>
  <AuthLayout>
    <view class="sp-page" :class="styles.page">
      <PageNavbar :title="isEdit ? '修改规则' : '新建规则'" />

      <!-- 基本信息 -->
      <view :class="styles.card">
        <text :class="styles['card-title']">
          基本信息
        </text>
        <view :class="styles.row">
          <text :class="styles['row-label']">
            规则名称
          </text>
          <input
            v-model="name"
            :class="styles['row-input']"
            placeholder="如：总部固定班次"
            :placeholder-class="styles['row-placeholder']"
            maxlength="20"
          >
        </view>

        <view :class="styles['row--block']">
          <view :class="styles['field-head']">
            <text :class="styles['row-label']">
              适用部门
            </text>
            <text :class="styles['field-hint']">
              已选 {{ scope.length }} 个
            </text>
          </view>

          <view :class="[styles.select, deptOpen && styles['select--open']]" @click="deptOpen = !deptOpen">
            <text :class="[styles['select-value'], !scope.length && styles['select-placeholder']]">
              {{ scopeText }}
            </text>
            <text :class="[styles['select-arrow'], deptOpen && styles['select-arrow--up']]">
              ⌄
            </text>
          </view>

          <view v-if="deptOpen" :class="styles['dept-panel']">
            <view :class="styles['dept-grid']">
              <view
                v-for="dept in DEPTS"
                :key="dept"
                :class="[styles['dept-option'], scope.includes(dept) && styles['dept-option--on']]"
                @click="toggleDept(dept)"
              >
                <text :class="styles['dept-name']">
                  {{ dept }}
                </text>
                <text v-if="scope.includes(dept)" :class="styles['dept-check']">
                  ✓
                </text>
              </view>
            </view>
            <view :class="styles['dept-actions']">
              <text :class="styles['dept-action']" @click="scope = [...DEPTS]">
                全选
              </text>
              <text :class="styles['dept-action']" @click="scope = []">
                清空
              </text>
              <text :class="[styles['dept-action'], styles['dept-action--primary']]" @click="deptOpen = false">
                完成
              </text>
            </view>
          </view>
        </view>
      </view>

      <!-- 考勤模式 -->
      <view :class="styles.card">
        <text :class="styles['card-title']">
          考勤模式
        </text>

        <view
          v-for="item in MODE_OPTIONS"
          :key="item.value"
          :class="[styles.mode, mode === item.value && styles['mode--active']]"
          @click="selectMode(item.value)"
        >
          <view :class="styles['mode-main']">
            <view :class="styles['mode-head']">
              <text :class="[styles['mode-name'], mode === item.value && styles['mode-name--active']]">
                {{ item.label }}
              </text>
              <text :class="[styles['mode-badge'], styles[`mode-badge--${item.value}`]]">
                {{ item.value === 'fixed' ? '按点打卡' : item.value === 'free' ? '按工时' : '按排班' }}
              </text>
            </view>
            <text :class="styles['mode-desc']">
              {{ item.desc }}
            </text>
          </view>
          <view :class="[styles.radio, mode === item.value && styles['radio--on']]" />
        </view>
      </view>

      <!-- 班次设置：固定班次（多班次 + 各选工作日）/ 排班制（班次库） -->
      <view v-if="mode !== 'free'" :class="styles.card">
        <view :class="styles['card-head']">
          <text :class="styles['card-title']">
            班次设置
          </text>
          <text :class="styles['card-hint']">
            {{ shifts.length }} 个班次
          </text>
        </view>

        <view v-if="!shifts.length" :class="styles['slot-empty']">
          {{ mode === 'fixed' ? '还没有班次，先添加班次，再给每个班次勾选工作日' : '还没有班次，先添加班次，再到日历里按日期排班' }}
        </view>

        <view v-for="(slot, index) in shifts" :key="index" :class="styles['shift-slot']">
          <view :class="styles['slot-head']">
            <input
              :value="slot.name"
              :class="styles['slot-name']"
              placeholder="班次名称"
              :placeholder-class="styles['row-placeholder']"
              maxlength="8"
              @input="onSlotName(index, $event)"
            >
            <view :class="styles['slot-ops']">
              <text :class="[styles['cross-chip'], isCrossShift(slot) && styles['cross-chip--on']]">
                {{ isCrossShift(slot) ? '跨天' : '当日' }}
              </text>
              <text :class="styles['slot-remove']" @click="removeShift(index)">
                ×
              </text>
            </view>
          </view>

          <!-- 固定班次：每个班次单独选工作日 -->
          <view v-if="mode === 'fixed'" :class="styles['slot-days-block']">
            <view :class="styles['slot-caption']">
              <text :class="styles['slot-label']">
                工作日
              </text>
              <text :class="styles['slot-caption-hint']">
                {{ workDaysText(slot.work_days) }}
              </text>
            </view>
            <view :class="styles['slot-days']">
              <text
                v-for="day in WEEKDAY_OPTIONS"
                :key="day.value"
                :class="[
                  styles['slot-day'],
                  (slot.work_days || []).includes(day.value) && styles['slot-day--on'],
                  !!dayLockedBy(day.value, index) && styles['slot-day--locked'],
                ]"
                @click="toggleSlotDay(index, day.value)"
              >
                {{ day.label }}
              </text>
            </view>
          </view>

          <view :class="styles['slot-times']">
            <text :class="styles['slot-label']">
              时间
            </text>
            <picker mode="time" :value="slot.start" @change="onSlotTime(index, 'start', $event)">
              <view :class="styles['slot-time']">
                {{ slot.start }}
              </view>
            </picker>
            <text :class="styles['slot-sep']">
              →
            </text>
            <picker mode="time" :value="slot.end" @change="onSlotTime(index, 'end', $event)">
              <view :class="styles['slot-time']">
                {{ slot.end }}
              </view>
            </picker>
          </view>

          <view :class="styles['slot-rest']">
            <text :class="styles['slot-rest-label']">
              休息
            </text>
            <picker
              mode="time"
              :value="restParts(slot).start"
              :start="isCrossShift(slot) ? '00:00' : slot.start"
              :end="isCrossShift(slot) ? '23:59' : slot.end"
              @change="onSlotRest(index, 'start', $event)"
            >
              <view :class="[styles['slot-rest-time'], !restParts(slot).enabled && styles['slot-time--off']]">
                {{ restParts(slot).start }}
              </view>
            </picker>
            <text :class="styles['slot-sep']">
              →
            </text>
            <picker
              mode="time"
              :value="restParts(slot).end"
              :start="isCrossShift(slot) ? '00:00' : slot.start"
              :end="isCrossShift(slot) ? '23:59' : slot.end"
              @change="onSlotRest(index, 'end', $event)"
            >
              <view :class="[styles['slot-rest-time'], !restParts(slot).enabled && styles['slot-time--off']]">
                {{ restParts(slot).end }}
              </view>
            </picker>
            <view
              :class="[styles.switch, styles['slot-rest-switch'], restParts(slot).enabled && styles['switch--on']]"
              @click="toggleSlotRest(index)"
            >
              <view :class="styles['switch-dot']" />
            </view>
          </view>
        </view>

        <view
          :class="[styles['add-shift'], mode === 'fixed' && allDaysUsed && styles['add-shift--off']]"
          @click="addShift"
        >
          {{ mode === 'fixed' && allDaysUsed ? '7 天已排满，无法新增班次' : '+ 添加班次' }}
        </view>

        <!-- 固定班次：弹性打卡（规则级） -->
        <template v-if="mode === 'fixed'">
          <view :class="styles['slot-divider']" />
          <view :class="styles.row">
            <view :class="styles['row-main']">
              <text :class="styles['row-label']">
                弹性打卡
              </text>
              <text :class="styles['row-hint']">
                允许在上下班时间前后一定区间内打卡
              </text>
            </view>
            <view :class="[styles.switch, flex && styles['switch--on']]" @click="flex = !flex">
              <view :class="styles['switch-dot']" />
            </view>
          </view>

          <view v-if="flex" :class="styles['row--block']">
            <text :class="styles['row-label']">
              弹性区间
            </text>
            <view :class="styles.chips">
              <text
                v-for="minute in FLEX_MINUTES"
                :key="minute"
                :class="[styles.chip, flexMinutes === minute && styles['chip--active']]"
                @click="flexMinutes = minute"
              >
                {{ minute }} 分钟
              </text>
            </view>
          </view>
        </template>

        <!-- 排班制：最小交接间隔 -->
        <view v-if="mode === 'shift'" :class="styles['row--block']">
          <text :class="styles['row-label']">
            最小交接间隔
          </text>
          <text :class="styles['row-hint']">
            相邻班次至少留出的间隔，避免夜班与次日班次无缝衔接
          </text>
          <view :class="styles.chips">
            <text
              v-for="minute in HANDOVERS"
              :key="minute"
              :class="[styles.chip, handoverMinutes === minute && styles['chip--active']]"
              @click="handoverMinutes = minute"
            >
              {{ minute }} 分钟
            </text>
          </view>
        </view>
      </view>

      <!-- 自由打卡 -->
      <view v-if="mode === 'free'" :class="styles.card">
        <text :class="styles['card-title']">
          自由打卡设置
        </text>

        <view :class="styles['row--block']">
          <view :class="styles['field-head']">
            <text :class="styles['row-label']">
              每日应出勤工时
            </text>
            <text :class="styles['field-hint']">
              0.5 - 24 小时
            </text>
          </view>
          <text :class="styles['row-hint']">
            当日累计工时达标即记为正常出勤，不判定迟到早退
          </text>
          <view :class="styles.stepper">
            <view :class="styles['stepper-btn']" @click="stepHours(-0.5)">
              −
            </view>
            <view :class="styles['stepper-value']">
              <input
                type="digit"
                :value="String(workHours)"
                :class="styles['stepper-input']"
                @input="onWorkHoursInput"
                @blur="normalizeWorkHours"
              >
              <text :class="styles['stepper-unit']">
                小时
              </text>
            </view>
            <view :class="styles['stepper-btn']" @click="stepHours(0.5)">
              +
            </view>
          </view>
          <text :class="styles['row-hint']">
            支持自定义，例如 7.5 小时、11 小时，按 0.5 小时步进
          </text>
        </view>

        <view :class="styles['row--block']">
          <text :class="styles['row-label']">
            每日打卡次数
          </text>
          <view :class="styles.chips">
            <text
              v-for="times in FREE_TIMES"
              :key="times"
              :class="[styles.chip, freeTimes === times && styles['chip--active']]"
              @click="freeTimes = times"
            >
              {{ times }} 次
            </text>
          </view>
        </view>

        <picker mode="time" :value="latest" @change="onLatestChange">
          <view :class="styles.row">
            <text :class="styles['row-label']">
              最晚下班打卡
            </text>
            <text :class="styles['row-value']">
              {{ latest }}
            </text>
          </view>
        </picker>
      </view>

      <!-- 工作日（自由打卡） -->
      <view v-if="mode === 'free'" :class="styles.card">
        <view :class="styles['card-head']">
          <text :class="styles['card-title']">
            工作日
          </text>
          <text :class="styles['card-hint']">
            {{ workDaysText(workDays) }}
          </text>
        </view>

        <view :class="styles.weekdays">
          <view
            v-for="day in WEEKDAY_OPTIONS"
            :key="day.value"
            :class="[styles.weekday, workDays.includes(day.value) && styles['weekday--on']]"
            @click="toggleWorkDay(day.value)"
          >
            {{ day.label }}
          </view>
        </view>

        <view :class="styles['weekday-actions']">
          <text :class="styles['weekday-action']" @click="workDays = [1, 2, 3, 4, 5]">
            周一至周五
          </text>
          <text :class="styles['weekday-action']" @click="workDays = [1, 2, 3, 4, 5, 6, 7]">
            每天
          </text>
          <text :class="styles['weekday-action']" @click="workDays = []">
            清空
          </text>
        </view>

        <text :class="styles['row-hint']">
          仅所选工作日需要打卡，其余日期按休息处理；跨天班次按上班当天算
        </text>
      </view>

      <!-- 排班表：按人排班 -->
      <view v-if="mode === 'shift'" :class="styles.card">
        <view :class="styles['card-head']">
          <text :class="styles['card-title']">
            排班表
          </text>
          <view :class="styles['member-entry']" @click="memberOpen = !memberOpen">
            <text :class="styles['card-hint']">
              {{ members.length }} 人 · {{ assignments.length }} 人次
            </text>
            <text :class="[styles['member-arrow'], memberOpen && styles['member-arrow--up']]">
              ⌄
            </text>
          </view>
        </view>

        <view v-if="memberOpen" :class="styles['member-panel']">
          <scroll-view scroll-y :class="styles['member-scroll']">
            <view :class="styles['member-grid']">
              <view
                v-for="member in candidateMembers"
                :key="member"
                :class="[styles['member-option'], members.includes(member) && styles['member-option--on']]"
                @click="toggleMember(member)"
              >
                <text :class="styles['member-name']">
                  {{ member }}
                </text>
                <text v-if="members.includes(member)" :class="styles['member-check']">
                  ✓
                </text>
              </view>
            </view>
          </scroll-view>
          <text :class="styles['member-tip']">
            勾选参与排班的人员，取消会同时清掉 TA 的排班
          </text>
        </view>

        <view :class="styles['roster-nav']">
          <view :class="styles['cal-nav']">
            <view :class="styles['cal-arrow']" @click="shiftRange(-1)">
              ‹
            </view>
            <text :class="styles['cal-title']">
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

        <view v-if="!shifts.length" :class="styles['slot-empty']">
          先在「班次设置」里添加班次，再给人员排班
        </view>
        <view v-else-if="!members.length" :class="styles['slot-empty']">
          该规则还没有排班人员，请先选择适用部门
        </view>
        <template v-else>
          <RosterTable
            :members="members"
            :dates="dates"
            :assignments="assignments"
            :shifts="shifts"
            :selected="selectedCells"
            :cross-over="crossOver"
            editable
            @cell-click="toggleCell"
          />

          <view :class="styles['cal-actions']">
            <text :class="styles['cal-meta']">
              已选 {{ selectedCells.length }} 个单元格
            </text>
            <text v-if="selectedCells.length" :class="styles['cal-clear']" @click="clearSelection">
              清除选择
            </text>
          </view>
          <view :class="styles['cal-picks']">
            <text
              v-for="slot in shifts"
              :key="slot.name"
              :class="[styles['cal-pick'], pendingShifts.includes(slot.name) && styles['cal-pick--on']]"
              @click="togglePick(slot.name)"
            >
              {{ slot.name }}
            </text>
            <text
              :class="[styles['cal-pick'], styles['cal-pick--rest'], pendingShifts.includes(REST_SHIFT) && styles['cal-pick--on']]"
              @click="togglePick(REST_SHIFT)"
            >
              休息
            </text>
          </view>
          <view :class="styles['confirm-bar']">
            <text :class="styles['confirm-tip']">
              {{ pendingShifts.length ? `将 ${selectedCells.length || 0} 个单元格设为「${pendingShifts.join('、')}」` : '先选班次，再点确定' }}
            </text>
            <view
              :class="[styles.confirm, (!selectedCells.length || !pendingShifts.length) && styles['confirm--off']]"
              @click="commitShift"
            >
              确定
            </view>
          </view>
        </template>
      </view>

      <!-- 打卡要求 -->
      <view :class="styles.card">
        <text :class="styles['card-title']">
          打卡要求
        </text>

        <view :class="styles['row--block']">
          <text :class="styles['row-label']">
            打卡方式
          </text>
          <view :class="styles.chips">
            <text
              v-for="way in WAYS"
              :key="way"
              :class="[styles.chip, ways.includes(way) && styles['chip--active']]"
              @click="toggleWay(way)"
            >
              {{ way }}
            </text>
          </view>
        </view>

        <view :class="styles['row--block']">
          <text :class="styles['row-label']">
            打卡范围
          </text>
          <view :class="styles.chips">
            <text
              v-for="range in RANGES"
              :key="range"
              :class="[styles.chip, gpsRange === range && styles['chip--active']]"
              @click="gpsRange = range"
            >
              {{ range }} 米
            </text>
          </view>
        </view>
      </view>

      <!-- 其他 -->
      <view :class="styles.card">
        <text :class="styles['card-title']">
          补卡与异常
        </text>
        <view :class="styles['row--block']">
          <text :class="styles['row-label']">
            每月补卡次数
          </text>
          <view :class="styles.chips">
            <text
              v-for="count in MAKE_UPS"
              :key="count"
              :class="[styles.chip, makeUp === count && styles['chip--active']]"
              @click="makeUp = count"
            >
              {{ count }} 次
            </text>
          </view>
        </view>
      </view>

      <view :class="styles.spacer" />

      <!-- 保存 -->
      <view :class="styles['footer-bar']">
        <view :class="[styles.save, saving && styles['save--disabled']]" @click="save">
          {{ saving ? '保存中…' : '保存' }}
        </view>
      </view>
    </view>
  </AuthLayout>
</template>
