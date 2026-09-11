import type { FamsModule } from '@fams/skeleton-kit'

export const settingsModule: FamsModule = {
  id: 'settings',
  navEntry: { label: 'Settings', path: '/settings', order: 2 },
  routes: () => import('./route').then((m) => m.Route),
}
