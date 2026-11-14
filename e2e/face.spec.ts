import type { Page } from '@playwright/test'
import { expect, test } from '@playwright/test'

async function openFace(page: Page) {
  await page.goto('pages/login/index', { waitUntil: 'networkidle' })
  await page.getByText('登 录', { exact: false }).first().click()
  await page.waitForURL(/pages\/index\/index/, { timeout: 20_000 })
  await page.goto('pages/mine/face/index', { waitUntil: 'networkidle' })
  await expect(page.getByText('还未采集人脸')).toBeVisible()
}

test.describe('人脸采集 · 状态与方式', () => {
  test('未采集时展示状态卡、采集方式与拍摄要求', async ({ page }) => {
    await openFace(page)

    await expect(page.getByText('待采集')).toBeVisible()
    await expect(page.getByText('采集后可用于人脸识别打卡')).toBeVisible()
    await expect(page.getByText('采集方式')).toBeVisible()
    await expect(page.getByText('拍照采集')).toBeVisible()
    await expect(page.getByText('视频采集', { exact: true })).toBeVisible()
    await expect(page.getByText('拍摄要求')).toBeVisible()
    await expect(page.getByText('正对镜头，人脸完整落在取景框内')).toBeVisible()
    await expect(page.getByText('隐私说明')).toBeVisible()
    await expect(page.getByText('开始采集')).toBeVisible()
  })

  test('切换采集方式时选中态跟随', async ({ page }) => {
    await openFace(page)

    // H5 默认推荐视频采集
    await expect(page.locator('[class*="method--active"]')).toContainText('视频采集')

    await page.getByText('拍照采集', { exact: true }).click()
    await expect(page.locator('[class*="method--active"]')).toContainText('拍照采集')

    await page.getByText('视频采集', { exact: true }).click()
    await expect(page.locator('[class*="method--active"]')).toContainText('视频采集')
  })
})
