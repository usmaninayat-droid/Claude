// hybrid-create-icon-verify.spec.ts — scoped verification for the
// 2026-08-31 hybrid-create-icon fix: RecordMapListToolbar (incidents
// HYBRID panel) should render the "+" create button icon-only, while
// List/Kanban toolbars (ModuleView) keep the labeled button.
import { test, expect } from '@playwright/test'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const dirname = path.dirname(fileURLToPath(import.meta.url))
const TENANT = 'uccp'
const EMAIL = 'admin.uccp@fams.com'
const PASSWORD = 'Fams@123'
const MEDIA_DIR = path.resolve(
  dirname,
  '../../New DS Projects/QATAR MME - UCCP/Build Delegate/media/2026-08-31-hybrid-create-icon',
)

test.describe.configure({ mode: 'serial' })

async function login(page: import('@playwright/test').Page) {
  await page.goto(`/?tenant=${TENANT}`)
  await page.getByRole('textbox', { name: 'Email' }).fill(EMAIL)
  await page.getByRole('textbox', { name: 'Password' }).fill(PASSWORD)
  await page.getByRole('button', { name: 'Login' }).click()
  await expect(page.locator('[data-slot="navrail"]')).toBeVisible({ timeout: 15_000 })
}

test('incidents hybrid panel — icon-only create button, comfortable search width', async ({ page }) => {
  await login(page)
  await page.goto(`/incidents?tenant=${TENANT}`)
  await page.getByRole('tab', { name: 'Hybrid View' }).click()
  // Incidents' hybrid view is the generic record-map hybrid (blueprint's
  // uiConfig.map.records), rendered by MapHybridView — data-slot
  // "map-hybrid-view" — not the fleet-telemetry LiveHybridView (whose
  // slot is "live-hybrid-view", used by e.g. Live Monitoring).
  await expect(page.locator('[data-slot="map-hybrid-view"]')).toBeVisible()
  await page.waitForSelector('[data-slot="record-map-list-toolbar"]', { timeout: 15_000 })

  const toolbar = page.locator('[data-slot="record-map-list-toolbar-row1"]')
  await expect(toolbar).toBeVisible()

  // Icon-only create button: no visible "New Request/Complaint" text label.
  await expect(page.getByRole('button', { name: 'New Request/Complaint', exact: true })).toBeVisible()
  await expect(page.locator('[data-slot="record-map-list-toolbar-primary-group"]')).not.toContainText(
    'New Request/Complaint',
  )

  const searchBox = toolbar.locator('input[aria-label="Search"]')
  await expect(searchBox).toBeVisible()
  const box = await searchBox.boundingBox()
  expect(box?.width ?? 0).toBeGreaterThan(120)

  await page.screenshot({ path: path.join(MEDIA_DIR, '01-hybrid-toolbar-icon-create.png'), fullPage: false })

  // Hover to confirm tooltip.
  const createBtn = page.getByRole('button', { name: 'New Request/Complaint', exact: true })
  await createBtn.hover()
  await page.waitForTimeout(400)
  await page.screenshot({ path: path.join(MEDIA_DIR, '02-hybrid-toolbar-tooltip.png'), fullPage: false })
})

test('incidents list toolbar — still shows labeled create button', async ({ page }) => {
  await login(page)
  await page.goto(`/incidents?tenant=${TENANT}`)
  await page.getByRole('tab', { name: 'List View' }).click()
  await page.waitForTimeout(1500)
  const labeledBtn = page.getByRole('button', { name: /New Request\/Complaint|Create New/i }).first()
  await expect(labeledBtn).toBeVisible({ timeout: 15_000 })
  await expect(labeledBtn).toContainText(/New Request\/Complaint|Create New/i)
  await page.screenshot({ path: path.join(MEDIA_DIR, '03-list-toolbar-labeled-create.png'), fullPage: false })
})
