// cockpit-analytics-verify.spec.ts — one-off capture for the 2026-09-01
// "widgets below the Live GIS Map" rework (flood-response analytics section).
// Shoots the standalone override app on :6360 (no login needed), phase driven
// by ANALYTICS_PHASE=before|after. Not part of the regression suite.
import { test, expect } from '@playwright/test'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const dirname = path.dirname(fileURLToPath(import.meta.url))
const MEDIA_DIR = path.resolve(dirname, '../../../Build Delegate/media/2026-09-01-cockpit-widgets')
const PHASE = process.env.ANALYTICS_PHASE ?? 'before'

test('cockpit analytics section capture', async ({ page }) => {
  const errors: string[] = []
  page.on('pageerror', (err) => errors.push(String(err)))
  await page.setViewportSize({ width: 1600, height: 1000 })
  await page.goto('http://localhost:6360/?embed=1')
  await page.waitForTimeout(3500)

  // Full page (the cockpit scrolls inside CustomScrollbar, so screenshot the
  // scroll container at full height rather than relying on fullPage).
  const section = page.locator('[data-slot="analytics-section"]').first()
  if (await section.count()) {
    await section.scrollIntoViewIfNeeded()
    await page.waitForTimeout(1200)
    await section.screenshot({ path: path.join(MEDIA_DIR, `${PHASE}-analytics-section.png`) })

    // Close-up of every card in the section.
    const cards = section.locator('section')
    const n = await cards.count()
    for (let i = 0; i < n; i++) {
      const card = cards.nth(i)
      const title = (await card.locator('h3').first().innerText().catch(() => `card-${i}`))
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-|-$/g, '')
      await card.scrollIntoViewIfNeeded()
      await page.waitForTimeout(400)
      await card.screenshot({ path: path.join(MEDIA_DIR, `${PHASE}-card-${i + 1}-${title || i}.png`) })
    }
  } else {
    await page.screenshot({ path: path.join(MEDIA_DIR, `${PHASE}-analytics-section.png`), fullPage: true })
  }

  expect(errors, errors.join('\n')).toEqual([])
})
