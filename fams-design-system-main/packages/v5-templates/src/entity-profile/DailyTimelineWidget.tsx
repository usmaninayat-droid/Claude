import { Fragment, type CSSProperties } from 'react'
import { ChartCard, Tooltip, TooltipContent, TooltipTrigger } from '@fams/ui-kit'
import { cn } from '../lib/cn'
import type { EntityRecord } from '@fams/v5-composer'
import { readRows, resolveOptionalIcon } from './overview-widget-parts'
import type {
  OverviewDailyTimelineSegment,
  OverviewDailyTimelineWidget,
} from './OverviewWidgets.types'

/**
 * `dailyTimeline` — the Overview board's day-by-day activity track. [tier-2 internal]
 *
 * One ROW PER DAY: a weekday+date stub, a segmented horizontal track laid over
 * a FIXED clock window (`windowStart`/`windowEnd`, tick-labelled), then the
 * day's active/inactive/usage figures in words. Active segments carry the
 * tenant's `--color-primary`, inactive a warning tint, and an off day renders a
 * single muted "No planned shift" track.
 *
 * Not colour-only (dataviz + hard rule 5): every day states its active and
 * inactive minutes as TEXT in its own columns, the whole widget is a real
 * `<table>` with a header row, and each track cell additionally carries a
 * screen-reader summary of that day. Colour is redundant encoding, never the
 * only channel.
 *
 * RTL: the track is positioned with the LOGICAL `start-*` utility fed by a
 * per-block `--dt-at`/`--dt-size` custom property (a custom property rather
 * than an inline `inset-inline-start`, because jsdom drops the logical
 * longhands outright and the geometry would then be untestable), so in Arabic
 * the window mirrors — the earliest hour sits at the start edge, whichever side
 * that is.
 *
 * Segments: a row MAY carry `segments[]` (`{state, start, end}` clock times) and
 * that is the PREFERRED shape — the real intra-day on/off pattern. When it is
 * absent (the shape most seeds carry today), the row degrades to one active and
 * one inactive PROPORTIONAL block derived from its minute totals, laid out from
 * the window start; the totals are then exact and the placement indicative.
 */

/** `"HH:MM"` → minutes past midnight; `undefined` for anything unparseable. */
function parseClock(value: string | undefined): number | undefined {
  if (!value) return undefined
  const match = /^(\d{1,2}):(\d{2})$/.exec(value.trim())
  if (!match) return undefined
  const minutes = Number(match[1]) * 60 + Number(match[2])
  return Number.isFinite(minutes) ? minutes : undefined
}

/** Minutes past midnight → `"HH:MM"`, for the axis ticks. */
function formatClock(minutes: number): string {
  const hours = Math.floor(minutes / 60) % 24
  const rest = Math.round(minutes % 60)
  return `${String(hours).padStart(2, '0')}:${String(rest).padStart(2, '0')}`
}

/** A duration in minutes → the design's `"7h 36m"` / `"24m"` reading. */
function formatDuration(minutes: number): string {
  const total = Math.max(0, Math.round(minutes))
  const hours = Math.floor(total / 60)
  const rest = total % 60
  if (!hours) return `${rest}m`
  return `${hours}h ${String(rest).padStart(2, '0')}m`
}

const STATE_FILL: Record<'active' | 'inactive', string> = {
  active: 'bg-primary',
  inactive: 'bg-warning-scale-500',
}

function readNumber(row: Record<string, unknown>, key: string): number {
  const value = Number(row[key])
  return Number.isFinite(value) ? value : 0
}

interface TrackBlock {
  state: 'active' | 'inactive'
  /** Percent of the window. */
  offset: number
  size: number
  label: string
}

/**
 * The blocks one day's track renders — from `segments[]` when present, else
 * proportional active/inactive blocks from the minute totals.
 */
function buildBlocks(
  row: Record<string, unknown>,
  keys: { segments: string; active: string; inactive: string },
  windowStart: number,
  windowSpan: number,
): TrackBlock[] {
  const segments = Array.isArray(row[keys.segments])
    ? (row[keys.segments] as OverviewDailyTimelineSegment[])
    : undefined
  if (segments?.length) {
    return segments.flatMap((segment) => {
      const from = parseClock(segment.start)
      const to = parseClock(segment.end)
      if (from == null || to == null || to <= from) return []
      const state = segment.state === 'inactive' ? 'inactive' : 'active'
      return [
        {
          state,
          offset: ((from - windowStart) / windowSpan) * 100,
          size: ((to - from) / windowSpan) * 100,
          label: `${segment.start}–${segment.end} · ${formatDuration(to - from)}`,
        } satisfies TrackBlock,
      ]
    })
  }
  const active = readNumber(row, keys.active)
  const inactive = readNumber(row, keys.inactive)
  const blocks: TrackBlock[] = []
  let cursor = 0
  for (const [state, minutes] of [
    ['active', active],
    ['inactive', inactive],
  ] as const) {
    if (minutes <= 0) continue
    blocks.push({
      state,
      offset: (cursor / windowSpan) * 100,
      size: (minutes / windowSpan) * 100,
      label: formatDuration(minutes),
    })
    cursor += minutes
  }
  return blocks
}

export function DailyTimelineWidget({
  widget,
  record,
}: {
  widget: OverviewDailyTimelineWidget
  record: EntityRecord | undefined
}) {
  const rows = readRows(record, widget.rowsField)
  const startMinutes = parseClock(widget.windowStart) ?? 5 * 60
  const endMinutes = parseClock(widget.windowEnd) ?? 19 * 60
  const span = Math.max(endMinutes - startMinutes, 1)
  const step = Math.max(widget.tickStepHours ?? 2, 1) * 60

  const keys = {
    date: widget.dateKey ?? 'date',
    weekday: widget.weekdayKey ?? 'weekday',
    off: widget.offKey ?? 'isOff',
    active: widget.activeMinutesKey ?? 'activeMinutes',
    inactive: widget.inactiveMinutesKey ?? 'inactiveMinutes',
    usage: widget.usagePctKey ?? 'usagePct',
    segments: widget.segmentsKey ?? 'segments',
  }
  const strings = {
    day: 'Day',
    summary: 'Active · Inactive · Usage',
    active: 'Active',
    inactive: 'Inactive',
    off: 'No planned shift',
    empty: 'No activity recorded for this period.',
    ...widget.strings,
  }

  const ticks: number[] = []
  for (let at = startMinutes; at <= endMinutes; at += step) ticks.push(at)

  return (
    <ChartCard
      title={widget.title}
      subtitle={widget.subtitle}
      icon={resolveOptionalIcon(widget.icon)}
      data-slot="overview-daily-timeline"
      legend={
        <div className="flex flex-wrap items-center gap-4 text-caption text-muted-foreground">
          {(
            [
              [strings.active, 'bg-primary'],
              [strings.inactive, 'bg-warning-scale-500'],
              [strings.off, 'bg-muted'],
            ] as const
          ).map(([label, fill]) => (
            <span key={label} className="flex items-center gap-1.5">
              <span aria-hidden className={cn('size-2.5 rounded-xs', fill)} />
              {label}
            </span>
          ))}
        </div>
      }
    >
      {rows.length === 0 ? (
        <p className="text-body-sm text-muted-foreground">{strings.empty}</p>
      ) : (
        <table className="w-full border-collapse text-start">
          <caption className="sr-only">{typeof widget.title === 'string' ? widget.title : strings.day}</caption>
          <thead>
            <tr className="text-caption font-medium text-muted-foreground">
              <th scope="col" className="w-28 py-2 text-start font-medium">
                {strings.day}
              </th>
              <th scope="col" className="py-2 text-start font-medium">
                <div className="relative h-4">
                  {ticks.map((tick) => (
                    <span
                      key={tick}
                      className="absolute top-0 start-[var(--dt-at)] -translate-x-1/2 rtl:translate-x-1/2 tabular-nums"
                      style={{ '--dt-at': `${((tick - startMinutes) / span) * 100}%` } as CSSProperties}
                    >
                      {formatClock(tick)}
                    </span>
                  ))}
                </div>
              </th>
              <th scope="col" className="w-44 py-2 text-end font-medium">
                {strings.summary}
              </th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row, index) => {
              const isOff = Boolean(row[keys.off])
              const active = readNumber(row, keys.active)
              const inactive = readNumber(row, keys.inactive)
              const usage = row[keys.usage]
              const dayLabel = `${String(row[keys.weekday] ?? '')} ${String(row[keys.date] ?? '')}`.trim()
              const rowSummary = isOff
                ? `${dayLabel}: ${strings.off}`
                : `${dayLabel}: ${strings.active} ${formatDuration(active)}, ${strings.inactive} ${formatDuration(inactive)}${
                    usage == null ? '' : `, ${String(usage)}%`
                  }`
              return (
                <tr key={String(row[keys.date] ?? index)} className="border-t border-border align-middle">
                  <th scope="row" className="py-3 pe-3 text-start">
                    <span className="block text-body-sm font-semibold text-foreground">
                      {String(row[keys.date] ?? '—')}
                    </span>
                    <span className="block text-caption text-muted-foreground">
                      {String(row[keys.weekday] ?? '')}
                    </span>
                  </th>
                  <td className="py-3">
                    <span className="sr-only">{rowSummary}</span>
                    {isOff ? (
                      <div className="flex h-6 items-center justify-center rounded-xs bg-muted text-caption font-medium uppercase text-muted-foreground">
                        {strings.off}
                      </div>
                    ) : (
                      <div aria-hidden className="relative h-6 overflow-hidden rounded-xs bg-muted">
                        {buildBlocks(row, keys, startMinutes, span).map((block, blockIndex) => (
                          <Tooltip key={`${block.state}-${blockIndex}`}>
                            <TooltipTrigger asChild>
                              <div
                                className={cn(
                                  'absolute inset-y-0 start-[var(--dt-at)] w-[var(--dt-size)]',
                                  STATE_FILL[block.state],
                                )}
                                style={
                                  {
                                    '--dt-at': `${Math.max(0, Math.min(block.offset, 100))}%`,
                                    '--dt-size': `${Math.max(0, Math.min(block.size, 100))}%`,
                                  } as CSSProperties
                                }
                              />
                            </TooltipTrigger>
                            <TooltipContent>
                              {dayLabel} · {block.state === 'active' ? strings.active : strings.inactive} ·{' '}
                              {block.label}
                            </TooltipContent>
                          </Tooltip>
                        ))}
                      </div>
                    )}
                  </td>
                  <td className="py-3 ps-3 text-end text-body-sm tabular-nums">
                    {isOff ? (
                      <span className="text-muted-foreground">—</span>
                    ) : (
                      <Fragment>
                        <span className="font-semibold text-foreground">{formatDuration(active)}</span>
                        <span className="mx-1 text-muted-foreground">·</span>
                        <span className={cn(inactive > 0 ? 'text-warning-text' : 'text-muted-foreground')}>
                          {formatDuration(inactive)}
                        </span>
                        {usage == null ? null : (
                          <span className="ms-2 text-muted-foreground">{String(usage)}%</span>
                        )}
                      </Fragment>
                    )}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      )}
    </ChartCard>
  )
}
