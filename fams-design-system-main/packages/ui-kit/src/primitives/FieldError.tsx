import { forwardRef, type HTMLAttributes } from 'react'
import { AlertCircle } from '../icons'
import { cn } from '../lib/cn'

export interface FieldErrorProps extends HTMLAttributes<HTMLParagraphElement> {
  /** Truncate the message to one line with an ellipsis (for shared rows where
   *  a sibling — e.g. a "Forgot password?" link — must never be pushed off). */
  truncate?: boolean
}

/**
 * FieldError — the design-system-wide field error message row.
 * [L1 primitive]
 *
 * Alert-circle icon (18px) + 4px gap + the message in 14px SemiBold error
 * text. `role="alert"` so the message is announced by assistive tech when it
 * appears; the icon is decorative (`aria-hidden`). Used for both per-field
 * validation messages and form-level (server) errors.
 *
 * Text tone (fix7 wave 6, P2 sweep): was the bare `text-destructive` FILL
 * token (error.500, `#f04438`) — 3.76:1 on white / 3.91:1 on `dark.card`,
 * both failing WCAG AA 4.5:1, the same root cause this cycle has already
 * fixed repeatedly (wave 4b's `ReadFlagToneDate`, wave 5's
 * `ReadSignedNumber`). This is the DS-wide error-message row every form uses,
 * so the miss had the widest blast radius of anything the sweep found. Now
 * `text-destructive-emphasis` (error.600, 4.83:1 on white / dark's
 * `#f97066`, 5.28:1 on `dark.card`) — the same accessible TEXT alias the
 * icon-adjacent floating labels in `Input`/`Select`/`Textarea`/`Combobox`
 * already used. The `AlertCircle` icon stays on its own decorative styling
 * (icon colours are out of this sweep's scope).
 *
 * Wiring: give it an `id` and reference it from the errored control via
 * `aria-describedby` (a shared server error may be referenced by several
 * fields), alongside `aria-invalid` on the control itself.
 *
 * Spacing contract (form-errors spec): the row sits **12px** below the field
 * box it describes — compositions apply `mt-3` on the `FieldError` (or on the
 * `FieldErrorSlot` wrapping it). Do not invent other field→error gaps.
 *
 * Layout stability: mount/unmount of an 18px row shifts everything below it.
 * When the design calls for a zero-shift error (e.g. the login form, where
 * the message shares a row slot with other content), wrap the conditional
 * `FieldError` in a `FieldErrorSlot` — it reserves the row's block size
 * whether or not a message is present.
 */
export const FieldError = forwardRef<HTMLParagraphElement, FieldErrorProps>(
  ({ className, children, truncate = false, ...props }, ref) => (
    <p
      ref={ref}
      role="alert"
      data-slot="field-error"
      className={cn('flex min-w-0 items-center gap-1 text-sm font-semibold leading-[1.125rem] text-destructive-emphasis', className)}
      {...props}
    >
      <AlertCircle className="size-[1.125rem] shrink-0" aria-hidden />
      <span className={cn('min-w-0', truncate && 'truncate')}>{children}</span>
    </p>
  ),
)

FieldError.displayName = 'FieldError'

export type FieldErrorSlotProps = HTMLAttributes<HTMLDivElement>

/**
 * FieldErrorSlot — a stable row slot for a conditional `FieldError`.
 *
 * Reserves one error row of block size (18px) so content below (buttons,
 * links) does not jump when the error appears or clears. Render the
 * `FieldError` inside it only when there is a message:
 *
 * ```tsx
 * <FieldErrorSlot>
 *   {error ? <FieldError id="login-error">{error}</FieldError> : null}
 * </FieldErrorSlot>
 * ```
 */
export const FieldErrorSlot = forwardRef<HTMLDivElement, FieldErrorSlotProps>(
  ({ className, children, ...props }, ref) => (
    <div ref={ref} data-slot="field-error-slot" className={cn('min-h-[1.125rem]', className)} {...props}>
      {children}
    </div>
  ),
)

FieldErrorSlot.displayName = 'FieldErrorSlot'
