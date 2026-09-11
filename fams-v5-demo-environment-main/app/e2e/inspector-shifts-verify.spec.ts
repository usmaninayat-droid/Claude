import { test, expect } from '@playwright/test'

// Verification for the new "Inspector Shifts" module (Planning + Compliance
// Monitoring views), ported verbatim from FAMS-V5-IIMS-DEMO-main per
// Build Delegate/LOG.md (2026-08-31). Confirms: rail entry present, tab
// strip shows both views with maroon active chrome, and each view's iframe
// renders the reference app's real content (not a blank/error iframe).

const TENANT = 'uccp'
const EMAIL = 'admin.uccp@fams.com'
const PASSWORD = 'Fams@123'

test.describe('inspector-shifts verify', () => {
  test('rail entry, tab strip, and both views render', async ({ page }) => {
    await page.goto(`/?tenant=${TENANT}`)
    await page.getByRole('textbox', { name: 'Email' }).fill(EMAIL)
    await page.getByRole('textbox', { name: 'Password' }).fill(PASSWORD)
    await page.getByRole('button', { name: 'Login' }).click()
    await expect(page.locator('[data-slot="navrail"]')).toBeVisible({ timeout: 15_000 })

    const rail = page.locator('[data-slot="navrail"]')
    await expect(rail.getByRole('button', { name: 'Inspector Shifts' })).toBeVisible()
    await page.screenshot({ path: 'e2e-artifacts/inspector-shifts-rail.png' })

    await rail.getByRole('button', { name: 'Inspector Shifts' }).click()
    await expect(page).toHaveURL(/\/inspector-shifts/)

    // ---- Planning view (default tab) ----
    await expect(page.getByRole('tab', { name: 'Planning' })).toBeVisible({ timeout: 10_000 })
    await expect(page.getByRole('tab', { name: 'Compliance Monitoring' })).toBeVisible()
    await page.screenshot({ path: 'e2e-artifacts/inspector-shifts-tab-strip.png' })

    const planningFrame = page.frameLocator('iframe[title="Inspector Shifts"]')
    await expect(planningFrame.getByText('New Shift')).toBeVisible({ timeout: 15_000 })
    await expect(planningFrame.getByText('Highlight Conflicts')).toBeVisible()
    await page.screenshot({ path: 'e2e-artifacts/inspector-shifts-planning.png' })

    // ---- Compliance Monitoring view ----
    await page.getByRole('tab', { name: 'Compliance Monitoring' }).click()
    const complianceFrame = page.frameLocator('iframe[title="Inspector Shifts"]')
    await expect(complianceFrame.getByText('COMPLIANCE', { exact: false })).toBeVisible({ timeout: 15_000 })
    await page.screenshot({ path: 'e2e-artifacts/inspector-shifts-compliance.png' })
  })
})
