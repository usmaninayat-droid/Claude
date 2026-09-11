import { defineConfig } from 'vite'
import path from 'path'
import { fileURLToPath } from 'node:url'
import { dirname, resolve } from 'node:path'
import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'

const __dirnameEsm = dirname(fileURLToPath(import.meta.url))
// The FAMS V5 Design System is VENDORED into this screen at src/ds (same
// isolation route as the sibling operations-center/planning-v2/
// inspector-shifts override screens — see this dir's package.json).
const DS = resolve(__dirnameEsm, 'src/ds')
const pkg = (p: string) => resolve(__dirnameEsm, 'node_modules', p)

export default defineConfig({
  // Pinned, distinct from the sibling override screens (6360/6370/6380) and
  // from the reserved host ports (6100/6200/6210/6300/6400).
  server: { port: Number(process.env.PORT) || 6390, strictPort: true },
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      '@ds': DS,
      // One React instance across the app + the aliased DS source.
      react: pkg('react'),
      'react-dom/server': pkg('react-dom/server.browser.js'),
      'react-dom': pkg('react-dom'),
      '@radix-ui/react-tooltip': pkg('@radix-ui/react-tooltip'),
      'lucide-react': pkg('lucide-react'),
      '@radix-ui/react-popover': pkg('@radix-ui/react-popover'),
      '@radix-ui/react-switch': pkg('@radix-ui/react-switch'),
      'maplibre-gl': pkg('maplibre-gl'),
    },
    dedupe: ['react', 'react-dom', '@radix-ui/react-tooltip', 'lucide-react', '@radix-ui/react-popover', '@radix-ui/react-switch', 'maplibre-gl'],
  },
  assetsInclude: ['**/*.svg', '**/*.csv'],
})
