import * as React from 'react';
import { AlertOctagon } from 'lucide-react';
import { cn } from '../utils/cn';
import {
  Dialog, DialogContent, DialogHeader, DialogFooter, DialogTitle, DialogDescription,
} from '../primitives/dialog';
import { Button } from '../primitives/button';
import { Textarea } from '../primitives/textarea';
import { Input } from '../primitives/input';

/**
 * DestructiveActionModal — Pattern #04.
 *
 * Workflow:
 *   1. Show consequences (red banner + bullets)
 *   2. Require typed confirmation (intent-proof) — `confirmKeyword` defaults to the entity name
 *   3. Require a reason (free-text)
 *   4. Submit → emits onConfirm({ reason })
 *
 * Always pair with audit-log writes in the consumer.
 */

export interface DestructiveActionModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: React.ReactNode;
  consequences: React.ReactNode[];
  confirmKeyword?: string;
  reasonRequired?: boolean;
  confirmLabel?: string;
  onConfirm: (payload: { reason: string }) => void | Promise<void>;
}

export function DestructiveActionModal({
  open, onOpenChange, title, consequences,
  confirmKeyword = 'DELETE', reasonRequired = true,
  confirmLabel = 'Confirm delete', onConfirm,
}: DestructiveActionModalProps) {
  const [typed, setTyped] = React.useState('');
  const [reason, setReason] = React.useState('');
  const [submitting, setSubmitting] = React.useState(false);

  const matches = typed.trim() === confirmKeyword.trim();
  const canConfirm = matches && (!reasonRequired || reason.trim().length > 0);

  React.useEffect(() => { if (!open) { setTyped(''); setReason(''); } }, [open]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <div className="flex items-start gap-3">
            <span className="mt-0.5 flex size-8 items-center justify-center rounded-full bg-[color:var(--status-error)]/15 text-[color:var(--status-error)]">
              <AlertOctagon className="size-4" />
            </span>
            <div className="min-w-0 flex-1">
              <DialogTitle>{title}</DialogTitle>
              <DialogDescription>This action cannot be undone.</DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="rounded-lg border border-[color:var(--status-error)]/30 bg-[color:var(--status-error)]/8 p-3">
          <div className="mb-1.5 text-xs font-semibold text-[color:var(--status-error)] uppercase tracking-wide">
            Consequences
          </div>
          <ul className="space-y-1 text-xs text-foreground">
            {consequences.map((c, i) => (
              <li key={i} className="flex gap-2"><span aria-hidden>·</span><span>{c}</span></li>
            ))}
          </ul>
        </div>

        <Input
          label={`Type "${confirmKeyword}" to confirm`}
          value={typed}
          onChange={(e) => setTyped(e.target.value)}
          aria-invalid={typed.length > 0 && !matches}
        />

        {reasonRequired ? (
          <Textarea
            label="Reason"
            hint="This is recorded in the audit log."
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            rows={3}
          />
        ) : null}

        <DialogFooter>
          <Button variant="tertiary" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button
            variant="destructive"
            disabled={!canConfirm || submitting}
            loading={submitting}
            onClick={async () => {
              setSubmitting(true);
              try { await onConfirm({ reason }); onOpenChange(false); }
              finally { setSubmitting(false); }
            }}
          >
            {confirmLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
