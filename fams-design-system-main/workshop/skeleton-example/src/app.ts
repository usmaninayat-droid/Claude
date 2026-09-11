import { createFamsApp } from '@fams/skeleton-kit'
import { dashboardModule } from './modules/dashboard'
import { settingsModule } from './modules/settings'
import { ticketsModule } from './modules/tickets'

/**
 * The example app config — a minimal, product-agnostic app demonstrating
 * both module shapes: `dashboardModule`/`settingsModule` are the plain v1
 * single-route form, and `ticketsModule` is the v1.1 reference implementation
 * of a list + detail module with `validateSearch` (see `modules/tickets`).
 */
export function createExampleApp() {
  return createFamsApp({
    modules: [dashboardModule, settingsModule, ticketsModule],
    brandLabel: 'Skeleton Example',
    theme: { tenant: 'fams', defaultTheme: 'light' },
  })
}
