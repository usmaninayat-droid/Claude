import { useState } from 'react'
import { Logo } from '@fams/ui-kit'
import { LoginPage } from '@fams/v5-templates'
import { DocPage, DocSection, Prose, PropsTable, Guidelines, A11yList, Code } from '../docs'

/**
 * LoginPageDemo — the v5 login split screen (DRAFT, tier-2 pattern).
 *
 * The demo wires a fake sign-in so both target states are exercisable live:
 * any password except "wrong" succeeds (logs to the banner); "wrong" (or the
 * empty/invalid client paths) shows the real error machinery — per-field
 * FieldError rows, both-fields server error, zero-shift shared row.
 */
export default function LoginPageDemo() {
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [errorNonce, setErrorNonce] = useState(0)
  const [lastLogin, setLastLogin] = useState<string | null>(null)

  const handleSubmit = (email: string, password: string) => {
    setSubmitting(true)
    setLastLogin(null)
    window.setTimeout(() => {
      setSubmitting(false)
      if (password === 'wrong') {
        setError('Invalid Email or Password!')
        setErrorNonce((n) => n + 1)
      } else {
        setError(null)
        setLastLogin(email)
      }
    }, 600)
  }

  return (
    <DocPage
      title="LoginPage"
      badge="wip"
      summary="DRAFT — the v5 login split screen. LEFT pane: tenant-variable brand slot (quote, subtext, background, illustration — injected by the consuming app from the tenant manifest, never hardcoded). RIGHT pane: layout-fixed auth column — logo slot, Welcome heading, floating-label email + revealable password, shared error/forgot-password row, loading submit. Controlled presenter: onSubmit(email, password) fires only after client validation; the server error arrives via the error prop."
    >
      <DocSection id="preview" title="Preview">
        <Prose>
          Try it: submit empty for client validation; password <Code>wrong</Code> for the
          server-error state (both fields red, shared zero-shift row with the forgot-password
          link); any other password &quot;signs in&quot;.
          {lastLogin ? ` Last successful login: ${lastLogin}.` : ''}
        </Prose>
        <div className="h-[640px] w-full overflow-hidden rounded-md border border-border">
          <LoginPage
            className="min-h-full"
            logo={<Logo tenant="fams" />}
            supportingText="Log in to FAMS for real-time visibility and operational control."
            brand={{
              quote: 'Your Fleet, Our Technology, Total Control',
              subtext:
                'Experience the power of seamless fleet management with FAMS. Track, monitor, and optimize your entire fleet in real time, ensuring efficiency and safety at every step.',
            }}
            onSubmit={handleSubmit}
            submitting={submitting}
            error={error}
            errorNonce={errorNonce}
            forgotPasswordHref="#forgot"
            onForgotPassword={(e) => e.preventDefault()}
          />
        </div>
      </DocSection>

      <DocSection id="mobile" title="Mobile (below lg)">
        <Prose>
          Below <Code>lg</Code> the page is a different composition, not a squashed desktop: the
          tenant background (<Code>brand.background</Code>) fills the whole viewport, the top
          third is a brand header carrying the tenant&apos;s WHITE logo (
          <Code>brand.mobileLogo</Code> — the desktop <Code>logo</Code> asset is dark-on-white and
          is hidden here), and the auth column becomes a white sheet with large top corners (
          <Code>rounded-t-sheet</Code>, the 28px radius token) that fills to the bottom. The
          heading can differ on mobile via <Code>mobileHeading</Code> (&quot;Login&quot;,
          &quot;Login via Credentials&quot;) while the desktop greeting stays. The button always
          follows the form; a footer (e.g. the <Code>powered-by</Code> variant) is pushed to the
          bottom of the sheet with a safe-area inset.
        </Prose>
        <Prose>
          The switch is <strong>viewport</strong>-driven (Tailwind&apos;s <Code>lg</Code>
          breakpoint), not container-driven — narrow this browser window (or use device
          emulation) to see the frame below flip to the mobile composition.
        </Prose>
        <div className="w-full overflow-x-auto">
          <div className="h-[844px] w-[390px] shrink-0 overflow-hidden rounded-md border border-border">
            <LoginPage
              className="min-h-full"
              heading="Welcome"
              mobileHeading="Login via Credentials"
              brand={{
                background: 'linear-gradient(to bottom, var(--color-primary), var(--color-primary-emphasis, var(--color-primary)))',
                mobileLogo: <Logo tenant="fams" className="text-3xl text-primary-foreground" />,
              }}
              footer={{ kind: 'powered-by', logoSrc: '/favicon.svg' }}
              onSubmit={() => {}}
              forgotPasswordHref="#forgot"
              onForgotPassword={(e) => e.preventDefault()}
            />
          </div>
        </div>
      </DocSection>

      <DocSection id="tenant-slot" title="The tenant brand slot">
        <Prose>
          Everything in the left pane is per-tenant content the consuming app injects —{' '}
          <Code>brand.quote</Code>, <Code>brand.subtext</Code>, <Code>brand.background</Code> (any
          CSS background value, e.g. a brand hex from the tenant manifest), and{' '}
          <Code>brand.illustration</Code>. With no background it falls back to the{' '}
          <Code>primary</Code> token; with no illustration it renders the swappable{' '}
          <Code>LoginBrandIllustration</Code> default. The right pane is layout-fixed across
          tenants — only the <Code>logo</Code> asset swaps.
        </Prose>
      </DocSection>

      <DocSection id="props" title="Props">
        <PropsTable
          rows={[
            { prop: 'onSubmit', type: '(email: string, password: string) => void', required: true, description: 'Fires with trimmed, client-validated credentials. The app performs the sign-in.' },
            { prop: 'submitting', type: 'boolean', description: 'In-flight sign-in — submit shows a spinner and blocks double-submit.' },
            { prop: 'error', type: 'ReactNode | null', description: 'Form-level (server) error. Puts BOTH fields into the error state, renders in the shared row, dismisses on first edit.' },
            { prop: 'errorNonce', type: 'number', description: 'Bump per failed attempt so an identical repeated error re-announces and re-arms.' },
            { prop: 'errorId', type: 'string', description: 'id of the shared error element (aria-describedby target). Default "login-error".' },
            { prop: 'logo', type: 'ReactNode', description: 'Tenant logo for the fixed 148x48 slot.' },
            { prop: 'brand', type: 'LoginBrandPanelProps', description: 'Left-pane tenant content: quote, subtext, background, illustration.' },
            { prop: 'heading / supportingText', type: 'ReactNode', description: 'Auth-pane heading (default "Welcome") and supporting line.' },
            { prop: 'mobileHeading', type: 'ReactNode', description: 'Heading for the mobile sheet only (e.g. "Login via Credentials"). Defaults to heading.' },
            { prop: 'brand.mobileLogo', type: 'ReactNode', description: 'WHITE (on-brand) tenant logo for the mobile brand header — the top third of the screen below lg. Omitted → no header.' },
            { prop: 'forgotPasswordHref / onForgotPassword', type: 'string / (e) => void', description: 'Forgot-password link affordance; renders only when either is given.' },
            { prop: 'footer', type: 'ReactNode', description: 'Footer line; defaults to the FAMS "visit our website" line.' },
            { prop: 'defaultEmail', type: 'string', description: 'Initial email value (remembered session).' },
            { prop: 'showRememberMe', type: 'boolean', description: 'Renders the reserved remember-me group (hidden in the current design; the row slot exists either way).' },
            { prop: 'emailLabel / passwordLabel / submitLabel', type: 'string / string / ReactNode', description: 'Text overrides for the fixed fields and submit.' },
          ]}
        />
      </DocSection>

      <DocSection id="guidelines" title="Guidelines">
        <Guidelines
          dos={[
            'Inject all left-pane content from the tenant manifest — never hardcode a tenant’s quote, color, or imagery in app code.',
            'Bump errorNonce on every failed attempt, even when the message text is identical.',
            'Keep sign-in, session, and navigation in the app layer — the page only reports validated credentials.',
          ]}
          donts={[
            'Don’t disable the submit button before submit — client validation intercepts instead (form-errors spec).',
            'Don’t clear field values on a failed attempt; the page preserves them by design.',
            'Don’t fork the auth pane per tenant — its structure and behavior are layout-fixed.',
          ]}
        />
      </DocSection>

      <DocSection id="a11y" title="Accessibility">
        <A11yList
          items={[
            'Single form — Enter submits from any field; focus order is email → password → eye toggle → forgot password → Login → footer link.',
            'Client validation focuses the first errored field; each error row is role="alert" and referenced via aria-describedby, with aria-invalid on the field.',
            'The server error is one shared alert (id "login-error") referenced by BOTH fields, focused on appearance, and re-announced per errorNonce bump.',
            'The eye toggle is a real button ("Show password"/"Hide password"), keyboard operable, and never steals focus from the input.',
            'The brand pane’s imagery layer is aria-hidden and non-interactive; only the headline/subtext are exposed.',
          ]}
        />
      </DocSection>
    </DocPage>
  )
}
