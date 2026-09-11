import { describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'
import { Skeleton } from './Skeleton'

describe('Skeleton', () => {
  it('is hidden from assistive tech', () => {
    render(<Skeleton data-testid="sk" />)
    expect(screen.getByTestId('sk')).toHaveAttribute('aria-hidden', 'true')
  })

  it('applies the text variant by default', () => {
    render(<Skeleton data-testid="sk" />)
    expect(screen.getByTestId('sk')).toHaveClass('h-4', 'w-full', 'rounded-md')
  })

  it('applies the circle variant', () => {
    render(<Skeleton data-testid="sk" variant="circle" />)
    expect(screen.getByTestId('sk')).toHaveClass('rounded-full')
  })

  it('renders a centered placeholder icon for the image variant (map/photo archetype)', () => {
    render(<Skeleton data-testid="sk" variant="image" />)
    const sk = screen.getByTestId('sk')
    expect(sk).toHaveClass('grid', 'place-items-center')
    expect(sk.querySelector('svg')).toBeInTheDocument()
  })
})
