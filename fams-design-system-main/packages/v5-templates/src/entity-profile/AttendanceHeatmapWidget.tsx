import { useMemo, useState, type ReactNode } from 'react'
import { BarChart3, ChevronLeft, ChevronRight } from '@fams/ui-kit/icons'
import { ChartCard } from '@fams/ui-kit'
import type { EntityRecord } from '@fams/v5-composer'
import { cn } from '../lib/cn'

/**
 * AttendanceHeatmapWidget — Figma "Tadweer — Launch Pad" node 6545:15223.
 * A weekly-grid attendance heatmap over one of the record's own array
 * fields (e.g. `attendanceLog`). [tier-2 widget]
 *
 * Layout:
 *  - Card header (`ChartCard`): title + icon; the pagination pair
 *    ("Showing 1-30 out of 500") renders on the right — actions slot.
 *  - Legend row above the grid: one item per status token, dot + label +
 *    count of cells in that status.
 *  - Grid: 7 rows (SUN → SAT — same order as the Figma) × N week columns,
 *    each cell painted by its status token. Empty (no entry) cells use
 *    the neutral off-day tint.
 *
 * All strings are authored on `props` — statuses, tones, legend labels,
 * pagination copy — so a caller with a different lifecycle can reuse this
 * widget by pointing at their own fields (rule 10). State-agnostic (Rule
 * 8): rows and totals are derived from `record[rowsField]`; pagination is
 * local UI state that clamps to the number of full 4-week windows in the
 * row set.
 */

/** One status the heatmap recognises. */
export interface AttendanceHeatmapStatus {
  /** Value found in `row[statusKey]`. */
  key: string
  /** Legend label. */
  label: string
  /**
   * Tone hex applied to the cell fill and legend dot. Kept as a raw string so
   * a blueprint can point at any DS token hex without threading a new tone
   * enum through the widget contract.
   */
  color: string
}

export interface AttendanceHeatmapWidgetConfig {
  type: 'attendanceHeatmap'
  /** Column-slot placement — same contract as every other Overview widget. */
  column?: 'start' | 'end' | 'full'
  /** Card header title. */
  title?: ReactNode
  /** Optional named glyph for the header — resolved by the caller if needed; the widget itself defaults to a small bar-chart icon. */
  icon?: string
  /** Row array on the record. */
  rowsField: string
  /** Row key holding the date string (e.g. `"9 Sep, 2025"`). */
  dateKey?: string
  /** Row key holding the status token. */
  statusKey?: string
  /**
   * Statuses to render (order sets the legend order too). A row whose
   * `statusKey` is missing from this list still renders as an empty cell.
   */
  statuses: AttendanceHeatmapStatus[]
  /**
   * Window (in days) each pagination step reveals. Default `30` — matches
   * the Figma's "Showing 1-30 out of 500" copy.
   */
  windowDays?: number
  /** Total-rows override for the pagination copy — Default: derived from row count. */
  totalOverride?: number
  /** Pagination template — `{start}`, `{end}`, `{total}` interpolate. */
  paginationTemplate?: string
}

const DAY_LABELS = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT']

function parseDate(text: string): Date | null {
  // Accepts ISO (`2025-09-09`), the seed's `"9 Sep, 2025"`, or anything
  // `Date` itself understands. Falls back to `null` on unparseable input so
  // an unknown row is silently skipped rather than crashing the widget.
  if (!text) return null
  const d = new Date(text)
  if (!Number.isNaN(d.getTime())) return d
  const m = /^(\d{1,2})\s+([A-Za-z]{3,})[,]?\s+(\d{4})$/.exec(text)
  if (m) {
    const d2 = new Date(`${m[2]} ${m[1]}, ${m[3]}`)
    if (!Number.isNaN(d2.getTime())) return d2
  }
  return null
}

function fillTemplate(template: string, vars: Record<string, string | number>): string {
  return template.replace(/\{(\w+)\}/g, (_, k) => (vars[k] != null ? String(vars[k]) : ''))
}


export function AttendanceHeatmapWidget({
  widget,
  record,
}: {
  widget: AttendanceHeatmapWidgetConfig
  record?: EntityRecord
}) {
  const rows = useMemo(() => {
    const raw = record?.[widget.rowsField]
    return Array.isArray(raw) ? (raw as Record<string, unknown>[]) : []
  }, [record, widget.rowsField])

  const dateKey = widget.dateKey ?? 'date'
  const statusKey = widget.statusKey ?? 'status'
  const windowDays = widget.windowDays ?? 30

  // Rows normalised to {date, status} — reversed to chronological order so
  // pagination reads "1..N" left-to-right.
  const parsed = useMemo(() => {
    const out: { date: Date; status: string }[] = []
    for (const r of rows) {
      const text = String(r[dateKey] ?? '')
      const d = parseDate(text)
      if (!d) continue
      out.push({ date: d, status: String(r[statusKey] ?? '') })
    }
    out.sort((a, b) => a.date.getTime() - b.date.getTime())
    return out
  }, [rows, dateKey, statusKey])

  const pageCount = Math.max(1, Math.ceil(parsed.length / windowDays))
  const [page, setPage] = useState(0)
  const pageStart = page * windowDays
  const pageEnd = Math.min(pageStart + windowDays, parsed.length)
  const pageRows = parsed.slice(pageStart, pageEnd)
  const total = widget.totalOverride ?? parsed.length

  // Build a 7×N grid — one column per calendar week, rows keyed by day-of-week.
  const grid = useMemo(() => {
    if (pageRows.length === 0) return { weeks: [] as { key: string; days: (string | null)[] }[] }
    const first = pageRows[0].date
    const anchor = new Date(first)
    anchor.setDate(first.getDate() - first.getDay()) // Sunday of the first week
    const weeks: { key: string; days: (string | null)[] }[] = []
    const byDay = new Map<string, string>()
    for (const r of pageRows) byDay.set(r.date.toDateString(), r.status)
    const last = pageRows[pageRows.length - 1].date
    const cursor = new Date(anchor)
    while (cursor <= last) {
      const days: (string | null)[] = []
      for (let dow = 0; dow < 7; dow++) {
        const d = new Date(cursor)
        d.setDate(cursor.getDate() + dow)
        days.push(byDay.get(d.toDateString()) ?? null)
      }
      weeks.push({ key: cursor.toISOString(), days })
      cursor.setDate(cursor.getDate() + 7)
    }
    return { weeks }
  }, [pageRows])

  const counts = useMemo(() => {
    const c: Record<string, number> = {}
    for (const r of pageRows) c[r.status] = (c[r.status] ?? 0) + 1
    return c
  }, [pageRows])
  const toneByKey = useMemo(() => {
    const m: Record<string, string> = {}
    for (const s of widget.statuses) m[s.key] = s.color
    return m
  }, [widget.statuses])

  const paginationCopy = fillTemplate(
    widget.paginationTemplate ?? 'Showing {start}-{end} out of {total}',
    { start: pageStart + 1, end: pageEnd, total },
  )

  return (
    <ChartCard
      title={widget.title ?? 'Attendance'}
      icon={BarChart3}
      iconTone="success"
      bodyPadding="md"
      actions={
        <div className="flex items-center gap-1 text-body-sm text-muted-foreground">
          <button
            type="button"
            aria-label="Previous page"
            disabled={page === 0}
            onClick={() => setPage((p) => Math.max(0, p - 1))}
            className="grid size-6 place-items-center rounded-xs text-muted-foreground outline-none hover:bg-muted hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-default disabled:opacity-40"
          >
            <ChevronLeft className="size-4" />
          </button>
          <span>
            Showing <span className="font-semibold text-foreground">{pageStart + 1}-{pageEnd}</span> out of{' '}
            <span className="font-semibold text-foreground">{total}</span>
          </span>
          <button
            type="button"
            aria-label="Next page"
            disabled={page >= pageCount - 1}
            onClick={() => setPage((p) => Math.min(pageCount - 1, p + 1))}
            className="grid size-6 place-items-center rounded-xs text-muted-foreground outline-none hover:bg-muted hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-default disabled:opacity-40"
          >
            <ChevronRight className="size-4" />
          </button>
          <span className="sr-only">{paginationCopy}</span>
        </div>
      }
    >
      <div className="flex flex-col gap-3">
        <div className="flex flex-wrap items-center justify-end gap-4">
          {widget.statuses.map((s) => (
            <div key={s.key} className="flex items-center gap-2 text-body-sm text-foreground">
              <span
                aria-hidden="true"
                className="size-2.5 shrink-0 rounded-full"
                style={{ backgroundColor: s.color }}
              />
              <span className="font-medium">{s.label}</span>
              <span className="text-muted-foreground">({counts[s.key] ?? 0})</span>
            </div>
          ))}
        </div>
        <div className="grid grid-cols-[3rem_1fr] gap-2">
          <div className="flex flex-col justify-between gap-1 pb-6 pt-1 text-caption text-muted-foreground">
            {DAY_LABELS.map((d) => (
              <span key={d} className="h-6 leading-6">
                {d}
              </span>
            ))}
          </div>
          <div className="flex flex-col gap-1 rounded-sm border border-border p-2">
            <div
              className="grid gap-1"
              style={{
                gridTemplateColumns: `repeat(${Math.max(1, grid.weeks.length)}, minmax(0, 1fr))`,
                gridTemplateRows: 'repeat(7, minmax(0, 1.5rem))',
                gridAutoFlow: 'column',
              }}
            >
              {grid.weeks.length > 0 ? (
                grid.weeks.flatMap((w) =>
                  w.days.map((status, dow) => {
                    const color = status ? toneByKey[status] : null
                    return (
                      <div
                        key={`${w.key}-${dow}`}
                        className={cn(
                          'h-6 rounded-xs',
                          !color && 'bg-muted',
                        )}
                        style={color ? { backgroundColor: color } : undefined}
                        title={status ?? 'No data'}
                      />
                    )
                  }),
                )
              ) : (
                <div className="col-span-full py-8 text-center text-body-sm text-muted-foreground">
                  No attendance in this window.
                </div>
              )}
            </div>
            <p className="pt-1 text-center text-caption text-muted-foreground">Month</p>
          </div>
        </div>
      </div>
    </ChartCard>
  )
}

AttendanceHeatmapWidget.displayName = 'AttendanceHeatmapWidget'
