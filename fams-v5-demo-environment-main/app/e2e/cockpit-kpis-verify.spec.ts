// cockpit-kpis-verify.spec.ts — one-off capture for the 2026-09-01 cockpit KPI
// strip redesign (semantic color rule, delta chips by good/bad, grouped IA).
// Shoots the standalone override app on :6360 (no login needed), phase driven
// by KPI_PHASE=before|after. Not part of the regression suite.
import { test, expect } from '@playwright/test'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const dirname = path.dirname(fileURLToPath(import.meta.url))
const MEDIA_DIR = path.resolve(dirname, '../../../Build Delegate/media/2026-09-01-cockpit-kpis')
const PHASE = process.env.KPI_PHASE ?? 'before'

test('cockpit KPI strip capture', async ({ page }) => {
  const errors: string[] = []
  page.on('pageerror', (err) => errors.push(String(err)))
  await page.goto('http://localhost:6360/?embed=1')
  const strip = page.locator('[data-slot="kpi-strip"]').first()
  const target = (await strip.count()) ? strip : page.locator('main, body').first()
  await page.waitForTimeout(2500)
  await target.screenshot({ path: path.join(MEDIA_DIR, `${PHASE}-kpi-strip.png`) })
  await page.screenshot({ path: path.join(MEDIA_DIR, `${PHASE}-full.png`), fullPage: false })
  expect(errors, errors.join('\n')).toEqual([])
})
