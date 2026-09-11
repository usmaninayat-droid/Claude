// smoke.spec.ts — fast regression-guard run (Build Delegate/comms/PROTOCOL.md
// mandates every agent runs this green, via `pnpm --filter app smoke`,
// before committing any UI change).
//
// One real login (UCCP admin) + cheap EXISTENCE assertions (not pixels) on
// every load-bearing surface: rail module count, Live Monitoring list +
// tanker art cell, tanker sheet tab count, Incidents toolbar + KPI
// icons + rows, kanban columns/cards, hybrid map+cards, creation sheet.
//
// Weather Stations (rain-sensors) module was hidden from the UCCP rail on
// 2026-08-31 (see tenants/uccp/modules/rain-sensors/HIDDEN.md) — its rail
// entry and list/sheet assertions were removed below. Re-enable with the
// module (flip the two "re-enable with module" comments back).
// Target: whole run under 2 minutes — one `test.describe.serial` reusing a
// single logged-in page instead of a fresh boot per assertion (each fresh
// boot/login would itself burn several seconds).
//
// Born 2026-08-31 from a shipped regression (DS commit f11f6c1 silently
// dropped the Weather Stations list's station-art thumbnail) that no
// existing suite caught — this suite trades screenshot precision for speed
// and breadth so a whole-surface breakage like that fails a run in under two
// minutes instead of shipping unnoticed.
import { test, expect } from '@playwright/test'

const TENANT = 'uccp'
const EMAIL = 'admin.uccp@fams.com'
const PASSWORD = 'Fams@123'

test.describe.configure({ mode: 'serial' })

test.describe('smoke', () => {
  test('login, rail, and every core surface render their load-bearing elements', async ({ page }) => {
    // ---- Login (real email/password flow, not the ?persona= QA bypass) ----
    await page.goto(`/?tenant=${TENANT}`)
    await page.getByRole('textbox', { name: 'Email' }).fill(EMAIL)
    await page.getByRole('textbox', { name: 'Password' }).fill(PASSWORD)
    await page.getByRole('button', { name: 'Login' }).click()
    await expect(page.locator('[data-slot="navrail"]')).toBeVisible({ timeout: 15_000 })

    // ---- Rail module count (5 UCCP modules as of 2026-08-31 — Inspector
    // Shifts added this run, +1 vs the prior 4; Weather Stations hidden
    // 2026-08-31 — re-enable with module) ----
    const rail = page.locator('[data-slot="navrail"]')
    for (const label of ['Live Monitoring', 'Requests & Complaints', 'Plan Monitoring', 'Smart Planning', 'Inspector Shifts']) {
      await expect(rail.getByRole('button', { name: label })).toBeVisible()
    }
    await expect(rail.getByRole('button', { name: 'Weather Stations' })).toHaveCount(0)

    // ---- Live Monitoring: list rows + tanker art cell ----
    await page.goto(`/live-monitoring?tenant=${TENANT}`)
    await page.getByRole('tab', { name: 'List View' }).click()
    await page.waitForSelector('table tbody tr')
    // LiveVehicleCell (live-monitoring's fleet-flavoured cell) has no
    // stable data-slot of its own — an `svg` in the identity cell is the
    // cheap existence signal for its 3D vehicle art.
    await expect(page.locator('table tbody tr').first().locator('svg').first()).toBeVisible()

    // ---- Tanker sheet opens with >10 tabs ----
    await page.locator('table tbody tr').first().click()
    await expect(page.locator('[data-slot="profile-stack"]')).toBeVisible()
    // The tab strip renders progressively (pinned tabs first, the full set
    // once the record's data settles) — poll rather than a single count().
    await expect
      .poll(async () => page.locator('[role="tab"]').count(), { timeout: 15_000 })
      .toBeGreaterThan(10)
    await page.keyboard.press('Escape')
    await expect(page.locator('[data-slot="profile-stack"]')).toBeHidden()

    // ---- Weather Stations (rain-sensors) module hidden 2026-08-31 — re-enable
    // with module: restore this block (list rows + station art cell +
    // formatted Last Reading + station sheet) once "rain-sensors" is back in
    // tenants/uccp/tenant.json's modules arrays.
    // await page.goto(`/rain-sensors?tenant=${TENANT}`)
    // ...

    // ---- Weather Stations route must not render for hidden module ----
    await page.goto(`/rain-sensors?tenant=${TENANT}`)
    await expect(page.locator('[data-slot="navrail"]')).toBeVisible()
    await expect(page.locator('table')).toHaveCount(0)

    // ---- Incidents: toolbar (search + create button) + KPI icons + rows ----
    await page.goto(`/incidents?tenant=${TENANT}`)
    await page.getByRole('tab', { name: 'List View' }).click()
    await expect(page.getByPlaceholder('Search Requests & Complaints')).toBeVisible()
    await expect(page.getByRole('button', { name: 'New Request/Complaint', exact: true })).toBeVisible()
    await expect(page.locator('[data-slot="kpi-tile"]').first()).toBeVisible()
    expect(await page.locator('[data-slot="kpi-tile"]').count()).toBeGreaterThanOrEqual(3)
    await page.waitForSelector('table tbody tr')

    // ---- Incidents: kanban columns + cards ----
    await page.getByRole('tab', { name: 'Kanban View' }).click()
    await expect(page.locator('[data-slot="kanban-board"]')).toBeVisible()
    await expect(page.locator('[data-slot="kanban-column"]').first()).toBeVisible()
    await page.waitForSelector('[data-slot="kanban-card"]')

    // ---- Incidents: hybrid map + cards ----
    await page.getByRole('tab', { name: 'Hybrid View' }).click()
    // Incidents is a `hasRecordMap` module (own-records-on-a-map, not a
    // fleet), so `ModuleViewBody` renders `MapHybridView` here, not the
    // fleet-flavoured `LiveHybridView` — different slot (`map-hybrid-view`).
    await expect(page.locator('[data-slot="map-hybrid-view"]')).toBeVisible({ timeout: 15_000 })
    await expect(page.locator('.maplibregl-canvas').first()).toBeVisible({ timeout: 15_000 })

    // ---- Creation sheet opens ----
    await page.getByRole('button', { name: 'New Request/Complaint', exact: true }).click()
    await expect(page.locator('[data-slot="creation-sheet"]')).toBeVisible()
  })
})
