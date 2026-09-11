// gis-tabs-verify.spec.ts — verification for the Live GIS Map's four tabs
// (Plans/Complaints/Inspectors/Vehicles) rebuild, 2026-09-01. Manual capture
// per the Build Delegate LOG.md entry — not part of the regression suite
// (verify-adhoc project). Targets the standalone Operations Center cockpit
// dev server directly (its own vite app on :6360, no tenant login/iframe).
import { test, expect } from '@playwright/test'

const OUT_DIR =
  'e2e-artifacts/2026-09-01-gis-tabs'
const TABS = ['Plans', 'Complaints', 'Inspectors', 'Vehicles'] as const

test('Live GIS Map — Plans/Complaints/Inspectors/Vehicles tabs render panel + markers, no bell tile', async ({ page }) => {
  test.setTimeout(120_000)
  const errors: string[] = []
  page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()) })
  page.on('pageerror', (e) => errors.push(e.message))

  await page.goto('http://localhost:6360/')
  await page.getByRole('button', { name: 'Operations Center', exact: true }).click()
  await expect(page.getByText('Live GIS Map')).toBeVisible({ timeout: 30_000 })

  for (const tab of TABS) {
    await page.getByRole('button', { name: tab, exact: true }).click()
    await page.waitForTimeout(700)
    await page.screenshot({ path: `${OUT_DIR}/${tab.toLowerCase()}-tab.png` })
  }

  // Notification bell tile removed from the map's control stack (user
  // addendum, 2026-09-01) — asserted on whichever tab is active last.
  await expect(page.getByRole('button', { name: 'Alerts' })).toHaveCount(0)

  expect(errors, `console/page errors: ${errors.join(' | ')}`).toEqual([])
})
