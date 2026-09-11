import { defineConfig, devices } from '@playwright/test'

/**
 * Verify-suite config — runs the 46 `e2e/*verify.spec.ts` acceptance specs.
 *
 * `playwright.config.ts`'s only project is `visual-matrix`, whose `testMatch`
 * is limited to `visual-matrix.spec.ts`. Every `*-verify.spec.ts` therefore
 * matches NO project and is silently skipped by a plain `npx playwright test`
 * — they were written to be run explicitly, one file at a time. This config
 * gives them a project of their own so the whole acceptance suite can run in
 * one command.
 *
 * It deliberately has NO `webServer`: point it at an already-running dev
 * server so the same suite can be aimed at two builds and their pass/fail
 * sets diffed (how the MME-FRMS-MVP merge was verified — see
 * `archive/designer-mme-*`). The three tenant override screens are separate
 * Vite apps on hardcoded ports (6360 operations-center, 6370 planning-v2,
 * 6380 inspector-shifts), so start those too or their specs will fail.
 *
 *   pnpm --filter app dev                       # host app on :6300
 *   npx playwright test -c playwright.verify.config.ts
 *   VERIFY_URL=http://localhost:6310 npx playwright test -c playwright.verify.config.ts
 */
const BASE_URL = process.env.VERIFY_URL ?? 'http://localhost:6300'

export default defineConfig({
  testDir: 'e2e',
  fullyParallel: true,
  reporter: [['list']],
  use: { baseURL: BASE_URL, trace: 'off' },
  expect: { toHaveScreenshot: { maxDiffPixelRatio: 0.01, animations: 'disabled' } },
  projects: [
    {
      name: 'verify',
      testMatch: /.*verify\.spec\.ts/,
      use: {
        ...devices['Desktop Chrome'],
        viewport: { width: 1440, height: 900 },
        colorScheme: 'light',
        locale: 'en-US',
        reducedMotion: 'reduce',
      },
    },
  ],
})
