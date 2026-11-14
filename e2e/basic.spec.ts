import type { Page } from '@playwright/test'
import { expect, test } from '@playwright/test'

async function login(page: Page) {
  await page.goto('pages/login/index', { waitUntil: 'networkidle' })
  await page.getByText('登 录', { exact: false }).first().click()
  await page.waitForURL(/pages\/index\/index/, { timeout: 20_000 })
}

test.describe('Atlas 工作台 · 基础页面', () => {
  test('工作台展示问候、指标与待办', async ({ page }) => {
    await login(page)
    await expect(page.getByText('去打卡')).toBeVisible()
    await expect(page.getByText('待办事项')).toBeVisible()
    await expect(page.getByText('待处理')).toBeVisible()
  })

  test('打卡页展示班次，打卡后切换为下班打卡', async ({ page }) => {
    await login(page)
    await page.goto('pages/checkin/index', { waitUntil: 'networkidle' })

    await expect(page.getByText('总部固定班次').first()).toBeVisible()
    await expect(page.getByText('今日记录')).toBeVisible()
    await expect(page.getByText('上班打卡', { exact: true })).toBeVisible()

    // 点打卡按钮：上班 → 下班
    await page.getByText('上班打卡', { exact: true }).click({ force: true })
    await expect(page.getByText('下班打卡', { exact: true })).toBeVisible({ timeout: 10_000 })
    await expect(page.getByText('上班打卡', { exact: true })).toHaveCount(0)
  })

  test('我的页面展示账号、今日打卡状态与考勤概览', async ({ page }) => {
    await login(page)
    await page.goto('pages/mine/index', { waitUntil: 'networkidle' })

    await expect(page.getByText('陈一鸣')).toBeVisible()
    // 今日打卡状态胶囊
    await expect(page.getByText('未打卡')).toBeVisible()
    // 个人卡底部：本月考勤概览
    await expect(page.getByText('本月出勤')).toBeVisible()
    await expect(page.getByText('迟到')).toBeVisible()
    await expect(page.getByText('加班')).toBeVisible()
    // 设置分组（常用功能已移除）
    await expect(page.getByText('个人信息')).toBeVisible()
    await expect(page.getByText('关于应用')).toBeVisible()
    await expect(page.getByText('退出登录')).toBeVisible()
  })

  test('关于应用弹窗展示版本信息', async ({ page }) => {
    await login(page)
    await page.goto('pages/mine/index', { waitUntil: 'networkidle' })

    await page.getByText('关于应用').last().click()
    await expect(page.getByText('移动考勤与协同工作台，支持打卡、审批、通讯录与数据看板')).toBeVisible()
    await expect(page.getByText('H5 / 微信小程序')).toBeVisible()
    await expect(page.getByText('本地演示数据')).toBeVisible()

    await page.getByText('知道了').click()
    await expect(page.getByText('H5 / 微信小程序')).toBeHidden()
  })

  test('打卡后「我的」状态胶囊同步为已上班', async ({ page }) => {
    await login(page)
    await page.getByText('去打卡').click()
    await page.waitForURL(/pages\/checkin\/index/, { timeout: 20_000 })

    // 等考勤信息加载完（loading 中点击会被忽略）
    await expect(page.getByText('总部固定班次').first()).toBeVisible()
    await page.waitForTimeout(900)
    const dial = page.locator('[class*="index-module__dial___"]').first()
    await dial.dispatchEvent('click')
    // 打卡成功后按钮切换为「下班打卡」，确认请求真的写进去了
    await expect(page.getByText('下班打卡', { exact: true })).toBeVisible({ timeout: 10_000 })

    // 同一 SPA 内返回，内存里的打卡状态不会丢
    await page.goBack()
    await page.waitForTimeout(500)
    await page.getByText('我的', { exact: true }).last().click()

    await expect(page.getByText(/已上班|已完成/)).toBeVisible({ timeout: 10_000 })
    await expect(page.getByText('未打卡')).toHaveCount(0)
  })
})
