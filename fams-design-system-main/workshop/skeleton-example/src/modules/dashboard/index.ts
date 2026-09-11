import type { FamsModule } from '@fams/skeleton-kit'

/**
 * Dashboard module. `index.ts` stays tiny (id + nav + a dynamic-import loader)
 * so it can be eagerly imported at boot; the route's component code lives in
 * `./route` and is code-split into its own chunk, fetched only on navigation.
 */
export const dashboardModule: FamsModule = {
  id: 'dashboard',
  navEntry: { label: 'Dashboard', path: '/dashboard', order: 1 },
  routes: () => import('./route').then((m) => m.Route),
}
