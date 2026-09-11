// Isolated config for rc-map-controls-parity-verify.spec.ts — own vite
// instance on 6355 so concurrent agent sessions' HMR reloads on the shared
// 6310 dev server cannot unmount the page mid-test.
import { defineConfig, devices } from '@playwright/test'

const PORT = 6355
const BASE_URL = `http://localhost:${PORT}`

export default defineConfig({
  testDir: 'e2e',
  testMatch: /rc-map-controls-parity-verify\.spec\.ts/,
  fullyParallel: false,
  workers: 1,
  reporter: [['list']],
  use: {
    baseURL: BASE_URL,
    trace: 'retain-on-failure',
    actionTimeout: 30_000,
    ...devices['Desktop Chrome'],
    viewport: { width: 1600, height: 1000 },
  },
  webServer: {
    command: `npx vite --port ${PORT} --strictPort`,
    url: BASE_URL,
    reuseExistingServer: true,
    timeout: 60_000,
  },
})
