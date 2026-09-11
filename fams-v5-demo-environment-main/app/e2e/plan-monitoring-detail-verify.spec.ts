// plan-monitoring-detail-verify.spec.ts — verification for the Plan
// Monitoring single-plan FULL-SCREEN detail rebuild (Figma "Tadweer —
// November Release" fTNUZHTxIZxNlBKq3aw2hk, container 3092:1494). Manual
// capture per the LOG.md entry for 2026-08-31 (plan-detail rebuild) — not
// part of the regression suite (verify-adhoc project).
import { test, expect } from '@playwright/test'

const TENANT = 'uccp'
const EMAIL = 'admin.uccp@fams.com'
const PASSWORD = 'Fams@123'
const OUT_DIR =
  'e2e-artifacts/2026-08-31-plan-monitoring-detail'

type PW = import('@playwright/test').Page
type Frame = ReturnType<PW['frameLocator']>

/**
 * (Re)enter the full-screen detail if a concurrent-lane Vite full reload
 * bounced the embed back to List View mid-test (other sessions actively
 * editing tracked seeds/blueprints trigger host full reloads, which remount
 * the iframe and drop its screen state — observed 2026-09-01, see LOG.md).
 * No-op while the detail is still mounted.
 */
async function ensureDetail(page: PW, frame: Frame) {
  if (await frame.getByRole('button', { name: 'Back' }).count()) return
  await expect(frame.locator('table tbody tr').first()).toBeVisible({ timeout: 30_000 })
  await frame.locator('table tbody tr').first().click()
  await expect(frame.getByRole('button', { name: 'Back' })).toBeVisible({ timeout: 20_000 })
  await page.waitForTimeout(500)
}

async function login(page: import('@playwright/test').Page) {
  await page.goto(`/?tenant=${TENANT}`)
  await page.getByRole('textbox', { name: 'Email' }).fill(EMAIL)
  await page.getByRole('textbox', { name: 'Password' }).fill(PASSWORD)
  await page.getByRole('button', { name: 'Login' }).click()
  await expect(page.locator('[data-slot="navrail"]')).toBeVisible({ timeout: 60_000 })
}

test('Plan Monitoring List View — row click opens full-screen single-plan detail, all sections in order, zero console errors', async ({ page }) => {
  test.setTimeout(180_000)
  const consoleErrors: string[] = []
  page.on('console', (msg) => {
    // Vite dev-server reload noise from CONCURRENT lanes rebuilding DS dist /
    // editing tracked files is environmental, not a product console error.
    if (msg.type() === 'error' && !/\[vite\]|Failed to load module script/.test(msg.text())) consoleErrors.push(msg.text())
  })
  page.on('pageerror', (err) => consoleErrors.push(err.message))

  await login(page)
  await page.goto(`/plan-monitoring?tenant=${TENANT}`)
  const frame = page.frameLocator('iframe').first()
  await expect(frame.locator('body')).toBeVisible({ timeout: 30_000 })
  await page.waitForTimeout(1000)

  // Row click on List View → straight into the full-screen detail (no
  // intermediate day-picker `PlanOverview` screen in this path anymore).
  await frame.locator('table tbody tr').first().click()

  // Section 1 — top bar (Figma 3092:1517): back affordance + PID + title +
  // municipality/lot chips + status pill. No inner view-tab strip (dropped
  // per rule 1 — the shell's own ModuleView tabs remain the only chrome).
  const backBtn = frame.getByRole('button', { name: 'Back' })
  await expect(backBtn).toBeVisible({ timeout: 20_000 })
  await expect(frame.getByText(/^(FPL|PID)-\d+/)).toBeVisible()
  await page.screenshot({ path: `${OUT_DIR}/01-topbar-built.png`, fullPage: false })

  await ensureDetail(page, frame)
  // Section 2 — KPI band (Figma 3092:1537): compliance gauge + resource cells.
  await expect(frame.getByText('Overall Compliance')).toBeVisible()
  // exact: true — "Tanker" also appears inside the weight-trend chart's
  // "Allowed Tanker Load" legend entry further down the page.
  await expect(frame.getByText('Tanker', { exact: true })).toBeVisible()
  await page.screenshot({ path: `${OUT_DIR}/02-kpiband-built.png`, fullPage: false })

  await ensureDetail(page, frame)
  // Section 3 — Plan Log + route-replay map (Figma 3092:1982). The basemap is
  // remote CARTO vector tiles — wait for the GL canvas plus a real settle
  // (tiles land ~4s after mount under load) so the screenshot shows the
  // rendered Qatar basemap, not a white pane.
  await expect(frame.getByText('Plan Log')).toBeVisible()
  await expect(frame.locator('canvas.maplibregl-canvas').first()).toBeVisible({ timeout: 20_000 })
  await frame.locator('text=Plan Log').scrollIntoViewIfNeeded()
  await page.waitForTimeout(6000)
  await page.screenshot({ path: `${OUT_DIR}/03-planlog-map-built.png`, fullPage: false })

  await ensureDetail(page, frame)
  // Interactions — route replay toggle (map+timeline hybrid affordance) and
  // the Plan Log filter tabs.
  const replayBtn = frame.getByRole('button', { name: /route replay/ })
  await replayBtn.click()
  await page.waitForTimeout(1200)
  await page.screenshot({ path: `${OUT_DIR}/03b-route-replay-playing.png`, fullPage: false })
  await replayBtn.click()
  await frame.getByText('Critical Events', { exact: true }).click()
  await page.waitForTimeout(400)
  await page.screenshot({ path: `${OUT_DIR}/03c-planlog-critical-tab.png`, fullPage: false })
  await frame.getByText('All', { exact: true }).first().click()

  await ensureDetail(page, frame)
  // Section 4/5 — analytics container (3092:2370): Compliance Break Down +
  // Event Type Breakdown row (6049:7424).
  await frame.getByText('Compliance Break Down').scrollIntoViewIfNeeded()
  await expect(frame.getByText('Event Type Breakdown')).toBeVisible()
  await page.waitForTimeout(300)
  await page.screenshot({ path: `${OUT_DIR}/04-breakdown-eventchart-built.png`, fullPage: false })

  await ensureDetail(page, frame)
  // Section 6 — Weight/Water Extraction Trend (3092:2691).
  await frame.getByText('Water Extraction Trend').first().scrollIntoViewIfNeeded()
  await page.waitForTimeout(300)
  await page.screenshot({ path: `${OUT_DIR}/05-weighttrend-built.png`, fullPage: false })

  await ensureDetail(page, frame)
  // Section 7 — Off-Plan Response Sites donut (3092:2437, flood-equivalent
  // of the reference's "Outside Plan Bins Collected").
  await expect(frame.getByText('Off-Plan Response Sites')).toBeVisible()
  await page.screenshot({ path: `${OUT_DIR}/06-offplan-donut-built.png`, fullPage: false })

  await ensureDetail(page, frame)
  // Section 8 — Gross Weight / Water Volume Extracted vs Discharged (3092:2769).
  await frame.getByText(/Water Volume/).scrollIntoViewIfNeeded()
  // Tolerance badge text is data-driven (deterministic-but-varied per plan) —
  // assert either genuine state renders, not a specific one.
  await expect(frame.getByText(/(Within|Out of) Tolerance/)).toBeVisible()
  await page.screenshot({ path: `${OUT_DIR}/07-grossweight-built.png`, fullPage: false })

  await ensureDetail(page, frame)
  // Section 9 — Water Extraction Volume bar (3092:2481, flood-equivalent of
  // the reference's "Bin Breakdown").
  await expect(frame.getByText('Water Extraction Volume')).toBeVisible()
  await page.screenshot({ path: `${OUT_DIR}/08-volumebar-built.png`, fullPage: false })

  await ensureDetail(page, frame)
  // Section 10 — bottom full-width Response Completion Trend (3092:2822,
  // flood-equivalent of "Bin Collection Trend").
  await expect(frame.getByText('Response Completion Trend')).toBeVisible()
  await frame.getByText('Response Sites Completed').scrollIntoViewIfNeeded()
  await page.waitForTimeout(300)
  await page.screenshot({ path: `${OUT_DIR}/09-collectiontrend-built.png`, fullPage: false })

  expect(consoleErrors, `console errors: ${consoleErrors.join('\n')}`).toEqual([])
})

test('Plan Monitoring Hybrid View — row click opens the same full-screen detail', async ({ page }) => {
  test.setTimeout(180_000)
  await login(page)
  await page.goto(`/plan-monitoring?tenant=${TENANT}`)
  const frame = page.frameLocator('iframe').first()
  await expect(frame.locator('body')).toBeVisible({ timeout: 30_000 })
  await page.waitForTimeout(1000)

  const hybridTab = page.getByRole('tab', { name: 'Hybrid View' })
  await hybridTab.click()
  await page.waitForTimeout(1500)
  await frame.locator('table tbody tr').first().click()

  const backBtn = frame.getByRole('button', { name: 'Back' })
  await expect(backBtn).toBeVisible({ timeout: 20_000 })
  await expect(frame.getByText(/^(FPL|PID)-\d+/)).toBeVisible()
  await expect(frame.getByText('Overall Compliance')).toBeVisible()
  await page.screenshot({ path: `${OUT_DIR}/10-hybrid-row-detail-built.png`, fullPage: false })

  // Back affordance returns to the module (List View, not a stuck detail).
  await backBtn.click()
  await page.waitForTimeout(500)
  await expect(frame.locator('table tbody tr').first()).toBeVisible({ timeout: 15_000 })
})

test('Deep link ?record= opens the detail for that FPL record; Source Request chip routes to the ticket', async ({ page }) => {
  test.setTimeout(180_000)
  await login(page)
  // FPL-4001 is a seeded request-triggered daily plan (source_request INC-12).
  await page.goto(`/plan-monitoring?tenant=${TENANT}&record=FPL-4001`)
  const frame = page.frameLocator('iframe').first()
  await expect(frame.getByRole('button', { name: 'Back' })).toBeVisible({ timeout: 30_000 })
  await expect(frame.getByText('FPL-4001')).toBeVisible()
  const srChip = frame.getByRole('button', { name: /Open source request/ })
  await expect(srChip).toBeVisible()
  await page.screenshot({ path: `${OUT_DIR}/11-deeplink-detail-sourcerequest.png`, fullPage: false })
  // Chip posts uccp:navigate up; the host pushes /incidents?record=INC-12.
  await srChip.click()
  await page.waitForURL(/\/incidents\?.*record=INC-12/, { timeout: 20_000 })
  await page.waitForTimeout(2500)
  await page.screenshot({ path: `${OUT_DIR}/12-sourcerequest-ticket-opened.png`, fullPage: false })
})
