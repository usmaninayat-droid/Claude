import { test, expect } from '@playwright/test'

/**
 * Inspector Shifts — 2026-09-01 change set:
 *   1. "Compliance Monitoring" view hidden (see the module bundle's HIDDEN.md).
 *   2. Seed geography rebased on Qatar, in sync with the Operations Center
 *      zones dataset (Al Wakrah / Al Sadd / Umm Salal / Lusail / West Bay / …).
 *   3. Schedule New Shift uses the DS creation-sheet floating close button
 *      instead of the in-header "X".
 *   4. The "Task" select is gone from the shift form.
 *   5. Sector-map preview uses key-free OSM tiles (no Carto "API KEY REQUIRED").
 *
 * Supersedes inspector-shifts-verify.spec.ts's Compliance Monitoring
 * assertions (that spec predates the hide).
 */

const TENANT = 'uccp'
const EMAIL = 'admin.uccp@fams.com'
const PASSWORD = 'Fams@123'
const OUT = 'e2e-artifacts'

test.describe('inspector-shifts qatar verify', () => {
  test('single Planning view, Qatar lots, floating close, no Task field', async ({ page }) => {
    await page.goto(`/?tenant=${TENANT}`)
    await page.getByRole('textbox', { name: 'Email' }).fill(EMAIL)
    await page.getByRole('textbox', { name: 'Password' }).fill(PASSWORD)
    await page.getByRole('button', { name: 'Login' }).click()
    await expect(page.locator('[data-slot="navrail"]')).toBeVisible({ timeout: 15_000 })

    const rail = page.locator('[data-slot="navrail"]')
    await rail.getByRole('button', { name: 'Inspector Shifts' }).click()
    await expect(page).toHaveURL(/\/inspector-shifts/)

    // ---- (a) view tabs: Planning only, Compliance Monitoring hidden ----
    await expect(page.getByRole('tab', { name: 'Planning' })).toBeVisible({ timeout: 15_000 })
    await expect(page.getByRole('tab', { name: 'Compliance Monitoring' })).toHaveCount(0)
    await page.screenshot({ path: `${OUT}/inspector-shifts-qatar-tabs.png` })

    // ---- (b) Qatar geography in the grid ----
    const frame = page.frameLocator('iframe[title="Inspector Shifts"]')
    await expect(frame.getByRole('button', { name: /New Shift/ })).toBeVisible({ timeout: 20_000 })

    // ---- (c) Schedule New Shift sheet ----
    await frame.getByRole('button', { name: /New Shift/ }).click()
    await expect(frame.getByText('Schedule New Shift')).toBeVisible()
    // Qatar lot + zone name, matching the operations-center zones dataset
    await expect(frame.getByText(/Al Wakrah Industrial 1/).first()).toBeVisible()
    // Floating close button (DS creation-sheet pattern), not an in-header X
    await expect(frame.getByRole('button', { name: 'Close' })).toBeVisible()
    // Map tiles come from the key-free OSM source
    await expect(frame.locator('img.leaflet-tile').first()).toHaveAttribute(
      'src',
      /tile\.openstreetmap\.org/,
    )
    await expect(frame.locator('img[src*="cartocdn.com"]')).toHaveCount(0)

    // ---- (d) no TASK field on Shift Info ----
    await frame.getByRole('button', { name: 'Shift Info' }).click()
    await expect(frame.getByText('Select Inspector').first()).toBeVisible()
    await expect(frame.getByText('Task', { exact: true })).toHaveCount(0)
    await page.screenshot({ path: `${OUT}/inspector-shifts-qatar-sheet.png` })
  })
})
