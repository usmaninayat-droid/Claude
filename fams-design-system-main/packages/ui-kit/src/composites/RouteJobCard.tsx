import { forwardRef, type HTMLAttributes, type KeyboardEvent, type ReactNode } from 'react'
import { cn } from '../lib/cn'
import { Progress } from '../primitives/Progress'
import { StatusPill, type StatusPillVariant } from './StatusPill'

/**
 * RouteJobCard — selectable queue card for job/route/work-item lists: title +
 * subtitle + status pill, a progress bar with planned/actual time labels,
 * optional meta chips and a risk banner. [L3 composite]
 *
 * Module-agnostic despite the name: every prop is generic (`title`,
 * `progressPct`, `plannedLabel`, …) and pre-formatted by the caller — no
 * time math, no domain vocabulary, no "route" fields. The status pill reuses
 * `StatusPill` (variant enum or blueprint-driven `color`), never a fork.
 *
 * Narrow-safe (UX verdicts E.19–20): the card is its own `@container` — below
 * the `@sm` container width the planned/actual labels STACK under the
 * progress bar instead of crushing on one line, and title-row content
 * truncates with the full text on `title` attributes rather than overflowing
 * horizontally. The progress % renders as text beside the bar, so colour or
 * length is never the sole carrier (MUST 29).
 *
 * @usage-index route-job-card
 */
export type RouteJobCardBannerTone = 'warning' | 'danger' | 'info'

export interface RouteJobCardStatus {
  /** Pre-formatted status text, e.g. `"Ongoing"`. */
  label: string
  /** One of `StatusPill`'s named variants. Omit when using `color`. */
  variant?: StatusPillVariant
  /** Blueprint-driven raw color escape hatch — threaded from data, never a literal here. */
  color?: string
  /** `StatusPill` appearance — `'tint'` for the WCAG-safe tinted chip. */
  appearance?: 'solid' | 'tint'
}

export interface RouteJobCardChip {
  /** Stable id for the React key. Falls back to index. */
  id?: string
  label: ReactNode
}

export interface RouteJobCardBanner {
  /** Default `'warning'`. */
  tone?: RouteJobCardBannerTone
  text: ReactNode
}

const BANNER_CLASSES: Record<RouteJobCardBannerTone, string> = {
  warning: 'border-warning/20 bg-warning/6 text-warning-scale-700',
  danger: 'border-destructive/20 bg-destructive/6 text-error-700',
  info: 'border-info/20 bg-info/6 text-info-scale-700',
}

export interface RouteJobCardProps
  extends Omit<HTMLAttributes<HTMLDivElement>, 'onClick' | 'title'> {
  /** Primary identity line, e.g. a job/route id or name. */
  title: ReactNode
  /** Secondary identity line, e.g. an asset plate or assignee name. */
  subtitle?: ReactNode
  /** Optional leading slot beside the title block (e.g. an `Avatar`). */
  leading?: ReactNode
  /** Status pill in the title row. */
  status?: RouteJobCardStatus
  /** Progress 0–100. Omit for a card with no progress row. */
  progressPct?: number
  /**
   * Text pairing for the bar (MUST 29). Defaults to `"<progressPct>%"`;
   * pass e.g. `"12/18 tasks · 66%"` for a richer reading.
   */
  progressLabel?: ReactNode
  /** Pre-formatted planned line, e.g. `"Planned 06:00 – 14:00"`. */
  plannedLabel?: ReactNode
  /** Pre-formatted actual line, e.g. `"Actual 06:12 · +12 min"`. */
  actualLabel?: ReactNode
  /**
   * Explicit deviation reading (e.g. `"Running 26 min late"`) — renders as
   * an emphasized warning-toned line in the times row so a delay is stated
   * in text, never implied by times alone.
   */
  deltaLabel?: ReactNode
  /**
   * Start-edge status accent bar color (blueprint-driven raw color threaded
   * from data, never a literal here). Omit for no accent bar.
   */
  accentColor?: string
  /** Small muted meta chips (tags, plan names, zones, …). */
  meta?: RouteJobCardChip[]
  /** Optional risk/notice line at the bottom of the card. */
  banner?: RouteJobCardBanner
  /** Selected state — visually distinct from hover (border + tint). */
  selected?: boolean
  /** Makes the whole card the click target (`role="button"`, Enter/Space). */
  onSelect?: () => void
}

export const RouteJobCard = forwardRef<HTMLDivElement, RouteJobCardProps>(
  (
    {
      className,
      title,
      subtitle,
      leading,
      status,
      progressPct,
      progressLabel,
      plannedLabel,
      actualLabel,
      deltaLabel,
      accentColor,
      meta,
      banner,
      selected = false,
      onSelect,
      ...props
    },
    ref,
  ) => {
    const clickable = Boolean(onSelect)
    const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
      if (!onSelect) return
      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault()
        onSelect()
      }
    }
    const hasProgress = typeof progressPct === 'number'
    const clampedPct = hasProgress ? Math.min(100, Math.max(0, progressPct)) : 0

    return (
      <div
        ref={ref}
        data-slot="route-job-card"
        data-selected={selected || undefined}
        role={clickable ? 'button' : undefined}
        tabIndex={clickable ? 0 : undefined}
        aria-pressed={clickable ? selected : undefined}
        onClick={onSelect}
        onKeyDown={handleKeyDown}
        className={cn(
          '@container/route-job-card relative flex min-h-16 min-w-0 flex-col gap-2 overflow-hidden rounded-md border bg-card p-3.5',
          accentColor && 'ps-4.5',
          selected ? 'border-primary bg-primary/5' : 'border-border',
          clickable &&
            'cursor-pointer transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
          clickable && !selected && 'hover:bg-muted/50',
          className,
        )}
        {...props}
      >
        {accentColor ? (
          <span
            aria-hidden
            data-slot="route-job-card-accent"
            className="absolute inset-y-0 start-0 w-1"
            // Blueprint-driven color threaded from data (statusList), never a literal.
            style={{ backgroundColor: accentColor }}
          />
        ) : null}
        <div className="flex min-w-0 items-center gap-2">
          {leading ? (
            <span data-slot="route-job-card-leading" className="shrink-0">
              {leading}
            </span>
          ) : null}
          <div className="flex min-w-0 flex-1 flex-col">
            <span
              data-slot="route-job-card-title"
              className="truncate text-body-sm font-semibold text-foreground"
            >
              {title}
            </span>
            {subtitle ? (
              <span
                data-slot="route-job-card-subtitle"
                className="truncate text-body-xs text-muted-foreground"
              >
                {subtitle}
              </span>
            ) : null}
          </div>
          {status ? (
            <StatusPill variant={status.variant} color={status.color} appearance={status.appearance} className="ms-auto">
              {status.label}
            </StatusPill>
          ) : null}
        </div>

        {hasProgress ? (
          <div data-slot="route-job-card-progress" className="flex items-center gap-2">
            <Progress
              value={clampedPct}
              size="sm"
              className="min-w-0 flex-1"
              aria-label={typeof progressLabel === 'string' ? progressLabel : 'Progress'}
            />
            <span className="shrink-0 text-body-xs font-medium text-muted-foreground">
              {progressLabel ?? `${clampedPct}%`}
            </span>
          </div>
        ) : null}

        {plannedLabel || actualLabel ? (
          /* Stacks by default; one row once the container passes @sm (E.19–20). */
          <div
            data-slot="route-job-card-times"
            className="flex flex-col gap-x-4 gap-y-0.5 text-body-xs text-muted-foreground @sm/route-job-card:flex-row @sm/route-job-card:flex-wrap"
          >
            {plannedLabel ? (
              <span data-slot="route-job-card-planned" className="truncate">
                {plannedLabel}
              </span>
            ) : null}
            {actualLabel ? (
              <span data-slot="route-job-card-actual" className="truncate">
                {actualLabel}
              </span>
            ) : null}
            {deltaLabel ? (
              <span data-slot="route-job-card-delta" className="truncate font-medium text-warning-scale-700">
                {deltaLabel}
              </span>
            ) : null}
          </div>
        ) : null}

        {meta && meta.length > 0 ? (
          <div data-slot="route-job-card-meta" className="flex flex-wrap gap-1">
            {meta.map((chip, index) => (
              <span
                key={chip.id ?? index}
                className="max-w-full truncate rounded-xs bg-muted px-1.5 py-0.5 text-body-xs text-muted-foreground"
              >
                {chip.label}
              </span>
            ))}
          </div>
        ) : null}

        {banner ? (
          <div
            data-slot="route-job-card-banner"
            data-tone={banner.tone ?? 'warning'}
            className={cn(
              'rounded-md border px-2 py-1 text-body-xs font-medium',
              BANNER_CLASSES[banner.tone ?? 'warning'],
            )}
          >
            {banner.text}
          </div>
        ) : null}
      </div>
    )
  },
)

RouteJobCard.displayName = 'RouteJobCard'
