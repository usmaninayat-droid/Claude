import { defineConfig } from 'vitest/config'
import { TEST_TIMEOUT_MS, HOOK_TIMEOUT_MS } from '../../vitest.timeouts'

// Mirrors packages/ui-kit/vitest.config.ts's jsdom + setup-file shape
// (needed because this package renders the same Radix-based core
// components), minus the `@vitejs/plugin-react` plugin — this package's
// dependency contract is intentionally narrow (`@fams/tokens` +
// `@fams/ui-kit` only, see docs/BOUNDARIES.md § the patterns tier) and
// doesn't carry that devDependency. Not required for tests: esbuild's
// default Vite transform already handles `.tsx` per this package's own
// `tsconfig.json` (`jsx: "react-jsx"`) — the plugin only adds Fast Refresh,
// which is a dev-server concern, not a test one.
export default defineConfig({
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: './vitest.setup.ts',
    // Shared budget — see ../../vitest.timeouts.ts for why it is not the default.
    testTimeout: TEST_TIMEOUT_MS,
    hookTimeout: HOOK_TIMEOUT_MS,
  },
})
