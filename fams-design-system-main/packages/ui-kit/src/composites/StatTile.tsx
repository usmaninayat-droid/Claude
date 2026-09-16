import { forwardRef, type HTMLAttributes, type ReactNode } from 'react'
import type { LucideIcon } from '../icons'
import { cn } from '../lib/cn'

/**
 * StatTile — a stat card with a coloured top accent border, an uppercase label
 * with an optional trailing icon chip, a large value, and a muted caption.
 * [L3 composite]
 *
 * The Tadweer "Deployment Dashboard" KPI/headcount tile (June Release): the
 * KPI strip uses the icon-bearing form, the headcount-breakdown panel uses the
 * icon-less form — one anatomy, so both read as the same object. Distinct from
 * `KpiTile` (icon-on-the-left disc, no accent border — the general dashboard
 * stat) — this is the accent-topped card the deployment surface draws.
 *
 * The accent bar and icon-chip tint are the SAME closed tone set the dashboard
 * charts use (semantic status plus the `lavender`/`yellow`/`dark` categorical
 * accents), driven by `tone` — never a raw hex (hard rule 2). State-agnostic
 * (rule 8): `value` and `caption` are pre-formatted by the caller.
 *
 * @usage-index stat-tile
 */
export type StatTileTone =
  | 'primary'
  | 'success'
  | 'warning'
  | 'danger'
  | 'info'
  | 'lavender'
  | 'yellow'
  | 'neutral'
  | 'dark'

/** Top accent bar fill per tone. Static lookup so Tailwind sees every class. */
const ACCENT_CLASSES: Record<StatTileTone, string> = {
  primary: 'bg-primary',
  success: 'bg-success',
  warning: 'bg-warning',
  danger: 'bg-destructive',
  info: 'bg-info',
  lavender: 'bg-accent-family-lavender-normal',
  yellow: 'bg-accent-family-yellow-normal',
  neutral: 'bg-gray-300',
  dark: 'bg-gray-700',
}

/** Icon-chip tint (low-opacity fill + solid ink) per tone. */
const ICON_CHIP_CLASSES: Record<StatTileTone, string> = {
  primary: 'bg-primary/10 text-primary',
  success: 'bg-success/10 text-success',
  warning: 'bg-warning/10 text-warning',
  danger: 'bg-destructive/10 text-destructive',
  info: 'bg-info/10 text-info',
  lavender: 'bg-accent-family-lavender-normal/10 text-accent-family-lavender-normal',
  yellow: 'bg-accent-family-yellow-normal/10 text-accent-family-yellow-dark',
  neutral: 'bg-muted text-muted-foreground',
  dark: 'bg-gray-700/10 text-gray-700',
}

export interface StatTileProps extends Omit<HTMLAttributes<HTMLDivElement>, 'title'> {
  /** Small uppercase label above the value. */
  label: ReactNode
  /** The big value. Pre-formatted by the caller (e.g. `"788"`, `"7:45 hrs"`). */
  value: ReactNode
  /** Muted supporting line under the value, e.g. `"Employee master · all statuses"`. */
  caption?: ReactNode
  /** Trailing icon, rendered in a tone-tinted rounded-square chip. Omit for the icon-less form. */
  icon?: LucideIcon
  /** Accent bar + icon-chip tone. Default `'neutral'`. */
  tone?: StatTileTone
}

export const StatTile = forwardRef<HTMLDivElement, StatTileProps>(
  ({ className, label, value, caption, icon: Icon, tone = 'neutral', ...props }, ref) => {
    return (
      <div
        ref={ref}
        data-slot="stat-tile"
        data-tone={tone}
        className={cn('flex min-w-0 flex-col overflow-hidden rounded-md border border-border bg-card', className)}
        {...props}
      >
        <span aria-hidden className={cn('h-[3px] w-full shrink-0', ACCENT_CLASSES[tone])} />
        <div className="flex min-w-0 flex-1 flex-col gap-2 p-4">
          <div className="flex min-w-0 items-start justify-between gap-2">
            <span
              data-slot="stat-tile-label"
              className="min-w-0 truncate text-body-xs font-semibold uppercase tracking-wide text-muted-foreground"
            >
              {label}
            </span>
            {Icon ? (
              <span
                aria-hidden
                data-slot="stat-tile-icon"
                className={cn(
                  'inline-flex size-8 shrink-0 items-center justify-center rounded-md [&_svg]:size-4 [&_svg]:shrink-0',
                  ICON_CHIP_CLASSES[tone],
                )}
              >
                <Icon />
              </span>
            ) : null}
          </div>
          {/* `<bdi>`: a stat value is a numeral that may carry a unit; an RTL
              line would otherwise reorder the pair. */}
          <bdi data-slot="stat-tile-value" className="text-h4 font-bold leading-tight text-foreground">
            {value}
          </bdi>
          {caption ? (
            <span data-slot="stat-tile-caption" className="text-body-xs leading-normal text-muted-foreground">
              {caption}
            </span>
          ) : null}
        </div>
      </div>
    )
  },
)

StatTile.displayName = 'StatTile'
