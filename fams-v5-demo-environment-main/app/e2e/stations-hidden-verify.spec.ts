// stations-hidden-verify.spec.ts — one-off verification for the 2026-08-31
// Weather Stations (rain-sensors) module hide. Not part of the regression
// suite (verify-adhoc project, matches *-verify.spec.ts) — a manual capture
// for Build Delegate/media, run once for this chunk. See
// tenants/uccp/modules/rain-sensors/HIDDEN.md for the hide mechanism and
// one-line re-enable path.
import { test, expect } from '@playwright/test'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const dirname = path.dirname(fileURLToPath(import.meta.url))
const TENANT = 'uccp'
const EMAIL = 'admin.uccp@fams.com'
const PASSWORD = 'Fams@123'
const MEDIA_DIR = path.resolve(dirname, '../../../Build Delegate/media/2026-08-31-stations-hidden')

test('Weather Stations hidden — rail, route, related-field, weather layer', async ({ page }) => {
  test.setTimeout(120_000)
  await page.goto(`/?tenant=${TENANT}`)
  await page.getByRole('textbox', { name: 'Email' }).fill(EMAIL)
  await page.getByRole('textbox', { name: 'Password' }).fill(PASSWORD)
  await page.getByRole('button', { name: 'Login' }).click()
  await expect(page.locator('[data-slot="navrail"]')).toBeVisible({ timeout: 15_000 })

  // ---- 1. Rail: no Weather Stations entry ----
  const rail = page.locator('[data-slot="navrail"]')
  for (const label of ['Live Monitoring', 'Requests & Complaints', 'Plan Monitoring', 'Smart Planning']) {
    await expect(rail.getByRole('button', { name: label })).toBeVisible()
  }
  await expect(rail.getByRole('button', { name: 'Weather Stations' })).toHaveCount(0)
  await page.screenshot({ path: path.join(MEDIA_DIR, '01-rail-no-weather-stations.png'), fullPage: false })

  // ---- 2. Direct /rain-sensors URL does not render the module ----
  await page.goto(`/rain-sensors?tenant=${TENANT}`)
  await expect(page.locator('table')).toHaveCount(0)
  await page.screenshot({ path: path.join(MEDIA_DIR, '02-rain-sensors-route-empty.png'), fullPage: false })

  // ---- 3. Incident detail "Related Weather Station" renders gracefully (plain text, no dead link) ----
  await page.goto(`/incidents?tenant=${TENANT}`)
  await page.getByRole('tab', { name: 'List View' }).click()
  await page.waitForSelector('table tbody tr')
  await page.locator('table tbody tr').first().click()
  await expect(page.locator('[data-slot="profile-stack"]')).toBeVisible({ timeout: 15_000 })
  // No LinkedRecordProvider is wired in this app, so ReadEntityRefMeta
  // (v5-composer/src/fields/registry.tsx) falls back to the plain read
  // renderer app-wide — the field never shows a clickable/dead link into the
  // hidden module, with or without this hide. Screenshot the sheet as-is to
  // document that it renders without error.
  await expect(page.locator('[data-slot="entity-ref-meta"]')).toHaveCount(0)
  await page.screenshot({ path: path.join(MEDIA_DIR, '03-incident-detail-no-dead-link.png'), fullPage: false })
  await page.keyboard.press('Escape')

  // ---- 4. Live Monitoring weather map LAYER (separate feature) still intact ----
  await page.goto(`/live-monitoring?tenant=${TENANT}`)
  await page.getByRole('tab', { name: 'Hybrid View' }).click().catch(() => {})
  await page.waitForSelector('.maplibregl-canvas, .leaflet-container', { timeout: 20_000 })
  await page.waitForTimeout(1000)
  await page.screenshot({ path: path.join(MEDIA_DIR, '04-live-monitoring-weather-layer.png'), fullPage: false })
})
