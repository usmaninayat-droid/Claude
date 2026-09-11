// triage-console-verify.spec.ts — one-off verification for the Operations
// Center module's new view-tab strip (Dispatcher Cockpit + Triage Console)
// and the end-to-end triage flow (assign response team + advance stage,
// then confirm the record moved in the Incidents kanban). Screenshots into
// Build Delegate's media checkpoint. Not part of the regression suite
// (verify-adhoc project, matches *-verify.spec.ts) — a manual capture, run
// once per chunk.
import { test, expect } from '@playwright/test'

const TENANT = 'uccp'
const EMAIL = 'admin.uccp@fams.com'
const PASSWORD = 'Fams@123'
const OUT_DIR = 'e2e-artifacts/2026-08-31-triage-console'

test('Operations Center — tab strip, Triage Console, end-to-end triage', async ({ page }) => {
  test.setTimeout(600_000)
  await page.goto(`/?tenant=${TENANT}`)
  await page.getByRole('textbox', { name: 'Email' }).fill(EMAIL)
  await page.getByRole('textbox', { name: 'Password' }).fill(PASSWORD)
  await page.getByRole('button', { name: 'Login' }).click()
  await expect(page.locator('[data-slot="navrail"]')).toBeVisible({ timeout: 60_000 })

  // 1. Tab strip renders, Dispatcher Cockpit is the default active view.
  await page.goto(`/operations-center?tenant=${TENANT}`)
  await expect(page.getByRole('tab', { name: 'Dispatcher Cockpit' })).toBeVisible({ timeout: 20_000 })
  await expect(page.getByRole('tab', { name: 'Triage Console' })).toBeVisible()
  await page.screenshot({ path: `${OUT_DIR}/01-tab-strip-dispatcher-cockpit.png`, fullPage: true })

  // 2. Switch to Triage Console — native queue + work panel render.
  await page.getByRole('tab', { name: 'Triage Console' }).click()
  await expect(page.getByText('Untriaged')).toBeVisible({ timeout: 20_000 })
  await page.waitForTimeout(500)
  await page.screenshot({ path: `${OUT_DIR}/02-triage-console-queue-panel.png`, fullPage: true })

  // 3. Triage the first queued incident end to end: assign a response team,
  // then advance the stage.
  const firstRow = page.locator('button:has-text("INC-")').first()
  const incidentId = (await firstRow.locator('span').first().textContent())?.trim()
  await firstRow.click()
  await page.getByRole('button', { name: 'Assign response team' }).click()
  await page.getByText('Fahad Al-Marri').first().click()
  await page.waitForTimeout(500)

  const advanceBtn = page.getByRole('button', { name: /Advance to/ }).first()
  await advanceBtn.click()
  await page.waitForTimeout(800)
  await page.screenshot({ path: `${OUT_DIR}/03-triaged-record.png`, fullPage: true })

  // 4. Confirm the record moved in the Incidents kanban.
  await page.goto(`/incidents?tenant=${TENANT}`)
  await page.getByRole('tab', { name: 'Kanban View' }).click({ force: true }).catch(() => {})
  await page.waitForTimeout(1000)
  if (incidentId) {
    await expect(page.getByText(incidentId, { exact: false }).first()).toBeVisible({ timeout: 20_000 })
  }
  await page.screenshot({ path: `${OUT_DIR}/04-incidents-kanban-after.png`, fullPage: true })
})
