import type { Page } from '@playwright/test'
import { expect, test } from '@playwright/test'

const CARD = '[class*="index-module__card___"]'
const FAB = '[class*="index-module__fab___"]'

async function login(page: Page) {
  await page.goto('pages/login/index', { waitUntil: 'networkidle' })
  await page.getByText('登 录', { exact: false }).first().click()
  await page.waitForURL(/pages\/index\/index/, { timeout: 20_000 })
}

/** 本周第 N 天（0 = 周一）的 YYYY-MM-DD */
function weekKey(dayOffset: number) {
  const now = new Date()
  const mondayOffset = (now.getDay() + 6) % 7
  const date = new Date(now.getFullYear(), now.getMonth(), now.getDate() - mondayOffset + dayOffset)
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
}

/** 排班表单元格选择器（详情页与编辑页可能同时存在，调用处统一取 last） */
function cell(member: string, dayOffset: number) {
  return `#roster-${member}-${weekKey(dayOffset)}`
}

/** 选择班次（不立即生效），再点确定才写入 */
async function pickShift(page: Page, name: string) {
  await page.locator('[class*="edit-module__cal-pick___"]')
    .filter({ hasText: new RegExp(`^${name}$`) })
    .click()
}

async function confirmShift(page: Page) {
  await page.locator('[class*="edit-module__confirm___"]').click()
  await page.waitForTimeout(200)
}

/** Taro 页面是内层滚动容器，点击前先把单元格滚到视口中间 */
async function tapCell(page: Page, member: string, dayOffset: number) {
  const target = page.locator(cell(member, dayOffset)).last()
  await target.evaluate((el: HTMLElement) => el.scrollIntoView({ block: 'center' }))
  await page.waitForTimeout(300)
  await target.click()
}

async function openShiftEdit(page: Page, ruleName: string) {
  await page.locator(CARD).filter({ hasText: ruleName }).click()
  await page.waitForURL(/pages\/rules\/detail/, { timeout: 20_000 })
  await page.getByText('修改规则').click()
  await page.waitForURL(/pages\/rules\/edit/, { timeout: 20_000 })
}

test.describe('考勤规则 · 列表 / 详情 / 新增', () => {
  test.beforeEach(async ({ page }) => {
    await login(page)
    await page.goto('pages/rules/index', { waitUntil: 'networkidle' })
    await expect(page.locator('.nut-navbar__title').last()).toHaveText('考勤规则')
  })

  test('列表展示规则名称、班次与启停状态', async ({ page }) => {
    await expect(page.locator(CARD).first()).toBeVisible()
    await expect(page.getByText(/共 \d+ 条规则/)).toBeVisible()
    await expect(page.getByText('总部固定班次')).toBeVisible()
    await expect(page.getByText('09:00 - 18:00').first()).toBeVisible()
    await expect(page.getByText('启用', { exact: true }).first()).toBeVisible()
  })

  test('列表按三种考勤模式标注并统计', async ({ page }) => {
    await expect(page.locator(CARD).first()).toBeVisible()
    await expect(page.getByText('固定班次').first()).toBeVisible()
    await expect(page.getByText('自由打卡').first()).toBeVisible()
    await expect(page.getByText('排班制').first()).toBeVisible()
    await expect(page.getByText('自由上下班')).toBeVisible()
    await expect(page.getByText(/\d+ 人天已排/).first()).toBeVisible()
    await expect(page.getByText('日均 8 小时')).toBeVisible()
  })

  test('排班制详情展示班次列表与按人排班表', async ({ page }) => {
    await page.getByText('客服轮班制').click()
    await page.waitForURL(/pages\/rules\/detail/, { timeout: 20_000 })

    await expect(page.getByText('排班设置')).toBeVisible()
    await expect(page.getByText('早班').first()).toBeVisible()
    await expect(page.getByText('晚班').first()).toBeVisible()
    await expect(page.getByText('次日')).toBeVisible()

    // 按人排班表
    await expect(page.getByText('排班表')).toBeVisible()
    await expect(page.getByText('姓名')).toBeVisible()
    await expect(page.getByText('王琳').first()).toBeVisible()
    await expect(page.getByText('孙浩').first()).toBeVisible()
    await expect(page.getByText(/本周已排 \d+ 人天/)).toBeVisible()
    await expect(page.getByText(/交接间隔 30 分钟/)).toBeVisible()
  })

  test('自由打卡详情展示工时与打卡次数', async ({ page }) => {
    await page.getByText('外勤自由打卡').click()
    await page.waitForURL(/pages\/rules\/detail/, { timeout: 20_000 })

    await expect(page.getByText('自由打卡设置')).toBeVisible()
    await expect(page.getByText('每日应出勤')).toBeVisible()
    await expect(page.getByText('每日打卡次数')).toBeVisible()
    await expect(page.getByText('不做迟到判定，仅统计工时')).toBeVisible()
  })

  test('详情展示班次与打卡要求，并能改名保存', async ({ page }) => {
    await page.locator(CARD).first().click()
    await page.waitForURL(/pages\/rules\/detail/, { timeout: 20_000 })

    await expect(page.locator('.nut-navbar__title').last()).toHaveText('规则详情')
    await expect(page.getByText('班次设置')).toBeVisible()
    await expect(page.getByText('打卡要求')).toBeVisible()
    await expect(page.getByText('停用规则')).toBeVisible()

    await page.getByText('修改规则').click()
    await page.waitForURL(/pages\/rules\/edit/, { timeout: 20_000 })
    await expect(page.locator('.nut-navbar__title').last()).toHaveText('修改规则')

    await page.getByPlaceholder('如：总部固定班次').fill('总部固定班次（新）')
    await page.getByText('保存', { exact: true }).click()

    await page.waitForURL(/pages\/rules\/detail/, { timeout: 20_000 })
    await expect(page.getByText('总部固定班次（新）')).toBeVisible({ timeout: 15_000 })
  })

  test('悬浮按钮新建规则后回到列表', async ({ page }) => {
    const before = await page.getByText(/共 (\d+) 条规则/).textContent()
    const count = Number(before?.match(/\d+/)?.[0] || 0)

    await page.locator(FAB).click()
    await page.waitForURL(/pages\/rules\/edit/, { timeout: 20_000 })
    await expect(page.locator('.nut-navbar__title').last()).toHaveText('新建规则')

    await page.getByPlaceholder('如：总部固定班次').fill('测试规则 A')
    await page.getByText('保存', { exact: true }).click()

    await page.waitForURL(/pages\/rules\/index/, { timeout: 20_000 })
    await expect(page.locator(CARD).first()).toBeVisible()
    await expect(page.getByText('测试规则 A')).toBeVisible({ timeout: 15_000 })
    await expect(page.getByText(`共 ${count + 1} 条规则`)).toBeVisible()
  })

  test('新建自由打卡规则，列表按自由模式展示', async ({ page }) => {
    await page.locator(FAB).click()
    await page.waitForURL(/pages\/rules\/edit/, { timeout: 20_000 })

    await page.getByPlaceholder('如：总部固定班次').fill('外勤自由规则')
    await page.locator('[class*="edit-module__mode-name___"]').filter({ hasText: '自由打卡' }).click()

    await expect(page.getByText('每日应出勤工时')).toBeVisible()

    // 工时自定义：直接输入 7.5，再用步进按钮微调
    const hourInput = page.locator('[class*="edit-module__stepper-input___"] input').last()
    await hourInput.fill('7.5')
    await expect(hourInput).toHaveValue('7.5')
    await page.locator('[class*="edit-module__stepper-btn___"]').last().click()
    await expect(hourInput).toHaveValue('8')
    await page.locator('[class*="edit-module__stepper-btn___"]').first().click()
    await expect(hourInput).toHaveValue('7.5')

    await page.getByText('保存', { exact: true }).click()

    await page.waitForURL(/pages\/rules\/index/, { timeout: 20_000 })
    const card = page.locator(CARD).filter({ hasText: '外勤自由规则' })
    await expect(card).toBeVisible({ timeout: 15_000 })
    await expect(card.getByText('自由上下班')).toBeVisible()
    await expect(card.getByText('日均 7.5 小时')).toBeVisible()
  })

  test('适用部门改为下拉多选', async ({ page }) => {
    await page.locator(FAB).click()
    await page.waitForURL(/pages\/rules\/edit/, { timeout: 20_000 })

    await expect(page.getByText('已选 1 个')).toBeVisible()
    await page.locator('[class*="edit-module__select___"]').click()
    await page.getByText('产品部').click()
    await page.getByText('销售部').click()
    await expect(page.getByText('已选 3 个')).toBeVisible()

    await page.getByText('完成', { exact: true }).click()
    await expect(page.getByText('技术中心、产品部、销售部')).toBeVisible()
  })

  test('排班制未添加班次时不允许排班', async ({ page }) => {
    await page.locator(FAB).click()
    await page.waitForURL(/pages\/rules\/edit/, { timeout: 20_000 })

    await page.locator('[class*="edit-module__mode-name___"]').filter({ hasText: '排班制' }).click()
    await expect(page.getByText('先在「班次设置」里添加班次，再给人员排班')).toBeVisible()
    await expect(page.getByText('已选 0 个单元格')).toHaveCount(0)
  })

  test('排班制按人员逐日排班并保存', async ({ page }) => {
    await page.locator(FAB).click()
    await page.waitForURL(/pages\/rules\/edit/, { timeout: 20_000 })

    await page.getByPlaceholder('如：总部固定班次').fill('门店排班')
    await page.locator('[class*="edit-module__mode-name___"]').filter({ hasText: '排班制' }).click()
    await page.getByText('+ 添加班次').click()

    // 默认部门「技术中心」会带出 4 名排班人员
    await expect(page.getByText('4 人 · 0 人次')).toBeVisible()
    await tapCell(page, '陈昊', 0)
    await tapCell(page, '陈昊', 1)
    await expect(page.getByText('已选 2 个单元格')).toBeVisible()

    await pickShift(page, '班次1')
    await confirmShift(page)
    await expect(page.getByText('2 人次')).toBeVisible()

    await page.getByText('保存', { exact: true }).click()
    await page.waitForURL(/pages\/rules\/index/, { timeout: 20_000 })
    const card = page.locator(CARD).filter({ hasText: '门店排班' })
    await expect(card).toBeVisible({ timeout: 15_000 })
    await expect(card.getByText('2 人天已排')).toBeVisible()
  })

  test('一次可选多个班次排入，班次互相冲突会取消选择', async ({ page }) => {
    await openShiftEdit(page, '客服轮班制')

    // 早班 + 晚班时间不重叠，一次排入两个
    await tapCell(page, '王琳', 0)
    await pickShift(page, '早班')
    await pickShift(page, '晚班')
    await confirmShift(page)
    await expect(page.locator(cell('王琳', 0)).last()).toContainText('+1')

    // 早班 + 中班互相重叠：提示并取消这次班次选择
    await tapCell(page, '王琳', 0)
    await pickShift(page, '早班')
    await pickShift(page, '中班')
    await confirmShift(page)
    await expect(page.getByText('早班与中班时间重叠，请重新选择')).toBeVisible()
    await expect(page.getByText('先选班次，再点确定')).toBeVisible()
  })

  test('跨天班次占用次日时同样拦截排班', async ({ page }) => {
    await openShiftEdit(page, '仓储三班倒')

    // 周一给张伟排夜班，周二再排白班：夜班跨天占用到周二 07:00，与白班冲突
    await tapCell(page, '张伟', 0)
    await pickShift(page, '夜班')
    await confirmShift(page)

    await tapCell(page, '张伟', 1)
    await pickShift(page, '白班')
    await confirmShift(page)

    await expect(page.getByText(/张伟 \d+ 号「夜班」跨天占用到 \d+ 号，与白班冲突/)).toBeVisible()
    await expect(page.getByText(/需间隔 30 分钟/)).toBeVisible()
  })

  test('交接间隔改为 0 后，首尾相接的班次可以排', async ({ page }) => {
    await openShiftEdit(page, '仓储三班倒')

    await page.getByText('0 分钟', { exact: true }).click()
    await tapCell(page, '张伟', 0)
    await pickShift(page, '夜班')
    await confirmShift(page)

    await tapCell(page, '张伟', 1)
    await pickShift(page, '白班')
    await confirmShift(page)

    // 成功时不弹提示，直接看排班结果
    await expect(page.locator(cell('张伟', 1)).last()).toContainText('白班')
    await expect(page.getByText(/时间重叠|冲突/)).toHaveCount(0)
  })

  test('编辑排班规则时跨天标签由班次时间决定', async ({ page }) => {
    await openShiftEdit(page, '客服轮班制')

    const chips = page.locator('[class*="edit-module__cross-chip___"]')
    await expect(chips.filter({ hasText: '跨天' })).toHaveCount(1)
    await expect(chips.filter({ hasText: '当日' })).toHaveCount(2)
  })

  test('排班表支持周/月切换', async ({ page }) => {
    await openShiftEdit(page, '客服轮班制')

    const dayCells = page.locator('[class*="RosterTable-module__day-cell___"]')
    await expect.poll(() => dayCells.count()).toBeLessThan(20)

    const monthTab = page.locator('[class*="edit-module__range-tab___"]').filter({ hasText: '月' })
    await monthTab.click()
    await expect(monthTab).toHaveClass(/range-tab--on/)
    // 月视图渲染整月日期，格子数明显增多
    await expect.poll(() => dayCells.count()).toBeGreaterThan(20)

    const weekTab = page.locator('[class*="edit-module__range-tab___"]').filter({ hasText: '周' })
    await weekTab.click()
    await expect(weekTab).toHaveClass(/range-tab--on/)
    await expect.poll(() => dayCells.count()).toBeLessThan(20)
  })

  test('排班表可增删排班人员', async ({ page }) => {
    await openShiftEdit(page, '客服轮班制')

    await page.locator('[class*="edit-module__member-entry___"]').click()
    const panel = page.locator('[class*="edit-module__member-panel___"]')
    await expect(panel).toBeVisible()
    await expect(panel.getByText('王琳')).toBeVisible()

    // 已选人员置顶，第一个就是王琳，取消后人数减少
    await panel.locator('[class*="edit-module__member-option___"]').filter({ hasText: '王琳' }).click()
    await expect(page.getByText(/5 人 · 150 人次/)).toBeVisible()
  })

  test('固定班次每个班次可单独设置休息时段', async ({ page }) => {
    await page.locator(CARD).first().click()
    await page.waitForURL(/pages\/rules\/detail/, { timeout: 20_000 })
    await page.getByText('修改规则').click()
    await page.waitForURL(/pages\/rules\/edit/, { timeout: 20_000 })

    const slot = page.locator('[class*="edit-module__shift-slot___"]').first()
    const restTimes = slot.locator('[class*="edit-module__slot-rest-time___"]')
    await expect(restTimes.first()).toHaveText('13:00')
    await expect(restTimes.last()).toHaveText('14:00')

    const restSwitch = slot.locator('[class*="edit-module__slot-rest-switch___"]')
    await restSwitch.click()
    await expect(restSwitch).not.toHaveClass(/switch--on/)

    // 重新打开：按当前上下班（09:00-18:00）中点重新生成
    await restSwitch.click()
    await expect(restSwitch).toHaveClass(/switch--on/)
    await expect(restTimes.first()).toHaveText('13:00')
    await expect(restTimes.last()).toHaveText('14:00')
  })

  test('新增班次的休息默认取中点，开关关闭后再打开会重新生成', async ({ page }) => {
    await page.locator(FAB).click()
    await page.waitForURL(/pages\/rules\/edit/, { timeout: 20_000 })
    await page.locator('[class*="edit-module__mode-name___"]').filter({ hasText: '排班制' }).click()
    await page.getByText('+ 添加班次').click()

    const slot = page.locator('[class*="edit-module__shift-slot___"]').last()
    const restTimes = slot.locator('[class*="edit-module__slot-rest-time___"]')
    // 09:00-18:00 的中点休息是 13:00-14:00
    await expect(restTimes.first()).toHaveText('13:00')
    await expect(restTimes.last()).toHaveText('14:00')

    const slotSwitch = slot.locator('[class*="edit-module__slot-rest-switch___"]')
    await expect(slotSwitch).toHaveClass(/switch--on/)
    await slotSwitch.click()
    await expect(slotSwitch).not.toHaveClass(/switch--on/)

    // 再打开时重新按上下班生成休息
    await slotSwitch.click()
    await expect(slotSwitch).toHaveClass(/switch--on/)
    await expect(restTimes.first()).toHaveText('13:00')
    await expect(restTimes.last()).toHaveText('14:00')
  })

  test('选好班次要点确定才生效，未选班次会提示', async ({ page }) => {
    await openShiftEdit(page, '客服轮班制')

    await tapCell(page, '周舟', 0)
    await pickShift(page, '晚班')
    // 选完班次只高亮，选中状态保留，等点确定
    await expect(page.getByText('已选 1 个单元格')).toBeVisible()
    await expect(page.getByText('将 1 个单元格设为「晚班」')).toBeVisible()

    // 清除选择会同时清掉已选班次
    await page.locator('[class*="edit-module__cal-clear___"]').click()
    await expect(page.getByText('已选 0 个单元格')).toBeVisible()

    await tapCell(page, '周舟', 0)
    await expect(page.getByText('已选 1 个单元格')).toBeVisible()
    await page.locator('[class*="edit-module__confirm___"]').click()
    await expect(page.getByText('请先选择班次')).toBeVisible()
  })

  test('固定班次在班次设置里选工作日，默认周一至周五', async ({ page }) => {
    await page.locator(FAB).click()
    await page.waitForURL(/pages\/rules\/edit/, { timeout: 20_000 })
    await page.getByPlaceholder('如：总部固定班次').fill('值班规则')

    const slot = page.locator('[class*="edit-module__shift-slot___"]').first()
    const onDays = slot.locator('[class*="edit-module__slot-day--on___"]')
    const dayCell = (label: string) => slot.locator('[class*="edit-module__slot-day___"]').filter({ hasText: new RegExp(`^${label}$`) })

    await expect(onDays).toHaveCount(5)
    await expect(dayCell('六')).not.toHaveClass(/slot-day--on/)

    await dayCell('六').click()
    await expect(onDays).toHaveCount(6)
    await dayCell('六').click()
    await expect(onDays).toHaveCount(5)

    // 清空后保存会被拦下
    for (const label of ['一', '二', '三', '四', '五'])
      await dayCell(label).click()
    await expect(onDays).toHaveCount(0)
    await page.getByText('保存', { exact: true }).click()
    await expect(page.getByText('请为「标准班」选择工作日')).toBeVisible()

    for (const label of ['一', '二', '三', '四', '五'])
      await dayCell(label).click()
    await expect(onDays).toHaveCount(5)
    await page.getByText('保存', { exact: true }).click()
    await page.waitForURL(/pages\/rules\/index/, { timeout: 20_000 })

    const card = page.locator(CARD).filter({ hasText: '值班规则' })
    await expect(card).toBeVisible({ timeout: 15_000 })
    await card.click()
    await page.waitForURL(/pages\/rules\/detail/, { timeout: 20_000 })
    await expect(page.getByText('周一至周五 · 09:00 - 18:00')).toBeVisible()
  })

  test('新增班次默认勾选剩余工作日，排满后不能继续新增', async ({ page }) => {
    await page.locator(FAB).click()
    await page.waitForURL(/pages\/rules\/edit/, { timeout: 20_000 })
    await page.getByPlaceholder('如：总部固定班次').fill('双班规则')
    await page.getByText('+ 添加班次').click()

    const slots = page.locator('[class*="edit-module__shift-slot___"]')
    const first = slots.first()
    const second = slots.last()
    const firstOn = first.locator('[class*="edit-module__slot-day--on___"]')
    const secondOn = second.locator('[class*="edit-module__slot-day--on___"]')
    const secondDay = (label: string) => second.locator('[class*="edit-module__slot-day___"]').filter({ hasText: new RegExp(`^${label}$`) })

    // 第一个班次占周一到周五，新班次自动勾选剩下的周六、周日
    await expect(firstOn).toHaveCount(5)
    await expect(secondOn).toHaveCount(2)
    await expect(second.getByText('周六、周日')).toBeVisible()

    // 已占用的日子置灰，点击只提示
    await expect(secondDay('一')).toHaveClass(/slot-day--locked/)
    await secondDay('一').click()
    await expect(page.getByText('周一已被「标准班」占用')).toBeVisible()
    await expect(secondOn).toHaveCount(2)

    // 7 天排满：新增按钮置灰，点击只提示
    await expect(page.getByText('7 天已排满，无法新增班次')).toBeVisible()
    await page.getByText('7 天已排满，无法新增班次').click()
    await expect(page.getByText('7 天都已排上班次，无法继续添加班次')).toBeVisible()
    await expect(slots).toHaveCount(2)

    // 释放一天后可以继续新增，新班次自动勾选这一天
    await secondDay('日').click()
    await expect(secondOn).toHaveCount(1)
    await page.getByText('+ 添加班次').click()
    await expect(slots).toHaveCount(3)
    const third = slots.last()
    await expect(third.locator('[class*="edit-module__slot-day--on___"]')).toHaveCount(1)

    await page.getByText('保存', { exact: true }).click()
    await page.waitForURL(/pages\/rules\/index/, { timeout: 20_000 })
  })
})
