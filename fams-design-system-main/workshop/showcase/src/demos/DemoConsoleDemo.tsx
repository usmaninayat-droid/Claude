import { useState } from 'react'
import { DemoConsole } from '../../../../packages/demo-kit/src/console'
import { DocPage, DocSection, Prose, PropsTable, Guidelines, A11yList, DevNote } from '../docs'

/**
 * DemoConsoleDemo — showcase page for `@fams/demo-kit/console`. The console uses
 * fixed positioning (it hugs the viewport top edge), so it's mounted behind a
 * toggle rather than inline: mount it, then hover the very top edge of the
 * window to reveal the handle, or press Tab to reach the visually-hidden
 * trigger. All controls here are wired to mock callbacks that log to an
 * on-page activity list — in the real demo app they drive tenant/persona/
 * navigation.
 */
export default function DemoConsoleDemo() {
  const [mounted, setMounted] = useState(false)
  const [tenant, setTenant] = useState('acme')
  const [persona, setPersona] = useState<string | null>('u_admin')
  const [log, setLog] = useState<string[]>([])
  const note = (msg: string) => setLog((l) => [msg, ...l].slice(0, 6))

  return (
    <DocPage
      title="DemoConsole"
      badge="beta"
      summary="The demo environment's hover-reveal control surface (decision #18). Core-tier and product-agnostic: tenant / persona / module-jump / seed-reset / share-link are all wired by the app via callbacks. Lives at @fams/demo-kit/console."
    >
      <DocSection id="preview" title="Preview">
        <Prose>
          Mount the console, then move the pointer to the very top edge of the window to reveal the
          slim handle, or press Tab to focus the visually-hidden “Open demo console” trigger. Esc,
          the scrim, or the Esc button closes it.
        </Prose>
        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={() => setMounted((m) => !m)}
            className="rounded-sm border border-border bg-primary px-4 py-2 text-body text-primary-foreground"
          >
            {mounted ? 'Unmount demo console' : 'Mount demo console'}
          </button>
          <span className="text-caption text-muted-foreground">
            tenant: <strong>{tenant}</strong> · persona: <strong>{persona ?? '—'}</strong>
          </span>
        </div>

        <ul className="flex flex-col gap-1 rounded-sm border border-border bg-card p-4 text-caption text-muted-foreground">
          {log.length === 0 && <li>No activity yet — open the console and use a control.</li>}
          {log.map((l, i) => (
            <li key={i}>{l}</li>
          ))}
        </ul>

        {mounted && (
          <DemoConsole
            tenants={[
              { id: 'acme', label: 'Acme Corp' },
              { id: 'beta', label: 'Beta Industries' },
            ]}
            currentTenantId={tenant}
            onSelectTenant={(id) => {
              setTenant(id)
              note(`Switch tenant → ${id}`)
            }}
            personas={[
              { id: 'u_admin', label: 'Avery Stone (Admin)', roles: ['admin'] },
              { id: 'u_disp', label: 'Dana Reyes (Dispatcher)', roles: ['dispatcher'] },
            ]}
            currentPersonaId={persona}
            onSelectPersona={(id) => {
              setPersona(id)
              note(`Switch persona → ${id}`)
            }}
            modules={[
              { id: 'companies', label: 'Companies' },
              { id: 'contacts', label: 'Contacts' },
            ]}
            onNavigateModule={(id) => note(`Navigate module → ${id}`)}
            onResetSeeds={() => note('Reset seed data')}
            getShareLink={() =>
              `${location.origin}${location.pathname}?tenant=${tenant}&persona=${persona ?? ''}`
            }
          />
        )}
      </DocSection>

      <DocSection id="props" title="Props">
        <PropsTable
          rows={[
            { prop: 'tenants', type: 'DemoConsoleOption[]', required: true, description: 'Tenant options ({ id, label }).' },
            { prop: 'currentTenantId', type: 'string', required: true, description: 'Currently selected tenant id.' },
            { prop: 'onSelectTenant', type: '(id: string) => void', required: true, description: 'Called when a tenant is chosen.' },
            { prop: 'personas', type: 'DemoConsolePersona[]', required: true, description: 'Persona options ({ id, label, roles? }).' },
            { prop: 'currentPersonaId', type: 'string | null', required: true, description: 'Currently active persona id.' },
            { prop: 'onSelectPersona', type: '(id: string) => void', required: true, description: 'Called when a persona is chosen.' },
            { prop: 'modules', type: 'DemoConsoleOption[]', required: true, description: 'Module jump list.' },
            { prop: 'onNavigateModule', type: '(id: string) => void', required: true, description: 'Called on module jump (also closes the console).' },
            { prop: 'onResetSeeds', type: '() => void', required: true, description: 'Called after the two-step reset confirm.' },
            { prop: 'getShareLink', type: '() => string', required: true, description: 'Returns the URL; the console copies it + shows feedback.' },
            { prop: 'title', type: 'string', required: false, description: 'Console title (default "Demo console").' },
            { prop: 'defaultOpen', type: 'boolean', required: false, description: 'Start opened — for tests / this preview.' },
          ]}
        />
        <DevNote>
          The console holds no data and no product vocabulary. The app owns tenant/persona/module
          state and passes it down — this is the same state-agnostic contract every DS component
          follows (rule 8).
        </DevNote>
      </DocSection>

      <DocSection id="guidelines" title="Guidelines">
        <Guidelines
          dos={[
            'Wire every callback to the app’s real tenant/persona/router state.',
            'Keep it mounted once at the app root, above the routed content.',
            'Use getShareLink to return a URL that reproduces the current tenant + persona.',
          ]}
          donts={[
            'Don’t put product logic in the console — it is a control surface only.',
            'Don’t rely on hover alone; the keyboard trigger must stay reachable.',
          ]}
        />
      </DocSection>

      <DocSection id="a11y" title="Accessibility">
        <A11yList
          items={[
            'A visually-hidden, always-focusable trigger opens the console without a pointer.',
            'The overlay is a labelled role="dialog" aria-modal; Escape closes it and focus moves in on open.',
            'Tenant/persona use radiogroup semantics with aria-checked; share-link feedback is a role="status" live region.',
            'Passes the package axe sweep with the overlay rendered open.',
          ]}
        />
      </DocSection>
    </DocPage>
  )
}
