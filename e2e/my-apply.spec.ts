import type { Page } from '@playwright/test'
import { expect, test } from '@playwright/test'

const CARD = '[class*="ApplyBillCard-module__card___"]'
const TAG = '[class*="ApplyBillCard-module__tag___"]'

async function login(page: Page) {
  await page.goto('pages/login/index', { waitUntil: 'networkidle' })
  await page.getByText('登 录', { exact: false }).first().click()
  await page.waitForURL(/pages\/index\/index/, { timeout: 20_000 })
}

test.describe('我的申请 · 全部申请单据', () => {
  test.beforeEach(async ({ page }) => {
    await login(page)
    await page.goto('pages/apply/list', { waitUntil: 'networkidle' })
    await expect(page.locator('.nut-navbar__title').last()).toHaveText('我的申请')
  })

  test('列表展示全部申请单据与总数', async ({ page }) => {
    await expect(page.locator(CARD).first()).toBeVisible()
    await expect(page.getByText(/^WF-\d{4}-\d{4}$/).first()).toBeVisible({ timeout: 15_000 })
    await expect(page.locator('[class*="filter-count___"]')).toHaveText(/共 \d+ 条/)
    // 分类标签覆盖多个业务域
    await expect(page.getByText('费用', { exact: true }).first()).toBeVisible()
  })

  test('状态下拉筛选只显示对应状态的单据', async ({ page }) => {
    // 默认展示全部
    await expect(page.getByText('全部状态', { exact: true })).toBeVisible()

    await page.getByText('全部状态', { exact: true }).click()
    await expect(page.locator('[data-role="filter-option"]')).toHaveCount(5)

    await page.locator('[data-role="filter-option"]', { hasText: '已退回' }).click()
    await expect(page.locator('[data-role="filter-trigger"]')).toHaveText('已退回')

    // 等筛选后的列表加载完，所有卡片标签都应为「已退回」
    await expect(page.locator(TAG).first()).toBeVisible({ timeout: 15_000 })
    const tags = page.locator(TAG)
    const count = await tags.count()
    expect(count).toBeGreaterThan(0)
    for (let i = 0; i < count; i++)
      await expect(tags.nth(i)).toHaveText('已退回')
  })

  test('详情展示基本信息与审批流程', async ({ page }) => {
    await page.locator(CARD).first().click()
    await page.waitForURL(/pages\/apply\/detail/, { timeout: 20_000 })

    await expect(page.locator('.nut-navbar__title').last()).toHaveText('申请详情')
    await expect(page.getByText('基本信息')).toBeVisible()
    await expect(page.getByText('审批流程')).toBeVisible()
    await expect(page.getByText('提交申请')).toBeVisible()
    await expect(page.getByText('部门负责人审批')).toBeVisible()
  })

  test('待审批单据可撤回', async ({ page }) => {
    await page.getByText('全部状态', { exact: true }).click()
    await page.locator('[data-role="filter-option"]', { hasText: '待审批' }).click()
    await expect(page.locator(CARD).first()).toBeVisible()

    await page.locator(CARD).first().click()
    await page.waitForURL(/pages\/apply\/detail/, { timeout: 20_000 })

    await expect(page.getByText('撤回申请')).toBeVisible()
    await page.getByText('撤回申请').click()
    await page.getByText('确认撤回').click()
    await expect(page.getByText('已撤回')).toBeVisible({ timeout: 10_000 })
  })
})
