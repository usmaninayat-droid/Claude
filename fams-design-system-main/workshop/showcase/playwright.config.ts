import { register } from 'node:module'
import { defineConfig, devices } from '@playwright/test'

// See e2e/support/json-import-loader.mjs — required so Playwright's Node-side
// test-discovery pass (which statically imports nav.ts -> registry.tsx ->
// the full demo/component tree) can resolve the `.json` import inside
// @fams/ui-kit's chart composites. Must run before any spec file imports
// that chain.
register('./e2e/support/json-import-loader.mjs', import.meta.url)

const PORT = 6199
const BASE_URL = `http://localhost:${PORT}`

// VRT builds are per-process, in-memory state (see e2e/support/vrt.ts) — pin
// to a single worker whenever VRT_URL is set so the whole run creates exactly
// one build, never split across parallel workers into fragments.
const VRT_MODE = Boolean(process.env.VRT_URL)

export default defineConfig({
  testDir: 'e2e',
  fullyParallel: !VRT_MODE,
  workers: VRT_MODE ? 1 : undefined,
  reporter: [['list']],
  use: {
    baseURL: BASE_URL,
    trace: 'retain-on-failure',
  },
  // Visual-regression tolerance: 1% of pixels may differ before a screenshot
  // test fails — enough headroom for chromium AA jitter, not enough to hide
  // a real layout/token regression. `animations: 'disabled'` finishes CSS
  // transitions/animations before every capture (belt-and-braces alongside
  // the `visual` project's `reducedMotion: 'reduce'`).
  expect: {
    toHaveScreenshot: {
      maxDiffPixelRatio: 0.01,
      animations: 'disabled',
    },
  },
  projects: [
    {
      name: 'chromium',
      testMatch: /routes\.smoke\.spec\.ts/,
      use: { ...devices['Desktop Chrome'] },
    },
    {
      // Isolated project for visual.spec.ts: fixed viewport + locale + color
      // scheme + motion preference so baselines are reproducible run to run.
      name: 'visual',
      testMatch: /visual\.spec\.ts/,
      use: {
        ...devices['Desktop Chrome'],
        viewport: { width: 1440, height: 900 },
        colorScheme: 'light',
        locale: 'en-US',
        reducedMotion: 'reduce',
      },
    },
    {
      // Suite A (phase 4 §2) — every registry route (doc + family + member,
      // ~172 at the time of writing: 17 + 39 + 116), plus a small dark-mode
      // subset. Same determinism settings as `visual`. Budget note: this is
      // over the 150-route rule-of-thumb — if it grows much further, shard
      // across CI jobs with Playwright's built-in `--shard=<i>/<n>` (e.g.
      // `--shard=1/4` .. `--shard=4/4`), no config change needed to adopt it.
      name: 'visual-all',
      testMatch: /visual-all\.spec\.ts/,
      use: {
        ...devices['Desktop Chrome'],
        viewport: { width: 1440, height: 900 },
        colorScheme: 'light',
        locale: 'en-US',
        reducedMotion: 'reduce',
      },
    },
  ],
  webServer: {
    command: `npx vite --port ${PORT} --strictPort`,
    url: BASE_URL,
    reuseExistingServer: false,
    timeout: 60_000,
  },
})
