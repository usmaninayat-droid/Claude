import { describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen } from '@testing-library/react'
import { EntityIdentityPanel } from './EntityIdentityPanel'

describe('EntityIdentityPanel', () => {
  it('overlays the status pill top-start ON the art tile rather than as a separate block above it', () => {
    render(
      <EntityIdentityPanel
        name="Tanker 04"
        statusOverlay={<span>Active</span>}
        details={[]}
      />,
    )
    const status = screen.getByText('Active').closest('[data-slot="entity-profile-status"]')
    expect(status).toBeInTheDocument()
    // The status slot is a sibling INSIDE the tile (the tile is its `relative`
    // parent, `absolute` is what makes it an overlay rather than a stacked block).
    expect(status).toHaveClass('absolute')
    const tile = status?.parentElement
    expect(tile).toHaveClass('relative')
  })

  it('the art tile never shrinks below its intended height (P1-O, run-2026-09-05-job-orders: a long `details` list must not squash the hero)', () => {
    render(
      <EntityIdentityPanel
        name="Oil Change"
        statusOverlay={<span>Scheduled</span>}
        details={Array.from({ length: 12 }, (_, i) => ({ label: `Field ${i}`, value: `Value ${i}` }))}
      />,
    )
    const status = screen.getByText('Scheduled').closest('[data-slot="entity-profile-status"]')
    const tile = status?.parentElement
    // `shrink-0` alongside the fixed height — a flex item with an explicit
    // height still shrinks under the default flex algorithm once the rail's
    // OTHER content (a long details list here) makes the column's total
    // content taller than the rail itself; the rail's own `overflow-y-auto`
    // is what should absorb that, never the hero tile silently shrinking.
    expect(tile).toHaveClass('h-[12.5rem]')
    expect(tile).toHaveClass('shrink-0')
  })

  it('renders no add-tag control when onAddTag is omitted, and no tag row at all with nothing to show', () => {
    render(<EntityIdentityPanel name="Tanker 04" details={[]} />)
    expect(screen.queryByRole('button', { name: 'Add tag' })).not.toBeInTheDocument()
  })

  it('shows existing tags as chips and the "+" affordance when onAddTag is supplied, even with zero tags', () => {
    render(<EntityIdentityPanel name="Tanker 04" tags={[]} onAddTag={() => {}} details={[]} />)
    expect(screen.getByRole('button', { name: 'Add tag' })).toBeInTheDocument()
  })

  it('the "+" button opens a popover; submitting a typed label calls onAddTag with the trimmed value and closes the popover', () => {
    const onAddTag = vi.fn()
    render(
      <EntityIdentityPanel
        name="Tanker 04"
        tags={[{ id: 't1', label: 'Night Shift' }]}
        onAddTag={onAddTag}
        details={[]}
      />,
    )
    expect(screen.getByText('Night Shift')).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'Add tag' }))
    const input = screen.getByPlaceholderText('Tag name')
    fireEvent.change(input, { target: { value: '  Zone 3  ' } })
    fireEvent.click(screen.getByRole('button', { name: 'Add' }))

    expect(onAddTag).toHaveBeenCalledTimes(1)
    expect(onAddTag).toHaveBeenCalledWith('Zone 3')
    // The popover's own input closes/clears after a successful submit.
    expect(screen.queryByPlaceholderText('Tag name')).not.toBeInTheDocument()
  })

  it('does not call onAddTag for a blank/whitespace-only label', () => {
    const onAddTag = vi.fn()
    render(<EntityIdentityPanel name="Tanker 04" tags={[]} onAddTag={onAddTag} details={[]} />)

    fireEvent.click(screen.getByRole('button', { name: 'Add tag' }))
    const submit = screen.getByRole('button', { name: 'Add' })
    expect(submit).toBeDisabled()
    fireEvent.change(screen.getByPlaceholderText('Tag name'), { target: { value: '   ' } })
    expect(screen.getByRole('button', { name: 'Add' })).toBeDisabled()
    expect(onAddTag).not.toHaveBeenCalled()
  })

  it('removing a tag calls onRemoveTag with that tag\'s id', () => {
    const onRemoveTag = vi.fn()
    render(
      <EntityIdentityPanel
        name="Tanker 04"
        tags={[{ id: 't1', label: 'Night Shift' }]}
        onRemoveTag={onRemoveTag}
        details={[]}
      />,
    )
    fireEvent.click(screen.getByRole('button', { name: 'Remove tag Night Shift' }))
    expect(onRemoveTag).toHaveBeenCalledWith('t1')
  })
})
