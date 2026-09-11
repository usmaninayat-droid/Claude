import { useEffect, useRef, type KeyboardEvent } from 'react'
import { cn } from '../lib/cn'

/**
 * VerificationCodeInput — the one-cell-per-digit code entry used by
 * `StepUpVerifyDialog`. [v5 tier, dialog part]
 *
 * Deliberately NOT a core `PinInput` primitive: step-up verification is its
 * only use in the platform today, and the core admits a primitive on its
 * third real use (root CLAUDE.md rule 11). Promote it when a second and
 * third call site appear.
 *
 * One `<input>` per digit so the caret the user sees always matches the digit
 * they are editing. The group is labelled once (`role="group"`), each cell
 * carries its ordinal name, and the first cell opts into
 * `autocomplete="one-time-code"` so iOS/Android offer the SMS/email code.
 * Paste and type-over spill across the row; Backspace on an empty cell steps
 * back; arrows move without editing.
 */
export interface VerificationCodeInputProps {
  /** Current digits, one entry per cell. Length defines the cell count. */
  digits: string[]
  onChange: (digits: string[]) => void
  /** Fired when Enter is pressed on a complete code. */
  onComplete?: () => void
  /** Accessible name for the cell group. */
  label?: string
  /**
   * Focus the first cell shortly after mount. Named `focusOnMount` rather
   * than `autoFocus`: this is a deliberate focus move INSIDE an already-open
   * modal dialog (where the code entry is the whole point), not the
   * page-level autofocus jsx-a11y warns about.
   */
  focusOnMount?: boolean
  disabled?: boolean
  hasError?: boolean
  className?: string
}

export function VerificationCodeInput({
  digits,
  onChange,
  onComplete,
  label,
  focusOnMount = false,
  disabled = false,
  hasError = false,
  className,
}: VerificationCodeInputProps) {
  const length = digits.length
  const refs = useRef<Array<HTMLInputElement | null>>([])
  const complete = digits.every((d) => d !== '')
  const groupLabel = label ?? `${length}-digit verification code`

  useEffect(() => {
    if (!focusOnMount) return
    const id = setTimeout(() => refs.current[0]?.focus(), 60)
    return () => clearTimeout(id)
  }, [focusOnMount])

  const setAt = (index: number, value: string) => {
    const next = [...digits]
    next[index] = value
    onChange(next)
  }

  const handleChange = (index: number, raw: string) => {
    const value = raw.replace(/\D/g, '')
    if (!value) {
      setAt(index, '')
      return
    }
    // Typing over a filled cell, or pasting into one, spills across the row.
    if (value.length > 1) {
      const next = [...digits]
      for (let i = 0; i < value.length && index + i < length; i += 1) next[index + i] = value[i]
      onChange(next)
      refs.current[Math.min(index + value.length, length - 1)]?.focus()
      return
    }
    setAt(index, value)
    if (index < length - 1) refs.current[index + 1]?.focus()
  }

  const handleKeyDown = (index: number, e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && !digits[index] && index > 0) {
      e.preventDefault()
      setAt(index - 1, '')
      refs.current[index - 1]?.focus()
      return
    }
    // Arrow keys are logical, not physical: under RTL the cells mirror, so
    // "previous cell" is ArrowLeft in LTR and ArrowRight in RTL.
    const rtl = typeof document !== 'undefined' && document.documentElement.dir === 'rtl'
    const prevKey = rtl ? 'ArrowRight' : 'ArrowLeft'
    const nextKey = rtl ? 'ArrowLeft' : 'ArrowRight'
    if (e.key === prevKey && index > 0) {
      e.preventDefault()
      refs.current[index - 1]?.focus()
    } else if (e.key === nextKey && index < length - 1) {
      e.preventDefault()
      refs.current[index + 1]?.focus()
    } else if (e.key === 'Enter' && complete) {
      e.preventDefault()
      onComplete?.()
    }
  }

  return (
    <div
      role="group"
      aria-label={groupLabel}
      data-slot="verification-code-input"
      className={cn('flex items-center gap-2.5', className)}
    >
      {digits.map((digit, index) => (
        <input
          key={index}
          ref={(el) => {
            refs.current[index] = el
          }}
          type="text"
          inputMode="numeric"
          autoComplete={index === 0 ? 'one-time-code' : 'off'}
          maxLength={length}
          value={digit}
          disabled={disabled}
          aria-label={`Digit ${index + 1}`}
          aria-invalid={hasError || undefined}
          onChange={(e) => handleChange(index, e.target.value)}
          onKeyDown={(e) => handleKeyDown(index, e)}
          onFocus={(e) => e.target.select()}
          className={cn(
            'size-12 rounded-sm border bg-card text-center text-lg font-semibold text-foreground',
            'outline-none transition-colors duration-fast disabled:cursor-not-allowed disabled:opacity-50',
            'focus:border-primary focus-visible:ring-2 focus-visible:ring-ring',
            hasError ? 'border-destructive' : digit ? 'border-primary/40' : 'border-border',
          )}
        />
      ))}
    </div>
  )
}

VerificationCodeInput.displayName = 'VerificationCodeInput'
