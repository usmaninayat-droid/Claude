// Route smoke suite — walks every route the showcase registers (doc pages,
// component families, component members) and asserts each one actually
// renders (an <h1>/<h2> lands in #doc-main) with a clean console (no
// console.error / uncaught page errors). Also covers the RTL language
// switch and one legacy-route redirect as reroute regressions are otherwise
// invisible until a bookmark breaks in production.
//
// Route lists come straight from src/nav.ts (single source of truth for the
// app's own router) rather than being hand-maintained here, so the suite
// automatically tracks new families/members as they're registered.
import { test, expect, type Page, type ConsoleMessage } from '@playwright/test'
import { DOC_ROUTES, FAMILY_ROUTES, MEMBER_ROUTES, LEGACY_ROUTES, findItem } from '../src/nav'

test.describe.configure({ mode: 'parallel' })

// Third-party / browser noise that is expected and cannot be fixed at the
// source. Empty by design for this app (no WebGL/maplibre, no known
// unavoidable warnings) — add an entry ONLY with a comment justifying why.
const ALLOWED_CONSOLE_PATTERNS: RegExp[] = []

function isAllowed(text: string): boolean {
  return ALLOWED_CONSOLE_PATTERNS.some((p) => p.test(text))
}

/** Wires console/pageerror capture for the page and returns the running list. */
function captureErrors(page: Page): string[] {
  const errors: string[] = []
  page.on('console', (msg: ConsoleMessage) => {
    if (msg.type() === 'error' && !isAllowed(msg.text())) errors.push(`[console] ${msg.text()}`)
  })
  page.on('pageerror', (err) => {
    if (!isAllowed(err.message)) errors.push(`[pageerror] ${err.message}`)
  })
  return errors
}

async function gotoRouteAndAssertClean(page: Page, route: string) {
  const errors = captureErrors(page)

  await page.goto(`/#/${route}`)
  await expect(page.locator('#doc-main')).toBeVisible()
  // The page actually rendered content, not a blank/default shell.
  await expect(page.locator('#doc-main :is(h1, h2)').first()).toBeVisible()

  expect(errors, `console/page errors on route "${route}":\n${errors.join('\n')}`).toEqual([])
}

test.describe('doc routes', () => {
  for (const route of DOC_ROUTES) {
    test(`renders clean: ${route}`, async ({ page }) => {
      await gotoRouteAndAssertClean(page, route)
    })
  }
})

test.describe('family routes', () => {
  for (const route of FAMILY_ROUTES) {
    test(`renders clean: ${route}`, async ({ page }) => {
      await gotoRouteAndAssertClean(page, route)
    })
  }
})

test.describe('member routes', () => {
  for (const route of MEMBER_ROUTES) {
    test(`renders clean: ${route}`, async ({ page }) => {
      await gotoRouteAndAssertClean(page, route)
    })
  }
})

test('RTL smoke — switching language to Arabic flips dir and stays clean', async ({ page }) => {
  const errors = captureErrors(page)

  // Deterministic anchor page — any family route works; pick the first.
  const route = FAMILY_ROUTES[0]
  await page.goto(`/#/${route}`)
  await expect(page.locator('#doc-main :is(h1, h2)').first()).toBeVisible()

  await page.getByLabel('Language').selectOption('ar')
  await expect.poll(() => page.evaluate(() => document.documentElement.dir)).toBe('rtl')

  // Page is still rendered (not blanked) after the language switch.
  await expect(page.locator('#doc-main :is(h1, h2)').first()).toBeVisible()

  expect(errors, `console/page errors during RTL switch:\n${errors.join('\n')}`).toEqual([])
})

test('legacy route redirect — old composites/data-table hash resolves to the new family route', async ({
  page,
}) => {
  const oldRoute = 'composites/data-table'
  const newRoute = LEGACY_ROUTES[oldRoute]
  expect(newRoute, 'legacy route map must still contain the old data-table entry').toBeTruthy()

  const expectedLabel = findItem(newRoute)?.item.label
  expect(expectedLabel, `nav must resolve a label for the new route "${newRoute}"`).toBeTruthy()

  const errors = captureErrors(page)
  await page.goto(`/#/${oldRoute}`)

  // The family wrapper's own <h1> (first in #doc-main) carries the family
  // label — proof the legacy hash actually resolved to the new family page,
  // not just fell through to the default route.
  await expect(page.locator('#doc-main h1').first()).toHaveText(expectedLabel!)

  expect(errors, `console/page errors on legacy redirect:\n${errors.join('\n')}`).toEqual([])
})
