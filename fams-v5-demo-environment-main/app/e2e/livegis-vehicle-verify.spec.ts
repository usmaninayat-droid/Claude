// livegis-vehicle-verify.spec.ts — verification for the 2026-09-01 Live GIS
// LM-parity wave: (1) vehicle marker anatomy, (2) vehicle popup + the two
// Live-GIS-only actions, (3) LM-parity expanded weather forecast panel,
// (4) LM-parity marker clustering across the zoom ladder.
//
// Drives the ISOLATED cockpit dev server on :6360 directly (the cockpit is a
// React-18 bundle the host embeds in an iframe), so no login is needed.
import { test, expect, type Page } from '@playwright/test'
import { mkdirSync } from 'node:fs'
import path from 'node:path'

const BASE = 'http://localhost:6360'
const OUT = 'e2e-artifacts/2026-09-01-livegis-vehicle'
mkdirSync(OUT, { recursive: true })

const SHOT = (name: string) => path.join(OUT, name)

async function openCockpit(page: Page) {
  await page.goto(`${BASE}/#/dashboard`, { waitUntil: 'domcontentloaded' })
  await page.waitForSelector('text=Live GIS Map', { timeout: 30_000 })
  // Bring the map panel fully into frame so the popup / forecast panel are
  // not cut off by the page fold in the shots. The cockpit scrolls an inner
  // region (`.no-scrollbar.overflow-auto`), not the window.
  await page.evaluate(() => {
    const el = Array.from(document.querySelectorAll<HTMLElement>('div.no-scrollbar.overflow-auto'))
      .find((e) => e.scrollHeight > 3000)
    el?.scrollTo({ top: 620 })
  })
  await page.waitForTimeout(2500)
}

test.use({ viewport: { width: 1680, height: 1000 } })
test.describe.configure({ mode: 'serial' })

test('vehicle marker anatomy — default and selected', async ({ page }) => {
  await openCockpit(page)
  const marker = page.locator('[data-slot="vehicle-marker"]').first()
  await expect(marker).toBeVisible({ timeout: 20_000 })

  // Anatomy: status ring + badge coin + leader stem/dot + 3D tanker art.
  await expect(marker.locator('[data-slot="vehicle-marker-art"]')).toBeVisible()
  await page.screenshot({ path: SHOT('01-markers-default.png') })

  const box = await marker.boundingBox()
  if (box) {
    await page.screenshot({
      path: SHOT('02-marker-zoom-default.png'),
      clip: { x: Math.max(0, box.x - 90), y: Math.max(0, box.y - 40), width: 260, height: 160 },
    })
  }

  await marker.click({ force: true })
  await page.waitForTimeout(1200)
  await page.screenshot({ path: SHOT('03-marker-selected-with-popup.png') })
})

test('vehicle popup — LM header + tabs + the two Live GIS actions', async ({ page }) => {
  await openCockpit(page)
  await page.locator('[data-slot="vehicle-marker"]').first().click({ force: true })

  const card = page.locator('[data-slot="vehicle-popup-card"]')
  await expect(card).toBeVisible({ timeout: 15_000 })
  // LM header anatomy: status-tinted art tile with a corner status coin.
  await expect(card.locator('[data-slot="vehicle-popup-tile"]')).toBeVisible()
  await expect(card.locator('[data-slot="vehicle-popup-status-badge"]')).toBeVisible()
  // Header actions.
  for (const name of ['Center on vehicle', 'Expand details', 'Close']) {
    await expect(card.getByRole('button', { name })).toBeVisible()
  }
  // Overview grid + the two Live-GIS-only actions.
  await expect(card.getByText('Vehicle Speed')).toBeVisible()
  await expect(card.getByText('Fuel Level')).toBeVisible()
  await expect(card.getByRole('button', { name: 'Report Breakdown' })).toBeVisible()
  await expect(card.getByRole('button', { name: 'Call Driver' })).toBeVisible()
  await page.waitForTimeout(500)
  await page.screenshot({ path: SHOT('04-popup-overview-actions.png') })

  for (const tab of ['Critical Events', 'Trips', 'Devices']) {
    await card.getByRole('button', { name: tab, exact: true }).click()
    await page.waitForTimeout(500)
    await page.screenshot({ path: SHOT(`05-popup-${tab.toLowerCase().replace(/\s+/g, '-')}.png`) })
  }

  // Call Driver opens the driver-contact tooltip (demo behaviour).
  await card.getByRole('button', { name: 'Overview', exact: true }).click()
  await card.getByRole('button', { name: 'Call Driver' }).click()
  await page.waitForTimeout(400)
  await page.screenshot({ path: SHOT('06-popup-call-driver.png') })
})

test('weather forecast panel — LM row set + About Location', async ({ page }) => {
  await openCockpit(page)
  await page.getByRole('button', { name: 'Expand forecast panel' }).click()
  await page.waitForTimeout(800)
  const panel = page.locator('[data-slot="weather-bar"]')
  await expect(panel.getByText('About Location')).toBeVisible()
  for (const label of ['Hours', 'Temperature', 'Rain Chance', 'Wind']) {
    await expect(panel.getByText(label, { exact: true })).toBeVisible()
  }
  await page.screenshot({ path: SHOT('07-weather-expanded-open-meteo.png') })

  await panel.getByRole('button', { name: 'QMD' }).click()
  await page.waitForTimeout(600)
  await expect(panel.getByText('Official Outlook')).toBeVisible()
  await page.screenshot({ path: SHOT('08-weather-expanded-qmd.png') })
})

test('marker clustering — zoom ladder', async ({ page }) => {
  await openCockpit(page)
  const zoomOut = page.getByRole('button', { name: 'Zoom out' })
  const zoomIn = page.getByRole('button', { name: 'Zoom in' })

  await page.screenshot({ path: SHOT('09-cluster-zoom-default.png') })
  for (let i = 0; i < 3; i++) {
    await zoomOut.click()
    await page.waitForTimeout(500)
  }
  await page.waitForTimeout(600)
  await expect(page.locator('[data-slot="cluster-badge"]').first()).toBeVisible({ timeout: 10_000 })
  await page.screenshot({ path: SHOT('10-cluster-zoomed-out.png') })

  // Clicking a cluster zooms into it (LM's expand-cluster behaviour).
  const before = await page.locator('[data-slot="cluster-badge"]').count()
  await page.locator('[data-slot="cluster-badge"]').first().click({ force: true })
  await page.waitForTimeout(1200)
  await page.screenshot({ path: SHOT('11-cluster-after-click.png') })
  expect(before).toBeGreaterThan(0)

  for (let i = 0; i < 4; i++) {
    await zoomIn.click()
    await page.waitForTimeout(400)
  }
  await page.waitForTimeout(700)
  await expect(page.locator('[data-slot="vehicle-marker"]').first()).toBeVisible()
  await page.screenshot({ path: SHOT('12-cluster-zoomed-in-individual.png') })
})
