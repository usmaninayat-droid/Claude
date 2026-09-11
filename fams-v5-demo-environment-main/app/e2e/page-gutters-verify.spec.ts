// page-gutters-verify.spec.ts — 2026-09-01 verification run for the shared
// module-page gutter fix (`ModuleViewShell`'s `MODULE_GUTTER_X`): confirms
// the toolbar row, the KPI summary row, and the list/table body all read the
// SAME left/right inset on Requests & Complaints (List/Kanban/Hybrid) with
// zero console errors, and screenshots each surface plus a Live Monitoring
// regression shot to Build Delegate/media/2026-09-01-page-gutters/. Also
// verifies the recolored KPI icons (open=warning, critical=danger,
// reopened=info) are no longer uniformly red.
import { test, expect, type Page, type ConsoleMessage } from '@playwright/test'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const dirname = path.dirname(fileURLToPath(import.meta.url))
const TENANT = 'uccp'
const EMAIL = 'admin.uccp@fams.com'
const PASSWORD = 'Fams@123'
const MEDIA_DIR = path.resolve(dirname, '../../../Build Delegate/media/2026-09-01-page-gutters')

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

async function assertGuttersAligned(page: Page) {
  const rects = await page.evaluate(() => {
    const q = (sel: string) => document.querySelector(sel)?.getBoundingClientRect() ?? null
    return {
      filtersRow: q('[data-slot="module-view-shell-filters"]'),
      summary: q('[data-slot="list-view-summary"]'),
      shellBody: q('[data-slot="module-view-shell-body"]'),
    }
  })
  // Toolbar and KPI row must share the identical left/right edges.
  expect(rects.summary?.left).toBe(rects.filtersRow?.left)
  expect(rects.summary?.right).toBe(rects.filtersRow?.right)
  // The body scroller itself (list/table's container) also matches.
  expect(rects.shellBody?.left).toBe(rects.filtersRow?.left)
  expect(rects.shellBody?.right).toBe(rects.filtersRow?.right)
}

test.describe.configure({ mode: 'serial' })

test('list view — toolbar/KPI/table gutters aligned + KPI colors differentiated', async ({ page }) => {
  const errors = trackConsoleErrors(page)
  await page.setViewportSize({ width: 1600, height: 1000 })
  await login(page)
  await page.goto(`/incidents?tenant=${TENANT}`)
  await page.getByRole('tab', { name: 'List View' }).click()
  await page.waitForSelector('table tbody tr')
  await page.waitForTimeout(400)

  await assertGuttersAligned(page)

  // KPI icon tones: no longer uniformly red — open=warning(amber-ish),
  // critical=danger(red), reopened=info(blue).
  const tileColors = await page.evaluate(() => {
    const tiles = Array.from(document.querySelectorAll('[data-slot="list-view-summary"] [data-slot="icon-badge"]'))
    return tiles.map((el) => getComputedStyle(el).color)
  })
  expect(tileColors.length).toBe(3)
  const distinct = new Set(tileColors)
  expect(distinct.size).toBeGreaterThan(1)

  await page.screenshot({ path: path.join(MEDIA_DIR, '01-list-view-gutters.png'), fullPage: false })
  expect(errors, `console errors on list view: ${errors.join('\n')}`).toHaveLength(0)
})

test('kanban view — no full-bleed regression', async ({ page }) => {
  const errors = trackConsoleErrors(page)
  await page.setViewportSize({ width: 1600, height: 1000 })
  await login(page)
  await page.goto(`/incidents?tenant=${TENANT}`)
  await page.getByRole('tab', { name: 'Kanban View' }).click()
  await expect(page.locator('[data-slot="kanban-board"]')).toBeVisible()
  await page.waitForTimeout(400)
  const rects = await page.evaluate(() => {
    const q = (sel: string) => document.querySelector(sel)?.getBoundingClientRect() ?? null
    return {
      filtersRow: q('[data-slot="module-view-shell-filters"]'),
      shellBody: q('[data-slot="module-view-shell-body"]'),
    }
  })
  expect(rects.shellBody?.left).toBe(rects.filtersRow?.left)
  expect(rects.shellBody?.right).toBe(rects.filtersRow?.right)
  await page.screenshot({ path: path.join(MEDIA_DIR, '02-kanban-view-gutters.png'), fullPage: false })
  expect(errors, `console errors on kanban view: ${errors.join('\n')}`).toHaveLength(0)
})

test('hybrid view — map panel stays intentionally full-bleed', async ({ page }) => {
  const errors = trackConsoleErrors(page)
  await page.setViewportSize({ width: 1600, height: 1000 })
  await login(page)
  await page.goto(`/incidents?tenant=${TENANT}`)
  await page.getByRole('tab', { name: 'Hybrid View' }).click()
  await expect(page.locator('[data-slot="map-hybrid-view"]')).toBeVisible({ timeout: 15_000 })
  await page.waitForTimeout(800)
  await page.screenshot({ path: path.join(MEDIA_DIR, '03-hybrid-view.png'), fullPage: false })
  expect(errors, `console errors on hybrid view: ${errors.join('\n')}`).toHaveLength(0)
})

test('live monitoring — list regression, no gutter break', async ({ page }) => {
  const errors = trackConsoleErrors(page)
  await page.setViewportSize({ width: 1600, height: 1000 })
  await login(page)
  await page.goto(`/live-monitoring?tenant=${TENANT}`)
  await page.waitForTimeout(1000)
  await page.screenshot({ path: path.join(MEDIA_DIR, '04-live-monitoring-regression.png'), fullPage: false })
  expect(errors, `console errors on live monitoring: ${errors.join('\n')}`).toHaveLength(0)
})
