import * as React from 'react';
import { ChevronsRight } from 'lucide-react';
import { cn } from '../utils/cn';
import { StatePill } from './state-pill';

/**
 * StateTransitionToolbar — pipeline detail top-right action toolbar.
 *
 * Source of truth: `_unpacked/truemax/src/app/components/ticket-detail.tsx`
 * (the toolbar with current-state pill + APPROVE/REJECT/SCHEDULE buttons).
 * Spec: `state-transition-toolbar.spec.md` (co-located).
 *
 * Renders: [current-state pill] + [next-state action buttons] + [collapse chevron].
 *
 * Next-state buttons can be derived two ways:
 *   1. `nextStates` prop — explicit (recommended for branching transitions)
 *   2. `forwardOnly` mode — defaults to all stages AFTER current in the
 *      ordered `stages` array (Truemax linear forward-flow pattern)
 *
 * The collapse chevron is purely visual (the parent can wire it to hide the
 * right-rail timeline or do nothing).
 */

export interface StateTransitionTransition {
  /** Target stage id. */
  toStageId: string;
  /** Action button label (e.g. "SCHEDULE", "APPROVE", "MARK INVALID"). */
  actionLabel: string;
  /** Optional confirm-modal text. */
  confirmMessage?: string;
  /** Optional variant for the action button. Defaults to `outline`. */
  variant?: 'outline' | 'primary' | 'destructive';
}

export interface StateTransitionToolbarProps {
  /** Current stage definition. */
  currentStage: {
    id: string;
    label: string;
    color: string;
    textColor?: string;
  };
  /** Available transitions from current state. */
  transitions: StateTransitionTransition[];
  /** Handler — called with target stage id when a transition button is clicked. */
  onTransition?: (toStageId: string) => void | Promise<void>;
  /** Handler for the collapse chevron at the far right. */
  onCollapse?: () => void;
  className?: string;
}

export function StateTransitionToolbar({
  currentStage,
  transitions,
  onTransition,
  onCollapse,
  className,
}: StateTransitionToolbarProps) {
  return (
    <div className={cn('inline-flex items-center gap-1.5', className)}>
      <StatePill
        label={currentStage.label}
        bg={currentStage.color}
        text={currentStage.textColor ?? '#FFFFFF'}
      />
      {transitions.map((t) => (
        <button
          key={t.toStageId}
          type="button"
          onClick={() => onTransition?.(t.toStageId)}
          className={cn(
            'inline-flex h-7 items-center rounded-md border px-3.5 text-[11px] font-bold uppercase tracking-wider transition-colors',
            t.variant === 'primary'
              ? 'border-primary bg-primary text-primary-foreground hover:bg-primary/90'
              : t.variant === 'destructive'
                ? 'border-destructive bg-destructive text-destructive-foreground hover:bg-destructive/90'
                : 'border-border bg-card text-muted-foreground hover:border-foreground hover:text-foreground',
          )}
          style={{ letterSpacing: '0.05em' }}
        >
          {t.actionLabel}
        </button>
      ))}
      {onCollapse ? (
        <button
          type="button"
          onClick={onCollapse}
          aria-label="Collapse right rail"
          className="ml-1 flex size-7 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
        >
          <ChevronsRight size={14} />
        </button>
      ) : null}
    </div>
  );
}

/**
 * Default forward-flow helper — given a stages array and current id, return
 * the linear set of transitions to all later stages (Truemax pattern).
 */
export function getForwardTransitions<
  S extends { id: string; label: string },
>(stages: S[], currentStageId: string): StateTransitionTransition[] {
  const idx = stages.findIndex((s) => s.id === currentStageId);
  if (idx === -1) return [];
  return stages.slice(idx + 1).map((s) => ({
    toStageId: s.id,
    actionLabel: s.label.toUpperCase(),
  }));
}
