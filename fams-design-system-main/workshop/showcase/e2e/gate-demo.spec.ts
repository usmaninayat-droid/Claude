// Composer gate-demo switcher spec (task 2.7). Proves the phase-2 gate in the
// browser: ONE <ComposedModule/> call renders three different blueprints as the
// Select changes, with no per-blueprint code. The route itself is also covered
// by routes.smoke.spec.ts (auto-derived from the registry); this spec adds the
// switch-and-assert flow.
//
// NOTE: if the e2e runner can't launch a browser in this environment, the same
// flow is covered headlessly by the jsdom integration test
// `packages/v5-templates/src/renderers/v5-module-renderers.test.tsx`.
import { test, expect } from '@playwright/test'

const ROUTE = 'composer/gate-demo'

async function pickBlueprint(page: import('@playwright/test').Page, name: RegExp) {
  await page.getByLabel('Blueprint').click()
  await page.getByRole('option', { name }).click()
}

test.describe('composer gate demo — zero-code blueprint switch', () => {
  test('switches entity → pipeline → second entity through one ComposedModule call', async ({ page }) => {
    await page.goto(`/#/${ROUTE}`)
    await expect(page.locator('#doc-main h1').first()).toBeVisible()

    // 1) Default: CRM companies entity → a list table with company rows.
    const surface = page.getByTestId('gate-surface')
    await expect(surface.getByRole('table')).toBeVisible()
    await expect(surface.getByText('Globex Corp')).toBeVisible()

    // 2) Switch to the deals pipeline → Kanban lanes, no table.
    await pickBlueprint(page, /Deals/)
    await expect(surface.getByText('Proposal')).toBeVisible()
    await expect(surface.getByText('Hooli — Enterprise rollout')).toBeVisible()
    await expect(surface.getByRole('table')).toHaveCount(0)

    // 3) Switch to the fleet-vehicles entity → a different list.
    await pickBlueprint(page, /Vehicles/)
    await expect(surface.getByRole('table')).toBeVisible()
    await expect(surface.getByText('Fleet Truck 201')).toBeVisible()
  })

  test('entity path: row opens the profile sheet', async ({ page }) => {
    await page.goto(`/#/${ROUTE}`)
    const surface = page.getByTestId('gate-surface')
    await surface.getByText('Globex Corp').click()
    await expect(page.getByRole('dialog')).toBeVisible()
  })
})
