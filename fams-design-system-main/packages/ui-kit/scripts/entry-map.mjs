// PD-363 (bundle-size): the multi-entry map that makes `@fams/ui-kit`'s dist
// tree-shakeable per component instead of one 985 KB `dist/index.js`.
//
// Every relative specifier used in an `export { ... } from './x'` statement
// inside `src/index.ts` becomes ONE tsup entry, keyed by its basename. This is
// parsed straight out of the real barrel — not hand-listed — so the entry map
// (and the `exports` subpaths generated from it, see check-exports.mjs)
// CANNOT drift from what `src/index.ts` actually re-exports: add/remove a
// barrel export and the next build/check picks it up automatically.
//
// Internal helper modules that `index.ts` does NOT re-export directly
// (DataTable's useDataTableSort/useDataTableColumns/dataTableFlatItems,
// Kanban's kanban-model/kanban-context, the lazily-loaded echarts-engine,
// PeoplePicker's row/avatar/trigger sub-files, …) are correctly excluded from
// this map — esbuild inlines them into whichever public entry imports them,
// or (with `splitting: true`) lifts them into a shared chunk when more than
// one public entry needs them.
//
// Consumed by:
//  - tsup.config.ts          → the multi-entry `entry` map
//  - scripts/check-exports.mjs → verifies (or regenerates, --write)
//                                package.json#exports against this same map
import { existsSync, readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const SCRIPT_DIR = dirname(fileURLToPath(import.meta.url))
export const PKG_DIR = join(SCRIPT_DIR, '..')
export const BARREL_PATH = join(PKG_DIR, 'src/index.ts')

/**
 * @returns {Record<string, string>} tsup entry map: `{ index: 'src/index.ts', Button: 'src/primitives/Button.tsx', ... }`
 *   Keys are flat basenames (all verified unique below) so `dist/` stays flat
 *   and the package.json subpath export is the short form the consumer asked
 *   for: `@fams/ui-kit/Button`, not `@fams/ui-kit/primitives/Button`.
 */
export function getPublicEntries() {
  const src = readFileSync(BARREL_PATH, 'utf8')
  const specifiers = new Set()
  for (const m of src.matchAll(/from\s+'(\.\/[^']+)'/g)) specifiers.add(m[1])

  /** @type {Record<string, string>} */
  // `icons` is the one entry NOT derived from the barrel: `src/icons/index.ts`
  // is the canonical FAMS V5 glyph set (`<Icon name=…>` plus one named export
  // per glyph). It is deliberately kept OUT of `src/index.ts` because names
  // like Map/List/File/Image/Gauge would collide with real ui-kit components,
  // so it can only reach consumers as its own `@fams/ui-kit/icons` subpath.
  const entries = { index: 'src/index.ts', icons: 'src/icons/index.ts' }
  /** @type {Map<string, string>} */
  const seenBase = new Map([['icons', 'icons/index']])

  for (const spec of [...specifiers].sort()) {
    const rel = spec.replace(/^\.\//, '') // e.g. "primitives/Button"
    const base = rel.split('/').pop()
    const tsxPath = join(PKG_DIR, 'src', `${rel}.tsx`)
    const tsPath = join(PKG_DIR, 'src', `${rel}.ts`)
    const file = existsSync(tsxPath) ? `src/${rel}.tsx` : existsSync(tsPath) ? `src/${rel}.ts` : null
    if (!file) {
      throw new Error(
        `entry-map: cannot resolve a source file for barrel specifier "${spec}" ` +
          `(looked for src/${rel}.tsx and src/${rel}.ts)`,
      )
    }
    if (base === 'index') {
      throw new Error(`entry-map: barrel specifier "${spec}" resolves to basename "index", which collides with the "." entry`)
    }
    if (seenBase.has(base)) {
      throw new Error(
        `entry-map: basename collision "${base}" between "${seenBase.get(base)}" and "${rel}" — ` +
          `subpath exports are keyed by basename and must stay unique across primitives/layout/composites/shells/domain.`,
      )
    }
    seenBase.set(base, rel)
    entries[base] = file
  }
  return entries
}
