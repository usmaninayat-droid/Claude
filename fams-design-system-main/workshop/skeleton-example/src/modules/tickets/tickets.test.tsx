import { describe, it, expect } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { createMemoryHistory } from '@tanstack/react-router'
import { createFamsApp } from '@fams/skeleton-kit'
import { dashboardModule } from '../dashboard'
import { settingsModule } from '../settings'
import { ticketsModule, ticketsValidateSearch } from './index'

/**
 * Reference test for the v1.1 additive module contract, exercised through
 * the real example app (not just skeleton-kit's own unit tests): a module
 * with a list route + a detail route (`additionalRoutes`), each lazily
 * loaded, plus `validateSearch` on the list route.
 */
describe('tickets module: list + detail, validateSearch', () => {
  it('navigates from the list route to the detail route, each its own lazy chunk', async () => {
    const { App, router } = createFamsApp({
      modules: [dashboardModule, settingsModule, ticketsModule],
      brandLabel: 'Skeleton Example',
      history: createMemoryHistory({ initialEntries: ['/tickets'] }),
    })

    render(<App />)
    await router.load()

    expect(await screen.findByRole('heading', { name: 'Tickets' })).toBeInTheDocument()
    expect(screen.getByText('Page 1')).toBeInTheDocument()

    fireEvent.click(screen.getByRole('link', { name: 'Printer offline in HQ' }))
    await router.load()

    expect(await screen.findByRole('heading', { name: 'Ticket t-1' })).toBeInTheDocument()
    // The list page's content is gone — this is a genuinely different route/component.
    expect(screen.queryByText('Page 1')).not.toBeInTheDocument()

    // And back again, via the detail page's own link.
    fireEvent.click(screen.getByRole('link', { name: /Back to tickets/ }))
    await router.load()
    expect(await screen.findByRole('heading', { name: 'Tickets' })).toBeInTheDocument()
  })

  it('validateSearch provides the typed, parsed page number from the URL', async () => {
    const { App, router } = createFamsApp({
      modules: [dashboardModule, settingsModule, ticketsModule],
      brandLabel: 'Skeleton Example',
      history: createMemoryHistory({ initialEntries: ['/tickets?page=2'] }),
    })

    render(<App />)
    await router.load()

    expect(await screen.findByText('Page 2')).toBeInTheDocument()
  })

  it('validateSearch rejects an invalid page param', () => {
    expect(() => ticketsValidateSearch({ page: 'not-a-number' })).toThrow(/Invalid "page"/)
    expect(() => ticketsValidateSearch({ page: '0' })).toThrow(/Invalid "page"/)
    expect(ticketsValidateSearch({})).toEqual({ page: 1 })
    expect(ticketsValidateSearch({ page: '3' })).toEqual({ page: 3 })
  })
})
