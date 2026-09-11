import { createRef } from 'react'
import { describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'
import { Bell } from '../icons'
import { IconBadge } from './IconBadge'

describe('IconBadge', () => {
  it('renders the icon passed via the icon prop', () => {
    render(<IconBadge icon={Bell} data-testid="badge" />)
    const badge = screen.getByTestId('badge')
    expect(badge.querySelector('svg')).toBeInTheDocument()
  })

  it('renders a custom icon element via children', () => {
    render(
      <IconBadge data-testid="badge">
        <svg data-testid="custom-icon" />
      </IconBadge>,
    )
    expect(screen.getByTestId('custom-icon')).toBeInTheDocument()
  })

  it('defaults to the primary tone and circle shape', () => {
    render(<IconBadge icon={Bell} data-testid="badge" />)
    const badge = screen.getByTestId('badge')
    expect(badge).toHaveClass('bg-primary/10', 'text-primary', 'rounded-full')
  })

  it('applies each tone as a token-based tint', () => {
    const tones = ['primary', 'success', 'warning', 'danger', 'info', 'neutral'] as const
    for (const tone of tones) {
      const { unmount } = render(<IconBadge icon={Bell} tone={tone} data-testid={`badge-${tone}`} />)
      const badge = screen.getByTestId(`badge-${tone}`)
      expect(badge.className).not.toMatch(/#|rgb\(|hsl\(/)
      unmount()
    }
  })

  it('applies the square shape', () => {
    render(<IconBadge icon={Bell} shape="square" data-testid="badge" />)
    expect(screen.getByTestId('badge')).toHaveClass('rounded-md')
  })

  it('applies each size', () => {
    render(<IconBadge icon={Bell} size="sm" data-testid="sm" />)
    render(<IconBadge icon={Bell} size="md" data-testid="md" />)
    render(<IconBadge icon={Bell} size="lg" data-testid="lg" />)
    expect(screen.getByTestId('sm')).toHaveClass('size-8')
    expect(screen.getByTestId('md')).toHaveClass('size-10')
    expect(screen.getByTestId('lg')).toHaveClass('size-12')
  })

  it('is aria-hidden by default (decorative)', () => {
    render(<IconBadge icon={Bell} data-testid="badge" />)
    expect(screen.getByTestId('badge')).toHaveAttribute('aria-hidden', 'true')
  })

  it('is not aria-hidden when an aria-label is provided', () => {
    render(<IconBadge icon={Bell} aria-label="Compliant" data-testid="badge" />)
    const badge = screen.getByTestId('badge')
    expect(badge).not.toHaveAttribute('aria-hidden')
    expect(badge).toHaveAttribute('aria-label', 'Compliant')
  })

  it('forwards the ref to the underlying span', () => {
    const ref = createRef<HTMLSpanElement>()
    render(<IconBadge icon={Bell} ref={ref} />)
    expect(ref.current).toBeInstanceOf(HTMLSpanElement)
  })

  it('merges a consumer className with the variant classes', () => {
    render(<IconBadge icon={Bell} className="ms-2" data-testid="badge" />)
    expect(screen.getByTestId('badge')).toHaveClass('ms-2', 'bg-primary/10')
  })
})
