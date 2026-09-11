import { lazy, Suspense, useCallback } from 'react'
import { MapPin } from '@fams/ui-kit/icons'
import { registerEditWidget, type EditWidget } from '@fams/v5-composer'
import type { LngLat } from '../map/MapPanel.types'

/**
 * LocationPicker — figma-spec-create-sheet.md §2.11's unified lat/long-input
 * + embedded map card. A field opts in via `component: { name:
 * 'LocationPicker', props: { defaultCenter?: [lng, lat], defaultZoom?: number } }`
 * on a `SmallText`-typed column; the stored value is a plain
 * `"lat, lng"` string (e.g. `"25.204800, 55.270800"`), parsed/serialized here.
 *
 * LAZY-WEIGHT BOUNDARY: this file lives in the light `.` barrel (so
 * `CreationSheet` can register it with zero app-side wiring), but the actual
 * `maplibre-gl` chain — `LocationPickerMap`, under `src/map/`, `@fams/v5-
 * templates`'s separate heavy build entry — is reached ONLY through a
 * runtime `import('@fams/v5-templates/map')` inside `React.lazy`, by
 * PACKAGE SPECIFIER rather than a relative `'../map'` path — see `tsup.
 * config.ts`'s header: a relative dynamic import gets inlined into
 * `dist/index.js` anyway under this build's `splitting: false`, verified by
 * building and grepping the output; the package-specifier form is marked
 * `external` in that same config, so it survives as a real, deferred
 * `import(...)` instead. `LngLat` above is a TYPE-ONLY import — erased at
 * compile time, so it contributes zero runtime bytes/imports to this file.
 */
const LazyLocationPickerMap = lazy(() =>
  import('@fams/v5-templates/map').then((mod) => ({ default: mod.LocationPickerMap })),
)

function parseLatLng(value: unknown): LngLat | null {
  const s = typeof value === 'string' ? value.trim() : ''
  if (!s) return null
  const parts = s.split(',').map((p) => Number(p.trim()))
  if (parts.length !== 2 || parts.some((n) => Number.isNaN(n))) return null
  const [lat, lng] = parts
  return [lng, lat]
}

function formatLatLng([lng, lat]: LngLat): string {
  return `${lat.toFixed(6)}, ${lng.toFixed(6)}`
}

function MapFallback() {
  return <div role="status" aria-label="Loading map" className="h-full w-full animate-pulse bg-muted" />
}

interface LocationPickerProps {
  defaultCenter?: LngLat
  defaultZoom?: number
}

export const LocationPickerWidget: EditWidget = ({ descriptor, value, onChange, disabled, id }) => {
  const point = parseLatLng(value)
  const props = (descriptor.component?.props ?? {}) as LocationPickerProps
  const handlePick = useCallback((lngLat: LngLat) => onChange(formatLatLng(lngLat)), [onChange])

  return (
    <div data-slot="location-picker-field" className="overflow-hidden rounded-sm border border-border">
      {/* `ring-inset` — the card wrapper is overflow-hidden, an outside ring
          would be clipped invisible (fix3 keyboard-focus visibility). */}
      <div className="flex items-center gap-2 border-b border-border p-3 has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-inset has-[:focus-visible]:ring-ring">
        <MapPin className="size-5 shrink-0 text-muted-foreground" aria-hidden />
        <input
          id={id}
          name={descriptor.col}
          value={value == null ? '' : String(value)}
          disabled={disabled}
          placeholder={descriptor.placeholder ?? 'Latitude, Longitude (e.g., 40.7128, -74.0060)'}
          onChange={(e) => onChange(e.target.value)}
          className="w-full min-w-0 border-0 bg-transparent p-0 text-sm font-semibold text-foreground outline-none placeholder:font-normal placeholder:text-muted-foreground"
        />
      </div>
      <div className="h-[30.375rem] w-full">
        <Suspense fallback={<MapFallback />}>
          <LazyLocationPickerMap
            value={point}
            onChange={handlePick}
            defaultCenter={props.defaultCenter}
            defaultZoom={props.defaultZoom}
            disabled={disabled}
            aria-label={descriptor.label}
          />
        </Suspense>
      </div>
    </div>
  )
}

/** Registers `LocationPicker`. Called explicitly by `CreationSheet.tsx` — never a bare side-effect import (see `widgets.tsx`'s file header for why that matters under this package's `"sideEffects": false`). */
export function registerLocationPickerWidget(): void {
  registerEditWidget('LocationPicker', LocationPickerWidget)
}
