import type { Page } from '@playwright/test'
import { expect, test } from '@playwright/test'

async function openPassword(page: Page) {
  await page.goto('pages/login/index', { waitUntil: 'networkidle' })
  await page.getByText('登 录', { exact: false }).first().click()
  await page.waitForURL(/pages\/index\/index/, { timeout: 20_000 })
  await page.goto('pages/mine/index', { waitUntil: 'networkidle' })
  await page.getByText('修改密码').last().click()
  await page.waitForURL(/pages\/mine\/password/, { timeout: 20_000 })
  await expect(page.getByText('账号安全')).toBeVisible()
}

const inputs = (page: Page) => page.locator('.sp-form-input input')

test.describe('修改密码 · 表单与校验', () => {
  test('展示安全卡、输入项与密码要求', async ({ page }) => {
    await openPassword(page)

    await expect(page.getByText('当前账号 demo')).toBeVisible()
    await expect(page.locator('[data-role="card-title"]').first()).toHaveText('修改密码')
    await expect(page.getByText('至少 6 个字符')).toBeVisible()
    await expect(page.getByText('同时包含字母与数字')).toBeVisible()
    await expect(page.getByText('确认修改')).toBeVisible()
  })

  test('新密码强度与要求实时联动', async ({ page }) => {
    await openPassword(page)

    await inputs(page).nth(1).fill('abc')
    await expect(page.getByText('弱', { exact: true })).toBeVisible()
    await expect(page.locator('[class*="rule-dot--ok"]')).toHaveCount(1)

    await inputs(page).nth(1).fill('atlas2026')
    await expect(page.getByText('中', { exact: true })).toBeVisible()
    await expect(page.locator('[class*="rule-dot--ok"]')).toHaveCount(3)
  })

  test('空表单与两次不一致都会拦截提交', async ({ page }) => {
    await openPassword(page)

    await page.getByText('确认修改').click()
    await expect(page.getByText('请输入旧密码').first()).toBeVisible()

    await inputs(page).nth(0).fill('123456')
    await inputs(page).nth(1).fill('atlas2026')
    await inputs(page).nth(2).fill('atlas2027')
    await page.getByText('确认修改').click()
    await expect(page.getByText('两次输入的密码不一致').first()).toBeVisible()
    expect(page.url()).toContain('/pages/mine/password/')
  })

  test('旧密码正确时修改成功并返回「我的」', async ({ page }) => {
    await openPassword(page)

    await inputs(page).nth(0).fill('123456')
    await inputs(page).nth(1).fill('atlas2026')
    await inputs(page).nth(2).fill('atlas2026')
    await expect(page.getByText('两次输入一致')).toBeVisible()
    await page.getByText('确认修改').click()

    await expect(page.getByText('密码修改成功')).toBeVisible()
    await page.waitForURL(/pages\/mine\/index/, { timeout: 20_000 })
  })
})
