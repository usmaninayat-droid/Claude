import { createRequire } from 'node:module'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// The FAMS design system (@fams/ui-kit / @fams/tokens) is consumed as BUILT
// DIST via the package `exports` map (Phase 1 §2), same as any other
// workspace consumer — not workspace source:
//   - optimizeDeps.exclude stops Vite from pre-bundling the linked packages,
//     avoiding a stale pre-bundle cache of the linked dist after a rebuild
//     (pnpm's symlinked node_modules otherwise looks unchanged to Vite's
//     dependency-cache heuristics).
//   - server.fs.allow is still needed so Vite can read the sibling workspace
//     packages' source (sourcemaps, on-disk `dist/`) across the symlink.
//   - dedupe + alias pin a SINGLE React copy so Radix hooks in the linked
//     library don't null the dispatcher ("Invalid hook call").
const require = createRequire(import.meta.url)

const reactAliases = [
  { find: /^react$/, replacement: require.resolve('react') },
  { find: /^react-dom$/, replacement: require.resolve('react-dom') },
  { find: /^react\/jsx-runtime$/, replacement: require.resolve('react/jsx-runtime') },
  { find: /^react\/jsx-dev-runtime$/, replacement: require.resolve('react/jsx-dev-runtime') },
]

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    dedupe: ['react', 'react-dom'],
    alias: reactAliases,
  },
  server: {
    fs: {
      // Allow reading the sibling workspace packages (tokens/ui-kit src).
      allow: ['..', '../..', '../../..'],
    },
  },
  optimizeDeps: {
    exclude: ['@fams/ui-kit', '@fams/tokens'],
  },
})
