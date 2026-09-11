import { createLazyRoute } from '@tanstack/react-router'
import type { ModuleRouteLoader } from '@fams/skeleton-kit'
import { CommandCenterView, type CommandCenterDeps } from './command-center-view'

/**
 * Command Center (FM-6233) — builtin bespoke module, the same escape-valve
 * pattern as `settings-module.tsx`/`operations-center-module.tsx` (granted to
 * the uccp tenant only via `demo/model.ts`'s `buildBootstrapModules`). Unlike
 * the cockpit port it is NATIVE — no iframe: everything renders on this
 * host's own React tree and the design-system map stack. Its nav entry
 * declares `fullScreen: true` (skeleton-kit NavEntry v1.2), so `V5AppShell`
 * suppresses the rail + top bar for this route; the view supplies its own
 * dark top nav with the back arrow into the V5 app.
 */
export function makeCommandCenterRoute(path: string, deps: CommandCenterDeps = {}): ModuleRouteLoader {
  return () =>
    Promise.resolve(
      createLazyRoute(path)({ component: () => <CommandCenterView {...deps} /> }),
    )
}
