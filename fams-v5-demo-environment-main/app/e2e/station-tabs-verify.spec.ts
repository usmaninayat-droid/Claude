// station-tabs-verify.spec.ts — one-off visual verification for the Weather
// Station detail sheet's new full tab set (Overview/Details/Events/Alerts/
// Devices/Documents/Timeline). Screenshots every tab into Build Delegate's
// media checkpoint. Not part of the regression suite (verify-adhoc project,
// matches *-verify.spec.ts) — a manual capture, run once per chunk.
import { test, expect } from '@playwright/test'

const TENANT = 'uccp'
const EMAIL = 'admin.uccp@fams.com'
const PASSWORD = 'Fams@123'
const OUT_DIR = 'e2e-artifacts/2026-08-31-station-tabs'

test('Weather Station sheet — screenshot every tab', async ({ page }) => {
  test.setTimeout(600_000)
  await page.goto(`/?tenant=${TENANT}`)
  await page.getByRole('textbox', { name: 'Email' }).fill(EMAIL)
  await page.getByRole('textbox', { name: 'Password' }).fill(PASSWORD)
  await page.getByRole('button', { name: 'Login' }).click()
  await expect(page.locator('[data-slot="navrail"]')).toBeVisible({ timeout: 60_000 })

  await page.goto(`/rain-sensors?tenant=${TENANT}`)
  await page.getByRole('tab', { name: 'List View' }).click()
  await page.waitForSelector('table tbody tr')
  await page.locator('table tbody tr').first().click()
  await expect(page.locator('[data-slot="profile-stack"]')).toBeVisible({ timeout: 20_000 })

  const tabs = ['Overview', 'Details', 'Events/Alerts', 'Devices', 'Documents', 'Timeline']
  for (const label of tabs) {
    const fname = `${OUT_DIR}/${label.replace(/[\s/]+/g, '-').toLowerCase()}.png`
    for (let attempt = 0; attempt < 4; attempt++) {
      try {
        await page.getByRole('tab', { name: label }).click({ force: true, timeout: 15_000 })
        await page.waitForTimeout(700)
        await page.screenshot({ path: fname, fullPage: true, timeout: 15_000 })
        break
      } catch (err) {
        if (attempt === 3) throw err
        await page.waitForTimeout(1000)
      }
    }
  }
})
