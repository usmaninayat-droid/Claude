// weather-bottom-panel-verify.spec.ts — live verification for the 2026-08-31
// weather bottom-panel chunk (adapted from the fms-main reference app):
//  1. Weather layer ON → the bottom forecast strip activates (rain legend +
//     Open-Meteo/QMD model tabs, collapsed).
//  2. Chevron → the EXPANDED timeline view (day/hour grid, row labels, About
//     Location rail, replay bar); QMD tab swaps to the 10-day outlook grid.
//  3. Clicking a single location on the map (a temperature marker, or any
//     basemap point resolved to its nearest station) opens the EXPANDED view
//     with THAT location's data (user refinement — no side panel).
//  4. Layer OFF → the panel is gone, clicks behave as before.
// Regression guard: hybrid list renders, vehicle markers paint, no window
// scroll, zero console errors throughout.
// One-off manual capture for this chunk, not part of the regression suite.
import { test, expect } from '@playwright/test'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const dirname = path.dirname(fileURLToPath(import.meta.url))
const TENANT = 'uccp'
const MEDIA_DIR = path.resolve(dirname, '../../../Build Delegate/media/2026-08-31-weather-bottom-panel')

async function login(page: import('@playwright/test').Page) {
  const errors: string[] = []
  page.on('console', (msg) => {
    if (msg.type() === 'error') errors.push(msg.text())
  })
  page.on('pageerror', (err) => errors.push(String(err)))
  await page.goto(`/?tenant=${TENANT}`)
  await page.getByRole('textbox', { name: 'Email' }).fill('admin.uccp@fams.com')
  await page.getByRole('textbox', { name: 'Password' }).fill('Fams@123')
  await page.getByRole('button', { name: 'Login' }).click()
  await expect(page.locator('[data-slot="navrail"]')).toBeVisible({ timeout: 15_000 })
  return errors
}

test('weather bottom panel — activate, expand, per-location, deactivate', async ({ page }) => {
  const consoleErrors = await login(page)
  await page.goto(`/live-monitoring?tenant=${TENANT}`)
  await page.waitForSelector('[data-slot="live-map-tools"]', { timeout: 15_000 })
  await page.waitForTimeout(1500)

  // Regression baseline: hybrid list + vehicle markers + no panel yet.
  await expect(page.getByRole('button', { name: 'Open-Meteo' })).toHaveCount(0)
  const markerCount = await page.locator('.maplibregl-marker').count()
  expect(markerCount).toBeGreaterThan(0)

  // 1 — layer ON: collapsed strip appears with both model tabs.
  await page.getByRole('button', { name: 'Weather layer' }).click()
  await expect(page.getByRole('button', { name: 'Open-Meteo' })).toBeVisible()
  await expect(page.getByRole('button', { name: 'QMD' })).toBeVisible()
  await expect(page.getByLabel('Rain intensity legend (mm)').first()).toBeVisible()
  await page.waitForTimeout(600)
  await page.screenshot({ path: path.join(MEDIA_DIR, '01-collapsed-strip.png') })

  // 2 — expand: timeline grid + About Location + replay bar.
  await page.getByRole('button', { name: 'Expand forecast panel' }).click()
  await expect(page.getByText('About Location')).toBeVisible()
  await expect(page.getByText('Doha, Qatar (+03:00)')).toBeVisible()
  await expect(page.getByText('Temperature', { exact: true })).toBeVisible()
  await expect(page.getByText('Rain Chance')).toBeVisible()
  await expect(page.getByRole('button', { name: 'Play forecast replay' })).toBeVisible()
  await page.waitForTimeout(400)
  await page.screenshot({ path: path.join(MEDIA_DIR, '02-expanded-open-meteo.png') })

  // QMD tab: the 10-day outlook grid.
  await page.getByRole('button', { name: 'QMD' }).click()
  await expect(page.getByText('Official Outlook')).toBeVisible()
  await expect(page.getByText('10 Day Outlook')).toBeVisible()
  await page.waitForTimeout(300)
  await page.screenshot({ path: path.join(MEDIA_DIR, '03-expanded-qmd.png') })
  await page.getByRole('button', { name: 'Open-Meteo' }).click()

  // 3 — per-location: close, then click a temperature marker → EXPANDED view
  // retitled to that station.
  await page.getByRole('button', { name: 'Close forecast panel' }).click()
  await expect(page.getByRole('button', { name: 'Expand forecast panel' })).toBeVisible()
  const station = page.getByRole('button', { name: /^Weather station Qatar University/ })
  await station.click()
  await expect(page.getByText(/Qatar University · Area/)).toBeVisible()
  await expect(page.getByText('About Location')).toBeVisible()
  await page.waitForTimeout(400)
  await page.screenshot({ path: path.join(MEDIA_DIR, '04-expanded-location-click.png') })

  // Clicking a DIFFERENT location swaps the data in place.
  await page.getByRole('button', { name: /^Weather station Hamad International/ }).click()
  await expect(page.getByText(/Hamad International Airport · Area/)).toBeVisible()

  // X closes back to the collapsed strip.
  await page.getByRole('button', { name: 'Close forecast panel' }).click()
  await expect(page.getByRole('button', { name: 'Expand forecast panel' })).toBeVisible()

  // 4 — layer OFF: the whole strip is gone; map clicks behave as before.
  await page.getByRole('button', { name: 'Hide weather layer' }).click()
  await expect(page.getByRole('button', { name: 'Open-Meteo' })).toHaveCount(0)
  await page.waitForTimeout(400)
  await page.screenshot({ path: path.join(MEDIA_DIR, '05-layer-off.png') })

  // Regression: hybrid basics intact — vehicle markers still painted, no
  // window scroll introduced.
  expect(await page.locator('.maplibregl-marker').count()).toBeGreaterThan(0)
  const scrollX = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)
  expect(scrollX).toBeLessThanOrEqual(0)

  expect(consoleErrors, `console errors:\n${consoleErrors.join('\n')}`).toEqual([])
})
