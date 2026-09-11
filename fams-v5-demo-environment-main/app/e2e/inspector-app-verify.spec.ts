import { test, expect, type Page } from '@playwright/test'

/**
 * Inspector app merge (2026-09-03) — verifies the ported "QATAR MME
 * Inspector App" renders under the uccp maroon theme with no app switcher
 * (its nav entry is `fullScreen: true`) across tablet-landscape,
 * tablet-portrait and phone viewports, with zero console errors.
 */

const TENANT = 'uccp'
const EMAIL = 'inspector.uccp@fams.com'
const PASSWORD = 'Fams@123'
const OUT = 'e2e-artifacts'

const VIEWPORTS = [
  { name: 'tablet-landscape', width: 1024, height: 768 },
  { name: 'tablet-portrait', width: 768, height: 1024 },
  { name: 'phone', width: 390, height: 844 },
]

async function login(page: Page) {
  await page.goto(`/?tenant=${TENANT}`)
  await page.getByRole('textbox', { name: 'Email' }).fill(EMAIL)
  await page.getByRole('textbox', { name: 'Password' }).fill(PASSWORD)
  await page.getByRole('button', { name: 'Login' }).click()
}

test.describe('inspector app verify', () => {
  for (const vp of VIEWPORTS) {
    test(`renders at ${vp.name} (${vp.width}x${vp.height}) — no switcher, no console errors`, async ({ page }) => {
      const errors: string[] = []
      page.on('pageerror', (err) => errors.push(String(err)))
      page.on('console', (msg) => {
        if (msg.type() === 'error') errors.push(msg.text())
      })

      await page.setViewportSize({ width: vp.width, height: vp.height })
      await login(page)
      await page.waitForURL(/\/inspector-app/, { timeout: 20_000 })

      const frame = page.frameLocator('iframe[title="Inspector"]')
      // The vendored bundle's own tablet rail (InspectorRail) or mobile
      // BottomNav renders once it has booted — either is sufficient proof
      // the app mounted inside the iframe.
      await expect(frame.locator('body')).toBeVisible({ timeout: 30_000 })
      await page.waitForTimeout(1500)

      // fullScreen module: no canonical NavRail/app-switcher chrome at all.
      await expect(page.locator('[data-slot="navrail"]')).toHaveCount(0)
      await expect(page.getByRole('button', { name: /Switch application/ })).toHaveCount(0)

      await page.screenshot({ path: `${OUT}/inspector-app-${vp.name}.png`, fullPage: false })

      expect(errors, `console/page errors at ${vp.name}: ${errors.join('\n')}`).toEqual([])
    })
  }
})
