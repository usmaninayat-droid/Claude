import { describe, expect, it, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { FilterPopup } from './FilterPopup'

describe('FilterPopup', () => {
  it('shows the trigger label and no count badge when activeCount is unset', () => {
    render(
      <FilterPopup>
        <p>Body</p>
      </FilterPopup>,
    )
    expect(screen.getByRole('button', { name: 'Filters' })).toBeInTheDocument()
    expect(screen.queryByText('0')).not.toBeInTheDocument()
  })

  it('shows the active-count badge on the trigger when activeCount is set', () => {
    render(
      <FilterPopup activeCount={3}>
        <p>Body</p>
      </FilterPopup>,
    )
    expect(screen.getByText('3')).toBeInTheDocument()
  })

  it('hides the badge when activeCount is 0', () => {
    render(
      <FilterPopup activeCount={0}>
        <p>Body</p>
      </FilterPopup>,
    )
    expect(screen.queryByText('0')).not.toBeInTheDocument()
  })

  it('is closed by default and opens the popover body on trigger click', () => {
    render(
      <FilterPopup>
        <p>Filter controls go here</p>
      </FilterPopup>,
    )
    expect(screen.queryByText('Filter controls go here')).not.toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Filters' }))
    expect(screen.getByText('Filter controls go here')).toBeInTheDocument()
  })

  it('renders arbitrary children as the popover body (state-agnostic)', () => {
    render(
      <FilterPopup defaultOpen>
        <div data-testid="custom-body">
          <label>
            <input type="checkbox" /> Active only
          </label>
        </div>
      </FilterPopup>,
    )
    expect(screen.getByTestId('custom-body')).toBeInTheDocument()
    expect(screen.getByLabelText('Active only')).toBeInTheDocument()
  })

  it('renders no footer when neither onClearAll nor onApply is provided', () => {
    render(
      <FilterPopup defaultOpen>
        <p>Body</p>
      </FilterPopup>,
    )
    expect(screen.queryByRole('button', { name: 'Clear all' })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Apply' })).not.toBeInTheDocument()
  })

  it('calls onClearAll when the footer Clear all button is clicked', () => {
    const onClearAll = vi.fn()
    render(
      <FilterPopup defaultOpen onClearAll={onClearAll}>
        <p>Body</p>
      </FilterPopup>,
    )
    fireEvent.click(screen.getByRole('button', { name: 'Clear all' }))
    expect(onClearAll).toHaveBeenCalledTimes(1)
  })

  it('calls onApply when the footer Apply button is clicked, with a custom label', () => {
    const onApply = vi.fn()
    render(
      <FilterPopup defaultOpen onApply={onApply} applyLabel="Apply filters">
        <p>Body</p>
      </FilterPopup>,
    )
    fireEvent.click(screen.getByRole('button', { name: 'Apply filters' }))
    expect(onApply).toHaveBeenCalledTimes(1)
  })

  it('disables the trigger when disabled is set', () => {
    render(
      <FilterPopup disabled>
        <p>Body</p>
      </FilterPopup>,
    )
    expect(screen.getByRole('button', { name: 'Filters' })).toBeDisabled()
  })

  it('supports a custom trigger label', () => {
    render(
      <FilterPopup triggerLabel="Refine">
        <p>Body</p>
      </FilterPopup>,
    )
    expect(screen.getByRole('button', { name: 'Refine' })).toBeInTheDocument()
  })

  it('renders under RTL (dir=rtl) without error', () => {
    const { container } = render(
      <div dir="rtl">
        <FilterPopup defaultOpen activeCount={2} onClearAll={() => {}} onApply={() => {}}>
          <p>Body</p>
        </FilterPopup>
      </div>,
    )
    expect(container.querySelector('[dir="rtl"]')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Filters' })).toBeInTheDocument()
    expect(screen.getByText('2')).toBeInTheDocument()
  })
})
