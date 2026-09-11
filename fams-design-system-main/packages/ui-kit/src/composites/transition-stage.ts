import type { BadgeVariant } from '../primitives/Badge'

/**
 * A closed set of semantic tones a stage can carry — maps to `Badge`'s status
 * variants (never a raw hex per Rule 2). `neutral` folds to Badge's `muted`.
 */
export type TransitionStageTone = 'neutral' | 'info' | 'success' | 'warning' | 'danger'

/**
 * Shared tone → `Badge` variant lookup — the single mapping consumed by both
 * `StatusTransitionDropdown` (menu items + default trigger) and
 * `TaskDetailHeader` (the solid status pill next to it), so a stage's color
 * never drifts between the two controls.
 */
export const TONE_BADGE_VARIANT: Record<TransitionStageTone, BadgeVariant> = {
  neutral: 'muted',
  info: 'info',
  success: 'success',
  warning: 'warning',
  danger: 'destructive',
}

/**
 * A workflow stage — shared shape used by `StateTransitionToolbar` (current
 * stage badge, `tone` required) and `StatusTransitionDropdown` (stage menu,
 * `tone` optional, plus the `requiresReason`/`disabledReason` guard fields).
 */
export interface TransitionStage {
  id: string
  label: string
  tone: TransitionStageTone
  /** Guard: selecting this stage opens a reason Dialog; the trimmed reason is passed to `onTransition`. */
  requiresReason?: boolean
  /** Blocks this stage in the menu; the text renders under its label as the explanation. */
  disabledReason?: string
  /** Tints the guard dialog's confirm button destructive (e.g. "Cancel", "Reject"). Only meaningful with `requiresReason`. */
  destructive?: boolean
  /**
   * Raw per-stage solid-fill color (blueprint `statusList[].color`) — when
   * present, `StatusTransitionDropdown`'s trigger Badge and menu-item dot use
   * this EXACT hex instead of `tone`'s coarse 5-value Badge variant, so a
   * multi-stage lifecycle (more distinct hues than the 5 semantic tones
   * cover) reads identically here as it does in the list/kanban/detail-chip
   * surfaces that already key off the same blueprint value.
   */
  color?: string
  /** Contrast-safe text override for `color` — see `StatusDef.textColor`. */
  textColor?: string
}
