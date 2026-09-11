import { defineConfig } from 'tsup'
import { EXTERNAL } from './tsup.shared'

/**
 * The LIGHT `.` entry (`src/index.ts`) — shells, blueprint templates, view
 * templates. See `tsup.map.config.ts`'s header for the full two-entry
 * rationale and why this file and that one must build as two SEPARATE,
 * SEQUENTIAL `tsup` invocations (`package.json`'s `build`/`dev` scripts),
 * never combined into one `defineConfig({entry: {...}})` call or one
 * `defineConfig([...])` array — both of those still let tsup's dts step
 * process the two entries CONCURRENTLY (verified empirically: an array
 * config prints both entries' "Building entry" lines in the same tick), a
 * genuine race against `src/index.ts`'s own lazy-`import('@fams/v5-
 * templates/map')` call sites (`views/LocationMapSectionSlot.tsx`,
 * `entity-profile/OverviewWidgets.tsx`, `creation-sheet/
 * LocationPickerWidget.tsx`), which need `dist/map/index.d.ts` to already
 * exist on disk for TypeScript to resolve that self-package-specifier's
 * declaration file. `clean: false` here is required — this entry must NOT
 * erase the `map/index` output `tsup.map.config.ts` just wrote.
 */
export default defineConfig({
  entry: { index: 'src/index.ts' },
  format: ['esm'],
  dts: true,
  sourcemap: true,
  clean: false,
  splitting: false,
  treeshake: true,
  minify: false,
  external: EXTERNAL,
})
