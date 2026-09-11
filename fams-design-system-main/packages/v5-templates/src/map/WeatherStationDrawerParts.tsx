import { DataTable, LineChart } from '@fams/ui-kit'
import type { DataTableColumn } from '@fams/ui-kit'
import { CloudOff } from '@fams/ui-kit/icons'
import { cn } from '../lib/cn'
import type {
  WeatherDailyRow,
  WeatherForecastRow,
  WeatherStationDatum,
  WeatherStationReading,
  WeatherTrendPoint,
} from './weather-types'

/**
 * WeatherStationDrawerParts — the station drawer's four content blocks
 * (22:38014 §2-§7), split out of `WeatherStationDrawer` to keep both files
 * inside the ~300-line budget (rule 12).
 *
 * Every block is a pure presenter over already-formatted application data:
 * nothing here fetches, converts units, or knows a locale (rule 8). A missing
 * field renders the em dash rather than a blank cell, so a non-reporting
 * station reads as "no data" instead of broken (UX-NOTES #6).
 */

/** The em dash every absent value renders as. */
export const NO_VALUE = '—'

function value(input: number | undefined, suffix: string, digits = 1): string {
  return typeof input === 'number' && isFinite(input) ? `${input.toFixed(digits)}${suffix}` : NO_VALUE
}

/** The eight label/value pairs of the current-conditions grid, in the
 *  designer's reading order (across, then down). */
export function currentConditionRows(reading: WeatherStationReading | undefined): Array<[string, string]> {
  const wind =
    reading?.windKmh != null && isFinite(reading.windKmh)
      ? `${reading.windKmh.toFixed(1)}${reading.windDirection ? ` ${reading.windDirection}` : ''}`
      : NO_VALUE
  return [
    ['Temp', value(reading?.tempC, ' °C', 2)],
    ['Humidity', value(reading?.humidityPct, '%')],
    ['Wind', wind],
    ['Gust', value(reading?.gustKmh, '')],
    ['Pressure', value(reading?.pressureHpa, ' hPa')],
    ['Visibility', value(reading?.visibilityKm, ' km', 2)],
    ['Rainfall', value(reading?.rainfallMm, ' mm', 0)],
    ['Reading', reading?.readingAt ?? NO_VALUE],
  ]
}

/**
 * §4's INACTIVE-station replacement (fix-wave — `WeatherStationDatum.active
 * === false`): one clear "no data" message in place of the 8-field readings
 * grid, rather than 8 individual em-dashes that read as a broken/loading
 * grid instead of a station genuinely not reporting. Same visual convention
 * `TableSection`'s own empty state uses (bordered card, muted body text), so
 * this doesn't invent a second empty-state language for one section.
 */
export function WeatherNoRecentDataNotice() {
  return (
    <div
      data-slot="weather-no-data"
      className="flex flex-col items-center gap-2 rounded-md border border-dashed border-border p-6 text-center"
    >
      <CloudOff aria-hidden="true" className="size-5 text-muted-foreground" />
      <p className="text-body-sm font-medium text-foreground">No recent data</p>
      <p className="text-body-xs text-muted-foreground">This station is not currently reporting readings.</p>
    </div>
  )
}

/** §4 — the 2-column current-conditions grid. */
export function WeatherConditionsGrid({ reading }: { reading?: WeatherStationReading }) {
  return (
    <dl data-slot="weather-conditions" className="grid grid-cols-2 gap-x-8 gap-y-3 text-body-sm">
      {currentConditionRows(reading).map(([label, text]) => (
        <div key={label} className="flex items-baseline justify-between gap-3">
          <dt className="text-muted-foreground">{label}</dt>
          <dd className="text-end font-medium text-foreground">{text}</dd>
        </div>
      ))}
    </dl>
  )
}

/**
 * The ECharts `markArea` that shades the hour the current reading was taken
 * (22:38014 §5's translucent band + dot). Pure and exported so the geometry
 * is unit-testable without an ECharts instance; returns null when the reading
 * time is not one of the plotted categories.
 */
export function nowBandMarkArea(categories: string[], nowLabel: string | undefined) {
  if (!nowLabel) return null
  const index = categories.indexOf(nowLabel)
  if (index < 0) return null
  return {
    silent: true,
    itemStyle: { color: 'var(--color-primary)', opacity: 0.12 },
    data: [[{ xAxis: categories[Math.max(0, index - 1)] }, { xAxis: categories[Math.min(categories.length - 1, index + 1)] }]],
  }
}

/**
 * §5 — the "Last 24 hours" trend.
 *
 * ONE series on ONE axis, by design: the raw prototype drew rainfall bars
 * against a second scale, the Figma iteration dropped them, and a dual-axis
 * chart is the single thing a line chart must never be. Temperature alone,
 * therefore no legend — the card's own title names the series.
 */
export function WeatherTrendChart({ trend, nowLabel }: { trend: WeatherTrendPoint[]; nowLabel?: string }) {
  const categories = trend.map((point) => point.time)
  const data = trend.map((point) => (typeof point.tempC === 'number' ? point.tempC : Number.NaN))
  const band = nowBandMarkArea(categories, nowLabel)
  return (
    <LineChart
      aria-label="Station temperature over the last 24 hours"
      categories={categories}
      series={[{ id: 'temp', label: 'Temperature', data, color: 'var(--color-primary)', unit: '°C' }]}
      legend={false}
      yAxisMin={0}
      yAxisMax={50}
      height={220}
      // SVG, not the canvas default: this plot is small, static and lives in
      // a scrolling panel, where crisp vector text beats a raster at any DPI
      // — and it keeps the chart inspectable in jsdom, so the axe sweep
      // actually covers it instead of skipping a canvas black box.
      renderer="svg"
      valueFormatter={(v) => `${v.toFixed(0)}°C`}
      onChartReady={(chart) => {
        if (!band) return
        // The band is the one piece of this chart `LineChart`'s props cannot
        // express. Merged onto the existing series rather than replacing the
        // option, so every axis/tooltip/theme decision above still holds.
        chart.setOption({ series: [{ id: 'temp', markArea: band }] })
      }}
    />
  )
}

const FORECAST_COLUMNS: DataTableColumn<WeatherForecastRow>[] = [
  { key: 'time', label: 'TIME' },
  { key: 'tempC', label: '°C', render: (row) => row.tempC.toFixed(2) },
  { key: 'precipitationMm', label: 'MM', render: (row) => row.precipitationMm.toFixed(2) },
  { key: 'precipitationChance', label: '%', render: (row) => String(row.precipitationChance) },
  { key: 'windKmh', label: 'KM/H', render: (row) => row.windKmh.toFixed(2) },
]

const DAILY_COLUMNS: DataTableColumn<WeatherDailyRow>[] = [
  { key: 'date', label: 'DATE' },
  { key: 'warning', label: 'WARNING' },
  {
    key: 'range',
    label: 'RANGE',
    sortAccessor: (row) => row.maxC,
    render: (row) => `${row.minC.toFixed(2)}–${row.maxC.toFixed(2)}°`,
  },
]

/** A titled block whose table scrolls inside its own bounded region — never
 *  the drawer's page scroll, never crushed columns (UX-NOTES #4). */
function TableSection<T>({
  title,
  columns,
  data,
  emptyText,
  getRowId,
  maxHeight,
}: {
  title: string
  columns: DataTableColumn<T>[]
  data: T[]
  emptyText: string
  getRowId: (row: T, index: number) => string
  maxHeight: string
}) {
  return (
    <section className="flex flex-col gap-2">
      <h3 className="text-caption text-muted-foreground">{title}</h3>
      {data.length === 0 ? (
        <p className="rounded-md border border-border p-4 text-body-sm text-muted-foreground">{emptyText}</p>
      ) : (
        <div className={cn('fams-scroll-region overflow-y-auto rounded-md border border-border')} style={{ maxBlockSize: maxHeight }}>
          <DataTable
            columns={columns}
            data={data}
            getRowId={getRowId}
            isCustomizable={false}
            defaultSort={null}
          />
        </div>
      )}
    </section>
  )
}

/** §6 — "Forecast — Open-Meteo", the hourly table. */
export function WeatherForecastTable({ rows }: { rows: WeatherForecastRow[] }) {
  return (
    <TableSection
      title="Forecast — Open-Meteo"
      columns={FORECAST_COLUMNS}
      data={rows}
      emptyText="No hourly forecast for this station."
      getRowId={(row) => row.time}
      maxHeight="22rem"
    />
  )
}

/** §7 — "QMD official — 10 day", the daily outlook table. */
export function WeatherDailyTable({ rows }: { rows: WeatherDailyRow[] }) {
  return (
    <TableSection
      title="QMD official — 10 day"
      columns={DAILY_COLUMNS}
      data={rows}
      emptyText="No official outlook for this station."
      getRowId={(row) => row.date}
      maxHeight="22rem"
    />
  )
}

/** The drawer's identity chips — the station's area and its coordinates. */
export function stationCoordinates(station: WeatherStationDatum): string {
  const [lng, lat] = station.position
  return `${lat.toFixed(3)} , ${lng.toFixed(3)}`
}
