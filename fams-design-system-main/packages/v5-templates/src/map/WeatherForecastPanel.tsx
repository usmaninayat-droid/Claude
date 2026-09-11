import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { ChevronDown, ChevronUp, Play, Sun, X } from '@fams/ui-kit/icons'
import { Icon } from '@fams/ui-kit/icons'
import { cn } from '../lib/cn'
import type {
  WeatherDailyRow,
  WeatherForecastDay,
  WeatherForecastModelId,
  WeatherForecastPanelData,
  WeatherForecastRow,
} from './weather-types'
import { WEATHER_FORECAST_MODELS, WEATHER_FORECAST_MODEL_LABELS } from './weather-types'

/**
 * WeatherForecastPanel — the map's bottom forecast strip, adapted from the
 * fms-main reference's `WeatherForecastWidget` (Windy-style overlay) to this
 * DS's tokens and to the product decision of exactly TWO models:
 * "Open-Meteo" (hourly timeline) and "QMD" (Qatar Meteorology Department's
 * 10-day official outlook).
 *
 * Collapsed: ONLY two compact, content-sized floating pills — the
 * rain-intensity legend and the dark model-tab bar with its expand chevron —
 * sitting side by side, right-aligned over the map (clear of the control
 * column, same clearance discipline as `TrafficLegend`). No strip, no
 * container chrome, nothing else visible.
 * Expanded: a full-width timeline card on the map's bottom edge — row-label
 * rail on the left, horizontally scrolling day/hour columns in the middle, an
 * "About Location" rail on the right, and a play/replay time scrubber below.
 *
 * Purely presentational over caller-supplied `WeatherForecastPanelData`
 * (rule 8): the DS ships no weather readings and calls no weather service.
 * Mount inside a `relative` map container, as a sibling of the map canvas.
 */
export interface WeatherForecastPanelProps {
  data: WeatherForecastPanelData
  /**
   * Controlled expansion. Supply with `onExpandedChange` to own the state —
   * `LiveMapView` does, so a clicked map location can open the expanded view
   * with that location's data. Omit to run uncontrolled.
   */
  expanded?: boolean
  onExpandedChange?: (expanded: boolean) => void
  className?: string
}

/* ── tone helpers (data colour → status tokens, never raw hex) ───────────── */

function rainTone(mm: number): string | undefined {
  if (mm <= 0) return undefined
  if (mm < 2) return 'var(--color-info, var(--color-primary))'
  if (mm < 8) return 'var(--color-warning)'
  return 'var(--color-destructive)'
}

function windToneClass(kmh: number): string {
  if (kmh < 12) return 'bg-success'
  if (kmh < 27) return 'bg-warning'
  return 'bg-destructive'
}

/* ── rain-intensity legend (mm scale) ────────────────────────────────────── */

const LEGEND_STOPS = ['1.5', '2', '3', '7', '10', '20', '30']

function RainLegend({ className }: { className?: string }) {
  return (
    <div
      className={cn('flex h-6 items-center overflow-hidden rounded-md text-caption font-semibold text-white', className)}
      style={{
        background:
          'linear-gradient(90deg, var(--color-muted-foreground) 0%, var(--color-success) 30%, var(--color-warning) 62%, var(--color-destructive) 88%, var(--color-primary) 100%)',
      }}
      aria-label="Rain intensity legend (mm)"
    >
      <span className="px-2">mm</span>
      {/* Fixed min-width per stop (not flex-1) so the pill stays content-sized
          with even breathing room between numbers, whether it's sitting
          alone in the collapsed row or docked above the expanded panel. */}
      {LEGEND_STOPS.map((s) => (
        <span key={s} className="min-w-8 px-1 text-center">
          {s}
        </span>
      ))}
      <span className="w-1.5" aria-hidden />
    </div>
  )
}

/* ── model tab bar (dark pill) ───────────────────────────────────────────── */

function ModelTabs({
  model,
  onModel,
  expanded,
  onToggle,
}: {
  model: WeatherForecastModelId
  onModel: (m: WeatherForecastModelId) => void
  expanded: boolean
  onToggle: () => void
}) {
  return (
    <div className="flex items-center gap-1 rounded-lg bg-gray-900 px-1.5 py-1 text-white shadow-md">
      {WEATHER_FORECAST_MODELS.map((id) => (
        <button
          key={id}
          type="button"
          onClick={() => onModel(id)}
          aria-pressed={model === id}
          className={cn(
            'rounded-md px-2.5 py-1 text-caption font-semibold transition-colors focus-visible:ring-2 focus-visible:ring-ring',
            model === id ? 'bg-primary text-primary-foreground' : 'text-white/80 hover:bg-white/10 hover:text-white',
          )}
        >
          {WEATHER_FORECAST_MODEL_LABELS[id]}
        </button>
      ))}
      <span className="mx-1 h-4 w-px bg-white/20" aria-hidden />
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={expanded}
        aria-label={expanded ? 'Collapse forecast panel' : 'Expand forecast panel'}
        className="grid size-7 place-items-center rounded-md text-white/80 transition-colors hover:bg-white/10 hover:text-white focus-visible:ring-2 focus-visible:ring-ring"
      >
        {expanded ? <ChevronDown aria-hidden className="size-4" /> : <ChevronUp aria-hidden className="size-4" />}
      </button>
    </div>
  )
}

/* ── play / replay scrubber ──────────────────────────────────────────────── */

function useReplay(stepCount: number) {
  const [cursor, setCursor] = useState(-1) // -1 = idle, nothing highlighted
  const [playing, setPlaying] = useState(false)
  const timer = useRef<ReturnType<typeof setInterval> | null>(null)

  const stop = useCallback(() => {
    if (timer.current) clearInterval(timer.current)
    timer.current = null
    setPlaying(false)
  }, [])

  const play = useCallback(() => {
    stop()
    // Replay semantics: finished/idle restarts from 0; paused midway resumes.
    setCursor((c) => (c < 0 || c >= stepCount - 1 ? 0 : c))
    setPlaying(true)
    timer.current = setInterval(() => {
      setCursor((c) => {
        if (c >= stepCount - 1) {
          stop()
          return c
        }
        return c + 1
      })
    }, 450)
  }, [stepCount, stop])

  useEffect(() => stop, [stop]) // clear the interval on unmount
  useEffect(() => {
    setCursor(-1)
    stop()
  }, [stepCount, stop]) // a model switch resets the scrubber

  return { cursor, playing, toggle: () => (playing ? stop() : play()) }
}

function ReplayBar({
  cursor,
  playing,
  stepCount,
  onToggle,
}: {
  cursor: number
  playing: boolean
  stepCount: number
  onToggle: () => void
}) {
  const pct = stepCount <= 0 || cursor < 0 ? 0 : ((cursor + 1) / stepCount) * 100
  return (
    <div className="flex items-center gap-3 px-4 py-2.5">
      <button
        type="button"
        onClick={onToggle}
        aria-label={playing ? 'Pause forecast replay' : 'Play forecast replay'}
        className="grid size-8 shrink-0 place-items-center rounded-full border border-border bg-card text-foreground transition-colors hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring"
      >
        {playing ? (
          <span className="flex gap-0.5" aria-hidden>
            <span className="h-3 w-1 rounded-sm bg-foreground" />
            <span className="h-3 w-1 rounded-sm bg-foreground" />
          </span>
        ) : (
          <Play aria-hidden className="size-3.5" />
        )}
      </button>
      <div
        className="relative h-1.5 flex-1 overflow-hidden rounded-full bg-muted"
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={Math.round(pct)}
        aria-label="Forecast timeline"
      >
        <span
          className="absolute inset-y-0 left-0 rounded-full bg-primary motion-safe:transition-[width] motion-safe:duration-300"
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  )
}

/* ── expanded grids ──────────────────────────────────────────────────────── */

function RowLabel({ children, unit }: { children: ReactNode; unit?: string }) {
  return (
    <div className="flex h-8 items-center justify-between gap-2 pr-2 text-caption text-muted-foreground">
      <span className="truncate">{children}</span>
      {unit ? <span className="shrink-0 font-semibold">{unit}</span> : null}
    </div>
  )
}

/** Sky glyph from the row's own numbers (no separate condition field). */
function SkyGlyph({ hour }: { hour: WeatherForecastRow }) {
  if (hour.precipitationMm > 0 || hour.precipitationChance >= 40) {
    return <Icon name="cloud-raining-06" aria-hidden className="size-4 text-muted-foreground" />
  }
  return <Sun aria-hidden className="size-4 text-warning" />
}

/** Open-Meteo hourly timeline: day headers spanning their hour cells. */
function OpenMeteoGrid({ days, cursor }: { days: WeatherForecastDay[]; cursor: number }) {
  const flat = days.flatMap((d) => d.hours)
  const bounds: number[] = []
  let acc = 0
  for (const d of days) {
    acc += d.hours.length
    bounds.push(acc)
  }
  const rows: { key: string; render: (c: WeatherForecastRow) => ReactNode }[] = [
    { key: 'hours', render: (c) => <span className="text-caption text-muted-foreground">{c.time}</span> },
    { key: 'sky', render: (c) => <SkyGlyph hour={c} /> },
    { key: 'temp', render: (c) => <span className="text-caption font-semibold text-foreground">{Math.round(c.tempC)}°</span> },
    {
      key: 'rain',
      render: (c) => (
        <span className="text-caption font-semibold" style={{ color: rainTone(c.precipitationMm) ?? 'var(--color-muted-foreground)' }}>
          {c.precipitationMm > 0 ? c.precipitationMm : 0}
        </span>
      ),
    },
    {
      key: 'chance',
      render: (c) => (
        <span className={cn('text-caption', c.precipitationChance > 0 ? 'font-semibold text-foreground' : 'text-muted-foreground')}>
          {c.precipitationChance}
        </span>
      ),
    },
    {
      key: 'wind',
      render: (c) => (
        <span className={cn('flex h-3.5 w-9 items-center justify-center rounded-sm text-caption font-semibold text-white', windToneClass(c.windKmh))}>
          {Math.round(c.windKmh)}
        </span>
      ),
    },
  ]
  return (
    <div className="min-w-max" data-slot="weather-forecast-open-meteo">
      <div className="flex border-b border-border">
        {days.map((d) => (
          <div
            key={d.day}
            className="shrink-0 border-e border-border py-1.5 text-center text-caption font-semibold text-foreground"
            style={{ width: `${d.hours.length * 4}rem` }}
          >
            {d.day}
          </div>
        ))}
      </div>
      {rows.map((row) => (
        <div key={row.key} className="flex">
          {flat.map((c, i) => (
            <div
              key={i}
              className={cn(
                'flex h-8 shrink-0 items-center justify-center',
                bounds.includes(i + 1) && 'border-e border-border',
                i === cursor && 'bg-primary/10',
              )}
              style={{ width: '4rem' }}
            >
              {row.render(c)}
            </div>
          ))}
        </div>
      ))}
    </div>
  )
}

const OPEN_METEO_ROWS = [
  { label: 'Hours', unit: '' },
  { label: '', unit: '' },
  { label: 'Temperature', unit: '°C' },
  { label: 'Rain', unit: 'mm' },
  { label: 'Rain Chance', unit: '%' },
  { label: 'Wind', unit: 'km/h' },
]

/** QMD 10-day official outlook: one column per day. */
function QmdGrid({ days, cursor }: { days: WeatherDailyRow[]; cursor: number }) {
  const rows: { key: string; render: (d: WeatherDailyRow) => ReactNode }[] = [
    {
      key: 'outlook',
      render: (d) => (
        <span className={cn('text-caption font-semibold', /rain|storm|thunder/i.test(d.warning) ? 'text-destructive-emphasis' : 'text-foreground')}>
          {d.warning}
        </span>
      ),
    },
    {
      // QMD's official daily rainfall total (rain-first deployments, next to
      // min/max per the product spec) — same rain-tone colouring as the
      // Open-Meteo grid's Rain row, so a storm day reads consistently red
      // across both model tabs. `rainMm` is optional (older/base seeds): a
      // day without it falls back to the grid's own "no data" dash rather
      // than a misleading blank/zero.
      key: 'rain',
      render: (d) =>
        d.rainMm === undefined ? (
          <span className="text-caption text-muted-foreground">–</span>
        ) : (
          <span className="text-caption font-semibold" style={{ color: rainTone(d.rainMm) ?? 'var(--color-muted-foreground)' }}>
            {d.rainMm > 0 ? d.rainMm : 0}
          </span>
        ),
    },
    { key: 'min', render: (d) => <span className="text-caption text-foreground">{d.minC.toFixed(1)}°</span> },
    { key: 'max', render: (d) => <span className="text-caption font-semibold text-foreground">{d.maxC.toFixed(1)}°</span> },
    {
      key: 'range',
      render: (d) => (
        <span aria-hidden className="relative h-1.5 w-16 overflow-hidden rounded-full bg-muted">
          {/* min..max mapped onto a fixed 20-50°C domain — a comparative
              in-row spark, not an axis-true chart. */}
          <span
            className="absolute inset-y-0 rounded-full bg-primary"
            style={{
              insetInlineStart: `${Math.max(0, Math.min(100, ((d.minC - 20) / 30) * 100))}%`,
              inlineSize: `${Math.max(6, Math.min(100, ((d.maxC - d.minC) / 30) * 100))}%`,
            }}
          />
        </span>
      ),
    },
  ]
  return (
    <div className="min-w-max" data-slot="weather-forecast-qmd">
      <div className="flex border-b border-border">
        {days.map((d) => (
          <div key={d.date} className="shrink-0 border-e border-border py-1.5 text-center text-caption font-semibold text-foreground" style={{ width: '6.75rem' }}>
            {d.date}
          </div>
        ))}
      </div>
      {rows.map((row) => (
        <div key={row.key} className="flex">
          {days.map((d, i) => (
            <div
              key={d.date}
              className={cn('flex h-8 shrink-0 items-center justify-center border-e border-border', i === cursor && 'bg-primary/10')}
              style={{ width: '6.75rem' }}
            >
              {row.render(d)}
            </div>
          ))}
        </div>
      ))}
    </div>
  )
}

const QMD_ROWS = [
  { label: 'Official Outlook', unit: '' },
  { label: 'Rain', unit: 'mm' },
  { label: 'Min Temp', unit: '°C' },
  { label: 'Max Temp', unit: '°C' },
  { label: 'Range', unit: '' },
]

/* ── About Location rail ─────────────────────────────────────────────────── */

function AboutLocation({ data }: { data: WeatherForecastPanelData }) {
  const loc = data.location
  if (!loc) return null
  const rows: Array<[string, string | undefined]> = [
    ['', loc.coordinates],
    ['Sunrise', loc.sunrise],
    ['Sunset', loc.sunset],
    ['Elevation', loc.elevation],
  ]
  return (
    <div className="w-44 shrink-0 border-s border-border py-3 pl-4 pr-3">
      <div className="mb-2 text-body-sm font-semibold text-foreground">About Location</div>
      <div className="flex flex-col gap-1.5">
        <div className="text-caption font-medium text-foreground">{loc.label}</div>
        {rows.map(([label, value], i) =>
          value ? (
            <div key={i} className="text-caption text-muted-foreground">
              {label ? (
                <>
                  {label}: <span className="font-medium text-foreground">{value}</span>
                </>
              ) : (
                value
              )}
            </div>
          ) : null,
        )}
      </div>
    </div>
  )
}

/* ── the panel ───────────────────────────────────────────────────────────── */

export function WeatherForecastPanel({
  data,
  expanded: expandedProp,
  onExpandedChange,
  className,
}: WeatherForecastPanelProps) {
  const [expandedState, setExpandedState] = useState(false)
  const expanded = expandedProp !== undefined ? expandedProp : expandedState
  const setExpanded = (next: boolean) => {
    if (expandedProp === undefined) setExpandedState(next)
    onExpandedChange?.(next)
  }
  const [model, setModel] = useState<WeatherForecastModelId>('open-meteo')

  const days = data.openMeteo ?? []
  const qmd = data.qmd ?? []
  const isDaily = model === 'qmd'
  const stepCount = isDaily ? qmd.length : days.reduce((n, d) => n + d.hours.length, 0)
  const { cursor, playing, toggle } = useReplay(stepCount)

  const rows = isDaily ? QMD_ROWS : OPEN_METEO_ROWS
  const empty = isDaily ? qmd.length === 0 : days.length === 0

  const emptyBody = useMemo(
    () => (
      <p className="p-6 text-center text-body-sm text-muted-foreground">
        No {WEATHER_FORECAST_MODEL_LABELS[model]} forecast data for this area.
      </p>
    ),
    [model],
  )

  if (!expanded) {
    // Two content-sized pills only — no strip, no wrapper chrome. Each child
    // sizes to its own content because this row never forces a width on
    // them (no `w-*`/stretch), matching the expanded header's pill look.
    return (
      <div
        data-slot="weather-forecast-panel"
        className={cn('pointer-events-auto flex items-center justify-end gap-2', className)}
      >
        <RainLegend />
        <ModelTabs model={model} onModel={setModel} expanded={false} onToggle={() => setExpanded(true)} />
      </div>
    )
  }

  return (
    <div data-slot="weather-forecast-panel" className={cn('pointer-events-auto flex w-full flex-col gap-1.5', className)}>
      {/* legend + tabs float above the open panel, end-aligned */}
      <div className="flex items-end justify-end gap-2">
        <div className="w-64">
          <RainLegend />
        </div>
        <ModelTabs model={model} onModel={setModel} expanded onToggle={() => setExpanded(false)} />
      </div>

      <div className="overflow-hidden rounded-lg border border-border bg-card shadow-md">
        {empty ? (
          emptyBody
        ) : (
          <div className="flex">
            {/* row-label rail — the close button floats so the labels align 1:1
                with the grid rows */}
            <div className="relative w-40 shrink-0 border-e border-border py-1.5 pl-8 pr-1">
              <button
                type="button"
                aria-label="Close forecast panel"
                onClick={() => setExpanded(false)}
                className="absolute left-1 top-1.5 grid size-6 place-items-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring"
              >
                <X aria-hidden className="size-3.5" />
              </button>
              {/* spacer matching the grids' day-header row (py-1.5 + one
                  caption line) so the row labels align 1:1 with grid rows */}
              <div className="flex items-center py-1.5 text-caption font-semibold text-foreground" aria-hidden>
                {isDaily ? '10 Day Outlook' : ' '}
              </div>
              {rows.map((r, i) => (
                <RowLabel key={i} unit={r.unit}>
                  {r.label}
                </RowLabel>
              ))}
            </div>

            {/* timeline columns — scroll INSIDE the panel, never the page */}
            <div className="fams-scroll-region min-w-0 flex-1 overflow-x-auto py-1.5">
              {isDaily ? <QmdGrid days={qmd} cursor={cursor} /> : <OpenMeteoGrid days={days} cursor={cursor} />}
            </div>

            <AboutLocation data={data} />
          </div>
        )}

        {!empty && (
          <div className="border-t border-border">
            <ReplayBar cursor={cursor} playing={playing} stepCount={stepCount} onToggle={toggle} />
          </div>
        )}
      </div>
    </div>
  )
}

WeatherForecastPanel.displayName = 'WeatherForecastPanel'
