import { useEffect, useRef, useState } from 'react'
import { Map as MapLibreMap, Marker, type MapLayerMouseEvent, type MapRef } from 'react-map-gl/maplibre'
import 'maplibre-gl/dist/maplibre-gl.css'
import { Checkbox } from '@fams/ui-kit'
import { MapPin } from '@fams/ui-kit/icons'
import { cn } from '../lib/cn'
import { DEFAULT_MAP_STYLE, DEFAULT_VIEW_STATE } from './constants'
import type { LngLat, LocationPickerRelatedPin } from './MapPanel.types'

export type { LocationPickerRelatedPin }

export interface LocationPickerMapProps {
  /** `[lng, lat]` — the currently-dropped pin, or `null` before the user has clicked. */
  value: LngLat | null
  onChange: (lngLat: LngLat) => void
  /** Initial camera when no `value` is set yet. Defaults to `MapPanel`'s `DEFAULT_VIEW_STATE`. */
  defaultCenter?: LngLat
  defaultZoom?: number
  styleUrl?: string
  disabled?: boolean
  /**
   * Let the operator DRAG the dropped pin to reposition it (fires `onChange`
   * on drag end, same seam a click already uses). Ignored while `disabled`.
   * Off by default so the original click-only picker is unchanged.
   */
  draggable?: boolean
  /**
   * Floating readout card in the map's bottom-start corner (MME/FRMS Figma
   * `cWjEbSNpZCC7tNhZc2CikU` · node 330-36347): a caption label over the
   * resolved place text (e.g. "Incident Location" / "West Bay, Doha").
   * Presentation-only (`pointer-events-none`) — omit to render no card.
   */
  locationCard?: { label: string; value: string }
  /**
   * Sibling records plotted around the picked pin — CONTEXT pins, never the
   * subject: rendered at 50% opacity behind a checkbox toggle labelled
   * `relatedPinsLabel`, hidden until the operator asks for them. An
   * empty/omitted list renders no pins AND no toggle, so the creation flow
   * (which passes none) is byte-identical to before.
   */
  relatedPins?: LocationPickerRelatedPin[]
  /** Label of the related-pins toggle. Default "Related records". */
  relatedPinsLabel?: string
  className?: string
  /** Accessible label for the map region (required — there is no visible heading). */
  'aria-label': string
}

/**
 * LocationPickerMap — the INTERACTIVE sibling of `LocationMap` (which is
 * read-only, per its own docstring: "a record detail page shows a location,
 * it does not edit a geofence"). figma-spec-create-sheet.md §2.11's
 * Location Details card: click anywhere to drop/move a single pin, with a
 * floating "Click anywhere on the map to drop a pin" chip (bg
 * `--color-primary`, per spec) shown until a pin exists.
 *
 * Three opt-in affordances layer on top of that base (all off by default, so
 * an existing caller renders unchanged) — MME/FRMS Figma
 * `cWjEbSNpZCC7tNhZc2CikU` nodes 328-36271 / 330-36347:
 *   · `draggable` — the dropped pin can be dragged to a new point;
 *   · `locationCard` — a floating bottom-start readout of the resolved place;
 *   · `relatedPins` — sibling records as 50%-opacity context pins behind a
 *     checkbox toggle.
 *
 * Deliberately NOT built on `MapPanel` — a single click-to-place marker
 * needs none of `MapPanel`'s clustering/heatmap/zone/draw machinery, so this
 * goes straight to `react-map-gl/maplibre`'s `<Map>`/`<Marker>` (already a
 * dependency of this `./map` entry) to keep this file, and its render cost,
 * minimal. Ships from the SAME `./map` build entry as `MapPanel`/
 * `LocationMap` for the identical lazy-weight reason (see `map/index.ts`'s
 * header) — never import this file from the main `.` barrel directly; the
 * "LocationPicker" edit widget (`creation-sheet/LocationPickerWidget.tsx`,
 * in the light entry) reaches it through a runtime `import('../map')`.
 */
export function LocationPickerMap({
  value,
  onChange,
  defaultCenter,
  defaultZoom,
  styleUrl = DEFAULT_MAP_STYLE,
  disabled = false,
  draggable = false,
  locationCard,
  relatedPins,
  relatedPinsLabel = 'Related records',
  className,
  'aria-label': ariaLabel,
}: LocationPickerMapProps) {
  const [showHint, setShowHint] = useState(value === null)
  const [showRelated, setShowRelated] = useState(false)
  const mapRef = useRef<MapRef>(null)
  const center = defaultCenter ?? [DEFAULT_VIEW_STATE.longitude, DEFAULT_VIEW_STATE.latitude]
  const zoom = defaultZoom ?? DEFAULT_VIEW_STATE.zoom

  // Follow camera-narrowing prop changes AFTER mount (a picker's context
  // fields — municipality, area — refine where the operator is looking).
  // `initialViewState` alone is mount-only, so ease to the new view here.
  const [lng, lat] = center
  useEffect(() => {
    mapRef.current?.easeTo({ center: [lng, lat], zoom, duration: 600 })
  }, [lng, lat, zoom])

  // Keep the pin in view when it is set programmatically (a search pick, a
  // typed coordinate) — a user's own click is already on screen, so the ease
  // is a no-op-sized pan there.
  const [pinLng, pinLat] = value ?? [undefined, undefined]
  useEffect(() => {
    if (pinLng != null && pinLat != null) mapRef.current?.easeTo({ center: [pinLng, pinLat], duration: 600 })
  }, [pinLng, pinLat])

  const handleClick = (e: MapLayerMouseEvent) => {
    if (disabled) return
    onChange([e.lngLat.lng, e.lngLat.lat])
    setShowHint(false)
  }

  return (
    <div data-slot="location-picker-map" className={cn('relative h-full w-full overflow-hidden', className)}>
      <MapLibreMap
        ref={mapRef}
        mapStyle={styleUrl}
        initialViewState={{ longitude: center[0], latitude: center[1], zoom }}
        onClick={handleClick}
        cursor={disabled ? 'default' : 'crosshair'}
        style={{ width: '100%', height: '100%' }}
        aria-label={ariaLabel}
      >
        {showRelated
          ? relatedPins?.map((pin) => (
              <Marker key={pin.id} longitude={pin.position[0]} latitude={pin.position[1]}>
                {/* 50% opacity by product ask — linked records are context, never the subject. */}
                <span title={pin.label} className="block opacity-50">
                  <MapPin className="size-6 fill-primary/30 text-primary" aria-hidden />
                </span>
              </Marker>
            ))
          : null}
        {value ? (
          <Marker
            longitude={value[0]}
            latitude={value[1]}
            color="var(--color-primary)"
            draggable={draggable && !disabled}
            onDragEnd={(e) => onChange([e.lngLat.lng, e.lngLat.lat])}
          />
        ) : null}
      </MapLibreMap>

      {relatedPins?.length ? (
        /* `before:-inset-2.5` grows the label's hit area to the 40px touch
           minimum without moving the chip — the same treatment
           `LocationMapSection`'s toggle carries. */
        <label
          data-slot="location-picker-related-toggle"
          className="absolute bottom-10 end-3 z-10 flex cursor-pointer items-center gap-2 rounded-sm border border-border bg-card px-2.5 py-1.5 text-caption font-semibold text-foreground shadow-elevation before:absolute before:-inset-2.5 before:content-['']"
        >
          <Checkbox
            checked={showRelated}
            onCheckedChange={(checked) => setShowRelated(checked === true)}
            aria-label={relatedPinsLabel}
          />
          {relatedPinsLabel}
        </label>
      ) : null}

      {locationCard ? (
        <div
          data-slot="location-picker-card"
          className="pointer-events-none absolute bottom-3 start-3 z-10 flex max-w-[min(16rem,calc(100%-1.5rem))] flex-col gap-1 rounded-sm border border-border bg-card px-3 py-2.5 shadow-elevation"
        >
          <span className="truncate text-caption font-semibold text-muted-foreground">{locationCard.label}</span>
          <span className="truncate text-caption font-semibold text-foreground">{locationCard.value}</span>
        </div>
      ) : null}

      {showHint ? (
        <div
          data-slot="location-picker-hint"
          role="status"
          className="pointer-events-none absolute inset-x-0 bottom-4 z-10 flex justify-center"
        >
          <span className="inline-flex items-center gap-1.5 rounded-full bg-primary px-3 py-1.5 text-body-sm font-medium text-primary-foreground shadow-elevation">
            <MapPin className="size-4" aria-hidden />
            Click anywhere on the map to drop a pin
          </span>
        </div>
      ) : null}
    </div>
  )
}

LocationPickerMap.displayName = 'LocationPickerMap'
