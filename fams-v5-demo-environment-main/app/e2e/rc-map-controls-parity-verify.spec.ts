// rc-map-controls-parity-verify.spec.ts — R&C hybrid map bottom-end control
// parity with Live Monitoring (2026-09-01 user request): the LM white zoom
// pill + detached white fullscreen tile (ui-kit MapZoomControl, "figma"
// variant) must render on the Requests & Complaints hybrid map, and the old
// slate secondary "fit" button must be gone. Run with SHOT_PREFIX=before or
// SHOT_PREFIX=after to name the screenshots; assertions only run for "after".
import { test, expect, type Page, type ConsoleMessage } from '@playwright/test'
import path from 'node:path'
import fs from 'node:fs'
import { fileURLToPath } from 'node:url'

const dirname = path.dirname(fileURLToPath(import.meta.url))
const TENANT = 'uccp'
const EMAIL = 'admin.uccp@fams.com'
const PASSWORD = 'Fams@123'
const MEDIA_DIR = path.resolve(dirname, '../../../Build Delegate/media/2026-09-01-rc-map-controls')
const PREFIX = process.env.SHOT_PREFIX ?? 'after'

test.describe.configure({ mode: 'serial' })
test.setTimeout(150_000)

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

async function shootBottomEndCluster(page: Page, file: string) {
  // Clip the map's bottom-end corner so the zoom/fullscreen cluster is legible.
  const map = page.locator('[data-slot="map-controls"][data-variant="figma"]').first()
  await map.waitFor({ state: 'visible', timeout: 60_000 })
  const box = await page.locator('body').boundingBox().then(async (body) => {
    const cluster = await map.boundingBox()
    if (!cluster || !body) return body
    // Frame a 320x420 window whose bottom-right hugs the cluster's corner.
    return {
      x: cluster.x + cluster.width + 16 - 320,
      y: cluster.y + cluster.height + 16 - 420,
      width: 320,
      height: 420,
    }
  })
  fs.mkdirSync(MEDIA_DIR, { recursive: true })
  if (box) {
    await page.screenshot({
      path: path.join(MEDIA_DIR, file),
      clip: { x: Math.max(0, box.x), y: Math.max(0, box.y), width: box.width, height: box.height },
    })
  }
}

test(`R&C hybrid map controls (${PREFIX})`, async ({ page }) => {
  const errors = trackConsoleErrors(page)
  await login(page)
  await page.goto(`/incidents?tenant=${TENANT}`)
  await page.getByRole('tab', { name: 'Hybrid View' }).click()
  await expect(page.locator('[data-slot="map-hybrid-view"]')).toBeVisible({ timeout: 15_000 })
  await expect(page.locator('[data-slot="live-map-tools"]')).toBeVisible({ timeout: 45_000 })
  await expect(page.locator('[data-slot="map-controls"][data-variant="figma"]')).toBeVisible()
  await page.waitForTimeout(2500)
  await page.screenshot({ path: path.join(MEDIA_DIR, `${PREFIX}-rc-hybrid-full.png`) })
  await shootBottomEndCluster(page, `${PREFIX}-rc-hybrid-bottom-end.png`)

  if (PREFIX === 'after') {
    // LM-style detached white fullscreen tile is back and functional.
    const fullscreenTile = page
      .locator('[data-slot="map-controls"][data-variant="figma"]')
      .getByRole('button', { name: /^fullscreen$/i })
    await expect(fullscreenTile).toBeVisible()
    await expect(fullscreenTile).toHaveAttribute('data-slot', 'map-icon-button')
    // No slate legacy button: the fit control must be the shared white
    // map-icon-button tile, never ui-kit Button's `secondary` recipe.
    const fit = page.getByRole('button', { name: /fit all .* in view/i })
    await expect(fit).toHaveAttribute('data-slot', 'map-icon-button')
    // Fullscreen actually toggles.
    await fullscreenTile.click()
    await expect(page.getByRole('button', { name: /exit fullscreen/i })).toBeVisible()
    await page.waitForTimeout(800)
    await page.screenshot({ path: path.join(MEDIA_DIR, `${PREFIX}-rc-hybrid-fullscreen-on.png`) })
    // A synthesized Escape doesn't exit HTML5 fullscreen in headless
    // chromium — toggle back off through the tile itself.
    await page.getByRole('button', { name: /exit fullscreen/i }).click()
    await expect(fullscreenTile).toBeVisible({ timeout: 20_000 })
  }
  expect(errors, `console errors: ${errors.join('\n')}`).toHaveLength(0)
})

test(`Live Monitoring hybrid map controls (comparison, ${PREFIX})`, async ({ page }) => {
  const errors = trackConsoleErrors(page)
  await login(page)
  await page.goto(`/live-monitoring?tenant=${TENANT}`)
  await expect(page.locator('[data-slot="map-controls"][data-variant="figma"]')).toBeVisible({ timeout: 45_000 })
  await page.waitForTimeout(2500)
  await page.screenshot({ path: path.join(MEDIA_DIR, `${PREFIX}-lm-hybrid-full.png`) })
  await shootBottomEndCluster(page, `${PREFIX}-lm-hybrid-bottom-end.png`)
  expect(errors, `console errors: ${errors.join('\n')}`).toHaveLength(0)
})
