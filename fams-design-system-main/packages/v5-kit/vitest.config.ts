import { defineConfig } from 'vitest/config'
import { TEST_TIMEOUT_MS, HOOK_TIMEOUT_MS } from '../../vitest.timeouts'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    // Give jsdom a real origin so localStorage-backed theming bootstrap in
    // @fams/skeleton-kit works when composed here (same reason as skeleton-kit).
    environmentOptions: { jsdom: { url: 'http://localhost/' } },
    globals: true,
    setupFiles: './vitest.setup.ts',
    // Shared budget — see ../../vitest.timeouts.ts for why it is not the default.
    testTimeout: TEST_TIMEOUT_MS,
    hookTimeout: HOOK_TIMEOUT_MS,
  },
})
