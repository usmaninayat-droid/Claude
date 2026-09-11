import { describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'
import { Stack } from './Stack'

describe('Stack', () => {
  it('applies the field gap by default', () => {
    render(<Stack data-testid="stack">child</Stack>)
    expect(screen.getByTestId('stack')).toHaveClass('gap-field')
  })

  it('maps each semantic gap to its token class', () => {
    const { rerender } = render(<Stack data-testid="stack" gap="inline" />)
    expect(screen.getByTestId('stack')).toHaveClass('gap-inline')
    rerender(<Stack data-testid="stack" gap="section" />)
    expect(screen.getByTestId('stack')).toHaveClass('gap-section')
  })

  it('renders as row when direction="row"', () => {
    render(<Stack data-testid="stack" direction="row" />)
    expect(screen.getByTestId('stack')).toHaveClass('flex-row')
  })

  it('renders as the element passed via "as"', () => {
    render(<Stack as="section" data-testid="stack" />)
    expect(screen.getByTestId('stack').tagName).toBe('SECTION')
  })
})
