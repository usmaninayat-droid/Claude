import { useEffect, useId, useState, type ReactNode } from 'react'
import { AlertOctagon } from '../icons'
import { cn } from '../lib/cn'
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogFooter,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogCancel,
} from '../primitives/AlertDialog'
import { Button } from '../primitives/Button'
import { Input } from '../primitives/Input'
import { Label } from '../primitives/Label'
import { Textarea } from '../primitives/Textarea'

/**
 * DestructiveActionModal — the one confirmation flow for actions that cannot
 * be undone (delete, deactivate, revoke, hard-remove). [L3 composite]
 *
 * Built on `AlertDialog`, not `Dialog`, for correct confirm semantics: no
 * outside-click/Escape dismiss while the caller is busy, `role="alertdialog"`,
 * and a mandatory Title+Description pair for assistive tech. Layers two
 * independently-toggleable proof-of-intent steps on top of that base: a
 * type-to-confirm keyword (`confirmKeyword`) and a reason field (`reason`).
 *
 * State-agnostic (Rule 8): the component never calls or awaits `onConfirm`
 * itself and never closes on submit — the caller runs the mutation, drives
 * `loading` while it is in flight, and sets `open={false}` once it resolves.
 * That also means a failed mutation can leave the dialog open with the typed
 * keyword/reason intact instead of forcing the user to redo them. While
 * `loading` is true, Cancel/Escape/outside-interaction are all suppressed.
 *
 * @usage-v5
 *   Three near-duplicate confirm dialogs, no typed-keyword step in any of them:
 *   - iwmp/components/dialog/ConfirmationDialog.vue — `variant: default|danger`
 *     with hardcoded hex (#FEE4E2/#F04438), a `loading` prop, a `confirmDisable`
 *     boolean the caller sets manually, and a raw `<slot />` documented as
 *     "e.g. a reason input" (unstructured — no field this component gives free)
 *   - shared/components/pipeline/ConfirmationDialog.vue — near-duplicate of the
 *     above minus `confirmDisable`/slot; consumed by StatusList.vue
 *   - shared/components/cards/ConfirmDialog.vue — plain title/message, fixed
 *     "Cancel"/"Yes, delete it" labels, no loading/reason/consequences at all
 *   No "type X to confirm" pattern exists anywhere in the codebase today
 *   (confirmed via ripgrep) — `confirmKeyword` is a net-new capability, not a
 *   consolidation. `loading` and `confirmDisable`→`canConfirm` gating are the
 *   two things the real usages already needed and had to reinvent per file.
 * @usage-index destructive-action-modal
 */
export interface DestructiveActionModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: ReactNode
  description: ReactNode
  /** Bulleted list of what this action will do. Omit to skip the block entirely. */
  consequences?: ReactNode[]
  /** Exact-match keyword the user must type to enable Confirm. Omit to skip this step. */
  confirmKeyword?: string
  /** Shows a reason Textarea. `'required'` blocks Confirm until filled; `'optional'` never blocks it. Omit to skip the field. */
  reason?: 'required' | 'optional'
  /** Caller-driven async state: disables Cancel/Confirm, spins Confirm, and suppresses Escape/outside-dismiss. */
  loading?: boolean
  confirmLabel?: string
  cancelLabel?: string
  /** Fired on Confirm click. The caller owns closing the dialog (via `onOpenChange`) once its mutation settles. */
  onConfirm: (reason?: string) => void
  className?: string
}

export function DestructiveActionModal({
  open,
  onOpenChange,
  title,
  description,
  consequences,
  confirmKeyword,
  reason,
  loading = false,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  onConfirm,
  className,
}: DestructiveActionModalProps) {
  const [typed, setTyped] = useState('')
  const [reasonValue, setReasonValue] = useState('')
  const typedId = useId()

  useEffect(() => {
    if (!open) {
      setTyped('')
      setReasonValue('')
    }
  }, [open])

  const keywordMatches = !confirmKeyword || typed.trim() === confirmKeyword.trim()
  const reasonSatisfied = reason !== 'required' || reasonValue.trim().length > 0
  const canConfirm = keywordMatches && reasonSatisfied && !loading

  const handleOpenChange = (next: boolean) => {
    if (loading) return
    onOpenChange(next)
  }

  return (
    <AlertDialog open={open} onOpenChange={handleOpenChange}>
      <AlertDialogContent data-slot="destructive-action-modal" className={cn('max-w-md', className)}>
        <AlertDialogHeader>
          <div className="flex items-start gap-3">
            <span
              aria-hidden
              className="mt-0.5 grid size-8 shrink-0 place-items-center rounded-full bg-destructive/15 text-destructive"
            >
              <AlertOctagon className="size-4" />
            </span>
            <div className="min-w-0 flex-1">
              <AlertDialogTitle>{title}</AlertDialogTitle>
              <AlertDialogDescription>{description}</AlertDialogDescription>
            </div>
          </div>
        </AlertDialogHeader>

        {consequences && consequences.length > 0 ? (
          <div
            data-slot="destructive-action-consequences"
            className="rounded-md border border-destructive/30 bg-destructive/8 p-3"
          >
            <p className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-error-text">
              Consequences
            </p>
            <ul className="space-y-1 text-sm text-foreground">
              {consequences.map((consequence, index) => (
                <li key={index} className="flex gap-2">
                  <span aria-hidden>·</span>
                  <span className="min-w-0 flex-1">{consequence}</span>
                </li>
              ))}
            </ul>
          </div>
        ) : null}

        {confirmKeyword ? (
          <div className="flex flex-col gap-1.5">
            <Label htmlFor={typedId}>
              Type <span className="font-semibold">{confirmKeyword}</span> to confirm
            </Label>
            <Input
              id={typedId}
              value={typed}
              onChange={(event) => setTyped(event.target.value)}
              hasError={typed.length > 0 && !keywordMatches}
              disabled={loading}
              autoComplete="off"
              autoCorrect="off"
              autoCapitalize="off"
              spellCheck={false}
            />
          </div>
        ) : null}

        {reason ? (
          <Textarea
            label="Reason"
            hint={reason === 'required' ? 'Required. Recorded in the audit log.' : 'Optional. Recorded in the audit log.'}
            value={reasonValue}
            onChange={(event) => setReasonValue(event.target.value)}
            rows={3}
            required={reason === 'required'}
            disabled={loading}
          />
        ) : null}

        <AlertDialogFooter>
          <AlertDialogCancel disabled={loading}>{cancelLabel}</AlertDialogCancel>
          <Button
            type="button"
            variant="destructive"
            disabled={!canConfirm}
            loading={loading}
            onClick={() => onConfirm(reason ? reasonValue.trim() || undefined : undefined)}
          >
            {confirmLabel}
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
