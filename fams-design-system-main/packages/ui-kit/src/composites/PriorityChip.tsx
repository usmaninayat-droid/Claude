import { forwardRef, type HTMLAttributes, type ReactNode } from 'react'
import { Flag } from '../icons'
import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '../lib/cn'

/**
 * PriorityChip — light-bg/Normal-tone-icon severity chip. [L3 composite]
 *
 * The DS-wide "light" chip treatment (Lightest fill + a leading flag icon +
 * caps label) for a record's priority/severity, pixel-verified against
 * figma-spec-kanban.md §3 and figma-spec-list.md §3 for HUE and FILL:
 * - `critical` — `#fef3f2` fill (`Error/Lightest`), the top severity tier —
 *   pixel-EXACT in figma-spec-kanban.md §3's own "CRITICAL" sample.
 * - `high` — `#fff7f0` fill (`Accent/Flame/Lightest`). NOT the same hue as
 *   `critical` (round-1 design QA, kanban #26/list-round1): the two
 *   previously shared the Error token because neither source screen samples
 *   both labels at once (figma-spec-list.md's table only shows a "HIGH" row,
 *   sampled red because it happens to be that screen's worst visible tier;
 *   figma-spec-kanban.md's board only shows "CRITICAL", likewise sampled
 *   red) — but the live app's real data has BOTH "Critical" and "High"
 *   priority tickets on the SAME board simultaneously (`@fams/v5-composer`'s
 *   `fields/renderers.tsx` `PRIORITY_VARIANT` map already resolves them to
 *   two distinct variants), where sharing one color makes the two
 *   severities visually indistinguishable — a real severity-communication
 *   defect, not a nitpick. figma-spec-kanban.md §3 itself flags `high` as
 *   absent from its own sample and names `Accent/Flame` as "the most
 *   defensible placeholder" for exactly this gap — used here. See
 *   `qa/deviations.md` for the full reasoning (this diverges from
 *   figma-spec-list.md's own HIGH-row sample).
 * - `medium` — `#fffaeb` fill (`Warning/Lightest`), confirmed in both specs.
 * - `minor` — `#ecfdf3` fill (`Success/Lightest`), confirmed in both specs
 *   (figma-spec-list.md's fixture data also uses "Low" as a synonymous label
 *   for this same tier — see `@fams/v5-composer`'s `ReadEnum`, which aliases
 *   `low`/`urgent` text values onto this component's `minor`/`critical`
 *   variants before rendering).
 *
 * TEXT tone (fix7 wave 6, P2 — pre-existing, found while `/pipelines` was in
 * scope for this cycle's platform-wide `Kanban` change): each variant's
 * Figma-drawn `Normal`-tone text (`error-500`/`flame-normal`/
 * `warning-scale-500`/`success-scale-500`) measured 2.25–3.46:1 against its
 * OWN lightest fill — both themes, since none of these ramps carry a
 * dark-mode override (`packages/tokens/tokens/core.tokens.json` — only
 * named slots like `destructive-emphasis`/`*-text` do, never the numbered
 * ramps), so the fill stays the same pale tint in dark mode too and the
 * failure is identical there. The core `*-text` aliases (`error-text`/
 * `warning-text`/`success-text`) were deliberately NOT used here even
 * though they are the sanctioned accessible TEXT alias elsewhere: they
 * carry their OWN dark-mode override (e.g. `error-text` flips to `error.400`
 * `#f97066` in dark mode) sized for text sitting directly on
 * `card`/`background`, which — paired with THIS chip's theme-invariant pale
 * fill — would measure 1.76–2.56:1 in dark mode, worse than today. Fixed by
 * moving one ramp step darker instead (`*-700` / `accent-family-flame-dark`
 * for `high`, which has no numbered "700" step) — the SAME EXISTING tokens,
 * no new one invented, and, critically, ones with no dark-mode override of
 * their own, so the pairing stays >=5:1 in both themes: `error-700`
 * (`#b42318`) 6.05:1 on `error-50`; `accent-family-flame-dark` (`#b74300`,
 * already used elsewhere as an Avatar tone fill) 5.19:1 on
 * `accent-family-flame-lightest`; `warning-scale-700` (`#b54708`) 5.20:1 on
 * `warning-scale-50`; `success-scale-700` (`#027a48`) 5.13:1 on
 * `success-scale-50`. Hue is unchanged per variant; only the text step
 * moved. IWMP overrides the FULL `success-scale` ramp with its own green
 * (`packages/tokens/tokens/tenants/iwmp.tokens.json`) — its `minor` chip was
 * failing WORSE (2.01:1) than core's copy, and its already-defined
 * `success-scale-700` (`#15794F`, added for the same D-6 `success-text`
 * job) clears 5.01:1 against its own tinted fill, so this single component
 * fix carries IWMP's copy in lockstep with no separate tenant token change.
 *
 * @usage-index priority-chip
 */
export type PriorityChipVariant = 'critical' | 'high' | 'medium' | 'minor'

const priorityChipVariants = cva(
  'inline-flex items-center gap-1 rounded-xs px-2 py-0.5 text-caption font-semibold uppercase tracking-wide [&>svg]:size-3.5 [&>svg]:shrink-0',
  {
    variants: {
      variant: {
        critical: 'bg-error-50 text-error-700',
        high: 'bg-accent-family-flame-lightest text-accent-family-flame-dark',
        medium: 'bg-warning-scale-50 text-warning-scale-700',
        minor: 'bg-success-scale-50 text-success-scale-700',
      },
    },
    defaultVariants: { variant: 'medium' },
  },
)

export interface PriorityChipProps
  extends HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof priorityChipVariants> {
  variant: PriorityChipVariant
  /** Leading icon override. Defaults to a `flag` glyph (figma-spec-kanban.md §3). Pass `null` to omit. */
  icon?: ReactNode | null
}

export const PriorityChip = forwardRef<HTMLSpanElement, PriorityChipProps>(
  ({ variant, icon, className, children, ...props }, ref) => (
    <span
      ref={ref}
      data-slot="priority-chip"
      className={cn(priorityChipVariants({ variant }), className)}
      {...props}
    >
      {icon === null ? null : (icon ?? <Flag aria-hidden="true" />)}
      {children ?? variant}
    </span>
  ),
)

PriorityChip.displayName = 'PriorityChip'

export { priorityChipVariants }
