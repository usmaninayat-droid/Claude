import { describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen } from '@testing-library/react'
import { CockpitQueue } from './CockpitQueue'
import { deriveCockpitQueue } from './cockpit-model'
import { cockpitConfig, cockpitRecords } from './cockpit-fixtures'

const ITEMS = deriveCockpitQueue(cockpitConfig, cockpitRecords)

/**
 * CockpitQueue — the cockpit's searchable card queue (SPEC §2 rows 11–17;
 * UX-NOTES F.25–31). It was an exported part with no test of its own; this
 * covers the toolbar, the singular-aware count row, the three distinct empty
 * states and the controlled selection contract.
 */
describe('CockpitQueue', () => {
  it('renders one card per item with a live, singular-aware total', () => {
    render(<CockpitQueue items={ITEMS} />)
    expect(document.querySelectorAll('[data-queue-id]')).toHaveLength(ITEMS.length)
    const count = document.querySelector('[data-slot="cockpit-queue-count"]')!
    expect(count).toHaveAttribute('aria-live', 'polite')
    expect(count.textContent).toBe(`Total ${ITEMS.length} items`)
  })

  it('says "item" (never "1 items") for a single record — UX F.26', () => {
    render(<CockpitQueue items={ITEMS.slice(0, 1)} />)
    expect(document.querySelector('[data-slot="cockpit-queue-count"]')!.textContent).toBe('Total 1 item')
  })

  it('filters on search and reports the narrowed count against the total', () => {
    render(<CockpitQueue items={ITEMS} searchPlaceholder="Search queue" />)
    fireEvent.change(screen.getByLabelText('Search queue'), {
      target: { value: ITEMS[0].title.slice(0, 6) },
    })
    const shown = document.querySelectorAll('[data-queue-id]').length
    expect(shown).toBeLessThan(ITEMS.length)
    expect(document.querySelector('[data-slot="cockpit-queue-count"]')!.textContent).toContain(
      `out of ${ITEMS.length}`,
    )
  })

  describe('the three empty states', () => {
    it('LOADING renders skeleton cards, not the list or an empty message', () => {
      render(<CockpitQueue items={ITEMS} loading />)
      expect(document.querySelector('[data-slot="cockpit-queue-skeletons"]')).not.toBeNull()
      expect(document.querySelectorAll('[data-queue-id]')).toHaveLength(0)
      expect(document.querySelector('[data-slot="cockpit-queue-empty"]')).toBeNull()
    })

    it('NO DATA renders the caller-supplied empty title', () => {
      render(<CockpitQueue items={[]} emptyTitle="Nothing dispatched" />)
      expect(document.querySelector('[data-slot="cockpit-queue-empty"]')).not.toBeNull()
      expect(screen.getByText('Nothing dispatched')).toBeInTheDocument()
    })

    it('NO MATCHES names the query and offers a clear affordance', () => {
      render(<CockpitQueue items={ITEMS} searchPlaceholder="Search queue" />)
      fireEvent.change(screen.getByLabelText('Search queue'), {
        target: { value: 'zzzz-no-such-record' },
      })
      expect(document.querySelector('[data-slot="cockpit-queue-empty"]')).not.toBeNull()
      expect(screen.getByText(/zzzz-no-such-record/)).toBeInTheDocument()

      fireEvent.click(screen.getByRole('button', { name: 'Clear search' }))
      expect(document.querySelectorAll('[data-queue-id]')).toHaveLength(ITEMS.length)
    })
  })

  it('reports selection through onSelect (the parent owns it, so the map stays in sync)', () => {
    const onSelect = vi.fn()
    render(<CockpitQueue items={ITEMS} selectedId={null} onSelect={onSelect} />)
    fireEvent.click(
      document
        .querySelector(`[data-queue-id="${ITEMS[0].id}"]`)!
        .querySelector('[data-slot="route-job-card"]')!,
    )
    expect(onSelect).toHaveBeenCalledWith(ITEMS[0].id)
  })

  it('omits the built-in Filter button with no statusOptions, and shows it with them', () => {
    const { unmount } = render(<CockpitQueue items={ITEMS} />)
    expect(document.querySelector('[data-slot="cockpit-queue-filter"]')).toBeNull()
    unmount()

    render(<CockpitQueue items={ITEMS} statusOptions={[{ key: 'a', label: 'At Risk' }]} />)
    expect(document.querySelector('[data-slot="cockpit-queue-filter"]')).not.toBeNull()
  })

  it('omits the built-in Export button unless `exportable` is set', () => {
    const { unmount } = render(<CockpitQueue items={ITEMS} />)
    expect(document.querySelector('[data-slot="cockpit-queue-export"]')).toBeNull()
    unmount()

    render(<CockpitQueue items={ITEMS} exportable />)
    expect(document.querySelector('[data-slot="cockpit-queue-export"]')).not.toBeNull()
  })
})
