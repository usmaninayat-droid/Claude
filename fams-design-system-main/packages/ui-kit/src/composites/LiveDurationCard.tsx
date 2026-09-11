import { forwardRef, useEffect, useState, type HTMLAttributes, type ReactNode } from 'react'
import { Clock } from '../icons'
import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '../lib/cn'
import { Progress } from '../primitives/Progress'

/**
 * LiveDurationCard — a self-ticking duration display with three modes
 * derived from which of `expectedEnd` / `end` are set. [L3 composite]
 *
 * - `end` set                     → **completed**: static total, no ticking.
 * - `expectedEnd` set (no `end`)  → **tracking**: live counter + `Progress`
 *   bar against the expected duration. The instant elapsed time passes
 *   `expectedEnd`, the dot/label/overage line switch to the danger tone —
 *   the `Progress` fill itself stays single-tone (clamped 0-100); "danger"
 *   is conveyed by the surrounding chrome, not by re-coloring the primitive.
 * - neither set                   → **open-ended**: live counter, no bar,
 *   no over/under judgment (there is nothing to be over).
 *
 * Generalizes the reference's two duplicate widgets (a roomy card and a
 * compact single-line badge) into ONE component — `size="sm"` IS the
 * former badge: identical mode/tick logic, a denser inline presentation
 * with no `Progress` bar (there's no room for one at that density).
 *
 * Fully state-agnostic (Rule 8): ticks its own clock via `setInterval`
 * (cleaned up on unmount/mode change) but holds no business data — `start`
 * /`expectedEnd`/`end` and every label are props. Nothing here is called
 * "downtime": pass whatever `completedLabel`/`trackingLabel`/`openEndedLabel`
 * fits the caller's domain (SLA countdown, shift duration, maintenance
 * window, call duration, …).
 *
 * @usage-v5
 *   Consolidates 3 hand-rolled elapsed/expected timers in v5:
 *   - iwmp/components/ticketing/IWMPSLACountdown.vue — live per-second countdown
 *     to a deadline, color flips once crossed (our tracking mode, inverted)
 *   - iwmp/components/cards/ContractCard.vue — elapsed/total % bar + `isExpired`,
 *     static, hand-rolled `<div>` bar
 *   - shared/components/preventiveMaintenance/ProgressIndicator.vue — elapsed-days
 *     bar, hardcoded hex per threshold
 *   Forms needed: live vs. static, danger-past-threshold, compact single-line.
 * @usage-index live-duration-card
 */

export type LiveDurationCardMode = 'completed' | 'tracking' | 'open-ended'

const containerVariants = cva('inline-flex rounded-md transition-colors', {
  variants: {
    size: {
      sm: 'w-full items-center gap-1.5 rounded-sm px-2 py-1',
      md: 'w-full items-start gap-3 px-4 py-3',
    },
    tone: {
      neutral: 'bg-muted',
      accent: 'bg-primary/5',
      danger: 'bg-destructive/5',
    },
  },
  defaultVariants: { size: 'md', tone: 'neutral' },
})

export interface LiveDurationCardProps
  extends Omit<HTMLAttributes<HTMLDivElement>, 'children'>,
    Pick<VariantProps<typeof containerVariants>, 'size'> {
  /** Duration start. */
  start: Date | string
  /** Planned end — enables `tracking` mode (live counter + `Progress` bar vs. this). Ignored once `end` is set. */
  expectedEnd?: Date | string
  /** Actual end — enables `completed` mode (static total, no ticking). Takes priority over `expectedEnd`. */
  end?: Date | string
  /** Header label for the `completed` mode. */
  completedLabel?: ReactNode
  /** Header label for the `tracking` mode. */
  trackingLabel?: ReactNode
  /** Header label for the `open-ended` mode. */
  openEndedLabel?: ReactNode
  /** Inline label prefixing the expected total in `tracking` mode. */
  expectedLabel?: ReactNode
  /** Label prefixing the overage line once `tracking` mode passes `expectedEnd`. */
  overLabel?: ReactNode
  /** Leading icon/dot slot, overriding the mode default. Pass `null` to omit it entirely. */
  icon?: ReactNode
}

const toDate = (d: Date | string) => (d instanceof Date ? d : new Date(d))

function formatDuration(ms: number, withSeconds = false): string {
  const s = Math.max(0, Math.floor(ms / 1000))
  const d = Math.floor(s / 86400)
  const h = Math.floor((s % 86400) / 3600)
  const m = Math.floor((s % 3600) / 60)
  const sec = s % 60
  const parts: string[] = []
  if (d) parts.push(`${d}d`)
  if (d || h) parts.push(`${h}h`)
  parts.push(`${m}m`)
  if (withSeconds) parts.push(`${sec}s`)
  return parts.join(' ')
}

export const LiveDurationCard = forwardRef<HTMLDivElement, LiveDurationCardProps>(
  (
    {
      className,
      start,
      expectedEnd,
      end,
      size = 'md',
      completedLabel = 'Total duration',
      trackingLabel = 'In progress',
      openEndedLabel = 'Elapsed',
      expectedLabel = 'expected',
      overLabel = 'Over expected by',
      icon,
      ...props
    },
    ref,
  ) => {
    const startD = toDate(start)
    const endD = end ? toDate(end) : undefined
    const expectedD = expectedEnd ? toDate(expectedEnd) : undefined
    const mode: LiveDurationCardMode = endD ? 'completed' : expectedD ? 'tracking' : 'open-ended'

    const [now, setNow] = useState(() => new Date())
    useEffect(() => {
      if (mode === 'completed') return
      const id = setInterval(() => setNow(new Date()), 1000)
      return () => clearInterval(id)
    }, [mode])

    let tone: NonNullable<VariantProps<typeof containerVariants>['tone']> = 'neutral'
    let headerLabel: ReactNode = completedLabel
    let valueText: string
    let expectedMs = 0
    let elapsedMs = 0
    let pct = 0
    let over = false

    if (mode === 'completed' && endD) {
      valueText = formatDuration(endD.getTime() - startD.getTime())
    } else if (mode === 'tracking' && expectedD) {
      elapsedMs = now.getTime() - startD.getTime()
      expectedMs = expectedD.getTime() - startD.getTime()
      over = elapsedMs > expectedMs
      pct = Math.min(100, Math.max(0, (elapsedMs / Math.max(1, expectedMs)) * 100))
      tone = over ? 'danger' : 'accent'
      headerLabel = trackingLabel
      valueText = formatDuration(elapsedMs, true)
    } else {
      elapsedMs = now.getTime() - startD.getTime()
      tone = 'accent'
      headerLabel = openEndedLabel
      valueText = formatDuration(elapsedMs, true)
    }

    const defaultIcon =
      mode === 'completed' ? (
        <Clock className={cn(size === 'sm' ? 'size-3' : 'size-4', 'text-muted-foreground')} aria-hidden />
      ) : (
        <span
          className={cn(
            'block shrink-0 animate-pulse rounded-full',
            size === 'sm' ? 'size-1.5' : 'size-2',
            tone === 'danger' ? 'bg-destructive' : 'bg-primary',
          )}
          aria-hidden
        />
      )
    const iconContent = icon === null ? null : (icon ?? defaultIcon)

    const headerToneClass =
      tone === 'danger' ? 'text-destructive-emphasis' : mode === 'completed' ? 'text-muted-foreground' : 'text-primary'

    if (size === 'sm') {
      return (
        <div
          ref={ref}
          data-slot="live-duration-card"
          data-mode={mode}
          role="status"
          aria-live={mode === 'completed' ? undefined : 'polite'}
          className={cn(containerVariants({ size, tone }), className)}
          {...props}
        >
          {iconContent}
          <span className={cn('truncate text-caption font-semibold tabular-nums', headerToneClass)}>
            {headerLabel} · {valueText}
            {mode === 'tracking' ? (
              <span className="text-muted-foreground"> / {formatDuration(expectedMs)}</span>
            ) : null}
          </span>
        </div>
      )
    }

    return (
      <div
        ref={ref}
        data-slot="live-duration-card"
        data-mode={mode}
        role="status"
        aria-live={mode === 'completed' ? undefined : 'polite'}
        className={cn(containerVariants({ size, tone }), className)}
        {...props}
      >
        {iconContent ? (
          mode === 'completed' ? (
            <span className="grid size-9 shrink-0 place-items-center rounded-full bg-card">{iconContent}</span>
          ) : (
            <span className="mt-1.5 shrink-0">{iconContent}</span>
          )
        ) : null}
        <div className="min-w-0 flex-1">
          <div
            className={cn(
              'text-caption font-semibold uppercase tracking-wide',
              tone === 'danger' ? 'text-destructive-emphasis' : 'text-muted-foreground',
            )}
          >
            {headerLabel}
          </div>
          <div className="mt-0.5 flex items-baseline justify-between gap-3">
            <span className="text-body-md font-semibold tabular-nums text-foreground">{valueText}</span>
            {mode === 'tracking' ? (
              <span className="shrink-0 text-caption text-muted-foreground">
                {expectedLabel} {formatDuration(expectedMs)}
              </span>
            ) : null}
          </div>
          {mode === 'tracking' ? (
            <Progress
              value={pct}
              size="sm"
              className="mt-2"
              aria-label={typeof headerLabel === 'string' ? headerLabel : undefined}
            />
          ) : null}
          {mode === 'tracking' && over ? (
            <div className="mt-1.5 text-caption font-medium text-destructive-emphasis">
              {overLabel} {formatDuration(elapsedMs - expectedMs)}
            </div>
          ) : null}
        </div>
      </div>
    )
  },
)

LiveDurationCard.displayName = 'LiveDurationCard'

export { containerVariants as liveDurationCardVariants }
