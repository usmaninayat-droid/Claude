// entity-sheets-verify.spec.ts — vehicle + workforce detail side-sheet capture
// for the 2026-09-01 Asset-Profile parity pass.
import { test, expect, type Page } from '@playwright/test'
import path from 'node:path'
import { mkdirSync, writeFileSync } from 'node:fs'

const TENANT = 'uccp'
const PHASE = process.env.SHEET_PHASE ?? 'before'
const OUT = path.join(
  'e2e-artifacts/2026-09-01-entity-sheets',
  PHASE,
)
mkdirSync(OUT, { recursive: true })

test.use({ viewport: { width: 1680, height: 1000 } })
test.setTimeout(240_000)

async function login(page: Page) {
  await page.goto(`/?tenant=${TENANT}`)
  await page.getByRole('textbox', { name: 'Email' }).fill('admin.uccp@fams.com')
  await page.getByRole('textbox', { name: 'Password' }).fill('Fams@123')
  await page.getByRole('button', { name: 'Login' }).click()
  await expect(page.locator('[data-slot="navrail"]')).toBeVisible({ timeout: 30_000 })
}

/** Re-opens the detail sheet for the currently-filtered first row. */
async function openSheet(page: Page) {
  const row = page.locator('[data-slot="hybrid-list-row"], [data-slot="record-row"], table tbody tr').first()
  await row.click({ timeout: 15_000 }).catch(() => {})
  await page.waitForTimeout(1200)
  const expand = page.getByRole('button', { name: /expand details/i }).first()
  if (await expand.count()) {
    await expand.click().catch(() => {})
    await page.waitForTimeout(2500)
  }
}

async function shootTabs(page: Page, prefix: string, dump: string[], reopen?: () => Promise<void>) {
  // Scope to the SHEET's own tab strip — the page behind it also exposes
  // role=tab controls (Hybrid/List/Map View), and clicking one of those
  // switches the whole screen and closes the sheet mid-loop.
  const tabs = page.locator('[data-slot="entity-profile"]').getByRole('tab')
  const names = await tabs.evaluateAll((els) => els.map((e) => (e.textContent ?? '').trim()))
  dump.push(`${prefix} tabs: ${JSON.stringify(names)}`)
  for (let i = 0; i < names.length; i++) {
    const name = names[i]
    if (!name) continue
    const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
    // The sheet can close under us (a record refresh); once it is gone every
    // later `nth(i)` would resolve against the PAGE's own view tabs and
    // navigate away, so stop rather than capture the wrong screen.
    if ((await page.locator('[data-slot="entity-profile"]').count()) === 0) {
      dump.push(`${prefix}: sheet closed before "${name}" — stopping tab sweep`)
      break
    }
    await tabs.nth(i).click().catch(() => {})
    // A tab click can occasionally drop the sheet (a record refresh racing the
    // switch). Reopen and retry once so the capture is of the TAB, never of
    // the screen behind it.
    if ((await page.locator('[data-slot="entity-profile"]').count()) === 0 && reopen) {
      dump.push(`${prefix}: sheet closed on "${name}" — reopening and retrying`)
      await reopen()
      await openSheet(page)
      await page
        .locator('[data-slot="entity-profile"]')
        .getByRole('tab', { name, exact: true })
        .first()
        .click()
        .catch(() => {})
    }
    // Map-bearing tabs (Trips/Shifts/Events/Replay) mount a MapLibre canvas
    // whose raster tiles land well after the first paint — a short settle
    // captured a pin layer over a blank basemap.
    await page.waitForTimeout(/map|trip|shift|event|replay|overview|monitoring/i.test(name) ? 5000 : 2200)
    await page.screenshot({ path: path.join(OUT, `${prefix}-${String(i + 1).padStart(2, '0')}-${slug}.png`) })
  }
}

/** The new Plans tab, with its client-side search filtering demonstrated. */
async function demoPlansSearch(page: Page, prefix: string, dump: string[]) {
  const plans = page.locator('[data-slot="entity-profile"]').getByRole('tab', { name: 'Plans', exact: true })
  if (!(await plans.count())) {
    dump.push(`${prefix}: no Plans tab found`)
    return
  }
  await plans.first().click()
  await page.waitForTimeout(1500)
  const rows = page.locator('[data-slot="searchable-record-row"]')
  dump.push(`${prefix} plans rows (unfiltered): ${await rows.count()}`)
  await page.screenshot({ path: path.join(OUT, `${prefix}-plans-a-unfiltered.png`) })

  const box = page.getByLabel('Search completed plans')
  await box.fill('Al Wakra')
  await page.waitForTimeout(900)
  dump.push(`${prefix} plans rows (query "Al Wakra"): ${await rows.count()}`)
  await page.screenshot({ path: path.join(OUT, `${prefix}-plans-b-filtered.png`) })

  await box.fill('zzzz')
  await page.waitForTimeout(900)
  dump.push(`${prefix} plans rows (query "zzzz"): ${await rows.count()}`)
  await page.screenshot({ path: path.join(OUT, `${prefix}-plans-c-no-match.png`) })
  await box.fill('')
  await page.waitForTimeout(600)
}

test('vehicle detail sheet — all tabs', async ({ page }) => {
  const dump: string[] = []
  await login(page)
  await page.goto(`/live-monitoring?tenant=${TENANT}`)
  await page.waitForTimeout(3000)
  await page.screenshot({ path: path.join(OUT, 'vehicle-00-list.png'), fullPage: false })

  // open the first tanker row's detail sheet
  const row = page.locator('[data-slot="hybrid-list-row"], [data-slot="record-row"], table tbody tr').first()
  await row.click({ timeout: 15_000 }).catch(() => {})
  await page.waitForTimeout(1500)
  const expand = page.getByRole('button', { name: /expand details/i }).first()
  if (await expand.count()) {
    await expand.click()
    await page.waitForTimeout(2500)
  }
  await page.screenshot({ path: path.join(OUT, 'vehicle-01-sheet-open.png') })
  dump.push('buttons: ' + JSON.stringify(await page.locator('button[aria-label]').evaluateAll((e) => e.map((x) => x.getAttribute('aria-label')))))
  await shootTabs(page, 'vehicle', dump, async () => {})
  await demoPlansSearch(page, 'vehicle', dump)
  writeFileSync(path.join(OUT, 'vehicle-dump.txt'), dump.join('\n\n'))
})

test('workforce detail sheet — all tabs', async ({ page }) => {
  const dump: string[] = []
  await login(page)
  await page.goto(`/live-monitoring?tenant=${TENANT}`)
  await page.waitForTimeout(3000)
  const selectWorkforce = async () => {
    if (!page.url().includes('/live-monitoring')) {
      await page.goto(`/live-monitoring?tenant=${TENANT}`)
      await page.waitForTimeout(3000)
    }
    for (const loc of [
      page.getByRole('button', { name: 'Workforce', exact: true }),
      page.getByRole('radio', { name: 'Workforce', exact: true }),
      page.getByText('Workforce', { exact: true }),
    ]) {
      if (await loc.count()) {
        await loc.first().click({ timeout: 5000 }).catch(() => {})
        break
      }
    }
    await page.waitForTimeout(2500)
  }
  await selectWorkforce()
  await page.screenshot({ path: path.join(OUT, 'workforce-00-list.png') })
  const row = page.locator('[data-slot="hybrid-list-row"], [data-slot="record-row"], table tbody tr').first()
  await row.click({ timeout: 15_000 }).catch(() => {})
  await page.waitForTimeout(1500)
  const expand = page.getByRole('button', { name: /expand details/i }).first()
  if (await expand.count()) {
    await expand.click()
    await page.waitForTimeout(2500)
  }
  await page.screenshot({ path: path.join(OUT, 'workforce-01-sheet-open.png') })
  await shootTabs(page, 'workforce', dump, selectWorkforce)
  await demoPlansSearch(page, 'workforce', dump)
  writeFileSync(path.join(OUT, 'workforce-dump.txt'), dump.join('\n\n'))
})
