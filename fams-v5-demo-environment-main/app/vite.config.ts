import { createRequire } from 'node:module'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { tanstackRouter } from '@tanstack/router-plugin/vite'
// Rewrites root-absolute `/branding/...`, `/assets/...` and `/screens/...`
// STRING literals (plain strings, so Vite's `base` rewrite cannot reach them)
// onto the resolved base — needed for GitHub Pages project pages, which serve
// the app under a subpath. No-op at base '/'. See scripts/vite-base-literals.mjs.
// @ts-expect-error - plain .mjs helper shared with the override screen apps
import { baseLiterals } from '../scripts/vite-base-literals.mjs'

// The design-system packages are consumed as linked `dist`. Pin a single React
// copy so hooks inside the linked libraries (skeleton-kit / v5-kit / composer /
// templates) share the app's React dispatcher — otherwise "Invalid hook call".
// Same pattern as workshop/skeleton-example.
const require = createRequire(import.meta.url)
const reactAliases = [
  { find: /^react$/, replacement: require.resolve('react') },
  { find: /^react-dom$/, replacement: require.resolve('react-dom') },
  { find: /^react\/jsx-runtime$/, replacement: require.resolve('react/jsx-runtime') },
  { find: /^react\/jsx-dev-runtime$/, replacement: require.resolve('react/jsx-dev-runtime') },
]

export default defineConfig({
  plugins: [
    // Routes are registered in CODE via the v5-kit module contract, not a
    // src/routes dir — disable file-based generation (mirrors skeleton-example).
    tanstackRouter({ target: 'react', autoCodeSplitting: true, enableRouteGeneration: false }),
    react(),
    tailwindcss(),
    baseLiterals({ prefixes: ['branding', 'assets', 'screens'] }),
  ],
  resolve: {
    dedupe: ['react', 'react-dom', '@tanstack/react-query', '@tanstack/react-router'],
    alias: reactAliases,
  },
  server: {
    port: 6300,
    strictPort: true,
    // Allow importing committed resolved/ + seeds JSON and scanning the
    // sibling design-system source for Tailwind @source.
    fs: { allow: ['..', '../..', '../../..'] },
  },
})
