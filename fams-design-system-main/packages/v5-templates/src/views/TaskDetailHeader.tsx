import type { ReactNode } from 'react'
import { Hash, AlertTriangle, PieChart, ChevronDown, ChevronsLeft, ChevronsRight } from '@fams/ui-kit/icons'
import {
  Badge,
  Button,
  StatusTransitionDropdown,
  TONE_BADGE_VARIANT,
  type TransitionStage,
  type TransitionStageTone,
} from '@fams/ui-kit'
import type { StatusDef } from '@fams/v5-composer'
import { cn } from '../lib/cn'

export interface TaskDetailHeaderProps {
  title: ReactNode
  /** Full stage list (blueprint `statusList`). */
  statusList: StatusDef[]
  /** The record's current stage key. */
  currentStatus?: string
  /** Stage keys the current user may transition TO (from the rule check). */
  allowedTransitions?: string[]
  onTransition?: (toStage: string, reason?: string) => void
  /** Per-stage tone override; unmapped stages fall back to `neutral`. */
  statusTones?: Record<string, TransitionStageTone>
  /** Priority / severity slot rendered beside the stage control. */
  priority?: ReactNode
  /** Trailing action buttons. */
  actions?: ReactNode
  /**
   * Record identifier chip (e.g. `IN-231454`) — the left segment of the
   * Figma "chip row" (figma-spec-detail.md §3.1). Omitted entirely when not
   * given (no id taxonomy for this module).
   */
  recordId?: ReactNode
  /** Overrides the id chip's leading icon (defaults to `hash`). */
  recordIdIcon?: ReactNode
  /**
   * Record "type" chip (e.g. `BOOKING`) — the right segment of the same
   * segmented pill, adjoining `recordId` with a shared border. Only some
   * modules have a type taxonomy distinct from the record itself (ticketing
   * does not) — omit to render a single-segment id-only chip, a spec-noted
   * acceptable simplification (figma-spec-detail.md §3.1 step 1).
   */
  recordType?: ReactNode
  /** Overrides the type chip's leading icon (defaults to `alert-triangle`). */
  recordTypeIcon?: ReactNode
  /**
   * The right-pane collapse affordance — the ">>" control at the far right
   * edge of this row (figma-spec-detail.md §2: id/type chips left, status +
   * "Change Status" + collapse right, all inside the LEFT pane — not a
   * separate global header). Omit to render no collapse control (e.g. a
   * single-pane record surface with nothing to collapse).
   */
  collapseControl?: { collapsed: boolean; onToggle: () => void }
}

/**
 * TaskDetailHeader — title + stage-transition control + priority slot.
 * [tier-2 internal]
 *
 * The stage control's SHAPE is driven purely by how many stages
 * `allowedTransitions` names (never a per-module special case — the shape
 * follows the blueprint's own rule data, generically, for every pipeline):
 *
 * - **0** (an explicit empty list — the rule check ran and found nowhere to
 *   go): no control renders at all. A terminal stage exposes no move
 *   affordance, same call `KanbanCard` already made for a card with zero
 *   drop targets (fix7, run-2026-09-05: a card that cannot move is not
 *   draggable, full stop — this is that same rule applied to the detail
 *   sheet's control instead of a card's drag handle).
 * - **exactly 1** (the common "next stage in a linear pipeline" case Figma's
 *   job-orders spec shows — `SCHEDULE`/`START`/`COMPLETE`): a single named
 *   outline `Button` carrying that stage's own `label`, calling
 *   `onTransition` directly on click. No menu — there is only one place to
 *   go, so a dropdown would just be a one-item menu wrapping a button.
 * - **2+, or `allowedTransitions` omitted entirely** (no rule data supplied
 *   — a module that hasn't wired the rule check): the generic
 *   `StatusTransitionDropdown`, unchanged — every OTHER stage is offered,
 *   any stage NOT in `allowedTransitions` (when it IS supplied) is disabled
 *   with a "Not permitted" reason. Figma's spec only shows the single-target
 *   case; a branching stage (`UNDER INSPECTION` → `VERIFIED`/`REJECTED`) is
 *   exactly the shape a menu of named targets is generically good for, so
 *   this is the deliberate default for 2+ rather than N named buttons.
 *
 * `onTransition` fires only for a permitted target either way.
 */
/** Segmented id/type chip pair (figma-spec-detail.md §3.1 "Left"). One or
 *  both segments render; a lone `recordId` renders a single rounded chip. */
function IdTypeChip({
  recordId,
  recordIdIcon,
  recordType,
  recordTypeIcon,
}: Pick<TaskDetailHeaderProps, 'recordId' | 'recordIdIcon' | 'recordType' | 'recordTypeIcon'>) {
  if (!recordId && !recordType) return null
  const segmentClass =
    'inline-flex h-[1.625rem] items-center gap-1 border border-border bg-card px-2 text-body-sm font-semibold text-muted-foreground'
  return (
    <div data-slot="task-detail-id-chip" className="flex items-center">
      {recordId ? (
        <span
          className={cn(segmentClass, recordType ? '-me-px rounded-s-[0.1875rem]' : 'rounded-[0.1875rem]')}
        >
          {recordIdIcon ?? <Hash aria-hidden className="size-4" />}
          {recordId}
        </span>
      ) : null}
      {recordType ? (
        <span className={cn(segmentClass, 'rounded-e-[0.1875rem] uppercase')}>
          {recordTypeIcon ?? <AlertTriangle aria-hidden className="size-4" />}
          {recordType}
        </span>
      ) : null}
    </div>
  )
}

export function TaskDetailHeader({
  title,
  statusList,
  currentStatus,
  allowedTransitions,
  onTransition,
  statusTones,
  priority,
  actions,
  recordId,
  recordIdIcon,
  recordType,
  recordTypeIcon,
  collapseControl,
}: TaskDetailHeaderProps) {
  const allowed = allowedTransitions ? new Set(allowedTransitions) : null
  // A caller-supplied `statusTones` map wins; otherwise fall back to the
  // blueprint's own `statusList[].tone` (added for the UCCP incidents
  // pipeline's semantic lifecycle colors — neutral/info/warning/success/
  // danger — so a blueprint-authored tone is picked up automatically without
  // every module having to thread a separate `statusTones` prop).
  const resolvedTones: Record<string, TransitionStageTone> =
    statusTones ??
    Object.fromEntries(
      statusList.filter((s): s is StatusDef & { tone: TransitionStageTone } => s.tone != null).map((s) => [s.key, s.tone]),
    )
  // `color`/`textColor` ride along on every stage (not just the current
  // one) so `StatusTransitionDropdown`'s trigger AND its menu-item dots
  // render the exact same per-stage hex as the list/kanban/detail-chip
  // surfaces — a lifecycle with more distinct hues than the 5-value tone
  // enum covers (e.g. UCCP incidents' blue/indigo mid-pipeline stages)
  // would otherwise look identical in the dropdown alone.
  const stages: TransitionStage[] = statusList.map((s) => ({
    id: s.key,
    label: s.label,
    tone: resolvedTones[s.key] ?? 'neutral',
    color: s.color,
    textColor: s.textColor,
    disabledReason:
      allowed && s.key !== currentStatus && !allowed.has(s.key) ? 'Not permitted' : undefined,
  }))

  const hasStage = currentStatus != null && stages.some((s) => s.id === currentStatus)
  const currentStage = stages.find((s) => s.id === currentStatus)
  const currentStatusDef = statusList.find((s) => s.key === currentStatus)
  // See the component docblock: shape of the stage control follows the
  // COUNT of `allowedTransitions`, not any per-module vocabulary.
  const transitionCount = allowedTransitions?.length
  const namedTransition =
    transitionCount === 1 ? statusList.find((s) => s.key === allowedTransitions![0]) : undefined
  const showStageControl = hasStage && transitionCount !== 0
  // An explicit caller-supplied `statusTones` entry for the CURRENT stage
  // must win outright over the blueprint's own `color` — not just feed the
  // tone into `stages[].tone` (which only affects the dropdown/menu-item
  // dots) while the chip itself still painted the blueprint hex inline.
  const hasExplicitToneOverride = currentStatus != null && statusTones?.[currentStatus] != null

  return (
    <header data-slot="task-detail-header" className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <IdTypeChip
          recordId={recordId}
          recordIdIcon={recordIdIcon}
          recordType={recordType}
          recordTypeIcon={recordTypeIcon}
        />
        <div className="flex flex-wrap items-center gap-3">
          {priority}
          {hasStage && currentStage ? (
            <Badge
              variant={TONE_BADGE_VARIANT[currentStage.tone ?? 'neutral']}
              // Solid fill (this project's status-pill standard) — same
              // treatment as the list Status column and Kanban headers. A
              // stage carrying the blueprint's own `color` renders that
              // EXACT hex (+ `textColor`, defaulting to white) instead of
              // the coarser tone variant, so this chip never drifts from
              // what list/kanban/the Change Status dropdown show for the
              // same stage.
              solid={hasExplicitToneOverride || !currentStatusDef?.color}
              uppercase
              size="md"
              className="rounded-xs"
              style={
                !hasExplicitToneOverride && currentStatusDef?.color
                  ? { backgroundColor: currentStatusDef.color, color: currentStatusDef.textColor ?? 'white' }
                  : undefined
              }
            >
              {currentStage.label}
            </Badge>
          ) : null}
          {showStageControl && namedTransition ? (
            <Button
              type="button"
              data-slot="task-detail-named-transition"
              variant="tertiary"
              size="sm"
              disabled={!onTransition}
              className="h-[1.625rem] rounded-xs px-2 text-body-sm font-semibold uppercase"
              onClick={() => onTransition?.(namedTransition.key)}
            >
              {namedTransition.label}
            </Button>
          ) : showStageControl ? (
            <StatusTransitionDropdown
              stages={stages}
              currentId={currentStatus!}
              forwardOnly={false}
              disabled={!onTransition}
              onTransition={(stageId, reason) => onTransition?.(stageId, reason)}
              renderTrigger={(_current, canOpen) => (
                <span
                  className={cn(
                    'inline-flex h-[1.625rem] items-center gap-2 rounded-xs border border-border bg-card px-2 text-body-sm font-semibold text-muted-foreground',
                  )}
                >
                  <PieChart aria-hidden className="size-4" />
                  Change Status
                  {canOpen ? <ChevronDown aria-hidden className="size-3.5 shrink-0" /> : null}
                </span>
              )}
            />
          ) : null}
          {actions}
          {collapseControl ? (
            <button
              type="button"
              data-slot="task-detail-panel-collapse"
              aria-label={collapseControl.collapsed ? 'Expand panel' : 'Collapse panel'}
              aria-expanded={!collapseControl.collapsed}
              onClick={collapseControl.onToggle}
              className="hidden shrink-0 items-center justify-center text-muted-foreground outline-none transition-colors hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring lg:inline-flex"
            >
              {collapseControl.collapsed ? (
                <ChevronsLeft aria-hidden className="size-4" />
              ) : (
                <ChevronsRight aria-hidden className="size-4" />
              )}
            </button>
          ) : null}
        </div>
      </div>
      {/* `text-[1.875rem]` (30px; not the shared `text-h4` token, 28px) — a
          fresh `get_design_context` extraction against
          `PAk7skcUc0OeD8FcQyDVe7` node `32:4745` confirms the incident Task
          Detail title renders at exactly `30px` (`Gilroy:SemiBold`,
          `leading-[normal]`). Scoped to THIS header only: `text-h4` stays
          untouched for its other consumers (`EntityIdentityPanel`,
          `ViewTypePicker`), so this fix can't regress a screen with no fresh
          Figma evidence of its own. `rem`, not `px` — `pnpm lint:tokens`
          (hard rule 2) allows arbitrary-value `rem` but not raw `px`. */}
      <h1 className="truncate text-[1.875rem] font-semibold leading-snug text-foreground">{title}</h1>
    </header>
  )
}

TaskDetailHeader.displayName = 'TaskDetailHeader'
