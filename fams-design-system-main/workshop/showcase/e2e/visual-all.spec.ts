// Suite A — exhaustive visual-regression net (phase 4 §2 task 4.C).
//
// Divergence from the plan (documented per the task brief): the plan's Suite
// A says "iterate the built Storybook index.json" — this repo has NO
// Storybook (locked decision: the showcase app IS the workshop, see root
// CLAUDE.md "workshop/showcase"). Adapted faithfully: this suite
// iterates the showcase's registry-derived route list (`ROUTES` from
// `src/nav.ts` — the exact same derivation `routes.smoke.spec.ts` and the
// existing `visual.spec.ts` already use) and screenshots every doc page,
// family route, and member route — a superset of `visual.spec.ts`, which
// only covers MEMBER_ROUTES via a scoped `#doc-main` capture. This suite
// captures the full page instead (nav rail included) per the task brief, so
// it's an intentionally broader net, not a replacement for visual.spec.ts.
//
// Dual mode (local snapshot vs VRT upload) — see e2e/support/vrt.ts.
//
// Determinism: same strategy as visual.spec.ts (frozen clock via
// `page.clock.install`, the `visual-all` project's fixed viewport/locale/
// color-scheme/reducedMotion, global `animations: 'disabled'`, wait for
// `document.fonts.ready`) plus an explicit forced `data-theme="light"` +
// `data-tenant="fams"` for the main pass (tenant is already the app's
// default on every fresh load — asserted here so a future persistence
// change can't silently break the "forced" contract) and a small
// representative dark-mode subset.
import { test, expect, type Page } from '@playwright/test'
import { ROUTES, MEMBER_ROUTES } from '../src/nav'
import { assertScreenshot, stopVrt } from './support/vrt'

test.describe.configure({ mode: 'parallel' })

const FROZEN_TIME = new Date('2026-01-15T09:00:00.000Z')

async function gotoAndSettle(page: Page, route: string, theme: 'light' | 'dark'): Promise<void> {
  // Force the theme before the app's first paint (it reads localStorage /
  // OS preference on mount) — deterministic regardless of the machine
  // running the suite.
  await page.addInitScript((t: string) => {
    window.localStorage.setItem('fams-ds-theme', t)
  }, theme)
  await page.clock.install({ time: FROZEN_TIME })
  await page.goto(`/#/${route}`)
  await expect(page.locator('#doc-main')).toBeVisible()
  await expect(page.locator('#doc-main :is(h1, h2)').first()).toBeVisible()
  await expect.poll(() => page.evaluate(() => document.documentElement.dataset.theme)).toBe(theme)
  // Tenant defaults to "fams" on every fresh load (no persistence) — assert
  // it explicitly so the "forced" contract stays true even if that changes.
  await expect.poll(() => page.evaluate(() => document.documentElement.dataset.tenant)).toBe('fams')
  await page.evaluate(() => document.fonts.ready)
}

test.describe('all registry routes — light, FAMS tenant (default)', () => {
  for (const route of ROUTES) {
    test(`visual-all: ${route}`, async ({ page }) => {
      await gotoAndSettle(page, route, 'light')
      await assertScreenshot(page, `all__${route.replace(/\//g, '__')}`)
    })
  }
})

// ~10 representative routes, evenly sampled across the full member-route
// list (not hand-picked literals — tracks registry growth automatically,
// same "single source of truth" principle nav.ts already documents).
const DARK_SAMPLE_SIZE = 10
const DARK_SUBSET: string[] = Array.from(
  new Set(
    Array.from({ length: DARK_SAMPLE_SIZE }, (_, i) =>
      MEMBER_ROUTES[Math.floor((i * MEMBER_ROUTES.length) / DARK_SAMPLE_SIZE)],
    ),
  ),
)

test.describe('dark-mode subset (representative sample)', () => {
  for (const route of DARK_SUBSET) {
    test(`visual-all dark: ${route}`, async ({ page }) => {
      await gotoAndSettle(page, route, 'dark')
      await assertScreenshot(page, `all__${route.replace(/\//g, '__')}__dark`)
    })
  }
})

test.afterAll(async () => {
  await stopVrt()
})
