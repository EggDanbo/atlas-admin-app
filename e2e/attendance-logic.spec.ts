import type { ShiftSlot } from '../src/service/api/rules'
import { expect, test } from '@playwright/test'
import { findFixedShiftClash, fixedShiftDays, workDaysText } from '../src/utils/attendance'

/** 造一个固定班次的班次对象 */
function slot(
  name: string,
  start: string,
  end: string,
  workDays: number[],
): ShiftSlot {
  return {
    name,
    start,
    end,
    cross: end <= start,
    rest: '不休息',
    work_days: workDays,
  }
}

test.describe('固定班次 · 跨班次时间校验', () => {
  test('不同工作日、时间不交叉时不冲突', () => {
    const shifts = [
      slot('标准班', '09:00', '18:00', [1, 2, 3, 4, 5]),
      slot('周六值班', '09:00', '18:00', [6]),
    ]
    expect(findFixedShiftClash(shifts, shifts[0])).toBeNull()
    expect(findFixedShiftClash(shifts, shifts[1])).toBeNull()
  })

  test('跨天班次占用次日，与次日早班冲突', () => {
    const shifts = [
      slot('夜班', '22:00', '06:00', [1]),
      slot('早班', '05:00', '13:00', [2]),
    ]
    const clash = findFixedShiftClash(shifts, shifts[1])
    expect(clash).not.toBeNull()
    expect(clash?.slot.name).toBe('夜班')
    expect(clash?.day).toBe(2)
    expect(clash?.otherDay).toBe(1)
  })

  test('首尾相接（次日 06:00 开始）不算冲突', () => {
    const shifts = [
      slot('夜班', '22:00', '06:00', [1]),
      slot('早班', '06:00', '13:00', [2]),
    ]
    expect(findFixedShiftClash(shifts, shifts[1])).toBeNull()
  })

  test('周日跨天占用到下周一也能识别', () => {
    const shifts = [
      slot('周日夜班', '22:00', '06:00', [7]),
      slot('周一早班', '05:00', '13:00', [1]),
    ]
    const clash = findFixedShiftClash(shifts, shifts[1])
    expect(clash?.slot.name).toBe('周日夜班')
    expect(clash?.otherDay).toBe(7)
  })

  test('工作日并集与区间文案', () => {
    const shifts = [
      slot('工作日班', '09:00', '18:00', [1, 2, 3, 4, 5]),
      slot('周六值班', '09:00', '18:00', [6]),
    ]
    expect(fixedShiftDays(shifts)).toEqual([1, 2, 3, 4, 5, 6])
    expect(workDaysText(fixedShiftDays(shifts))).toBe('周一至周六')
    expect(workDaysText([1, 3, 5])).toBe('周一、周三、周五')
    expect(workDaysText([6, 7])).toBe('周六、周日')
    expect(workDaysText([1, 2, 3, 4, 5, 6, 7])).toBe('每天')
    expect(workDaysText([])).toBe('未设置')
  })
})
