import { forwardRef, type HTMLAttributes } from 'react'
import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '../lib/cn'

/**
 * Badge — compact, non-interactive status/label chip. [L1 primitive]
 *
 * Variants: default / secondary / outline / muted (neutral) · success / warning / info / destructive (status).
 * Sizes: xs (count-pill, `rounded-full`) / sm (default) / md / lg (chunky chip — Figma's
 * 40px-tall tag/type row, e.g. entity-profile category chips).
 * `dot` renders a leading status dot in `currentColor` — no extra color prop needed.
 * `uppercase` folds in the reference design's StatePill treatment (uppercase, tracked,
 * bold) as a text option on top of the same variant palette — not a separate component.
 * `solid` swaps a status variant's light tint (`bg-success-scale-50` style) for a solid
 * fill + white-on-color text — the reference design's "filled" StatePill treatment
 * (e.g. a field's status value rendered as a solid green pill) as a modifier on the same
 * variant, not a separate variant set. No-op on `default`/`secondary`/`outline`/`muted`
 * (already solid or intentionally neutral). Note: `success`/`warning`/`info` have no
 * dedicated `*-foreground` token (unlike `destructive-foreground`) — `solid` falls back
 * to Tailwind's `white` keyword for those three; flagged as a token-set gap, not a new
 * hardcoded color decision.
 * `colorIndex` (1–10) is the categorical escape hatch for tagging data by *category*
 * (lot, ESP, district…) rather than status — it maps (cycling every 5) onto the
 * `--color-chart-1..5` categorical palette instead of a variant. Text stays
 * `text-foreground` even in this mode: some categorical tokens are near-white, so
 * tinting only the fill/border (never the label ink) keeps every index legible.
 * There is deliberately no raw `color`/hex prop (hard rule 2).
 *
 * @usage-v5
 *   Consolidates status/label chips duplicated across the Vue app:
 *   - `q-badge` (74 occurrences / ~35 files) — status labels bound to `:color`/`:style`
 *     lookups (e.g. `iwmp/components/cards/ContractCard.vue` contract compliance state,
 *     `iwmp/components/inspector/planning/EspPlansPanel.vue` plan status).
 *   - `q-chip` (142 occurrences) — criticality/status chips (`ead/.../MapAssetEvents.vue`).
 *   - `shared/components/pipeline/LabelPill.vue` — closest existing analog, takes a
 *     `colorMap` prop and computes hex+alpha inline (the pattern `colorIndex` retires).
 *   - `colorPalette[index % length]` reimplemented per-file (5+ files) for categorical
 *     tagging — the reason `colorIndex` exists as a first-class prop here.
 *   Forms needed: variant (status), size (xs count-pill), dot, categorical color.
 * @usage-index badge
 */
const badgeVariants = cva(
  "inline-flex items-center justify-center shrink-0 gap-1 whitespace-nowrap rounded-xs border font-medium transition-colors [&>svg]:pointer-events-none [&>svg:not([class*='size-'])]:size-3.5",
  {
    variants: {
      variant: {
        default: 'border-transparent bg-primary text-primary-foreground',
        secondary: 'border-transparent bg-secondary text-secondary-foreground',
        outline: 'border-border bg-card text-foreground',
        muted: 'border-transparent bg-muted text-muted-foreground',
        success: 'border-success-scale-200 bg-success-scale-50 text-success-scale-700',
        warning: 'border-warning-scale-200 bg-warning-scale-50 text-warning-scale-700',
        info: 'border-info-scale-200 bg-info-scale-50 text-info-scale-700',
        destructive: 'border-error-200 bg-error-50 text-error-700',
        /** Internal only — selected automatically when `colorIndex` is set (see `BadgeProps`),
         * leaving the color slice empty so the `colorIndex` fill/border/text classes are the
         * only ones in play. Never exposed as a public `variant` value. */
        category: '',
      },
      size: {
        xs: 'h-4 min-w-4 rounded-full px-1 text-caption',
        sm: 'h-5 px-2 text-xs',
        md: 'h-6 px-2.5 text-sm',
        lg: 'h-10 px-5 py-3 text-base',
      },
    },
    defaultVariants: { variant: 'default', size: 'sm' },
  },
)

/** `solid` modifier fills — status variants only (see module doc). Keyed by the
 *  public variant name; a variant with no entry here is unaffected by `solid`.
 *
 *  `success` deliberately does NOT use `bg-success` (fix7, A7 gate blocker):
 *  `--color-success` is the brand-green MARKER hue (#12b76a, 2.62:1 white-on-
 *  fill — the same D-6 finding that already forced `success-text` to alias
 *  `success-scale-700` for TEXT use). White-on-fill contrast is symmetric with
 *  white-on-text contrast, so a `solid` success badge (this composer's own
 *  `ReadEnum`/`STATUS_VARIANT` renders exactly this for any "status"-labeled
 *  `SingleSelect` field valued "active"/"available"/etc, e.g. the asset
 *  module's `Status` row) failed the identical way — and, on the asset
 *  module, at a DIFFERENT green than the list's own `StatusPill` fill
 *  (blueprint `statusList[].color`), so the same "Active" status read as two
 *  greens one click apart. `success-scale-700` is already the vetted
 *  accessible alias (5.41:1 on white) AND, tenant-side, already carries each
 *  tenant's own correct-hue dark step (IWMP's own green ramp is a DIFFERENT
 *  hue from core's, `packages/tokens/tokens/tenants/iwmp.tokens.json`) — so
 *  reusing it here fixes contrast and keeps every solid-success badge in
 *  lockstep with its tenant's own accessible green, for free. */
const SOLID_CLASSES: Partial<Record<string, string>> = {
  success: 'border-transparent bg-success-scale-700 text-white',
  warning: 'border-transparent bg-warning text-white',
  info: 'border-transparent bg-info text-white',
  destructive: 'border-transparent bg-destructive text-destructive-foreground',
}

/** Categorical index → `--color-chart-1..5` tint, cycling every 5 (1→1, 2→2, …, 5→5,
 *  6→1, …). Kept as a static lookup (not a template literal) so Tailwind's compiler
 *  can see every class name at build time. */
const COLOR_INDEX_CLASSES: Record<number, string> = {
  1: 'border-chart-1/30 bg-chart-1/10',
  2: 'border-chart-2/30 bg-chart-2/10',
  3: 'border-chart-3/30 bg-chart-3/10',
  4: 'border-chart-4/30 bg-chart-4/10',
  5: 'border-chart-5/30 bg-chart-5/10',
  6: 'border-chart-1/30 bg-chart-1/10',
  7: 'border-chart-2/30 bg-chart-2/10',
  8: 'border-chart-3/30 bg-chart-3/10',
  9: 'border-chart-4/30 bg-chart-4/10',
  10: 'border-chart-5/30 bg-chart-5/10',
}

const COLOR_INDEX_DOT_CLASSES: Record<number, string> = {
  1: 'bg-chart-1',
  2: 'bg-chart-2',
  3: 'bg-chart-3',
  4: 'bg-chart-4',
  5: 'bg-chart-5',
  6: 'bg-chart-1',
  7: 'bg-chart-2',
  8: 'bg-chart-3',
  9: 'bg-chart-4',
  10: 'bg-chart-5',
}

export type BadgeColorIndex = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10

/** The public color variants — `category` is an implementation detail of `colorIndex`, never chosen directly. */
export type BadgeVariant = Exclude<
  NonNullable<VariantProps<typeof badgeVariants>['variant']>,
  'category'
>

export interface BadgeProps
  extends HTMLAttributes<HTMLSpanElement>,
    Omit<VariantProps<typeof badgeVariants>, 'variant'> {
  variant?: BadgeVariant
  /** Leading status dot, colored in `currentColor` (or the series color, see `colorIndex`). */
  dot?: boolean
  /** Uppercase, bold, letter-spaced label — the reference StatePill text treatment. */
  uppercase?: boolean
  /** Solid fill + white-on-color text instead of the variant's light tint — a modifier
   *  on `success`/`warning`/`info`/`destructive`, no-op on other variants (see module doc). */
  solid?: boolean
  /**
   * Tag by category (1–10) instead of status — maps (cycling every 5) onto the
   * `--color-chart-1..5` categorical palette. Takes precedence over `variant`'s
   * color; `size` still applies.
   */
  colorIndex?: BadgeColorIndex
}

export const Badge = forwardRef<HTMLSpanElement, BadgeProps>(
  ({ className, variant, size = 'sm', dot, uppercase, solid, colorIndex, children, ...props }, ref) => {
    const resolvedVariant = colorIndex ? 'category' : variant
    return (
      <span
        ref={ref}
        data-slot="badge"
        className={cn(
          badgeVariants({ variant: resolvedVariant, size }),
          colorIndex ? [COLOR_INDEX_CLASSES[colorIndex], 'text-foreground'] : undefined,
          solid && !colorIndex && resolvedVariant ? SOLID_CLASSES[resolvedVariant] : undefined,
          uppercase && 'uppercase tracking-wide font-semibold',
          className,
        )}
        {...props}
      >
        {dot ? (
          <span
            aria-hidden="true"
            className={cn(
              'rounded-full',
              size === 'xs' ? 'size-1' : 'size-1.5',
              colorIndex ? COLOR_INDEX_DOT_CLASSES[colorIndex] : 'bg-current',
            )}
          />
        ) : null}
        {children}
      </span>
    )
  },
)

Badge.displayName = 'Badge'

export { badgeVariants }
