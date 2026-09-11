// planning-topnav-v2-verify.spec.ts — verification for the planning module
// chrome rework (view tabs moved OUT of the iframe into the UCCP shell's
// real ModuleViewShell, superseding the rejected in-iframe skin from
// e7bcf8e). Not part of the regression suite (verify-adhoc project, matches
// *-verify.spec.ts) — a manual capture per the LOG.md entry for
// 2026-08-31 (run 2).
import { test, expect } from '@playwright/test'

const TENANT = 'uccp'
const EMAIL = 'admin.uccp@fams.com'
const PASSWORD = 'Fams@123'
const OUT_DIR =
  'e2e-artifacts/2026-08-31-planning-topnav-v2'

async function login(page: import('@playwright/test').Page) {
  await page.goto(`/?tenant=${TENANT}`)
  await page.getByRole('textbox', { name: 'Email' }).fill(EMAIL)
  await page.getByRole('textbox', { name: 'Password' }).fill(PASSWORD)
  await page.getByRole('button', { name: 'Login' }).click()
  await expect(page.locator('[data-slot="navrail"]')).toBeVisible({ timeout: 60_000 })
}

test('Live Monitoring — reference top nav + tab strip', async ({ page }) => {
  test.setTimeout(180_000)
  await login(page)
  await page.goto(`/live-monitoring?tenant=${TENANT}`)
  await expect(page.locator('[data-slot="module-view-tabs"], [data-slot="module-view-shell"]').first()).toBeVisible({
    timeout: 30_000,
  })
  await page.waitForTimeout(1500)
  await page.screenshot({ path: `${OUT_DIR}/live-monitoring.png`, fullPage: false })
})

test('Smart Planning — real ModuleViewShell chrome, maroon active tab', async ({ page }) => {
  test.setTimeout(180_000)
  await login(page)
  await page.goto(`/smart-planning?tenant=${TENANT}`)
  const shell = page.locator('[data-slot="module-view-shell"]')
  await expect(shell).toBeVisible({ timeout: 30_000 })
  // Real shell chrome, not an in-iframe imitation: the tab strip must exist
  // OUTSIDE any iframe boundary.
  await expect(page.locator('[data-slot="module-view-tabs"]').first()).toBeVisible()
  const frame = page.frameLocator('iframe').first()
  await expect(frame.locator('body')).toBeVisible({ timeout: 30_000 })
  await page.waitForTimeout(1500)
  await page.screenshot({ path: `${OUT_DIR}/smart-planning-hybrid.png`, fullPage: false })

  // Tab switch drives the embedded app's view via the shell, not an
  // in-iframe control.
  await page.getByRole('tab', { name: 'Calendar View' }).click()
  await page.waitForTimeout(1500)
  await expect(frame.locator('body')).toBeVisible({ timeout: 30_000 })
  await page.screenshot({ path: `${OUT_DIR}/smart-planning-calendar.png`, fullPage: false })
})

test('Plan Monitoring — real ModuleViewShell chrome', async ({ page }) => {
  test.setTimeout(180_000)
  await login(page)
  await page.goto(`/plan-monitoring?tenant=${TENANT}`)
  const shell = page.locator('[data-slot="module-view-shell"]')
  await expect(shell).toBeVisible({ timeout: 30_000 })
  await expect(page.locator('[data-slot="module-view-tabs"]').first()).toBeVisible()
  const frame = page.frameLocator('iframe').first()
  await expect(frame.locator('body')).toBeVisible({ timeout: 30_000 })
  await page.waitForTimeout(1500)
  await page.screenshot({ path: `${OUT_DIR}/plan-monitoring.png`, fullPage: false })
})
