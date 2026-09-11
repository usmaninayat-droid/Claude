import { forwardRef, type HTMLAttributes, type ReactNode, type CSSProperties } from 'react'
import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '../lib/cn'

/**
 * StatusPill — solid-fill, white-text status chip. [L3 composite]
 *
 * The ticketing-stage "solid" chip treatment (figma-spec-list.md §3/§4,
 * pixel-verified, shared by the list view's STATUS column pill AND the
 * grouped variant's group-header pill — same `Badges` component, same
 * 7-color mapping, just a different host cell):
 *
 * | variant       | color     | token                          |
 * |---------------|-----------|---------------------------------|
 * | `newRequest`  | `#9e77ed` | Accent/Lavender/Normal (EXACT)  |
 * | `scheduled`   | `#8b6439` | Accent/Bronze/Normal (EXACT)    |
 * | `inProgress`  | `#f79009` | Warning/warning (EXACT)         |
 * | `resolved`    | `#047cd5` | Brand/Secondary/Normal — **no matching `@fams/tokens` entry yet** (a token gap, not a color decision); this variant falls back to the nearest existing token, `info-scale-500` `#0072d6`, until that token lands — pass `color="#047cd5"` for the exact design value meanwhile. |
 * | `overdue`     | `#f04438` | Accent/Error/Normal (EXACT)     |
 * | `closed`      | `#12b76a` | Success/success (EXACT)         |
 * | `rejected`    | `#ee46bc` | Accent/Pink/Normal (EXACT)      |
 *
 * `color` is the blueprint-driven escape hatch for a tenant-added stage this
 * fixed enum doesn't name, or for `resolved`'s token gap above — same
 * data-driven-hex precedent as `Kanban`'s `KanbanColumn.accentColor` and
 * `@fams/v5-templates`' `TaskDetailHeader` stage-color fallback (a runtime
 * value threaded from the blueprint's own `statusList[].color`, never a
 * literal in component source). Takes precedence over `variant` when both
 * are given.
 *
 * @usage-index status-pill
 */
export type StatusPillVariant =
  | 'newRequest'
  | 'scheduled'
  | 'inProgress'
  | 'resolved'
  | 'overdue'
  | 'closed'
  | 'rejected'

const statusPillVariants = cva(
  // figma-spec-list.md §3: "Badge widths auto-size to label… 22px tall" —
  // round-1 design QA (list #C9) found a long label ("NEW REQUESTS") wrapping
  // onto two lines instead, roughly doubling the pill's (and its row's)
  // height. `whitespace-nowrap` + `shrink-0` keep the pill single-line and
  // sized to its content instead of being compressed by a narrow table
  // column — it overflows the column visually if needed, matching the
  // spec's auto-width badge rather than wrapping.
  // Padding is 8px horizontal / 4px vertical (UX ruling A7, run 2026-09-05):
  // `specs/grouped-list/SPEC.md` §1.3 writes the tuple "8px 4px" then
  // glosses it as "8px horizontal/4px vertical" — the gloss is right, the
  // tuple order is wrong. `px-2` (8px) / `py-1` (4px), not `py-0.5` (2px).
  'inline-flex shrink-0 items-center gap-1 whitespace-nowrap rounded-xs px-2 py-1 text-caption font-semibold uppercase tracking-wide text-white [&>svg]:size-3.5 [&>svg]:shrink-0',
  {
    variants: {
      variant: {
        newRequest: 'bg-accent-family-lavender-normal',
        scheduled: 'bg-accent-family-bronze-normal',
        inProgress: 'bg-warning-scale-500',
        resolved: 'bg-info-scale-500',
        overdue: 'bg-error-500',
        closed: 'bg-success-scale-500',
        rejected: 'bg-accent-family-pink-normal',
      },
    },
  },
)

export interface StatusPillProps
  extends Omit<HTMLAttributes<HTMLSpanElement>, 'color'>,
    VariantProps<typeof statusPillVariants> {
  /** One of the 7 named ticketing stages, each pre-wired to its token color. Omit when using `color`. */
  variant?: StatusPillVariant
  /** Raw color override — see the module doc's "blueprint-driven escape hatch" note. */
  color?: string
  /**
   * Text color override for the `'solid'` fill — the same blueprint-driven
   * escape hatch as `color`, for a stage whose fill is too light for the
   * default white text to clear WCAG AA (e.g. an amber/warning-family
   * `color`). Ignored in `'tint'` mode (which always computes a contrast-
   * safe foreground from `color`).
   */
  textColor?: string
  /**
   * `'solid'` (default) is the pixel-verified white-on-fill treatment.
   * `'tint'` (requires `color`) renders the WCAG-safe tinted treatment —
   * a 12% tint of the color over the card surface with a foreground-mixed
   * dark reading of the same hue (≥4.5:1 on the tint; UX MUST L.58), the
   * same tint-bg + emphasis-fg pattern the card warning banners use.
   */
  appearance?: 'solid' | 'tint'
  /** Leading icon slot (e.g. the "Reopened" chip's refresh glyph, figma-spec-kanban.md §6). */
  icon?: ReactNode
}

export const StatusPill = forwardRef<HTMLSpanElement, StatusPillProps>(
  ({ variant, color, textColor, appearance = 'solid', icon, className, children, style, ...props }, ref) => {
    // An inline `style.backgroundColor` always wins over the class's
    // `bg-*` utility regardless of specificity, so `color` overriding
    // `variant`'s background needs no conditional class selection — the
    // variant's bg class (if any) simply goes unused when `color` is set.
    const tinted = appearance === 'tint' && Boolean(color)
    const mergedStyle: CSSProperties | undefined = tinted
      ? {
          ...style,
          // Data-driven color math (the blueprint's own hex, never a literal
          // here): tint the surface, darken the hue toward the theme
          // foreground for the text so contrast holds in light AND dark.
          backgroundColor: `color-mix(in srgb, ${color} 12%, var(--color-card))`,
          color: `color-mix(in srgb, ${color} 50%, var(--color-foreground))`,
        }
      : color
        ? { ...style, backgroundColor: color, ...(textColor ? { color: textColor } : null) }
        : style
    return (
      <span
        ref={ref}
        data-slot="status-pill"
        data-appearance={tinted ? 'tint' : 'solid'}
        className={cn(statusPillVariants({ variant }), tinted && 'text-current', className)}
        style={mergedStyle}
        {...props}
      >
        {icon}
        {children}
      </span>
    )
  },
)

StatusPill.displayName = 'StatusPill'

export { statusPillVariants }
