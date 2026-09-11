import { createRequire } from 'node:module'
import { defineConfig } from 'vitest/config'

// Dedupe React so the linked design-system libs share the app's single copy
// (same reasoning as vite.config.ts) — matters if a test ever renders.
const require = createRequire(import.meta.url)
const reactAliases = [
  { find: /^react$/, replacement: require.resolve('react') },
  { find: /^react-dom$/, replacement: require.resolve('react-dom') },
  { find: /^react\/jsx-runtime$/, replacement: require.resolve('react/jsx-runtime') },
  { find: /^react\/jsx-dev-runtime$/, replacement: require.resolve('react/jsx-dev-runtime') },
]

// jsdom + globals. The seams/boot tests drive fetch through msw/node; the
// ApiDataAdapter round-trip uses Node's global fetch intercepted by MSW. Tests
// deliberately exercise the data + boot seams WITHOUT mounting React from the
// linked libraries: the linked `@fams/*` packages resolve to real paths under
// `fams-design-system/node_modules` and drag their OWN transitive react copy
// (Radix), which Vitest's `resolve.alias` does not rewrite for those
// deep imports — mounting a DS component throws "Invalid hook call" from the
// duplicate React. The React RENDER path is proven by `vite build` + the DS's
// own `@fams/v5-templates` TaskDetail.test.tsx; the app proves the render-path
// DERIVATION it feeds (deriveDetail/compileFieldSet — see render-path.test.tsx).
export default defineConfig({
  test: {
    environment: 'jsdom',
    environmentOptions: { jsdom: { url: 'http://localhost/' } },
    globals: true,
    include: ['src/**/*.test.{ts,tsx}'],
    setupFiles: ['./vitest.setup.ts'],
  },
  resolve: {
    dedupe: ['react', 'react-dom'],
    alias: reactAliases,
  },
})
