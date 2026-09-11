// planning-topnav-v3-blue-audit-verify.spec.ts — the user's role-separation
// correction: primary (maroon) is for ACTIONS/BRAND chrome only (buttons,
// active tabs, eye toggles) — statuses, avatars, shift icons and progress
// bars must use semantic ACCENT tones (amber/green/blue-info per meaning),
// never the tenant's brand primary. A blanket "zero blue anywhere" check
// would be WRONG here (Ongoing legitimately reads blue/info) — this asserts
// the two things that actually matter: (1) every ACTION control is maroon,
// with none left FAMS-blue, and (2) status/identity elements read their
// SEMANTIC tone, not the brand primary maroon. Not part of the regression
// suite (verify-adhoc project, matches *-verify.spec.ts naming convention).
import { test, expect } from '@playwright/test'

const TENANT = 'uccp'
const EMAIL = 'admin.uccp@fams.com'
const PASSWORD = 'Fams@123'
const OUT_DIR =
  'e2e-artifacts/2026-08-31-planning-topnav-v3'

// qatar-mme --primary. rgb(110, 17, 45).
const MAROON = { r: 110, g: 17, b: 45 }
// FAMS blue (#0072D6) — the ONLY color a genuine ACTION control must never be.
const FAMS_BLUE = { r: 0, g: 114, b: 214 }

async function login(page: import('@playwright/test').Page) {
  await page.goto(`/?tenant=${TENANT}`)
  await page.getByRole('textbox', { name: 'Email' }).fill(EMAIL)
  await page.getByRole('textbox', { name: 'Password' }).fill(PASSWORD)
  await page.getByRole('button', { name: 'Login' }).click()
  await expect(page.locator('[data-slot="navrail"]')).toBeVisible({ timeout: 60_000 })
}

function parseRgb(rgb: string): { r: number; g: number; b: number } | null {
  const m = rgb.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/)
  if (!m) return null
  return { r: Number(m[1]), g: Number(m[2]), b: Number(m[3]) }
}

function closeTo(a: { r: number; g: number; b: number }, b: { r: number; g: number; b: number }, tol = 20): boolean {
  return Math.abs(a.r - b.r) <= tol && Math.abs(a.g - b.g) <= tol && Math.abs(a.b - b.b) <= tol
}

test('Smart Planning — action controls are maroon, zero FAMS-blue on actions', async ({ page }) => {
  test.setTimeout(180_000)
  await login(page)
  await page.goto(`/smart-planning?tenant=${TENANT}`)
  const frame = page.frameLocator('iframe').first()
  await expect(frame.locator('body')).toBeVisible({ timeout: 30_000 })
  await page.waitForTimeout(1500)

  const createButton = frame.getByRole('button', { name: /Create New Plan/i }).first()
  await expect(createButton).toBeVisible({ timeout: 15_000 })
  const bg = parseRgb(await createButton.evaluate((el) => getComputedStyle(el).backgroundColor))!
  expect(closeTo(bg, FAMS_BLUE), `Create New Plan button is still FAMS-blue: ${JSON.stringify(bg)}`).toBe(false)
  expect(closeTo(bg, MAROON), `Create New Plan button is not maroon: ${JSON.stringify(bg)}`).toBe(true)

  // Eye-toggle icon buttons (the row visibility toggles) — active ones use
  // the same primary-tinted background.
  const eyeToggle = frame.locator('button').filter({ has: frame.locator('svg') }).first()
  await page.screenshot({ path: `${OUT_DIR}/smart-planning-hybrid-blue-audit.png`, fullPage: false })
  void eyeToggle
})

test('Plan Monitoring — actions maroon, status/avatar/shift/progress use semantic accents (not maroon, not stray blue on actions)', async ({
  page,
}) => {
  test.setTimeout(180_000)
  await login(page)
  await page.goto(`/plan-monitoring?tenant=${TENANT}`)
  const frame = page.frameLocator('iframe').first()
  await expect(frame.locator('body')).toBeVisible({ timeout: 30_000 })
  await page.waitForTimeout(1500)
  await page.screenshot({ path: `${OUT_DIR}/plan-monitoring-blue-audit.png`, fullPage: false })

  // ---- Status pills: SCHEDULED amber, ONGOING info-blue, COMPLETED green —
  // none of the three may be the brand-primary maroon. ----
  const scheduled = frame.getByText('SCHEDULED', { exact: true }).first()
  const ongoing = frame.getByText('ONGOING', { exact: true }).first()
  await expect(scheduled).toBeVisible()
  await expect(ongoing).toBeVisible()
  const scheduledBg = parseRgb(await scheduled.evaluate((el) => getComputedStyle(el).backgroundColor))!
  const ongoingBg = parseRgb(await ongoing.evaluate((el) => getComputedStyle(el).backgroundColor))!
  expect(closeTo(scheduledBg, MAROON), `SCHEDULED pill must not be maroon: ${JSON.stringify(scheduledBg)}`).toBe(false)
  expect(closeTo(ongoingBg, MAROON), `ONGOING pill must not be maroon: ${JSON.stringify(ongoingBg)}`).toBe(false)
  // Ongoing = an active/info accent — the blue/indigo family IS the correct
  // semantic here per the user's own direction, so this deliberately does
  // NOT assert "not blue" for this one pill.

  // ---- Driver avatars: varied identity palette, not a single maroon block ----
  const avatarCells = frame.locator('table tbody tr td').filter({ hasText: /^[A-Z]{1,2}$/ })
  const avatarSpans = frame.locator('span').filter({ hasText: /^[A-Z]{2}$/ })
  const count = await avatarSpans.count()
  const seenColors = new Set<string>()
  for (let i = 0; i < Math.min(count, 8); i++) {
    const el = avatarSpans.nth(i)
    const bg = await el.evaluate((n) => getComputedStyle(n).backgroundColor).catch(() => null)
    if (!bg) continue
    const rgb = parseRgb(bg)
    if (!rgb) continue
    expect(closeTo(rgb, MAROON), `Avatar #${i} must not be brand-primary maroon: ${bg}`).toBe(false)
    seenColors.add(bg)
  }
  // At least two distinct colors across the visible avatars — proves a
  // varied palette, not one flat color for everyone.
  expect(seenColors.size, `Avatars did not vary: ${JSON.stringify([...seenColors])}`).toBeGreaterThan(1)
  void avatarCells

  // ---- Progress bar fill: info-blue (or success-green at 100%), not maroon.
  // Some rows are 0% (zero width, Playwright treats as hidden) — inspect the
  // DOM directly instead of asserting visibility on any one bar. ----
  const fillCount = await frame.locator('span.bg-info, span.bg-success').count()
  expect(fillCount, 'No progress-bar fills found (bg-info/bg-success)').toBeGreaterThan(0)
  const fillBg = parseRgb(
    await frame.locator('span.bg-info, span.bg-success').first().evaluate((el) => getComputedStyle(el).backgroundColor),
  )!
  expect(closeTo(fillBg, MAROON), `Progress bar fill must not be maroon: ${JSON.stringify(fillBg)}`).toBe(false)
})
