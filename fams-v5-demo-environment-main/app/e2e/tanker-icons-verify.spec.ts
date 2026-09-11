// tanker-icons-verify.spec.ts — one-off manual capture for the 2026-09-01
// tanker art refresh (source: /Users/apple/Desktop/Tanker Icons, vendored
// into `VehicleIcon3D.tsx`'s `TankerArt`). Confirms the new art renders on
// all four Live Monitoring surfaces that share `VehicleIcon3D art="tanker"`:
// list row thumbnail, map marker, popup header tile, and the entity-profile
// widget/detail hero art slot. Not part of the regression suite (manual
// capture, run once for this chunk).
import { test, expect } from '@playwright/test'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const TENANT = 'uccp'
const EMAIL = 'admin.uccp@fams.com'
const PASSWORD = 'Fams@123'
const MEDIA_DIR = path.resolve(__dirname, '../../../Build Delegate/media/2026-09-01-tanker-icons')

test('tanker art refresh — all four surfaces', async ({ page }) => {
  const errors: string[] = []
  page.on('console', (msg) => {
    if (msg.type() === 'error') errors.push(msg.text())
  })
  page.on('pageerror', (err) => errors.push(String(err)))

  await page.goto(`/?tenant=${TENANT}`)
  await page.getByRole('textbox', { name: 'Email' }).fill(EMAIL)
  await page.getByRole('textbox', { name: 'Password' }).fill(PASSWORD)
  await page.getByRole('button', { name: 'Login' }).click()
  await expect(page.locator('[data-slot="navrail"]')).toBeVisible({ timeout: 15_000 })

  await page.goto(`/live-monitoring?tenant=${TENANT}`)

  // 1) Hybrid View — map markers.
  await page.getByRole('tab', { name: 'Hybrid View' }).click()
  await page.waitForTimeout(2000)
  await expect(page.locator('[data-slot="vehicle-marker"]').first()).toBeVisible({ timeout: 15_000 })
  await page.screenshot({ path: path.join(MEDIA_DIR, '1-map-markers.png'), fullPage: false })

  // 2) Popup — click a marker.
  await page.locator('[data-slot="vehicle-marker"]').first().click({ force: true })
  await page.waitForTimeout(800)
  await page.screenshot({ path: path.join(MEDIA_DIR, '2-popup-header.png'), fullPage: false })

  // 3) List View — row thumbnails.
  await page.getByRole('tab', { name: 'List View' }).click()
  await page.waitForSelector('table tbody tr')
  await page.waitForTimeout(500)
  await page.screenshot({ path: path.join(MEDIA_DIR, '3-list-rows.png'), fullPage: false })

  // 4) Record detail — widget/hero art slot.
  await page.locator('table tbody tr').first().click()
  await expect(page.locator('[data-slot="profile-stack"]')).toBeVisible({ timeout: 15_000 })
  await page.waitForTimeout(1000)
  await page.screenshot({ path: path.join(MEDIA_DIR, '4-widget-detail.png'), fullPage: false })

  const seriousErrors = errors.filter(
    (e) => !/OpenFreeMap|OpenMapTiles|favicon|ResizeObserver/i.test(e),
  )
  expect(seriousErrors, seriousErrors.join('\n')).toEqual([])
})
