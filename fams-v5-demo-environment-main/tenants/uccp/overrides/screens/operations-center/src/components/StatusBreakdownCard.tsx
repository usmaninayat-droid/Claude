import { Fragment, type ReactNode } from 'react'
import { ChevronDown } from 'lucide-react'

/**
 * StatusBreakdownCard — NEW local component (not in the design system).
 * Fleet Availability / Workforce Readiness panels: a row of labelled counts +
 * an overlapping-segment proportion bar. Ported from the prototype dashboard and
 * the Figma design (no DS equivalent for this specific widget).
 */
export type StatColumn = { label: string; value: string; color: string }
export type StatusBar = { color: string; width: number } // width = cumulative %

export type StatusBreakdownCardProps = {
  title: string
  icon?: ReactNode
  filterLabel: string
  /** Hide the trailing filter dropdown button — used when there's only one category to filter (e.g. a single-vehicle-type fleet). */
  hideFilter?: boolean
  stats: StatColumn[]
  bars: StatusBar[]
}

export function StatusBreakdownCard({ title, icon, filterLabel, hideFilter, stats, bars }: StatusBreakdownCardProps) {
  // widest behind (low z) → narrowest on top (high z) creates the segmented look
  const layered = [...bars].sort((a, b) => b.width - a.width)
  return (
    <div className="rounded-md border border-border bg-card">
      <div className="flex items-center gap-3 border-b border-border p-4">
        {icon ? (
          <span className="flex size-8 items-center justify-center rounded-md bg-muted text-muted-foreground">
            {icon}
          </span>
        ) : null}
        <h2 className="flex-1 text-lg font-semibold text-foreground">{title}</h2>
        {hideFilter ? null : (
          <button className="inline-flex h-8 items-center gap-2 rounded-md border border-border bg-card px-3 text-sm text-foreground outline-none transition-colors hover:bg-muted">
            {filterLabel}
            <ChevronDown className="size-4 text-muted-foreground" />
          </button>
        )}
      </div>

      <div className="flex flex-col gap-7 p-4">
        <div className="flex items-center">
          {stats.map((s, i) => (
            <Fragment key={s.label}>
              <div className="flex flex-1 flex-col items-center gap-1 text-center">
                <span className="text-sm font-medium text-muted-foreground">{s.label}</span>
                <span className="text-xl font-semibold tabular-nums" style={{ color: s.color }}>{s.value}</span>
              </div>
              {i < stats.length - 1 ? <span className="h-12 w-px shrink-0 bg-border" /> : null}
            </Fragment>
          ))}
        </div>

        <div className="relative h-3 rounded-full bg-[color:var(--muted-foreground)]">
          {layered.map((b, i) => (
            <div
              key={i}
              className="absolute left-0 top-0 h-full rounded-full"
              style={{ width: `${b.width}%`, background: b.color, zIndex: i + 1 }}
            />
          ))}
        </div>
      </div>
    </div>
  )
}
