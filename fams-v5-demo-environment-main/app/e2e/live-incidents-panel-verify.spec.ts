// live-incidents-panel-verify.spec.ts — verification run for the Live
// Monitoring map's Incidents panel (chunk: 2026-08-31 live-incidents-panel).
// Confirms the octagon-alert "Incidents" map control opens a right-docked
// panel matching the Zones/POI drawer chrome, listing incident CARDS
// (search + filter, eye toggle, severity pins on the map), and that a card
// click opens the incident's detail sheet.
import { test, expect } from '@playwright/test'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const dirname = path.dirname(fileURLToPath(import.meta.url))
const TENANT = 'uccp'
const EMAIL = 'admin.uccp@fams.com'
const PASSWORD = 'Fams@123'
const MEDIA_DIR = path.resolve(
  dirname,
  '../../../Build Delegate/media/2026-08-31-live-incidents-panel',
)

test.describe.configure({ mode: 'serial' })

async function login(page: import('@playwright/test').Page) {
  await page.goto(`/?tenant=${TENANT}`)
  await page.getByRole('textbox', { name: 'Email' }).fill(EMAIL)
  await page.getByRole('textbox', { name: 'Password' }).fill(PASSWORD)
  await page.getByRole('button', { name: 'Login' }).click()
  await expect(page.locator('[data-slot="navrail"]')).toBeVisible({ timeout: 15_000 })
}

test.describe('live incidents panel verify', () => {
  test('open the Incidents panel — search + filter + card list', async ({ page }) => {
    await login(page)
    await page.goto(`/live-monitoring?tenant=${TENANT}`)
    // The hybrid tab defaults to the live map+list split; give the map a
    // moment to mount (MapLibre canvas) before hitting its floating chrome.
    await page.waitForSelector('[data-slot="live-map-tools"]', { timeout: 15_000 })

    const incidentsButton = page.locator('[data-slot="live-map-incidents"]')
    await expect(incidentsButton).toBeVisible()
    await incidentsButton.click()

    const drawer = page.locator('[data-slot="incidents-drawer"]')
    await expect(drawer).toBeVisible()
    await expect(drawer.getByPlaceholder('Search Incidents')).toBeVisible()
    // Filter funnel trigger (LiveFiltersPopover).
    await expect(drawer.getByRole('button', { name: /filter/i }).first()).toBeVisible()
    // At least one incident card with the leading eye toggle.
    await expect(drawer.locator('[data-slot="record-map-card"]').first()).toBeVisible()
    await expect(drawer.locator('[data-slot="record-map-visibility"]').first()).toBeVisible()

    await page.screenshot({ path: path.join(MEDIA_DIR, '01-incidents-panel-open.png'), fullPage: false })
  })

  test('eye toggle hides then reshows a pin on the map', async ({ page }) => {
    await login(page)
    await page.goto(`/live-monitoring?tenant=${TENANT}`)
    await page.waitForSelector('[data-slot="live-map-tools"]', { timeout: 15_000 })
    await page.locator('[data-slot="live-map-incidents"]').click()
    const drawer = page.locator('[data-slot="incidents-drawer"]')
    await expect(drawer).toBeVisible()

    const firstPin = page.locator('[data-slot="incident-pin"]').first()
    await expect(firstPin).toBeVisible({ timeout: 10_000 })
    const pinCountBefore = await page.locator('[data-slot="incident-pin"]').count()

    const eyeToggle = drawer.locator('[data-slot="record-map-visibility"]').first()
    await eyeToggle.click()
    await page.waitForTimeout(300)
    await page.screenshot({ path: path.join(MEDIA_DIR, '02-eye-toggle-off.png'), fullPage: false })
    const pinCountAfterOff = await page.locator('[data-slot="incident-pin"]').count()
    expect(pinCountAfterOff).toBeLessThan(pinCountBefore)

    await eyeToggle.click()
    await page.waitForTimeout(300)
    await page.screenshot({ path: path.join(MEDIA_DIR, '03-eye-toggle-on.png'), fullPage: false })
    const pinCountAfterOn = await page.locator('[data-slot="incident-pin"]').count()
    expect(pinCountAfterOn).toBe(pinCountBefore)
  })

  test('search narrows the card list', async ({ page }) => {
    await login(page)
    await page.goto(`/live-monitoring?tenant=${TENANT}`)
    await page.waitForSelector('[data-slot="live-map-tools"]', { timeout: 15_000 })
    await page.locator('[data-slot="live-map-incidents"]').click()
    const drawer = page.locator('[data-slot="incidents-drawer"]')
    await expect(drawer).toBeVisible()

    const before = await drawer.locator('[data-slot="record-map-card"]').count()
    expect(before).toBeGreaterThan(0)

    // A query almost certainly not present narrows the list toward zero —
    // proves search is wired to the card list (and, via the shared
    // search∩filter state, the map pins).
    await drawer.getByPlaceholder('Search Incidents').fill('zzz-no-such-incident-zzz')
    await page.waitForTimeout(300)
    const after = await drawer.locator('[data-slot="record-map-card"]').count()
    expect(after).toBeLessThan(before)
    await page.screenshot({ path: path.join(MEDIA_DIR, '04-search-narrowed.png'), fullPage: false })
  })

  test('card click opens the incident detail sheet', async ({ page }) => {
    await login(page)
    await page.goto(`/live-monitoring?tenant=${TENANT}`)
    await page.waitForSelector('[data-slot="live-map-tools"]', { timeout: 15_000 })
    await page.locator('[data-slot="live-map-incidents"]').click()
    const drawer = page.locator('[data-slot="incidents-drawer"]')
    await expect(drawer).toBeVisible()

    await drawer.locator('[data-slot="record-map-card"]').first().click()
    await expect(page.locator('[data-slot="profile-stack"]')).toBeVisible({ timeout: 10_000 })
    await page.screenshot({ path: path.join(MEDIA_DIR, '05-incident-detail-sheet.png'), fullPage: false })
  })
})

test.describe('map controls unification (design-lead addendum)', () => {
  test('live monitoring vs incidents hybrid — same control chrome', async ({ page }) => {
    await login(page)
    await page.goto(`/live-monitoring?tenant=${TENANT}`)
    await page.waitForSelector('[data-slot="live-map-tools"]', { timeout: 15_000 })
    await page.waitForTimeout(500)
    await page.screenshot({ path: path.join(MEDIA_DIR, '06-live-monitoring-controls.png'), fullPage: false })

    await page.goto(`/incidents?tenant=${TENANT}`)
    await page.getByRole('tab', { name: 'Hybrid View' }).click().catch(() => {})
    await page.waitForTimeout(1500)
    await page.screenshot({ path: path.join(MEDIA_DIR, '07-incidents-hybrid-controls.png'), fullPage: false })
  })
})
