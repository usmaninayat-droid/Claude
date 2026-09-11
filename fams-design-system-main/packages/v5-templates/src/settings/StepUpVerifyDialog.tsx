import { useEffect, useState, type ReactNode } from 'react'
import {
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@fams/ui-kit'
import { ShieldCheck } from '@fams/ui-kit/icons'
import { cn } from '../lib/cn'
import { VerificationCodeInput } from './VerificationCodeInput'

/**
 * StepUpVerifyDialog — step-up verification for a critical save. [v5 tier]
 *
 * Ported from the designer-approved dispatcher prototype
 * (`VerifyIdentityDialog`). A setting that grants or revokes a physically
 * consequential capability (immobilizing a vehicle, say) never writes
 * straight through: the page stages the edits behind a `StagedSaveBar`, and
 * saving raises THIS dialog so the user re-proves it is them with an emailed
 * code before the change is committed.
 *
 * State-agnostic (rule 8): the code round-trip belongs to the host —
 * `onVerified(code)` is where the real endpoint call goes, `verifying` and
 * `error` reflect its outcome. Only the two things that are pure UI live
 * here: the digit cells (`VerificationCodeInput`) and the resend cooldown.
 *
 * @usage-index step-up-verify-dialog
 */
export interface StepUpVerifyDialogProps {
  open: boolean
  onClose: () => void
  /**
   * Fired with the entered code once the user submits a complete one — the
   * host verifies it and commits the staged changes. Reflect the round trip
   * back through `verifying` / `error`.
   */
  onVerified: (code: string) => void
  /** Where the code was sent. Shown in full so the user can spot a wrong inbox. */
  email: string
  /** Digit count. Defaults to 6. */
  codeLength?: number
  /** Resend cooldown in seconds. Defaults to 30; `0` enables resend at once. */
  resendSeconds?: number
  /** Fired by "Resend code". Omit to hide the resend line entirely. */
  onResend?: () => void
  /** True while the host verifies — disables the form and labels the button. */
  verifying?: boolean
  /** Rejection message from the host (wrong/expired code). Marks the cells invalid. */
  error?: ReactNode
  title?: ReactNode
  description?: ReactNode
  className?: string
}

export function StepUpVerifyDialog({
  open,
  onClose,
  onVerified,
  email,
  codeLength = 6,
  resendSeconds = 30,
  onResend,
  verifying = false,
  error,
  title = 'To continue, verify it’s you',
  description,
  className,
}: StepUpVerifyDialogProps) {
  const [digits, setDigits] = useState<string[]>(() => Array<string>(codeLength).fill(''))
  const [secondsLeft, setSecondsLeft] = useState(resendSeconds)

  const code = digits.join('')
  const complete = code.length === codeLength && digits.every((d) => d !== '')

  // Fresh dialog every time it opens: empty cells and a full cooldown.
  useEffect(() => {
    if (!open) return
    setDigits(Array<string>(codeLength).fill(''))
    setSecondsLeft(resendSeconds)
  }, [open, codeLength, resendSeconds])

  // Resend cooldown tick.
  useEffect(() => {
    if (!open || secondsLeft <= 0) return
    const id = setTimeout(() => setSecondsLeft((s) => s - 1), 1000)
    return () => clearTimeout(id)
  }, [open, secondsLeft])

  const submit = () => {
    if (!complete || verifying) return
    onVerified(code)
  }

  const resend = () => {
    if (secondsLeft > 0) return
    setSecondsLeft(resendSeconds)
    onResend?.()
  }

  return (
    <Dialog open={open} onOpenChange={(next) => !next && onClose()}>
      <DialogContent className={cn('max-w-md gap-5', className)} data-slot="step-up-verify-dialog">
        <DialogHeader className="gap-3">
          <div
            aria-hidden
            className="flex size-11 items-center justify-center rounded-full bg-warning-scale-100 text-warning-scale-600 [&_svg]:size-5"
          >
            <ShieldCheck />
          </div>
          <DialogTitle className="text-base font-semibold">{title}</DialogTitle>
          <DialogDescription className="text-sm text-muted-foreground">
            {description ?? (
              <>
                We sent a {codeLength}-digit code to your email{' '}
                <span className="font-semibold text-foreground">{email}</span>. Enter it below to
                continue.
              </>
            )}
          </DialogDescription>
        </DialogHeader>

        <VerificationCodeInput
          digits={digits}
          onChange={setDigits}
          onComplete={submit}
          focusOnMount={open}
          disabled={verifying}
          hasError={Boolean(error)}
        />

        {error ? (
          <p role="alert" className="-mt-1 text-sm font-medium text-destructive-emphasis">
            {error}
          </p>
        ) : onResend ? (
          <p className="-mt-1 text-sm text-muted-foreground">
            Didn’t get it?{' '}
            <button
              type="button"
              disabled={secondsLeft > 0}
              onClick={resend}
              className={cn(
                'font-medium outline-none transition-colors duration-fast focus-visible:ring-2 focus-visible:ring-ring',
                secondsLeft > 0
                  ? 'cursor-default text-muted-foreground'
                  : 'cursor-pointer text-primary hover:underline',
              )}
            >
              {secondsLeft > 0 ? `Resend in ${secondsLeft}s` : 'Resend code'}
            </button>
          </p>
        ) : null}

        <DialogFooter className="gap-2 sm:justify-between">
          <Button variant="tertiary" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={submit} disabled={!complete} loading={verifying}>
            Verify
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

StepUpVerifyDialog.displayName = 'StepUpVerifyDialog'
