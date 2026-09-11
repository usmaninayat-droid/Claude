import { defineConfig } from 'vite';
import { fileURLToPath, URL } from 'node:url';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

// Inspector Shifts (Planning + Compliance Monitoring) port — taken as-is
// from /Users/apple/Desktop/FAMS-V5-IIMS-DEMO-main/src/app/inspector-shifts.tsx
// and its vendored vendor/ds tree. Same isolation route as
// tenants/uccp/overrides/screens/planning-v2 and operations-center: the
// vendored source pins React 18.3.1 and the host fams-v5-demo-environment
// app runs React 19 — two major React versions cannot share one bundle.
// This runs its own Vite dev server and is embedded in the host via
// <iframe> (see the Inspector Shifts module wiring in app/src/demo).
//
// Port :6380 — 6310/6320/6330/6340/6350/6360/6370/5188/5200 already claimed
// elsewhere in this workspace (see Build Delegate/STATE.md port table).
export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: { port: Number(process.env.PORT) || 6380, strictPort: true },
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
      '@ds': fileURLToPath(new URL('./vendor/ds/src', import.meta.url)),
    },
    dedupe: ['react', 'react-dom'],
  },
});
