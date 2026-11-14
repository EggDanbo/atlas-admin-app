import type { Page } from '@playwright/test'
import { expect, test } from '@playwright/test'

/**
 * 微信 / 企业微信内置浏览器回归
 *
 * 这两类 UA 会命中 `h5-wechat` / `h5-wecom` 平台分支。历史上登录页的 ensureKey
 * 会把整页跳回应用根路径，与首页的登录守卫叠加后形成
 * 「首页 → 登录页 → 首页」的无限刷新（3 秒内可达上百次跳转）。
 *
 * 现在约定：所有平台表现一致——未登录进登录页；并且跳转次数必须是有限的。
 */

const WECHAT_UA
  = 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148 MicroMessenger/8.0.47 NetType/WIFI Language/zh_CN'

const WECOM_UA
  = 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148 wxwork/4.1.20 MicroMessenger/7.0.1 Language/zh ColorScheme/Light'

function collectNavigations(page: Page) {
  const navs: string[] = []
  page.on('framenavigated', (frame) => {
    if (frame === page.mainFrame())
      navs.push(frame.url())
  })
  return navs
}

for (const [label, ua] of [['微信', WECHAT_UA], ['企业微信', WECOM_UA]] as const) {
  test.describe(`${label}内置浏览器`, () => {
    test.use({ userAgent: ua })

    test('未登录只跳一次登录页，且可以正常登录', async ({ page }) => {
      const navs = collectNavigations(page)

      await page.goto('./', { waitUntil: 'domcontentloaded' })
      await page.waitForTimeout(3000)

      // 修复前这里会是上百次；出现回环时用例会带上完整跳转链便于排查
      expect(navs.length, `跳转次数异常：${navs.join(' -> ')}`).toBeLessThan(6)
      await expect(page).toHaveURL(/pages\/login\/index/)
      await expect(page.getByText('演示环境')).toBeVisible()
      await expect(page.locator('input')).toHaveCount(2)

      await page.getByText('登 录', { exact: false }).first().click()
      await page.waitForURL(/pages\/index\/index/, { timeout: 20_000 })
      await expect(page.getByText('待办事项')).toBeVisible()

      expect(navs.length).toBeLessThan(10)
    })
  })
}
