import { describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'
import { FormGrid } from './FormGrid'

describe('FormGrid', () => {
  it('defaults to a 2-column responsive grid with the field gap', () => {
    render(<FormGrid data-testid="grid" />)
    const el = screen.getByTestId('grid')
    expect(el).toHaveClass('grid', 'sm:grid-cols-2', 'gap-field')
  })

  it('supports 1/3/4 column presets', () => {
    const { rerender } = render(<FormGrid data-testid="grid" columns={1} />)
    expect(screen.getByTestId('grid')).toHaveClass('grid-cols-1')
    rerender(<FormGrid data-testid="grid" columns={3} />)
    expect(screen.getByTestId('grid')).toHaveClass('lg:grid-cols-3')
    rerender(<FormGrid data-testid="grid" columns={4} />)
    expect(screen.getByTestId('grid')).toHaveClass('lg:grid-cols-4')
  })
})
