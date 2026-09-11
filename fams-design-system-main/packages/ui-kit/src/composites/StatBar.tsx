import { forwardRef, type HTMLAttributes, type ReactNode } from 'react'
import { Info } from '../icons'
import { cn } from '../lib/cn'
import { Progress } from '../primitives/Progress'
import { Tooltip, TooltipTrigger, TooltipContent } from '../primitives/Tooltip'
import { SegmentedBar, type SegmentedBarSegment } from './SegmentedBar'

/**
 * StatBar — a labelled bar: caption row (label + optional info tooltip and a
 * trailing value) above the bar itself, with an optional trailing figure
 * beside it. [L3 composite]
 *
 * The one labelled-bar shell for both bar shapes the design board draws: a
 * single filled bar (delegated to `Progress`) and a categorical breakdown
 * (delegated to `SegmentedBar`). Neither bar is re-implemented here — this
 * component owns only the caption/value chrome around them, which is exactly
 * what both Figma widgets ("Battery Widget" and "Progress") differ in.
 *
 * `compact` collapses the caption row into a single line so the same
 * component works as a table cell (bar + value inline) without a second
 * component or a per-call-site layout hack.
 *
 * Tone is threshold-driven by the CALLER (rule 8) — pass the tone your
 * documented threshold produced; this component never decides "good vs bad".
 * Colour is never the only encoding (V12): the numeric `value` sits beside
 * the bar, and the bar itself carries a real `role="progressbar"` with
 * `aria-valuenow` (or, when segmented, `SegmentedBar`'s per-segment labels).
 *
 * @usage-index stat-bar
 */
export type StatBarTone = 'primary' | 'success' | 'warning' | 'danger'

/**
 * Tone → fill class for the `Progress` indicator. `Progress` is a token-only
 * primitive with a single `bg-primary` fill; rather than fork it (or add a
 * variant only this shell needs), the fill is re-tinted through its
 * `data-slot` from the outside. Static strings so Tailwind sees every class.
 */
const TONE_FILL_CLASSES: Record<StatBarTone, string> = {
  primary: '[&_[data-slot=progress-indicator]]:bg-primary',
  success: '[&_[data-slot=progress-indicator]]:bg-success',
  warning: '[&_[data-slot=progress-indicator]]:bg-warning',
  danger: '[&_[data-slot=progress-indicator]]:bg-destructive',
}

export interface StatBarProps extends Omit<HTMLAttributes<HTMLDivElement>, 'children'> {
  /** Caption above the bar (omitted entirely when `compact`, where it renders inline). */
  label?: ReactNode
  /** Content of an info tooltip beside the label. Omit for no info affordance. */
  info?: ReactNode
  /** Trailing text of the caption row, e.g. `"3,500 L of 5,000 L"`. */
  value?: ReactNode
  /** Single filled bar, 0–100. Ignored when `segments` is given. */
  percent?: number
  /** Categorical breakdown — delegates to `SegmentedBar`. Takes precedence over `percent`. */
  segments?: SegmentedBarSegment[]
  /** Fill tone of the single bar. Threshold-driven by the caller. Default `'primary'`. */
  tone?: StatBarTone
  /** Track height. Default `'md'`. */
  size?: 'sm' | 'md' | 'lg'
  /** Renders `percent` as a trailing figure after the bar. */
  showPercent?: boolean
  /** Arbitrary trailing content after the bar (wins over `showPercent`). */
  trailing?: ReactNode
  /** Single-line table-cell form: no caption row, `label`/`value` sit inline with the bar. */
  compact?: boolean
  /**
   * Marks the BAR as decorative (`aria-hidden`), for the case where `value`
   * already states the reading AND its threshold band in words. Without it a
   * threshold band that is only ever painted (a red fill, no band word) is
   * encoded by colour alone (verdict V12) and the bar repeats a number the
   * text already carries.
   */
  decorative?: boolean
  /** Accessible name for the bar. */
  'aria-label'?: string
}

export const StatBar = forwardRef<HTMLDivElement, StatBarProps>(
  (
    {
      className,
      label,
      info,
      value,
      percent = 0,
      segments,
      tone = 'primary',
      size = 'md',
      showPercent = false,
      trailing,
      compact = false,
      decorative = false,
      'aria-label': ariaLabel,
      ...props
    },
    ref,
  ) => {
    const clamped = Math.min(100, Math.max(0, percent))
    const rawBar = segments ? (
      <SegmentedBar
        segments={segments}
        size={size}
        aria-label={ariaLabel ?? (typeof label === 'string' ? label : 'Breakdown')}
        className="flex-1"
      />
    ) : (
      <Progress
        value={clamped}
        size={size === 'lg' ? 'md' : size}
        aria-label={ariaLabel ?? (typeof label === 'string' ? label : undefined)}
        className={cn('flex-1', TONE_FILL_CLASSES[tone], size === 'lg' && 'h-4')}
      />
    )
    const bar = decorative ? (
      <span aria-hidden="true" className="flex flex-1">
        {rawBar}
      </span>
    ) : (
      rawBar
    )
    const trailingNode = trailing ?? (showPercent ? `${Math.round(clamped)}%` : null)

    if (compact) {
      return (
        <div
          ref={ref}
          data-slot="stat-bar"
          data-compact="true"
          className={cn('flex w-full items-center gap-2', className)}
          {...props}
        >
          {label ? (
            <span className="shrink-0 truncate text-caption text-muted-foreground">{label}</span>
          ) : null}
          {bar}
          {value ? (
            <bdi className="shrink-0 text-body-sm font-medium text-foreground">{value}</bdi>
          ) : null}
          {trailingNode ? (
            <span className="shrink-0 text-caption text-muted-foreground">{trailingNode}</span>
          ) : null}
        </div>
      )
    }

    return (
      <div
        ref={ref}
        data-slot="stat-bar"
        className={cn('flex w-full flex-col gap-1.5', className)}
        {...props}
      >
        {label || info || value ? (
          <div className="flex items-center justify-between gap-2">
            <span className="flex min-w-0 items-center gap-1 text-caption font-medium text-muted-foreground">
              <span className="truncate">{label}</span>
              {info ? (
                <Tooltip>
                  <TooltipTrigger
                    type="button"
                    aria-label={
                      typeof label === 'string' ? `More about ${label}` : 'More information'
                    }
                    className="relative inline-flex size-4 shrink-0 items-center justify-center rounded-xs outline-none before:absolute before:-inset-4 before:content-[''] focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    <Info className="size-3.5" aria-hidden="true" />
                  </TooltipTrigger>
                  <TooltipContent>{info}</TooltipContent>
                </Tooltip>
              ) : null}
            </span>
            {value ? (
              <bdi
                data-slot="stat-bar-value"
                className="shrink-0 text-body-sm font-semibold text-foreground"
              >
                {value}
              </bdi>
            ) : null}
          </div>
        ) : null}
        <div className="flex items-center gap-2">
          {bar}
          {trailingNode ? (
            <span
              data-slot="stat-bar-trailing"
              className="shrink-0 text-caption font-medium text-muted-foreground"
            >
              {trailingNode}
            </span>
          ) : null}
        </div>
      </div>
    )
  },
)

StatBar.displayName = 'StatBar'
