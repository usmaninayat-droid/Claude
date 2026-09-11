import { defineConfig } from 'vitest/config'
import { TEST_TIMEOUT_MS, HOOK_TIMEOUT_MS } from '../../vitest.timeouts'

// The composer's runtime core (types/rules/store/composition/config-render/
// blueprint-loader/validate) is React-free pure TS, but the composer entry
// (`ComposedModule`) is a React component, so its test renders into jsdom —
// same jsdom + globals shape as the sibling v5-templates package. esbuild's
// default Vite transform handles `.tsx` per this package's own tsconfig
// (`jsx: "react-jsx"`); no `@vitejs/plugin-react` is needed for tests.
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
