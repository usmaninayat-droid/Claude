// attribution-hide-verify.spec.ts — one-off verification for the 2026-08-31
// central attribution-hide fix: `MapPanel`'s `attribution` prop now defaults
// to `hidden` (was `visible`), so the "OpenFreeMap © OpenMapTiles Data from
// OpenStreetMap" credit line no longer paints on any MapLibre-backed map, and
// the Operations Center cockpit's embedded Leaflet map now boots with
// `attributionControl: false`. Not part of the regression suite (verify-adhoc
// project, matches *-verify.spec.ts) — a manual capture, run once for this
// chunk.
import { test, expect, type Page } from '@playwright/test'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const dirname = path.dirname(fileURLToPath(import.meta.url))
const TENANT = 'uccp'
const EMAIL = 'admin.uccp@fams.com'
const PASSWORD = 'Fams@123'
const MEDIA_DIR = path.resolve(dirname, '../../../Build Delegate/media/2026-08-31-attribution-hide')

const ATTRIBUTION_RE = /OpenFreeMap|OpenMapTiles|OpenStreetMap/i

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

/** Fails the assertion if the OSM/OpenFreeMap credit line is anywhere in the DOM. */
async function expectNoAttribution(page: Page, label: string) {
  await expect(page.locator('body'), `${label}: attribution text must not be visible`).not.toContainText(
    ATTRIBUTION_RE,
  )
  const count = await page.locator('.maplibregl-ctrl-attrib, .leaflet-control-attribution').count()
  expect(count, `${label}: no attribution control DOM node should be mounted`).toBe(0)
}

test.describe('map attribution hidden app-wide — verify', () => {
  test('Live Monitoring hybrid map — no attribution', async ({ page }) => {
    const errors = await login(page)
    await page.goto(`/live-monitoring?tenant=${TENANT}`)
    await page.waitForSelector('.maplibregl-canvas', { timeout: 20_000 })
    await page.waitForTimeout(1200)
    await expectNoAttribution(page, 'Live Monitoring')
    await page.screenshot({ path: path.join(MEDIA_DIR, '01-live-monitoring.png'), fullPage: false })
    expect(errors, `console/page errors: ${errors.join(' | ')}`).toEqual([])
  })

  test('Weather Stations hybrid map — no attribution', async ({ page }) => {
    const errors = await login(page)
    await page.goto(`/rain-sensors?tenant=${TENANT}`)
    // Module opens on its List View tab; the map only mounts on Hybrid View.
    await page.getByRole('tab', { name: 'Hybrid View' }).click()
    await page.waitForSelector('.maplibregl-canvas', { timeout: 20_000 })
    await page.waitForTimeout(1200)
    await expectNoAttribution(page, 'Weather Stations')
    await page.screenshot({ path: path.join(MEDIA_DIR, '02-weather-stations.png'), fullPage: false })
    expect(errors, `console/page errors: ${errors.join(' | ')}`).toEqual([])
  })

  test('Incidents hybrid map — no attribution', async ({ page }) => {
    const errors = await login(page)
    await page.goto(`/incidents?tenant=${TENANT}`)
    // Module opens on its List View tab; the map only mounts on Hybrid View.
    await page.getByRole('tab', { name: 'Hybrid View' }).click()
    await page.waitForSelector('.maplibregl-canvas', { timeout: 20_000 })
    await page.waitForTimeout(1200)
    await expectNoAttribution(page, 'Incidents')
    await page.screenshot({ path: path.join(MEDIA_DIR, '03-incidents.png'), fullPage: false })
    expect(errors, `console/page errors: ${errors.join(' | ')}`).toEqual([])
  })

  test('Tanker detail sheet — Trips tab map — no attribution', async ({ page }) => {
    const errors = await login(page)
    await page.goto(`/live-monitoring?tenant=${TENANT}`)
    await page.getByRole('tab', { name: 'List View' }).click()
    await page.waitForSelector('table tbody tr')
    await page.locator('table tbody tr').first().click()
    await expect(page.locator('[data-slot="profile-stack"]')).toBeVisible({ timeout: 20_000 })
    await page.getByRole('tab', { name: 'Trips' }).click({ force: true })
    await page.waitForSelector('.maplibregl-canvas', { timeout: 20_000 })
    await page.waitForTimeout(1200)
    await expectNoAttribution(page, 'Tanker detail — Trips tab')
    await page.screenshot({ path: path.join(MEDIA_DIR, '04-tanker-detail-trips.png'), fullPage: true })
    expect(errors, `console/page errors: ${errors.join(' | ')}`).toEqual([])
  })

  // NOTE: "Smart Planning" (and "Plan Monitoring") do NOT render `MapPanel` —
  // demo/seams.tsx's `makeImplementations` replaces their blueprint-composed
  // body with a separate iframe-isolated bundle
  // (`tenants/uccp/overrides/screens/planning-v2/`, its own Vite dev server on
  // :6370, CARTO-tiled Leaflet, own vendored `leaflet-map.tsx`). That bundle
  // is under active concurrent edit in this cycle (App.tsx/styles.css/seed
  // files all mid-flight) — out of this fix's scope to touch. This capture
  // documents current state only; it is NOT asserted attribution-free.
  test('Smart Planning (planning-v2 iframe) — document current attribution state', async ({ page }) => {
    await login(page)
    await page.goto(`/smart-planning?tenant=${TENANT}`)
    const frame = page.frameLocator('iframe[title="Smart Planning"]')
    await frame.locator('body').waitFor({ timeout: 20_000 })
    await page.waitForTimeout(1500)
    const attribCount = await frame.locator('.leaflet-control-attribution').count()
    test.info().annotations.push({
      type: 'note',
      description: `planning-v2 iframe Leaflet attribution control count: ${attribCount} (out of scope — separate bundle, not MapPanel-driven, under concurrent edit)`,
    })
    await page.screenshot({ path: path.join(MEDIA_DIR, '05-smart-planning.png'), fullPage: false })
  })

  test('Operations Center cockpit (embedded Leaflet) — no attribution', async ({ page }) => {
    const errors = await login(page)
    await page.goto(`/operations-center?tenant=${TENANT}`)
    const frame = page.frameLocator('iframe[title="Operations Center (Dispatcher Cockpit)"]')
    await frame.locator('.leaflet-container').waitFor({ timeout: 20_000 })
    await page.waitForTimeout(1200)
    // The credit text lives inside the iframe's own document — check both the
    // host page (nothing should leak into the shell) and the iframe body.
    await expectNoAttribution(page, 'Operations Center (host shell)')
    const iframeBodyText = await frame.locator('body').innerText()
    expect(iframeBodyText, 'Operations Center cockpit iframe body').not.toMatch(ATTRIBUTION_RE)
    const attribCount = await frame.locator('.leaflet-control-attribution').count()
    expect(attribCount, 'Operations Center cockpit: no Leaflet attribution control mounted').toBe(0)
    await page.screenshot({ path: path.join(MEDIA_DIR, '06-operations-center.png'), fullPage: false })
    expect(errors, `console/page errors: ${errors.join(' | ')}`).toEqual([])
  })
})
