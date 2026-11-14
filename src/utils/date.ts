import { addDays, addMonths, addYears, format, isValid, parseISO, startOfDay, startOfMonth, subDays, subMonths } from 'date-fns'
import { zhCN } from 'date-fns/locale'

const DATE_TIME_FORMAT = 'yyyy-MM-dd HH:mm'
const DATE_FORMAT = 'yyyy-MM-dd'

export function formatDate(date: string | Date, fmt = DATE_FORMAT): string {
  const d = typeof date === 'string' ? parseISO(date) : date
  return format(d, fmt, { locale: zhCN })
}

export function formatDateTime(date: string | Date): string {
  return formatDate(date, DATE_TIME_FORMAT)
}

/**
 * Date转换成日期时间格式字符串
 * @param date
 * @param formatStr
 */
export function formatToDateTime(date: Date | number | string, formatStr = DATE_TIME_FORMAT): string {
  const d = new Date(Number(date))
  return isValid(d) ? format(d, formatStr) : '-'
}

/**
 * Date转换成日期格式字符串
 * @param date
 * @param formatStr
 */
export function formatToDate(date: Date | number | string, formatStr = DATE_FORMAT): string {
  const d = new Date(Number(date))
  return isValid(d) ? format(d, formatStr) : '-'
}

/**
 * 解构日期数组为查询参数
 * 将 [start, end] 时间戳数组拆分为 time_begin / time_end 字段
 * end 会自动 +1 天（转为次日零点）
 */
export function unDate({
  dateArr,
  start = 'time_begin',
  end = 'time_end',
}: {
  dateArr?: [number, number] | null
  start?: string
  end?: string
}): Record<string, any> | null {
  if (!dateArr)
    return null
  const obj: Record<string, any> = {}
  if (dateArr[0] != null)
    obj[start] = dateArr[0]
  if (dateArr[1] != null)
    obj[end] = addDays(dateArr[1], 1).getTime()
  return obj
}

/**
 * 生成默认日期范围
 * 参考 fw-ui defDate，offset 为负数表示过去
 */
export function defDate(offset: number, unit: 'y' | 'm' | 'd' = 'm'): [number, number] {
  const today = startOfDay(new Date())
  let start: Date
  if (unit === 'y')
    start = addYears(today, offset)
  else if (unit === 'm')
    start = addMonths(today, offset)
  else
    start = addDays(today, offset)
  return [start.getTime(), today.getTime()]
}

/**
 * 日期快捷选项
 */
export function getDateShortcuts(): { label: string, value: [number, number] }[] {
  const today = startOfDay(new Date())
  return [
    { label: '今天', value: [today.getTime(), today.getTime()] },
    { label: '近7天', value: [subDays(today, 6).getTime(), today.getTime()] },
    { label: '近30天', value: [subDays(today, 29).getTime(), today.getTime()] },
    { label: '本月', value: [startOfMonth(today).getTime(), today.getTime()] },
    { label: '近3个月', value: [subMonths(today, 3).getTime(), today.getTime()] },
  ]
}
