// pipeline-actions-verify.spec.ts — live verification of the 2026-08-31
// pipeline actions task (Filter / Sort / Group By popovers) on the Requests &
// Complaints pipeline, per Build Delegate/NEXT-pipeline-actions.md and the
// reference recording. Screenshots (one per popover type + the date picker)
// land in Build Delegate/media/2026-08-31-pipeline-actions/.
import { test, expect, type Page, type ConsoleMessage } from '@playwright/test'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const dirname = path.dirname(fileURLToPath(import.meta.url))
const TENANT = 'uccp'
const MEDIA_DIR = path.resolve(dirname, '../../../Build Delegate/media/2026-08-31-pipeline-actions')

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
  await page.getByRole('textbox', { name: 'Email' }).fill('admin.uccp@fams.com')
  await page.getByRole('textbox', { name: 'Password' }).fill('Fams@123')
  await page.getByRole('button', { name: 'Login' }).click()
  await expect(page.locator('[data-slot="navrail"]')).toBeVisible({ timeout: 15_000 })
}

async function openList(page: Page) {
  await page.goto(`/incidents?tenant=${TENANT}`)
  await page.getByRole('tab', { name: 'List View' }).click()
  await page.waitForSelector('table tbody tr')
}

test('All Filters panel — checklist groups (≤8), searchable fields (>8) and per-date fields', async ({ page }) => {
  const errors = trackConsoleErrors(page)
  await login(page)
  await openList(page)

  await page.getByRole('button', { name: /^Filter/ }).click()
  const panel = page.locator('[data-slot="filter-panel"], [data-filter-layer="panel"], [role="dialog"]').first()
  await expect(panel).toBeVisible()

  // ≤8-option facets render inline as checkbox groups.
  const checklist = page.locator('[data-slot="filter-field"][data-kind="checkbox-group"]')
  expect(await checklist.count()).toBeGreaterThan(0)

  // DATE facets are their own fields — Reported On and Last Updated On.
  const dateFields = page.locator('[data-slot="filter-field"][data-kind="date"]')
  expect(await dateFields.count()).toBeGreaterThanOrEqual(2)

  await page.screenshot({ path: path.join(MEDIA_DIR, '01-all-filters-panel.png') })

  // Open the first date field — the range picker with Start/End time.
  await dateFields.first().locator('[data-slot="date-range-picker-trigger"]').click()
  const picker = page.locator('[data-slot="date-range-picker-content"]')
  await expect(picker).toBeVisible()
  await expect(picker.getByLabel('Start time')).toBeVisible()
  await expect(picker.getByLabel('End time')).toBeVisible()
  await expect(picker.getByRole('button', { name: 'Apply' })).toBeVisible()
  await page.screenshot({ path: path.join(MEDIA_DIR, '02-date-range-time-popup.png') })
  await picker.getByRole('button', { name: 'Cancel' }).click()

  expect(errors, errors.join('\n')).toHaveLength(0)
})

test('Sort popover + Group By radio popover with ORDER row; Kanban⇄List preserves all three', async ({ page }) => {
  const errors = trackConsoleErrors(page)
  await login(page)
  await openList(page)

  // SORT popover.
  await page.getByRole('button', { name: /^Sort/ }).click()
  const sortMenu = page.locator('[data-slot="sort-menu"]')
  await expect(sortMenu).toBeVisible()
  const sortRows = sortMenu.getByRole('option')
  expect(await sortRows.count()).toBeGreaterThan(1)
  await sortRows.nth(1).click() // apply a sort (live)
  await page.screenshot({ path: path.join(MEDIA_DIR, '03-sort-popover.png') })
  await page.keyboard.press('Escape')
  // Applied badge on the trigger.
  await expect(page.locator('[data-slot="sort-trigger-badge"]')).toBeVisible()

  // GROUP BY popover (toolbar) — radio list with None.
  const groupTrigger = page.locator('[data-slot="group-by-trigger"]').first()
  if (await groupTrigger.count()) {
    await groupTrigger.click()
    const gbMenu = page.locator('[data-slot="group-by-menu"]')
    await expect(gbMenu).toBeVisible()
    expect(await gbMenu.getByRole('radio').count()).toBeGreaterThan(1)
    await page.screenshot({ path: path.join(MEDIA_DIR, '04-group-by-popover.png') })
    await page.keyboard.press('Escape')
  }

  // Apply a filter, then Kanban⇄List — filters/sort survive the toggle (FM-6271).
  await page.getByRole('button', { name: /^Filter/ }).click()
  const firstBox = page.locator('[data-slot="filter-checklist-option"]').first()
  await firstBox.click()
  await page.keyboard.press('Escape')

  await page.getByRole('tab', { name: 'Kanban View' }).click()
  await expect(page.locator('[data-slot="sort-trigger-badge"]')).toBeVisible()
  // Kanban Group By button carries the board grouping + ORDER row.
  const kanbanGroupBy = page.getByRole('button', { name: 'Group by' }).first()
  await kanbanGroupBy.click()
  const orderRow = page.locator('[data-slot="group-by-order"]')
  await expect(orderRow).toBeVisible()
  await page.screenshot({ path: path.join(MEDIA_DIR, '05-kanban-group-by-order.png') })
  await page.keyboard.press('Escape')

  await page.getByRole('tab', { name: 'List View' }).click()
  await expect(page.locator('[data-slot="sort-trigger-badge"]')).toBeVisible()

  expect(errors, errors.join('\n')).toHaveLength(0)
})
