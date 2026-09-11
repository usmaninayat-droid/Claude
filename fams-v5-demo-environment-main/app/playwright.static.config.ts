// Verification config for the PRODUCTION STATIC BUILD (what Vercel serves) —
// deliberately separate from playwright.config.ts, whose `webServer` boots the
// vite DEV server on :6310. This one boots `scripts/serve-dist.mjs` against the
// assembled `app/dist`, so nothing dev-only (the :6360/:6370/:6380 override
// dev servers included) can prop the run up.
//
//   bash ../scripts/vercel-build.sh
//   npx playwright test --config=playwright.static.config.ts
import { defineConfig, devices } from '@playwright/test'

const PORT = Number(process.env.STATIC_PORT ?? 6400)
const BASE_URL = `http://localhost:${PORT}`
// Serve under the same prefix the build was based at, so the Pages deploy can
// be reproduced locally: STATIC_BASE_PATH=/MME-FRMS-MVP/ (default '/').
const BASE_PATH = (process.env.STATIC_BASE_PATH ?? '/').replace(/\/*$/, '/')

export default defineConfig({
  testDir: 'e2e',
  testMatch: /static-deploy-verify\.spec\.ts/,
  reporter: [['list']],
  timeout: 180_000,
  use: {
    ...devices['Desktop Chrome'],
    baseURL: BASE_URL,
    viewport: { width: 1600, height: 950 },
    trace: 'retain-on-failure',
    actionTimeout: 30_000,
  },
  webServer: {
    command: `node ../scripts/serve-dist.mjs ${PORT}`,
    env: { BASE_PATH },
    url: `${BASE_URL}${BASE_PATH}`,
    reuseExistingServer: true,
    timeout: 30_000,
  },
})
