import { describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'
import { StatusDot } from './StatusDot'

const dot = (container: HTMLElement) => container.querySelector('[data-status-dot]') as HTMLElement

describe('StatusDot', () => {
  it('renders an 8px round dot by default', () => {
    const { container } = render(<StatusDot />)
    expect(dot(container).style.width).toBe('8px')
    expect(dot(container).style.height).toBe('8px')
    expect(dot(container).style.borderRadius).toBe('9999px')
  })

  it('resolves a token NAME into the matching CSS custom property', () => {
    const { container } = render(<StatusDot token="success-text" />)
    expect(dot(container).style.backgroundColor).toBe('var(--color-success-text)')
  })

  it('accepts a raw runtime colour carried on metadata, and it wins over the token', () => {
    const { container } = render(<StatusDot token="success-text" color="#7a5af8" />)
    // jsdom normalises hex to rgb().
    expect(dot(container).style.backgroundColor).toBe('rgb(122, 90, 248)')
  })

  it('supports the filter dropdown row size and squircle shape', () => {
    const { container } = render(<StatusDot size={14} shape="squircle" />)
    expect(dot(container).style.width).toBe('14px')
    expect(dot(container).style.borderRadius).toBe('4px')
  })

  it('is always aria-hidden — colour is never the only signal (I.77)', () => {
    const { container } = render(
      <span>
        <StatusDot color="#12b76a" />
        Completed
      </span>,
    )
    expect(dot(container)).toHaveAttribute('aria-hidden', 'true')
    // Nothing to announce: the dot exposes no accessible object of its own.
    expect(screen.queryByRole('img')).not.toBeInTheDocument()
    expect(container).toHaveTextContent('Completed')
  })

  it('passes className and span attributes through', () => {
    const { container } = render(<StatusDot className="me-2" data-testid="d" />)
    expect(dot(container)).toHaveClass('me-2')
    expect(dot(container)).toHaveAttribute('data-testid', 'd')
  })
})
