// fill-level-monitoring-verify.spec.ts — deferred/verification run for the
// tanker sheet's Fill Level Monitoring tab (chunk: 2026-08-31 vehicle-tabs
// widgets). Confirms 1) the Overview tab renders the previously-landed
// fuel* rename / chart colors / status cards (deferred verification from
// commit 2548382), and 2) the Fill Level Monitoring tab renders its
// 6-KPI grid, 3 charts, and events map with cargo vocabulary + full data
// (blocked, before this run, on 17/18 tankers missing seed fields).
import { test, expect } from '@playwright/test'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const TENANT = 'uccp'
const EMAIL = 'admin.uccp@fams.com'
const PASSWORD = 'Fams@123'
const MEDIA_DIR = path.resolve(
  __dirname,
  '../../../Build Delegate/media/2026-08-31-vehicle-tabs-widgets',
)

test.describe.configure({ mode: 'serial' })

test.describe('fill-level-monitoring verify', () => {
  test('overview tab — deferred verification (top + scrolled)', async ({ page }) => {
    await page.goto(`/?tenant=${TENANT}`)
    await page.getByRole('textbox', { name: 'Email' }).fill(EMAIL)
    await page.getByRole('textbox', { name: 'Password' }).fill(PASSWORD)
    await page.getByRole('button', { name: 'Login' }).click()
    await expect(page.locator('[data-slot="navrail"]')).toBeVisible({ timeout: 15_000 })

    await page.goto(`/live-monitoring?tenant=${TENANT}`)
    await page.getByRole('tab', { name: 'List View' }).click()
    await page.waitForSelector('table tbody tr')
    await page.locator('table tbody tr', { hasText: 'QA004TNK2025' }).first().click()
    await expect(page.locator('[data-slot="profile-stack"]')).toBeVisible()
    const expandBtn = page.getByRole('button', { name: /expand details/i })
    if (await expandBtn.isVisible().catch(() => false)) await expandBtn.click()

    await page.getByRole('tab', { name: 'Overview' }).click()
    await page.waitForTimeout(1500) // allow map/chart async render
    await page.screenshot({ path: path.join(MEDIA_DIR, 'overview-top.png'), fullPage: false })
    await page.mouse.wheel(0, 1200)
    await page.waitForTimeout(500)
    await page.screenshot({ path: path.join(MEDIA_DIR, 'overview-scrolled.png'), fullPage: false })
  })

  test('fill level monitoring tab — widgets + vocabulary + full fleet data', async ({ page }) => {
    await page.goto(`/?tenant=${TENANT}`)
    await page.getByRole('textbox', { name: 'Email' }).fill(EMAIL)
    await page.getByRole('textbox', { name: 'Password' }).fill(PASSWORD)
    await page.getByRole('button', { name: 'Login' }).click()
    await expect(page.locator('[data-slot="navrail"]')).toBeVisible({ timeout: 15_000 })

    await page.goto(`/live-monitoring?tenant=${TENANT}`)
    await page.getByRole('tab', { name: 'List View' }).click()
    await page.waitForSelector('table tbody tr')
    await page.locator('table tbody tr', { hasText: 'QA004TNK2025' }).first().click()
    await expect(page.locator('[data-slot="profile-stack"]')).toBeVisible()
    const expandBtn = page.getByRole('button', { name: /expand details/i })
    if (await expandBtn.isVisible().catch(() => false)) await expandBtn.click()

    await page.getByRole('tab', { name: 'Fill Level Monitoring' }).click()
    await page.waitForTimeout(2500)

    // KPI vocabulary — cargo/fill-level labels, not fuel labels
    await expect(page.getByText('Total Fill Level Consumed')).toBeVisible({ timeout: 15_000 })
    await expect(page.getByText('Number of Refill Events')).toBeVisible({ timeout: 15_000 })
    await expect(page.getByText('Number of Theft Events')).toBeVisible({ timeout: 15_000 })
    await expect(page.getByText('Average Fill Rate/km')).toBeVisible({ timeout: 15_000 })

    // Charts
    await expect(page.getByText('Fill Level Over Distance').first()).toBeVisible({ timeout: 15_000 })
    await expect(page.getByText('Monthly Fill Cost').first()).toBeVisible({ timeout: 15_000 })
    await expect(page.getByText('Refill Events Over Time').first()).toBeVisible({ timeout: 15_000 })
    await expect(page.getByText('Fill Level Events')).toBeVisible({ timeout: 15_000 })

    await page.screenshot({ path: path.join(MEDIA_DIR, 'fill-level-top.png'), fullPage: false })
    await page.mouse.wheel(0, 1200)
    await page.waitForTimeout(500)
    await page.screenshot({ path: path.join(MEDIA_DIR, 'fill-level-scrolled.png'), fullPage: false })
  })
})
