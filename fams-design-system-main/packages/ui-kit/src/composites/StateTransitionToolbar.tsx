import { forwardRef, type HTMLAttributes } from 'react'
import { ChevronsRight } from '../icons'
import { cn } from '../lib/cn'
import { Badge, type BadgeVariant } from '../primitives/Badge'
import { Button, type ButtonProps } from '../primitives/Button'
import { type TransitionStage, type TransitionStageTone } from './transition-stage'

export { type TransitionStage, type TransitionStageTone }

const STAGE_TONE_TO_BADGE_VARIANT: Record<TransitionStageTone, BadgeVariant> = {
  neutral: 'muted',
  info: 'info',
  success: 'success',
  warning: 'warning',
  danger: 'destructive',
}

/** One available action from the current stage to another. */
export interface StateTransition {
  /** Target stage id, passed back via `onTransition`. */
  toStageId: string
  /** Action button label (e.g. "Approve", "Reject", "Schedule"). */
  label: string
  /** Button treatment. Defaults to `outline`. */
  variant?: 'outline' | 'primary' | 'destructive'
}

const TRANSITION_VARIANT_TO_BUTTON: Record<NonNullable<StateTransition['variant']>, ButtonProps['variant']> = {
  outline: 'tertiary',
  primary: 'primary',
  destructive: 'destructive',
}

export interface StateTransitionToolbarProps extends Omit<HTMLAttributes<HTMLDivElement>, 'children'> {
  /** The stage the record is in right now — rendered as a `Badge`. */
  currentStage: TransitionStage
  /** Actions available from `currentStage`. Empty array renders the badge alone. */
  transitions: StateTransition[]
  /** Called with the target stage id when a transition button is activated. */
  onTransition?: (toStageId: string) => void
  /** Shows a trailing collapse affordance when provided (e.g. hide a right-rail timeline). */
  onCollapse?: () => void
  /** Disables every transition button (e.g. while a transition is in flight) without hiding them. */
  disabled?: boolean
}

/**
 * StateTransitionToolbar — current-stage badge + a row of transition action
 * buttons. [L3 composite]
 *
 * State-agnostic (Rule 8): `transitions` is a plain list the caller derived
 * (from a workflow config, an allowed-next-states lookup, whatever) — this
 * component has no notion of what a "stage" means, no confirm dialog, no
 * fetch. `onTransition` fires synchronously; async submission, optimistic
 * update, and any confirm-before-destructive step (pair with
 * `DestructiveActionModal`) belong to the caller.
 *
 * @usage-v5
 *   Every status-change surface hand-rolls this pattern today:
 *   - `shared/components/list/StatusList.vue` — current-status pill (dropdown
 *     variant) + transition-fields-modal handoff on select; per-status inline
 *     hex (`backgroundColor: '#2563EB'`) instead of a tone token.
 *   - `iwmp/components/inspector/planning/EspPlansPanel.vue` — plan status
 *     pill (`approved`/`rejected`/`active`, inline hex per status) with
 *     separate `q-btn` approve/reject actions beside it.
 *   - `shared/components/dialog/TransitionFieldsModal.vue` — the confirm step
 *     after a transition button click (`submitText`, `confirm`/`cancel`
 *     emits) — the natural pairing for this toolbar's `onTransition`.
 *   Forms needed: current stage as a toned badge, N action buttons with
 *   outline/primary/destructive treatment, optional collapse affordance.
 * @usage-index state-transition-toolbar
 */
export const StateTransitionToolbar = forwardRef<HTMLDivElement, StateTransitionToolbarProps>(
  ({ className, currentStage, transitions, onTransition, onCollapse, disabled = false, ...props }, ref) => {
    return (
      <div
        ref={ref}
        data-slot="state-transition-toolbar"
        className={cn('inline-flex items-center gap-2', className)}
        {...props}
      >
        <Badge variant={STAGE_TONE_TO_BADGE_VARIANT[currentStage.tone]} uppercase>
          {currentStage.label}
        </Badge>

        {transitions.map((transition) => (
          <Button
            key={transition.toStageId}
            type="button"
            size="sm"
            variant={TRANSITION_VARIANT_TO_BUTTON[transition.variant ?? 'outline']}
            disabled={disabled}
            onClick={() => onTransition?.(transition.toStageId)}
            className="uppercase tracking-wide text-caption font-semibold"
          >
            {transition.label}
          </Button>
        ))}

        {onCollapse ? (
          <Button
            type="button"
            variant="ghost"
            size="icon"
            aria-label="Collapse"
            onClick={onCollapse}
            className="ms-1"
          >
            <ChevronsRight className="rtl:-scale-x-100" />
          </Button>
        ) : null}
      </div>
    )
  },
)

StateTransitionToolbar.displayName = 'StateTransitionToolbar'

/**
 * getForwardTransitions — linear forward-flow helper (ported from reference
 * DS). Given an ordered `stages` array and the `currentStageId`, returns a
 * `StateTransition` for every stage that comes *after* the current one, in
 * order. Use when the caller's workflow has no branching (every stage moves
 * to the next) so it doesn't have to hand-build the `transitions` array.
 * Callers with branching/conditional transitions should build their own list
 * instead — this covers only the strictly-linear case.
 */
export function getForwardTransitions<S extends { id: string; label: string }>(
  stages: S[],
  currentStageId: string,
): StateTransition[] {
  const idx = stages.findIndex((stage) => stage.id === currentStageId)
  if (idx === -1) return []
  return stages.slice(idx + 1).map((stage) => ({
    toStageId: stage.id,
    label: stage.label,
  }))
}
