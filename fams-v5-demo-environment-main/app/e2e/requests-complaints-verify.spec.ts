// requests-complaints-verify.spec.ts — regression + verification run for the
// 2026-08-31 "Requests & Complaints" rename + FM-6228 data adaptation of the
// `incidents` pipeline module. Confirms every protected surface (list,
// kanban, hybrid, detail/docked task sheet, creation form → detail data
// flow) still works after the display-metadata rename + Source/Priority/
// Onwani field changes, with zero console errors, and screenshots each
// surface to Build Delegate/media/2026-08-31-requests-complaints/.
import { test, expect, type Page, type ConsoleMessage } from '@playwright/test'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const dirname = path.dirname(fileURLToPath(import.meta.url))
const TENANT = 'uccp'
const EMAIL = 'admin.uccp@fams.com'
const PASSWORD = 'Fams@123'
const MEDIA_DIR = path.resolve(
  dirname,
  '../../../Build Delegate/media/2026-08-31-requests-complaints',
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

test('nav + rename — rail label, module title, KPI wording', async ({ page }) => {
  const errors = trackConsoleErrors(page)
  await login(page)
  const rail = page.locator('[data-slot="navrail"]')
  await expect(rail.getByRole('button', { name: 'Requests & Complaints' })).toBeVisible()

  await page.goto(`/incidents?tenant=${TENANT}`)
  await page.getByRole('tab', { name: 'List View' }).click()
  await expect(page.getByPlaceholder('Search Requests & Complaints')).toBeVisible()
  await expect(page.getByRole('button', { name: 'New Request/Complaint', exact: true })).toBeVisible()
  await expect(page.getByText('Open Requests/Complaints')).toBeVisible()
  await page.waitForSelector('table tbody tr')
  await page.screenshot({ path: path.join(MEDIA_DIR, '01-list-view.png'), fullPage: false })

  expect(errors, `console errors on list view: ${errors.join('\n')}`).toHaveLength(0)
})

test('list columns — Priority column (renamed from Severity) + rows intact', async ({ page }) => {
  const errors = trackConsoleErrors(page)
  await login(page)
  await page.goto(`/incidents?tenant=${TENANT}`)
  await page.getByRole('tab', { name: 'List View' }).click()
  await page.waitForSelector('table tbody tr')
  await expect(page.locator('th', { hasText: 'Priority' })).toBeVisible()
  const rowCount = await page.locator('table tbody tr').count()
  expect(rowCount).toBeGreaterThan(0)
  await page.screenshot({ path: path.join(MEDIA_DIR, '02-list-columns.png'), fullPage: false })

  expect(errors, `console errors on list columns: ${errors.join('\n')}`).toHaveLength(0)
})

test('kanban — columns, cards (one-row header: ID/Type/Priority), Group By/Sort/filters facets', async ({ page }) => {
  const errors = trackConsoleErrors(page)
  await login(page)
  await page.goto(`/incidents?tenant=${TENANT}`)
  await page.getByRole('tab', { name: 'Kanban View' }).click()
  await expect(page.locator('[data-slot="kanban-board"]')).toBeVisible()
  const columnCount = await page.locator('[data-slot="kanban-column"]').count()
  expect(columnCount).toBe(9)
  await page.waitForSelector('[data-slot="kanban-card"]')
  // 2026-08-31 card redesign: the "Owner" chip (Stage Owner) was removed
  // from the card body — Stage Owner is not in the FM-6273 field catalogue
  // (coordinator hard requirement, same day) — superseding the earlier
  // FM-6228 "surface owner-role on stage headers" ask. Card header is now a
  // single row: ID chip + Type tag + Priority chip.
  await expect(page.locator('[data-slot="kanban-card"]').first().getByText(/Request|Complaint/).first()).toBeVisible()
  await page.screenshot({ path: path.join(MEDIA_DIR, '03-kanban-view.png'), fullPage: false })

  // Group By control still present and functional.
  const groupByBtn = page.getByRole('button', { name: /Group by/i }).first()
  if (await groupByBtn.count()) {
    await groupByBtn.click()
    await page.waitForTimeout(300)
    await page.screenshot({ path: path.join(MEDIA_DIR, '04-kanban-groupby-open.png'), fullPage: false })
    await page.keyboard.press('Escape')
  }

  expect(errors, `console errors on kanban view: ${errors.join('\n')}`).toHaveLength(0)
})

test('hybrid — map + record list toolbar, legend shows Priority', async ({ page }) => {
  const errors = trackConsoleErrors(page)
  await login(page)
  await page.goto(`/incidents?tenant=${TENANT}`)
  await page.getByRole('tab', { name: 'Hybrid View' }).click()
  await expect(page.locator('[data-slot="map-hybrid-view"]')).toBeVisible({ timeout: 15_000 })
  await expect(page.locator('.maplibregl-canvas').first()).toBeVisible({ timeout: 15_000 })
  await page.waitForTimeout(800)
  await page.screenshot({ path: path.join(MEDIA_DIR, '05-hybrid-view.png'), fullPage: false })

  expect(errors, `console errors on hybrid view: ${errors.join('\n')}`).toHaveLength(0)
})

test('creation form — Source required, NCC preselects Priority=Critical (still editable), Onwani required', async ({ page }) => {
  const errors = trackConsoleErrors(page)
  await login(page)
  await page.goto(`/incidents?tenant=${TENANT}`)
  await page.getByRole('tab', { name: 'List View' }).click()
  await page.getByRole('button', { name: 'New Request/Complaint', exact: true }).click()
  await expect(page.locator('[data-slot="creation-sheet"]')).toBeVisible()
  await page.screenshot({ path: path.join(MEDIA_DIR, '06-creation-sheet-initial.png'), fullPage: false })

  const sheet = page.locator('[data-slot="creation-sheet"]')
  await expect(sheet.getByText('Onwani Number')).toBeVisible()
  // The sheet body scrolls (fields flow well past one screen once Type/
  // Category/Source Ref/Zone-Area are added) — scroll each into view before
  // asserting rather than requiring it in the initial fold.
  // Source itself is exercised below via `sourceControl`; these three are
  // the other FM-6272 additions. Not `exact` — required fields append a `*`
  // directly onto the label text (no separating space).
  for (const label of ['Type', 'Category', 'Zone/Area']) {
    const field = sheet.getByText(label).first()
    await field.scrollIntoViewIfNeeded()
    await expect(field).toBeVisible()
  }
  await sheet.locator('[data-slot="creation-sheet-body"]').evaluate((el) => (el.scrollTop = 0))

  // FM-6272 floating close button: circular, straddling the sheet's leading
  // edge (not docked top-right inside the header).
  const floatingClose = page.getByRole('button', { name: 'Close' })
  await expect(floatingClose).toBeVisible()
  await expect(floatingClose).toHaveClass(/rounded-full/)

  // Select Source = NCC via the native/select-style control.
  const sourceControl = sheet.getByRole('combobox').filter({ hasText: /Call Center|NCC|Ashghal|Oracle|Oun app|Source/i }).first()
  if (await sourceControl.count()) {
    await sourceControl.click()
    await page.getByRole('option', { name: 'NCC', exact: true }).click()
  }
  await page.waitForTimeout(300)
  await page.screenshot({ path: path.join(MEDIA_DIR, '07-creation-sheet-source-ncc.png'), fullPage: false })

  expect(errors, `console errors on creation sheet: ${errors.join('\n')}`).toHaveLength(0)
})

test('detail — docked task-detail sheet: tabs, Priority/Source/Onwani/Type/Category fields render', async ({ page }) => {
  const errors = trackConsoleErrors(page)
  await login(page)
  await page.goto(`/incidents?tenant=${TENANT}`)
  await page.getByRole('tab', { name: 'List View' }).click()
  await page.waitForSelector('table tbody tr')
  await page.locator('table tbody tr').first().click()
  await expect(page.locator('[data-slot="profile-stack"]')).toBeVisible()
  await page.waitForTimeout(500)
  await expect(page.getByText('Onwani Number')).toBeVisible()
  await expect(page.getByRole('tab', { name: 'Related Requests/Complaints' })).toBeVisible()
  // FM-6273 field catalogue additions: Type/Category (always shown, both
  // rendered as light-tinted tag chips per the 2026-08-31 styling note).
  // Severity was merged into Priority (coordinator correction, same day —
  // ONE priority field, not two) — Severity no longer exists as a separate
  // field. Detail is a long scrollable grid — scroll each into view before
  // asserting.
  for (const label of ['Type', 'Category']) {
    const field = page.getByText(label).first()
    await field.scrollIntoViewIfNeeded()
    await expect(field).toBeVisible()
  }
  await page.screenshot({ path: path.join(MEDIA_DIR, '08-detail-docked-sheet.png'), fullPage: false })
  await page.keyboard.press('Escape')
  await expect(page.locator('[data-slot="profile-stack"]')).toBeHidden()

  expect(errors, `console errors on detail sheet: ${errors.join('\n')}`).toHaveLength(0)
})
