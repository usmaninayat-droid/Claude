// rain-first-weather-verify.spec.ts — live verification for the 2026-08-31
// rain-first weather layer (NEXT-weather-rain-data.md):
//  1. Map markers show current RAIN (mm), not temperature, coloured by the
//     precipitation scale — extreme "30+" cap, dry "0" clean, gray "No
//     reading" for a sensor gap.
//  2. Selection dimming: focusing one location (expanded panel showing it)
//     dims every OTHER weather marker to 40% opacity; the selected marker
//     and every non-weather marker stay full; X/close restores 100%.
//  3. Both forecast models (Open-Meteo hourly, QMD 10-day) carry rain data
//     for an extreme, a moderate, and a dry station.
// One-off manual capture for this chunk, not part of the regression suite.
import { test, expect } from '@playwright/test'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const dirname = path.dirname(fileURLToPath(import.meta.url))
const TENANT = 'uccp'
const MEDIA_DIR = path.resolve(dirname, '../../../Build Delegate/media/2026-08-31-rain-first-weather')

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

test('rain-first weather layer — markers, edge cases, selection dimming, both models', async ({ page }) => {
  const consoleErrors = await login(page)
  await page.goto(`/live-monitoring?tenant=${TENANT}`)
  await page.waitForSelector('[data-slot="live-map-tools"]', { timeout: 15_000 })
  await page.waitForTimeout(1000)

  await page.getByRole('button', { name: 'Weather layer' }).click()
  await page.waitForTimeout(500)

  // ── 1. Markers show mm, matching the seed, per edge case ────────────────
  const extreme = page.getByRole('button', { name: /^Weather station Al Shamal/ })
  const moderate = page.getByRole('button', { name: /^Weather station Lusail/ })
  const dry = page.getByRole('button', { name: /^Weather station Dukhan/ })
  const noReading = page.getByRole('button', { name: /^Weather station Al Ruwais/ })
  const heavy = page.getByRole('button', { name: /^Weather station Al Khor(?! Community)/ })

  // Seed: Al Shamal rainfallMm 32.3 → capped display "30+".
  await expect(extreme).toHaveAccessibleName(/30\+ mm rain/)
  await expect(extreme).toHaveText('30+')
  // Seed: Lusail rainfallMm 5 (moderate band).
  await expect(moderate).toHaveAccessibleName(/5 mm rain/)
  await expect(moderate).toHaveText('5')
  // Seed: Dukhan rainfallMm 0 (dry) — renders cleanly, not "0.0".
  await expect(dry).toHaveAccessibleName(/0 mm rain/)
  await expect(dry).toHaveText('0')
  // Seed: Al Ruwais — no reading at all (sensor gap), gray "–" convention.
  await expect(noReading).toHaveAccessibleName(/no reading/)
  await expect(noReading).toHaveText('–')
  await expect(heavy).toHaveAccessibleName(/14\.7 mm rain/)

  await page.waitForTimeout(300)
  await page.screenshot({ path: path.join(MEDIA_DIR, '01-markers-rain-mm-overview.png') })

  // Band colours differ (data-band attribute) across the edge cases.
  const bandOf = (loc: import('@playwright/test').Locator) => loc.getAttribute('data-band')
  expect(await bandOf(extreme)).toBe('extreme')
  expect(await bandOf(moderate)).toBe('moderate')
  expect(await bandOf(dry)).toBe('calm')
  expect(await bandOf(noReading)).toBe('unknown')
  expect(await bandOf(heavy)).toBe('heavy')

  // ── 2. Selection dimming — before any focus, every marker is full strength.
  const allMarkers = page.getByRole('button', { name: /^Weather station/ })
  const opacityOf = async (loc: import('@playwright/test').Locator) =>
    loc.evaluate((el) => getComputedStyle(el).opacity)
  expect(await opacityOf(extreme)).toBe('1')
  expect(await opacityOf(moderate)).toBe('1')

  // Focus the extreme station: its expanded panel opens. Al Shamal sits at
  // the far north of the seed's geography and can fall outside the map's
  // default viewport at this zoom — `force` clicks the DOM element directly
  // (same as a real click event) rather than requiring it on-screen.
  await extreme.evaluate((el) => (el as HTMLElement).click())
  await page.waitForTimeout(500)
  await expect(page.getByText(/Al Shamal · Area/)).toBeVisible()
  await expect(page.getByRole('button', { name: 'Close forecast panel' })).toBeVisible()

  // Selected marker stays full strength; every OTHER weather marker dims to 0.4.
  expect(await opacityOf(extreme)).toBe('1')
  expect(await opacityOf(moderate)).toBe('0.4')
  expect(await opacityOf(dry)).toBe('0.4')
  expect(await opacityOf(noReading)).toBe('0.4')
  // Vehicle markers are untouched by weather-layer dimming.
  const vehicleMarker = page.locator('[data-slot="vehicle-marker"]').first()
  if (await vehicleMarker.count()) {
    expect(await vehicleMarker.evaluate((el) => getComputedStyle(el).opacity)).toBe('1')
  }
  await page.waitForTimeout(300)
  await page.screenshot({ path: path.join(MEDIA_DIR, '02-selection-dimming-extreme-focused.png') })

  // ── 3a. Extreme station's expanded panel — both models ──────────────────
  await expect(page.getByText('About Location')).toBeVisible()
  await expect(page.getByText('Rain', { exact: true }).first()).toBeVisible()
  await page.waitForTimeout(300)
  await page.screenshot({ path: path.join(MEDIA_DIR, '03-expanded-extreme-open-meteo.png') })
  await page.getByRole('button', { name: 'QMD' }).click()
  await expect(page.getByText('Official Outlook')).toBeVisible()
  await expect(page.getByText('Rain', { exact: true }).first()).toBeVisible()
  await page.waitForTimeout(300)
  await page.screenshot({ path: path.join(MEDIA_DIR, '04-expanded-extreme-qmd.png') })
  await page.getByRole('button', { name: 'Open-Meteo' }).click()

  // ── restore-on-close: X returns every marker to 100% ─────────────────────
  await page.getByRole('button', { name: 'Close forecast panel' }).click()
  await page.waitForTimeout(400)
  const count = await allMarkers.count()
  for (let i = 0; i < count; i++) {
    expect(await opacityOf(allMarkers.nth(i))).toBe('1')
  }
  await page.screenshot({ path: path.join(MEDIA_DIR, '05-selection-dimming-restored.png') })

  // ── 3b. Moderate station's expanded panel — both models ─────────────────
  await moderate.evaluate((el) => (el as HTMLElement).click())
  await page.waitForTimeout(400)
  await expect(page.getByText(/Lusail · Area/)).toBeVisible()
  await page.screenshot({ path: path.join(MEDIA_DIR, '06-expanded-moderate-open-meteo.png') })
  await page.getByRole('button', { name: 'QMD' }).click()
  await page.waitForTimeout(300)
  await page.screenshot({ path: path.join(MEDIA_DIR, '07-expanded-moderate-qmd.png') })
  await page.getByRole('button', { name: 'Open-Meteo' }).click()
  await page.getByRole('button', { name: 'Close forecast panel' }).click()
  await page.waitForTimeout(300)

  // ── 3c. Dry station's expanded panel — both models ───────────────────────
  await dry.evaluate((el) => (el as HTMLElement).click())
  await page.waitForTimeout(400)
  await expect(page.getByText(/Dukhan · Area/)).toBeVisible()
  await page.screenshot({ path: path.join(MEDIA_DIR, '08-expanded-dry-open-meteo.png') })
  await page.getByRole('button', { name: 'QMD' }).click()
  await page.waitForTimeout(300)
  await page.screenshot({ path: path.join(MEDIA_DIR, '09-expanded-dry-qmd.png') })
  await page.getByRole('button', { name: 'Close forecast panel' }).click()

  // Regression: hybrid basics intact — vehicle markers still painted.
  expect(await page.locator('.maplibregl-marker').count()).toBeGreaterThan(0)

  expect(consoleErrors, `console errors:\n${consoleErrors.join('\n')}`).toEqual([])
})
