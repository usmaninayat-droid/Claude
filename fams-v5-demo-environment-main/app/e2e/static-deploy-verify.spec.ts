// static-deploy-verify.spec.ts — 2026-09-01.
// Proves the PRODUCTION STATIC BUILD works with no dev server anywhere:
// `bash fams-v5-demo-environment/scripts/vercel-build.sh` then serve
// `app/dist` with a filesystem-first + SPA-fallback static server (what
// vercel.json configures). Checks the four things a static host can break:
//   1. the SPA loads and MSW registers at scope '/' (the demo's only data
//      source — no backend exists),
//   2. login → shell boots and a data-backed module renders records,
//   3. the embedded override screens load from the SAME ORIGIN under
//      /screens/<name>/ instead of the localhost dev ports,
//   4. a deep-linked route survives a hard reload (the SPA rewrite).
//
// Point it at the static server, not the dev server:
//   node scripts/serve-dist.mjs &      # or any filesystem-first static server
//   npx playwright test e2e/static-deploy-verify.spec.ts \
//     --config=playwright.config.ts   (BASE_URL=http://localhost:6400)
import { test, expect } from '@playwright/test'
import path from 'node:path'
import fs from 'node:fs'
import { fileURLToPath } from 'node:url'

const dirname = path.dirname(fileURLToPath(import.meta.url))
// BASE_PATH mirrors the build's `--base`: '/' for the Vercel-shaped deploy,
// '/MME-FRMS-MVP/' for the GitHub Pages project-pages deploy. Everything below
// is written against `ORIGIN + BASE_PATH` so one spec covers both.
const BASE_PATH = (process.env.STATIC_BASE_PATH ?? '/').replace(/\/*$/, '/')
const ORIGIN = process.env.STATIC_BASE_URL ?? 'http://localhost:6400'
const BASE = `${ORIGIN}${BASE_PATH}`.replace(/\/$/, '')
const MEDIA_DIR = path.resolve(
  dirname,
  '../../../Build Delegate/media/' + (process.env.STATIC_MEDIA_DIR ?? '2026-09-01-vercel'),
)
const TENANT = 'uccp'

test.beforeAll(() => fs.mkdirSync(MEDIA_DIR, { recursive: true }))
test.use({ viewport: { width: 1600, height: 950 }, baseURL: BASE })

async function login(page: import('@playwright/test').Page) {
  await page.goto(`${BASE}/?tenant=${TENANT}`)
  await page.getByRole('textbox', { name: 'Email' }).fill('admin.uccp@fams.com')
  await page.getByRole('textbox', { name: 'Password' }).fill('Fams@123')
  await page.getByRole('button', { name: 'Login' }).click()
  await expect(page.locator('[data-slot="navrail"]')).toBeVisible({ timeout: 30_000 })
}

test('static build: login, MSW, records, embedded screens, SPA rewrite', async ({ page }) => {
  const failures: string[] = []
  page.on('pageerror', (e) => failures.push(`pageerror: ${e.message}`))
  page.on('requestfailed', (r) => failures.push(`requestfailed: ${r.url()}`))

  // 1 — login page paints from the static bundle
  await page.goto(`${BASE}/?tenant=${TENANT}`)
  await expect(page.getByRole('textbox', { name: 'Email' })).toBeVisible({ timeout: 30_000 })
  await page.screenshot({ path: `${MEDIA_DIR}/01-login.png` })

  await login(page)
  await page.waitForTimeout(4000)
  await page.screenshot({ path: `${MEDIA_DIR}/02-shell-after-login.png` })

  // 2 — MSW registered at the deployed origin, scope '/'
  const scopes = await page.evaluate(() =>
    navigator.serviceWorker.getRegistrations().then((rs) => rs.map((r) => r.scope)),
  )
  // eslint-disable-next-line no-console
  console.log('SW SCOPES', scopes)
  // The worker script is served from the deploy base, so its scope IS the base
  // — which is exactly what has to cover the app's API calls.
  expect(scopes.some((s) => new URL(s).pathname === BASE_PATH)).toBe(true)

  // 3 — a data-backed module renders records (MSW alive in the static build)
  await page.getByRole('button', { name: /Live Monitoring/i }).click()
  await page.waitForTimeout(6000)
  await page.screenshot({ path: `${MEDIA_DIR}/03-live-monitoring.png` })
  const bodyText = await page.locator('body').innerText()
  expect(bodyText).toMatch(/QA-|Tanker|Vehicle|Workforce/i)

  // 4 — Operations Center through the SAME-ORIGIN /screens/ iframe
  await page.getByRole('button', { name: /Operations Center/i }).click()
  const opsFrame = page.frameLocator('iframe[src*="/screens/operations-center/"]')
  await expect(opsFrame.locator('body')).toBeVisible({ timeout: 30_000 })
  await page.waitForTimeout(8000)
  await page.screenshot({ path: `${MEDIA_DIR}/04-operations-center.png` })
  const opsText = await opsFrame.locator('body').innerText()
  // eslint-disable-next-line no-console
  console.log('OPS TEXT', opsText.replace(/\n/g, ' | ').slice(0, 400))
  expect(opsText.trim().length).toBeGreaterThan(50)

  // 5 — Smart Planning (planning-v2) through its own /screens/ iframe
  await page.getByRole('button', { name: /Smart Planning/i }).click()
  const planFrame = page.frameLocator('iframe[src*="/screens/planning-v2/"]')
  await expect(planFrame.locator('body')).toBeVisible({ timeout: 30_000 })
  await page.waitForTimeout(6000)
  await page.screenshot({ path: `${MEDIA_DIR}/05-smart-planning.png` })
  expect((await planFrame.locator('body').innerText()).trim().length).toBeGreaterThan(50)

  // 6 — Inspector Shifts
  await page.getByRole('button', { name: /Inspector Shifts/i }).click()
  const inspFrame = page.frameLocator('iframe[src*="/screens/inspector-shifts/"]')
  await expect(inspFrame.locator('body')).toBeVisible({ timeout: 30_000 })
  await page.waitForTimeout(6000)
  await page.screenshot({ path: `${MEDIA_DIR}/06-inspector-shifts.png` })
  expect((await inspFrame.locator('body').innerText()).trim().length).toBeGreaterThan(50)

  // 7 — SPA rewrite: a deep route reloaded cold still boots (not a 404)
  const deep = page.url()
  await page.goto(deep)
  await expect(page.locator('[data-slot="navrail"]')).toBeVisible({ timeout: 30_000 })
  await page.screenshot({ path: `${MEDIA_DIR}/07-deep-link-reload.png` })

  // eslint-disable-next-line no-console
  console.log('NETWORK/PAGE FAILURES', JSON.stringify(failures, null, 2))
})
