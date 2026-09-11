import { describe, it, expect, vi } from 'vitest'
import { createElement } from 'react'
import { createLazyRoute, createMemoryHistory, RouterProvider } from '@tanstack/react-router'
import { render, screen } from '@testing-library/react'
import { buildRouter, withAdditionalRouteDriftGuard } from './router'
import type { FamsModule } from './types'

/**
 * Coverage for the v1.1 additive extension to the module contract:
 * `validateSearch` on the primary route, and `additionalRoutes` (a module
 * contributing more than one independently-lazy-loaded route — e.g. a list
 * plus a detail view). See `modules.test.ts` for the pre-existing v1
 * single-route contract, which this file does not touch or re-test except
 * where noted.
 */

function mkLegacyModule(id: string, path: string): FamsModule {
  return {
    id,
    navEntry: { label: id.toUpperCase(), path },
    routes: () => Promise.resolve(createLazyRoute(path)({ component: () => null })),
  }
}

interface TicketsSearch {
  page: number
}

function ticketsValidateSearch(search: Record<string, unknown>): TicketsSearch {
  const raw = search.page
  const page = typeof raw === 'string' ? Number(raw) : raw
  if (typeof page !== 'number' || !Number.isInteger(page) || page < 1) {
    throw new Error(`Invalid "page" search param: ${JSON.stringify(raw)}`)
  }
  return { page }
}

function ListPage() {
  return createElement('section', null, createElement('h1', null, 'Tickets list'))
}

function DetailPage() {
  return createElement('section', null, createElement('h1', null, 'Ticket detail'))
}

function mkTicketsModule(listLoaderSpy?: () => void, detailLoaderSpy?: () => void): FamsModule {
  return {
    id: 'tickets',
    navEntry: { label: 'Tickets', path: '/tickets' },
    validateSearch: ticketsValidateSearch,
    routes: () => {
      listLoaderSpy?.()
      return Promise.resolve(createLazyRoute('/tickets')({ component: ListPage }))
    },
    additionalRoutes: [
      {
        path: '/tickets/$ticketId',
        routes: () => {
          detailLoaderSpy?.()
          return Promise.resolve(createLazyRoute('/tickets/$ticketId')({ component: DetailPage }))
        },
      },
    ],
  }
}

describe('backward compatibility: a legacy single-route module', () => {
  it('still registers exactly its one route, with no additionalRoutes/validateSearch fields set', () => {
    const legacy = mkLegacyModule('dashboard', '/dashboard')
    expect(legacy.additionalRoutes).toBeUndefined()
    expect(legacy.validateSearch).toBeUndefined()

    const router = buildRouter({ modules: [legacy] })
    const ids = Object.keys(router.routesById)
    expect(ids).toContain('/dashboard')
    expect(ids).toContain('/') // index route
    // Exactly root + index + the one module route — no extra routes appeared.
    expect(ids).toHaveLength(3)
  })
})

describe('multi-route module: index/list + child/detail', () => {
  it('registers both the primary route and every additionalRoutes entry', () => {
    const router = buildRouter({ modules: [mkTicketsModule()] })
    const ids = Object.keys(router.routesById)
    expect(ids).toContain('/tickets')
    expect(ids).toContain('/tickets/$ticketId')
  })

  it('does NOT invoke either route loader at registration time (both stay lazy)', () => {
    const listSpy = vi.fn()
    const detailSpy = vi.fn()
    buildRouter({ modules: [mkTicketsModule(listSpy, detailSpy)] })
    expect(listSpy).not.toHaveBeenCalled()
    expect(detailSpy).not.toHaveBeenCalled()
  })

  it('loads the list route chunk independently of the detail route chunk', async () => {
    const listSpy = vi.fn()
    const detailSpy = vi.fn()
    const router = buildRouter({
      modules: [mkTicketsModule(listSpy, detailSpy)],
      history: createMemoryHistory({ initialEntries: ['/tickets?page=1'] }),
    })
    await router.load()
    expect(listSpy).toHaveBeenCalledTimes(1)
    expect(detailSpy).not.toHaveBeenCalled()
  })

  it('loads the detail route chunk independently of the list route chunk', async () => {
    const listSpy = vi.fn()
    const detailSpy = vi.fn()
    const router = buildRouter({
      modules: [mkTicketsModule(listSpy, detailSpy)],
      history: createMemoryHistory({ initialEntries: ['/tickets/t-42'] }),
    })
    await router.load()
    expect(detailSpy).toHaveBeenCalledTimes(1)
    expect(listSpy).not.toHaveBeenCalled()
  })

  it('renders the list page and then navigates to the detail page, each its own lazily-loaded component', async () => {
    const router = buildRouter({
      modules: [mkTicketsModule()],
      history: createMemoryHistory({ initialEntries: ['/tickets?page=1'] }),
    })
    render(createElement(RouterProvider, { router }))
    await router.load()
    expect(await screen.findByText('Tickets list')).toBeInTheDocument()

    await router.navigate({ to: '/tickets/$ticketId', params: { ticketId: 't-42' } })
    await router.load()
    expect(await screen.findByText('Ticket detail')).toBeInTheDocument()
    expect(screen.queryByText('Tickets list')).not.toBeInTheDocument()
  })
})

describe('validateSearch on the primary route', () => {
  it('rejects bad search params', () => {
    const router = buildRouter({ modules: [mkTicketsModule()] })
    const route = router.looseRoutesById['/tickets']
    expect(() => route.options.validateSearch?.({ page: 'not-a-number' })).toThrow(/Invalid "page"/)
    expect(() => route.options.validateSearch?.({})).toThrow(/Invalid "page"/)
  })

  it('provides typed, parsed valid search params', () => {
    const router = buildRouter({ modules: [mkTicketsModule()] })
    const route = router.looseRoutesById['/tickets']
    expect(route.options.validateSearch?.({ page: '3' })).toEqual({ page: 3 })
  })
})

describe('navEntry.path ↔ createLazyRoute id drift guard, generalized to additionalRoutes', () => {
  it('detects drift in an additionalRoutes entry (its path must match its createLazyRoute id)', async () => {
    const drifted = {
      path: '/tickets/$ticketId',
      routes: () => Promise.resolve(createLazyRoute('/tickets/$wrongParam')({ component: () => null })),
    }
    await expect(withAdditionalRouteDriftGuard('tickets', drifted)()).rejects.toThrow(
      /Route drift in module "tickets": additionalRoutes entry path is "\/tickets\/\$ticketId" but its createLazyRoute\(\.\.\.\) id is "\/tickets\/\$wrongParam"/,
    )
  })

  it('passes silently when an additionalRoutes entry path matches its createLazyRoute id', async () => {
    const ok = {
      path: '/tickets/$ticketId',
      routes: () => Promise.resolve(createLazyRoute('/tickets/$ticketId')({ component: () => null })),
    }
    const lazyRoute = await withAdditionalRouteDriftGuard('tickets', ok)()
    expect(lazyRoute.options.id).toBe('/tickets/$ticketId')
  })
})
