import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { setupDemoWorker } from '@fams/demo-kit'
import { DemoConsole } from '@fams/demo-kit/console'
import { AppBootSkeleton } from '@fams/v5-templates'
import { installScrollRegionBehavior } from '@fams/ui-kit'
import { getManifest, getResolvedConfig, isEntityConfig, listTenants } from './demo/content'
import { DEFAULT_TENANT } from './demo/demo.config'
import { LoginGate } from './demo/login-gate'
import { buildDemoRuntime, bootstrapDemoApp } from './boot'
import { readParams, switchTo, buildQuery } from './url'
import { readStoredPersona } from './auth-session'
import './styles.css'

/*
 * DEPLOY BASE PATH.
 *
 * Vercel serves this app at the origin root; GitHub Pages project pages serve
 * it under `/MME-FRMS-MVP/`. Vite bakes whichever `--base` the build was given
 * into `import.meta.env.BASE_URL` (always with a trailing slash), and these two
 * derivations are the ONLY things the runtime needs from it:
 *
 *   BASE_PATH  '/MME-FRMS-MVP/'  — service-worker URL, so MSW registers with a
 *                                  scope that covers every request the app
 *                                  makes; also the router's basepath.
 *   API_BASE   '/MME-FRMS-MVP'   — prefix for the demo API. It is applied to
 *                                  BOTH the MSW handler paths and the
 *                                  ApiDataAdapter's fetches (one `baseUrl`
 *                                  feeds both), so they keep matching, and the
 *                                  requests stay inside the worker's scope.
 *
 * Everything else base-related is handled at build time — see
 * scripts/vite-base-literals.mjs for the root-absolute string literals.
 */
const BASE_PATH = import.meta.env.BASE_URL || '/'
const API_BASE = BASE_PATH.replace(/\/$/, '')

// The design system's router reads this to derive its basepath (skeleton-kit's
// buildRouter) — a global rather than an option threaded through
// bootstrapDemoApp, because every layer in between is deploy-agnostic.
;(globalThis as unknown as { __FAMS_BASE_PATH__?: string }).__FAMS_BASE_PATH__ = BASE_PATH

/**
 * App entry. Reads `?tenant=&persona=`, seeds the demo-kit store, starts the MSW
 * worker (the v5 API contract), boots via v5-kit's `bootstrapTenant`, then
 * renders the routed app plus the always-mounted DemoConsole. Tenant/persona
 * switches and seed reset go through a URL update + reload (see `url.ts`).
 *
 * FIRST-FRAME SKELETON: booting awaits the MSW worker and `bootstrapTenant`,
 * which used to leave `document.body` an empty shell for ~1s with nothing on
 * screen (UX MUSTs D.17 / F.27c). The design system's `AppBootSkeleton` is
 * rendered into the root SYNCHRONOUSLY first, on the same React root the real
 * app then re-renders onto, and is handed the first route's resolved blueprint
 * (a bundled JSON lookup, no await) so it can paint that module's own skeleton
 * at loaded dimensions. No UI is authored here — rule zero holds.
 *
 * PRE-BOOT LOGIN GATE: with no `?persona=` param (QA deep links keep working
 * unchanged) and no stored session (`auth-session.ts`), the DS LoginPage
 * renders INSTEAD of booting the shell; a successful login stores the persona
 * and reloads into the normal boot below. Logout lands back here via
 * `logoutToLogin`.
 */
/** The resolved blueprint for the module the URL points at, if any. Purely
 *  synchronous — `resolved/` blueprints are bundled JSON. */
function bootModuleConfig(tenant: string) {
  const id = window.location.pathname.split('/')[1]
  if (!id) return undefined
  try {
    if (!getManifest(tenant).modules.includes(id)) return undefined
    const config = getResolvedConfig(tenant, id)
    return isEntityConfig(config) ? config : undefined
  } catch {
    return undefined
  }
}

async function main() {
  const rootEl = document.getElementById('root')
  if (!rootEl) throw new Error('#root not found')

  // Overlay-scrollbar reveal (`.fams-scroll-region`, @fams/tokens/scrollbars.css)
  // — one document-level listener for the whole app, idempotent, so any
  // container that adopts the class gets the "reveal while scrolling" state
  // for free without wiring its own listener.
  installScrollRegionBehavior()

  const tenants = listTenants()
  const params = readParams(DEFAULT_TENANT)
  const root = createRoot(rootEl)

  // bfcache guard (WP3 logout QA): browser Back can restore an AUTHED page
  // snapshot from the back-forward cache after logout, without re-running this
  // boot. If the page is restored from bfcache and no session survives (no
  // `?persona=` deep link, no stored persona), force a reload so the login
  // gate re-engages — "session invalidated, not just route change".
  window.addEventListener('pageshow', (event) => {
    if (!event.persisted) return
    const p = readParams(DEFAULT_TENANT)
    if (!(p.persona ?? readStoredPersona(p.tenant))) window.location.reload()
  })

  const personaId = params.persona ?? readStoredPersona(params.tenant)
  if (!personaId) {
    // Activate the tenant's token block (colors/font) before boot — the login
    // page is themed per tenant like everything else.
    document.documentElement.dataset.tenant = params.tenant
    root.render(
      <StrictMode>
        <LoginGate tenant={params.tenant} />
      </StrictMode>,
    )
    return
  }

  // Paint before the awaits below — same root, so the real app replaces it.
  document.documentElement.dataset.tenant = params.tenant
  root.render(<AppBootSkeleton config={bootModuleConfig(params.tenant)} />)

  const runtime = buildDemoRuntime({ tenant: params.tenant, personaId, baseUrl: API_BASE })

  // Start MSW in the browser — the frontend never calls it directly; the
  // ApiDataAdapter's fetches are transparently intercepted.
  const worker = await setupDemoWorker(runtime.handlers)
  await worker.start({
    onUnhandledRequest: 'bypass',
    quiet: true,
    // Under a subpath deploy the worker script lives at `<base>mockServiceWorker.js`
    // and therefore registers at scope `<base>` — which is exactly the scope the
    // API_BASE-prefixed requests above fall under.
    serviceWorker: { url: `${BASE_PATH}mockServiceWorker.js` },
  })

  /*
   * `?slowRecords=1` — QA seam only (round-5 UX gate N4), OFF by default.
   *
   * Without it this host fills every render buffer before the first paint, so
   * the design system's list loading skeleton is permanently unreachable and
   * no gate can produce evidence that UX-2's skeleton clause holds. With it,
   * the buffers start empty (what a real async host looks like) and fill after
   * a beat; the root is then re-rendered under a new key so the composer
   * re-reads them. Deliberately a full remount rather than a reactive store:
   * the seam exists to make one first-paint state observable, not to retrofit
   * async data flow into a demo whose contract is synchronous.
   */
  const slowRecords = new URLSearchParams(window.location.search).get('slowRecords') === '1'
  const booted = await bootstrapDemoApp(runtime, { deferRecordsMs: slowRecords ? 1500 : 0 })
  const { App, router, modules } = booted.app

  // `root` is already created above — the login gate and the first-frame
  // skeleton render onto it before this point, and the real app must replace
  // them on the SAME root (a second `createRoot` would orphan the skeleton).
  const renderApp = (pass: number) =>
    root.render(
    <StrictMode key={pass}>
      <App />
      <DemoConsole
        title="FAMS demo console"
        tenants={tenants.map((t) => ({ id: t.id, label: t.name }))}
        currentTenantId={runtime.tenant}
        onSelectTenant={(id) => switchTo({ tenant: id, persona: null })}
        personas={runtime.users.map((u) => ({
          id: u.id,
          label: u.persona ? `${u.name} — ${u.persona}` : u.name,
          roles: u.roles,
        }))}
        currentPersonaId={runtime.personaId}
        onSelectPersona={(id) => switchTo({ tenant: runtime.tenant, persona: id })}
        modules={modules.map((m) => ({ id: m.id, label: m.navEntry.label }))}
        onNavigateModule={(id) => {
          const m = modules.find((x) => x.id === id)
          if (m) void router.navigate({ to: m.navEntry.path })
        }}
        onResetSeeds={() => {
          runtime.store.reset()
          window.location.reload()
        }}
        getShareLink={() =>
          window.location.origin + buildQuery({ tenant: runtime.tenant, persona: runtime.personaId })
        }
      />
    </StrictMode>,
    )

  renderApp(0)
  // Resolved already on the normal path, so this is a no-op re-render there;
  // under `?slowRecords=1` it is what swaps the skeleton for the real rows.
  if (slowRecords) void booted.recordsReady.then(() => renderApp(1))
}

void main()
