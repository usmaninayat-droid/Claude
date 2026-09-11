import { useEffect, useMemo, useRef, useState } from 'react'
import { BadgeCheck } from 'lucide-react'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
  Button, cn,
} from '@fams/design-system'

const CODE_LENGTH = 6
const RESEND_SECONDS = 30

/**
 * Step-up verification for a critical save — the user re-proves it's them with a
 * 6-digit code before telematics feature changes are committed.
 *
 * Prototype: there is no backend, so any complete 6-digit code verifies. The
 * shape of the flow (send → enter → resend cooldown → verify) is what the real
 * integration has to fill in; `onVerified` is where the API call goes.
 */
export function VerifyIdentityDialog({
  open,
  onClose,
  onVerified,
  email,
}: {
  open: boolean
  onClose: () => void
  /** Fires once the code is accepted — the caller commits the pending changes. */
  onVerified: () => void
  /** Where the code was sent. Shown in full so the user can spot a wrong inbox. */
  email: string
}) {
  const [digits, setDigits] = useState<string[]>(() => Array(CODE_LENGTH).fill(''))
  const [secondsLeft, setSecondsLeft] = useState(RESEND_SECONDS)
  const [verifying, setVerifying] = useState(false)
  const inputRefs = useRef<Array<HTMLInputElement | null>>([])

  const code = digits.join('')
  const isComplete = code.length === CODE_LENGTH && digits.every((d) => d !== '')

  // Fresh dialog every time: empty boxes, full cooldown, focus the first cell.
  useEffect(() => {
    if (!open) return
    setDigits(Array(CODE_LENGTH).fill(''))
    setSecondsLeft(RESEND_SECONDS)
    setVerifying(false)
    const id = setTimeout(() => inputRefs.current[0]?.focus(), 60)
    return () => clearTimeout(id)
  }, [open])

  // Resend cooldown.
  useEffect(() => {
    if (!open || secondsLeft <= 0) return
    const id = setTimeout(() => setSecondsLeft((s) => s - 1), 1000)
    return () => clearTimeout(id)
  }, [open, secondsLeft])

  const setDigitAt = (index: number, value: string) => {
    setDigits((prev) => {
      const next = [...prev]
      next[index] = value
      return next
    })
  }

  const handleChange = (index: number, raw: string) => {
    const value = raw.replace(/\D/g, '')
    if (!value) {
      setDigitAt(index, '')
      return
    }
    // Typing over a filled cell, or pasting into one, spills across the row.
    if (value.length > 1) {
      setDigits((prev) => {
        const next = [...prev]
        for (let i = 0; i < value.length && index + i < CODE_LENGTH; i += 1) {
          next[index + i] = value[i]
        }
        return next
      })
      const landing = Math.min(index + value.length, CODE_LENGTH - 1)
      inputRefs.current[landing]?.focus()
      return
    }
    setDigitAt(index, value)
    if (index < CODE_LENGTH - 1) inputRefs.current[index + 1]?.focus()
  }

  const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && !digits[index] && index > 0) {
      e.preventDefault()
      setDigitAt(index - 1, '')
      inputRefs.current[index - 1]?.focus()
    } else if (e.key === 'ArrowLeft' && index > 0) {
      e.preventDefault()
      inputRefs.current[index - 1]?.focus()
    } else if (e.key === 'ArrowRight' && index < CODE_LENGTH - 1) {
      e.preventDefault()
      inputRefs.current[index + 1]?.focus()
    } else if (e.key === 'Enter' && isComplete) {
      e.preventDefault()
      handleVerify()
    }
  }

  const handleVerify = () => {
    if (!isComplete || verifying) return
    setVerifying(true)
    // Stands in for the round-trip the real endpoint will make.
    setTimeout(() => {
      setVerifying(false)
      onVerified()
    }, 450)
  }

  const resendLabel = useMemo(
    () => (secondsLeft > 0 ? `Resend in ${secondsLeft}s` : 'Resend code'),
    [secondsLeft]
  )

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-md gap-5">
        <DialogHeader className="gap-3">
          <div className="flex size-11 items-center justify-center rounded-full bg-warning-100 text-warning-600">
            <BadgeCheck className="size-5" />
          </div>
          <DialogTitle className="text-lg font-semibold">To continue, verify it's you</DialogTitle>
          <DialogDescription className="text-sm text-muted-foreground">
            We sent a 6-digit code to your email{' '}
            <span className="font-semibold text-foreground">{email}</span>. Enter it below to
            continue.
          </DialogDescription>
        </DialogHeader>

        {/* One input per digit, so the caret position always matches what the
            user sees. The group is labelled once rather than per cell. */}
        <div
          role="group"
          aria-label="6-digit verification code"
          className="flex items-center gap-2.5"
        >
          {digits.map((digit, index) => (
            <input
              key={index}
              ref={(el) => {
                inputRefs.current[index] = el
              }}
              type="text"
              inputMode="numeric"
              autoComplete={index === 0 ? 'one-time-code' : 'off'}
              maxLength={CODE_LENGTH}
              value={digit}
              aria-label={`Digit ${index + 1}`}
              onChange={(e) => handleChange(index, e.target.value)}
              onKeyDown={(e) => handleKeyDown(index, e)}
              onFocus={(e) => e.target.select()}
              className={cn(
                'h-12 w-12 rounded-[6px] border bg-card text-center text-lg font-semibold text-foreground',
                'outline-none transition-colors focus:border-primary focus:ring-2 focus:ring-primary/30',
                digit ? 'border-primary/40' : 'border-border'
              )}
            />
          ))}
        </div>

        <p className="-mt-1 text-sm text-muted-foreground">
          Didn't get it?{' '}
          <button
            type="button"
            disabled={secondsLeft > 0}
            onClick={() => setSecondsLeft(RESEND_SECONDS)}
            className={cn(
              'font-medium outline-none transition-colors focus-visible:ring-2 focus-visible:ring-ring',
              secondsLeft > 0
                ? 'cursor-default text-muted-foreground'
                : 'cursor-pointer text-primary hover:underline'
            )}
          >
            {resendLabel}
          </button>
        </p>

        <DialogFooter className="gap-2 sm:justify-between">
          <Button variant="tertiary" onClick={onClose} className="cursor-pointer">
            Cancel
          </Button>
          <Button onClick={handleVerify} disabled={!isComplete || verifying} className="cursor-pointer">
            {verifying ? 'Verifying…' : 'Verify'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
