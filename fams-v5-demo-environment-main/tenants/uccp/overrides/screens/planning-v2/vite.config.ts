import { defineConfig } from 'vite'
import { fileURLToPath, URL } from 'node:url'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// Smart Planning + Plan Monitoring v2 port — taken as-is from
// /Users/apple/Desktop/fms-main 2/src/ds/components/planning/, per the
// Operations Center cockpit playbook (plan/run-2026-08-31-dispatcher-cockpit/
// PLAN.md). Same isolation route: the vendored source pins React 18.3.1 and
// the host fams-v5-demo-environment app runs React 19 — two major React
// versions cannot share one bundle. This runs its own Vite dev server and is
// embedded in the host via <iframe> (see app/src/demo/planning-v2-module.tsx).
//
// Port :6370 — 6310/6320/6330/6340/6350/6360/5188/5200 already claimed
// elsewhere in this workspace (see Build Delegate/STATE.md port table).
export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: { port: Number(process.env.PORT) || 6370, strictPort: true },
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
      '@ds': fileURLToPath(new URL('./vendor/fms-main-ds', import.meta.url)),
      '@ds-root': fileURLToPath(new URL('./vendor/fms-main-ds/index.ts', import.meta.url)),
    },
    dedupe: ['react', 'react-dom'],
  },
})
