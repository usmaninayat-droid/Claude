import { defineConfig } from 'vitest/config'
import { TEST_TIMEOUT_MS, HOOK_TIMEOUT_MS } from '../../vitest.timeouts'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./vitest.setup.ts', './vitest.setup.echarts.ts'],
    // Shared budget — see ../../vitest.timeouts.ts for why it is not the default.
    testTimeout: TEST_TIMEOUT_MS,
    hookTimeout: HOOK_TIMEOUT_MS,
  },
})
