import type { Page } from '@playwright/test'
import { expect, test } from '@playwright/test'

const CARD = '[class*="ApplyBillCard-module__card___"]'
const TITLE = '[class*="ApplyBillCard-module__card-title___"]'
const COUNT = '[class*="filter-count___"]'
const FAB = '[class*="__fab___"]'

async function login(page: Page) {
  await page.goto('pages/login/index', { waitUntil: 'networkidle' })
  await page.getByText('登 录', { exact: false }).first().click()
  await page.waitForURL(/pages\/index\/index/, { timeout: 20_000 })
}

function countOf(text: string) {
  return Number(text.match(/\d+/)?.[0] || 0)
}

test.describe('请假申请 · 列表与新增', () => {
  test.beforeEach(async ({ page }) => {
    await login(page)
    await page.goto('pages/apply/leave', { waitUntil: 'networkidle' })
    await expect(page.locator('.nut-navbar__title').last()).toHaveText('请假申请')
    // 等列表首屏回来再读总数，否则会拿到 0 条
    await expect(page.locator(COUNT)).toHaveText(/共 [1-9]\d* 条/)
  })

  test('列表只展示请假类单据', async ({ page }) => {
    await expect(page.locator(CARD).first()).toBeVisible()
    await expect(page.locator(COUNT)).toHaveText(/共 \d+ 条/)

    const titles = await page.locator(TITLE).allInnerTexts()
    expect(titles.length).toBeGreaterThan(0)
    for (const title of titles)
      expect(title).toMatch(/假申请$/)
  })

  test('悬浮按钮进入表单，提交后回到列表并新增一条待审批', async ({ page }) => {
    const before = countOf(await page.locator(COUNT).textContent() || '')

    await page.locator(FAB).click()
    await page.waitForURL(/pages\/apply\/index/, { timeout: 20_000 })

    await page.locator('textarea').first().fill('家里有事，申请一天事假。')
    await page.getByText('提交申请').first().click()
    await expect(page.getByText('提交成功')).toBeVisible()
    await page.getByText('知道了', { exact: true }).click()

    await page.waitForURL(/pages\/apply\/leave/, { timeout: 20_000 })
    await expect(page.locator(COUNT)).toHaveText(new RegExp(`共 ${before + 1} 条`), { timeout: 15_000 })

    // 新单据置顶，单号以 QJ- 开头
    await expect(page.getByText(/^QJ-\d{4}-\d{4}$/).first()).toBeVisible()
    await expect(page.locator(CARD).first().getByText('待审批')).toBeVisible()
  })
})
