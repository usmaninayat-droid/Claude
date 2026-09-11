// weather-overlay-removal-verify.spec.ts — one-off verification for the
// 2026-08-31 fix wave: (1) the weather layer's Temperature legend card and
// its Stations/Rain Heat-map/Clouds/Precipitation checkbox bar are removed;
// (2) the weather + incidents map-tool buttons moved below POI/Zone in the
// floating actions stack (POI/Zone moved up). Not part of the regression
// suite — a manual capture, run once for this chunk.
import { test, expect } from '@playwright/test'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const dirname = path.dirname(fileURLToPath(import.meta.url))
const TENANT = 'uccp'
const EMAIL = 'admin.uccp@fams.com'
const PASSWORD = 'Fams@123'
const MEDIA_DIR = path.resolve(
  dirname,
  '../../../Build Delegate/media/2026-08-31-weather-overlay-removal',
)

async function login(page: import('@playwright/test').Page) {
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

test.describe('weather overlay removal + actions stack reorder — verify', () => {
  test('Live Monitoring — weather layer chrome removed, stack reordered', async ({ page }) => {
    const consoleErrors = await login(page)
    await page.goto(`/live-monitoring?tenant=${TENANT}`)
    await page.waitForSelector('[data-slot="live-map-tools"]', { timeout: 15_000 })

    // Baseline: weather layer OFF.
    await page.waitForTimeout(1000)
    await page.screenshot({ path: path.join(MEDIA_DIR, '01-live-monitoring-weather-off.png'), fullPage: false })

    // Actions stack order top→bottom on the top-end column: layers, traffic,
    // poi, zones, weather, incidents. Confirm POI/Zone now sit ABOVE
    // weather/incidents.
    const endStack = page.locator('[data-slot="live-map-end-tools"]')
    await expect(endStack).toBeVisible()
    const poiBox = await page.locator('[data-slot="live-map-poi"]').boundingBox()
    const zonesBox = await page.locator('[data-slot="live-map-zones"]').boundingBox()
    const weatherBox = await page.locator('[data-slot="live-map-weather"]').boundingBox()
    const incidentsBox = await page.locator('[data-slot="live-map-incidents"]').boundingBox()
    expect(poiBox && zonesBox && weatherBox && incidentsBox).toBeTruthy()
    // POI/Zone strictly above Weather/Incidents.
    expect(poiBox!.y).toBeLessThan(weatherBox!.y)
    expect(poiBox!.y).toBeLessThan(incidentsBox!.y)
    expect(zonesBox!.y).toBeLessThan(weatherBox!.y)
    expect(zonesBox!.y).toBeLessThan(incidentsBox!.y)
    // POI above Zones, Weather above Incidents (internal order preserved).
    expect(poiBox!.y).toBeLessThan(zonesBox!.y)
    expect(weatherBox!.y).toBeLessThan(incidentsBox!.y)

    await endStack.screenshot({ path: path.join(MEDIA_DIR, '02-actions-stack-order.png') })

    // Turn the weather layer on.
    await page.locator('[data-slot="live-map-weather"]').click()
    await page.waitForTimeout(1000)
    await page.screenshot({ path: path.join(MEDIA_DIR, '03-live-monitoring-weather-on.png'), fullPage: false })

    // (1) The Temperature legend card is gone.
    await expect(page.getByText('Temperature', { exact: true })).toHaveCount(0)
    await expect(page.getByText('Below 42', { exact: false })).toHaveCount(0)
    await expect(page.getByText('No reading', { exact: false })).toHaveCount(0)

    // (2) The overlay checkbox bar (Stations/Rain Heat-map/Clouds/
    // Precipitation) is gone.
    await expect(page.getByRole('group', { name: 'Weather overlays' })).toHaveCount(0)
    await expect(page.getByRole('checkbox', { name: 'Stations' })).toHaveCount(0)
    await expect(page.getByRole('checkbox', { name: 'Rain Heat-map' })).toHaveCount(0)
    await expect(page.getByRole('checkbox', { name: 'Clouds' })).toHaveCount(0)
    await expect(page.getByRole('checkbox', { name: 'Precipitation' })).toHaveCount(0)

    // Station markers still render (default: stations visible).
    const stationButtons = page.getByRole('button', { name: /^Weather station/ })
    await expect(stationButtons.first()).toBeVisible({ timeout: 10_000 })
    expect(await stationButtons.count()).toBeGreaterThan(0)

    await page.screenshot({ path: path.join(MEDIA_DIR, '04-weather-on-stations-only.png'), fullPage: false })

    expect(consoleErrors, `console errors: ${consoleErrors.join('\n')}`).toHaveLength(0)
  })
})
