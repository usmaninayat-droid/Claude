import { defineConfig } from 'vitest/config'
import { TEST_TIMEOUT_MS, HOOK_TIMEOUT_MS } from '../../vitest.timeouts'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    // jsdom disables localStorage on an opaque origin (about:blank); give it a
    // real URL so the theming bootstrap can persist the explicit theme choice.
    environmentOptions: { jsdom: { url: 'http://localhost/' } },
    globals: true,
    setupFiles: './vitest.setup.ts',
    // Shared budget — see ../../vitest.timeouts.ts for why it is not the default.
    testTimeout: TEST_TIMEOUT_MS,
    hookTimeout: HOOK_TIMEOUT_MS,
  },
})
