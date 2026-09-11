import { useState } from 'react'
import { describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { GroupByMenuButton, type GroupByMenuOption } from './GroupByMenuButton'

const OPTIONS: GroupByMenuOption[] = [
  { key: 'status', label: 'Status' },
  { key: 'lot', label: 'Lot' },
  { key: 'severity', label: 'Severity' },
]

/** Controlled component — a stateful harness looks like a real consumer (`RecordMapListToolbar`). */
function Harness({ initial = 'status' }: { initial?: string }) {
  const [value, setValue] = useState(initial)
  return <GroupByMenuButton options={OPTIONS} value={value} defaultValue="status" onChange={setValue} />
}

describe('GroupByMenuButton — popover anatomy (SPEC Addendum "Group By popup")', () => {
  it('is closed until the trigger opens it, then shows a "Group by" header + one radio per option', () => {
    render(<Harness />)
    expect(screen.queryByRole('radio')).not.toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Group by' }))
    expect(screen.getByRole('radio', { name: 'Status' })).toBeInTheDocument()
    expect(screen.getByRole('radio', { name: 'Lot' })).toBeInTheDocument()
    expect(screen.getByRole('radio', { name: 'Severity' })).toBeInTheDocument()
  })
})

describe('GroupByMenuButton — AC-6.1: true single-select, live commit, no Apply button', () => {
  it('exactly one radio is checked at a time', () => {
    render(<Harness />)
    fireEvent.click(screen.getByRole('button', { name: 'Group by' }))
    expect(screen.getByRole('radio', { name: 'Status' })).toHaveAttribute('data-state', 'checked')
    expect(screen.getByRole('radio', { name: 'Lot' })).toHaveAttribute('data-state', 'unchecked')
    expect(screen.getByRole('radio', { name: 'Severity' })).toHaveAttribute('data-state', 'unchecked')
  })

  it('picking a new option clears the previous one in the same frame and commits immediately', () => {
    render(<Harness />)
    fireEvent.click(screen.getByRole('button', { name: 'Group by' }))
    fireEvent.click(screen.getByText('Lot'))
    expect(screen.getByRole('radio', { name: 'Lot' })).toHaveAttribute('data-state', 'checked')
    expect(screen.getByRole('radio', { name: 'Status' })).toHaveAttribute('data-state', 'unchecked')
  })

  it('reports every pick through onChange', () => {
    const onChange = vi.fn()
    render(<GroupByMenuButton options={OPTIONS} value="status" defaultValue="status" onChange={onChange} />)
    fireEvent.click(screen.getByRole('button', { name: 'Group by' }))
    fireEvent.click(screen.getByText('Severity'))
    expect(onChange).toHaveBeenCalledWith('severity')
  })
})

describe('GroupByMenuButton — AC-6.2: Reset restores the configured default, not "no grouping"', () => {
  it('hides Reset while `value` already equals `defaultValue`', () => {
    render(<Harness />)
    fireEvent.click(screen.getByRole('button', { name: 'Group by' }))
    expect(screen.queryByRole('button', { name: 'Reset' })).not.toBeInTheDocument()
  })

  it('shows Reset once a non-default option is active, and it restores the default (never clears to "off")', () => {
    render(<Harness />)
    fireEvent.click(screen.getByRole('button', { name: 'Group by' }))
    fireEvent.click(screen.getByText('Severity'))
    expect(screen.getByRole('radio', { name: 'Severity' })).toHaveAttribute('data-state', 'checked')

    fireEvent.click(screen.getByRole('button', { name: 'Reset' }))
    expect(screen.getByRole('radio', { name: 'Status' })).toHaveAttribute('data-state', 'checked')
    expect(screen.queryByRole('button', { name: 'Reset' })).not.toBeInTheDocument()
  })
})

describe('GroupByMenuButton — AC-6.3: dismiss on outside click / Escape needs no confirm', () => {
  it('closes on an outside click, current grouping unchanged', async () => {
    render(<Harness />)
    fireEvent.click(screen.getByRole('button', { name: 'Group by' }))
    fireEvent.click(screen.getByText('Lot'))
    expect(screen.getByRole('radio', { name: 'Lot' })).toBeInTheDocument()

    // Radix's outside-pointerdown listener attaches on a `setTimeout(0)` (so
    // the SAME click that opened the popover can't immediately close it) —
    // a real tick has to pass before an outside `pointerdown` is honored.
    await new Promise((resolve) => setTimeout(resolve, 0))
    fireEvent.pointerDown(document.body)
    await waitFor(() => expect(screen.queryByRole('radio', { name: 'Lot' })).not.toBeInTheDocument())

    fireEvent.click(screen.getByRole('button', { name: 'Group by' }))
    expect(screen.getByRole('radio', { name: 'Lot' })).toHaveAttribute('data-state', 'checked')
  })

  it('closes on Escape', async () => {
    render(<Harness />)
    fireEvent.click(screen.getByRole('button', { name: 'Group by' }))
    fireEvent.keyDown(document.activeElement ?? document.body, { key: 'Escape' })
    await waitFor(() => expect(screen.queryByRole('radio', { name: 'Status' })).not.toBeInTheDocument())
  })
})
