// command-center-layout-verify.spec.ts — 2026-09-01.
// The Command Center's six KPI tiles stopped short of the right edge because
// the map's grouped tool column (search / hide-markers / traffic / POI /
// zones) was anchored at the very top-end, beside them — leaving a dead gap
// at the end of the KPI row. The KPI row now owns the whole top strip
// (end inset == the page gutter) and the tool column starts BELOW it.
// Run BEFORE the fix with CC_LAYOUT_PHASE=before to capture the baseline.
import { test, expect } from '@playwright/test'
import path from 'node:path'
import fs from 'node:fs'
import { fileURLToPath } from 'node:url'

const dirname = path.dirname(fileURLToPath(import.meta.url))
const TENANT = 'uccp'
const MEDIA_DIR = path.resolve(dirname, '../../../Build Delegate/media/2026-09-01-cc-layout')
const PHASE = process.env.CC_LAYOUT_PHASE ?? 'after'
const GUTTER = 16

test.beforeAll(() => {
  fs.mkdirSync(MEDIA_DIR, { recursive: true })
})

test.use({ viewport: { width: 1920, height: 1080 } })

test('Command Center — KPI row spans full width, tool column sits below it', async ({ page }) => {
  await page.goto(`/?tenant=${TENANT}`)
  await page.getByRole('textbox', { name: 'Email' }).fill('admin.uccp@fams.com')
  await page.getByRole('textbox', { name: 'Password' }).fill('Fams@123')
  await page.getByRole('button', { name: 'Login' }).click()
  await expect(page.locator('[data-slot="navrail"]')).toBeVisible({ timeout: 15_000 })
  await page.getByRole('button', { name: 'Command Center' }).click()
  await expect(page.getByTestId('command-center')).toBeVisible({ timeout: 15_000 })
  await page.waitForTimeout(4000) // maplibre + tiles settle

  await page.screenshot({ path: `${MEDIA_DIR}/${PHASE}-01-full.png` })

  const kpi = page.getByTestId('command-center-kpis')
  const tools = page.locator('[data-slot="live-map-end-tools"]')
  const rightCol = page.getByTestId('command-center-right-column')

  const kpiBox = (await kpi.boundingBox())!
  const toolBox = (await tools.boundingBox())!
  const rightBox = (await rightCol.boundingBox())!
  const vw = page.viewportSize()!.width

  // eslint-disable-next-line no-console
  console.log('CC LAYOUT', PHASE, JSON.stringify({ kpiBox, toolBox, rightBox, vw }, null, 2))

  if (PHASE === 'after') {
    // 1. KPI row reaches the page gutter on the end edge — no dead gap.
    expect(Math.round(vw - (kpiBox.x + kpiBox.width))).toBe(GUTTER)
    // 2. Tool column starts below the KPI row (no vertical collision).
    expect(toolBox.y).toBeGreaterThanOrEqual(kpiBox.y + kpiBox.height)
    // 3. Tool column stays inboard of the right panel column — no overlap.
    expect(toolBox.x + toolBox.width).toBeLessThanOrEqual(rightBox.x)
    // 4. Six tiles, all equal width (stretched edge to edge).
    const widths = await kpi.locator(':scope > div > *').evaluateAll((els) =>
      els.map((el) => Math.round(el.getBoundingClientRect().width)),
    )
    expect(widths).toHaveLength(6)
    expect(new Set(widths).size).toBe(1)
  }
})

// The Live Activity feed printed `entry.text` raw: seeded log rows read
// literally "added due date **2 Sep, 2026**", and severity rows ended at
// "changed severity to" because the label is a STRUCTURAL field the feed
// dropped. Both now render the Timeline tab's way (bold value / tonal label).
test('Command Center — Live Activity renders markup, never raw asterisks', async ({ page }) => {
  await page.goto(`/?tenant=${TENANT}`)
  await page.getByRole('textbox', { name: 'Email' }).fill('admin.uccp@fams.com')
  await page.getByRole('textbox', { name: 'Password' }).fill('Fams@123')
  await page.getByRole('button', { name: 'Login' }).click()
  await expect(page.locator('[data-slot="navrail"]')).toBeVisible({ timeout: 15_000 })
  await page.getByRole('button', { name: 'Command Center' }).click()
  const feed = page.getByTestId('command-center-feed')
  await expect(feed).toBeVisible({ timeout: 15_000 })
  await page.waitForTimeout(2000)

  await feed.screenshot({ path: `${MEDIA_DIR}/${PHASE}-02-feed.png` })

  const text = (await feed.innerText()).trim()
  expect(text.length).toBeGreaterThan(0)

  if (PHASE === 'after') {
    // No raw markdown anywhere in the feed.
    expect(text).not.toContain('*')
    // Due-date rows keep their value, now inside a bold value span.
    const values = feed.locator('[data-slot="activity-log-value"]')
    expect(await values.count()).toBeGreaterThan(0)
    await expect(values.first()).toHaveCSS('font-weight', '600')
    // Severity rows no longer dangle — the tonal label follows the text.
    const sev = feed.locator('[data-slot="activity-log-severity"]')
    expect(await sev.count()).toBeGreaterThan(0)
    expect(await sev.first().innerText()).not.toBe('')
    expect(text).not.toMatch(/changed severity to\s*$/m)
  }
})
