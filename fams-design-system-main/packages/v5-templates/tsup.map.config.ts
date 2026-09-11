import { defineConfig } from 'tsup'
import { EXTERNAL } from './tsup.shared'

/**
 * The HEAVY `./map` entry (`@fams/v5-templates/map`, `src/map/index.ts`) —
 * `MapPanel` and friends. Built FIRST, and separately from `tsup.config.ts`
 * (the `.` entry) — see `package.json`'s `build`/`dev` scripts, which chain
 * `tsup --config tsup.map.config.ts && tsup --config tsup.config.ts`.
 *
 * This is the phase 2 §3 lazy-weight-discipline mechanism (perf rule 7): see
 * `src/map/index.ts`'s header for why a dynamic-`import()` split inside a
 * single build entry was rejected in favor of a real second build entry.
 *
 * WHY TWO SEPARATE, SEQUENTIAL `tsup` PROCESSES — not one `defineConfig`
 * call with both entries, and NOT a `defineConfig([...])` array either:
 * `src/index.ts` (the `.` entry, built by `tsup.config.ts`) reaches this
 * entry only through a runtime `import('@fams/v5-templates/map')` inside
 * `React.lazy(...)` (`views/LocationMapSectionSlot.tsx`, `entity-profile/
 * OverviewWidgets.tsx`, `creation-sheet/LocationPickerWidget.tsx`) — and
 * TypeScript needs to resolve THAT self-package-specifier's declaration
 * file (via this package's own `exports` map) to type the `.then((mod) =>
 * …)` callback. That resolution only succeeds once `dist/map/index.d.ts`
 * already exists on disk. Combining both entries into one multi-entry
 * `defineConfig({entry: {...}})` (or a `defineConfig([...])` array, which
 * still builds every config CONCURRENTLY — confirmed empirically: both
 * entries' "Building entry" CLI lines print in the same tick) races the two
 * entries' dts steps against each other: verified empirically (`rm -rf dist
 * && pnpm build`) to fail with `TS7016/TS2307 Cannot find module
 * '@fams/v5-templates/map'` on every one of the three lazy-import call
 * sites above, because `clean: true` wipes `dist/` first and nothing
 * guarantees `map/index`'s `.d.ts` lands before the `.` entry's dts step
 * tries to resolve it. Two fully separate `tsup` CLI invocations chained
 * with `&&` is the only arrangement that guarantees ordering: this config
 * (with `clean: true`, since it's the first step and dist should start
 * fresh) always finishes writing `dist/map/index.d.ts` before
 * `tsup.config.ts` (with `clean: false`, so it doesn't erase this output)
 * starts its own dts step.
 */
export default defineConfig({
  entry: { 'map/index': 'src/map/index.ts' },
  format: ['esm'],
  dts: true,
  sourcemap: true,
  clean: true,
  splitting: false,
  treeshake: true,
  minify: false,
  external: EXTERNAL,
})
