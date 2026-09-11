import {
  useEffect,
  useRef,
  useState,
  type FormEvent,
  type MouseEvent,
  type ReactNode,
} from 'react'
import { Button, Checkbox, FieldError, FieldErrorSlot, Input, Label } from '@fams/ui-kit'
import { cn } from '../lib/cn'
import { LoginBrandPanel, type LoginBrandPanelProps } from './LoginBrandPanel'

/**
 * LoginPage — the v5 login split screen. [v5 pattern — tier 2]
 *
 * LEFT pane: tenant-variable brand slot (`LoginBrandPanel` — quote, subtext,
 * background, illustration all injected by the consuming app, e.g. from the
 * tenant manifest's `login` branding section). RIGHT pane: the layout-fixed
 * auth column — logo slot, "Welcome" heading, supporting line, floating-label
 * email + revealable password fields, shared error/forgot-password row,
 * primary submit, footer line. Structure and behavior are identical across
 * tenants; only the brand slot and logo swap.
 *
 * Controlled presenter (root rule 8): no data fetching inside. Field values
 * are form-local state; `onSubmit(email, password)` fires only after client
 * validation passes. The server ("Invalid Email or Password!") error arrives
 * via the `error` prop — bump `errorNonce` on every failed attempt so a
 * repeated identical failure re-announces and re-arms the row.
 *
 * Validation per the form-errors spec: required-empty / malformed-email
 * errors on submit, per-field `FieldError` rows, focus moves to the first
 * errored field, errors clear on input (not blur). A server error puts BOTH
 * fields into the error state, is referenced by both via
 * `aria-describedby` + `aria-invalid`, and shares a zero-shift row
 * (`FieldErrorSlot`) with the forgot-password link.
 *
 * Responsive: the auth pane keeps a fixed content column and never shrinks
 * below its min width; the brand pane is the flex side and crops. The page
 * never scrolls horizontally; short viewports scroll vertically (the footer
 * flows after content, never overlapping the button).
 *
 * MOBILE (below `lg`, where the desktop brand pane collapses) is a distinct
 * composition, not a squashed desktop — the designer's mobile refs:
 *   1. the tenant brand background (`brand.background`, gradient or flat)
 *      fills the WHOLE viewport, fixed behind everything;
 *   2. a brand header of ~a third of the viewport carries the tenant's WHITE
 *      on-brand logo (`brand.mobileLogo`) centered — the desktop `logo` asset
 *      is dark-on-white and is hidden here;
 *   3. the auth column becomes a white SHEET with large top corners
 *      (`rounded-t-sheet`, the 28px radius token) that fills to the bottom,
 *      top-aligned content, 32px padding, safe-area inset at the bottom.
 * One layout rule spans both refs (FAMS puts the button right under the
 * fields, UCCP pins it low with a powered-by line beneath): the button always
 * FOLLOWS the form, and the footer is pushed to the bottom of the sheet
 * (`mt-auto`) — with no footer the fields+button simply sit at the top.
 * The sheet itself scrolls, so the on-screen keyboard never traps a field.
 */
export interface LoginPageProps {
  /** Tenant logo for the fixed 148x48 slot (asset swaps per tenant). */
  logo?: ReactNode
  /** Heading — defaults to "Welcome". */
  heading?: ReactNode
  /**
   * Heading for the MOBILE composition only (below `lg`), where the refs call
   * for an action title ("Login", "Login via Credentials") instead of the
   * desktop greeting. Defaults to `heading`, so a consumer that wants one
   * title everywhere just sets `heading`.
   */
  mobileHeading?: ReactNode
  /** Supporting line under the heading. */
  supportingText?: ReactNode
  /** Left brand pane content (tenant-injected). Omitted fields fall back to
   *  the token-styled defaults in `LoginBrandPanel`. */
  brand?: LoginBrandPanelProps
  /** Called with the validated credentials. The app performs the sign-in. */
  onSubmit: (email: string, password: string) => void
  /** In-flight sign-in: submit shows a spinner and blocks double-submit. */
  submitting?: boolean
  /**
   * Form-level (server) error, e.g. "Invalid Email or Password!". Puts both
   * fields into the error state and renders in the shared row. Cleared
   * visually as soon as the user edits either field.
   */
  error?: ReactNode | null
  /** Bump per failed attempt so an identical repeated `error` re-announces. */
  errorNonce?: number
  /** id of the shared server-error element (aria-describedby target). */
  errorId?: string
  /** Forgot-password affordance — href and/or click handler. */
  forgotPasswordHref?: string
  onForgotPassword?: (event: MouseEvent<HTMLAnchorElement>) => void
  /**
   * Footer line. Defaults to the FAMS "visit our website" line.
   *
   * Either a raw `ReactNode` (full control), or the typed `"powered-by"`
   * variant — a centered "Powered by" label + brand logo/wordmark, used by
   * tenants whose login spec calls for a powered-by line instead of a
   * marketing link (e.g. UCCP).
   */
  footer?: ReactNode | LoginFooterConfig
  /** Initial email value (e.g. a remembered session). */
  defaultEmail?: string
  /**
   * Render the reserved remember-me group (hidden in the current design —
   * the slot exists in the layout either way; see the login spec).
   */
  showRememberMe?: boolean
  emailLabel?: string
  passwordLabel?: string
  submitLabel?: ReactNode
  className?: string
}

/** The typed "powered-by" footer variant — see `LoginPageProps.footer`. */
export interface LoginFooterConfig {
  kind: 'powered-by'
  /** Brand logo/wordmark asset URL, rendered small next to the label. */
  logoSrc: string
  /** Defaults to "Powered by". */
  label?: ReactNode
}

function isLoginFooterConfig(footer: ReactNode | LoginFooterConfig): footer is LoginFooterConfig {
  return typeof footer === 'object' && footer !== null && 'kind' in footer && footer.kind === 'powered-by'
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

interface ClientErrors {
  email?: string
  password?: string
}

export function LoginPage({
  logo,
  heading = 'Welcome',
  mobileHeading,
  supportingText,
  brand,
  onSubmit,
  submitting = false,
  error = null,
  errorNonce = 0,
  errorId = 'login-error',
  forgotPasswordHref,
  onForgotPassword,
  footer,
  defaultEmail = '',
  showRememberMe = false,
  emailLabel = 'Email',
  passwordLabel = 'Password',
  submitLabel = 'Login',
  className,
}: LoginPageProps) {
  const [email, setEmail] = useState(defaultEmail)
  const [password, setPassword] = useState('')
  const [clientErrors, setClientErrors] = useState<ClientErrors>({})
  const [remember, setRemember] = useState(false)
  // A server error stays visible until the user edits a field; a new failed
  // attempt (errorNonce bump or new message) re-arms it.
  const [serverErrorDismissed, setServerErrorDismissed] = useState(false)

  const emailRef = useRef<HTMLInputElement>(null)
  const passwordRef = useRef<HTMLInputElement>(null)
  const serverErrorRef = useRef<HTMLParagraphElement>(null)

  const serverErrorVisible = error != null && error !== '' && !serverErrorDismissed

  useEffect(() => {
    setServerErrorDismissed(false)
  }, [error, errorNonce])

  // On a (re-)announced server error, move focus to the alert region so it is
  // discoverable — without clearing the fields (form-errors spec).
  useEffect(() => {
    if (error != null && error !== '') serverErrorRef.current?.focus()
  }, [error, errorNonce])

  const emailHasError = Boolean(clientErrors.email) || serverErrorVisible
  const passwordHasError = Boolean(clientErrors.password) || serverErrorVisible

  const emailErrorId = 'login-email-error'
  const passwordErrorId = 'login-password-error'

  const describedBy = (fieldErrorId: string, fieldError?: string) => {
    const ids: string[] = []
    if (fieldError) ids.push(fieldErrorId)
    if (serverErrorVisible) ids.push(errorId)
    return ids.length ? ids.join(' ') : undefined
  }

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (submitting) return
    const trimmed = email.trim()
    const next: ClientErrors = {}
    if (!trimmed) next.email = 'Email is required'
    else if (!EMAIL_RE.test(trimmed)) next.email = 'Enter a valid email address'
    if (!password) next.password = 'Password is required'
    setClientErrors(next)
    if (next.email) {
      emailRef.current?.focus()
      return
    }
    if (next.password) {
      passwordRef.current?.focus()
      return
    }
    onSubmit(trimmed, password)
  }

  return (
    <div
      data-slot="login-page"
      className={cn(
        'relative flex min-h-dvh w-full flex-col overflow-x-hidden bg-background text-foreground lg:flex-row',
        className,
      )}
    >
      {/* MOBILE brand backdrop — the tenant background across the WHOLE
          viewport, behind the header AND behind/around the sheet (so an
          overscroll or a short sheet never reveals the grey page color).
          `fixed` rather than `absolute` for the same reason. Decorative. */}
      <div
        aria-hidden
        data-slot="login-mobile-backdrop"
        className={cn('pointer-events-none fixed inset-0 lg:hidden', !brand?.background && 'bg-primary')}
        style={brand?.background ? { background: brand.background } : undefined}
      />

      {/* MOBILE brand header — ~a third of the viewport, the tenant's WHITE
          on-brand logo centered on the backdrop. `33dvh` (not vh) so the
          mobile-browser toolbars don't push the sheet off-screen; measured
          off the designer's refs (the sheet's top edge sits at ~22% of the
          frame in both), with a 7.5rem floor so the logo still has room on a
          short/landscape viewport. Skipped when no white asset is supplied. */}
      {brand?.mobileLogo ? (
        <div
          data-slot="login-mobile-brand"
          className="relative flex h-[22dvh] min-h-[7.5rem] w-full shrink-0 items-center justify-center px-6 pt-[env(safe-area-inset-top)] text-primary-foreground lg:hidden"
        >
          {brand.mobileLogo}
        </div>
      ) : null}

      {/* Brand pane — the flex/shrink side; crops at smaller widths, collapses below lg. */}
      <aside className="hidden min-w-0 flex-1 lg:block">
        <LoginBrandPanel {...brand} />
      </aside>

      {/* Auth pane — layout-fixed; never shrinks below its min width.
          White surface per the login spec (Base/base-light), NOT the grey
          page background. */}
      <main
        data-slot="login-sheet"
        className="relative flex w-full flex-1 flex-col items-center rounded-t-sheet bg-surface-primary p-8 pb-[max(2rem,env(safe-area-inset-bottom))] lg:rounded-none lg:px-6 lg:py-10 lg:pb-10 lg:w-[35%] lg:min-w-[30rem] lg:flex-none"
      >
        <form
          noValidate
          onSubmit={handleSubmit}
          className="flex w-full max-w-[27.5rem] flex-1 flex-col lg:justify-center"
        >
          {/* The desktop logo asset is dark-on-white — on mobile the WHITE
              `brand.mobileLogo` in the brand header above stands in for it. */}
          {logo ? <div className="mb-8 hidden h-12 w-[9.25rem] items-center lg:flex">{logo}</div> : null}

          {/* One heading node unless the consumer actually asked for a
              different mobile title — only then are two rendered, each
              display-toggled (so exactly one is exposed to AT at any width)
              rather than duplicating the same string into the accessible
              name at every viewport. */}
          <h1 className="text-[2.25rem] font-bold leading-tight lg:text-[2rem]">
            {mobileHeading == null || mobileHeading === heading ? (
              heading
            ) : (
              <>
                <span className="lg:hidden">{mobileHeading}</span>
                <span className="hidden lg:inline">{heading}</span>
              </>
            )}
          </h1>
          {supportingText ? (
            // Grey-400 per spec — one step lighter than the default muted text.
            <p className="mt-2 max-w-[24rem] text-base font-medium leading-5 text-gray-400">
              {supportingText}
            </p>
          ) : null}

          {/* Each field carries an ALWAYS-RESERVED error row (`FieldErrorSlot`,
              12px below the field box — the codified field→error spacing) so
              the Login button never moves when client validation errors
              appear/clear (UX-NOTES §2 zero-shift rule). The 2px group gap +
              12px slot gap + 18px slot = the spec's 32px field-to-field rhythm. */}
          <div className="mt-8 flex flex-col gap-0.5">
            <div className="flex flex-col">
              <Input
                ref={emailRef}
                id="login-email"
                type="email"
                autoComplete="username"
                label={emailLabel}
                value={email}
                hasError={emailHasError}
                aria-describedby={describedBy(emailErrorId, clientErrors.email)}
                className="h-[3.5rem] lg:h-[3.375rem]"
                onChange={(e) => {
                  setEmail(e.target.value)
                  if (clientErrors.email) setClientErrors((c) => ({ ...c, email: undefined }))
                  if (serverErrorVisible) setServerErrorDismissed(true)
                }}
              />
              <FieldErrorSlot className="mt-3">
                {clientErrors.email ? <FieldError id={emailErrorId}>{clientErrors.email}</FieldError> : null}
              </FieldErrorSlot>
            </div>

            <div className="flex flex-col">
              <Input
                ref={passwordRef}
                id="login-password"
                type="password"
                revealable
                autoComplete="current-password"
                label={passwordLabel}
                value={password}
                hasError={passwordHasError}
                aria-describedby={describedBy(passwordErrorId, clientErrors.password)}
                className="h-[3.5rem] lg:h-[3.375rem]"
                onChange={(e) => {
                  setPassword(e.target.value)
                  if (clientErrors.password) setClientErrors((c) => ({ ...c, password: undefined }))
                  if (serverErrorVisible) setServerErrorDismissed(true)
                }}
              />
              <FieldErrorSlot className="mt-3">
                {clientErrors.password ? (
                  <FieldError id={passwordErrorId}>{clientErrors.password}</FieldError>
                ) : serverErrorVisible ? (
                  /* Form-level (server) error renders INSIDE the password's
                     already-reserved slot — exactly 12px below the field box
                     (the codified field→error token) instead of stacking the
                     empty slot + shared-row offset beneath it (round-2 visual
                     P1: 33px vs spec 12px). The slot is reserved either way,
                     so nothing below shifts (UX-NOTES §2 zero-shift rule). */
                  <FieldError key={errorNonce} ref={serverErrorRef} id={errorId} tabIndex={-1}>
                    {error}
                  </FieldError>
                ) : null}
              </FieldErrorSlot>
            </div>
          </div>

          {/* Shared zero-shift row: the reserved remember-me group at the
              start, forgot-password at the end. Sits directly after the
              password field's reserved slot (no extra margin) so the vertical
              rhythm stays close to the Figma frame. The form-level server
              error does NOT render here — it uses the password field's
              reserved slot above (12px field→error token). */}
          <div className="flex items-center justify-between gap-4">
            <FieldErrorSlot className="min-w-0 flex-1">
              {showRememberMe ? (
                <span className="flex items-center gap-2">
                  <Checkbox
                    id="login-remember"
                    checked={remember}
                    onCheckedChange={(v) => setRemember(v === true)}
                  />
                  <Label htmlFor="login-remember" className="text-base font-semibold text-muted-foreground">
                    Remember me
                  </Label>
                </span>
              ) : null}
            </FieldErrorSlot>
            {forgotPasswordHref || onForgotPassword ? (
              <a
                href={forgotPasswordHref ?? '#'}
                onClick={(event) => {
                  // Not every browser focuses a link on mouse click; focusing
                  // here makes this link the focus-restore target of whatever
                  // the consumer opens from it (e.g. the demo password-reset
                  // Dialog), so close returns focus HERE on every path
                  // (UX-NOTES §7).
                  event.currentTarget.focus()
                  onForgotPassword?.(event)
                }}
                className="shrink-0 whitespace-nowrap text-base font-bold text-primary outline-none hover:underline focus-visible:rounded-xs focus-visible:ring-2 focus-visible:ring-primary/25"
              >
                Forgot password?
              </a>
            ) : null}
          </div>

          <Button
            type="submit"
            loading={submitting}
            className="mt-8 h-[3.75rem] w-full rounded-sm text-lg font-semibold lg:mt-12"
          >
            {submitLabel}
          </Button>
        </form>

        <footer className="mt-auto w-full max-w-[27.5rem] pt-4 lg:mt-10 text-center text-base font-medium text-muted-foreground">
          {footer == null ? (
            <>
              For more information, visit our website{' '}
              <a
                href="https://www.fams.com/"
                target="_blank"
                rel="noopener noreferrer"
                className="font-semibold text-primary outline-none hover:underline focus-visible:rounded-xs focus-visible:ring-2 focus-visible:ring-primary/25"
              >
                www.fams.com
              </a>
            </>
          ) : isLoginFooterConfig(footer) ? (
            <span className="inline-flex items-center justify-center gap-2">
              <span>{footer.label ?? 'Powered by'}</span>
              <img src={footer.logoSrc} alt="" className="h-[1.125rem] w-auto" />
            </span>
          ) : (
            footer
          )}
        </footer>
      </main>
    </div>
  )
}
