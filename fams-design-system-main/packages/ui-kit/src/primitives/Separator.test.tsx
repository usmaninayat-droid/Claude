import { describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'
import { Separator } from './Separator'

describe('Separator', () => {
  it('renders horizontal by default with full-width hairline sizing', () => {
    render(<Separator decorative={false} />)
    const el = screen.getByRole('separator')
    expect(el).toHaveClass('h-px', 'w-full', 'bg-border')
  })

  it('renders vertical sizing when orientation="vertical"', () => {
    render(<Separator orientation="vertical" decorative={false} />)
    const el = screen.getByRole('separator')
    expect(el).toHaveClass('h-full', 'w-px', 'bg-border')
    expect(el).toHaveAttribute('aria-orientation', 'vertical')
  })

  it('is decorative (no semantic separator role) by default', () => {
    render(<Separator data-testid="deco" />)
    expect(screen.queryByRole('separator')).not.toBeInTheDocument()
    expect(screen.getByTestId('deco')).toBeInTheDocument()
  })

  it('exposes the separator role when decorative is false', () => {
    render(<Separator decorative={false} />)
    expect(screen.getByRole('separator')).toBeInTheDocument()
  })

  it('merges a custom className', () => {
    render(<Separator decorative={false} className="my-4" />)
    expect(screen.getByRole('separator')).toHaveClass('my-4', 'bg-border')
  })
})
