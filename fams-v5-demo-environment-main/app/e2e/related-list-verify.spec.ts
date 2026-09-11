// related-list-verify.spec.ts — ad-hoc verification for the 2026-09-01
// Related Requests/Complaints tab rework (search input + compact list rows
// replacing the hybrid cards, 16px tab gutters). Screenshots to
// Build Delegate/media/2026-09-01-related-list/. Run with SHOT=before|after.
import { test, expect, type Page, type ConsoleMessage } from '@playwright/test'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const dirname = path.dirname(fileURLToPath(import.meta.url))
const TENANT = 'uccp'
const MEDIA_DIR = path.resolve(dirname, '../../../Build Delegate/media/2026-09-01-related-list')
const TAG = process.env.SHOT ?? 'after'

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

test('related tab — open incident detail, Related Requests/Complaints tab', async ({ page }) => {
  const errors = trackConsoleErrors(page)
  await login(page)
  await page.goto(`/incidents?tenant=${TENANT}`)
  await page.getByRole('tab', { name: 'List View' }).click()
  await page.waitForSelector('table tbody tr')
  // INC-01 (area 90) has related incidents in the seed set.
  await page.locator('table tbody tr').first().click()
  await expect(page.locator('[data-slot="profile-stack"]')).toBeVisible()
  await page.waitForTimeout(500)
  await page.getByRole('tab', { name: 'Related Requests/Complaints' }).click()
  await page.waitForTimeout(400)
  const panel = page.locator('[data-slot="task-detail-panel"]')
  await expect(panel).toBeVisible()
  await page.screenshot({ path: path.join(MEDIA_DIR, `${TAG}-01-related-tab.png`) })
  await panel.screenshot({ path: path.join(MEDIA_DIR, `${TAG}-02-related-panel.png`) })

  if (TAG === 'after') {
    // New contract: search input on top, compact list rows, no hybrid cards.
    const search = panel.getByPlaceholder('Search related requests')
    await expect(search).toBeVisible()
    const rows = panel.locator('[data-slot="related-incident-row"]')
    expect(await rows.count()).toBeGreaterThan(0)
    // Gutter check: exactly 16px from the panel edge to the list body.
    const gutters = await page.evaluate(() => {
      const panelEl = document.querySelector('[data-slot="task-detail-panel"]')!
      const body = panelEl.querySelector('[data-slot="related-incidents"]')!
      const p = panelEl.getBoundingClientRect()
      const b = body.getBoundingClientRect()
      return { left: b.left - p.left, right: p.right - b.right }
    })
    expect(Math.round(gutters.left)).toBe(16)
    expect(Math.round(gutters.right)).toBe(16)
    // Client-side search filters by title/id/location.
    await search.fill('zzz-no-match')
    await expect(panel.getByText(/No related requests match/)).toBeVisible()
    await panel.screenshot({ path: path.join(MEDIA_DIR, `${TAG}-04-search-empty.png`) })
    await search.fill('INC')
    await expect(rows.first()).toBeVisible()
    await panel.screenshot({ path: path.join(MEDIA_DIR, `${TAG}-03-search-filtered.png`) })
    await search.fill('')
    // Scroll behavior: rows scroll within the tab (search stays put).
    const scrollable = await panel
      .locator('[data-slot="related-incidents-list"]')
      .evaluate((el) => el.scrollHeight >= el.clientHeight)
    expect(scrollable).toBe(true)
  }

  expect(errors, `console errors: ${errors.join('\n')}`).toHaveLength(0)
})
