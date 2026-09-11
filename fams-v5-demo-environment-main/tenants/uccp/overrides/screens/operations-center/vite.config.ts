import { defineConfig } from 'vite'
import { fileURLToPath, URL } from 'node:url'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
// Rewrites root-absolute `/assets/...` STRING literals (plain strings that
// Vite's `base` rewrite cannot reach) onto the resolved base. No-op at base
// '/'. See fams-v5-demo-environment/scripts/vite-base-literals.mjs.
// @ts-expect-error - plain .mjs helper shared with the host app, no types
import { baseLiterals } from '../../../../../scripts/vite-base-literals.mjs'

// Phase A exact-copy port (dispatcher-cockpit plan, run-2026-08-31). This is
// an intentionally ISOLATED Vite dev server/build — the copied dispatcher app
// pins React 18.3.1 and the host fams-v5-demo-environment app runs React 19;
// two major React versions cannot share one bundle. The host mounts this via
// an iframe pointing at this server's origin (see
// app/src/demo/operations-center-module.tsx), not via a shared React tree.
//
// Port :6360 per plan/run-2026-08-31-dispatcher-cockpit/PLAN.md §4 (6310/6320/
// 6330/6340/5188/5200 already claimed elsewhere in this workspace).
export default defineConfig({
  plugins: [react(), tailwindcss(), baseLiterals({ prefixes: ['assets'] })],
  server: { port: Number(process.env.PORT) || 6360, strictPort: true },
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
      // deep imports into the vendored DS (barrel omits map/charts/widgets-v2)
      '@ds': fileURLToPath(new URL('./vendor/fams-design-system/src', import.meta.url)),
      '@fams/design-system/styles.css': fileURLToPath(
        new URL('./vendor/fams-design-system/src/styles.css', import.meta.url),
      ),
      '@fams/design-system/tokens/theme.css': fileURLToPath(
        new URL('./vendor/fams-design-system/src/tokens/theme.css', import.meta.url),
      ),
      '@fams/design-system/tokens/fonts.css': fileURLToPath(
        new URL('./vendor/fams-design-system/src/tokens/fonts.css', import.meta.url),
      ),
      '@fams/design-system': fileURLToPath(new URL('./vendor/fams-design-system/src/index.ts', import.meta.url)),
    },
    dedupe: ['react', 'react-dom'],
  },
})
