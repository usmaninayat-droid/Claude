/**
 * Shared `external` list for both `tsup.map.config.ts` (built first) and
 * `tsup.config.ts` (built second) — see `tsup.map.config.ts`'s header for
 * why the two entries are two separate, sequential tsup invocations rather
 * than one multi-entry config.
 *
 * The map stack (`maplibre-gl`/`react-map-gl`/`deck.gl`/`@deck.gl/mapbox`/
 * `terra-draw`/`terra-draw-maplibre-gl-adapter`/`supercluster`) is external,
 * same reasoning as `react`/`react-dom`: real, sizeable dependencies the
 * consumer's own bundler should resolve/dedupe from `node_modules`, not
 * bytes tsup inlines into `dist/map/index.js`.
 *
 * `@fams/v5-templates` itself is ALSO external, for a DIFFERENT reason: the
 * light `.` entry reaches the heavy `./map` entry through a runtime
 * `import('@fams/v5-templates/map')` (`React.lazy` call sites) rather than a
 * relative `import('../map')`. Verified by building and grepping the
 * output: a RELATIVE dynamic import gets inlined into `dist/index.js`
 * anyway — `splitting: false` means esbuild has no shared-chunk mechanism,
 * so a same-invocation dynamic import target (even one that's coincidentally
 * also a configured `entry`) gets duplicated bytes-and-all into whichever
 * entry reaches it, maplibre-gl included. Only a genuine PACKAGE-SPECIFIER
 * import esbuild is told never to resolve itself stays a real `import(...)`
 * in the emitted code, deferred to the CONSUMING app's bundler/Node — which
 * resolves it correctly via this package's own `exports` map (Node's
 * "self-referencing a package by its name" resolution, needing no
 * `node_modules` symlink back to itself).
 */
export const EXTERNAL = [
  'react',
  'react-dom',
  'react/jsx-runtime',
  'react/jsx-dev-runtime',
  'maplibre-gl',
  'react-map-gl',
  'react-map-gl/maplibre',
  'deck.gl',
  '@deck.gl/mapbox',
  'terra-draw',
  'terra-draw-maplibre-gl-adapter',
  'supercluster',
  '@fams/v5-templates',
  '@fams/v5-templates/map',
]
