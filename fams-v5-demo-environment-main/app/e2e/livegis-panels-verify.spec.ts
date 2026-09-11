import { test, expect, type Page } from '@playwright/test'
import { mkdirSync } from 'node:fs'

/**
 * livegis-panels-verify — visual verification of the 2026-09-01 Live GIS Map
 * LM-parity fix wave (map tool right drawers, incidents drawer actions,
 * weather bar expand, Inspectors/Vehicles LM tables). Drives the isolated
 * cockpit dev server on :6360 directly.
 */
const BASE = 'http://localhost:6360'
const OUT = 'e2e-artifacts/2026-09-01-livegis-panels'

mkdirSync(OUT, { recursive: true })

async function openCockpit(page: Page) {
  await page.goto(`${BASE}/#/dashboard`, { waitUntil: 'domcontentloaded' })
  await page.waitForSelector('text=Live GIS Map', { timeout: 30_000 })
  // Let Leaflet settle so the map pane is painted under the chrome.
  await page.waitForTimeout(2500)
}

test.use({ viewport: { width: 1680, height: 1000 } })

test('live gis map tool drawers, weather bar and LM tables', async ({ page }) => {
  await openCockpit(page)
  const map = page.locator('[data-slot="weather-bar"]').first()
  await expect(map).toBeVisible()

  // 1 — weather bar COLLAPSED (default: the weather layer starts on).
  await page.screenshot({ path: `${OUT}/01-weather-bar-collapsed.png` })

  // 2 — weather bar EXPANDED, full map width.
  await page.getByRole('button', { name: 'Expand weather bar' }).click()
  await page.waitForTimeout(400)
  await page.screenshot({ path: `${OUT}/02-weather-bar-expanded.png` })
  await page.getByRole('button', { name: 'Collapse weather bar' }).click()
  await page.waitForTimeout(300)

  // 3 — Zones drawer.
  await page.getByRole('button', { name: 'Zones', exact: true }).click()
  await expect(page.locator('[data-slot="map-tool-drawer"]')).toBeVisible()
  await expect(page.locator('[data-slot="zones-table"]')).toBeVisible()
  await page.waitForTimeout(600)
  await page.screenshot({ path: `${OUT}/03-zones-drawer.png` })

  // 4 — POI drawer (switching directly from Zones, LM interaction 21b).
  await page.getByRole('button', { name: 'Points of interest' }).click()
  await expect(page.locator('[data-slot="poi-table"]')).toBeVisible()
  await page.waitForTimeout(600)
  await page.screenshot({ path: `${OUT}/04-poi-drawer.png` })

  // 5 — Incidents drawer with its row actions.
  await page.getByRole('button', { name: 'Incidents', exact: true }).click()
  await expect(page.getByRole('dialog', { name: 'Incidents' })).toBeVisible()
  await expect(page.getByRole('button', { name: /^Acknowledge CMP-101$/ })).toBeVisible()
  await page.waitForTimeout(600)
  await page.screenshot({ path: `${OUT}/05-incidents-drawer.png` })

  // 5b — the Acknowledge action actually advances the row's stage.
  await page.getByRole('button', { name: /^Acknowledge CMP-101$/ }).click()
  await expect(page.getByRole('button', { name: /^Resolve CMP-101$/ })).toBeVisible()
  await page.waitForTimeout(300)
  await page.screenshot({ path: `${OUT}/06-incidents-drawer-acknowledged.png` })

  // 6 — weather bar expanded WHILE a drawer is docked (inboard shift).
  await page.getByRole('button', { name: 'Expand weather bar' }).click()
  await page.waitForTimeout(400)
  await page.screenshot({ path: `${OUT}/07-weather-expanded-with-drawer.png` })
  await page.getByRole('button', { name: 'Collapse weather bar' }).click()
  await page.getByRole('button', { name: 'Close Incidents' }).click()
  await page.waitForTimeout(300)

  // 7 — Inspectors tab = LM's workforce table.
  await page.getByRole('button', { name: 'Inspectors', exact: true }).click()
  await expect(page.locator('table[aria-label="Inspectors"]')).toBeVisible()
  for (const h of ['Name', 'ID', 'Type', 'Location']) {
    await expect(page.locator('table[aria-label="Inspectors"] thead').getByText(h, { exact: true })).toBeVisible()
  }
  await page.waitForTimeout(500)
  await page.screenshot({ path: `${OUT}/08-inspectors-table.png` })

  // 8 — Vehicles tab = LM's vehicle table.
  await page.getByRole('button', { name: 'Vehicles', exact: true }).click()
  await expect(page.locator('table[aria-label="Vehicles"]')).toBeVisible()
  for (const h of ['Vehicle', 'Fill Level', 'Activity Overview', 'Speed']) {
    await expect(page.locator('table[aria-label="Vehicles"] thead').getByText(h, { exact: true })).toBeVisible()
  }
  await page.waitForTimeout(500)
  await page.screenshot({ path: `${OUT}/09-vehicles-table.png` })
})
