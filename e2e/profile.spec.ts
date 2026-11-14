import type { Page } from '@playwright/test'
import { expect, test } from '@playwright/test'

async function login(page: Page) {
  await page.goto('pages/login/index', { waitUntil: 'networkidle' })
  await page.getByText('登 录', { exact: false }).first().click()
  await page.waitForURL(/pages\/index\/index/, { timeout: 20_000 })
}

async function openProfile(page: Page) {
  await page.goto('pages/mine/index', { waitUntil: 'networkidle' })
  await page.getByText('个人信息').last().click()
  await page.waitForURL(/pages\/mine\/profile/, { timeout: 20_000 })
  await expect(page.getByText('资料完整度')).toBeVisible()
  // 等资料回填完成，避免加载结果覆盖输入
  await expect(page.locator('.sp-form-input input').nth(3)).toHaveValue('AT-0001')
}

test.describe('个人信息 · 资料卡编辑', () => {
  test('展示头像卡、完整度与三组资料', async ({ page }) => {
    await login(page)
    await openProfile(page)

    await expect(page.getByText('点击头像更换人员照片')).toBeVisible()
    await expect(page.getByText('工作中', { exact: true }).last()).toBeVisible()
    await expect(page.getByText('基本信息')).toBeVisible()
    await expect(page.getByText('其他信息')).toBeVisible()
    await expect(page.getByText('提醒设置')).toBeVisible()
    await expect(page.locator('.sp-form-input input').nth(3)).toHaveValue('AT-0001')
    await expect(page.getByText('保存修改')).toBeVisible()
  })

  test('所属单位按层级下钻选择并回填', async ({ page }) => {
    await login(page)
    await openProfile(page)

    await page.getByText('技术中心/产品研发组', { exact: true }).last().click()
    await expect(page.getByText('选择所属单位')).toBeVisible()
    // 打开时定位到当前部门的同级
    await expect(page.getByText('平台工程组')).toBeVisible()

    await page.getByText('全部', { exact: true }).last().click()
    await page.getByText('Atlas 总部', { exact: true }).last().click()
    await expect(page.getByText('财务部', { exact: true })).toBeVisible()
    await page.getByText('财务部', { exact: true }).last().click()
    await page.getByText('核算组', { exact: true }).last().click()

    await expect(page.getByText('Atlas 总部/财务部/核算组', { exact: true }).last()).toBeVisible()
  })

  test('必填项为空时行内报错且不保存', async ({ page }) => {
    await login(page)
    await openProfile(page)

    const nameInput = page.locator('.sp-form-input input').first()
    await nameInput.click()
    await nameInput.fill('')
    await page.getByText('保存修改').click()

    await expect(page.getByText('请输入姓名').first()).toBeVisible()
    expect(page.url()).toContain('/pages/mine/profile/')
  })

  test('保存后返回「我的」，资料同步生效', async ({ page }) => {
    await login(page)
    await openProfile(page)

    const wknoInput = page.locator('.sp-form-input input').nth(3)
    await wknoInput.click()
    await wknoInput.fill('AT-0002')
    await page.getByText('保存修改').click()

    await page.waitForURL(/pages\/mine\/index/, { timeout: 20_000 })
    await expect(page.getByText('工号 AT-0002').first()).toBeVisible()
  })

  test('底部说明不被固定操作栏遮挡', async ({ page }) => {
    await login(page)
    await openProfile(page)

    // 滚到底，最后一条说明应完整落在操作栏上方
    await page.evaluate(() => {
      for (const el of document.querySelectorAll('.taro_page'))
        el.scrollTop = el.scrollHeight
      window.scrollTo(0, document.body.scrollHeight)
    })
    await page.waitForTimeout(400)

    const notice = await page.getByText('人员照片仅用于工作台展示', { exact: false }).last().boundingBox()
    const bar = await page.locator('.sp-bottom-bar').last().boundingBox()
    expect(notice).not.toBeNull()
    expect(bar).not.toBeNull()
    expect(notice!.y + notice!.height).toBeLessThanOrEqual(bar!.y)
  })
})
