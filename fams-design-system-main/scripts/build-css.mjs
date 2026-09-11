/*
 * Compiles THE design system's single Tailwind stylesheet:
 *
 *   packages/tokens/utilities.build.css -> packages/tokens/dist/utilities.css
 *
 * Run with no arguments; wired into `@fams/tokens`' build (after Style
 * Dictionary, because the entry `@reference`s `dist/theme.css`). Each markup
 * package then copies this artifact into its own dist via
 * scripts/copy-utilities.mjs, after tsup has cleaned it.
 *
 * WHY THIS EXISTS. The packages ship compiled `dist`, so a consumer's Tailwind
 * cannot see our class names and generates no CSS for our components. Before
 * this, the demo app worked around that by pointing `@source` at the design
 * system's `src/` on disk — which only works when the sibling checkout is
 * present, and so blocked installing the packages from a registry at all.
 * The packages therefore ship the utilities their components use.
 *
 * WHY ONE COMPILE, NOT ONE PER PACKAGE (fixed 2026-09-08). Per-package
 * compiles each emitted their own unconditional base utilities; the consumer
 * concatenated them into one `utilities` cascade layer, where equal-specificity
 * ties resolve by import order — so a later package's plain `.hidden`/`.flex`
 * beat an earlier package's `md:`/`lg:` variant and responsive layouts
 * collapsed. Variant-after-base ordering is guaranteed only WITHIN a single
 * Tailwind compile, so there is exactly one. See packages/tokens/
 * utilities.build.css for the full rationale and docs/ARCHITECTURE.md.
 *
 * WHY AT THE ROOT. The tooling (tailwindcss + @tailwindcss/vite + vite) lives
 * in root devDependencies and is shared, rather than added to five packages.
 * The `@source` scan is a build-time read of sibling `src/` folders, not an
 * import, so the tier boundaries in docs/BOUNDARIES.md are unaffected.
 */
import { build } from 'vite'
import tailwindcss from '@tailwindcss/vite'
import { rm, rename, readdir, access } from 'node:fs/promises'
import { join, resolve } from 'node:path'

const root = resolve(import.meta.dirname, '..', 'packages', 'tokens')
const entry = join(root, 'utilities.build.css')
await access(entry).catch(() => {
  throw new Error(`build-css: missing ${entry}`)
})

const tmp = join(root, '.css-build')

await build({
  configFile: false,
  logLevel: 'warn',
  root,
  plugins: [tailwindcss()],
  build: {
    outDir: tmp,
    emptyOutDir: true,
    minify: false,
    rollupOptions: { input: entry },
  },
})

// Vite insists on a JS-ish entry graph for a CSS-only build; keep the single
// emitted stylesheet under a stable name and discard the rest.
const assets = join(tmp, 'assets')
const css = (await readdir(assets).catch(() => [])).find((f) => f.endsWith('.css'))
if (!css) throw new Error('build-css: emitted no stylesheet')
await rename(join(assets, css), join(root, 'dist', 'utilities.css'))
await rm(tmp, { recursive: true, force: true })
console.log('build-css: packages/tokens/dist/utilities.css')
