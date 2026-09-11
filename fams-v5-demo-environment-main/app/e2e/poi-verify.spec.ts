import { test, expect } from '@playwright/test'

const TENANT = 'uccp'
const EMAIL = 'admin.uccp@fams.com'
const PASSWORD = 'Fams@123'
const OUT = 'e2e-artifacts/2026-09-01-lm-poi-markers'

test('POI category markers render on the map and in the drawer', async ({ page }) => {
  await page.goto(`/?tenant=${TENANT}`)
  await page.getByRole('textbox', { name: 'Email' }).fill(EMAIL)
  await page.getByRole('textbox', { name: 'Password' }).fill(PASSWORD)
  await page.getByRole('button', { name: 'Login' }).click()
  await expect(page.locator('[data-slot="navrail"]')).toBeVisible({ timeout: 15_000 })

  // Navigate to Live Monitoring.
  await page.goto(`/live-monitoring?tenant=${TENANT}`)
  await page.waitForTimeout(1500)
  await page.screenshot({ path: `${OUT}/01-live-monitoring.png`, fullPage: false })

  // Enable the POI layer/drawer.
  const poiToggle = page.getByRole('button', { name: 'Points of interest' })
  await poiToggle.click()
  await page.waitForTimeout(1000)
  await page.screenshot({ path: `${OUT}/02-poi-drawer-open.png`, fullPage: false })

  // Check every POI row so its pin plots on the map.
  const headerCheckbox = page.locator('thead').getByRole('checkbox').first()
  if (await headerCheckbox.count()) {
    await headerCheckbox.click()
  } else {
    const rowCheckboxes = page.locator('tbody').getByRole('checkbox')
    const n = await rowCheckboxes.count()
    for (let i = 0; i < n; i++) await rowCheckboxes.nth(i).click()
  }
  await page.waitForTimeout(1000)

  // Map markers — category art renders via <img> inside [data-slot="poi-marker"].
  const markers = page.locator('[data-slot="poi-marker"]')
  const markerCount = await markers.count()
  console.log('poi-marker count:', markerCount)
  if (markerCount > 0) {
    await expect(markers.first().locator('img')).toBeVisible()
    await markers.first().scrollIntoViewIfNeeded().catch(() => {})
    await page.screenshot({ path: `${OUT}/03-poi-markers-map.png`, fullPage: false })
  }

  // Drawer rows — category chip via [data-slot="poi-category-chip"].
  const chips = page.locator('[data-slot="poi-category-chip"]')
  const chipCount = await chips.count()
  console.log('poi-category-chip count:', chipCount)
  if (chipCount > 0) {
    await expect(chips.first()).toBeVisible()
  }
  await page.screenshot({ path: `${OUT}/04-poi-drawer-rows.png`, fullPage: false })

  expect(markerCount).toBeGreaterThan(0)
  expect(chipCount).toBeGreaterThan(0)
})
