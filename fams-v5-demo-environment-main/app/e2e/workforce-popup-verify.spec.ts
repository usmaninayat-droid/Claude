// workforce-popup-verify.spec.ts — one-off live verification for the
// 2026-08-31 workforce TABBED popup task (Figma 6Twj2L7KPGP5y8unBP9KS6
// 3439:4860/6849/9590): the three workforce states (In Transit / Clocked In /
// grey Not Clocked In) on marker + popup, all three tabs (Overview |
// Critical Events | Shifts), both Shifts row variants, chip-aware filter
// facets (Tanker Type gone; workforce facets under the Workforce universe),
// and workforce markers on the standalone Map View. Not part of the
// regression suite — a manual capture (verify-adhoc project).
import { test, expect, type Page } from '@playwright/test'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const dirname = path.dirname(fileURLToPath(import.meta.url))
const TENANT = 'uccp'
const MEDIA_DIR = path.resolve(dirname, '../../../Build Delegate/media/2026-08-31-workforce-popup')

test.setTimeout(180_000)

async function login(page: Page) {
  const errors: string[] = []
  page.on('console', (msg) => {
    if (msg.type() === 'error') errors.push(msg.text())
  })
  page.on('pageerror', (err) => errors.push(String(err)))
  await page.goto(`/?tenant=${TENANT}`)
  await page.getByRole('textbox', { name: 'Email' }).fill('admin.uccp@fams.com')
  await page.getByRole('textbox', { name: 'Password' }).fill('Fams@123')
  await page.getByRole('button', { name: 'Login' }).click()
  await expect(page.locator('[data-slot="navrail"]')).toBeVisible({ timeout: 30_000 })
  return errors
}

async function shot(page: Page, name: string) {
  await page.screenshot({ path: path.join(MEDIA_DIR, name), fullPage: false })
}

async function openMemberPopup(page: Page, markerName: RegExp) {
  const marker = page.locator('[data-slot="workforce-marker"]', { hasText: '' }).and(page.getByRole('button', { name: markerName }))
  // Overlapping sibling markers can intercept the hit test — dispatch the
  // click straight to the marker button; retry once if a stray map click
  // swallowed the selection toggle.
  const popup = page.locator('[data-slot="vehicle-popup-card"]')
  for (let attempt = 0; attempt < 3; attempt++) {
    await marker.first().dispatchEvent('click')
    try {
      await expect(popup).toBeVisible({ timeout: 4000 })
      return popup
    } catch {
      await page.waitForTimeout(400)
    }
  }
  await expect(popup).toBeVisible({ timeout: 5000 })
  return popup
}

test.describe('workforce tabbed popup — live verify', () => {
  test('three states × three tabs + both Shifts variants + chip-aware facets', async ({ page }) => {
    const errors = await login(page)
    // The app fires its own post-login navigation; let it settle before ours
    // (racing it intermittently interrupts the goto).
    await page.waitForTimeout(1000)
    await page.goto(`/live-monitoring?tenant=${TENANT}`).catch(() => page.goto(`/live-monitoring?tenant=${TENANT}`))
    await page.waitForSelector('.maplibregl-canvas', { timeout: 30_000 })
    await page.waitForTimeout(1200)

    // Workforce universe so all 15 members are on the map.
    const chips = page.locator('[data-slot="live-kind-chips"]')
    await chips.getByRole('radio', { name: 'Workforce' }).click()
    await page.waitForTimeout(800)
    // Individual markers, not clusters, so each member is directly clickable.
    const decluster = page.getByRole('button', { name: 'Disable clustering' })
    if (await decluster.count()) await decluster.click()
    await page.waitForTimeout(600)
    await shot(page, 'live-01-workforce-map-three-states.png')

    // ---- MOVING member (In Transit — Ahmed Khalil) ----
    let popup = await openMemberPopup(page, /Ahmed Khalil — In Transit/)
    await expect(popup.getByText('In Transit')).toBeVisible()
    await shot(page, 'live-02-intransit-overview.png')
    await popup.getByRole('tab', { name: 'Critical Events' }).click()
    await page.waitForTimeout(300)
    await shot(page, 'live-03-intransit-events.png')
    await popup.getByRole('tab', { name: 'Shifts' }).click()
    await page.waitForTimeout(300)
    // Moving variant: A→B rows with Distance metric.
    await expect(popup.getByText('Distance:').first()).toBeVisible()
    await shot(page, 'live-04-intransit-shifts-trip-variant.png')
    await page.keyboard.press('Escape')
    await expect(popup).toBeHidden()

    // ---- STATIC member (Clocked In — Sara Ibrahim) ----
    popup = await openMemberPopup(page, /Sara Ibrahim — Clocked In/)
    await expect(popup.getByText('Clocked In')).toBeVisible()
    await shot(page, 'live-05-clockedin-overview.png')
    await popup.getByRole('tab', { name: 'Critical Events' }).click()
    await page.waitForTimeout(300)
    await shot(page, 'live-06-clockedin-events.png')
    await popup.getByRole('tab', { name: 'Shifts' }).click()
    await page.waitForTimeout(300)
    // Static variant: Total Time metric, no A→B pair.
    await expect(popup.getByText('Total Time:').first()).toBeVisible()
    await shot(page, 'live-07-clockedin-shifts-stay-variant.png')
    await page.keyboard.press('Escape')
    await expect(popup).toBeHidden()

    // ---- GREY member (Not Clocked In — Layla Hassan) ----
    popup = await openMemberPopup(page, /Layla Hassan — Not Clocked In/)
    await expect(popup.getByText('Not Clocked In')).toBeVisible()
    await shot(page, 'live-08-notclockedin-overview.png')
    await popup.getByRole('tab', { name: 'Shifts' }).click()
    await page.waitForTimeout(300)
    await shot(page, 'live-09-notclockedin-shifts.png')
    await page.keyboard.press('Escape')

    // ---- Chip-aware All Filters ----
    // Workforce universe: workforce facets present, vehicle facets gone.
    await page.getByRole('button', { name: /filter/i }).first().click()
    await page.waitForTimeout(400)
    await expect(page.getByText('Workforce Status')).toBeVisible()
    await expect(page.getByText('Tanker Type')).toHaveCount(0)
    await expect(page.getByText('Fuel Type')).toHaveCount(0)
    await shot(page, 'live-10-filters-workforce-universe.png')
    await page.keyboard.press('Escape')
    // Vehicle universe: vehicle facets back, workforce facets gone.
    await chips.getByRole('radio', { name: 'Vehicle' }).click()
    await page.waitForTimeout(400)
    await page.getByRole('button', { name: /filter/i }).first().click()
    await page.waitForTimeout(400)
    await expect(page.getByText('Fuel Type')).toBeVisible()
    await expect(page.getByText('Tanker Type')).toHaveCount(0)
    await expect(page.getByText('Workforce Status')).toHaveCount(0)
    await shot(page, 'live-11-filters-vehicle-universe.png')
    await page.keyboard.press('Escape')

    expect(errors.filter((e) => !e.includes('Outdated Optimize Dep')), `console/page errors: ${errors.join(' | ')}`).toEqual([])
  })

  test('vehicle popup regression + standalone Map View both kinds', async ({ page }) => {
    const errors = await login(page)
    await page.waitForTimeout(1000)
    await page.goto(`/live-monitoring?tenant=${TENANT}`).catch(() => page.goto(`/live-monitoring?tenant=${TENANT}`))
    await page.waitForSelector('.maplibregl-canvas', { timeout: 30_000 })
    await page.waitForTimeout(1200)
    // ---- Vehicle popup zero-regression spot check ----
    await page.waitForTimeout(400)
    const vehicleMarker = page.locator('[data-slot="vehicle-marker"]').first()
    const vehiclePopup = page.locator('[data-slot="vehicle-popup-card"]')
    for (let attempt = 0; attempt < 3; attempt++) {
      await vehicleMarker.dispatchEvent('click')
      try {
        await expect(vehiclePopup).toBeVisible({ timeout: 4000 })
        break
      } catch {
        await page.waitForTimeout(400)
      }
    }
    await expect(vehiclePopup).toBeVisible({ timeout: 5000 })
    await expect(vehiclePopup.getByRole('tab', { name: 'Workforce' })).toBeVisible()
    await shot(page, 'live-12-vehicle-popup-regression-check.png')
    await page.keyboard.press('Escape')

    // ---- Standalone Map View shows BOTH kinds ----
    await page.getByRole('tab', { name: 'Map View' }).click()
    await page.waitForTimeout(1500)
    await expect(page.locator('[data-slot="workforce-marker"]').first()).toBeVisible({ timeout: 15_000 })
    await shot(page, 'live-13-mapview-both-kinds.png')

    expect(errors, `console/page errors: ${errors.join(' | ')}`).toEqual([])
  })
})
