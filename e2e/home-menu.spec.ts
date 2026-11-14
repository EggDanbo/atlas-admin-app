import { expect, test } from '@playwright/test'

/** 快捷入口回归：首页 6 个入口都要能进到对应页面 */
const ENTRIES: Array<[label: string, path: RegExp]> = [
  ['考勤规则', /pages\/rules\/index/],
  ['我的申请', /pages\/apply\/list/],
  ['请假申请', /pages\/apply\/leave/],
  ['组织通讯录', /pages\/contact\/index/],
  ['成员管理', /pages\/team\/index/],
  ['考勤统计', /pages\/checkin\/stats/],
  ['数据看板', /pages\/board\/index/],
  ['消息中心', /pages\/user\/message\/index/],
]

test.describe('工作台 · 管理菜单', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('pages/login/index', { waitUntil: 'networkidle' })
    await page.getByText('登 录', { exact: false }).first().click()
    await page.waitForURL(/pages\/index\/index/, { timeout: 20_000 })
    await expect(page.getByText('管理菜单')).toBeVisible()
  })

  for (const [label, path] of ENTRIES) {
    test(`点击「${label}」进入对应页面`, async ({ page }) => {
      await page.locator('[class*="MenuGrid-module__tile___"]', { hasText: label }).first().click()
      await page.waitForURL(path, { timeout: 20_000 })
      await expect(page.locator('.nut-navbar__title')).toBeVisible()
    })
  }

  test('打卡记录展示本月明细', async ({ page }) => {
    // 打卡记录已从菜单移入打卡页，从页面内的「查看记录」进入
    await page.goto('pages/checkin/index', { waitUntil: 'networkidle' })
    await page.getByText('查看记录', { exact: false }).first().click()
    await page.waitForURL(/pages\/checkin\/records/, { timeout: 20_000 })

    await expect(page.getByText('每日明细')).toBeVisible()
    await expect(page.getByText('本月出勤')).toBeVisible()
    await expect(page.getByText(/^\d{2}-\d{2}$/).first()).toBeVisible({ timeout: 15_000 })
  })

  test('待办「查看全部」进消息中心并自动筛成待办', async ({ page }) => {
    await page.getByText('查看全部').first().click()
    await page.waitForURL(/pages\/user\/message\/index\?types=0/, { timeout: 20_000 })

    // 筛选器回显「待办」，列表面板只剩待办消息
    const current = page.locator('.taro_page:visible')
    await expect(current.getByText('待办', { exact: true }).first()).toBeVisible()
    await expect(current.getByText('差旅费报销待你审批').first()).toBeVisible()
    // 通知类不应出现在待办筛选结果里（避免命中工作台里同名的隐藏节点）
    await expect(current.getByText('系统维护通知')).toHaveCount(0)
  })

  test('通讯录支持按姓名搜索', async ({ page }) => {
    await page.locator('[class*="MenuGrid-module__tile___"]', { hasText: '组织通讯录' }).first().click()
    await page.waitForURL(/pages\/contact\/index/, { timeout: 20_000 })

    await expect(page.getByText('林知远')).toBeVisible()
    await page.locator('input').first().fill('林知远')
    await expect(page.getByText('周慕青')).toHaveCount(0)
    await expect(page.getByText('林知远')).toBeVisible()
  })
})
