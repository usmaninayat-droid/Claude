import {
  forwardRef,
  useEffect,
  useRef,
  useState,
  type KeyboardEvent as ReactKeyboardEvent,
  type ReactNode,
} from 'react'
import { ChevronDown } from '../icons'
import { cn } from '../lib/cn'
import { Badge } from '../primitives/Badge'
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from '../primitives/DropdownMenu'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '../primitives/Dialog'
import { Textarea } from '../primitives/Textarea'
import { Button } from '../primitives/Button'
import { TONE_BADGE_VARIANT, type TransitionStage } from './transition-stage'

export { type TransitionStage }

/**
 * StatusTransitionDropdown — the stage/status state-machine control: the
 * current stage renders as a `Badge` trigger that opens a menu of reachable
 * stages. [L3 composite]
 *
 * Forward-only by default (only stages after `currentId` in `stages` order
 * are offered) — set `forwardOnly={false}` to offer every other stage.
 * Any target can carry `disabledReason` (blocked, shown under its label) or
 * `requiresReason` (a guard: picking it opens a Dialog collecting a mandatory
 * reason before `onTransition` fires). `tone` is a closed enum mapped to
 * status tokens — never a raw color (Rule 2). State-agnostic (Rule 8): the
 * component never mutates status itself, it only calls `onTransition` once a
 * target (and its reason, if guarded) is resolved.
 *
 * @usage-v5
 *   Consolidates hand-rolled status-change flows, none of which share a
 *   mechanism:
 *   - `shared/components/_visionai/VisionAIStatusChangeDrawer.vue` — two
 *     `q-select` pickers + a required `statusChangeReason` textarea gating
 *     submit; hardcoded `.status-badge--reported`/`.status-badge--scheduled`
 *     CSS classes for the from/to pill colors.
 *   - `iwmp/components/charts/BinWashingChecklistLog.vue` — a
 *     `statusBadgeClass()` switch mapping washing status to a CSS class, a
 *     separate free-text "reason" column with no guard/required linkage.
 *   - `iwmp/components/inspector/common/Penalties.vue` — static `q-badge`
 *     status label plus an unrelated, always-visible penalty-reasons list.
 *   Forms needed: current stage as a colored pill trigger, forward-only vs.
 *   all-stages menu, per-target disabled/blocked state, a reason guard on
 *   specific transitions only (not a global reason field).
 * @usage-index status-transition-dropdown
 */

export interface StatusTransitionDropdownProps {
  stages: TransitionStage[]
  currentId: string
  /** Fired once a target is resolved. `reason` is present only for a `requiresReason` target. */
  onTransition: (stageId: string, reason?: string) => void
  /** Only stages after the current one (in `stages` order) are offered. Default true. */
  forwardOnly?: boolean
  /** Locks the control entirely — no menu, no chevron. */
  disabled?: boolean
  size?: 'sm' | 'md'
  className?: string
  /** Controlled open state of the stage menu. */
  open?: boolean
  /** Uncontrolled initial open state of the stage menu. */
  defaultOpen?: boolean
  /** Fired when the stage menu opens or closes. */
  onOpenChange?: (open: boolean) => void
  /**
   * Overrides the trigger's visible content (the default is the current
   * stage rendered as a colored `Badge` + chevron) — e.g. a static
   * "Change Status" label/icon trigger next to a separately-rendered status
   * pill (`TaskDetailHeader`'s Figma pattern). The trigger's `aria-label`,
   * disabled state, and menu behavior are unaffected — only what renders
   * inside the button changes. Receives the resolved current stage and
   * whether the menu can open (mirrors the default rendering's own logic).
   */
  renderTrigger?: (current: TransitionStage, canOpen: boolean) => ReactNode
}

const TONE_DOT_CLASSES: Record<NonNullable<TransitionStage['tone']>, string> = {
  neutral: 'bg-muted-foreground',
  info: 'bg-info',
  success: 'bg-success',
  warning: 'bg-warning',
  danger: 'bg-destructive',
}

export const StatusTransitionDropdown = forwardRef<HTMLButtonElement, StatusTransitionDropdownProps>(
  (
    {
      stages,
      currentId,
      onTransition,
      forwardOnly = true,
      disabled = false,
      size = 'md',
      className,
      open,
      defaultOpen,
      onOpenChange,
      renderTrigger,
    },
    ref,
  ) => {
    const [guardStage, setGuardStage] = useState<TransitionStage | null>(null)
    const [reason, setReason] = useState('')
    const reasonRef = useRef<HTMLTextAreaElement>(null)

    useEffect(() => {
      if (guardStage) {
        reasonRef.current?.focus()
      }
    }, [guardStage])

    const currentIndex = stages.findIndex((stage) => stage.id === currentId)
    const current = stages[currentIndex]
    const targets = stages.filter(
      (stage, index) => stage.id !== currentId && (!forwardOnly || index > currentIndex),
    )

    const closeGuard = () => {
      setGuardStage(null)
      setReason('')
    }

    const pick = (stage: TransitionStage) => {
      if (stage.requiresReason) {
        setReason('')
        setGuardStage(stage)
      } else {
        onTransition(stage.id)
      }
    }

    const confirmGuard = () => {
      const trimmed = reason.trim()
      if (!guardStage || !trimmed) return
      onTransition(guardStage.id, trimmed)
      closeGuard()
    }

    const handleTextareaKeyDown = (event: ReactKeyboardEvent<HTMLTextAreaElement>) => {
      if (event.key === 'Enter' && (event.metaKey || event.ctrlKey)) {
        event.preventDefault()
        confirmGuard()
      }
    }

    if (!current) return null

    const canOpen = !disabled && targets.length > 0

    return (
      <>
        <DropdownMenu open={open} defaultOpen={defaultOpen} onOpenChange={onOpenChange}>
          <DropdownMenuTrigger asChild disabled={!canOpen}>
            <button
              ref={ref}
              type="button"
              disabled={!canOpen}
              data-slot="status-transition-trigger"
              aria-label={`Status: ${current.label}${canOpen ? ' — change status' : ''}`}
              className={cn(
                'inline-flex items-center gap-1 rounded-xs outline-none transition-opacity',
                'focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1',
                canOpen ? 'cursor-pointer hover:opacity-90' : 'cursor-default',
                className,
              )}
            >
              {renderTrigger ? (
                renderTrigger(current, canOpen)
              ) : (
                <>
                  <Badge
                    variant={TONE_BADGE_VARIANT[current.tone ?? 'neutral']}
                    size={size}
                    dot
                    uppercase
                    // A stage carrying the blueprint's own `color` (a
                    // multi-stage lifecycle with more distinct hues than the
                    // 5-value tone enum) renders that EXACT solid fill —
                    // same value the list/kanban/detail-chip surfaces use —
                    // instead of falling back to the coarser tone variant.
                    solid={Boolean(current.color)}
                    style={
                      current.color
                        ? { backgroundColor: current.color, color: current.textColor ?? 'white' }
                        : undefined
                    }
                  >
                    {current.label}
                  </Badge>
                  {canOpen ? (
                    <ChevronDown
                      aria-hidden
                      className={cn('shrink-0 text-muted-foreground', size === 'sm' ? 'size-3' : 'size-3.5')}
                    />
                  ) : null}
                </>
              )}
            </button>
          </DropdownMenuTrigger>

          <DropdownMenuContent align="start" className="w-64">
            {targets.map((stage) => (
              <DropdownMenuItem
                key={stage.id}
                disabled={!!stage.disabledReason}
                onSelect={() => pick(stage)}
                className="items-start gap-2"
              >
                <span
                  aria-hidden
                  className={cn(
                    'mt-1 size-2 shrink-0 rounded-full',
                    !stage.color && TONE_DOT_CLASSES[stage.tone ?? 'neutral'],
                  )}
                  style={stage.color ? { backgroundColor: stage.color } : undefined}
                />
                <span className="flex min-w-0 flex-1 flex-col">
                  <span className="truncate">{stage.label}</span>
                  {stage.disabledReason ? (
                    <span className="truncate text-caption text-muted-foreground">{stage.disabledReason}</span>
                  ) : null}
                </span>
                {!stage.disabledReason && stage.requiresReason ? (
                  <span className="shrink-0 text-caption text-muted-foreground">requires reason</span>
                ) : null}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>

        <Dialog
          open={!!guardStage}
          onOpenChange={(next) => {
            if (!next) closeGuard()
          }}
        >
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Move to {guardStage?.label}</DialogTitle>
              <DialogDescription>This transition requires a reason. It is recorded in the audit log.</DialogDescription>
            </DialogHeader>
            <Textarea
              ref={reasonRef}
              label="Reason"
              rows={3}
              value={reason}
              onChange={(event) => setReason(event.target.value)}
              onKeyDown={handleTextareaKeyDown}
              placeholder="Explain why…"
              required
            />
            <DialogFooter>
              <Button type="button" variant="tertiary" onClick={closeGuard}>
                Cancel
              </Button>
              <Button
                type="button"
                variant={guardStage?.destructive ? 'destructive' : 'primary'}
                disabled={!reason.trim()}
                onClick={confirmGuard}
              >
                Move to {guardStage?.label}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </>
    )
  },
)

StatusTransitionDropdown.displayName = 'StatusTransitionDropdown'
