// cards-final-verify.spec.ts — scoped verification for the 2026-08-31
// card-spec closeout (on top of 7e6281f/6cee828): hybrid list-panel card
// leading slot (eye ONLY, no checkbox, no "…"), kanban card leading slot
// (checkbox + … only, no eye) + single overflow trigger, body rows
// (Reported by <Source>, tag chips), footer (avatars left, address ref
// right).
import { test, expect } from '@playwright/test'
import path from 'node:path'

const TENANT = 'uccp'
const EMAIL = 'admin.uccp@fams.com'
const PASSWORD = 'Fams@123'
const MEDIA_DIR = 'e2e-artifacts/2026-08-31-cards-final'

test.describe.configure({ mode: 'serial' })

async function login(page: import('@playwright/test').Page) {
  await page.goto(`/?tenant=${TENANT}`)
  await page.getByRole('textbox', { name: 'Email' }).fill(EMAIL)
  await page.getByRole('textbox', { name: 'Password' }).fill(PASSWORD)
  await page.getByRole('button', { name: 'Login' }).click()
  await expect(page.locator('[data-slot="navrail"]')).toBeVisible({ timeout: 15_000 })
}

test('incidents hybrid card — eye-only leading slot, no checkbox, no menu; body + footer rows', async ({ page }) => {
  await login(page)
  await page.goto(`/incidents?tenant=${TENANT}`)
  await page.getByRole('tab', { name: 'Hybrid View' }).click()
  await expect(page.locator('[data-slot="map-hybrid-view"]')).toBeVisible()

  const card = page.locator('[data-slot="record-map-card"]').first()
  await expect(card).toBeVisible({ timeout: 15_000 })

  // Leading slot: eye toggle present, no bulk-select checkbox, no "…" menu.
  await expect(card.locator('[data-slot="record-map-visibility"]')).toBeVisible()
  await expect(card.locator('[data-slot="kanban-card-selection"]')).toHaveCount(0)
  await expect(card.locator('[data-slot="row-actions"]')).toHaveCount(0)

  // Body: "Reported by <Source>" row + tag chips (when tags exist).
  await expect(card.getByText(/^Reported by /)).toBeVisible()

  // Footer: address ref, right side, building icon.
  await expect(card.locator('[data-slot="address-ref"]')).toBeVisible()

  await card.screenshot({ path: path.join(MEDIA_DIR, 'hybrid-card.png') })
})

test('incidents kanban card — checkbox + single "…" trigger, no eye; footer address ref', async ({ page }) => {
  await login(page)
  await page.goto(`/incidents?tenant=${TENANT}`)
  await page.getByRole('tab', { name: 'Kanban View' }).click()
  await page.waitForSelector('[data-slot="kanban-card-badges"]', { timeout: 15_000 })

  const target = page.locator('[data-slot="kanban-card"]').first()
  await expect(target).toBeVisible()

  await expect(target.locator('[data-slot="record-map-visibility"]')).toHaveCount(0)

  // Exactly one overflow trigger — the "…" (row-actions), never the ⋮ move-menu alongside it.
  await expect(target.locator('[data-slot="row-actions"]')).toHaveCount(1)

  await expect(target.locator('[data-slot="address-ref"]')).toBeVisible()

  await target.screenshot({ path: path.join(MEDIA_DIR, 'kanban-card.png') })
})
