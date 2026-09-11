import { describe, expect, it, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { configureAxe } from 'vitest-axe'
// Deep import: vitest-axe's `./matchers` entry re-exports type-only, which
// verbatimModuleSyntax rejects for value use (same pattern as a11y.axe.test.tsx).
import { toHaveNoViolations } from 'vitest-axe/dist/matchers.js'
import type { AxeMatchers } from 'vitest-axe'
import { TagPicker } from './TagPicker'
import type { TagOption } from './TagChipList'

expect.extend({ toHaveNoViolations })

declare module 'vitest' {
  // eslint-disable-next-line @typescript-eslint/no-empty-object-type, @typescript-eslint/no-unused-vars
  interface Assertion<T> extends AxeMatchers {}
  // eslint-disable-next-line @typescript-eslint/no-empty-object-type
  interface AsymmetricMatchersContaining extends AxeMatchers {}
}

const axe = configureAxe({
  rules: {
    'color-contrast': { enabled: false },
    region: { enabled: false },
  },
})

const OPTIONS: TagOption[] = [
  { value: 'high', label: 'High', group: 'Priority' },
  { value: 'medium', label: 'Medium', group: 'Priority' },
  { value: 'lot-1', label: 'Lot 1', group: 'Lot' },
  { value: 'lavajet', label: 'Lavajet' },
]

describe('TagPicker', () => {
  it('shows the placeholder when nothing is selected', () => {
    render(<TagPicker options={OPTIONS} value={[]} onChange={() => {}} placeholder="Select tags…" />)
    expect(screen.getByText('Select tags…')).toBeInTheDocument()
  })

  it('shows selected tags as chips in the trigger', () => {
    render(<TagPicker options={OPTIONS} value={['lavajet']} onChange={() => {}} />)
    expect(screen.getByText('Lavajet')).toBeInTheDocument()
  })

  it('opens on trigger click and lists options grouped by category', () => {
    render(<TagPicker options={OPTIONS} value={[]} onChange={() => {}} />)
    fireEvent.click(screen.getByRole('button'))
    expect(screen.getByText('Priority')).toBeInTheDocument()
    expect(screen.getByText('Lot')).toBeInTheDocument()
    expect(screen.getByRole('option', { name: 'High' })).toBeInTheDocument()
  })

  it('toggles a plain (non-exclusive) tag on and off independently', () => {
    const onChange = vi.fn()
    render(<TagPicker options={OPTIONS} value={['lot-1']} onChange={onChange} />)
    fireEvent.click(screen.getByRole('button'))
    fireEvent.click(screen.getByRole('option', { name: 'Lavajet' }))
    expect(onChange).toHaveBeenCalledWith(['lot-1', 'lavajet'])
  })

  it('deselects a sibling in the same exclusive group when a new one is picked', () => {
    const onChange = vi.fn()
    render(
      <TagPicker
        options={OPTIONS}
        value={['high']}
        onChange={onChange}
        exclusiveGroups={['Priority']}
      />,
    )
    fireEvent.click(screen.getByRole('button'))
    fireEvent.click(screen.getByRole('option', { name: 'Medium' }))
    expect(onChange).toHaveBeenCalledWith(['medium'])
  })

  it('does not force exclusivity for a group not listed in exclusiveGroups', () => {
    const onChange = vi.fn()
    render(<TagPicker options={OPTIONS} value={['high']} onChange={onChange} exclusiveGroups={['Lot']} />)
    fireEvent.click(screen.getByRole('button'))
    fireEvent.click(screen.getByRole('option', { name: 'Medium' }))
    expect(onChange).toHaveBeenCalledWith(['high', 'medium'])
  })

  it('shows emptyText when there are no options', () => {
    render(<TagPicker options={[]} value={[]} onChange={() => {}} emptyText="No tags configured" />)
    fireEvent.click(screen.getByRole('button'))
    expect(screen.getByText('No tags configured')).toBeInTheDocument()
  })

  it('filters options as the query changes (type-ahead)', () => {
    render(<TagPicker options={OPTIONS} value={[]} onChange={() => {}} />)
    fireEvent.click(screen.getByRole('button'))
    fireEvent.change(screen.getByPlaceholderText('Search tags…'), { target: { value: 'lot' } })
    expect(screen.getByRole('option', { name: 'Lot 1' })).toBeInTheDocument()
    expect(screen.queryByRole('option', { name: 'High' })).not.toBeInTheDocument()
  })

  it('arrow-key navigation moves the highlighted option, and Enter selects it', () => {
    const onChange = vi.fn()
    render(<TagPicker options={OPTIONS} value={[]} onChange={onChange} />)
    fireEvent.click(screen.getByRole('button'))
    const search = screen.getByPlaceholderText('Search tags…')

    // Opening highlights the first registered option.
    expect(screen.getByRole('option', { name: 'High' })).toHaveAttribute('aria-selected', 'true')

    fireEvent.keyDown(search, { key: 'ArrowDown' })
    expect(screen.getByRole('option', { name: 'Medium' })).toHaveAttribute('aria-selected', 'true')
    expect(screen.getByRole('option', { name: 'High' })).toHaveAttribute('aria-selected', 'false')

    fireEvent.keyDown(search, { key: 'ArrowDown' })
    expect(screen.getByRole('option', { name: 'Lot 1' })).toHaveAttribute('aria-selected', 'true')

    fireEvent.keyDown(search, { key: 'ArrowUp' })
    expect(screen.getByRole('option', { name: 'Medium' })).toHaveAttribute('aria-selected', 'true')

    fireEvent.keyDown(search, { key: 'Enter' })
    expect(onChange).toHaveBeenCalledWith(['medium'])
  })

  it('has no axe violations when open', async () => {
    render(<TagPicker options={OPTIONS} value={['lot-1']} onChange={() => {}} />)
    fireEvent.click(screen.getByRole('button'))
    const results = await axe(document.body)
    expect(results).toHaveNoViolations()
  })

  // F1 regression test: cmdk@1.1.1's `Command.List` always overwrites any
  // `id` prop with its own internally-generated one, so `aria-controls` must
  // resolve to whatever id cmdk actually assigned — never a static id we
  // guessed ahead of time. This class of bug is invisible to axe.
  it('wires the trigger\'s aria-controls to the actual listbox element (not a dangling id)', () => {
    render(<TagPicker options={OPTIONS} value={[]} onChange={() => {}} />)
    const trigger = screen.getByRole('button')
    fireEvent.click(trigger)
    const controlsId = trigger.getAttribute('aria-controls')
    expect(controlsId).toBeTruthy()
    const controlled = document.getElementById(controlsId!)
    expect(controlled).not.toBeNull()
    expect(controlled).toHaveAttribute('role', 'listbox')
    expect(controlled).toBe(screen.getByRole('listbox'))
  })
})
