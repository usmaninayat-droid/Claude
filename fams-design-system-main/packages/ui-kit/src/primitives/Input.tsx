import { forwardRef, useId, useState, type InputHTMLAttributes, type ReactNode } from 'react'
import { Eye, EyeOff } from '../icons'
import { cn } from '../lib/cn'

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  /** Floating label — sits centered as the placeholder, floats up to a small
   *  caption inside the top edge once focused or filled (Quasar `outlined`
   *  q-input parity). Omit for a plain input. */
  label?: string
  hasError?: boolean
  /** @deprecated Alias of the native `disabled`, kept for back-compat. */
  isDisabled?: boolean
  /** Icon rendered inside the field at the logical start (before the text). */
  leadingIcon?: ReactNode
  /** Icon rendered inside the field at the logical end (after the text). */
  trailingIcon?: ReactNode
  /**
   * Renders a border-less, background-less, zero-padding `<input>` — for
   * nesting inside a shell that already supplies the outline (e.g.
   * `InsetField`). Ignores `label`/icons/`hasError` styling of the two modes
   * above; the wrapping shell owns all chrome.
   */
  bare?: boolean
  /** Muted, borderless fill — the computed/readonly look (vs. the default
   *  outlined box). Typically paired with the native `readOnly` attribute
   *  rather than `disabled`, so the value stays selectable/copyable. */
  filled?: boolean
  /** Hint text rendered under the field (Figma fields spec) — 12px, inset to
   *  align with the field content; turns destructive when `hasError`. */
  hint?: string
  /** Unit / suffix text rendered inside the field's logical end (e.g. "kg"),
   *  before any `trailingIcon` — generic content slot, no business names. */
  suffix?: ReactNode
  /**
   * Password-visibility mode: with `type="password"`, renders a trailing
   * eye / eye-off toggle that reveals or masks the value. The toggle is a
   * real button ("Show password" / "Hide password"), keyboard operable, and
   * does not steal focus from the input on pointer toggle. Takes the
   * trailing slot (overrides `trailingIcon`); ignored in `bare` mode and for
   * non-password types.
   */
  revealable?: boolean
}

// Floated caption position (focused OR has a value). Two selectors: :focus-within
// via `peer-focus`, and "has value" via `peer-[:not(:placeholder-shown)]`.
// Figma Design System V2 fields spec (node 4802:2485): floated label is a
// 12px semibold caption inside the top edge — no uppercase transform.
const FLOAT =
  'peer-focus:top-[9px] peer-focus:translate-y-0 peer-focus:text-xs peer-focus:font-semibold ' +
  'peer-[:not(:placeholder-shown)]:top-[9px] peer-[:not(:placeholder-shown)]:translate-y-0 peer-[:not(:placeholder-shown)]:text-xs peer-[:not(:placeholder-shown)]:font-semibold'

export const Input = forwardRef<HTMLInputElement, InputProps>(
  (
    {
      className,
      label,
      hasError = false,
      isDisabled,
      disabled,
      id,
      leadingIcon,
      trailingIcon,
      bare = false,
      filled = false,
      revealable = false,
      hint,
      suffix,
      type,
      ...props
    },
    ref,
  ) => {
    const reactId = useId()
    const inputId = id ?? reactId
    const hintId = `${inputId}-hint`
    // Hint line under the field — ps-4 inset, error-colored when invalid
    // (announced via aria-describedby + role=alert per the form-errors spec).
    const hintEl = hint ? (
      <p
        id={hintId}
        role={hasError ? 'alert' : undefined}
        className={cn('ps-4 text-xs font-medium', hasError ? 'text-destructive-emphasis' : 'text-muted-foreground')}
      >
        {hint}
      </p>
    ) : null
    const isDisabledFinal = disabled ?? isDisabled
    const [revealed, setRevealed] = useState(false)
    const hasRevealToggle = revealable && type === 'password' && !bare
    const resolvedType = hasRevealToggle && revealed ? 'text' : type
    // The visibility toggle occupies the trailing slot exclusively.
    const trailingIconFinal = hasRevealToggle ? undefined : trailingIcon
    const revealToggle = hasRevealToggle ? (
      <button
        type="button"
        aria-label={revealed ? 'Hide password' : 'Show password'}
        disabled={isDisabledFinal}
        // Keep focus (and the caret) in the input on pointer toggle; the
        // button stays reachable and operable via Tab + Enter/Space.
        onPointerDown={(e) => e.preventDefault()}
        onClick={() => setRevealed((r) => !r)}
        className={cn(
          'absolute inset-y-0 end-0 flex w-10 items-center justify-center rounded-sm text-muted-foreground outline-none transition-colors',
          'hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-60',
        )}
      >
        {revealed ? (
          <EyeOff className="size-[1.125rem]" aria-hidden />
        ) : (
          <Eye className="size-[1.125rem]" aria-hidden />
        )}
      </button>
    ) : null

    // Bare input — no border/background/padding of its own; a wrapping shell
    // (`InsetField`) supplies the outline. Takes priority over every other mode.
    if (bare) {
      return (
        <input
          ref={ref}
          id={inputId}
          type={type}
          disabled={isDisabledFinal}
          aria-invalid={hasError || undefined}
          className={cn(
            'w-full border-0 bg-transparent p-0 text-sm font-semibold text-foreground outline-none',
            'placeholder:font-normal placeholder:text-muted-foreground disabled:cursor-not-allowed disabled:opacity-60',
            className,
          )}
          {...props}
        />
      )
    }

    // Plain input (inline filters / search) — label above is the caller's job.
    if (!label) {
      const inputEl = (
        <input
          ref={ref}
          id={inputId}
          type={resolvedType}
          disabled={isDisabledFinal}
          aria-invalid={hasError || undefined}
          className={cn(
            'h-11 w-full rounded-sm border bg-input-background text-sm text-foreground outline-none transition-colors',
            'placeholder:text-muted-foreground focus-visible:ring-2 disabled:cursor-not-allowed disabled:bg-muted disabled:opacity-60',
            filled && 'border-transparent bg-muted',
            leadingIcon ? 'ps-9' : 'ps-3.5',
            hasRevealToggle ? 'pe-10' : trailingIconFinal ? 'pe-9' : 'pe-3.5',
            hasError
              ? 'border-destructive focus-visible:border-destructive focus-visible:ring-destructive'
              : 'border-input focus-visible:border-primary focus-visible:ring-ring',
            className,
          )}
          {...props}
        />
      )

      if (!leadingIcon && !trailingIconFinal && !hasRevealToggle && !hint) {
        return inputEl
      }

      if (hint) {
        return (
          <div className="flex w-full flex-col gap-1">
            <div className="relative">
              {leadingIcon ? (
                <span
                  className={cn(
                    'pointer-events-none absolute inset-y-0 start-0 flex w-9 items-center justify-center text-muted-foreground',
                    isDisabledFinal && 'opacity-50',
                  )}
                  aria-hidden
                >
                  {leadingIcon}
                </span>
              ) : null}
              {inputEl}
              {trailingIconFinal ? (
                <span
                  className={cn(
                    'pointer-events-none absolute inset-y-0 end-0 flex w-9 items-center justify-center text-muted-foreground',
                    isDisabledFinal && 'opacity-50',
                  )}
                  aria-hidden
                >
                  {trailingIconFinal}
                </span>
              ) : null}
              {revealToggle}
            </div>
            {hintEl}
          </div>
        )
      }

      return (
        <div className="relative">
          {leadingIcon ? (
            <span
              className={cn(
                'pointer-events-none absolute inset-y-0 start-0 flex w-9 items-center justify-center text-muted-foreground',
                isDisabledFinal && 'opacity-60',
              )}
              aria-hidden
            >
              {leadingIcon}
            </span>
          ) : null}
          {inputEl}
          {trailingIconFinal ? (
            <span
              className={cn(
                'pointer-events-none absolute inset-y-0 end-0 flex w-9 items-center justify-center text-muted-foreground',
                isDisabledFinal && 'opacity-60',
              )}
              aria-hidden
            >
              {trailingIconFinal}
            </span>
          ) : null}
          {revealToggle}
        </div>
      )
    }

    // Floating-label field: placeholder-in-middle → floats up on focus/fill.
    // Figma fields spec (4802:2485): label 14px semibold centered when empty →
    // 12px semibold caption on top; focus = 2px primary outline; disabled =
    // muted fill at 50% opacity; readOnly = "prefilled" muted fill.
    const hasTrailingCluster = Boolean(suffix || trailingIconFinal || hasRevealToggle)
    return (
      <div className="flex w-full flex-col gap-1">
        <div className="relative">
          <input
            ref={ref}
            id={inputId}
            type={resolvedType}
            disabled={isDisabledFinal}
            aria-invalid={hasError || undefined}
            aria-describedby={hint ? hintId : undefined}
            placeholder=" "
            className={cn(
              'peer h-14 w-full rounded-sm border bg-input-background pb-1.5 pt-6 text-sm font-semibold text-foreground outline-none transition-colors',
              // Mouse focus: 1px inset ring + primary border ≈ the Figma 2px
              // border; keyboard focus keeps the systemwide ≥2px ring contract.
              'focus:ring-1 focus:ring-inset focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:bg-muted disabled:opacity-50',
              'read-only:bg-muted',
              leadingIcon ? 'ps-9' : 'ps-3',
              hasRevealToggle ? 'pe-10' : suffix ? 'pe-14' : trailingIconFinal ? 'pe-9' : 'pe-3',
              hasError
                ? 'border-destructive focus:border-destructive focus:ring-destructive'
                : 'border-input focus:border-primary focus:ring-primary',
              className,
            )}
            {...props}
          />
          <label
            htmlFor={inputId}
            className={cn(
              'pointer-events-none absolute top-1/2 flex -translate-y-1/2 items-center gap-1 text-sm font-semibold transition-all duration-fast',
              leadingIcon ? 'start-9' : 'start-3',
              // Errored floating label AND the hint/message below the field
              // both use the darker emphasis shade (error.600) — the bare
              // error.500 border stays as the field's own visual cue (fix7
              // wave 6, P2 sweep: the message/marker used to sit on plain
              // error.500, 3.76:1/3.91:1, failing AA as readable text).
              hasError ? 'text-destructive-emphasis' : 'text-muted-foreground',
              FLOAT,
            )}
          >
            {label}
            {props.required ? (
              <span aria-hidden className="text-xs font-medium text-destructive-emphasis">
                *
              </span>
            ) : null}
          </label>
          {leadingIcon ? (
            <span
              className={cn(
                'pointer-events-none absolute inset-y-0 start-0 flex w-9 items-center justify-center text-muted-foreground',
                isDisabledFinal && 'opacity-50',
              )}
              aria-hidden
            >
              {leadingIcon}
            </span>
          ) : null}
          {hasTrailingCluster && !hasRevealToggle ? (
            <span
              className={cn(
                'pointer-events-none absolute inset-y-0 end-0 flex items-center gap-1 pe-3 text-muted-foreground',
                isDisabledFinal && 'opacity-50',
              )}
              aria-hidden
            >
              {suffix ? <span className="text-sm font-medium">{suffix}</span> : null}
              {trailingIconFinal}
            </span>
          ) : null}
          {revealToggle}
        </div>
        {hintEl}
      </div>
    )
  },
)

Input.displayName = 'Input'
