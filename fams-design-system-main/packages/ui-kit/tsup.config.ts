import { defineConfig } from 'tsup'
import { getPublicEntries } from './scripts/entry-map.mjs'

export default defineConfig({
  // PD-363: multi-entry build so a consumer importing 5 components does not
  // ship radix-ui/@base-ui/react/cmdk/vaul/embla/react-day-picker/date-fns/
  // react-colorful/sonner/@atlaskit/pragmatic-drag-and-drop with them. The
  // entry map is generated FROM `src/index.ts` (see scripts/entry-map.mjs) —
  // one entry per barrel re-export, keyed by basename (all unique) — plus the
  // `index` barrel entry itself, which stays the complete, unchanged public
  // API for existing barrel-import consumers. `splitting: true` (new — was
  // `false` for the single-entry build) lets esbuild lift genuinely shared
  // code (cn/clsx/tailwind-merge, cva, chart-color, …) into shared chunks
  // instead of duplicating it into every one of the ~126 entry files.
  entry: getPublicEntries(),
  format: ['esm'],
  dts: true,
  sourcemap: true,
  clean: true,
  splitting: true,
  treeshake: true,
  minify: false,
  external: ['react', 'react-dom', 'react/jsx-runtime', 'react/jsx-dev-runtime'],
  // esbuild strips import attributes (`with { type: 'json' }`) on external
  // ESM specifiers, so a plain runtime `import … from '@fams/tokens/theme.echarts.json'`
  // fails under Node's strict ESM loader (ERR_IMPORT_ATTRIBUTE_MISSING) once
  // this ships as dist rather than raw src consumed by a bundler. Inline just
  // this one static JSON data file (not the rest of @fams/tokens, which stays
  // external) so the value is embedded as a plain object literal at build time
  // and no runtime JSON import remains.
  //
  // `@atlaskit/pragmatic-drag-and-drop*`'s subpath entry points (e.g.
  // `/element/adapter`) ship WITHOUT a root "exports" map — each subpath is a
  // real directory carrying its own tiny package.json with "main"/"module"
  // fields (a pre-"exports"-map convention bundlers like Vite/webpack resolve
  // fine, but Node's native ESM resolver and esbuild's default bundling
  // resolution do not, since neither reads a nested package.json this way).
  // Left as `external` (tsup's default for anything not explicitly listed),
  // these five subpaths pass through Kanban's build as bare, unresolved
  // `import` specifiers — which work under a bundler-backed dev server
  // (Vite/vitest) but throw `ERR_UNSUPPORTED_DIR_IMPORT` the moment plain
  // `node` (e.g. fams-v5-demo-environment's `tools/*.mjs` CLI scripts) loads this dist.
  // Forcing them `noExternal` makes tsup actually bundle the resolved file
  // (not just pass the specifier through), so the shipped dist is
  // self-contained and works under any runtime, not only a bundler's dev
  // server.
  noExternal: [/theme\.echarts\.json$/, /^@atlaskit\/pragmatic-drag-and-drop/],
})
