import { defineConfig, devices } from '@playwright/test'

const PORT = 6300
const BASE_URL = `http://localhost:${PORT}`

// VRT builds are per-process, in-memory state (see e2e/support/vrt.ts) — pin
// to a single worker whenever VRT_URL is set so the whole run creates exactly
// one build, never split across parallel workers into fragments. Mirrors the
// design system's workshop/showcase/playwright.config.ts convention.
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
  // Same tolerance as the design system's showcase suites — enough headroom
  // for chromium AA jitter, not enough to hide a real regression.
  expect: {
    toHaveScreenshot: {
      maxDiffPixelRatio: 0.01,
      animations: 'disabled',
    },
  },
  projects: [
    {
      // Suite B (phase 4 §2) — the curated tenant x persona x screen matrix.
      // Fixed viewport/locale/color-scheme/reducedMotion so baselines are
      // reproducible run to run (same determinism strategy as the DS's
      // `visual`/`visual-all` projects).
      name: 'visual-matrix',
      testMatch: /visual-matrix\.spec\.ts/,
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
    // Dev server (not preview/build) — matches how this app is normally run
    // (README "Run"); MSW's worker + the committed resolved/ blueprints need
    // no build step to boot.
    command: `npx vite --port ${PORT} --strictPort`,
    url: BASE_URL,
    reuseExistingServer: false,
    timeout: 60_000,
  },
})
