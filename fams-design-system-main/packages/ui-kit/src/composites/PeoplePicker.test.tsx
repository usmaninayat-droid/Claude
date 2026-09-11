import { describe, expect, it, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { configureAxe } from 'vitest-axe'
// Deep import: vitest-axe's `./matchers` entry re-exports type-only, which
// verbatimModuleSyntax rejects for value use (same pattern as a11y.axe.test.tsx).
import { toHaveNoViolations } from 'vitest-axe/dist/matchers.js'
import type { AxeMatchers } from 'vitest-axe'
import { PeoplePicker, type PersonOption } from './PeoplePicker'

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

const PEOPLE: PersonOption[] = [
  { id: 'u1', name: 'Kashish Bindrani', email: 'kashish@fams.com' },
  { id: 'u2', name: 'Emmad Ahmad', email: 'emmad@fams.com' },
  { id: 'u3', name: 'Saed Salah', email: 'saed@fams.com' },
]

describe('PeoplePicker', () => {
  it('shows the placeholder when nothing is selected', () => {
    render(<PeoplePicker people={PEOPLE} value={null} onChange={() => {}} placeholder="Unassigned" />)
    expect(screen.getByText('Unassigned')).toBeInTheDocument()
  })

  it('shows the selected name in single mode trigger', () => {
    render(<PeoplePicker people={PEOPLE} value="u2" onChange={() => {}} />)
    expect(screen.getByText('Emmad Ahmad')).toBeInTheDocument()
  })

  it('opens on trigger click and lists the given people', () => {
    render(<PeoplePicker people={PEOPLE} value={null} onChange={() => {}} />)
    fireEvent.click(screen.getByRole('button'))
    expect(screen.getByText('Kashish Bindrani')).toBeInTheDocument()
    expect(screen.getByText('Saed Salah')).toBeInTheDocument()
  })

  it('filters people locally by name or email as the query changes', () => {
    render(<PeoplePicker people={PEOPLE} value={null} onChange={() => {}} />)
    fireEvent.click(screen.getByRole('button'))
    fireEvent.change(screen.getByPlaceholderText('Search by name or email'), { target: { value: 'emmad' } })
    expect(screen.getByText('Emmad Ahmad')).toBeInTheDocument()
    expect(screen.queryByText('Kashish Bindrani')).not.toBeInTheDocument()
  })

  it('shows emptyText when the search matches nobody', () => {
    render(<PeoplePicker people={PEOPLE} value={null} onChange={() => {}} emptyText="No matches" />)
    fireEvent.click(screen.getByRole('button'))
    fireEvent.change(screen.getByPlaceholderText('Search by name or email'), { target: { value: 'zzz' } })
    expect(screen.getByText('No matches')).toBeInTheDocument()
  })

  it('pins the current person to the top labelled "You"', () => {
    render(<PeoplePicker people={PEOPLE} value={null} onChange={() => {}} currentPersonId="u1" />)
    fireEvent.click(screen.getByRole('button'))
    expect(screen.getByText('You')).toBeInTheDocument()
    expect(screen.queryByText('Kashish Bindrani')).not.toBeInTheDocument()
  })

  it('single mode: selecting a person calls onChange and closes the popover', () => {
    const onChange = vi.fn()
    render(<PeoplePicker people={PEOPLE} value={null} onChange={onChange} />)
    fireEvent.click(screen.getByRole('button'))
    fireEvent.click(screen.getByText('Kashish Bindrani'))
    expect(onChange).toHaveBeenCalledWith('u1')
    expect(screen.queryByText('Emmad Ahmad')).not.toBeInTheDocument()
  })

  it('single mode: re-selecting the current value clears it', () => {
    const onChange = vi.fn()
    render(<PeoplePicker people={PEOPLE} value="u1" onChange={onChange} />)
    fireEvent.click(screen.getByRole('button', { name: /Kashish Bindrani/ }))
    fireEvent.click(screen.getByRole('option', { name: /Kashish Bindrani/ }))
    expect(onChange).toHaveBeenCalledWith(null)
  })

  it('multi mode: checking a person adds their id to the selection', () => {
    const onChange = vi.fn()
    render(<PeoplePicker people={PEOPLE} value={['u1']} onChange={onChange} multiple />)
    fireEvent.click(screen.getByRole('button'))
    fireEvent.click(screen.getByRole('checkbox', { name: /Emmad Ahmad/i }))
    expect(onChange).toHaveBeenCalledWith(['u1', 'u2'])
  })

  it('multi mode: unchecking a person removes their id from the selection', () => {
    const onChange = vi.fn()
    render(<PeoplePicker people={PEOPLE} value={['u1', 'u2']} onChange={onChange} multiple />)
    fireEvent.click(screen.getByRole('button'))
    fireEvent.click(screen.getByRole('checkbox', { name: /Emmad Ahmad/i }))
    expect(onChange).toHaveBeenCalledWith(['u1'])
  })

  it('multi mode: select-all adds every visible person', () => {
    const onChange = vi.fn()
    render(<PeoplePicker people={PEOPLE} value={[]} onChange={onChange} multiple />)
    fireEvent.click(screen.getByRole('button'))
    fireEvent.click(screen.getByText('Select all'))
    expect(onChange).toHaveBeenCalledWith(['u1', 'u2', 'u3'])
  })

  it('renders the dashed "Assign" trigger when triggerVariant is assignee-chip and unassigned', () => {
    render(<PeoplePicker people={PEOPLE} value={null} onChange={() => {}} triggerVariant="assignee-chip" />)
    expect(screen.getByText('Assign')).toBeInTheDocument()
  })

  it('renders the avatar + name chip when triggerVariant is assignee-chip and assigned', () => {
    render(<PeoplePicker people={PEOPLE} value="u3" onChange={() => {}} triggerVariant="assignee-chip" />)
    expect(screen.getByText('Saed Salah')).toBeInTheDocument()
    expect(screen.queryByText('Assign')).not.toBeInTheDocument()
  })

  it('assignee-chip: shows a hover-revealed clear button when assigned and onClear is provided, and clicking it calls onClear without opening the popover', () => {
    const onChange = vi.fn()
    const onClear = vi.fn()
    render(
      <PeoplePicker
        people={PEOPLE}
        value="u3"
        onChange={onChange}
        onClear={onClear}
        triggerVariant="assignee-chip"
      />,
    )
    fireEvent.click(screen.getByRole('button', { name: 'Clear' }))
    expect(onClear).toHaveBeenCalledTimes(1)
    expect(onChange).not.toHaveBeenCalled()
    expect(screen.queryByPlaceholderText('Search by name or email')).not.toBeInTheDocument()
  })

  it('assignee-chip: does not show a clear button when onClear is not provided', () => {
    render(<PeoplePicker people={PEOPLE} value="u3" onChange={() => {}} triggerVariant="assignee-chip" />)
    expect(screen.queryByRole('button', { name: 'Clear' })).not.toBeInTheDocument()
  })

  it('assignee-chip: does not show a clear button when unassigned, even with onClear provided', () => {
    render(
      <PeoplePicker
        people={PEOPLE}
        value={null}
        onChange={() => {}}
        onClear={() => {}}
        triggerVariant="assignee-chip"
      />,
    )
    expect(screen.queryByRole('button', { name: 'Clear' })).not.toBeInTheDocument()
  })

  it('does not open when disabled', () => {
    render(<PeoplePicker people={PEOPLE} value={null} onChange={() => {}} disabled />)
    fireEvent.click(screen.getByRole('button'))
    expect(screen.queryByText('Kashish Bindrani')).not.toBeInTheDocument()
  })

  it('single mode: arrow-key navigation moves the highlighted option, and Enter selects it', () => {
    const onChange = vi.fn()
    render(<PeoplePicker people={PEOPLE} value={null} onChange={onChange} />)
    fireEvent.click(screen.getByRole('button'))
    const search = screen.getByPlaceholderText('Search by name or email')

    // Opening highlights the first registered option.
    expect(screen.getByRole('option', { name: /Kashish Bindrani/ })).toHaveAttribute('aria-selected', 'true')

    fireEvent.keyDown(search, { key: 'ArrowDown' })
    expect(screen.getByRole('option', { name: /Emmad Ahmad/ })).toHaveAttribute('aria-selected', 'true')

    fireEvent.keyDown(search, { key: 'ArrowDown' })
    expect(screen.getByRole('option', { name: /Saed Salah/ })).toHaveAttribute('aria-selected', 'true')

    fireEvent.keyDown(search, { key: 'ArrowUp' })
    expect(screen.getByRole('option', { name: /Emmad Ahmad/ })).toHaveAttribute('aria-selected', 'true')

    fireEvent.keyDown(search, { key: 'Enter' })
    expect(onChange).toHaveBeenCalledWith('u2')
  })

  it('multi mode: arrow-key navigation and Enter toggles the highlighted person exactly once', () => {
    const onChange = vi.fn()
    render(<PeoplePicker people={PEOPLE} value={[]} onChange={onChange} multiple />)
    fireEvent.click(screen.getByRole('button'))
    const search = screen.getByPlaceholderText('Search by name or email')

    fireEvent.keyDown(search, { key: 'ArrowDown' })
    fireEvent.keyDown(search, { key: 'Enter' })
    expect(onChange).toHaveBeenCalledTimes(1)
    expect(onChange).toHaveBeenCalledWith(['u2'])
  })

  it('multi mode: clicking the checkbox toggles exactly once (no double-toggle from the roving item)', () => {
    const onChange = vi.fn()
    render(<PeoplePicker people={PEOPLE} value={['u1']} onChange={onChange} multiple />)
    fireEvent.click(screen.getByRole('button'))
    fireEvent.click(screen.getByRole('checkbox', { name: /Emmad Ahmad/i }))
    expect(onChange).toHaveBeenCalledTimes(1)
    expect(onChange).toHaveBeenCalledWith(['u1', 'u2'])
  })

  it('has no axe violations when open', async () => {
    render(<PeoplePicker people={PEOPLE} value={null} onChange={() => {}} currentPersonId="u1" />)
    fireEvent.click(screen.getByRole('button'))
    const results = await axe(document.body)
    expect(results).toHaveNoViolations()
  })

  // F1 regression test: cmdk@1.1.1's `Command.List` always overwrites any
  // `id` prop with its own internally-generated one, so `aria-controls` must
  // resolve to whatever id cmdk actually assigned — never a static id we
  // guessed ahead of time. This class of bug is invisible to axe.
  it('wires the trigger\'s aria-controls to the actual listbox element (not a dangling id)', () => {
    render(<PeoplePicker people={PEOPLE} value={null} onChange={() => {}} />)
    const trigger = screen.getByRole('button')
    fireEvent.click(trigger)
    const controlsId = trigger.getAttribute('aria-controls')
    expect(controlsId).toBeTruthy()
    const controlled = document.getElementById(controlsId!)
    expect(controlled).not.toBeNull()
    expect(controlled).toHaveAttribute('role', 'listbox')
    expect(controlled).toBe(screen.getByRole('listbox'))
  })

  it('wires aria-controls for the assignee-chip trigger variant too', () => {
    render(
      <PeoplePicker people={PEOPLE} value={null} onChange={() => {}} triggerVariant="assignee-chip" />,
    )
    const trigger = screen.getByRole('button')
    fireEvent.click(trigger)
    const controlsId = trigger.getAttribute('aria-controls')
    expect(controlsId).toBeTruthy()
    expect(document.getElementById(controlsId!)).toBe(screen.getByRole('listbox'))
  })
})
