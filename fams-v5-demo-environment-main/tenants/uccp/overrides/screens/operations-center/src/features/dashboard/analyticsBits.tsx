import type { ReactNode } from 'react'

/**
 * Small shared pieces for the flood-analytics cards below the Live GIS Map.
 * The stat cell (bold number + accent rail + caption) is the rhythm already
 * used by Route Fulfillment and Tanker Fault & Repair — factored out here so
 * the new cards inherit it instead of re-implementing it a fourth time.
 */

export type CellAccent = 'success' | 'warning' | 'error' | 'info'

const ACCENT_COLOR: Record<CellAccent, string> = {
  success: 'var(--status-success)',
  warning: 'var(--status-warning)',
  error: 'var(--status-error)',
  info: 'var(--status-info)',
}

export function StatCell({
  value,
  total,
  label,
  accent,
}: {
  value: string
  total?: string
  label: string
  accent?: CellAccent
}) {
  return (
    <div className="relative overflow-hidden rounded-md border border-border px-3 py-2.5">
      {accent ? (
        <span className="absolute inset-y-0 left-0 w-1" style={{ background: ACCENT_COLOR[accent] }} />
      ) : null}
      <div className="text-xl font-bold tabular-nums text-foreground">
        {value}
        {total ? <span className="text-muted-foreground">/{total}</span> : null}
      </div>
      <div className="mt-0.5 text-xs text-muted-foreground">{label}</div>
    </div>
  )
}

/** Inline dot legend, matching the chart series colours. */
export function SeriesLegend({
  items,
}: {
  items: ReadonlyArray<{ name: string; color: string }>
}) {
  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5">
      {items.map((s) => (
        <span key={s.name} className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
          <span className="size-2 shrink-0 rounded-full" style={{ background: s.color }} />
          {s.name}
        </span>
      ))}
    </div>
  )
}

/**
 * One-line "so what" strip under a plot — the reading a dispatcher should take
 * away, so the chart is never left to speak for itself.
 */
export function InsightNote({ tone = 'warning', children }: { tone?: CellAccent; children: ReactNode }) {
  const color = ACCENT_COLOR[tone]
  return (
    <div
      className="rounded-md px-3 py-2 text-xs text-foreground"
      style={{ background: `color-mix(in srgb, ${color} 8%, transparent)` }}
    >
      <span className="mr-1.5 inline-block size-1.5 -translate-y-px rounded-full align-middle" style={{ background: color }} />
      {children}
    </div>
  )
}
