import * as React from 'react';
import * as Icons from '../../icons';
import { cn } from '../utils/cn';
import { Sheet, SheetContent, SheetTitle, SheetDescription, Button } from '../primitives';

/**
 * StepWizardSheet — the shared right-sheet stepped-wizard shell for Settings
 * create/edit flows (RoleSheet, AppSheet, …). Renders the header, the clickable
 * step-tab row, the scrollable body for the active step, and the Back / Proceed
 * footer (final step submits). Each step supplies its own `render` + `canProceed`;
 * the shell owns navigation. Extracted so no flow re-implements wizard chrome.
 */

export interface WizardStep {
  id: string;
  label: string;
  render: () => React.ReactNode;
  /** Gate advancing past this step (default true). */
  canProceed?: boolean;
}

export interface StepWizardSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: React.ReactNode;
  description?: React.ReactNode;
  steps: WizardStep[];
  /** Final-step button label. Default "Create". */
  submitLabel?: string;
  onComplete: () => void;
  /** When set, the footer shows a left "Cancel" (instead of Back-only) that calls this + closes. */
  onCancel?: () => void;
  /** Optional footer action left of the primary button (e.g. "Save as draft"). */
  secondaryAction?: { label: string; onClick: () => void; disabled?: boolean };
  width?: string;
  className?: string;
}

export function StepWizardSheet({
  open, onOpenChange, title, description, steps, submitLabel = 'Create', onComplete, onCancel, secondaryAction, width = 'min(620px, 94vw)', className,
}: StepWizardSheetProps) {
  const [idx, setIdx] = React.useState(0);
  React.useEffect(() => { if (open) setIdx(0); }, [open]);

  const clamped = Math.min(idx, steps.length - 1);
  const step = steps[clamped];
  const isLast = clamped === steps.length - 1;
  const canProceed = step?.canProceed ?? true;

  const proceed = () => {
    if (!canProceed) return;
    if (!isLast) { setIdx(clamped + 1); return; }
    onComplete();
    onOpenChange(false);
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" width={width} className={cn('p-0', className)}>
        <div className="px-6 pt-6">
          <SheetTitle className="text-h6 font-bold text-foreground">{title}</SheetTitle>
          {description && <SheetDescription className="mt-1 text-body-sm text-muted-foreground">{description}</SheetDescription>}
          {/* Step-tab strip — same on-the-line idiom as `entity-detail.tsx`'s
              profile tabs: the container itself carries `border-b`, and only
              the active tab gets `border-b-2 border-primary` so its indicator
              sits flush with that divider (never a floating underline above
              a detached border). */}
          <nav aria-label="Steps" className="mt-4 flex flex-wrap items-center gap-x-6 gap-y-2 border-b border-border">
            {steps.map((s, i) => {
              const active = i === clamped;
              const reachable = i <= clamped || steps.slice(0, i).every((st) => st.canProceed ?? true);
              return (
                <button
                  key={s.id}
                  type="button"
                  aria-current={active ? 'step' : undefined}
                  disabled={!reachable}
                  onClick={() => reachable && setIdx(i)}
                  className={cn(
                    'pb-2.5 text-body-sm font-semibold transition-colors focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50',
                    active ? 'border-b-2 border-primary text-primary' : 'text-muted-foreground hover:text-foreground',
                  )}
                >
                  {s.label}
                </button>
              );
            })}
          </nav>
        </div>

        <div className="flex min-h-0 flex-1 flex-col overflow-auto px-6 py-5">
          {step?.render()}
        </div>

        <div className="flex items-center justify-between gap-3 border-t border-border px-6 py-4">
          {clamped > 0
            ? <Button variant="secondary" onClick={() => setIdx(clamped - 1)}><Icons.ChevronLeft size={16} className="mr-1" />Back</Button>
            : onCancel
              ? <button type="button" onClick={() => { onCancel(); onOpenChange(false); }} className="rounded-md px-2 py-1 text-body-sm font-semibold text-[var(--status-error)] transition-colors hover:underline focus-visible:ring-2 focus-visible:ring-ring">Cancel</button>
              : <span />}
          <div className="flex items-center gap-3">
            {secondaryAction && (
              <button type="button" disabled={secondaryAction.disabled} onClick={secondaryAction.onClick} className="rounded-md px-3 py-2 text-body-sm font-semibold text-primary transition-colors hover:bg-primary/5 focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:bg-transparent">{secondaryAction.label}</button>
            )}
            <Button variant="primary" disabled={!canProceed} onClick={proceed} className="min-w-[160px]">
              {isLast ? submitLabel : 'Proceed'}
            </Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
