import { createRequire } from 'node:module'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// IWMP Shift Rostering — the iwmp tenant's override screen for the
// `shift-rostering` module (IWMP-SCOPE-ROSTER-V01). Same isolation route as
// tenants/uccp/overrides/screens/*: its own Vite dev server, embedded in the
// host via <iframe> (app/src/demo/shift-rostering-module.tsx).
//
// Unlike those ported screens this is NEW React 19 code, so it does not need
// a vendored design-system copy: it links the SAME `@fams/*` dists the host
// app links, through the same single-React-copy alias the host uses
// (app/vite.config.ts) — hooks inside the linked libraries must share this
// bundle's React dispatcher or they throw "Invalid hook call".
//
// Port :6395 — 6360/6370/6380/6390 are the other override screens; 6100/6200/
// 6210/6300/6400 are host-reserved (see the port table in each screen's
// vite.config.ts).
const require = createRequire(import.meta.url)
const reactAliases = [
  { find: /^react$/, replacement: require.resolve('react') },
  { find: /^react-dom$/, replacement: require.resolve('react-dom') },
  { find: /^react-dom\/client$/, replacement: require.resolve('react-dom/client') },
  { find: /^react\/jsx-runtime$/, replacement: require.resolve('react/jsx-runtime') },
  { find: /^react\/jsx-dev-runtime$/, replacement: require.resolve('react/jsx-dev-runtime') },
]

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: { dedupe: ['react', 'react-dom'], alias: reactAliases },
  server: {
    port: Number(process.env.PORT) || 6395,
    strictPort: true,
    // Tailwind @source scans the sibling design-system source (see styles.css).
    fs: { allow: ['..', '../../../../..', '../../../../../..'] },
  },
})
