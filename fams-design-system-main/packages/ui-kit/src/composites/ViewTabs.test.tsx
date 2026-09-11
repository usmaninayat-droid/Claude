import { describe, expect, it, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { ViewTabs, type ViewTab } from './ViewTabs'

const TABS: ViewTab[] = [
  { id: 'v1', label: 'All bins' },
  { id: 'v2', label: 'Overdue', dirty: true },
  { id: 'v3', label: 'My lot' },
]

describe('ViewTabs', () => {
  it('renders every tab label', () => {
    render(<ViewTabs tabs={TABS} activeId="v1" onSelect={() => {}} />)
    expect(screen.getByText('All bins')).toBeInTheDocument()
    expect(screen.getByText('Overdue')).toBeInTheDocument()
    expect(screen.getByText('My lot')).toBeInTheDocument()
  })

  it('marks the active tab via aria-selected', () => {
    render(<ViewTabs tabs={TABS} activeId="v2" onSelect={() => {}} />)
    expect(screen.getByText('All bins').closest('[role="tab"]')).toHaveAttribute('aria-selected', 'false')
    expect(screen.getByText('Overdue').closest('[role="tab"]')).toHaveAttribute('aria-selected', 'true')
  })

  it('calls onSelect when a tab is clicked', () => {
    const onSelect = vi.fn()
    render(<ViewTabs tabs={TABS} activeId="v1" onSelect={onSelect} />)
    fireEvent.click(screen.getByText('My lot'))
    expect(onSelect).toHaveBeenCalledWith('v3')
  })

  it('moves selection with ArrowRight/ArrowLeft from the focused tab', () => {
    const onSelect = vi.fn()
    render(<ViewTabs tabs={TABS} activeId="v1" onSelect={onSelect} />)
    fireEvent.keyDown(screen.getByText('All bins').closest('[role="tab"]')!, { key: 'ArrowRight' })
    expect(onSelect).toHaveBeenCalledWith('v2')
  })

  it('does not show a rename or close control when the callbacks are omitted', () => {
    render(<ViewTabs tabs={TABS} activeId="v1" onSelect={() => {}} />)
    expect(screen.queryByRole('button', { name: 'Rename All bins' })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Close All bins' })).not.toBeInTheDocument()
  })

  // The per-tab menu trigger is a Radix DropdownMenuTrigger, which opens on
  // pointerdown (unavailable in jsdom) or on Enter/Space/ArrowDown keydown —
  // same workaround as DropdownMenu.test.tsx / UserMenu.test.tsx, via keyboard
  // instead of a simulated pointer click.
  it('renames a tab via the per-tab menu', () => {
    const onRename = vi.fn()
    render(<ViewTabs tabs={TABS} activeId="v1" onSelect={() => {}} onRename={onRename} />)
    fireEvent.keyDown(screen.getByRole('button', { name: 'Rename All bins' }), { key: 'Enter' })
    fireEvent.click(screen.getByRole('menuitem', { name: 'Rename' }))
    const input = screen.getByLabelText('Rename All bins')
    fireEvent.change(input, { target: { value: 'Every bin' } })
    fireEvent.keyDown(input, { key: 'Enter' })
    expect(onRename).toHaveBeenCalledWith('v1', 'Every bin')
  })

  it('cancels a rename on Escape without calling onRename', () => {
    const onRename = vi.fn()
    render(<ViewTabs tabs={TABS} activeId="v1" onSelect={() => {}} onRename={onRename} />)
    fireEvent.keyDown(screen.getByRole('button', { name: 'Rename All bins' }), { key: 'Enter' })
    fireEvent.click(screen.getByRole('menuitem', { name: 'Rename' }))
    const input = screen.getByLabelText('Rename All bins')
    fireEvent.change(input, { target: { value: 'Every bin' } })
    fireEvent.keyDown(input, { key: 'Escape' })
    expect(onRename).not.toHaveBeenCalled()
    expect(screen.getByText('All bins')).toBeInTheDocument()
  })

  it('closes a tab via its close control without selecting it first', () => {
    const onClose = vi.fn()
    const onSelect = vi.fn()
    render(<ViewTabs tabs={TABS} activeId="v1" onSelect={onSelect} onClose={onClose} />)
    fireEvent.click(screen.getByRole('button', { name: 'Close My lot' }))
    expect(onClose).toHaveBeenCalledWith('v3')
    expect(onSelect).not.toHaveBeenCalled()
  })

  it('calls onAdd from the "+" control', () => {
    const onAdd = vi.fn()
    render(<ViewTabs tabs={TABS} activeId="v1" onSelect={() => {}} onAdd={onAdd} />)
    fireEvent.click(screen.getByRole('button', { name: 'Add view' }))
    expect(onAdd).toHaveBeenCalled()
  })

  it('does not render the "+" control when onAdd is omitted', () => {
    render(<ViewTabs tabs={TABS} activeId="v1" onSelect={() => {}} />)
    expect(screen.queryByRole('button', { name: 'Add view' })).not.toBeInTheDocument()
  })

  it('shows the Modified strip with Revert / Save as new / Save when the active tab is dirty', () => {
    render(
      <ViewTabs
        tabs={TABS}
        activeId="v2"
        onSelect={() => {}}
        onRevert={() => {}}
        onSaveAsNew={() => {}}
        onSave={() => {}}
      />,
    )
    expect(screen.getByText('Modified')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Revert' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Save as new' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Save' })).toBeInTheDocument()
  })

  it('hides the Modified strip when the active tab is not dirty', () => {
    render(<ViewTabs tabs={TABS} activeId="v1" onSelect={() => {}} onRevert={() => {}} onSave={() => {}} />)
    expect(screen.queryByText('Modified')).not.toBeInTheDocument()
  })
})
