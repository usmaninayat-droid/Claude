import type { ComponentProps } from 'react'
import { describe, expect, it, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { Combobox, type ComboOption } from './Combobox'

const OPTIONS: ComboOption[] = [
  { value: 'v1', label: 'Vehicle 01' },
  { value: 'v2', label: 'Vehicle 02' },
  { value: 'v3', label: 'Vehicle 03' },
]

describe('Combobox', () => {
  it('shows the placeholder when nothing is selected', () => {
    render(<Combobox options={OPTIONS} value={null} onChange={() => {}} placeholder="Select a vehicle…" />)
    expect(screen.getByText('Select a vehicle…')).toBeInTheDocument()
  })

  it('shows the selected label in single mode', () => {
    render(<Combobox options={OPTIONS} value="v2" onChange={() => {}} />)
    expect(screen.getByText('Vehicle 02')).toBeInTheDocument()
  })

  it('opens on trigger click and lists the given options', () => {
    render(<Combobox options={OPTIONS} value={null} onChange={() => {}} />)
    fireEvent.click(screen.getByRole('combobox'))
    expect(screen.getByText('Vehicle 01')).toBeInTheDocument()
    expect(screen.getByText('Vehicle 03')).toBeInTheDocument()
  })

  it('filters options locally as the query changes', () => {
    render(<Combobox options={OPTIONS} value={null} onChange={() => {}} />)
    fireEvent.click(screen.getByRole('combobox'))
    fireEvent.change(screen.getByPlaceholderText('Search…'), { target: { value: '02' } })
    expect(screen.getByText('Vehicle 02')).toBeInTheDocument()
    expect(screen.queryByText('Vehicle 01')).not.toBeInTheDocument()
  })

  it('shows a spinner and no options while loading with an async caller', () => {
    render(
      <Combobox
        options={[]}
        value={null}
        onChange={() => {}}
        onSearchChange={() => {}}
        loading
      />,
    )
    fireEvent.click(screen.getByRole('combobox'))
    expect(screen.getByText('Loading…')).toBeInTheDocument()
  })

  it('shows emptyText when there are no results', () => {
    render(<Combobox options={[]} value={null} onChange={() => {}} emptyText="No vehicles found" />)
    fireEvent.click(screen.getByRole('combobox'))
    expect(screen.getByText('No vehicles found')).toBeInTheDocument()
  })

  it('renders selected chips in multi mode', () => {
    render(<Combobox options={OPTIONS} value={['v1', 'v2']} onChange={() => {}} multiple />)
    expect(screen.getByText('Vehicle 01')).toBeInTheDocument()
    expect(screen.getByText('Vehicle 02')).toBeInTheDocument()
  })

  it('removes a chip via a real, keyboard-reachable button (not nested inside the trigger button)', () => {
    const onChange = vi.fn()
    render(<Combobox options={OPTIONS} value={['v1', 'v2']} onChange={onChange} multiple />)
    // A real <button> — reachable by Tab, activates on Enter/Space — because
    // the trigger itself is a div, not a <button> (buttons can't nest).
    fireEvent.click(screen.getByRole('button', { name: 'Remove Vehicle 01' }))
    expect(onChange).toHaveBeenCalledWith(['v2'])
  })

  it('opens on Enter/Space/ArrowDown when the trigger is focused', () => {
    render(<Combobox options={OPTIONS} value={null} onChange={() => {}} />)
    const trigger = screen.getByRole('combobox')
    fireEvent.keyDown(trigger, { key: 'ArrowDown' })
    expect(screen.getByText('Vehicle 01')).toBeInTheDocument()
  })

  it('calls onChange with the single value on selection', () => {
    const onChange = vi.fn()
    render(<Combobox options={OPTIONS} value={null} onChange={onChange} />)
    fireEvent.click(screen.getByRole('combobox'))
    fireEvent.click(screen.getByText('Vehicle 01'))
    expect(onChange).toHaveBeenCalledWith('v1')
  })

  describe('searchable float-label mode (FAMS portal 33223:10031)', () => {
    it('renders label, asterisk and hint', () => {
      render(
        <Combobox options={OPTIONS} value={null} onChange={() => {}} label="Select Events" required hint="Help" ariaLabel="events" />,
      )
      expect(screen.getByText('Select Events')).toBeInTheDocument()
      expect(screen.getByText('*')).toBeInTheDocument()
      expect(screen.getByText('Help')).toBeInTheDocument()
    })

    it('typing on the closed trigger opens the list seeded with the typed character', () => {
      render(<Combobox options={OPTIONS} value={null} onChange={() => {}} label="Select Events" ariaLabel="events" />)
      const trigger = screen.getByRole('combobox')
      fireEvent.keyDown(trigger, { key: '0' })
      expect(trigger).toHaveAttribute('aria-expanded', 'true')
      const input = screen.getByRole('combobox', { name: '' }) // cmdk input also role=combobox
      expect(input).toBeTruthy()
    })

    it('clearable single mode clears the selection', () => {
      const onChange = vi.fn()
      render(<Combobox options={OPTIONS} value="v1" onChange={onChange} clearable ariaLabel="events" />)
      fireEvent.click(screen.getByRole('button', { name: 'Clear selection' }))
      expect(onChange).toHaveBeenCalledWith(null)
    })
  })

  /* ─────────────────────────────────────────────────────────────────────
   * FAMILY C — the two-section filter listbox.
   * Verdicts: C.15/C.17/C.19/C.22, F.47/F.48/F.52/F.53/F.54, G.57–59, I.77.
   * ───────────────────────────────────────────────────────────────────── */
  describe('sections="selected-available" (FAMILY C filter dropdown)', () => {
    const LOTS: ComboOption[] = [
      { value: 'l1', label: 'Lot 1' },
      { value: 'l2', label: 'Lot 2' },
      { value: 'l3', label: 'Lot 3' },
      { value: 'l4', label: 'Lot 4' },
    ]

    const openSectioned = (props: Partial<ComponentProps<typeof Combobox>> = {}) => {
      const onChange = props.onChange ?? vi.fn()
      const utils = render(
        <Combobox
          options={LOTS}
          value={props.value ?? ['l2']}
          onChange={onChange}
          multiple
          sections="selected-available"
          selectedIds={props.selectedIds ?? ['l2']}
          frozenOrder={props.frozenOrder ?? ['l1', 'l2', 'l3', 'l4']}
          ariaLabel="Lot"
          {...props}
        />,
      )
      fireEvent.click(screen.getAllByRole('combobox')[0])
      return { ...utils, onChange: onChange as ReturnType<typeof vi.fn> }
    }

    const searchInput = () => screen.getByPlaceholderText('Search…')
    const rowLabels = () =>
      screen.getAllByRole('option').map((el) => el.textContent?.trim().replace(/\s+/g, ' ') ?? '')

    it('renders ONE listbox with two labelled groups and exactly one divider (C.22 / F.54)', () => {
      const { container } = openSectioned()
      expect(screen.getAllByRole('listbox')).toHaveLength(1)
      const groups = screen.getAllByRole('group')
      expect(groups).toHaveLength(2)
      // Each group is named by its own sticky caption, not a bare label.
      expect(groups[0]).toHaveAccessibleName(/Selected \(1\)/)
      expect(groups[1]).toHaveAccessibleName(/Available \(3\)/)
      expect(container.ownerDocument.querySelectorAll('[data-slot="combobox-section-divider"]')).toHaveLength(1)
    })

    it('marks the listbox multiselectable and mirrors the TICK in aria-selected (C.15)', () => {
      openSectioned()
      expect(screen.getByRole('listbox')).toHaveAttribute('aria-multiselectable', 'true')
      const selectedRows = screen.getAllByRole('option').filter((el) => el.getAttribute('aria-selected') === 'true')
      expect(selectedRows).toHaveLength(1)
      expect(selectedRows[0]).toHaveTextContent('Lot 2')
    })

    it('an empty Selected section renders neither a caption nor a divider (F.52)', () => {
      const { container } = openSectioned({ value: [], selectedIds: [] })
      expect(container.ownerDocument.querySelectorAll('[data-section="selected"]')).toHaveLength(0)
      expect(container.ownerDocument.querySelectorAll('[data-slot="combobox-section-divider"]')).toHaveLength(0)
      expect(screen.getAllByRole('option')).toHaveLength(4)
    })

    it('an empty Available section renders a body, never a bare caption (F.53)', () => {
      openSectioned({ value: ['l1', 'l2', 'l3', 'l4'], selectedIds: ['l1', 'l2', 'l3', 'l4'] })
      expect(screen.getByText('All options selected')).toBeInTheDocument()
    })

    it('rows follow frozenOrder, not the options array', () => {
      openSectioned({
        value: [],
        selectedIds: [],
        frozenOrder: ['l4', 'l3', 'l2', 'l1'],
      })
      expect(rowLabels()).toEqual(['Lot 4', 'Lot 3', 'Lot 2', 'Lot 1'])
    })

    it('an unticked row stays put in Selected and the caption count goes live (F.47 / F.48)', () => {
      // `selectedIds` is the OPEN-TIME snapshot (membership); `value` is live
      // (the tick). Untick l2 and l3 => both stay in Selected, caption reads 1.
      openSectioned({ value: ['l2'], selectedIds: ['l2', 'l3'] })
      expect(rowLabels()).toEqual(['Lot 2', 'Lot 3', 'Lot 1', 'Lot 4'])
      const groups = screen.getAllByRole('group')
      expect(groups[0]).toHaveAccessibleName(/Selected \(1\)/)
      // Membership is untouched by the untick: 2 rows in Selected, 2 available.
      expect(groups[0].querySelectorAll('[role="option"]')).toHaveLength(2)
      expect(groups[1].querySelectorAll('[role="option"]')).toHaveLength(2)
    })

    it('arrows move aria-activedescendant across the divider and WRAP (C.17 / C.22)', () => {
      openSectioned()
      const input = searchInput()
      const ids = screen.getAllByRole('option').map((el) => el.id)
      expect(input).toHaveAttribute('aria-activedescendant', ids[0])
      fireEvent.keyDown(input, { key: 'ArrowDown' })
      // From the last Selected row straight into the first Available row.
      expect(input).toHaveAttribute('aria-activedescendant', ids[1])
      fireEvent.keyDown(input, { key: 'ArrowUp' })
      fireEvent.keyDown(input, { key: 'ArrowUp' })
      expect(input).toHaveAttribute('aria-activedescendant', ids[ids.length - 1])
      fireEvent.keyDown(input, { key: 'Home' })
      expect(input).toHaveAttribute('aria-activedescendant', ids[0])
      fireEvent.keyDown(input, { key: 'End' })
      expect(input).toHaveAttribute('aria-activedescendant', ids[ids.length - 1])
    })

    it('Space toggles ONLY while the query is empty (C.19)', () => {
      const onChange = vi.fn()
      openSectioned({ onChange })
      const input = searchInput()
      fireEvent.keyDown(input, { key: ' ' })
      expect(onChange).toHaveBeenCalledWith([])

      onChange.mockClear()
      fireEvent.change(input, { target: { value: 'Lot' } })
      fireEvent.keyDown(input, { key: ' ' })
      // The space belongs to the query — nothing toggled.
      expect(onChange).not.toHaveBeenCalled()
    })

    it('Enter always toggles, query or no query (C.18/C.19)', () => {
      const onChange = vi.fn()
      openSectioned({ onChange })
      const input = searchInput()
      fireEvent.change(input, { target: { value: 'Lot' } })
      fireEvent.keyDown(input, { key: 'Enter' })
      expect(onChange).toHaveBeenCalledTimes(1)
    })

    it('first Escape clears a non-empty query and keeps the layer open (C.25)', () => {
      openSectioned()
      const input = searchInput()
      fireEvent.change(input, { target: { value: 'Lot 3' } })
      expect(input).toHaveValue('Lot 3')
      fireEvent.keyDown(input, { key: 'Escape' })
      expect(input).toHaveValue('')
      expect(screen.getByRole('listbox')).toBeInTheDocument()
    })

    it('renders a StatusDot for an option carrying a runtime colour, plus its count (I.77 / D-5)', () => {
      const { container } = openSectioned({
        value: [],
        selectedIds: [],
        frozenOrder: undefined,
        options: [{ value: 'open', label: 'Open', color: '#7a5af8', count: 102 }],
      })
      const dot = container.ownerDocument.querySelector('[data-status-dot]')
      expect(dot).toBeTruthy()
      expect(dot).toHaveAttribute('aria-hidden', 'true')
      // Never colour-only: the label text is always its sibling.
      expect(screen.getByRole('option')).toHaveTextContent('Open')
      expect(screen.getByText('102')).toBeInTheDocument()
    })
  })

  describe('create-from-search empty state (G.57–59)', () => {
    const OPTS: ComboOption[] = [{ value: 'a', label: 'Alpha' }]

    const openWith = (props: Partial<ComponentProps<typeof Combobox>>) => {
      render(<Combobox options={OPTS} value={null} onChange={() => {}} ariaLabel="Driver" {...props} />)
      fireEvent.click(screen.getAllByRole('combobox')[0])
      return screen.getByPlaceholderText('Search…')
    }

    it('shows the rich empty state and a CTA naming the exact query', () => {
      const onCreateFromSearch = vi.fn()
      const input = openWith({ onCreateFromSearch, createEntityLabel: 'Driver' })
      fireEvent.change(input, { target: { value: 'Zed' } })
      expect(screen.getByText('No results found!')).toBeInTheDocument()
      const cta = screen.getByRole('button', { name: /Create a new Driver as .*Zed/ })
      fireEvent.click(cta)
      expect(onCreateFromSearch).toHaveBeenCalledWith('Zed')
    })

    it('is HIDDEN — not disabled — when createFromSearch is not configured', () => {
      const input = openWith({ emptyText: 'No results' })
      fireEvent.change(input, { target: { value: 'Zed' } })
      expect(screen.queryByRole('button', { name: /Create a new/ })).not.toBeInTheDocument()
      expect(screen.getByText('No results')).toBeInTheDocument()
    })

    it('never appears for a whitespace-only query', () => {
      const input = openWith({ onCreateFromSearch: vi.fn() })
      fireEvent.change(input, { target: { value: '   ' } })
      expect(screen.queryByRole('button', { name: /Create a new/ })).not.toBeInTheDocument()
    })

    it('is reachable by ArrowDown past the empty list and activates on Enter', () => {
      const onCreateFromSearch = vi.fn()
      const input = openWith({ onCreateFromSearch })
      fireEvent.change(input, { target: { value: 'Zed' } })
      const cta = screen.getByRole('button', { name: /Create a new/ })
      expect(input).toHaveAttribute('aria-activedescendant', cta.id)
      fireEvent.keyDown(input, { key: 'Enter' })
      expect(onCreateFromSearch).toHaveBeenCalledWith('Zed')
    })
  })
})
