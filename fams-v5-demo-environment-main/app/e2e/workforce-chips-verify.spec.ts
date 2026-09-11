// workforce-chips-verify.spec.ts — one-off verification for the 2026-08-31
// Live Monitoring "add WORKFORCE alongside vehicles" enhancement: the
// All/Vehicle/Workforce chip row under the list panel's search field, the
// mixed Name·ID·Type·Location list columns, and the vendored workforce
// marker/list-avatar art. Not part of the regression suite (verify-adhoc
// project, matches *-verify.spec.ts) — a manual capture, run once for this
// chunk.
import { test, expect, type Page } from '@playwright/test'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const dirname = path.dirname(fileURLToPath(import.meta.url))
const TENANT = 'uccp'
const EMAIL = 'admin.uccp@fams.com'
const PASSWORD = 'Fams@123'
const MEDIA_DIR = path.resolve(dirname, '../../../Build Delegate/media/2026-08-31-workforce-chips')

async function login(page: Page) {
  const errors: string[] = []
  page.on('console', (msg) => {
    if (msg.type() === 'error') errors.push(msg.text())
  })
  page.on('pageerror', (err) => errors.push(String(err)))
  await page.goto(`/?tenant=${TENANT}`)
  await page.getByRole('textbox', { name: 'Email' }).fill(EMAIL)
  await page.getByRole('textbox', { name: 'Password' }).fill(PASSWORD)
  await page.getByRole('button', { name: 'Login' }).click()
  await expect(page.locator('[data-slot="navrail"]')).toBeVisible({ timeout: 15_000 })
  return errors
}

test.describe('Live Monitoring workforce chips — verify', () => {
  test('hybrid view — chips render, filter map+list, mixed columns, workforce art', async ({ page }) => {
    const errors = await login(page)
    await page.goto(`/live-monitoring?tenant=${TENANT}`)
    await page.waitForSelector('.maplibregl-canvas', { timeout: 20_000 })
    await page.waitForTimeout(1000)

    // Chips render under the search field, default = All.
    const chips = page.locator('[data-slot="live-kind-chips"]')
    await expect(chips).toBeVisible()
    const allChip = chips.getByRole('radio', { name: 'All' })
    const vehicleChip = chips.getByRole('radio', { name: 'Vehicle' })
    const workforceChip = chips.getByRole('radio', { name: 'Workforce' })
    await expect(allChip).toHaveAttribute('aria-checked', 'true')

    // ALL — mixed columns header row shows Name/ID/Type/Location, 33 total rows.
    await expect(page.locator('[data-slot="live-list-panel"]')).toContainText('Showing 33 items')
    const headerRow = page.locator('[data-slot="live-list-panel"] thead')
    await expect(headerRow).toContainText('Name')
    await expect(headerRow).toContainText('ID')
    await expect(headerRow).toContainText('Type')
    await expect(headerRow).toContainText('Location')
    // Both vehicle 3D art and workforce avatar art render in the mixed list.
    await expect(page.locator('[data-slot="live-list-panel"] img[src^="data:image/svg+xml"]').first()).toBeVisible()
    await page.screenshot({ path: path.join(MEDIA_DIR, '01-all-hybrid.png'), fullPage: false })

    // VEHICLE — today's tanker experience: 18 rows, original columns (VEHICLE, not NAME).
    await vehicleChip.click()
    await page.waitForTimeout(400)
    await expect(vehicleChip).toHaveAttribute('aria-checked', 'true')
    await expect(page.locator('[data-slot="live-list-panel"]')).toContainText('Showing 18 items')
    await expect(headerRow).not.toContainText('Name')
    await page.screenshot({ path: path.join(MEDIA_DIR, '02-vehicle-hybrid.png'), fullPage: false })

    // WORKFORCE — 15 rows, mixed columns again, workforce markers on map.
    await workforceChip.click()
    await page.waitForTimeout(400)
    await expect(workforceChip).toHaveAttribute('aria-checked', 'true')
    await expect(page.locator('[data-slot="live-list-panel"]')).toContainText('Showing 15 items')
    await expect(headerRow).toContainText('Name')
    const workforceMarkers = page.locator('[data-slot="workforce-marker"]')
    await expect(workforceMarkers.first()).toBeVisible({ timeout: 10_000 })
    const markerCount = await workforceMarkers.count()
    await page.screenshot({ path: path.join(MEDIA_DIR, '03-workforce-hybrid.png'), fullPage: false })

    // Marker click → the TABBED workforce popup (2026-08-31 workforce-popup
    // task): the same VehiclePopupCard pattern as vehicles, with the
    // Overview | Critical Events | Shifts tab bar.
    await workforceMarkers.first().click()
    const workforcePopup = page.locator('[data-slot="vehicle-popup-card"]')
    await expect(workforcePopup).toBeVisible({ timeout: 5000 })
    await expect(workforcePopup.getByRole('tab', { name: 'Shifts' })).toBeVisible()
    await page.screenshot({ path: path.join(MEDIA_DIR, '04-workforce-marker-card.png'), fullPage: false })

    console.log(`workforce marker count on screen: ${markerCount}`)
    console.log(`console errors: ${errors.length ? errors.join(' | ') : 'none'}`)
    expect(errors, `console/page errors: ${errors.join(' | ')}`).toEqual([])
  })

  test('list-only view — chips + mixed columns independent of hybrid tab', async ({ page }) => {
    const errors = await login(page)
    await page.goto(`/live-monitoring?tenant=${TENANT}`)
    await page.waitForSelector('.maplibregl-canvas', { timeout: 20_000 })
    await page.getByRole('tab', { name: /List View/i }).click()
    await page.waitForTimeout(600)

    const chips = page.locator('[data-slot="live-kind-chips"]')
    await expect(chips).toBeVisible()
    await page.screenshot({ path: path.join(MEDIA_DIR, '05-all-list-only.png'), fullPage: false })

    await chips.getByRole('radio', { name: 'Workforce' }).click()
    await page.waitForTimeout(400)
    await expect(page.locator('text=Showing 15 items')).toBeVisible()
    await page.screenshot({ path: path.join(MEDIA_DIR, '06-workforce-list-only.png'), fullPage: false })

    expect(errors, `console/page errors: ${errors.join(' | ')}`).toEqual([])
  })
})
