import { forwardRef, type HTMLAttributes } from 'react'
import { cn } from '../lib/cn'

/**
 * StatusDot — the tiny colour dot that sits before a status/option label.
 * [L3 composite]
 *
 * Deliberately generic and vocabulary-free: it knows nothing about
 * `In Progress` / `Overdue` / any tenant's status list (FAMILY C decision
 * J.87 — "no status vocabulary ever appears in DS source"). It takes either
 *
 * - `token` — a semantic token NAME (`'success-text'`, `'destructive'`, …),
 *   resolved as `var(--color-<token>)` so tenants re-theme it for free; or
 * - `color` — a RAW colour string threaded from blueprint metadata
 *   (`statusList[].chipColor ?? .color`). This is runtime data, not a literal
 *   in component source — the same escape hatch `StatusPill`/`CountChip`
 *   already take.
 *
 * `color` wins when both are given.
 *
 * Accessibility (UX verdict I.77): the dot is ALWAYS `aria-hidden` and never
 * carries meaning on its own — the caller always renders the text label next
 * to it. A `[data-status-dot]` with no adjacent text is a bug in the caller,
 * and a gate asserts it.
 *
 * @usage-index status-dot
 */
export interface StatusDotProps extends Omit<HTMLAttributes<HTMLSpanElement>, 'color'> {
  /** Raw runtime colour from metadata (hex / any CSS colour). Wins over `token`. */
  color?: string
  /** Semantic token name, resolved as `var(--color-<token>)`. Default `muted-foreground`. */
  token?: string
  /** Edge length in px. Default 8 (the generic dot); the filter option row uses 14. */
  size?: number
  /** `circle` (default) or `squircle` — a 4px-radius square, the filter dropdown's 14×14 dot. */
  shape?: 'circle' | 'squircle'
}

export const StatusDot = forwardRef<HTMLSpanElement, StatusDotProps>(
  ({ color, token = 'muted-foreground', size = 8, shape = 'circle', className, style, ...props }, ref) => (
    <span
      ref={ref}
      aria-hidden="true"
      data-status-dot=""
      data-slot="status-dot"
      className={cn('inline-block shrink-0', className)}
      style={{
        width: size,
        height: size,
        borderRadius: shape === 'circle' ? '9999px' : 4,
        backgroundColor: color ?? `var(--color-${token})`,
        ...style,
      }}
      {...props}
    />
  ),
)

StatusDot.displayName = 'StatusDot'
