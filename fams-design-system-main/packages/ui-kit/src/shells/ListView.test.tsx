import { describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'
import { ListView } from './ListView'

describe('ListView', () => {
  it('renders the page header (title/subtitle/actions) and content', () => {
    render(
      <ListView
        title="Bins"
        subtitle="3 bins"
        actions={<button type="button">New</button>}
      >
        <div data-testid="table">rows</div>
      </ListView>,
    )
    expect(screen.getByRole('heading', { level: 1, name: 'Bins' })).toBeInTheDocument()
    expect(screen.getByText('3 bins')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'New' })).toBeInTheDocument()
    expect(screen.getByTestId('table')).toBeInTheDocument()
    expect(screen.getByTestId('list-content')).toContainElement(
      screen.getByTestId('table'),
    )
  })

  it('renders the filter-bar region only when filterBar is provided', () => {
    const { rerender } = render(
      <ListView title="Bins">
        <div>rows</div>
      </ListView>,
    )
    expect(screen.queryByTestId('list-filter-bar')).toBeNull()

    rerender(
      <ListView title="Bins" filterBar={<input aria-label="Filter" />}>
        <div>rows</div>
      </ListView>,
    )
    expect(screen.getByTestId('list-filter-bar')).toBeInTheDocument()
    expect(screen.getByLabelText('Filter')).toBeInTheDocument()
  })
})
