import { useCountUp } from './use-count-up'

/** Fixed card height, so a row of KPI cards lines up regardless of how long
 *  any single label or sub-line wraps. */
export const WALL_KPI_HEIGHT = 92

export interface WallKpiCardProps {
  label: string
  value: number
  /** Secondary line pinned to the bottom of the card (a delta, a breakdown). */
  sub: string
  /** Status dot colour — caller-owned semantics, same reasoning as
   *  `WallStatBar.color`. */
  color: string
  /** Count the value up on mount. Pass `!usePrefersReducedMotion()`. */
  animate: boolean
}

/**
 * WallKpiCard — a single headline metric on a wall display.
 *
 * The dark counterpart to `KpiMetricCard`/`KpiTile`: it paints on the
 * always-dark `--color-wall-*` scope and counts up on mount, which the light
 * cards deliberately do not do.
 */
export function WallKpiCard({ label, value, sub, color, animate }: WallKpiCardProps) {
  const shown = useCountUp(value, animate)
  return (
    <div
      data-slot="wall-kpi-card"
      className="flex min-w-0 flex-col rounded-xl border border-wall-panel-border bg-wall-panel px-4 py-3 shadow-wall-panel backdrop-blur-md"
      style={{ height: WALL_KPI_HEIGHT }}
    >
      <span
        className="truncate text-wall-label font-semibold uppercase tracking-[0.08em] text-wall-ink-dim"
        title={label}
      >
        {label}
      </span>
      <span className="mt-0.5 flex items-baseline gap-2">
        <span className="text-wall-metric font-semibold leading-none tabular-nums text-wall-ink">
          {shown}
        </span>
        <span
          className="size-2 rounded-full"
          style={{ background: color, boxShadow: `0 0 8px ${color}` }}
          aria-hidden
        />
      </span>
      <span className="mt-auto truncate text-wall-label text-wall-ink-faint" title={sub}>
        {sub}
      </span>
    </div>
  )
}
