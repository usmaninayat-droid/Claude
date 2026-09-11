// rc-hybrid-lm-chrome-verify.spec.ts — QUEUED TASK 2 (pipeline HYBRID view,
// 2026-09-01): the Requests & Complaints hybrid carries Live Monitoring's
// EXACT map chrome (LiveMapTools stack — search, cluster eye, layers,
// traffic, POI/Zones above Weather/Incidents), the "Sync With Map" list
// toggle, and rail cards that are the kanban card + a leading eye toggle.
// Screenshots to Build Delegate/media/2026-09-01-rc-hybrid/. Zero console
// errors on every step.
import { test, expect, type Page, type ConsoleMessage } from '@playwright/test'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const dirname = path.dirname(fileURLToPath(import.meta.url))
const TENANT = 'uccp'
const EMAIL = 'admin.uccp@fams.com'
const PASSWORD = 'Fams@123'
const MEDIA_DIR = path.resolve(dirname, '../../../Build Delegate/media/2026-09-01-rc-hybrid')

test.describe.configure({ mode: 'serial' })
// Shared dev server also serves concurrent agent suites — generous budget.
test.setTimeout(120_000)

function trackConsoleErrors(page: Page): string[] {
  const errors: string[] = []
  page.on('console', (msg: ConsoleMessage) => {
    if (msg.type() === 'error') errors.push(msg.text())
  })
  page.on('pageerror', (err) => errors.push(String(err)))
  return errors
}

async function login(page: Page) {
  await page.goto(`/?tenant=${TENANT}`)
  await page.getByRole('textbox', { name: 'Email' }).fill(EMAIL)
  await page.getByRole('textbox', { name: 'Password' }).fill(PASSWORD)
  await page.getByRole('button', { name: 'Login' }).click()
  await expect(page.locator('[data-slot="navrail"]')).toBeVisible({ timeout: 15_000 })
}

async function openHybrid(page: Page) {
  await page.goto(`/incidents?tenant=${TENANT}`)
  await page.getByRole('tab', { name: 'Hybrid View' }).click()
  await expect(page.locator('[data-slot="map-hybrid-view"]')).toBeVisible({ timeout: 15_000 })
  // Map canvas + tools are lazy — wait for the LM stack to arrive.
  await expect(page.locator('[data-slot="live-map-tools"]')).toBeVisible({ timeout: 45_000 })
}

test('LM chrome parity — tools stack, cluster eye, search, Sync With Map, legend', async ({ page }) => {
  const errors = trackConsoleErrors(page)
  await login(page)
  await openHybrid(page)

  const tools = page.locator('[data-slot="live-map-tools"]')
  // Top-start: place search. Bottom-start: cluster eye.
  await expect(tools.getByRole('button', { name: 'Search places on the map' })).toBeVisible()
  await expect(tools.getByRole('button', { name: /clustering/i })).toBeVisible()
  // End stack in blueprint order incl. POI/Zones ABOVE Weather.
  await expect(tools.getByRole('button', { name: 'Switch basemap style' })).toBeVisible()
  const poi = tools.getByRole('button', { name: /points? of interest|POI/i })
  const zones = tools.getByRole('button', { name: /zones/i })
  const weather = tools.getByRole('button', { name: /weather layer/i })
  await expect(poi).toBeVisible()
  await expect(zones).toBeVisible()
  await expect(weather).toBeVisible()
  const poiY = (await poi.boundingBox())!.y
  const zonesY = (await zones.boundingBox())!.y
  const weatherY = (await weather.boundingBox())!.y
  expect(Math.max(poiY, zonesY), 'POI/Zones must sit ABOVE Weather').toBeLessThan(weatherY)
  // The lens's own legacy tool stack must NOT double-paint.
  await expect(page.getByRole('button', { name: 'Measure distance' })).toHaveCount(0)
  // 2026-09-01 user request: the incidents octagon toggle and the traffic
  // toggle are dropped from this module's `uiConfig.map.tools` — the
  // module's own records ARE the incidents, so a second incidents toggle
  // was redundant, and traffic is not wanted here. Both must be gone.
  await expect(tools.getByRole('button', { name: /^incidents$|hide incidents/i })).toHaveCount(0)
  await expect(tools.getByRole('button', { name: /traffic overlay/i })).toHaveCount(0)
  // The detached white fullscreen tile under the zoom pill is BACK
  // (2026-09-01 follow-up: `hideFullscreenControl` dropped for LM parity).
  await expect(page.locator('[data-slot="map-controls"][data-variant="figma"]')).toBeVisible()
  await expect(page.getByRole('button', { name: /^fullscreen$/i })).toBeVisible()

  // Sync With Map toggle in the list pane meta row.
  await expect(page.locator('[data-slot="record-map-list-sync"]')).toBeVisible()

  // Priority legend still present.
  await expect(page.locator('[data-slot="record-map-legend"]')).toBeVisible()

  await page.waitForTimeout(2500) // let tiles paint for the screenshot
  await page.screenshot({ path: path.join(MEDIA_DIR, '01-hybrid-lm-chrome.png'), fullPage: false })
  expect(errors, `console errors: ${errors.join('\n')}`).toHaveLength(0)
})

test('rail cards — kanban card shell + leading eye toggle; card click opens detail sheet', async ({ page }) => {
  const errors = trackConsoleErrors(page)
  await login(page)
  await openHybrid(page)

  const cards = page.locator('[data-slot="record-map-card"]')
  await expect(cards.first()).toBeVisible()
  const eye = cards.first().locator('[data-slot="record-map-visibility"]')
  await expect(eye).toBeVisible()
  await expect(eye).toHaveAttribute('aria-pressed', 'false')
  await eye.click()
  await expect(eye).toHaveAttribute('aria-pressed', 'true')
  await page.screenshot({ path: path.join(MEDIA_DIR, '02-eye-toggle-hidden.png'), fullPage: false })
  await eye.click()
  await expect(eye).toHaveAttribute('aria-pressed', 'false')

  // Card click → detail sheet (rail→map/record sync half).
  await cards.nth(1).click()
  await expect(page.locator('[data-slot="task-detail-panel"], [data-slot="profile-stack"], [role="dialog"]').first()).toBeVisible({
    timeout: 10_000,
  })
  expect(errors, `console errors: ${errors.join('\n')}`).toHaveLength(0)
})

test('Sync With Map — toggling on scopes the card list to the viewport', async ({ page }) => {
  const errors = trackConsoleErrors(page)
  await login(page)
  await openHybrid(page)

  const sync = page.locator('[data-slot="record-map-list-sync"] [role="switch"]')
  await expect(sync).toBeVisible()
  const before = await page.locator('[data-slot="record-map-card"]').count()
  await sync.click()
  await expect(sync).toHaveAttribute('data-state', 'checked')
  // Turning it on with the default camera keeps a non-empty list.
  await expect(page.locator('[data-slot="record-map-card"]').first()).toBeVisible()
  const after = await page.locator('[data-slot="record-map-card"]').count()
  expect(after).toBeGreaterThan(0)
  expect(after).toBeLessThanOrEqual(before)
  await sync.click() // leave it off for other suites
  expect(errors, `console errors: ${errors.join('\n')}`).toHaveLength(0)
})
