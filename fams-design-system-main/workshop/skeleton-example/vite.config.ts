import { createRequire } from 'node:module'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { tanstackRouter } from '@tanstack/router-plugin/vite'

// Linked workspace packages (@fams/skeleton-kit, @fams/tokens) are consumed as
// built dist; pin a single copy of every package that owns React context or
// hook state so the linked package shares the app's instance instead of a
// second one — a second copy is a different module instance with its own
// dispatcher/context, which is what "Invalid hook call" / a null hook
// dispatcher actually is. React itself is the obvious case, but
// @tanstack/react-router (RouterProvider's router context) and
// @tanstack/react-query (QueryClientProvider's client context) hold the same
// kind of state and need the same treatment. This block is the reference
// implementation for consuming this design system from another workspace —
// see "Consuming from another workspace" in packages/skeleton-kit/README.md.
const require = createRequire(import.meta.url)
const singletonAliases = [
  { find: /^react$/, replacement: require.resolve('react') },
  { find: /^react-dom$/, replacement: require.resolve('react-dom') },
  { find: /^react\/jsx-runtime$/, replacement: require.resolve('react/jsx-runtime') },
  { find: /^react\/jsx-dev-runtime$/, replacement: require.resolve('react/jsx-dev-runtime') },
  { find: /^@tanstack\/react-router$/, replacement: require.resolve('@tanstack/react-router') },
  { find: /^@tanstack\/react-query$/, replacement: require.resolve('@tanstack/react-query') },
]

export default defineConfig({
  plugins: [
    // skeleton-kit registers routes in CODE (from the module contract), not
    // from a `src/routes` directory, so the plugin's file-based route generator
    // is disabled (`enableRouteGeneration: false`) — otherwise it errors on the
    // missing routes dir. `autoCodeSplitting: true` is kept per the task
    // contract; the actual per-module splitting is driven by each module's
    // dynamic `import()` (see modules/<id>/index.ts).
    tanstackRouter({ target: 'react', autoCodeSplitting: true, enableRouteGeneration: false }),
    react(),
    tailwindcss(),
  ],
  resolve: {
    dedupe: ['react', 'react-dom', '@tanstack/react-router', '@tanstack/react-query'],
    alias: singletonAliases,
  },
  server: {
    fs: { allow: ['..', '../..', '../../..'] },
  },
})
