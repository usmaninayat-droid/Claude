import { DockedPanel, DockedPanelHeader } from '@fams/ui-kit'
import { MapPin } from '@fams/ui-kit/icons'
import type { WeatherStationDatum } from './weather-types'
import {
  WeatherConditionsGrid,
  WeatherDailyTable,
  WeatherForecastTable,
  WeatherNoRecentDataNotice,
  WeatherTrendChart,
  stationCoordinates,
} from './WeatherStationDrawerParts'

/**
 * WeatherStationDrawer — the clicked station's detail panel (19:27942 /
 * 22:38014): identity chips, name, current-conditions grid, 24h trend, and
 * the two forecast tables.
 *
 * DOCKED, not modal — built on the DS `DockedPanel` (ui-kit) rather than
 * hand-rolling its own `<aside>` + Escape wiring. `DetailSheet` (ui-kit) is
 * the repo's right-slide record surface and was the obvious base, but it is
 * a Radix `Sheet`: scrim, focus trap, click-outside-to-close. The design
 * shows this panel sitting BESIDE a still-live map, and the interaction spec
 * requires clicking a different marker to swap the panel's content in
 * place — both of which a modal forbids. `DockedPanel` is the generalized
 * form of the same plain-`<aside>`/Escape-only mechanism this component used
 * to hand-roll itself (see its own doc comment for why); this module now
 * supplies only its own content (identity chips, readings grid, chart,
 * tables) as the panel's children.
 *
 * State-agnostic (rule 8): open/close and which station is shown are the
 * caller's state; this renders what it is handed. Public API unchanged.
 */
export interface WeatherStationDrawerProps {
  /** The station to show. `null` renders nothing — the caller need not branch. */
  station: WeatherStationDatum | null
  onClose: () => void
  /** Panel width (CSS length). Defaults to the design's 550px. */
  width?: string
  className?: string
}

export function WeatherStationDrawer({ station, onClose, width = '34.375rem', className }: WeatherStationDrawerProps) {
  if (!station) return null

  // Inactive-station no-data mode (fix-wave, generic — see `weather-types.
  // ts`'s `WeatherStationDatum.active` doc): identity still renders below
  // regardless; only the data sections change. `undefined`/`true` is every
  // existing station, unchanged.
  const isActive = station.active !== false
  const trend = isActive ? (station.trend ?? []) : []
  const forecast = isActive ? (station.forecast ?? []) : []
  const daily = isActive ? (station.daily ?? []) : []
  return (
    <DockedPanel
      data-slot="weather-station-drawer"
      aria-label={`Weather station ${station.name}`}
      open
      onClose={onClose}
      width={width}
      className={className}
    >
      <DockedPanelHeader onClose={onClose} closeLabel={`Close ${station.name} details`} />

      <div className="fams-scroll-region flex min-h-0 flex-1 flex-col gap-6 overflow-y-auto p-6">
        <div className="flex flex-col gap-3">
          <div className="flex flex-wrap items-center gap-2">
            {station.area ? (
              <span className="inline-flex items-center gap-1 rounded-xs border border-border px-2 py-1 text-caption text-muted-foreground">
                <MapPin aria-hidden="true" className="size-3" />
                {station.area}
              </span>
            ) : null}
            <span className="inline-flex items-center gap-1 rounded-xs border border-border px-2 py-1 text-caption text-muted-foreground">
              <MapPin aria-hidden="true" className="size-3" />
              {stationCoordinates(station)}
            </span>
          </div>
          <h2 className="text-heading-sm font-semibold text-foreground">{station.name}</h2>
          {isActive ? <WeatherConditionsGrid reading={station.reading} /> : <WeatherNoRecentDataNotice />}
        </div>

        <section className="flex flex-col gap-3">
          <h3 className="text-body-sm font-semibold text-foreground">Trends &amp; Forecast</h3>
          <div className="rounded-md border border-border">
            <div className="flex items-center gap-2 border-b border-border px-4 py-3">
              <h4 className="text-body font-medium text-foreground">Last 24 hours</h4>
            </div>
            <div className="p-2">
              {trend.length === 0 ? (
                <p className="p-4 text-body-sm text-muted-foreground">No readings recorded in the last 24 hours.</p>
              ) : (
                <WeatherTrendChart trend={trend} nowLabel={trend[trend.length - 1]?.time} />
              )}
            </div>
          </div>
        </section>

        <WeatherForecastTable rows={forecast} />
        <WeatherDailyTable rows={daily} />
      </div>
    </DockedPanel>
  )
}

WeatherStationDrawer.displayName = 'WeatherStationDrawer'
