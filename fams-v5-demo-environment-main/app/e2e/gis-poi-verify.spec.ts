// gis-poi-verify.spec.ts — verification for the POI marker/list-icon fix,
// 2026-09-01 user addendum: POI map pins + list rows use the cockpit's real
// DS-derived marker glyph/color pairs (plant=squircle depot, site=teardrop
// civic point), not generic pins. Manual capture, not part of the
// regression suite (verify-adhoc project).
import { test, expect } from '@playwright/test'

const OUT_DIR =
  'e2e-artifacts/2026-09-01-gis-tabs'

test('Live GIS Map — POI tool shows the DS marker-glyph list + matching map pins', async ({ page }) => {
  test.setTimeout(60_000)
  const errors: string[] = []
  page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()) })
  page.on('pageerror', (e) => errors.push(e.message))

  await page.goto('http://localhost:6360/')
  await page.getByRole('button', { name: 'Operations Center', exact: true }).click()
  await expect(page.getByText('Live GIS Map')).toBeVisible({ timeout: 30_000 })

  await page.getByRole('button', { name: 'Points of interest' }).click()
  await expect(page.getByText('Points of Interest')).toBeVisible()
  await page.waitForTimeout(600)
  await page.screenshot({ path: `${OUT_DIR}/poi-list-and-pins.png` })

  expect(errors, `console/page errors: ${errors.join(' | ')}`).toEqual([])
})
