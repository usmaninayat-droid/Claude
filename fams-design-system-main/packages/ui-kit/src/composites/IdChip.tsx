import { forwardRef, type HTMLAttributes, type ReactNode } from 'react'
import { Hash } from '../icons'
import { cn } from '../lib/cn'

/**
 * IdChip — gray, `#`-prefixed record-id chip. [L3 composite]
 *
 * Figma's "Badges" component applied to a system-generated identifier
 * (figma-spec-kanban.md §3 kanban card, figma-spec-list.md §3 the table's
 * ID cell — same visual, two host contexts): a flat `Neutral/Lighter`
 * `#eaecf0`-ish gray fill, gray text, leading `#`/hash icon. Centralizes what
 * `@fams/v5-composer`'s `ReadAuto` field renderer used to build inline from a
 * raw `Badge` override — `ReadAuto` now renders this component instead
 * (single source of the visual, consumed by any blueprint-driven "Auto"-typed
 * field AND directly by kanban/list card templates that aren't going through
 * the field registry at all — every id chip on every card and list row in the
 * product is this one component).
 *
 * fix7 (P1-2 gate blocker, UX round 6): text was `text-gray-500` (#667085 on
 * #eaecf0, 4.21:1 — short of WCAG AA 4.5:1). Raised one ramp step to
 * `text-gray-600` (#475467, 6.06:1 on #eaecf0) — the fill is unchanged, this
 * is a text-role fix only, and gray-600 is theme-invariant (no dark-mode
 * override on the raw ramp), so it clears 4.5:1 in both themes without
 * touching anything dark-mode-specific.
 *
 * @usage-index id-chip
 */
export interface IdChipProps extends HTMLAttributes<HTMLSpanElement> {
  /** Leading icon override. Defaults to a `hash` glyph. Pass `null` to omit. */
  icon?: ReactNode | null
}

export const IdChip = forwardRef<HTMLSpanElement, IdChipProps>(
  ({ icon, className, children, ...props }, ref) => (
    <span
      ref={ref}
      data-slot="id-chip"
      className={cn(
        'inline-flex items-center gap-1 rounded-xs bg-gray-200 px-2 py-0.5 text-caption font-medium text-gray-600 [&>svg]:size-3.5 [&>svg]:shrink-0',
        className,
      )}
      {...props}
    >
      {icon === null ? null : (icon ?? <Hash aria-hidden="true" />)}
      {children}
    </span>
  ),
)

IdChip.displayName = 'IdChip'
