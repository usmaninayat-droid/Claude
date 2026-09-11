// Visual-regression suite — screenshots every showcase component route and
// fails on pixel diffs. This is the net that catches what unit tests and
// axe can't: a broken radius, a spacing regression, a tenant theme token
// that silently stopped applying.
//
// Route list comes straight from src/nav.ts (MEMBER_ROUTES) — same
// single-source-of-truth mechanism routes.smoke.spec.ts uses — so newly
// registered components are covered automatically, with zero hand-maintained
// lists to fall out of sync.
//
// Determinism strategy:
//   - A fake, frozen clock (page.clock.install) is installed before every
//     navigation. This pins `new Date()` for the whole page AND halts
//     `setInterval`/`setTimeout`, which kills two real non-determinism
//     sources at once: Calendar/DateRangePicker's "today" highlight, and
//     LiveDurationCard's self-ticking `setInterval(..., 1000)` counter.
//   - The `visual` Playwright project (see playwright.config.ts) pins
//     viewport, color scheme, locale, and `reducedMotion: 'reduce'`.
//   - `animations: 'disabled'` (set globally in expect.toHaveScreenshot)
//     finishes/skips CSS transitions and animations before capture.
//   - We wait for `document.fonts.ready` before capturing — the DS ships
//     self-hosted Gilroy with `font-display: swap`, so a capture taken
//     before fonts settle would show the fallback font metrics.
// Screenshot region: `#doc-main` rather than full-page. It's the actual
// component-rendering surface (title + demo), and excludes the left nav /
// right TOC rails, whose only per-route variance is which item is
// highlighted — a signal already covered by route-smoke, not something a
// visual diff needs to re-litigate on every single route.
import { test, expect, type Page } from '@playwright/test'
import { MEMBER_ROUTES } from '../src/nav'

test.describe.configure({ mode: 'parallel' })

// Frozen instant for every visual test — arbitrary, just needs to be stable.
const FROZEN_TIME = new Date('2026-01-15T09:00:00.000Z')

async function gotoAndSettle(page: Page, route: string) {
  await page.clock.install({ time: FROZEN_TIME })
  await page.goto(`/#/${route}`)
  await expect(page.locator('#doc-main')).toBeVisible()
  await expect(page.locator('#doc-main :is(h1, h2)').first()).toBeVisible()
  await page.evaluate(() => document.fonts.ready)
}

test.describe('component route screenshots (default FAMS tenant)', () => {
  for (const route of MEMBER_ROUTES) {
    test(`visual: ${route}`, async ({ page }) => {
      await gotoAndSettle(page, route)
      await expect(page.locator('#doc-main')).toHaveScreenshot(`${route.replace(/\//g, '__')}.png`)
    })
  }
})

// Proves tenant theme-diffing actually works end to end (data-tenant swap ->
// CSS custom properties -> visible pixels) without blowing up the baseline
// set — one representative, primary-color-heavy route is enough.
test.describe('tenant theming', () => {
  const route = 'actions/buttons-menus/button'

  test(`visual: ${route} — iwmp tenant`, async ({ page }) => {
    await gotoAndSettle(page, route)
    await page.getByLabel('Tenant theme').selectOption('iwmp')
    await expect.poll(() => page.evaluate(() => document.documentElement.dataset.tenant)).toBe('iwmp')
    await expect(page.locator('#doc-main')).toHaveScreenshot(`${route.replace(/\//g, '__')}__tenant-iwmp.png`)
  })
})
