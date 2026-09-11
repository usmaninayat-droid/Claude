import { useState } from 'react'
import { MapPin } from '@fams/ui-kit/icons'
import { PoiMarker, poiCategoryArt } from '@fams/ui-kit'
import type { LngLat, MapZoneDatum } from './MapPanel.types'
import type { LivePoiDatum } from './live-types'

/**
 * PoiPin — a checked POI's map pin (figma live-monitoring spec §1.4):
 * a colored pin standing on the point, with a dark hover/focus tooltip
 * ("Lake View Tower … / Radius 43 meters"). Hover intent is reported out so
 * `LiveMapView` can draw the translucent radius circle on the map.
 *
 * DS category marker (2026-09-01): when `poi.category` resolves against
 * `@fams/ui-kit`'s `POI_CATEGORIES` (the `assets/icons/poi/*.svg` set), this
 * renders that category's teardrop marker via `PoiMarker` instead of the
 * generic tinted `MapPin` — same hover/focus tooltip contract either way. A
 * POI with no recognized category keeps the legacy generic-pin rendering so
 * existing blueprints without category data are unaffected.
 */
export interface PoiPinProps {
  poi: LivePoiDatum
  onHoverChange?: (hovered: boolean) => void
}

export function PoiPin({ poi, onHoverChange }: PoiPinProps) {
  const [hovered, setHovered] = useState(false)
  const setHover = (next: boolean) => {
    setHovered(next)
    onHoverChange?.(next)
  }

  if (poiCategoryArt(poi.category)) {
    return <PoiMarker poi={poi} onHoverChange={onHoverChange} />
  }

  return (
    <button
      type="button"
      data-slot="poi-pin"
      aria-label={`Point of interest ${poi.name}`}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      onFocus={() => setHover(true)}
      onBlur={() => setHover(false)}
      className="relative flex flex-col items-center outline-none focus-visible:ring-2 focus-visible:ring-ring"
    >
      {hovered ? (
        <span
          role="tooltip"
          className="absolute bottom-full mb-1 w-max max-w-56 rounded-xs bg-foreground/90 px-2 py-1 text-start text-caption text-background"
        >
          <span className="block truncate font-medium">{poi.name}</span>
          {poi.radiusMeters != null ? <span className="block opacity-80">Radius {poi.radiusMeters} meters</span> : null}
        </span>
      ) : null}
      <MapPin
        aria-hidden="true"
        className="size-7 drop-shadow-sm"
        fill={poi.color ?? 'var(--color-primary)'}
        stroke="var(--color-card)"
        strokeWidth={1.5}
      />
    </button>
  )
}

PoiPin.displayName = 'PoiPin'

const EARTH_RADIUS_M = 6371008.8

/**
 * The hovered POI's translucent radius circle, as a 48-segment `MapZoneDatum`
 * polygon (spec §1.4: hover shows the tooltip "plus a translucent radius
 * circle on the map"). Returns null for POIs without a radius.
 */
export function poiRadiusZone(poi: LivePoiDatum): MapZoneDatum | null {
  if (poi.radiusMeters == null || poi.radiusMeters <= 0) return null
  const [lng, lat] = poi.position
  const latRad = (lat * Math.PI) / 180
  const dLat = (poi.radiusMeters / EARTH_RADIUS_M) * (180 / Math.PI)
  const dLng = dLat / Math.max(Math.cos(latRad), 1e-6)
  const points: LngLat[] = []
  for (let i = 0; i < 48; i++) {
    const a = (i / 48) * 2 * Math.PI
    points.push([lng + dLng * Math.cos(a), lat + dLat * Math.sin(a)])
  }
  return {
    id: `poi-radius-${poi.id}`,
    points,
    color: poi.color ?? 'var(--color-primary)',
    fillOpacity: 0.15,
  }
}
