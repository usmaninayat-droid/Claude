import { forwardRef, type HTMLAttributes, type KeyboardEvent, type ReactNode } from 'react'
import { cn } from '../lib/cn'
import { TrendIndicator } from '../primitives/TrendIndicator'

/**
 * KpiMetricCard — value-first KPI card: the big value leads, the label sits
 * under it, with an optional semantic accent bar and a delta/badge chip.
 * [L3 composite]
 *
 * Complements `KpiTile` (label-first, icon-chip anatomy) rather than forking
 * it: dashboards that read as a row of headline numbers (operations
 * cockpits, exec summaries) want the value dominant and the chrome minimal.
 * Module-agnostic: `value`, `label`, and `badge.label` are pre-formatted by
 * the caller (rule 8) — no numeric formatting or "good vs bad" logic lives
 * here; a KPI where "down" is good is still the caller's choice of tone.
 *
 * Container-friendly: the card is width-fluid (`min-w-0`), the value never
 * wraps or clips, and the badge truncates FIRST when space runs out —
 * consumers arrange the grid themselves (e.g. 6-up ≥1440, 3×2 below; UX
 * verdict D.14/15: at narrow columns the value always wins the width fight).
 * All cards share a uniform `min-h` so a row renders as one clean line.
 *
 * @usage-index kpi-metric-card
 */
export type KpiMetricCardTone = 'primary' | 'success' | 'warning' | 'danger' | 'info' | 'neutral'

/**
 * Badge tones: `up`/`down` render a real `TrendIndicator` (arrow + tinted
 * delta), `success`/`warning`/`neutral` render a tinted chip, `link` renders
 * link-toned text (the "View Details" affordance tone). All colors are dark
 * ramp steps (≥4.5:1 on the card surface), matching `TrendIndicator`.
 */
export type KpiMetricCardBadgeTone = 'up' | 'down' | 'success' | 'warning' | 'link' | 'neutral'

export interface KpiMetricCardBadge {
  /** Pre-formatted badge text, e.g. `"+12 vs Yest."` or `"View Details"`. */
  label: string
  /** Default `'neutral'`. */
  tone?: KpiMetricCardBadgeTone
}

/** Accent-bar fill per tone. Static lookup so Tailwind sees every class. */
const ACCENT_CLASSES: Record<KpiMetricCardTone, string> = {
  primary: 'bg-primary',
  success: 'bg-success',
  warning: 'bg-warning',
  danger: 'bg-destructive',
  info: 'bg-info',
  neutral: 'bg-muted-foreground',
}

/** Chip-style badge classes (the non-trend tones). Dark ramp steps for text. */
const BADGE_CHIP_CLASSES: Record<Exclude<KpiMetricCardBadgeTone, 'up' | 'down'>, string> = {
  success: 'rounded-xs bg-success/10 px-1.5 py-0.5 text-success-scale-700',
  warning: 'rounded-xs bg-warning/10 px-1.5 py-0.5 text-warning-scale-700',
  link: 'text-primary',
  neutral: 'rounded-xs bg-muted px-1.5 py-0.5 text-muted-foreground',
}

export interface KpiMetricCardProps extends Omit<HTMLAttributes<HTMLDivElement>, 'onClick'> {
  /** The big value. Pre-formatted by the caller (e.g. `"1,204"`, `"96%"`). */
  value: ReactNode
  /** Small label under the value. */
  label: ReactNode
  /**
   * Semantic accent: a start-edge color bar. Colour is never the only
   * encoding (V12) — pair it with a `badge` or label wording that carries the
   * same meaning in text. Omit for a neutral card with no bar.
   */
  accent?: KpiMetricCardTone
  /** Optional delta/affordance chip at the end of the value row. */
  badge?: KpiMetricCardBadge
  /** Makes the card a keyboard-operable button (role="button", Enter/Space activates `onClick`). */
  clickable?: boolean
  onClick?: () => void
}

export const KpiMetricCard = forwardRef<HTMLDivElement, KpiMetricCardProps>(
  ({ className, value, label, accent, badge, clickable = false, onClick, ...props }, ref) => {
    const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
      if (!clickable || !onClick) return
      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault()
        onClick()
      }
    }

    const badgeNode = badge ? (
      badge.tone === 'up' || badge.tone === 'down' ? (
        <span data-slot="kpi-metric-card-badge" data-tone={badge.tone} className="min-w-0 shrink">
          <TrendIndicator
            direction={badge.tone}
            value={badge.label}
            size="sm"
            className="max-w-full [&>bdi]:truncate"
          />
        </span>
      ) : (
        <span
          data-slot="kpi-metric-card-badge"
          data-tone={badge.tone ?? 'neutral'}
          className={cn(
            'min-w-0 shrink truncate text-body-xs font-medium',
            BADGE_CHIP_CLASSES[badge.tone ?? 'neutral'],
          )}
        >
          {badge.label}
        </span>
      )
    ) : null

    return (
      <div
        ref={ref}
        data-slot="kpi-metric-card"
        data-accent={accent}
        role={clickable ? 'button' : undefined}
        tabIndex={clickable ? 0 : undefined}
        onClick={clickable ? onClick : undefined}
        onKeyDown={handleKeyDown}
        className={cn(
          'relative flex min-h-16 min-w-0 flex-col justify-center gap-1 rounded-md border border-border bg-card p-4',
          accent && 'ps-5',
          clickable &&
            'cursor-pointer transition-shadow hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
          className,
        )}
        {...props}
      >
        {accent ? (
          <span
            aria-hidden
            data-slot="kpi-metric-card-accent"
            className={cn('absolute inset-y-3 start-0 w-1 rounded-e-full', ACCENT_CLASSES[accent])}
          />
        ) : null}
        <div className="flex min-w-0 items-baseline justify-between gap-2">
          {/* The value never wraps or truncates (UX D.15): the badge shrinks
              and truncates first, the value keeps its intrinsic width. */}
          <bdi
            data-slot="kpi-metric-card-value"
            className="whitespace-nowrap text-h4 font-bold leading-tight text-foreground"
          >
            {value}
          </bdi>
          {badgeNode}
        </div>
        <span
          data-slot="kpi-metric-card-label"
          className="truncate text-body-sm text-muted-foreground"
        >
          {label}
        </span>
      </div>
    )
  },
)

KpiMetricCard.displayName = 'KpiMetricCard'
