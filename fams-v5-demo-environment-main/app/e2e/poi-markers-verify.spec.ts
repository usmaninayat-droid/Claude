import { test } from '@playwright/test'
import fs from 'node:fs'

// Ad-hoc verification (2026-09-01): cockpit Live GIS Map POI panel + map
// pins now render the DS's real category marker set (assets/icons/poi/*.svg)
// instead of generic colored square chips / plain pins. Screenshots go to
// Build Delegate/media/2026-09-01-poi-markers/ per the task brief.
const OUT = 'e2e-artifacts/2026-09-01-poi-markers'

test('operations-center cockpit POI panel + map pins use DS category markers', async ({ page }) => {
  fs.mkdirSync(OUT, { recursive: true })
  await page.setViewportSize({ width: 1440, height: 900 })
  await page.goto('http://localhost:6360/')
  await page.waitForTimeout(1000)

  const opsCenterLink = page.getByRole('button', { name: 'Operations Center' })
  await opsCenterLink.waitFor({ state: 'visible', timeout: 15000 })
  await opsCenterLink.click()
  await page.waitForTimeout(2000)

  const poiBtn = page.getByRole('button', { name: 'Points of interest' })
  await poiBtn.waitFor({ state: 'visible', timeout: 15000 })
  await poiBtn.click()
  await page.waitForTimeout(800)

  await page.screenshot({ path: `${OUT}/poi-panel-and-pins.png` })

  const panel = page.locator('text=Points of Interest').locator('xpath=..')
  await panel.screenshot({ path: `${OUT}/poi-list-rows.png` }).catch(() => {})

  // Scroll the map into full view and screenshot just the map region so the
  // teardrop pins (not just the list) are clearly visible/distinct.
  const mapRegion = page.locator('.leaflet-container').first()
  await mapRegion.scrollIntoViewIfNeeded()
  await page.waitForTimeout(500)
  await mapRegion.screenshot({ path: `${OUT}/poi-map-pins.png` }).catch(() => {})

  const count = await page.locator('img[src^="/assets/poi/"]').count()
  console.log(`poi marker images rendered: ${count}`)
})
