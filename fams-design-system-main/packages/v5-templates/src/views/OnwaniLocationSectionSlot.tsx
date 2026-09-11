import { lazy, Suspense } from 'react'
import type { SectionComponentProps } from '../lib/section-components'

/**
 * `OnwaniLocationSectionLazy` — the LAZY `OnwaniLocationSection` renderer that
 * `TaskDetail.tsx` registers under the name `OnwaniLocationSection`. [lazy-
 * weight boundary]
 *
 * Exactly the shape `LocationMapSectionSlot.tsx` establishes, and for the same
 * reason — read that file's header for the full empirical account of WHY the
 * dynamic-import target must be the package specifier `@fams/v5-templates/map`
 * and never a relative `../map`. In short: the real
 * `map/OnwaniLocationSection.tsx` reaches `maplibre-gl`/`react-map-gl` through
 * the picker widget's own map, so it lives in the SEPARATE `./map` build
 * entry; nothing at this file's top level imports from `../map`, so a consumer
 * of the light `.` barrel (which is `TaskDetail`'s home) resolves only this
 * wrapper and its fallback. The map stack loads the first time a blueprint
 * actually names `OnwaniLocationSection` on a rendered record.
 */
const LazyOnwaniLocationSection = lazy(() =>
  import('@fams/v5-templates/map').then((mod) => ({ default: mod.OnwaniLocationSection })),
)

function OnwaniLocationSectionFallback() {
  return (
    <div
      role="status"
      aria-label="Loading location picker"
      className="h-[23.375rem] w-full animate-pulse rounded-md bg-muted"
    />
  )
}

export function OnwaniLocationSectionLazy(props: SectionComponentProps) {
  return (
    <Suspense fallback={<OnwaniLocationSectionFallback />}>
      <LazyOnwaniLocationSection {...props} />
    </Suspense>
  )
}
