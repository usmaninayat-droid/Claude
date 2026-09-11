import type { FamsModule } from '@fams/skeleton-kit'

/** The typed, PARSED shape `validateSearch` below hands to `/tickets`. */
export interface TicketsSearch {
  /** 1-based page number. Defaults to 1 when the URL omits `?page=`. */
  page: number
}

/**
 * Eager search-param validation for the LIST route (`/tickets`). Runs before
 * the route's lazy chunk is fetched — see `@fams/skeleton-kit`'s README
 * § validateSearch. Plain-function-typed (rather than `ModuleSearchValidator`,
 * which is a union covering every `validateSearch` shape TanStack Router
 * accepts — object/adapter/Standard-Schema included — and so isn't directly
 * callable) so both this module's own tests and the type checker can call it
 * like the function it is; it still satisfies `FamsModule.validateSearch`'s
 * (erased `AnyValidator`) field type structurally.
 */
export function ticketsValidateSearch(search: Record<string, unknown>): TicketsSearch {
  const raw = search.page
  const page = raw === undefined ? 1 : typeof raw === 'string' ? Number(raw) : raw
  if (typeof page !== 'number' || !Number.isInteger(page) || page < 1) {
    throw new Error(`Invalid "page" search param for /tickets: ${JSON.stringify(raw)}`)
  }
  return { page }
}

/**
 * Reference implementation of the v1.1 additive module contract (a module
 * with more than one route): the LIST route is this module's primary route
 * (`navEntry.path` + `validateSearch`), and the DETAIL route is registered
 * via `additionalRoutes`. Both routes have their own `route.tsx` file, so
 * each is code-split into its own bundler chunk — navigating from the list
 * to a ticket's detail fetches only the detail chunk, never the list's.
 */
export const ticketsModule: FamsModule = {
  id: 'tickets',
  navEntry: { label: 'Tickets', path: '/tickets', order: 3 },
  validateSearch: ticketsValidateSearch,
  routes: () => import('./list-route').then((m) => m.Route),
  additionalRoutes: [
    {
      path: '/tickets/$ticketId',
      routes: () => import('./detail-route').then((m) => m.Route),
    },
  ],
}
