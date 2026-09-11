// planning-topnav-v3-verify.spec.ts — verification for the round-3
// corrective pass: planning's tabs now carry the FULL rich-descriptor shape
// (icon, active-tab "⋮" menu, "+" add-view takeover) `ModuleView` gives every
// blueprint module, and the vendored screens' primary accents are re-themed
// to qatar-mme maroon (Phase B mechanism re-applied). Not part of the
// regression suite (verify-adhoc project, matches *-verify.spec.ts) — a
// manual capture per the LOG.md entry for 2026-08-31 (run 3).
import { test, expect } from '@playwright/test'

const TENANT = 'uccp'
const EMAIL = 'admin.uccp@fams.com'
const PASSWORD = 'Fams@123'
const OUT_DIR =
  'e2e-artifacts/2026-08-31-planning-topnav-v3'

async function login(page: import('@playwright/test').Page) {
  await page.goto(`/?tenant=${TENANT}`)
  await page.getByRole('textbox', { name: 'Email' }).fill(EMAIL)
  await page.getByRole('textbox', { name: 'Password' }).fill(PASSWORD)
  await page.getByRole('button', { name: 'Login' }).click()
  await expect(page.locator('[data-slot="navrail"]')).toBeVisible({ timeout: 60_000 })
}

test('Live Monitoring — reference tab strip (icon + active card + ⋮ + dividers + +)', async ({ page }) => {
  test.setTimeout(180_000)
  await login(page)
  await page.goto(`/live-monitoring?tenant=${TENANT}`)
  await expect(page.locator('[data-slot="module-view-tabs"]').first()).toBeVisible({ timeout: 30_000 })
  await page.waitForTimeout(1500)
  await page.screenshot({ path: `${OUT_DIR}/live-monitoring.png`, fullPage: false })
})

test('Smart Planning — rich tab descriptors + working interactions', async ({ page }) => {
  test.setTimeout(180_000)
  await login(page)
  await page.goto(`/smart-planning?tenant=${TENANT}`)
  const shell = page.locator('[data-slot="module-view-shell"]')
  await expect(shell).toBeVisible({ timeout: 30_000 })
  const tabs = page.locator('[data-slot="module-view-tabs"]').first()
  await expect(tabs).toBeVisible()
  const frame = page.frameLocator('iframe').first()
  await expect(frame.locator('body')).toBeVisible({ timeout: 30_000 })
  await page.waitForTimeout(1500)
  await page.screenshot({ path: `${OUT_DIR}/smart-planning-hybrid.png`, fullPage: false })

  // Icons render on both tabs (leading glyph inside the trigger).
  const hybridTab = page.getByRole('tab', { name: 'Hybrid View' })
  await expect(hybridTab.locator('svg').first()).toBeVisible()

  // Active tab's "⋮" view-options menu opens.
  const menuTrigger = page.locator('[data-slot="module-view-tab-menu"]')
  await expect(menuTrigger).toBeVisible()
  await menuTrigger.click()
  await expect(page.getByRole('menuitem', { name: 'Copy Link to View' })).toBeVisible()
  await expect(page.getByRole('menuitem', { name: 'Delete View' })).toBeVisible()
  await page.screenshot({ path: `${OUT_DIR}/smart-planning-view-menu.png`, fullPage: false })
  await page.keyboard.press('Escape')

  // Tab switch still drives the embedded app's view via the shell.
  await page.getByRole('tab', { name: 'Calendar View' }).click()
  await page.waitForTimeout(1500)
  await expect(frame.locator('body')).toBeVisible({ timeout: 30_000 })
  await page.screenshot({ path: `${OUT_DIR}/smart-planning-calendar.png`, fullPage: false })

  // "+" add-view opens the standard picker takeover (disabled/empty state).
  const addView = page.getByRole('button', { name: 'Add view' })
  await expect(addView).toBeVisible()
  await addView.click()
  await expect(page.getByText('Select Preferred View')).toBeVisible({ timeout: 10_000 })
  await page.screenshot({ path: `${OUT_DIR}/smart-planning-add-view-picker.png`, fullPage: false })
})

test('Plan Monitoring — rich tab descriptors + working interactions', async ({ page }) => {
  test.setTimeout(180_000)
  await login(page)
  await page.goto(`/plan-monitoring?tenant=${TENANT}`)
  const shell = page.locator('[data-slot="module-view-shell"]')
  await expect(shell).toBeVisible({ timeout: 30_000 })
  await expect(page.locator('[data-slot="module-view-tabs"]').first()).toBeVisible()
  const frame = page.frameLocator('iframe').first()
  await expect(frame.locator('body')).toBeVisible({ timeout: 30_000 })
  await page.waitForTimeout(1500)
  await page.screenshot({ path: `${OUT_DIR}/plan-monitoring.png`, fullPage: false })

  const listTab = page.getByRole('tab', { name: 'List View' })
  await expect(listTab.locator('svg').first()).toBeVisible()

  const menuTrigger = page.locator('[data-slot="module-view-tab-menu"]')
  await expect(menuTrigger).toBeVisible()
  await menuTrigger.click()
  await expect(page.getByRole('menuitem', { name: 'Copy Link to View' })).toBeVisible()
  await page.keyboard.press('Escape')
})

// ---- 2026-08-31 scope addition: SP gains List View, PM gains Hybrid View ----

test('Smart Planning — new List View tab (reuses Plan Monitoring table pattern)', async ({ page }) => {
  test.setTimeout(180_000)
  await login(page)
  await page.goto(`/smart-planning?tenant=${TENANT}`)
  const frame = page.frameLocator('iframe').first()
  await expect(frame.locator('body')).toBeVisible({ timeout: 30_000 })
  await page.waitForTimeout(1000)

  // Third tab exists with its own icon.
  const listTab = page.getByRole('tab', { name: 'List View' })
  await expect(listTab).toBeVisible()
  await expect(listTab.locator('svg').first()).toBeVisible()

  await listTab.click()
  await page.waitForTimeout(1500)
  // The reused PlanMonitoring table renders: plan-lifecycle KPI tiles +
  // DRAFTED/APPROVED status pills (not PM's SCHEDULED/ONGOING/COMPLETED).
  await expect(frame.getByText('Total Number of Plans')).toBeVisible({ timeout: 15_000 })
  await expect(frame.getByText('DRAFTED').first()).toBeVisible()
  await page.screenshot({ path: `${OUT_DIR}/smart-planning-list.png`, fullPage: false })

  // Row click → the same PlanOverview detail surface PM's List View opens.
  await frame.locator('table tbody tr').first().click()
  await expect(frame.getByText('AVG COMPLIANCE').first()).toBeVisible({ timeout: 15_000 })
  await page.screenshot({ path: `${OUT_DIR}/smart-planning-list-row-detail.png`, fullPage: false })
})

test('Plan Monitoring — new Hybrid View tab (reuses Smart Planning list+map pattern)', async ({ page }) => {
  test.setTimeout(180_000)
  await login(page)
  await page.goto(`/plan-monitoring?tenant=${TENANT}`)
  const frame = page.frameLocator('iframe').first()
  await expect(frame.locator('body')).toBeVisible({ timeout: 30_000 })
  await page.waitForTimeout(1000)

  const hybridTab = page.getByRole('tab', { name: 'Hybrid View' })
  await expect(hybridTab).toBeVisible()
  await expect(hybridTab.locator('svg').first()).toBeVisible()

  await hybridTab.click()
  await page.waitForTimeout(2000)
  // List+map split with run data, relabeled legend, no "Create New Plan"
  // button (this view monitors runs, it doesn't create plans).
  await expect(frame.getByText('ONGOING').first()).toBeVisible({ timeout: 15_000 })
  await expect(frame.getByText('In Progress / Done')).toBeVisible()
  await expect(frame.getByRole('button', { name: /Create New Plan/i })).toHaveCount(0)
  await page.screenshot({ path: `${OUT_DIR}/plan-monitoring-hybrid.png`, fullPage: false })

  // Eye-toggle (visibility) interaction works.
  const eyeToggle = frame.locator('button[aria-pressed]').first()
  await expect(eyeToggle).toBeVisible()
  const before = await eyeToggle.getAttribute('aria-pressed')
  await eyeToggle.click()
  await expect(eyeToggle).not.toHaveAttribute('aria-pressed', before ?? '')

  // Row click → the same PlanOverview detail surface PM's List View opens.
  await frame.locator('table tbody tr').first().click()
  await expect(frame.getByText('AVG COMPLIANCE').first()).toBeVisible({ timeout: 15_000 })
  await page.screenshot({ path: `${OUT_DIR}/plan-monitoring-hybrid-row-detail.png`, fullPage: false })
})

test('Smart Planning iframe — primary accents render qatar-mme maroon', async ({ page }) => {
  test.setTimeout(180_000)
  await login(page)
  await page.goto(`/smart-planning?tenant=${TENANT}`)
  const frame = page.frameLocator('iframe').first()
  await expect(frame.locator('body')).toBeVisible({ timeout: 30_000 })
  await page.waitForTimeout(1500)
  const createButton = frame.getByRole('button', { name: /Create New Plan/i }).first()
  await expect(createButton).toBeVisible({ timeout: 15_000 })
  const bg = await createButton.evaluate((el) => getComputedStyle(el).backgroundColor)
  // qatar-mme --primary is #6E112D → rgb(110, 17, 45). FAMS blue would be far
  // from this. Assert the red channel dominates (maroon), not blue.
  const [r, g, b] = bg.match(/\d+/g)!.map(Number)
  expect(r).toBeGreaterThan(b)
  await page.screenshot({ path: `${OUT_DIR}/smart-planning-maroon-cta.png`, fullPage: false })
})
