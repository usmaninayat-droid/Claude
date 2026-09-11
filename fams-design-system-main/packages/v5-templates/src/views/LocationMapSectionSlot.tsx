import { lazy, Suspense } from 'react'
import type { SectionComponentProps } from '../lib/section-components'

/**
 * `LocationMapSectionLazy` — the LAZY `LocationMapSection` renderer that
 * `TaskDetail.tsx` registers under the name `LocationMapSection`. [lazy-
 * weight boundary, see `map/index.ts`'s header]
 *
 * `LocationMap`/`LocationMapSection` (the real implementation) live under
 * `src/map/` — `@fams/v5-templates`'s SEPARATE `./map` build entry, so that
 * `maplibre-gl`/`react-map-gl`/`deck.gl`/`terra-draw` never reach a consumer
 * that only imports the light `.` barrel (`TaskDetail`'s own home). Every
 * blueprint gets the `LocationMapSection` name "for free" (the same zero-
 * app-code contract the field-level component registry already gives
 * `IconTextView`/`PersonView`) — the ONLY thing that keeps that safe is that
 * the map code itself is reached through a genuine runtime `import()`, not
 * a static one: nothing at THIS file's top level imports from `../map`, so
 * this file's own bytes (this tiny wrapper + a `Suspense` fallback) are all
 * a non-map consumer's bundle actually resolves. The `import('../map')`
 * call only executes the first time a blueprint's `profile.sections`
 * actually names `LocationMapSection` on a RENDERED record — i.e. the map
 * stack loads on demand, not at app boot.
 *
 * Exported as a plain component (not auto-registered here as a module-scope
 * side effect) for the same reason `section-renderers.tsx` isn't
 * self-registering either: this package builds with `"sideEffects": false`,
 * and a bare `import './LocationMapSectionSlot'` with no bindings is exactly
 * what esbuild elides under that flag (verified against a real `tsup`
 * build). `TaskDetail.tsx` imports this named export and calls
 * `registerSectionComponent('LocationMapSection', LocationMapSectionLazy)`
 * itself, which keeps the reference real.
 *
 * IMPORTANT — the dynamic import target below is the PACKAGE SPECIFIER
 * `@fams/v5-templates/map`, never a relative `../map`: verified by building
 * and grepping `dist/index.js`, a relative dynamic import gets INLINED
 * anyway (`tsup.config.ts`'s `splitting: false` has no shared-chunk
 * mechanism, so a same-build dynamic-import target — even one that's also a
 * configured `entry` — gets duplicated bytes-and-all into whichever entry
 * reaches it, `maplibre-gl` included). Only the package-specifier form,
 * paired with `@fams/v5-templates`/`@fams/v5-templates/map` in `tsup.config.
 * ts`'s `external` list, stays a genuine deferred `import(...)` in the
 * emitted code — resolved by the CONSUMING app's own bundler/Node via this
 * package's `exports` map (Node's "self-referencing a package by its own
 * name", no `node_modules` symlink back to itself required). Same fix
 * `creation-sheet/LocationPickerWidget.tsx` already applies for its own
 * lazy map load — see that file/`tsup.config.ts`'s header for the shared
 * empirical finding.
 */
const LazyLocationMapSection = lazy(() =>
  import('@fams/v5-templates/map').then((mod) => ({ default: mod.LocationMapSection })),
)

function LocationMapSectionFallback() {
  return (
    <div
      role="status"
      aria-label="Loading map"
      className="h-[23.375rem] w-full animate-pulse rounded-md bg-muted"
    />
  )
}

export function LocationMapSectionLazy(props: SectionComponentProps) {
  return (
    <Suspense fallback={<LocationMapSectionFallback />}>
      <LazyLocationMapSection {...props} />
    </Suspense>
  )
}
