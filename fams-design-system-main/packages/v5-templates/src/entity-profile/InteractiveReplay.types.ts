import type { ReactNode } from 'react'
import type { BadgeColorIndex } from '@fams/ui-kit'
import type { EntityRecord } from '@fams/v5-composer'
import type { LngLat } from '../map/MapPanel.types'
import type { LocationMapPin } from '../map/LocationMap'

/**
 * The `InteractiveReplay` CONFIG CONTRACT. [tier-2 pattern]
 *
 * Same field-key-indirection shape every other profile tab component in this
 * package uses (`OverviewWidgets`, `RecordTable`): a blueprint names WHICH
 * record fields carry the stats/timeline/route/pins, this component owns no
 * business vocabulary of its own (root `CLAUDE.md` rule 10) — a "replay" of a
 * tanker's trip today is the same shape as a replay of a driver's shift or a
 * forklift's shift tomorrow.
 */

/** One tinted stat chip in the top row (e.g. "Number of Events — 4"). */
export interface InteractiveReplayStat {
  /** Named leading glyph, resolved through `@fams/ui-kit/icons`' `getIcon`. */
  icon?: string
  label: ReactNode
  value: ReactNode
}

/**
 * One plotted series on the timeline chart — a field-key indirection into
 * every `InteractiveReplayPoint` row (`point[key]`), never a hardcoded metric
 * name (the frame's own series are Temperature/Speed/Average, but a caller
 * charting a different domain names its own keys).
 */
export interface InteractiveReplaySeries {
  /** Row key on each `InteractiveReplayPoint` this series reads. */
  key: string
  label: string
  /** Categorical swatch — cycles the `--color-chart-1..5` palette by index when omitted. */
  colorIndex?: BadgeColorIndex
  /** Raw color override, the same blueprint-driven escape hatch `AreaChartSeries.color` documents. */
  color?: string
  /** Dashed stroke (the frame's "Average" series) — shape carries identity, never color alone. */
  dashed?: boolean
}

/**
 * One row of the timeline — `time` is the category label; every other key is
 * whatever a `series[].key` names. `lat`/`lng` (optional) let a hovered/played
 * point be located on the map.
 */
export interface InteractiveReplayPoint {
  time: string
  lat?: number
  lng?: number
  address?: string
  /** Bearing in degrees (0-360), drawn as a rotated arrow next to the value
   *  in the status bar (v2 parity) when present. Omit entities that don't
   *  track heading (e.g. a stationary weather station). */
  heading?: number
  /** Ignition/power state at this point, rendered as an ON/OFF dot in the
   *  status bar when present. Generic — not specific to any one entity type. */
  ignitionOn?: boolean
  [seriesKey: string]: unknown
}

/**
 * One coloured event band over a index RANGE of the timeline (the frame's
 * red "Overspeeding" / blue "Idling" strips). Rendered as a labelled strip
 * BELOW the chart (never colour-alone — UX gate D4) rather than an
 * ECharts-internal overlay, so the same band list doubles as its own legend.
 */
export interface InteractiveReplayBand {
  id?: string
  /** Lookup key for grouping/legend de-duplication (e.g. `"overspeeding"`). */
  type: string
  label: string
  /** Inclusive index range into the timeline this band covers. */
  startIndex: number
  endIndex: number
  tone?: 'danger' | 'warning' | 'info' | 'neutral'
}

/** One decorative filter-row field (see the module doc — no wired behavior, same precedent `RecordTable`'s `timeframeSelect` documents). */
export interface InteractiveReplayFilterField {
  kind: 'dateRange' | 'multiSelect' | 'select'
  label: string
  /** Bold value line under `label` (the frame's "2 Events Selected") — omit to fall back to `label` alone. */
  value?: string
  /** Named leading glyph, resolved through `@fams/ui-kit/icons`' `getIcon`. Defaults per `kind` when omitted. */
  icon?: string
}

export interface InteractiveReplayProps {
  record?: EntityRecord
  /** `record[statsField]` — `InteractiveReplayStat[]`. Omit for no stat row. */
  statsField?: string
  /** `record[timelineField]` — `InteractiveReplayPoint[]`. Required — an absent/empty array is the EMPTY state. */
  timelineField: string
  /** Which series to plot from every timeline point. */
  series: InteractiveReplaySeries[]
  /** `record[bandsField]` — `InteractiveReplayBand[]`. Omit for no bands. */
  bandsField?: string
  /** `record[routeField]` — `[lng, lat][]`, the route polyline. */
  routeField?: string
  /** `record[pinsField]` — `LocationMapPin[]`, the coloured event dots. */
  pinsField?: string
  /** Decorative filter-row fields, rendered in order. */
  filters?: InteractiveReplayFilterField[]
  /** Shown in the map/chart area when the timeline is empty. */
  emptyText?: ReactNode
  emptyTitle?: ReactNode
  mapAriaLabel?: string
  chartAriaLabel?: string
  /** Timeline chart height in px. Default `220`. */
  height?: number
  /** `'canvas'` (default) or `'svg'` — forwarded to the timeline chart (e.g. `'svg'` in a jsdom/test render with no canvas). */
  chartRenderer?: 'canvas' | 'svg'
  className?: string
}

export type { LngLat, LocationMapPin }
