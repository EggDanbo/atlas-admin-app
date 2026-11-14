import type { Page } from '@playwright/test'
import { expect, test } from '@playwright/test'

/** 演示账号登录（表单已预填 demo / 123456） */
async function login(page: Page) {
  await page.goto('pages/login/index', { waitUntil: 'networkidle' })
  await expect(page.getByText('演示环境')).toBeVisible()
  await page.getByText('登 录', { exact: false }).first().click()
  await page.waitForURL(/pages\/index\/index/, { timeout: 20_000 })
}

/** H5 页面导航栏标题（Taro 原生标题在 H5 隐藏，这里取 NutUI 导航栏） */
function navbarTitle(page: Page, title: string) {
  return page.locator('.nut-navbar__title', { hasText: title })
}

test.describe('Atlas 工作台 · H5', () => {
  test('演示账号登录并进入工作台', async ({ page }) => {
    await page.goto('pages/login/index', { waitUntil: 'networkidle' })

    await expect(page.getByText('一体化管理系统 · 移动端')).toBeVisible()
    await page.getByText('登 录', { exact: false }).first().click()

    await page.waitForURL(/pages\/index\/index/, { timeout: 20_000 })
    await expect(page.getByText('去打卡')).toBeVisible()
    await expect(page.getByText('待办事项')).toBeVisible()
    await expect(page.getByText('待处理')).toBeVisible()
  })

  test('底部导航只保留首页与我的', async ({ page }) => {
    await login(page)

    const tabs = await page.locator('.taro-tabbar__tabbar [class*="tabbar__item"]').allInnerTexts()
    expect(tabs.map(t => t.trim()).filter(Boolean)).toEqual(['首页', '我的'])
  })

  test('首页展示管理菜单', async ({ page }) => {
    await login(page)

    await expect(page.getByText('管理菜单')).toBeVisible()
    for (const label of ['考勤规则', '我的申请', '请假申请', '组织通讯录', '成员管理', '考勤统计', '数据看板', '消息中心'])
      await expect(page.locator('[class*="MenuGrid-module__tile___"]', { hasText: label })).toHaveCount(1)
  })

  test('消息中心展示待办与通知', async ({ page }) => {
    await login(page)
    await page.goto('pages/user/message/index', { waitUntil: 'networkidle' })

    await expect(navbarTitle(page, '消息中心')).toBeVisible()
    await expect(page.getByText(/待你审批|已通过|系统维护通知/).first()).toBeVisible({ timeout: 15_000 })
  })
})
