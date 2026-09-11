import { defineConfig } from 'vitest/config'
import { TEST_TIMEOUT_MS, HOOK_TIMEOUT_MS } from '../../vitest.timeouts'

// Pure-TS engine (store/seeds/persona/handlers) needs no DOM, but the session
// persistence test drives `window.sessionStorage`, so the default environment
// is jsdom with a real URL (jsdom disables storage on an opaque origin). The
// MSW-over-real-fetch test opts into the `node` environment via a per-file
// `// @vitest-environment node` docblock so msw/node intercepts Node's fetch.
export default defineConfig({
  test: {
    environment: 'jsdom',
    environmentOptions: { jsdom: { url: 'http://localhost/' } },
    globals: true,
    // Shared budget — see ../../vitest.timeouts.ts for why it is not the default.
    testTimeout: TEST_TIMEOUT_MS,
    hookTimeout: HOOK_TIMEOUT_MS,
  },
})
