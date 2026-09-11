// Suite B — curated tenant x persona x screen visual matrix (phase 4 §2,
// task 4.C). Boots the real app via its own URL-param convention
// (`?tenant=&persona=`, see README.md "URL params") — a full page load per
// scenario, exactly like switching tenant/persona in the Demo Console does.
//
// Screens (6) x tenants {fams, iwmp} x personas {u_admin, u_dispatcher} = 24
// nominal shots, all 24 now real: `toModuleNode()` (app/src/demo/model.ts)
// derives views from the module kind via `resolveModuleViews` (post-4.C fix),
// so the pipeline-kind "ticketing" module now exposes its kanban view.
//
// Dual mode (local snapshot vs VRT upload) — see e2e/support/vrt.ts.
//
// Ready signals (no arbitrary sleeps): a visible data row for list screens,
// the profile-stack/creation-sheet's `data-slot` for overlays, `role="dialog"`
// for the Demo Console, plus `document.fonts.ready` before every capture.
import { test, expect, type Page } from '@playwright/test'
import { assertScreenshot, stopVrt } from './support/vrt'

const TENANTS = ['fams', 'iwmp'] as const
const PERSONAS = [
  { id: 'u_admin', slug: 'admin' },
  { id: 'u_dispatcher', slug: 'dispatcher' },
] as const

test.describe.configure({ mode: 'parallel' })

function bootUrl(tenant: string, personaId: string, path: string): string {
  return `${path}?tenant=${tenant}&persona=${personaId}`
}

async function waitFontsReady(page: Page): Promise<void> {
  await page.evaluate(() => document.fonts.ready)
}

for (const tenant of TENANTS) {
  for (const persona of PERSONAS) {
    const tag = `${tenant}-${persona.slug}`

    test(`${tag}-asset-list`, async ({ page }) => {
      await page.goto(bootUrl(tenant, persona.id, '/asset'))
      await page.waitForSelector('table tbody tr')
      await waitFontsReady(page)
      await assertScreenshot(page, `${tag}-asset-list`)
    })

    test(`${tag}-vehicle-profile`, async ({ page }) => {
      await page.goto(bootUrl(tenant, persona.id, '/asset'))
      await page.waitForSelector('table tbody tr')
      await page.locator('table tbody tr').first().click()
      await expect(page.locator('[data-slot="profile-stack"]')).toBeVisible()
      await waitFontsReady(page)
      await assertScreenshot(page, `${tag}-vehicle-profile`)
    })

    test(`${tag}-ticketing-kanban`, async ({ page }) => {
      // The ticketing blueprint now AUTHORS `views: ['list', 'kanban']`
      // (2026-08-13 Tadweer Figma parity — list-first is the design), so it
      // no longer falls back to `resolveModuleViews('pipeline')`'s
      // kanban-first default and List View is the tab `ModuleView` seeds as
      // active. The Kanban tab therefore has to be clicked before the board
      // exists in the DOM — without this the test failed before it ever
      // reached `toHaveScreenshot`.
      await page.goto(bootUrl(tenant, persona.id, '/ticketing'))
      await page.getByRole('tab', { name: 'Kanban View' }).click()
      // The Kanban composite (@fams/ui-kit Kanban.tsx) renders
      // `data-slot="kanban-board"` (columns: `kanban-column`, cards:
      // `kanban-card`) — there is no `kanban-view` slot anywhere in the
      // render tree. Fixed stale selector (predates this change).
      await expect(page.locator('[data-slot="kanban-board"]')).toBeVisible()
      await page.waitForSelector('[data-slot="kanban-card"]')
      await waitFontsReady(page)
      await assertScreenshot(page, `${tag}-ticketing-kanban`)
    })

    test(`${tag}-task-detail`, async ({ page }) => {
      // TaskDetail opens for ANY row click on a pipeline-kind module (the
      // renderer picks EntityProfile vs TaskDetail from `module.type`, not
      // from which view is active). List View is the ticketing blueprint's
      // first authored view and therefore already active — the click below is
      // a harmless no-op kept so the scenario stays explicit about needing a
      // table to click a row in.
      await page.goto(bootUrl(tenant, persona.id, '/ticketing'))
      await page.getByRole('tab', { name: 'List View' }).click()
      await page.waitForSelector('table tbody tr')
      await page.locator('table tbody tr').first().click()
      await expect(page.locator('[data-slot="profile-stack"]')).toBeVisible()
      await waitFontsReady(page)
      await assertScreenshot(page, `${tag}-task-detail`)
    })

    test(`${tag}-creation-sheet`, async ({ page }) => {
      // Workforce, not Tickets/Vehicles: `workforce.create` is granted to
      // BOTH personas (README "Persona gating"), so this screen is
      // comparable across the whole persona axis — Tickets' "New" is
      // admin-only and would make the dispatcher rows meaningless.
      await page.goto(bootUrl(tenant, persona.id, '/workforce'))
      await page.waitForSelector('table tbody tr')
      // `exact: true` matters: the create button's label is now the
      // `createLabel = creationConfig?.label ?? 'Create New'` default
      // (v5-module-renderers.tsx) and workforce authors no
      // `uiConfig.creation`. A non-exact 'New' would also match
      // "Create New Ticket" elsewhere.
      await page.getByRole('button', { name: 'Create New', exact: true }).click()
      await expect(page.locator('[data-slot="creation-sheet"]')).toBeVisible()
      await waitFontsReady(page)
      await assertScreenshot(page, `${tag}-creation-sheet`)
    })

    test(`${tag}-demo-console`, async ({ page }) => {
      await page.goto(bootUrl(tenant, persona.id, '/asset'))
      await page.waitForSelector('table tbody tr')
      // The console's accessible trigger is a visually-hidden button that
      // reveals on focus (main.tsx wires a fixed title regardless of
      // tenant) — focus + Enter is the documented keyboard path (no pointer
      // hover simulation needed, no flakiness from hot-zone hit-testing).
      const trigger = page.getByRole('button', { name: 'Open FAMS demo console' })
      await trigger.focus()
      await page.keyboard.press('Enter')
      await expect(page.getByRole('dialog')).toBeVisible()
      await waitFontsReady(page)
      await assertScreenshot(page, `${tag}-demo-console`)
    })
  }
}

test.afterAll(async () => {
  await stopVrt()
})
