import { useState } from 'react'
import { describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import type { SortState } from '@fams/ui-kit'
import { SortMenuButton, type SortMenuOption } from './SortMenuButton'

const OPTIONS: SortMenuOption[] = [
  { key: 'title', label: 'Title' },
  { key: 'reportedAt', label: 'Reported At' },
]

/** `variant="toggle"` is controlled — a stateful harness looks like a real consumer (`RecordMapListToolbar`). */
function ToggleHarness() {
  const [sort, setSort] = useState<SortState | null>(null)
  return <SortMenuButton variant="toggle" options={OPTIONS} sort={sort} onSortChange={setSort} />
}

describe('SortMenuButton variant="toggle" — popover anatomy (SPEC Addendum "Sort popup")', () => {
  it('is closed until the trigger opens it; shows one row per option and hides Reset while unsorted', () => {
    render(<ToggleHarness />)
    expect(screen.queryByText('Title')).not.toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Sort' }))
    expect(screen.getByText('Title')).toBeInTheDocument()
    expect(screen.getByText('Reported At')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Reset' })).not.toBeInTheDocument()
  })
})

describe('SortMenuButton variant="toggle" — AC-7.1: tri-state cycling, three visually distinct states', () => {
  it('cycles a single row off -> ascending -> descending -> off on repeated taps of the SAME toggle', () => {
    render(<ToggleHarness />)
    fireEvent.click(screen.getByRole('button', { name: 'Sort' }))
    const title = () => screen.getByRole('button', { name: /Title/ })

    expect(title()).toHaveAttribute('data-active-direction', 'off')
    fireEvent.click(title())
    expect(title()).toHaveAttribute('data-active-direction', 'asc')
    fireEvent.click(title())
    expect(title()).toHaveAttribute('data-active-direction', 'desc')
    fireEvent.click(title())
    expect(title()).toHaveAttribute('data-active-direction', 'off')
  })

  it('renders the off state with BOTH arrows dimmed and the active direction in the primary token (never a hardcoded colour)', () => {
    render(<ToggleHarness />)
    fireEvent.click(screen.getByRole('button', { name: 'Sort' }))
    const title = () => screen.getByRole('button', { name: /Title/ })
    const arrows = () => title().querySelectorAll('svg')

    let [up, down] = Array.from(arrows())
    expect(up).toHaveClass('text-muted-foreground')
    expect(down).toHaveClass('text-muted-foreground')

    fireEvent.click(title())
    ;[up, down] = Array.from(arrows())
    expect(up).toHaveClass('text-primary')
    expect(down).toHaveClass('text-muted-foreground')

    fireEvent.click(title())
    ;[up, down] = Array.from(arrows())
    expect(up).toHaveClass('text-muted-foreground')
    expect(down).toHaveClass('text-primary')
  })
})

describe('SortMenuButton variant="toggle" — AC-7.2: single active sort, never multi-column', () => {
  it('activating a different row clears the previously active one in the same write', () => {
    render(<ToggleHarness />)
    fireEvent.click(screen.getByRole('button', { name: 'Sort' }))
    fireEvent.click(screen.getByRole('button', { name: 'Sort Title' }))
    expect(screen.getByRole('button', { name: /Title/ })).toHaveAttribute('data-active-direction', 'asc')
    expect(screen.getByRole('button', { name: /Reported At/ })).toHaveAttribute('data-active-direction', 'off')

    fireEvent.click(screen.getByRole('button', { name: 'Sort Reported At' }))
    expect(screen.getByRole('button', { name: /Reported At/ })).toHaveAttribute('data-active-direction', 'asc')
    expect(screen.getByRole('button', { name: /Title/ })).toHaveAttribute('data-active-direction', 'off')
  })

  it('reports the new sort through onSortChange (live reorder, no separate Apply)', () => {
    const onSortChange = vi.fn()
    render(<SortMenuButton variant="toggle" options={OPTIONS} sort={null} onSortChange={onSortChange} />)
    fireEvent.click(screen.getByRole('button', { name: 'Sort' }))
    fireEvent.click(screen.getByRole('button', { name: 'Sort Title' }))
    expect(onSortChange).toHaveBeenCalledWith({ key: 'title', direction: 'asc' })
  })
})

describe('SortMenuButton variant="toggle" — AC-7.3: Reset clears to true unsorted (None)', () => {
  it('shows Reset once a sort is active; clicking it clears the sort and hides Reset again', () => {
    render(<ToggleHarness />)
    fireEvent.click(screen.getByRole('button', { name: 'Sort' }))
    fireEvent.click(screen.getByRole('button', { name: 'Sort Title' }))
    expect(screen.getByRole('button', { name: 'Reset' })).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'Reset' }))
    expect(screen.getByRole('button', { name: /Title/ })).toHaveAttribute('data-active-direction', 'off')
    expect(screen.queryByRole('button', { name: 'Reset' })).not.toBeInTheDocument()
  })
})

describe('SortMenuButton variant="toggle" — dismiss on outside click / Escape (AC-7.4)', () => {
  it('closes on an outside click, leaving the current sort untouched', async () => {
    render(<ToggleHarness />)
    fireEvent.click(screen.getByRole('button', { name: 'Sort' }))
    fireEvent.click(screen.getByRole('button', { name: 'Sort Title' }))
    expect(screen.getByText('Title')).toBeInTheDocument()

    // Radix's outside-pointerdown listener attaches on a `setTimeout(0)` (so
    // the SAME click that opened the popover can't immediately close it) —
    // a real tick has to pass before an outside `pointerdown` is honored.
    await new Promise((resolve) => setTimeout(resolve, 0))
    fireEvent.pointerDown(document.body)
    await waitFor(() => expect(screen.queryByText('Title')).not.toBeInTheDocument())

    fireEvent.click(screen.getByRole('button', { name: 'Sort' }))
    expect(screen.getByRole('button', { name: /Title/ })).toHaveAttribute('data-active-direction', 'asc')
  })

  it('closes on Escape', async () => {
    render(<ToggleHarness />)
    fireEvent.click(screen.getByRole('button', { name: 'Sort' }))
    fireEvent.keyDown(document.activeElement ?? document.body, { key: 'Escape' })
    await waitFor(() => expect(screen.queryByText('Title')).not.toBeInTheDocument())
  })
})

describe('SortMenuButton — variant="menu" default is unchanged (existing LiveListOnlyView consumer)', () => {
  it('still renders the original single-select "Sort by" listbox when `variant` is omitted', () => {
    const onSortChange = vi.fn()
    render(<SortMenuButton options={OPTIONS} sort={null} onSortChange={onSortChange} />)
    fireEvent.click(screen.getByRole('button', { name: 'Sort' }))
    const menu = screen.getByRole('listbox', { name: 'Sort by' })
    expect(menu).toBeInTheDocument()
    fireEvent.click(screen.getByRole('option', { name: 'Title' }))
    expect(onSortChange).toHaveBeenCalledWith({ key: 'title', direction: 'asc' })
  })
})
