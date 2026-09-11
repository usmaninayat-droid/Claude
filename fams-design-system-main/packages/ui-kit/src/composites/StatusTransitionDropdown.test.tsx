import { describe, expect, it, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { StatusTransitionDropdown, type TransitionStage } from './StatusTransitionDropdown'

const STAGES: TransitionStage[] = [
  { id: 'new', label: 'New', tone: 'neutral' },
  { id: 'in-progress', label: 'In Progress', tone: 'info' },
  { id: 'blocked', label: 'Blocked', tone: 'warning', disabledReason: 'Awaiting parts' },
  { id: 'closed', label: 'Closed', tone: 'success', requiresReason: true },
  { id: 'cancelled', label: 'Cancelled', tone: 'danger', requiresReason: true, destructive: true },
]

describe('StatusTransitionDropdown', () => {
  it('renders the current stage as the trigger label', () => {
    render(<StatusTransitionDropdown stages={STAGES} currentId="in-progress" onTransition={vi.fn()} />)
    expect(screen.getByRole('button', { name: /In Progress/i })).toBeInTheDocument()
  })

  // Radix menus open via pointer-capture, which jsdom lacks, so we render
  // with `defaultOpen` to assert menu content (same pattern as UserMenu.test /
  // DropdownMenu.test). Once the menu is rendered open, clicking a menuitem
  // works fine in jsdom.
  it('only offers stages after the current one when forwardOnly (default)', () => {
    render(<StatusTransitionDropdown stages={STAGES} currentId="in-progress" onTransition={vi.fn()} defaultOpen />)
    expect(screen.queryByRole('menuitem', { name: /New/i })).not.toBeInTheDocument()
    expect(screen.getByRole('menuitem', { name: /Blocked/i })).toBeInTheDocument()
    expect(screen.getByRole('menuitem', { name: /Closed/i })).toBeInTheDocument()
  })

  it('offers every other stage when forwardOnly is false', () => {
    render(
      <StatusTransitionDropdown
        stages={STAGES}
        currentId="in-progress"
        onTransition={vi.fn()}
        forwardOnly={false}
        defaultOpen
      />,
    )
    expect(screen.getByRole('menuitem', { name: /New/i })).toBeInTheDocument()
  })

  it('disables a target with disabledReason and shows the explanation', () => {
    render(<StatusTransitionDropdown stages={STAGES} currentId="in-progress" onTransition={vi.fn()} defaultOpen />)
    expect(screen.getByRole('menuitem', { name: /Blocked/i })).toHaveAttribute('aria-disabled', 'true')
    expect(screen.getByText('Awaiting parts')).toBeInTheDocument()
  })

  it('transitions immediately for a target with no guard', () => {
    const onTransition = vi.fn()
    render(<StatusTransitionDropdown stages={STAGES} currentId="new" onTransition={onTransition} defaultOpen />)
    fireEvent.click(screen.getByRole('menuitem', { name: /In Progress/i }))
    expect(onTransition).toHaveBeenCalledWith('in-progress')
  })

  it('opens a reason dialog for a guarded target and blocks transition until filled', () => {
    const onTransition = vi.fn()
    render(<StatusTransitionDropdown stages={STAGES} currentId="in-progress" onTransition={onTransition} defaultOpen />)
    fireEvent.click(screen.getByRole('menuitem', { name: /Closed/i }))

    expect(screen.getByRole('dialog')).toBeInTheDocument()
    expect(onTransition).not.toHaveBeenCalled()
    const confirmButton = screen.getByRole('button', { name: 'Move to Closed' })
    expect(confirmButton).toBeDisabled()

    fireEvent.change(screen.getByLabelText('Reason'), { target: { value: 'All bins collected' } })
    expect(confirmButton).toBeEnabled()
    fireEvent.click(confirmButton)

    expect(onTransition).toHaveBeenCalledWith('closed', 'All bins collected')
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  it('trims the reason before passing it to onTransition', () => {
    const onTransition = vi.fn()
    render(<StatusTransitionDropdown stages={STAGES} currentId="in-progress" onTransition={onTransition} defaultOpen />)
    fireEvent.click(screen.getByRole('menuitem', { name: /Closed/i }))
    fireEvent.change(screen.getByLabelText('Reason'), { target: { value: '  All bins collected  ' } })
    fireEvent.click(screen.getByRole('button', { name: 'Move to Closed' }))
    expect(onTransition).toHaveBeenCalledWith('closed', 'All bins collected')
  })

  it('uses the destructive button variant for a guarded target flagged destructive', () => {
    render(<StatusTransitionDropdown stages={STAGES} currentId="in-progress" onTransition={vi.fn()} defaultOpen />)
    fireEvent.click(screen.getByRole('menuitem', { name: /Cancelled/i }))
    fireEvent.change(screen.getByLabelText('Reason'), { target: { value: 'Client cancelled route' } })
    expect(screen.getByRole('button', { name: 'Move to Cancelled' })).toHaveClass('bg-destructive')
  })

  it('closing the dialog without confirming does not transition and clears the reason', () => {
    const onTransition = vi.fn()
    render(<StatusTransitionDropdown stages={STAGES} currentId="in-progress" onTransition={onTransition} defaultOpen />)
    fireEvent.click(screen.getByRole('menuitem', { name: /Closed/i }))
    fireEvent.change(screen.getByLabelText('Reason'), { target: { value: 'partial input' } })
    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }))
    expect(onTransition).not.toHaveBeenCalled()
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  it('disables the trigger entirely and offers no menu when disabled', () => {
    render(<StatusTransitionDropdown stages={STAGES} currentId="in-progress" onTransition={vi.fn()} disabled />)
    expect(screen.getByRole('button', { name: 'Status: In Progress' })).toBeDisabled()
  })

  it('renders no chevron and disables the trigger when there are no reachable targets', () => {
    render(<StatusTransitionDropdown stages={STAGES} currentId="cancelled" onTransition={vi.fn()} />)
    expect(screen.getByRole('button', { name: 'Status: Cancelled' })).toBeDisabled()
  })

  it('renders nothing if currentId does not match any stage', () => {
    const { container } = render(
      <StatusTransitionDropdown stages={STAGES} currentId="unknown" onTransition={vi.fn()} />,
    )
    expect(container).toBeEmptyDOMElement()
  })

  it('supports defaultOpen for rendering the menu open without interaction', () => {
    render(
      <StatusTransitionDropdown stages={STAGES} currentId="in-progress" onTransition={vi.fn()} defaultOpen />,
    )
    expect(screen.getByRole('menuitem', { name: /Closed/i })).toBeInTheDocument()
  })

  it('renders custom trigger content via renderTrigger, keeping the default aria-label', () => {
    render(
      <StatusTransitionDropdown
        stages={STAGES}
        currentId="in-progress"
        onTransition={vi.fn()}
        renderTrigger={(current, canOpen) => <span>Change Status ({current.label}, {canOpen ? 'open' : 'closed'})</span>}
      />,
    )
    expect(screen.getByText('Change Status (In Progress, open)')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /In Progress/i })).toBeInTheDocument()
    expect(screen.queryByText('In Progress', { selector: '[data-slot="badge"]' })).not.toBeInTheDocument()
  })

  it('forwards a ref to the trigger button', () => {
    let node: HTMLButtonElement | null = null
    render(
      <StatusTransitionDropdown
        stages={STAGES}
        currentId="in-progress"
        onTransition={vi.fn()}
        ref={(el) => {
          node = el
        }}
      />,
    )
    expect(node).toBeInstanceOf(HTMLButtonElement)
  })
})
