import * as React from 'react';
import { ChevronsRight } from 'lucide-react';
import { cn } from '../utils/cn';
import { StatePill } from './state-pill';
import {
  Button,
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  Textarea,
} from '../primitives';

/**
 * StateTransitionToolbar — pipeline detail top-right action toolbar.
 *
 * Source of truth: `_unpacked/truemax/src/app/components/ticket-detail.tsx`
 * (the toolbar with current-state pill + Approve/Reject/Schedule buttons).
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
 *
 * T-102: a transition can optionally set `noteLabel` to require a short
 * note/reason before it fires (e.g. "Reason for rejection"). When set, the
 * toolbar opens its OWN confirm dialog (reusing the DS `Dialog` + `Textarea`
 * primitives — no bespoke modal) with a `Textarea` seeded from `confirmMessage`
 * as the description; `onTransition` then receives the trimmed note as an
 * optional 2nd arg (`undefined` if left blank). Transitions WITHOUT
 * `noteLabel` are unaffected — no dialog, `onTransition(toStageId)` fires
 * immediately exactly as before. Backport of ifm-workforce's
 * `PipelineStatusControl` wrapper (`modules/pipeline-controls.tsx`), folded
 * into the DS component so every consumer gets it for free.
 *
 * T-086: action-button labels are standard sentence case (`font-medium`,
 * `text-body-sm`) — the pill's small-caps tracked treatment is a STATUS idiom
 * (StatePill), not an action-button idiom; don't uppercase/track a caller's
 * `actionLabel` (this was the source of a client-flagged "shouting" button).
 */

export interface StateTransitionTransition {
  /** Target stage id. */
  toStageId: string;
  /** Action button label, sentence case (e.g. "Schedule", "Approve", "Mark Invalid"). */
  actionLabel: string;
  /** Optional confirm-modal text. Also used as the note-dialog description
   *  when `noteLabel` is set (T-102). */
  confirmMessage?: string;
  /** Optional variant for the action button. Defaults to `outline`. */
  variant?: 'outline' | 'primary' | 'destructive';
  /** T-102 — set to require a short note/reason before this transition
   *  fires (e.g. "Reason for rejection"). Opens the toolbar's own confirm
   *  dialog (DS `Dialog` + `Textarea`); the note is optional to the USER
   *  (they may submit blank) but the dialog itself is required whenever
   *  this is set. Used as the `Textarea`'s placeholder. Omit for a plain,
   *  immediate transition (default, unchanged behavior). */
  noteLabel?: string;
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
  /** Handler — called with target stage id when a transition button is
   *  clicked. T-102: `note` is the optional 2nd arg, populated only when the
   *  clicked transition set `noteLabel` (the user's trimmed dialog input, or
   *  `undefined` if left blank / the transition has no `noteLabel`). Existing
   *  callers that only read `toStageId` are unaffected. */
  onTransition?: (toStageId: string, note?: string) => void | Promise<void>;
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
  // T-102 — note-capture dialog state. `pending` holds the transition
  // awaiting confirmation; `null` when no dialog is open (the default,
  // no-`noteLabel` path never touches this state at all).
  const [pending, setPending] = React.useState<StateTransitionTransition | null>(null);
  const [note, setNote] = React.useState('');

  const handleClick = (t: StateTransitionTransition) => {
    if (t.noteLabel) {
      setNote('');
      setPending(t);
      return;
    }
    onTransition?.(t.toStageId);
  };

  const confirmPending = () => {
    if (!pending) return;
    onTransition?.(pending.toStageId, note.trim() || undefined);
    setPending(null);
  };

  return (
    <div className={cn('inline-flex items-center gap-1.5', className)}>
      <StatePill
        label={currentStage.label}
        bg={currentStage.color}
        text={currentStage.textColor ?? 'var(--primary-foreground)'}
      />
      {transitions.map((t) => (
        <button
          key={t.toStageId}
          type="button"
          onClick={() => handleClick(t)}
          className={cn(
            'inline-flex h-7 items-center rounded-md border px-3.5 text-body-sm font-medium transition-colors',
            t.variant === 'primary'
              ? 'border-primary bg-primary text-primary-foreground hover:bg-primary/90'
              : t.variant === 'destructive'
                ? 'border-destructive bg-destructive text-destructive-foreground hover:bg-destructive/90'
                : 'border-border bg-card text-muted-foreground hover:border-foreground hover:text-foreground',
          )}
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

      {/* T-102 — optional note-capture dialog, only ever mounted/opened for
          a transition that set `noteLabel`. */}
      <Dialog open={!!pending} onOpenChange={(o) => { if (!o) setPending(null); }}>
        <DialogContent className="max-w-[420px]">
          <DialogHeader>
            <DialogTitle>{pending?.actionLabel ?? 'Confirm'}</DialogTitle>
            <DialogDescription>
              {pending?.confirmMessage ?? 'Optional — add a note for the record timeline.'}
            </DialogDescription>
          </DialogHeader>
          <Textarea
            autoFocus
            rows={3}
            placeholder={pending?.noteLabel ?? 'Note (optional)…'}
            value={note}
            onChange={(e) => setNote(e.target.value)}
          />
          <DialogFooter>
            <Button type="button" variant="tertiary" onClick={() => setPending(null)}>
              Cancel
            </Button>
            <Button
              type="button"
              variant={pending?.variant === 'destructive' ? 'destructive' : 'primary'}
              onClick={confirmPending}
            >
              {pending?.actionLabel ?? 'Confirm'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
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
    actionLabel: s.label,
  }));
}
