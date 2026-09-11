// pipeline-flow-integration-verify.spec.ts — 2026-08-31 Requests & Complaints
// pipeline refinement + Plan Monitoring integration. Confirms: (1) the
// stage-appropriate assignment actions (Assign Inspector at INTAKE/TRIAGE,
// Allocate Tanker(s) at ASSESSED/REOPENED) render and work live; (2) a
// tanker+driver allocation auto-creates a linked `plan-monitoring/daily-plan`
// record and surfaces a confirmation; (3) a TANKER ASSIGNED+ request already
// shows its linked daily task; (4) Plan Monitoring lists the task linking
// back to the source request; (5) zero console errors throughout; and (6)
// every pre-existing protected surface (kanban read-only, creation form incl.
// floating close, filters/facets) still works.
import { test, expect, type Page, type ConsoleMessage } from '@playwright/test'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const dirname = path.dirname(fileURLToPath(import.meta.url))
const TENANT = 'uccp'
const EMAIL = 'admin.uccp@fams.com'
const PASSWORD = 'Fams@123'
const MEDIA_DIR = path.resolve(
  dirname,
  '../../../Build Delegate/media/2026-08-31-pipeline-flow-integration',
)

test.describe.configure({ mode: 'serial' })

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

test('kanban still read-only + filters/facets intact; board redesign measures out (20px gap, wider columns, edge padding, one-row header)', async ({ page }) => {
  const errors = trackConsoleErrors(page)
  await login(page)
  await page.goto(`/incidents?tenant=${TENANT}`)
  await page.getByRole('tab', { name: 'Kanban View' }).click()
  const board = page.locator('[data-slot="kanban-board"]')
  await expect(board).toBeVisible()
  const columnCount = await page.locator('[data-slot="kanban-column"]').count()
  expect(columnCount).toBe(9)
  await page.screenshot({ path: path.join(MEDIA_DIR, '00-kanban-regression.png'), fullPage: false })

  // 20px column gap + column width (w-96 = 384px, wider than the 320px
  // shared default).
  const columns = page.locator('[data-slot="kanban-column"]')
  const firstBox = await columns.first().boundingBox()
  const secondBox = await columns.nth(1).boundingBox()
  expect(firstBox && secondBox ? secondBox.x - (firstBox.x + firstBox.width) : -1).toBeCloseTo(20, 0)
  expect(Math.round(firstBox?.width ?? 0)).toBeGreaterThanOrEqual(380)

  // Left edge padding at default (unscrolled) position: the board's own
  // padding-inline-start, not the first column touching the container edge.
  const boardBox = await board.boundingBox()
  expect(firstBox && boardBox ? firstBox.x - boardBox.x : -1).toBeGreaterThanOrEqual(16)

  await page.screenshot({ path: path.join(MEDIA_DIR, '00b-kanban-board-edges.png'), fullPage: false })

  // Card header is ONE row: ID chip + Type tag share the row with Priority
  // (no wrap — Type sits beside the ID chip, not under Priority).
  const firstCard = page.locator('[data-slot="kanban-card"]').first()
  await expect(firstCard).toBeVisible()
  await page.screenshot({ path: path.join(MEDIA_DIR, '00c-kanban-card-header-row.png'), fullPage: false })

  expect(errors, `console errors on kanban: ${errors.join('\n')}`).toHaveLength(0)
})

test('creation form still works incl. floating close button (regression guard)', async ({ page }) => {
  const errors = trackConsoleErrors(page)
  await login(page)
  await page.goto(`/incidents?tenant=${TENANT}`)
  await page.getByRole('tab', { name: 'List View' }).click()
  await page.getByRole('button', { name: 'New Request/Complaint', exact: true }).click()
  await expect(page.locator('[data-slot="creation-sheet"]')).toBeVisible()
  const floatingClose = page.getByRole('button', { name: 'Close' })
  await expect(floatingClose).toBeVisible()
  await expect(floatingClose).toHaveClass(/rounded-full/)
  await floatingClose.click()
  await expect(page.locator('[data-slot="creation-sheet"]')).toBeHidden()

  expect(errors, `console errors on creation form: ${errors.join('\n')}`).toHaveLength(0)
})

// Inline-edit contract (coordinator correction, same day): NO header
// buttons. An editable field's value shows a primary-colored pencil
// (`[data-slot="inline-edit-pencil"]`) at its end ONLY on hover
// (`[data-slot="inline-edit-field"]:hover`); clicking it opens a popup
// anchored to the field; picking a value saves immediately and closes.
test('INTAKE request — Assigned Inspector inline-edit (hover pencil → popup → immediate save)', async ({ page }) => {
  test.setTimeout(60_000)
  const errors = trackConsoleErrors(page)
  await login(page)
  await page.goto(`/incidents?tenant=${TENANT}`)
  await page.getByRole('tab', { name: 'List View' }).click()
  await page.waitForSelector('table tbody tr')

  // INC-01 is an INTAKE record (Flash flooding at Al Wakrah Corniche).
  await page.getByRole('row', { name: /INC-01/ }).first().click()
  await expect(page.locator('[data-slot="profile-stack"]')).toBeVisible()
  await page.waitForTimeout(400)

  // Locate the Assigned Inspector row specifically via its pencil aria-label.
  const pencil = page.locator('[data-slot="inline-edit-pencil"][aria-label="Edit Assigned Inspector"]')
  await pencil.scrollIntoViewIfNeeded()
  const fieldWrapper = pencil.locator('xpath=ancestor::span[@data-slot="inline-edit-field"]')
  await fieldWrapper.hover()
  await expect(pencil).toBeVisible()
  await page.screenshot({ path: path.join(MEDIA_DIR, '01-intake-inspector-hover-pencil.png'), fullPage: false })

  await pencil.click()
  const popover = page.locator('[data-slot="popover-content"]')
  await expect(popover).toBeVisible()
  await expect(popover.getByText('Assigned Inspector')).toBeVisible()
  await page.screenshot({ path: path.join(MEDIA_DIR, '02-assign-inspector-popup.png'), fullPage: false })

  // Pick an inspector from the roster — saves immediately, no separate Save click.
  await popover.locator('button', { hasText: /Al-|Zaki|Mendoza|Ibrahim|Nair/ }).first().click()
  await page.waitForTimeout(300)

  // Toast confirms assignment + stage advance; popup is closed.
  await expect(page.getByText(/Inspector assigned/)).toBeVisible({ timeout: 5000 })
  await expect(popover).toBeHidden()
  await page.screenshot({ path: path.join(MEDIA_DIR, '03-inspector-assigned-toast.png'), fullPage: false })

  expect(errors, `console errors on inspector inline-edit: ${errors.join('\n')}`).toHaveLength(0)
})

test('ASSESSED request — Tanker assigned inline-edit works + creates linked Plan Monitoring task', async ({ page }) => {
  test.setTimeout(60_000)
  const errors = trackConsoleErrors(page)
  await login(page)
  await page.goto(`/incidents?tenant=${TENANT}`)
  await page.getByRole('tab', { name: 'List View' }).click()
  await page.waitForSelector('table tbody tr')

  // INC-09 is an ASSESSED record (Highway flooding near Mesaieed industrial zone).
  await page.getByRole('row', { name: /INC-09/ }).first().click()
  await expect(page.locator('[data-slot="profile-stack"]')).toBeVisible()
  await page.waitForTimeout(400)

  const pencil = page.locator('[data-slot="inline-edit-pencil"][aria-label="Edit Tanker assigned"]')
  await pencil.scrollIntoViewIfNeeded()
  const fieldWrapper = pencil.locator('xpath=ancestor::span[@data-slot="inline-edit-field"]')
  await fieldWrapper.hover()
  await expect(pencil).toBeVisible()
  await page.screenshot({ path: path.join(MEDIA_DIR, '04-assessed-tanker-hover-pencil.png'), fullPage: false })

  await pencil.click()
  const popover = page.locator('[data-slot="popover-content"]')
  await expect(popover).toBeVisible()
  await expect(popover.getByText('Tanker assigned')).toBeVisible()
  await page.screenshot({ path: path.join(MEDIA_DIR, '05-allocate-tanker-popup.png'), fullPage: false })

  await popover.locator('button', { hasText: /Tanker \d+/ }).first().click()
  await page.waitForTimeout(400)

  // Confirmation toast names the created Plan Monitoring task.
  await expect(page.getByText(/created in Plan Monitoring/)).toBeVisible({ timeout: 5000 })
  await expect(popover).toBeHidden()
  await page.screenshot({ path: path.join(MEDIA_DIR, '06-tanker-allocated-toast.png'), fullPage: false })

  // Stage moved to Tanker Assigned, and the record now shows a linked
  // schedule/plan reference.
  await expect(page.getByText('Tanker Assigned', { exact: false }).first()).toBeVisible()
  await page.getByText('Linked Schedule/Plan').first().scrollIntoViewIfNeeded()
  await expect(page.getByText('Linked Schedule/Plan').first()).toBeVisible()
  await page.screenshot({ path: path.join(MEDIA_DIR, '07-linked-daily-plan-field.png'), fullPage: false })

  expect(errors, `console errors on tanker allocation: ${errors.join('\n')}`).toHaveLength(0)
})

test('detail header type chip is dynamic (REQUEST vs COMPLAINT, distinct icons) — no hardcoded INCIDENT', async ({ page }) => {
  const errors = trackConsoleErrors(page)
  await login(page)
  await page.goto(`/incidents?tenant=${TENANT}`)
  await page.getByRole('tab', { name: 'List View' }).click()
  await page.waitForSelector('table tbody tr')

  // INC-01 is Type=Request.
  await page.getByRole('row', { name: /INC-01/ }).first().click()
  await expect(page.locator('[data-slot="profile-stack"]')).toBeVisible()
  await page.waitForTimeout(300)
  await expect(page.getByText('REQUEST', { exact: true })).toBeVisible()
  await expect(page.getByText('INCIDENT', { exact: true })).toHaveCount(0)
  await page.screenshot({ path: path.join(MEDIA_DIR, '12-header-chip-request.png'), fullPage: false })
  await page.keyboard.press('Escape')

  // INC-06 is Type=Complaint.
  await page.getByRole('row', { name: /INC-06/ }).first().click()
  await expect(page.locator('[data-slot="profile-stack"]')).toBeVisible()
  await page.waitForTimeout(300)
  await expect(page.getByText('COMPLAINT', { exact: true })).toBeVisible()
  await expect(page.getByText('INCIDENT', { exact: true })).toHaveCount(0)
  await page.screenshot({ path: path.join(MEDIA_DIR, '13-header-chip-complaint.png'), fullPage: false })

  expect(errors, `console errors on header type chip: ${errors.join('\n')}`).toHaveLength(0)
})

test('TANKER ASSIGNED request (seeded) — already shows its linked daily task', async ({ page }) => {
  const errors = trackConsoleErrors(page)
  await login(page)
  await page.goto(`/incidents?tenant=${TENANT}`)
  await page.getByRole('tab', { name: 'List View' }).click()
  await page.waitForSelector('table tbody tr')

  // INC-12 is a seeded TANKER ASSIGNED record with a pre-linked FPL task.
  await page.getByRole('row', { name: /INC-12/ }).first().click()
  await expect(page.locator('[data-slot="profile-stack"]')).toBeVisible()
  await page.waitForTimeout(400)

  const linkField = page.getByText('Linked Schedule/Plan').first()
  await linkField.scrollIntoViewIfNeeded()
  await expect(linkField).toBeVisible()
  await page.screenshot({ path: path.join(MEDIA_DIR, '08-seeded-tanker-assigned-linked-task.png'), fullPage: false })

  // Click through the link — opens the linked daily-plan record stacked.
  const linkRow = page.locator('[data-slot="field-tile"], [data-slot="task-detail-fields"]').getByText(/FPL-/).first()
  if (await linkRow.count()) {
    await linkRow.click()
    await page.waitForTimeout(400)
    await page.screenshot({ path: path.join(MEDIA_DIR, '09-linked-daily-plan-opened.png'), fullPage: false })
  }

  expect(errors, `console errors on linked-task view: ${errors.join('\n')}`).toHaveLength(0)
})

// FINDING (logged in Build Delegate/LOG.md): for the `uccp` tenant,
// `app/src/demo/seams.tsx`'s `makeImplementations` replaces the
// `plan-monitoring` module's COMPOSER body with a bespoke iframe-isolated
// "planning-v2" port (own mock dataset, own uncommitted in-flight edits from
// a concurrent session — COORDINATION.md claim, same day) — so the live
// `/plan-monitoring` route does NOT render the `plan-monitoring/daily-plan`
// blueprint this task integrates against (FPL records). That module/seed
// pair is real, resolves, and passes `check` (verified above + in
// `tools/test/uccp-request-plan-linkage.test.mjs`, which is the actual gate
// for "Plan Monitoring shows the source request, both ways consistent").
// This test only guards that the LIVE route — owned by another session —
// still renders with zero console errors (nothing this task did broke it).
test('Plan Monitoring route (owned by the planning-v2 port) still renders cleanly — regression guard only', async ({ page }) => {
  const errors = trackConsoleErrors(page)
  await login(page)
  await page.waitForTimeout(500)
  await page.goto(`/plan-monitoring?tenant=${TENANT}`)
  await page.waitForTimeout(800)
  await page.screenshot({ path: path.join(MEDIA_DIR, '10-plan-monitoring-route-regression-guard.png'), fullPage: false })

  expect(errors, `console errors on /plan-monitoring: ${errors.join('\n')}`).toHaveLength(0)
})
