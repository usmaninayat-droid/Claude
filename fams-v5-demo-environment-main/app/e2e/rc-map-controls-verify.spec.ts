// rc-map-controls-verify.spec.ts — verification run for the R&C hybrid map
// control-hiding request (2026-09-01): the incidents octagon toggle, the
// traffic-light toggle, and the detached fullscreen tile are dropped for the
// "Requests & Complaints" module only (`incidents` blueprint's own
// `uiConfig.map.tools`/`hideFullscreenControl`) — the zoom pill and every
// other tool stay. Live Monitoring's own hybrid map (a different blueprint)
// is unaffected and keeps all three. Screenshots to Build Delegate/media/
// 2026-09-01-rc-map-controls/. Zero console errors on every step.
import { test, expect, type Page, type ConsoleMessage } from '@playwright/test'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const dirname = path.dirname(fileURLToPath(import.meta.url))
const TENANT = 'uccp'
const EMAIL = 'admin.uccp@fams.com'
const PASSWORD = 'Fams@123'
const MEDIA_DIR = path.resolve(dirname, '../../../Build Delegate/media/2026-09-01-rc-map-controls')

test.describe.configure({ mode: 'serial' })
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

test('Requests & Complaints hybrid map — incidents/traffic toggles gone, LM zoom pill + fullscreen tile intact', async ({
  page,
}) => {
  const errors = trackConsoleErrors(page)
  await login(page)
  await page.goto(`/incidents?tenant=${TENANT}`)
  await page.getByRole('tab', { name: 'Hybrid View' }).click()
  await expect(page.locator('[data-slot="map-hybrid-view"]')).toBeVisible({ timeout: 15_000 })
  await expect(page.locator('[data-slot="live-map-tools"]')).toBeVisible({ timeout: 45_000 })

  const tools = page.locator('[data-slot="live-map-tools"]')
  // Gone: incidents octagon toggle, traffic-light toggle.
  await expect(tools.getByRole('button', { name: /^incidents$|hide incidents/i })).toHaveCount(0)
  await expect(tools.getByRole('button', { name: /traffic overlay/i })).toHaveCount(0)
  // Present again (2026-09-01 follow-up): the LM-style detached white
  // fullscreen tile under the zoom pill — `hideFullscreenControl` was
  // dropped from the incidents blueprint for LM chrome parity.
  await expect(page.getByRole('button', { name: /^fullscreen$/i })).toBeVisible()
  // Still present: zoom pill (figma control variant) and the rest of the tools stack.
  await expect(page.locator('[data-slot="map-controls"][data-variant="figma"]')).toBeVisible()
  await expect(tools.getByRole('button', { name: 'Search places on the map' })).toBeVisible()
  await expect(tools.getByRole('button', { name: /clustering/i })).toBeVisible()
  await expect(tools.getByRole('button', { name: 'Switch basemap style' })).toBeVisible()
  await expect(tools.getByRole('button', { name: /points? of interest|POI/i })).toBeVisible()
  await expect(tools.getByRole('button', { name: /zones/i })).toBeVisible()
  await expect(tools.getByRole('button', { name: /weather layer/i })).toBeVisible()
  await expect(page.locator('[data-slot="record-map-legend"]')).toBeVisible()

  await page.waitForTimeout(2500) // let tiles paint for the screenshot
  await page.screenshot({ path: path.join(MEDIA_DIR, '01-rc-hybrid-map-controls.png'), fullPage: false })
  expect(errors, `console errors: ${errors.join('\n')}`).toHaveLength(0)
})

test('Live Monitoring hybrid map — unchanged: incidents, traffic and fullscreen tiles all still present', async ({
  page,
}) => {
  const errors = trackConsoleErrors(page)
  await login(page)
  await page.goto(`/live-monitoring?tenant=${TENANT}`)
  await expect(page.locator('[data-slot="live-map-tools"]')).toBeVisible({ timeout: 15_000 })

  const tools = page.locator('[data-slot="live-map-tools"]')
  await expect(page.locator('[data-slot="live-map-incidents"]')).toBeVisible()
  await expect(page.locator('[data-slot="live-map-traffic"]')).toBeVisible()
  await expect(page.getByRole('button', { name: /^fullscreen$/i }).first()).toBeVisible()
  await expect(tools.getByRole('button', { name: 'Switch basemap style' })).toBeVisible()

  await page.waitForTimeout(2500)
  await page.screenshot({ path: path.join(MEDIA_DIR, '02-lm-hybrid-unchanged.png'), fullPage: false })
  expect(errors, `console errors: ${errors.join('\n')}`).toHaveLength(0)
})
