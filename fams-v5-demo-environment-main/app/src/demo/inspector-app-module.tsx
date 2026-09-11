import { createLazyRoute } from '@tanstack/react-router'
import type { ModuleRouteLoader } from '@fams/skeleton-kit'

/**
 * Inspector App (2026-09-03) — the UCCP tenant's Inspector-role experience,
 * ported as-is from `/Users/apple/Desktop/New DS Projects/QATAR MME -
 * Inspector App` (`src/inspector-v5` + its vendored `@ds` tree) into
 * `tenants/uccp/overrides/screens/inspector-app`. Same isolation route as
 * operations-center/planning-v2/inspector-shifts: the copied source pins
 * React 18.3.1 and this host runs React 19, so it runs its own Vite dev
 * server (port :6390, see that screen's vite.config.ts).
 *
 * UNLIKE the other three ported screens, this one is NOT wrapped in the
 * shell's `ModuleViewShell` tab strip — its nav entry declares
 * `fullScreen: true` (skeleton-kit NavEntry v1.2, same seam `command-center`
 * uses), so `V5AppShell` suppresses the rail + top bar (and with them, the
 * app switcher) for this route entirely. This is a deliberate, locked
 * product decision, not an oversight: the Inspector app is ONE dedicated
 * UCCP application with its OWN set of modules (Dashboard, Requests &
 * Complaints, Plan Monitoring) navigated via the vendored bundle's OWN
 * internal rail/bottom-nav (`src/inspector-v5/shell` + `mobile`) — an
 * inspector never navigates across FAMS apps, so the canonical shell never
 * offers a way to. The bundle is also fully self-contained (its own
 * in-memory `InspectorStoreProvider`, no calls back into the host's MSW
 * layer) — same "opaque embedded app" contract as the other three screens.
 *
 * Production note: this iframe's `src` should point at wherever this
 * screen's own `vite build` output is served from (a static bundle alongside
 * the host, at `/screens/inspector-app/index.html`) — not hardcoded to the
 * dev server, which is a dev-time convenience only (same caveat as the other
 * three ported bundles; see `scripts/vercel-build.sh`).
 */
function inspectorAppIframeSrc(): string {
  return import.meta.env.DEV ? 'http://localhost:6390/' : '/screens/inspector-app/index.html'
}

function InspectorAppPage() {
  return (
    <iframe
      title="Inspector"
      src={inspectorAppIframeSrc()}
      style={{ border: 'none', width: '100%', height: '100%', display: 'block' }}
    />
  )
}

export function makeInspectorAppRoute(path: string): ModuleRouteLoader {
  return () => Promise.resolve(createLazyRoute(path)({ component: InspectorAppPage }))
}
