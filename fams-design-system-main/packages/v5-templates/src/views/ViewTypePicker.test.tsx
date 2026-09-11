import { describe, expect, it, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { ViewTypePicker, viewTypeOptionsFromKinds } from './ViewTypePicker'

const threeOptions = viewTypeOptionsFromKinds(['hybrid', 'map', 'list'])

describe('viewTypeOptionsFromKinds — the metadata-driven option derivation', () => {
  it('maps blueprint view kinds to labeled options with kind-keyed previews', () => {
    expect(threeOptions).toEqual([
      { id: 'hybrid', label: 'Hybrid View', previewKey: 'hybrid' },
      { id: 'map', label: 'Map View', previewKey: 'map' },
      { id: 'list', label: 'List View', previewKey: 'list' },
    ])
  })

  it('drops duplicate kinds', () => {
    expect(viewTypeOptionsFromKinds(['list', 'list', 'kanban'])).toHaveLength(2)
  })
})

describe('ViewTypePicker — radiogroup semantics', () => {
  it('renders one radio card per option inside a labeled radiogroup, first pre-selected', () => {
    render(<ViewTypePicker options={threeOptions} onCreate={() => {}} />)
    const group = screen.getByRole('radiogroup', { name: 'Select Preferred View' })
    expect(group).toBeInTheDocument()
    const radios = screen.getAllByRole('radio')
    expect(radios).toHaveLength(3)
    expect(radios[0]).toHaveAttribute('aria-checked', 'true')
    expect(radios[1]).toHaveAttribute('aria-checked', 'false')
    // Roving tabindex: only the selected card is a tab stop.
    expect(radios[0]).toHaveAttribute('tabindex', '0')
    expect(radios[1]).toHaveAttribute('tabindex', '-1')
  })

  it('honors defaultOptionId over the first option', () => {
    render(<ViewTypePicker options={threeOptions} defaultOptionId="map" onCreate={() => {}} />)
    expect(screen.getByRole('radio', { name: 'Map View' })).toHaveAttribute('aria-checked', 'true')
  })

  it('click selects a card (single-select — previous selection clears)', () => {
    render(<ViewTypePicker options={threeOptions} onCreate={() => {}} />)
    fireEvent.click(screen.getByRole('radio', { name: 'List View' }))
    expect(screen.getByRole('radio', { name: 'List View' })).toHaveAttribute('aria-checked', 'true')
    expect(screen.getByRole('radio', { name: 'Hybrid View' })).toHaveAttribute('aria-checked', 'false')
  })

  it('ArrowRight/ArrowLeft move the selection (wrapping) and move focus with it', () => {
    render(<ViewTypePicker options={threeOptions} onCreate={() => {}} />)
    const first = screen.getByRole('radio', { name: 'Hybrid View' })
    first.focus()
    fireEvent.keyDown(first, { key: 'ArrowRight' })
    expect(screen.getByRole('radio', { name: 'Map View' })).toHaveAttribute('aria-checked', 'true')
    expect(screen.getByRole('radio', { name: 'Map View' })).toHaveFocus()
    // Wraps backward from the first.
    fireEvent.keyDown(screen.getByRole('radio', { name: 'Map View' }), { key: 'ArrowLeft' })
    fireEvent.keyDown(screen.getByRole('radio', { name: 'Hybrid View' }), { key: 'ArrowLeft' })
    expect(screen.getByRole('radio', { name: 'List View' })).toHaveAttribute('aria-checked', 'true')
  })

  it('Home/End jump to the first/last option', () => {
    render(<ViewTypePicker options={threeOptions} onCreate={() => {}} />)
    fireEvent.keyDown(screen.getByRole('radio', { name: 'Hybrid View' }), { key: 'End' })
    expect(screen.getByRole('radio', { name: 'List View' })).toHaveAttribute('aria-checked', 'true')
    fireEvent.keyDown(screen.getByRole('radio', { name: 'List View' }), { key: 'Home' })
    expect(screen.getByRole('radio', { name: 'Hybrid View' })).toHaveAttribute('aria-checked', 'true')
  })

  it('Enter/Space on a focused card select it', () => {
    render(<ViewTypePicker options={threeOptions} onCreate={() => {}} />)
    fireEvent.keyDown(screen.getByRole('radio', { name: 'List View' }), { key: ' ' })
    expect(screen.getByRole('radio', { name: 'List View' })).toHaveAttribute('aria-checked', 'true')
  })
})

describe('ViewTypePicker — create actions', () => {
  it('Create Only fires onCreate with the selected id and mode "create"', () => {
    const onCreate = vi.fn()
    render(<ViewTypePicker options={threeOptions} onCreate={onCreate} />)
    fireEvent.click(screen.getByRole('radio', { name: 'Map View' }))
    fireEvent.click(screen.getByRole('button', { name: 'Create Only' }))
    expect(onCreate).toHaveBeenCalledWith('map', 'create')
  })

  it('Create & Customize fires onCreate with mode "customize"', () => {
    const onCreate = vi.fn()
    render(<ViewTypePicker options={threeOptions} onCreate={onCreate} />)
    fireEvent.click(screen.getByRole('button', { name: 'Create & Customize' }))
    expect(onCreate).toHaveBeenCalledWith('hybrid', 'customize')
  })

  it('double-click does not create two views (both buttons disable after the first fire — UX-NOTES §5)', () => {
    const onCreate = vi.fn()
    render(<ViewTypePicker options={threeOptions} onCreate={onCreate} />)
    const button = screen.getByRole('button', { name: 'Create Only' })
    fireEvent.click(button)
    fireEvent.click(button)
    fireEvent.click(screen.getByRole('button', { name: 'Create & Customize' }))
    expect(onCreate).toHaveBeenCalledTimes(1)
    expect(button).toBeDisabled()
  })

  it('the creating prop disables both actions', () => {
    render(<ViewTypePicker options={threeOptions} onCreate={() => {}} creating />)
    expect(screen.getByRole('button', { name: 'Create Only' })).toBeDisabled()
    expect(screen.getByRole('button', { name: 'Create & Customize' })).toBeDisabled()
  })
})

describe('ViewTypePicker — cancel, hint, previews', () => {
  it('Escape fires onCancel', () => {
    const onCancel = vi.fn()
    render(<ViewTypePicker options={threeOptions} onCreate={() => {}} onCancel={onCancel} />)
    fireEvent.keyDown(screen.getByRole('radiogroup'), { key: 'Escape' })
    expect(onCancel).toHaveBeenCalledTimes(1)
  })

  it('Escape is a no-op without onCancel (zero-views initial state — no dead end, no crash)', () => {
    render(<ViewTypePicker options={threeOptions} onCreate={() => {}} />)
    fireEvent.keyDown(screen.getByRole('radiogroup'), { key: 'Escape' })
    expect(screen.getByRole('radiogroup')).toBeInTheDocument()
  })

  it('renders the metadata-supplied hint with the bold prefix', () => {
    render(<ViewTypePicker options={threeOptions} onCreate={() => {}} hint="Compare data across tabs." />)
    expect(screen.getByText('Compare data across tabs.', { exact: false })).toBeInTheDocument()
    expect(screen.getByText('Hint:', { exact: false })).toBeInTheDocument()
  })

  it('hides the hint row entirely when the module metadata supplies none', () => {
    render(<ViewTypePicker options={threeOptions} onCreate={() => {}} />)
    expect(document.querySelector('[data-slot="view-type-picker-hint"]')).not.toBeInTheDocument()
  })

  it('an unknown previewKey renders the generic placeholder (spec: unknown types get a placeholder)', () => {
    render(
      <ViewTypePicker
        options={[{ id: 'timeline', label: 'Timeline View', previewKey: 'timeline' }]}
        onCreate={() => {}}
      />,
    )
    const card = screen.getByRole('radio', { name: 'Timeline View' })
    expect(card.querySelector('[data-slot="view-type-preview"]')).toBeInTheDocument()
    // No kind-specific rail mock content beyond the shared shell — the
    // placeholder has no rail-adjacent skeleton bars.
    expect(card.querySelectorAll('[data-slot="view-type-preview-rail"]')).toHaveLength(1)
  })

  it('previews are decorative (aria-hidden) — the card is named by its label alone', () => {
    render(<ViewTypePicker options={threeOptions} onCreate={() => {}} />)
    const preview = document.querySelector('[data-slot="view-type-preview"]')
    expect(preview).toHaveAttribute('aria-hidden', 'true')
  })

  it('wraps rather than crushes with more than 3 metadata-declared options (UX-NOTES §5)', () => {
    const five = viewTypeOptionsFromKinds(['list', 'kanban', 'hybrid', 'map', 'grid'])
    render(<ViewTypePicker options={five} onCreate={() => {}} />)
    expect(screen.getAllByRole('radio')).toHaveLength(5)
    const group = screen.getByRole('radiogroup')
    expect(group.className).toContain('flex-wrap')
  })
})

describe('ViewTypePicker — Calendar View option (SPEC §1.6 delta)', () => {
  const withCalendar = viewTypeOptionsFromKinds(['kanban', 'list', 'hybrid', 'calendar'])

  it('renders a Calendar View card alongside the others, wrapping to a second row', () => {
    render(<ViewTypePicker options={withCalendar} onCreate={() => {}} />)
    const radios = screen.getAllByRole('radio')
    expect(radios).toHaveLength(4)
    expect(screen.getByRole('radio', { name: 'Calendar View' })).toBeInTheDocument()
    const group = screen.getByRole('radiogroup')
    expect(group.className).toContain('flex-wrap')
  })

  it('selecting Calendar View marks exactly one card selected', () => {
    render(<ViewTypePicker options={withCalendar} onCreate={() => {}} />)
    fireEvent.click(screen.getByRole('radio', { name: 'Calendar View' }))
    const radios = screen.getAllByRole('radio')
    const checked = radios.filter((r) => r.getAttribute('aria-checked') === 'true')
    expect(checked).toHaveLength(1)
    expect(checked[0]).toHaveAccessibleName('Calendar View')
  })

  it('Create Only on the selected Calendar View card creates a calendar view', () => {
    const onCreate = vi.fn()
    render(<ViewTypePicker options={withCalendar} onCreate={onCreate} />)
    fireEvent.click(screen.getByRole('radio', { name: 'Calendar View' }))
    fireEvent.click(screen.getByRole('button', { name: 'Create Only' }))
    expect(onCreate).toHaveBeenCalledWith('calendar', 'create')
  })

  it('the Calendar View card is keyboard-reachable via Tab/roving-tabindex and arrow navigation', () => {
    render(<ViewTypePicker options={withCalendar} onCreate={() => {}} />)
    const first = screen.getByRole('radio', { name: 'Kanban View' })
    first.focus()
    fireEvent.keyDown(first, { key: 'End' })
    const calendarCard = screen.getByRole('radio', { name: 'Calendar View' })
    expect(calendarCard).toHaveAttribute('aria-checked', 'true')
    expect(calendarCard).toHaveFocus()
    expect(calendarCard).toHaveAttribute('tabindex', '0')
  })
})

describe('ViewTypePicker — visible cancel affordance', () => {
  it('renders a Cancel button whenever the takeover is dismissable, and fires onCancel', () => {
    const onCancel = vi.fn()
    render(
      <ViewTypePicker
        options={viewTypeOptionsFromKinds(['list', 'kanban'])}
        onCreate={vi.fn()}
        onCancel={onCancel}
      />,
    )
    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }))
    expect(onCancel).toHaveBeenCalled()
  })

  it('omits it in the undismissable zero-views initial state', () => {
    render(<ViewTypePicker options={viewTypeOptionsFromKinds(['list'])} onCreate={vi.fn()} />)
    expect(screen.queryByRole('button', { name: 'Cancel' })).not.toBeInTheDocument()
  })
})
