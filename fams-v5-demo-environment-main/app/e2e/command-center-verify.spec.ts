// command-center-verify.spec.ts — live verification for the FM-6233 Command
// Center module (2026-09-01):
//  1. Rail entry "Command Center" → FULL-SCREEN dark dashboard: no V5 rail,
//     no V5 top bar; the surface's own dark top nav with the white UCCP logo.
//  2. Back arrow returns to the V5 web app (rail + top bar back).
//  3. Weather layer ON by default with the complete interaction: rain-first
//     pills → click a station marker → expanded 5-day grid + dimming.
//  4. 18 tanker markers (clustered) + 36 request pins; request pin click →
//     info card with title/priority/stage/municipality.
//  5. KPI strip matches the real seed counts.
//  6. Viewport scroll contract (no window scroll) + zero console errors.
import { test, expect } from '@playwright/test'
import path from 'node:path'
import fs from 'node:fs'
import { fileURLToPath } from 'node:url'

const dirname = path.dirname(fileURLToPath(import.meta.url))
const TENANT = 'uccp'
const MEDIA_DIR = path.resolve(dirname, '../../../Build Delegate/media/2026-09-01-command-center-v2')

test.beforeAll(() => {
  fs.mkdirSync(MEDIA_DIR, { recursive: true })
})

/** Console errors that are environmental noise, not app defects: basemap
 *  tile/style fetches can be flaky/absent in CI sandboxes. */
const IGNORED = [
  /tile/i,
  /basemaps\.cartocdn\.com/i,
  /ERR_INTERNET_DISCONNECTED/i,
  /Failed to fetch/i,
  // Dev-only MapPanel mount-guard diagnostic: a concurrent route transition
  // between two map surfaces (Live Monitoring ⇄ Command Center) renders the
  // incoming map while the outgoing one is still committed; the guard logs,
  // renders its fallback for that frame, then self-recovers via its release
  // waiter (see mount-guard.tsx). Fires for ANY map→map navigation (e.g.
  // LM → Requests hybrid too), never in production builds.
  /Another map is already mounted/,
]

async function login(page: import('@playwright/test').Page, errors: string[]) {
  page.on('console', (msg) => {
    if (msg.type() === 'error' && !IGNORED.some((re) => re.test(msg.text()))) errors.push(msg.text())
  })
  page.on('pageerror', (err) => errors.push(String(err)))
  await page.goto(`/?tenant=${TENANT}`)
  await page.getByRole('textbox', { name: 'Email' }).fill('admin.uccp@fams.com')
  await page.getByRole('textbox', { name: 'Password' }).fill('Fams@123')
  await page.getByRole('button', { name: 'Login' }).click()
  await expect(page.locator('[data-slot="navrail"]')).toBeVisible({ timeout: 15_000 })
}

test.use({ viewport: { width: 1920, height: 1080 } })

test('Command Center — full flow', async ({ page }) => {
  const errors: string[] = []
  await login(page, errors)

  // ── 1. Rail entry → full-screen dashboard, V5 chrome suppressed ──
  await page.getByRole('button', { name: 'Command Center' }).click()
  await expect(page.getByTestId('command-center')).toBeVisible({ timeout: 15_000 })
  await expect(page.locator('[data-slot="navrail"]')).toHaveCount(0)
  await expect(page.locator('[data-slot="top-nav"]')).toHaveCount(0)
  await expect(page.getByRole('img', { name: 'Qatar MME — UCCP' })).toBeVisible()
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark')

  // v2: BRANDING — dark scope keeps the tenant maroon (the v1 token leak
  // reverted --color-primary to FAMS blue under data-theme="dark").
  await expect
    .poll(() =>
      page.evaluate(() =>
        getComputedStyle(document.documentElement).getPropertyValue('--color-primary').trim().toLowerCase(),
      ),
    )
    .toBe('#6e112d')

  // Map + markers render (18 tankers cluster; weather pills default ON).
  await page.waitForTimeout(4000) // maplibre + tiles settle
  await page.screenshot({ path: `${MEDIA_DIR}/01-dashboard-overview.png` })

  // ── v2: ONE grouped action stack — search + cluster live INSIDE the
  //    top-end tool column; no stray corner buttons remain. ──
  const endTools = page.locator('[data-slot="live-map-end-tools"]')
  await expect(endTools).toBeVisible()
  await expect(endTools.getByRole('button', { name: 'Search places on the map' })).toBeVisible()
  const clusterToggle = page.locator('[data-slot="live-map-cluster-toggle"]')
  await expect(clusterToggle).toHaveCount(1)
  await expect(endTools.locator('[data-slot="live-map-cluster-toggle"]')).toHaveCount(1)
  await page.screenshot({
    path: `${MEDIA_DIR}/02-grouped-action-stack.png`,
    clip: { x: 1920 - 480, y: 60, width: 480, height: 560 },
  })

  // ── v2: floating chart panels (DS chart primitives, seed-derived) ──
  await expect(page.getByText('Requests Over Time')).toBeVisible()
  await expect(page.getByText('Requests by Municipality')).toBeVisible()
  await expect(page.getByText('Response Performance')).toBeVisible()
  await expect(page.getByText('Rainfall Outlook')).toBeVisible()
  await expect(page.getByText('Pipeline by Stage')).toBeVisible()
  // ECharts canvases actually painted (line + donut + two sparklines).
  expect(await page.locator('canvas').count()).toBeGreaterThanOrEqual(4)
  await page.screenshot({
    path: `${MEDIA_DIR}/03-floating-charts.png`,
    clip: { x: 0, y: 60, width: 720, height: 1020 },
  })

  // ── v2: feed time format — hours only below 24h, absolute date beyond
  //    (the "25h ago" regression). ──
  const staleAgo = await page.getByText(/\b(2[4-9]|[3-9]\d|\d{3,})h ago\b/).count()
  expect(staleAgo).toBe(0)

  // ── 5. KPI strip matches the seeds ──
  // fleet: 11 moving / 2 idling + 4 stopped / 1 non-reporting of 18
  const kpi = (label: string) =>
    page.getByText(label, { exact: false }).locator('xpath=following-sibling::span[1]/span[1]')
  await expect(kpi('Fleet Active')).toHaveText('11')
  await expect(kpi('Idling / Stopped')).toHaveText('6')
  // requests: open = 3+4+4+4+3 = 18; critical = 7; dispatched = 10; done = 8
  await expect(kpi('Open Requests')).toHaveText('18')
  await expect(kpi('Critical Priority')).toHaveText('7')
  await expect(kpi('Dispatched')).toHaveText('10')
  await expect(kpi('Completed')).toHaveText('8')

  // ── 6. Viewport scroll contract ──
  const metrics = await page.evaluate(() => ({
    sh: document.documentElement.scrollHeight,
    ch: document.documentElement.clientHeight,
    sw: document.documentElement.scrollWidth,
    cw: document.documentElement.clientWidth,
  }))
  expect(metrics.sh).toBe(metrics.ch)
  expect(metrics.sw).toBe(metrics.cw)

  // ── 3. Weather interaction: station marker → expanded forecast + dimming.
  //    v2: dry stations are hidden (weatherHideDryStations) — of the 40-station
  //    network only the 26 with current rainfall > 0 plot; no "0" capsules. ──
  const stations = page.locator('[aria-label^="Weather station "]')
  expect(await stations.count()).toBe(26)
  const zeroCapsules = await page
    .locator('[aria-label^="Weather station "]', { hasText: /^0$/ })
    .count()
  expect(zeroCapsules).toBe(0)
  await stations.first().click({ force: true })
  await page.waitForTimeout(1500)
  await page.screenshot({ path: `${MEDIA_DIR}/04-weather-expanded.png` })
  await page.keyboard.press('Escape')
  await page.waitForTimeout(400)

  // ── 4. Request pin click → info card ──
  const pins = page.locator('[aria-label^="Incident INC-"]')
  expect(await pins.count()).toBe(36)
  // DOM-level click: a pin may sit outside the current camera frame, where a
  // hit-tested click cannot land; the handler is what we're verifying.
  await pins.first().evaluate((el) => (el as HTMLElement).click())
  await page.waitForTimeout(900)
  const dialog = page.getByRole('dialog', { name: /Request INC-/ })
  await expect(dialog).toBeVisible()
  await expect(dialog.getByText(/Municipality/)).toBeVisible()
  await page.screenshot({ path: `${MEDIA_DIR}/05-request-info-card.png` })

  // ── v2 WOW: open critical requests carry a pulsing halo pin ──
  expect(await page.locator('[data-slot="incident-pin-pulse"]').count()).toBeGreaterThan(0)

  // ── 2. Back arrow → V5 web app restored ──
  await page.getByRole('button', { name: 'Back to UCCP' }).click()
  await expect(page.locator('[data-slot="navrail"]')).toBeVisible({ timeout: 15_000 })
  expect(await page.locator('html').getAttribute('data-theme')).not.toBe('dark')
  await page.screenshot({ path: `${MEDIA_DIR}/06-back-to-v5.png` })

  expect(errors, `console errors:\n${errors.join('\n')}`).toEqual([])
})
