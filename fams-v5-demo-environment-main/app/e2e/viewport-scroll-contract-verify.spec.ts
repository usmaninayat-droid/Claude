// viewport-scroll-contract-verify.spec.ts — PERMANENT regression guard for
// the "window-level vertical scrollbar is back on Live Monitoring Hybrid
// View" bug class (2026-08-31, third occurrence — see
// `LiveHybridView.tsx`'s header comment, `DataTable.tsx`'s clipping-root
// comment, and `Build Delegate/media/2026-08-31-hybrid-scroll-regression3`).
//
// THE CONTRACT: a hybrid/list/map module view fills the viewport EXACTLY —
// `html.scrollHeight === html.clientHeight` and `html.scrollWidth ===
// html.clientWidth` — no window-level scroll on either axis, ever. All
// scrolling happens INSIDE the view's own panels (the list table's
// `[role=region]`, the map canvas). A page scrollbar revealing blank space
// below the fold is always a defect, never a feature — it has shipped THREE
// times because the failure mode has no other cheap signal: everything
// still LOOKS right at rest (scrollTop 0); the excess only becomes visible
// once something scrolls the page.
//
// Root cause of the 2026-08-31 regression (for the next person who breaks
// this): `DataTable`'s clipping root (`overflow-hidden`) was `position:
// static`, so it never established a containing block — an absolutely
// positioned descendant (Tailwind's `.sr-only`, used for accessible column
// labels) escaped its clip and inflated `scrollHeight` on the first
// ancestor that actually clips, which was the module shell body two levels
// above `LiveHybridView`, several DOM levels up. Fixed by making that root
// `position: relative` (see `DataTable.tsx`). This spec asserts the
// RENDERED, PIXEL-LEVEL outcome across every surface built on that same
// virtualized-table pattern, at both a laptop (1440) and a wide-desktop
// (1990) width, so any FUTURE regression of this class — in `DataTable`,
// in `LiveHybridView`, in `MapHybridView`, or in a fixed-height row added to
// any of their panels without `min-h-0`/`flex-1` accounting — fails a run
// instead of shipping unnoticed a fourth time.
//
// Run via `pnpm --filter app e2e` (no --project flag runs every project,
// including `verify-adhoc`, which this file's `-verify.spec.ts` name joins
// automatically — see `playwright.config.ts`'s `testMatch`). No config
// changes needed to wire this in.
import { test, expect, type Page } from '@playwright/test'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const dirname = path.dirname(fileURLToPath(import.meta.url))
const TENANT = 'uccp'
const EMAIL = 'admin.uccp@fams.com'
const PASSWORD = 'Fams@123'
const MEDIA_DIR = path.resolve(dirname, '../../../Build Delegate/media/2026-08-31-hybrid-scroll-regression3')
const WIDTHS = [1440, 1990] as const
const HEIGHT = 900

test.describe.configure({ mode: 'serial' })

async function login(page: Page) {
  const errors: string[] = []
  page.on('console', (msg) => {
    if (msg.type() === 'error') errors.push(msg.text())
  })
  page.on('pageerror', (err) => errors.push(String(err)))
  await page.goto(`/?tenant=${TENANT}`)
  await page.getByRole('textbox', { name: 'Email' }).fill(EMAIL)
  await page.getByRole('textbox', { name: 'Password' }).fill(PASSWORD)
  await page.getByRole('button', { name: 'Login' }).click()
  await expect(page.locator('[data-slot="navrail"]')).toBeVisible({ timeout: 30_000 })
  return errors
}

/** The contract, asserted at whatever viewport the page is currently at. */
async function assertNoWindowScroll(page: Page, label: string) {
  const metrics = await page.evaluate(() => ({
    scrollHeight: document.documentElement.scrollHeight,
    clientHeight: document.documentElement.clientHeight,
    scrollWidth: document.documentElement.scrollWidth,
    clientWidth: document.documentElement.clientWidth,
  }))
  expect(
    metrics.scrollHeight,
    `${label}: html.scrollHeight (${metrics.scrollHeight}) !== clientHeight (${metrics.clientHeight}) — a window/page vertical scrollbar regressed`,
  ).toBe(metrics.clientHeight)
  expect(
    metrics.scrollWidth,
    `${label}: html.scrollWidth (${metrics.scrollWidth}) !== clientWidth (${metrics.clientWidth}) — a window/page horizontal scrollbar regressed`,
  ).toBe(metrics.clientWidth)
}

for (const width of WIDTHS) {
  test.describe(`viewport scroll contract @ ${width}px`, () => {
    test(`Live Monitoring (Hybrid/List/Map) + weather/workforce/detail-sheet states — no window scroll @ ${width}px`, async ({
      page,
    }, testInfo) => {
      await page.setViewportSize({ width, height: HEIGHT })
      const errors = await login(page)
      await page.goto(`/live-monitoring?tenant=${TENANT}`)
      await page.waitForSelector('.maplibregl-canvas', { timeout: 30_000 })
      await page.waitForTimeout(1000)

      // ---- Hybrid View (default tab) ----
      await assertNoWindowScroll(page, 'Live Monitoring — Hybrid View')
      await page.screenshot({
        path: path.join(MEDIA_DIR, `${width}-01-live-hybrid.png`),
        fullPage: false,
      })

      // ---- Workforce chip states (All / Vehicle / Workforce) ----
      const chips = page.locator('[data-slot="live-kind-chips"]')
      if (await chips.count()) {
        for (const label of ['All', 'Vehicle', 'Workforce']) {
          await chips.getByRole('radio', { name: label }).click()
          await page.waitForTimeout(300)
          await assertNoWindowScroll(page, `Live Monitoring — Hybrid View, kind chip = ${label}`)
        }
        await page.screenshot({
          path: path.join(MEDIA_DIR, `${width}-02-workforce-chip-states.png`),
          fullPage: false,
        })
        // Back to the default before the next states.
        await chips.getByRole('radio', { name: 'All' }).click()
        await page.waitForTimeout(200)
      }

      // ---- Weather layer on + forecast panel expanded ----
      await page.waitForSelector('[data-slot="live-map-tools"]', { timeout: 20_000 })
      await page.getByRole('button', { name: 'Weather layer' }).click()
      await expect(page.getByRole('button', { name: 'Expand forecast panel' })).toBeVisible({ timeout: 20_000 })
      await assertNoWindowScroll(page, 'Live Monitoring — Hybrid View, weather layer on (collapsed strip)')
      await page.getByRole('button', { name: 'Expand forecast panel' }).click()
      await expect(page.getByText('About Location')).toBeVisible({ timeout: 20_000 })
      await page.waitForTimeout(400)
      await assertNoWindowScroll(page, 'Live Monitoring — Hybrid View, weather panel expanded')
      await page.screenshot({
        path: path.join(MEDIA_DIR, `${width}-03-weather-expanded.png`),
        fullPage: false,
      })
      await page.getByRole('button', { name: 'Close forecast panel' }).click()
      await page.getByRole('button', { name: 'Hide weather layer' }).click()
      await page.waitForTimeout(200)

      // ---- Detail sheet open (row click) ----
      await page.getByRole('tab', { name: 'List View' }).click()
      await page.waitForSelector('table tbody tr')
      await assertNoWindowScroll(page, 'Live Monitoring — List View')
      await page.locator('table tbody tr').first().click()
      await expect(page.locator('[data-slot="profile-stack"]')).toBeVisible({ timeout: 20_000 })
      await page.waitForTimeout(300)
      await assertNoWindowScroll(page, 'Live Monitoring — List View, detail sheet open')
      await page.screenshot({
        path: path.join(MEDIA_DIR, `${width}-04-detail-sheet.png`),
        fullPage: false,
      })
      await page.keyboard.press('Escape')
      await expect(page.locator('[data-slot="profile-stack"]')).toBeHidden()

      // ---- Map View ----
      await page.getByRole('tab', { name: 'Map View' }).click()
      await page.waitForSelector('.maplibregl-canvas', { timeout: 30_000 })
      await page.waitForTimeout(500)
      await assertNoWindowScroll(page, 'Live Monitoring — Map View')

      if (testInfo.retry === 0) {
        expect(errors, `console/page errors: ${errors.join(' | ')}`).toEqual([])
      }
    })

    test(`Weather Stations hybrid — no window scroll @ ${width}px (module currently hidden — see rain-sensors/HIDDEN.md)`, async ({
      page,
    }) => {
      await page.setViewportSize({ width, height: HEIGHT })
      await login(page)
      // The `rain-sensors` module ("Weather Stations") is hidden from the
      // UCCP rail/routing as of 2026-08-31 (tenants/uccp/modules/rain-sensors
      // /HIDDEN.md) — re-enabling it is a two-line tenant.json edit, at which
      // point this test should assert the same Hybrid View states the Live
      // Monitoring block above does (nav to `/rain-sensors`, click
      // `Hybrid View`, `assertNoWindowScroll`). Until then there is no
      // hybrid surface to regress, so this only pins the hidden contract
      // (same assertion `smoke.spec.ts` makes) and confirms navigating the
      // route directly still leaves the page height-clean.
      await page.goto(`/rain-sensors?tenant=${TENANT}`)
      await expect(page.locator('[data-slot="navrail"]')).toBeVisible()
      await expect(page.locator('table')).toHaveCount(0)
      await assertNoWindowScroll(page, 'Weather Stations route (hidden module, no content)')
    })

    test(`Requests & Complaints (Hybrid) + detail sheet — no window scroll @ ${width}px`, async ({ page }) => {
      await page.setViewportSize({ width, height: HEIGHT })
      const errors = await login(page)
      await page.goto(`/incidents?tenant=${TENANT}`)
      await page.getByRole('tab', { name: 'Hybrid View' }).click()
      await expect(page.locator('[data-slot="map-hybrid-view"]')).toBeVisible({ timeout: 20_000 })
      await page.waitForSelector('.maplibregl-canvas', { timeout: 20_000 })
      await page.waitForTimeout(1000)
      await assertNoWindowScroll(page, 'Requests & Complaints — Hybrid View')
      await page.screenshot({
        path: path.join(MEDIA_DIR, `${width}-05-incidents-hybrid.png`),
        fullPage: false,
      })

      // Detail sheet open, from the hybrid view's own card list.
      const card = page.locator('[data-slot="record-map-card"]').first()
      if (await card.count()) {
        await card.click()
        await expect(page.locator('[data-slot="profile-stack"]')).toBeVisible({ timeout: 20_000 })
        await page.waitForTimeout(300)
        await assertNoWindowScroll(page, 'Requests & Complaints — Hybrid View, detail sheet open')
        await page.keyboard.press('Escape')
        await expect(page.locator('[data-slot="profile-stack"]')).toBeHidden()
      }

      expect(errors, `console/page errors: ${errors.join(' | ')}`).toEqual([])
    })
  })
}
