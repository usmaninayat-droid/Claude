import * as React from 'react';
import { ChevronDown } from 'lucide-react';
import { cn } from '../utils/cn';
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  Textarea,
  Button,
  Label,
} from '../primitives';

/**
 * StatusTransitionDropdown — the demos' stage state machine UI (Truemax
 * ticket status pill, CRM stage dropdown): the current stage rendered as a
 * colored pill that opens a menu of reachable stages. Forward-only by
 * default, and stages can declare a **guard** that requires a reason in a
 * blocking dialog before the transition commits (CRM "Mark as Lost").
 */

export interface TransitionStage {
  id: string;
  label: string;
  /** Pill / menu-dot color. */
  color: string;
  /**
   * Guard: opens a dialog requiring a reason before transitioning here.
   * The reason is passed to `onTransition` as the second argument.
   */
  guard?: {
    title: string;
    description?: string;
    reasonLabel?: string;
    confirmLabel?: string;
    destructive?: boolean;
  };
  /**
   * Block this transition with an explanation (the demo's closure
   * validation: "Closed" stays disabled until the report is complete).
   */
  disabledReason?: string;
}

export interface StatusTransitionDropdownProps {
  stages: TransitionStage[];
  currentId: string;
  onTransition: (toId: string, reason?: string) => void;
  /** Only stages after the current one are offered (default true). */
  forwardOnly?: boolean;
  /** Lock the control entirely (e.g. closed records). */
  disabled?: boolean;
  size?: 'sm' | 'md';
  className?: string;
}

export function StatusTransitionDropdown({
  stages,
  currentId,
  onTransition,
  forwardOnly = true,
  disabled,
  size = 'md',
  className,
}: StatusTransitionDropdownProps) {
  const [guardStage, setGuardStage] = React.useState<TransitionStage | null>(null);
  const [reason, setReason] = React.useState('');

  const idx = stages.findIndex((s) => s.id === currentId);
  const current = stages[idx];
  const targets = stages.filter((s, i) => s.id !== currentId && (!forwardOnly || i > idx));
  const isSm = size === 'sm';

  const pick = (s: TransitionStage) => {
    if (s.guard) {
      setReason('');
      setGuardStage(s);
    } else {
      onTransition(s.id);
    }
  };

  const confirmGuard = () => {
    if (!guardStage || !reason.trim()) return;
    onTransition(guardStage.id, reason.trim());
    setGuardStage(null);
    setReason('');
  };

  if (!current) return null;

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild disabled={disabled || !targets.length}>
          {/* Demo metrics (Truemax StatusDropdown): h-27, rounded-4, 14px
              semibold uppercase white label, min-w-106, chevron right. */}
          <button
            type="button"
            className={cn(
              'inline-flex items-center justify-between gap-1.5 rounded-[4px] font-semibold uppercase text-white outline-none transition-opacity focus-visible:ring-2 focus-visible:ring-ring',
              isSm ? 'h-[24px] min-w-[90px] px-2 text-caption' : 'h-[27px] min-w-[106px] py-2 pl-2 pr-[7px] text-body-sm',
              disabled || !targets.length ? 'cursor-default' : 'cursor-pointer hover:opacity-90',
              className
            )}
            style={{ background: current.color }}
            aria-label={`Status: ${current.label}${targets.length ? ' — change' : ''}`}
          >
            <span className="whitespace-nowrap">{current.label}</span>
            {!disabled && targets.length ? <ChevronDown size={isSm ? 12 : 14} strokeWidth={2.5} /> : null}
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="min-w-[200px]">
          {targets.map((s) => (
            <DropdownMenuItem
              key={s.id}
              disabled={!!s.disabledReason}
              onSelect={() => pick(s)}
              className="gap-2"
            >
              <span aria-hidden className="size-2.5 shrink-0 rounded-full" style={{ background: s.color }} />
              <span className="flex min-w-0 flex-1 flex-col">
                <span>{s.label}</span>
                {s.disabledReason ? (
                  <span className="truncate text-caption text-muted-foreground">{s.disabledReason}</span>
                ) : null}
              </span>
              {!s.disabledReason && s.guard ? (
                <span className="text-caption text-muted-foreground">requires reason</span>
              ) : null}
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Guard dialog — reason required before committing the transition. */}
      <Dialog open={!!guardStage} onOpenChange={(o) => { if (!o) setGuardStage(null); }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{guardStage?.guard?.title ?? `Move to ${guardStage?.label}`}</DialogTitle>
            {guardStage?.guard?.description ? (
              <DialogDescription>{guardStage.guard.description}</DialogDescription>
            ) : null}
          </DialogHeader>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="transition-reason" className="text-caption font-semibold">
              {guardStage?.guard?.reasonLabel ?? 'Reason'}
              <span className="text-destructive"> *</span>
            </Label>
            <Textarea
              id="transition-reason"
              autoFocus
              rows={3}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Explain why…"
            />
          </div>
          <DialogFooter>
            <Button type="button" variant="tertiary" onClick={() => setGuardStage(null)}>
              Keep open
            </Button>
            <Button
              type="button"
              variant={guardStage?.guard?.destructive ? 'destructive' : 'primary'}
              disabled={!reason.trim()}
              onClick={confirmGuard}
            >
              {guardStage?.guard?.confirmLabel ?? `Move to ${guardStage?.label}`}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
