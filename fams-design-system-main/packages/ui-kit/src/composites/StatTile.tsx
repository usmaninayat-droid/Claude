import { forwardRef, type HTMLAttributes, type ReactNode } from 'react'
import type { LucideIcon } from '../icons'
import { cn } from '../lib/cn'

/**
 * StatTile — the compact "Metrics Card" (Tadweer June Release 2538:120579):
 * a 3px inline-start accent border, the VALUE first (20/26 semibold) with an
 * optional same-row trend (`+12 vs Yest.`) or denominator (`/292`), and the
 * label underneath (14/20 medium). [L3 composite]
 *
 * The accent is grey by default and takes a status tone only when the number
 * MEANS something (a delayed count in warning) — so a row of tiles reads as one
 * calm strip with the exception picked out, exactly as the design draws it.
 * Distinct from `KpiTile` (icon disc, label-first): this is the dense,
 * value-first card the deployment KPI strip and headcount breakdown use.
 *
 * State-agnostic (rule 8): `value`, `target`, `trend.value`, `caption` are
 * pre-formatted by the caller. Tones are the closed token set — never a hex.
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

/** Inline-start accent bar per tone. Static lookup so Tailwind sees every class. */
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

/** Trend ink — the design colours the delta by direction, never by tile tone. */
const TREND_INK: Record<'up' | 'down' | 'flat', string> = {
  up: 'text-success',
  down: 'text-destructive',
  flat: 'text-muted-foreground',
}

export interface StatTileTrend {
  /** Pre-formatted delta, e.g. `"+12"`. */
  value: ReactNode
  /** Comparison caption after the delta, e.g. `"vs Yest."`. */
  note?: ReactNode
  /** Colours the delta. Default `'up'`. */
  direction?: 'up' | 'down' | 'flat'
}

export interface StatTileProps extends Omit<HTMLAttributes<HTMLDivElement>, 'title'> {
  /** Label under the value. */
  label: ReactNode
  /** The big value. Pre-formatted by the caller (e.g. `"292"`, `"7:45 hrs"`). */
  value: ReactNode
  /** Denominator rendered right after the value as `/target` in muted 16px (`270/292`). */
  target?: ReactNode
  /** Same-row delta at the inline-end (`+12 vs Yest.`). Ignored when `target` is set — the design draws one or the other. */
  trend?: StatTileTrend
  /** Optional muted third line under the label. Omit for the two-line design form. */
  caption?: ReactNode
  /** Optional trailing glyph on the value row. Omit for the design's icon-less form. */
  icon?: LucideIcon
  /** Accent bar tone. Default `'neutral'` (grey) — reserve a status tone for the number that means something. */
  tone?: StatTileTone
}

export const StatTile = forwardRef<HTMLDivElement, StatTileProps>(
  ({ className, label, value, target, trend, caption, icon: Icon, tone = 'neutral', ...props }, ref) => {
    const showTrend = trend !== undefined && (target === undefined || target === null)
    return (
      <div
        ref={ref}
        data-slot="stat-tile"
        data-tone={tone}
        className={cn('relative flex min-w-0 flex-col overflow-hidden rounded-md border border-border bg-card', className)}
        {...props}
      >
        <span aria-hidden data-slot="stat-tile-accent" className={cn('absolute inset-y-0 start-0 w-[3px]', ACCENT_CLASSES[tone])} />
        <div className="flex min-w-0 flex-1 flex-col gap-1 py-3 pe-3 ps-[0.875rem]">
          <div className="flex min-w-0 items-center justify-between gap-2">
            {/* `<bdi>`: a numeral plus a qualifier — bidi isolation keeps the pair in order on an RTL line. */}
            <bdi data-slot="stat-tile-value" className="min-w-0 truncate text-h6 font-semibold leading-[1.3] text-gray-800">
              {value}
              {target !== undefined && target !== null ? (
                <span data-slot="stat-tile-target" className="text-body-md font-semibold leading-6 text-muted-foreground">
                  /{target}
                </span>
              ) : null}
            </bdi>
            {showTrend ? (
              <span data-slot="stat-tile-trend" className="flex shrink-0 items-center gap-1 whitespace-nowrap">
                <bdi className={cn('text-body-xs font-semibold leading-[14px]', TREND_INK[trend.direction ?? 'up'])}>{trend.value}</bdi>
                {trend.note ? <span className="text-body-xs font-medium leading-[18px] text-gray-600">{trend.note}</span> : null}
              </span>
            ) : Icon ? (
              <Icon aria-hidden data-slot="stat-tile-icon" className="size-4 shrink-0 text-muted-foreground" />
            ) : null}
          </div>
          <span data-slot="stat-tile-label" className="min-w-0 truncate text-body-sm font-medium leading-5 text-gray-600">
            {label}
          </span>
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
