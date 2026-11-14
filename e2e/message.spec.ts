import type { Page } from '@playwright/test'
import { expect, test } from '@playwright/test'

const CARD = '[class*="index-module__card___"]'
const CHIP = '[class*="index-module__card-cat___"]'

async function login(page: Page) {
  await page.goto('pages/login/index', { waitUntil: 'networkidle' })
  await page.getByText('登 录', { exact: false }).first().click()
  await page.waitForURL(/pages\/index\/index/, { timeout: 20_000 })
}

test.describe('消息中心 · 卡片列表', () => {
  test.beforeEach(async ({ page }) => {
    await login(page)
    await page.goto('pages/user/message/index', { waitUntil: 'networkidle' })
    await expect(page.locator('.nut-navbar__title').last()).toHaveText('消息中心')
  })

  test('列表展示类型标签、标题、内容与总数', async ({ page }) => {
    await expect(page.locator(CARD).first()).toBeVisible()
    await expect(page.locator(CHIP).first()).toBeVisible({ timeout: 15_000 })
    await expect(page.getByText(/共 \d+ 条/)).toBeVisible()
    await expect(page.getByText('查看详情').first()).toBeVisible()
  })

  test('类型下拉筛选只保留对应类型的消息', async ({ page }) => {
    await page.getByText('全部类型', { exact: true }).click()
    await expect(page.locator('[data-role="filter-option"]')).toHaveCount(4)

    await page.locator('[data-role="filter-option"]', { hasText: '通知' }).click()
    await expect(page.locator(CHIP).first()).toBeVisible({ timeout: 15_000 })

    const chips = page.locator(CHIP)
    const count = await chips.count()
    expect(count).toBeGreaterThan(0)
    for (let i = 0; i < count; i++)
      await expect(chips.nth(i)).toHaveText('通知')
  })

  test('点开消息后未读标记消失', async ({ page }) => {
    const unread = page.getByText('未读', { exact: true })
    await expect(unread.first()).toBeVisible({ timeout: 15_000 })
    const before = await unread.count()

    await page.locator(CARD).first().click()
    await expect(page.getByText('知道了', { exact: true })).toBeVisible()
    await page.getByText('知道了', { exact: true }).click()

    await expect(unread).toHaveCount(before - 1)
  })
})
