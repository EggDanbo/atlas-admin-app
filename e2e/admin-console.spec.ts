import type { Page } from '@playwright/test'
import { expect, test } from '@playwright/test'

async function login(page: Page) {
  await page.goto('pages/login/index', { waitUntil: 'networkidle' })
  await page.getByText('登 录', { exact: false }).first().click()
  await page.waitForURL(/pages\/index\/index/, { timeout: 20_000 })
}

test.describe('管理端 · 看板 / 成员', () => {
  test.beforeEach(async ({ page }) => {
    await login(page)
  })

  test('数据看板展示指标、走势与部门分布', async ({ page }) => {
    await page.goto('pages/board/index', { waitUntil: 'networkidle' })

    await expect(page.locator('.nut-navbar__title').last()).toHaveText('数据看板')
    await expect(page.getByText('运营概览')).toBeVisible()
    await expect(page.getByText('待处理', { exact: true })).toBeVisible()
    await expect(page.getByText('近 7 日单据量')).toBeVisible()
    await expect(page.getByText('周一', { exact: true })).toBeVisible()
    await expect(page.getByText('周日', { exact: true })).toBeVisible()
    await expect(page.getByText('部门分布')).toBeVisible()
    await expect(page.getByText('单据类型 TOP5')).toBeVisible()
  })

  test('成员管理支持按姓名搜索', async ({ page }) => {
    await page.goto('pages/team/index', { waitUntil: 'networkidle' })

    await expect(page.locator('.nut-navbar__title').last()).toHaveText('成员管理')
    await expect(page.getByText(/共 \d+ 人/)).toBeVisible()
    await expect(page.getByText('林知远')).toBeVisible({ timeout: 15_000 })

    await page.locator('input').first().fill('林知远')
    await expect(page.getByText('周慕青')).toHaveCount(0)
    await expect(page.getByText('林知远')).toBeVisible()
  })
})
