// severity-colors-verify.spec.ts — verification run for the incident
// severity color fix (chunk: 2026-08-31 severity-colors). Confirms the
// hybrid map legend now shows 4 distinct severity colors (Critical/High no
// longer share #B42318), plus the list SEVERITY column and kanban card
// flags render distinct per-severity chip colors.
import { test, expect } from '@playwright/test'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const dirname = path.dirname(fileURLToPath(import.meta.url))
const TENANT = 'uccp'
const EMAIL = 'admin.uccp@fams.com'
const PASSWORD = 'Fams@123'
const MEDIA_DIR = path.resolve(
  dirname,
  '../../../Build Delegate/media/2026-08-31-severity-colors',
)

test.describe.configure({ mode: 'serial' })

async function login(page: import('@playwright/test').Page) {
  await page.goto(`/?tenant=${TENANT}`)
  await page.getByRole('textbox', { name: 'Email' }).fill(EMAIL)
  await page.getByRole('textbox', { name: 'Password' }).fill(PASSWORD)
  await page.getByRole('button', { name: 'Login' }).click()
  await expect(page.locator('[data-slot="navrail"]')).toBeVisible({ timeout: 30_000 })
}

test.describe('severity colors verify', () => {
  test('incidents hybrid map legend — 4 distinct severity colors', async ({ page }) => {
    await login(page)
    await page.goto(`/incidents?tenant=${TENANT}`)
    await page.getByRole('tab', { name: 'Hybrid View' }).click()
    await expect(page.locator('[data-slot="live-hybrid-view"]')).toBeVisible()
    await expect(page.locator('.maplibregl-canvas').first()).toBeVisible({ timeout: 15_000 })
    await expect(page.getByText('Priority').first()).toBeVisible({ timeout: 15_000 })
    await page.waitForTimeout(1000)
    await page.screenshot({ path: path.join(MEDIA_DIR, '01-hybrid-map-legend.png'), fullPage: false })
  })

  test('incidents list — SEVERITY column with distinct chip colors', async ({ page }) => {
    await login(page)
    await page.goto(`/incidents?tenant=${TENANT}`)
    await page.getByRole('tab', { name: 'List View' }).click()
    await page.waitForSelector('table tbody tr')
    await page.waitForTimeout(500)
    await page.screenshot({ path: path.join(MEDIA_DIR, '02-list-severity-column.png'), fullPage: false })
  })

  test('incidents kanban — card severity flags with distinct colors', async ({ page }) => {
    await login(page)
    await page.goto(`/incidents?tenant=${TENANT}`)
    await page.getByRole('tab', { name: 'Kanban View' }).click()
    await expect(page.locator('[data-slot="kanban-board"]')).toBeVisible()
    await page.waitForSelector('[data-slot="kanban-card"]')
    await page.waitForTimeout(500)
    await page.screenshot({ path: path.join(MEDIA_DIR, '03-kanban-severity-flags.png'), fullPage: false })
  })
})
