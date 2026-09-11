import { useEffect, useState } from 'react'
import {
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Logo,
  type Tenant,
} from '@fams/ui-kit'
import { LoginPage } from '@fams/v5-templates'
import { getManifest, getUsers } from './content'
import { storePersona } from '../auth-session'
import { buildQuery } from '../url'

/**
 * LoginGate — the pre-boot login surface (human-gated wiring seam; composes
 * ONLY `@fams/*` components, rule zero). Rendered by `main.tsx` when neither
 * a `?persona=` param nor a stored session exists; on success it stores the
 * matched persona and reloads, so the normal boot path runs with a session.
 *
 * Demo auth semantics: the email must match a seeded persona's email
 * (`tenants/<t>/seeds/users.json`); any password signs in EXCEPT the literal
 * "wrong", kept failing so the server-error state stays demonstrable. A
 * persona may carry an optional `password` field — when present, login must
 * match it exactly (still rejecting "wrong"); personas without it keep the
 * default any-password behaviour so other tenants are unaffected.
 * Unknown email, wrong password, or "wrong" → the shared
 * "Invalid Email or Password!" row.
 *
 * Branding assets come from the tenant manifest's `login` section:
 * `login.logo` (real logo asset for the 148x48 slot — the FAMS hex-cube +
 * "FAMS BY FALKENHERZ" export; tenants without one keep the `Logo` wordmark,
 * e.g. iwmp/Tadweer) and `login.illustration` (the flattened brand-pane
 * artwork; tenants without one keep the DS's generic illustration).
 *
 * Forgot-password is a DEMO STUB by design (documented assumption: the demo
 * has no reset flow or mail loop): clicking opens a small DS `Dialog` —
 * "Password reset — contact your administrator" — keyboard-dismissable
 * (Escape / the Close button), so the affordance is never a silent no-op
 * (round-1 QA P1 `forgot-password-link`).
 */
const WRONG_PASSWORD = 'wrong'
const KNOWN_LOGO_TENANTS: ReadonlySet<string> = new Set(['fams', 'tadweer', 'iwmp', 'ead', 'mm', 'uccp'])

export function LoginGate({ tenant }: { tenant: string }) {
  // The login screen is SPEC-LOCKED LIGHT (Figma 32171:8228: white auth pane,
  // light outlined inputs, dark "Welcome"). skeleton-kit's theme bootstrap
  // resolves `data-theme` from storage/OS — under OS dark mode that flipped
  // the auth pane to the dark `surface-primary` override (navy). Pin the
  // light theme for the lifetime of the gate; the post-login boot path
  // re-runs bootstrapTheme and restores the user's preference.
  useEffect(() => {
    const root = document.documentElement
    const prev = root.getAttribute('data-theme')
    root.setAttribute('data-theme', 'light')
    return () => {
      if (prev) root.setAttribute('data-theme', prev)
      else root.removeAttribute('data-theme')
    }
  }, [])

  const manifest = getManifest(tenant)
  const users = getUsers(tenant)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [errorNonce, setErrorNonce] = useState(0)
  const [resetOpen, setResetOpen] = useState(false)

  const handleSubmit = (email: string, password: string) => {
    setSubmitting(true)
    // Small latency so the button's loading state is a real, visible state.
    window.setTimeout(() => {
      const match = users.find((u) => u.email?.toLowerCase() === email.toLowerCase())
      const passwordOk = match ? (match.password ? password === match.password : password !== WRONG_PASSWORD) : false
      if (!match || !passwordOk) {
        setSubmitting(false)
        setError('Invalid Email or Password!')
        setErrorNonce((n) => n + 1)
        return
      }
      storePersona(tenant, match.id)
      // Reload without a persona param — boot resumes from the stored session
      // (`?tenant=` preserved; same full-reload philosophy as url.ts switchTo).
      window.location.href = buildQuery({ tenant, persona: null })
    }, 650)
  }

  return (
    <>
      <LoginPage
        logo={
          <Logo
            tenant={KNOWN_LOGO_TENANTS.has(tenant) ? (tenant as Tenant) : undefined}
            src={manifest.login?.logo}
            className={manifest.login?.logo ? undefined : 'text-3xl'}
          />
        }
        supportingText={
          manifest.login?.supportingText ?? `Log in to ${manifest.name} for real-time visibility and operational control.`
        }
        brand={{
          quote: manifest.login?.quote,
          subtext: manifest.login?.subtext,
          background: manifest.login?.background,
          illustrationSrc: manifest.login?.illustration,
        }}
        footer={manifest.login?.footer}
        onSubmit={handleSubmit}
        submitting={submitting}
        error={error}
        errorNonce={errorNonce}
        forgotPasswordHref="#forgot-password"
        onForgotPassword={(e) => {
          e.preventDefault()
          setResetOpen(true)
        }}
      />

      <Dialog open={resetOpen} onOpenChange={setResetOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Password reset</DialogTitle>
            <DialogDescription>
              This demo environment has no self-service password reset — contact your
              administrator to reset your password.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button type="button" onClick={() => setResetOpen(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
