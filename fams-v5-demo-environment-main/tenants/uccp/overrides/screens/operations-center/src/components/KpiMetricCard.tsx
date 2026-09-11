import type { ReactNode } from 'react'
import { ArrowDown, ArrowUp, ChevronRight } from 'lucide-react'
import { cn } from '@fams/design-system'

/**
 * KpiMetricCard — NEW local component (not in the design system).
 * The DS `KpiCard` is label-first; the Tadweer/UCCP cockpit design is
 * value-first with a colored left accent + a delta/badge, so this is a
 * bespoke addition.
 *
 * SEMANTIC COLOR RULE (2026-09-01 — one rule, applied to every card):
 *   critical (red)    — needs the dispatcher NOW (Delayed, Action Required)
 *   warning  (amber)  — at risk, watch it (Pending, low crew availability)
 *   healthy  (green)  — on track (Completed, healthy reporting rate/fleet)
 *   neutral  (muted)  — a pure count with no health meaning (Scheduled,
 *                       Dispatched, Ongoing, Monitored/Reporting stations)
 * Every card carries a rail so the rail is a constant, not a surprise; the
 * neutral rail is border-toned so the coloured ones actually pop. Primary
 * maroon is NEVER a state — it is reserved for actions and branding, which
 * is why "View Details" (an action) is the only maroon ink in the strip.
 *
 * DELTA CHIPS are coloured by whether the change is GOOD or BAD for
 * operations, not by its arithmetic direction: "+1 Delayed" is an up-arrow
 * in red; "+3 Scheduled" is an up-arrow in muted ink (more planned work is
 * neither good nor bad). A share/ratio readout (89%) is not a delta — it
 * gets its own quiet anatomy so health is not double-encoded against the
 * rail that already says it.
 */
export type KpiState = 'critical' | 'warning' | 'healthy' | 'neutral'

export type KpiDelta = {
  /** e.g. "3 vs Yest." — the sign is drawn as an arrow, not typed into the text. */
  text: string
  direction: 'up' | 'down'
  /** Is this movement good, bad, or meaningless for the dispatcher? */
  polarity: 'good' | 'bad' | 'neutral'
}

export type KpiMetricCardProps = {
  value: string
  label: string
  state?: KpiState
  /** Period-over-period change chip. */
  delta?: KpiDelta
  /** Share/ratio readout (e.g. "89%") — a value restatement, not a change. */
  share?: string
  /** Renders a maroon action affordance in the label row (actions only). */
  action?: string
  /** When provided, the card becomes interactive (opens the raw-data side sheet). */
  onClick?: () => void
}

const RAIL: Record<KpiState, string> = {
  critical: 'var(--status-error)',
  warning: 'var(--status-warning)',
  healthy: 'var(--status-success)',
  // Visible enough to read as "the rail is here and it is deliberately
  // quiet", subordinate enough that the three state colours still own the eye.
  neutral: 'color-mix(in srgb, var(--muted-foreground) 40%, transparent)',
}

const DELTA_CLASS: Record<KpiDelta['polarity'], string> = {
  good: 'text-[color:var(--status-success)]',
  bad: 'text-[color:var(--status-error)]',
  neutral: 'text-muted-foreground',
}

const POLARITY_HINT: Record<KpiDelta['polarity'], string> = {
  good: 'improving',
  bad: 'worsening',
  neutral: 'no health impact',
}

function renderValue(value: string): ReactNode {
  if (value.includes('/')) {
    const [head, tail] = value.split('/')
    return (
      <>
        {head}
        <span className="text-muted-foreground">/{tail}</span>
      </>
    )
  }
  return value
}

export function KpiMetricCard({
  value,
  label,
  state = 'neutral',
  delta,
  share,
  action,
  onClick,
}: KpiMetricCardProps) {
  const DeltaArrow = delta?.direction === 'down' ? ArrowDown : ArrowUp
  return (
    <div
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
      onClick={onClick}
      onKeyDown={
        onClick
          ? (e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault()
                onClick()
              }
            }
          : undefined
      }
      data-slot="kpi-metric-card"
      data-state={state}
      className={cn(
        'relative overflow-hidden rounded-md border border-border bg-card p-4',
        onClick &&
          'cursor-pointer outline-none transition-colors hover:border-primary/40 hover:bg-muted/40 focus-visible:ring-2 focus-visible:ring-ring',
      )}
    >
      <span
        aria-hidden
        className="absolute inset-y-0 left-0 w-1"
        style={{ background: RAIL[state] }}
      />
      <div className="flex items-start justify-between gap-2">
        <span className="text-xl font-semibold leading-none text-foreground tabular-nums">
          {renderValue(value)}
        </span>
        {delta ? (
          <span
            data-slot="kpi-delta"
            title={`${delta.direction === 'up' ? 'Up' : 'Down'} ${delta.text} — ${POLARITY_HINT[delta.polarity]}`}
            className={cn(
              'inline-flex shrink-0 items-center gap-0.5 whitespace-nowrap text-xs font-semibold tabular-nums',
              DELTA_CLASS[delta.polarity],
            )}
          >
            <DeltaArrow className="size-3" aria-hidden />
            {delta.text}
          </span>
        ) : share ? (
          <span
            data-slot="kpi-share"
            className="shrink-0 whitespace-nowrap text-xs font-medium tabular-nums text-muted-foreground"
          >
            {share}
          </span>
        ) : null}
      </div>
      <div className="mt-2 flex items-end justify-between gap-2">
        <span className="text-sm text-muted-foreground">{label}</span>
        {action ? (
          <span className="inline-flex shrink-0 items-center gap-0.5 whitespace-nowrap text-xs font-semibold text-primary">
            {action}
            <ChevronRight className="size-3.5" aria-hidden />
          </span>
        ) : null}
      </div>
    </div>
  )
}
