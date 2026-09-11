import { useState } from 'react'
import { cn } from '../lib/cn'
import type { WeatherStationDatum } from './weather-types'
import { stationRainMarkerLabel, stationRainMm, stationTempC } from './weather-types'
import { rainBand, stationRainBandColor } from './weather-color'

/**
 * WeatherStationMarker — one weather station on the live map (19:25255).
 *
 * A small circular chip carrying the station's CURRENT RAINFALL (mm) as text
 * (2026-08-31, UCCP Flood & Rain Water Management — a flood/rain system
 * leads with "how much is it raining here right now", not temperature),
 * filled by its rain band (`weather-color.ts`'s `rainBand`/`rainBandColor`,
 * the same green→orange→red→dark-red scale as the forecast panel's mm
 * legend pill). The NUMBER is the primary channel and the colour is the
 * redundant one, which is what keeps the scale colour-blind safe
 * (UX-NOTES #3) — a station with no reading shows the reference's "–" dash
 * on the muted grey fill, and `stationRainMarkerLabel` caps an off-scale
 * flood reading at "30+" rather than overflowing the capsule. Temperature
 * stays available inside the expanded forecast panel's rows, unchanged —
 * only the map marker's headline value moved to rain.
 *
 * Deliberately NOT a `VehicleMarker`/`ClusterBadge` sibling: these markers
 * never aggregate. A fixed ~40-station network at city zoom gains nothing
 * from clustering and the reference shows them overlapping unclustered near
 * Doha, so `LiveMapView` plots them through `MapPanel.pins` (which bypasses
 * the supercluster pipeline entirely) rather than `markers`.
 *
 * The band colour is a resolved literal reaching a DOM `background-color` —
 * business data flowing into a style, the same carve-out `MapLegend`'s
 * swatch documents, not a hardcoded design value.
 */
export interface WeatherStationMarkerProps {
  station: WeatherStationDatum
  /** Emphasises the marker whose drawer/expanded panel is open. */
  selected?: boolean
  /**
   * Selection-dimming (product requirement 2026-08-31): when a DIFFERENT
   * location is selected on the weather layer, every other station marker
   * renders at 40% opacity — a subtler, still-legible recession, not a
   * hide — so the map still reads as a whole while one location is in
   * focus. Same `dimmed`/`data-dimmed` contract as `VehicleMarker`'s
   * selection dimming, hover/focus still restore full strength since a
   * dimmed marker stays fully clickable, it is only visually recessed.
   * `LiveMapView` computes this — never true together with `selected`.
   */
  dimmed?: boolean
  onClick?: () => void
}

export function WeatherStationMarker({ station, selected, dimmed, onClick }: WeatherStationMarkerProps) {
  const [hovered, setHovered] = useState(false)
  const temp = stationTempC(station)
  const rainMm = stationRainMm(station)
  const band = rainBand(rainMm)
  const label = stationRainMarkerLabel(station)
  const reading = rainMm === undefined ? 'no reading' : `${stationRainMarkerLabel(station)} mm rain`

  return (
    <button
      type="button"
      data-slot="weather-station-marker"
      data-band={band}
      data-selected={selected ? '' : undefined}
      data-dimmed={dimmed && !selected ? '' : undefined}
      aria-label={`Weather station ${station.name}, ${reading}`}
      aria-pressed={selected ?? false}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onFocus={() => setHovered(true)}
      onBlur={() => setHovered(false)}
      onClick={onClick}
      className={cn(
        'relative flex flex-col items-center outline-none transition-opacity duration-fast',
        // Hover and focus always restore full strength — a dimmed marker
        // stays fully usable, it is only visually recessed.
        dimmed && !selected && 'opacity-40 hover:opacity-100 focus-visible:opacity-100',
      )}
    >
      {hovered ? (
        <span
          role="tooltip"
          className="pointer-events-none absolute bottom-full mb-1 w-max max-w-56 rounded-xs bg-foreground/90 px-2 py-1 text-start text-caption text-background"
        >
          <span className="block truncate font-medium">{station.name}</span>
          <span className="block opacity-80">{rainMm === undefined ? 'No reading' : `${stationRainMarkerLabel(station)} mm rain`}</span>
          <span className="block opacity-60">{temp === undefined ? 'No temp. reading' : `${temp.toFixed(1)}°C`}</span>
        </span>
      ) : null}
      <span
        aria-hidden="true"
        style={{ backgroundColor: stationRainBandColor(station) }}
        className={cn(
          'flex size-8 items-center justify-center rounded-full text-caption font-semibold text-primary-foreground shadow-sm',
          'ring-2 ring-card transition-transform duration-fast ease-standard',
          (hovered || selected) && 'scale-110',
          selected && 'ring-foreground',
        )}
      >
        {label}
      </span>
    </button>
  )
}

WeatherStationMarker.displayName = 'WeatherStationMarker'
