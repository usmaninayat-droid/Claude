import { describe, it, expect } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import { createMemoryHistory } from '@tanstack/react-router'
import { createFamsApp } from '@fams/skeleton-kit'
import { dashboardModule } from './modules/dashboard'
import { settingsModule } from './modules/settings'

describe('skeleton-example app shell (jsdom smoke)', () => {
  it('renders nav entries derived from the module contract', async () => {
    const { App } = createFamsApp({
      modules: [dashboardModule, settingsModule],
      brandLabel: 'Skeleton Example',
      history: createMemoryHistory({ initialEntries: ['/'] }),
    })

    render(<App />)

    await waitFor(() => {
      expect(screen.getByText('Skeleton Example')).toBeInTheDocument()
      // Both module nav entries render from their navEntry contract.
      expect(screen.getByRole('link', { name: 'Dashboard' })).toBeInTheDocument()
      expect(screen.getByRole('link', { name: 'Settings' })).toBeInTheDocument()
    })
  })

  // THE LAZY-ROUTE TRAP: a module's route component is code-split behind a
  // dynamic `import()` (see modules/dashboard/route.tsx). TanStack Router
  // commits a location's full match set (root shell + the matched module's
  // lazy component) as one atomic unit once everything in it has resolved —
  // so right after `render(<App />)`, with the dynamic import still
  // in-flight, literally nothing for this location is on screen yet, not
  // even the (otherwise eager) nav. The fix: `await router.load()` — exposed
  // on the object `createFamsApp` returns — before asserting on anything
  // this route renders.
  it('renders a lazy module route only after awaiting router.load()', async () => {
    const { App, router } = createFamsApp({
      modules: [dashboardModule, settingsModule],
      brandLabel: 'Skeleton Example',
      history: createMemoryHistory({ initialEntries: ['/dashboard'] }),
    })

    render(<App />)

    // Nothing has committed yet — not the dashboard heading, not even the nav.
    expect(screen.queryByRole('heading', { name: 'Dashboard' })).not.toBeInTheDocument()
    expect(screen.queryByRole('link', { name: 'Dashboard' })).not.toBeInTheDocument()

    // Awaiting router.load() (idempotent — it resolves once the in-flight
    // load, including the module's dynamic import, settles) is what actually
    // waits for it instead of racing it. `findByRole` (a `waitFor` under the
    // hood, per this file's other test) absorbs the render commit that
    // follows the store update — the fix being demonstrated is the
    // `await router.load()` above, not the query helper.
    await router.load()

    expect(await screen.findByRole('heading', { name: 'Dashboard' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Dashboard' })).toBeInTheDocument()
  })
})
