import { createLazyRoute } from '@tanstack/react-router'
import type { ModuleRouteLoader } from '@fams/skeleton-kit'

/**
 * A tiny bespoke admin page. It is NOT a licensed product module — it is an
 * app-builtin that `GET /api/bootstrap` only returns for a persona holding
 * `settings.view` (admin). It exists to make persona-driven MODULE visibility
 * demonstrable: admins get a Settings nav entry + route, dispatchers do not.
 */
function SettingsPage() {
  return (
    <div className="p-section">
      <h1 className="text-h2 font-semibold text-foreground">Settings</h1>
      <p className="mt-3 max-w-prose text-body text-muted-foreground">
        Admin-only module. It appears in the nav only for personas holding{' '}
        <code className="rounded bg-muted px-1">settings.view</code>. Switch to the Dispatcher
        persona in the demo console and this module disappears from the rail — persona gating,
        served by the bootstrap endpoint.
      </p>
    </div>
  )
}

export function makeSettingsRoute(path: string): ModuleRouteLoader {
  return () => Promise.resolve(createLazyRoute(path)({ component: SettingsPage }))
}
