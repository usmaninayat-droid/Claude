import { describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { Toaster } from '@fams/ui-kit'
import { CockpitFilters } from './CockpitFilters'
import { deriveCockpitFilters } from './cockpit-model'
import { cockpitConfig, cockpitRecords } from './cockpit-fixtures'

const FILTERS = deriveCockpitFilters(cockpitConfig, cockpitRecords)
const BOUND = FILTERS.find((f) => f.options.length > 0)!

/**
 * CockpitFilters — the cockpit's config-driven filter-pill row + icon actions
 * (SPEC §1.1; UX-NOTES C.9–13). An exported part with no test of its own; this
 * covers pill rendering, the selection callback, the in-pill clear ✕ (C.12)
 * and the "no dead affordance" contract on the action buttons (L.57).
 */
describe('CockpitFilters', () => {
  const noop = () => {}

  it('renders one pill per derived filter, labelled by the filter', () => {
    render(<CockpitFilters filters={FILTERS} selections={{}} onSelectionChange={noop} />)
    expect(document.querySelectorAll('[data-slot="cockpit-filter-pill"]')).toHaveLength(FILTERS.length)
    expect(screen.getByText(BOUND.label)).toBeInTheDocument()
  })

  it('reports a chosen option through onSelectionChange, keyed by the filter id', async () => {
    const onSelectionChange = vi.fn()
    render(<CockpitFilters filters={FILTERS} selections={{}} onSelectionChange={onSelectionChange} />)

    // Radix menus open on keyDown/pointerDown, not a synthetic click.
    const pill = document.querySelector(`[data-filter-id="${BOUND.id}"] button`)!
    fireEvent.keyDown(pill, { key: 'Enter' })
    const option = await screen.findByRole('menuitem', { name: BOUND.options[0] })
    fireEvent.click(option)

    expect(onSelectionChange).toHaveBeenCalledWith(BOUND.id, BOUND.options[0])
  })

  it('shows an in-pill clear ✕ only once a value is selected, and clears to undefined (C.12)', () => {
    const onSelectionChange = vi.fn()
    const { rerender } = render(
      <CockpitFilters filters={FILTERS} selections={{}} onSelectionChange={onSelectionChange} />,
    )
    expect(screen.queryByLabelText(`Clear ${BOUND.label} filter`)).toBeNull()

    rerender(
      <CockpitFilters
        filters={FILTERS}
        selections={{ [BOUND.id]: BOUND.options[0] }}
        onSelectionChange={onSelectionChange}
      />,
    )
    const clear = screen.getByLabelText(`Clear ${BOUND.label} filter`)
    fireEvent.click(clear)
    expect(onSelectionChange).toHaveBeenCalledWith(BOUND.id, undefined)
  })

  it('renders the selected value in place of the filter label', () => {
    render(
      <CockpitFilters
        filters={FILTERS}
        selections={{ [BOUND.id]: BOUND.options[0] }}
        onSelectionChange={noop}
      />,
    )
    const pill = document.querySelector(`[data-filter-id="${BOUND.id}"]`)!
    expect(pill.textContent).toContain(BOUND.options[0])
  })

  describe('config-driven icon actions (no dead affordances — L.57)', () => {
    it('a `toast` action is observable: it fires a toast', async () => {
      render(
        <CockpitFilters
          filters={[]}
          selections={{}}
          onSelectionChange={noop}
          actions={[{ id: 'broadcast', label: 'Broadcast', icon: 'broadcast', kind: 'toast', message: 'Broadcast sent' }]}
        />,
      )
      render(<Toaster />)
      fireEvent.click(screen.getByRole('button', { name: 'Broadcast' }))
      // The app root owns the outlet (P0-2) — mounted here to read the toast.
      await waitFor(() => expect(screen.getByText('Broadcast sent')).toBeInTheDocument())
    })

    it('a `menu` action opens its own item menu', async () => {
      render(
        <CockpitFilters
          filters={[]}
          selections={{}}
          onSelectionChange={noop}
          actions={[{ id: 'actions', label: 'Quick actions', icon: 'actions', kind: 'menu', items: [{ id: 'reassign', label: 'Reassign all' }] }]}
        />,
      )
      fireEvent.keyDown(screen.getByRole('button', { name: 'Quick actions' }), { key: 'Enter' })
      expect(await screen.findByRole('menuitem', { name: 'Reassign all' })).toBeInTheDocument()
    })

    it('renders no action row at all when the config declares none', () => {
      render(<CockpitFilters filters={FILTERS} selections={{}} onSelectionChange={noop} />)
      expect(screen.queryByRole('button', { name: 'Broadcast' })).toBeNull()
    })
  })
})
