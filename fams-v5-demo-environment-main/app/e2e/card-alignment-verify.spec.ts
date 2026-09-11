// card-alignment-verify.spec.ts — before/after capture for the 2026-09-01
// hybrid/kanban card leading-row alignment fix (eye toggle box vs id chip /
// type badge center line). Pass STAGE=before|after via env to name outputs.
import { test, expect } from '@playwright/test'
import path from 'node:path'

const TENANT = 'uccp'
const EMAIL = 'admin.uccp@fams.com'
const PASSWORD = 'Fams@123'
const STAGE = process.env.STAGE ?? 'after'
const MEDIA_DIR =
  'e2e-artifacts/2026-09-01-card-alignment'

test.describe.configure({ mode: 'serial' })

async function login(page: import('@playwright/test').Page) {
  await page.goto(`/?tenant=${TENANT}`)
  await page.getByRole('textbox', { name: 'Email' }).fill(EMAIL)
  await page.getByRole('textbox', { name: 'Password' }).fill(PASSWORD)
  await page.getByRole('button', { name: 'Login' }).click()
  await expect(page.locator('[data-slot="navrail"]')).toBeVisible({ timeout: 15_000 })
}

test(`incidents hybrid card leading-row alignment (${STAGE})`, async ({ page }) => {
  await login(page)
  await page.goto(`/incidents?tenant=${TENANT}`)
  await page.getByRole('tab', { name: 'Hybrid View' }).click()
  await expect(page.locator('[data-slot="map-hybrid-view"]')).toBeVisible()

  const card = page.locator('[data-slot="record-map-card"]').first()
  await expect(card).toBeVisible({ timeout: 15_000 })
  await expect(card.locator('[data-slot="record-map-visibility"]')).toBeVisible()
  await page.waitForTimeout(500)
  await card.screenshot({ path: path.join(MEDIA_DIR, `hybrid-card-${STAGE}.png`) })

  // Geometry probe: every row-1 element should share one vertical center
  // line (within 1px): the eye's visual square, the id chip, the type badge,
  // and the trailing CRITICAL pill.
  const probe = await card.evaluate((el) => {
    const centers: Record<string, { top: number; height: number; centerY: number }> = {}
    const grab = (name: string, node: Element | null) => {
      if (!node) return
      const r = node.getBoundingClientRect()
      centers[name] = { top: Math.round(r.top), height: Math.round(r.height), centerY: Math.round(r.top + r.height / 2) }
    }
    grab('eyeButton', el.querySelector('[data-slot="record-map-visibility"]'))
    grab('eyeVisual', el.querySelector('[data-slot="record-map-visibility"] > span'))
    const badges = el.querySelector('[data-slot="kanban-card-badges"]')
    const pills = badges ? Array.from(badges.querySelectorAll(':scope div.flex.flex-wrap > *')) : []
    pills.forEach((p, i) => grab(`rowItem${i}:${(p.textContent || '').trim().slice(0, 12)}`, p))
    return centers
  })
  console.log(`[${STAGE}] geometry:`, JSON.stringify(probe, null, 1))
})
