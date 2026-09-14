import { createRequire } from 'node:module'
import { readFile } from 'node:fs/promises'
import { extname, join, normalize } from 'node:path'
import { fileURLToPath } from 'node:url'
import type { Plugin } from 'vite'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { tanstackRouter } from '@tanstack/router-plugin/vite'

/**
 * Serve the iwmp Shift Rostering override screen (a self-contained static page
 * under `tenants/iwmp/overrides/screens/shift-rostering/public`) THROUGH this
 * app's own dev server, at the same `/screens/shift-rostering/...` path it uses
 * in production. Without this the roster iframe pointed at a SECOND dev server
 * (`:6395`), so the screen "failed to load" whenever that server wasn't
 * separately running — the recurring breakage. Now the host serves it, so the
 * roster works with just the one app server up.
 */
function serveRosterScreen(): Plugin {
  const here = fileURLToPath(new URL('.', import.meta.url))
  const ROOT = join(here, '../tenants/iwmp/overrides/screens/shift-rostering/public')
  const PREFIX = '/screens/shift-rostering/'
  const MIME: Record<string, string> = {
    '.html': 'text/html', '.css': 'text/css', '.js': 'text/javascript',
    '.mjs': 'text/javascript', '.json': 'application/json', '.svg': 'image/svg+xml',
    '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.gif': 'image/gif',
    '.webp': 'image/webp', '.woff': 'font/woff', '.woff2': 'font/woff2', '.ttf': 'font/ttf',
    '.ico': 'image/x-icon', '.map': 'application/json', '.lottie': 'application/octet-stream',
  }
  return {
    name: 'serve-roster-screen',
    configureServer(server) {
      server.middlewares.use(async (req, res, next) => {
        const url = req.url ?? ''
        if (!url.startsWith(PREFIX)) return next()
        // `/screens/shift-rostering/foo.html?x=1` → ROOT + `/screens/shift-rostering/foo.html`.
        const rel = decodeURIComponent(url.split('?')[0]).slice(1)
        const abs = normalize(join(ROOT, rel))
        // Contain the resolved path to ROOT (no `..` traversal).
        if (!abs.startsWith(normalize(ROOT))) return next()
        try {
          const body = await readFile(abs)
          res.setHeader('Content-Type', MIME[extname(abs).toLowerCase()] ?? 'application/octet-stream')
          res.end(body)
        } catch {
          next()
        }
      })
    },
  }
}
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
    serveRosterScreen(),
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
