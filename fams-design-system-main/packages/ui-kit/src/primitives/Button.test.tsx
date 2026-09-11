import { createRef } from 'react'
import { describe, expect, it, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { Button } from './Button'

describe('Button', () => {
  it('renders its label', () => {
    render(<Button>Click me</Button>)
    expect(screen.getByRole('button', { name: 'Click me' })).toBeInTheDocument()
  })

  it('applies the primary variant class', () => {
    render(<Button variant="primary">Primary</Button>)
    expect(screen.getByRole('button')).toHaveClass('bg-primary')
  })

  it('is disabled when isDisabled is set (deprecated alias)', () => {
    render(<Button isDisabled>Disabled</Button>)
    expect(screen.getByRole('button')).toBeDisabled()
  })

  it('is disabled when the canonical native disabled prop is set', () => {
    render(<Button disabled>Disabled</Button>)
    expect(screen.getByRole('button')).toBeDisabled()
  })

  it('sets aria-busy when loading (deprecated isLoading alias)', () => {
    render(<Button isLoading>Loading</Button>)
    expect(screen.getByRole('button')).toHaveAttribute('aria-busy', 'true')
  })

  it('sets aria-busy and shows the spinner when the canonical loading prop is set', () => {
    render(<Button loading>Loading</Button>)
    const button = screen.getByRole('button')
    expect(button).toHaveAttribute('aria-busy', 'true')
    expect(button).toBeDisabled()
    expect(button.querySelector('.animate-spin')).toBeInTheDocument()
  })

  it('renders a circular icon-only button with size="iconRound"', () => {
    render(
      <Button size="iconRound" aria-label="Add">
        <span>+</span>
      </Button>,
    )
    expect(screen.getByRole('button', { name: 'Add' })).toHaveClass('size-9', 'rounded-full')
  })

  describe('asChild', () => {
    it('renders the child element instead of a <button>, keeping Button classes', () => {
      render(
        <Button asChild variant="link">
          <a href="/rows/1">Row 1</a>
        </Button>,
      )
      const link = screen.getByRole('link', { name: 'Row 1' })
      expect(link.tagName).toBe('A')
      expect(link).toHaveAttribute('href', '/rows/1')
      expect(link).toHaveClass('text-primary', 'underline-offset-4')
    })

    it('does not throw when passed a single child (the historical `asChild` bug)', () => {
      // Previously the render path always emitted `{null}{children}` — two
      // children — which made the slot implementation throw for every
      // asChild call site, even a bare non-loading, non-disabled button.
      expect(() =>
        render(
          <Button asChild>
            <a href="/x">Plain</a>
          </Button>,
        ),
      ).not.toThrow()
    })

    it('forwards a ref to the underlying child element', () => {
      const ref = createRef<HTMLAnchorElement>()
      render(
        <Button asChild ref={ref as never}>
          <a href="/x">Ref target</a>
        </Button>,
      )
      expect(ref.current).toBeInstanceOf(HTMLAnchorElement)
    })

    it('forwards event handlers to the child element', () => {
      const onClick = vi.fn()
      render(
        <Button asChild onClick={onClick}>
          <a href="#click-me">Click me</a>
        </Button>,
      )
      fireEvent.click(screen.getByRole('link', { name: 'Click me' }))
      expect(onClick).toHaveBeenCalledTimes(1)
    })

    it('merges a caller className onto the child without dropping Button classes', () => {
      render(
        <Button asChild variant="secondary" className="extra-class">
          <a href="/x">Merged</a>
        </Button>,
      )
      const link = screen.getByRole('link', { name: 'Merged' })
      expect(link).toHaveClass('bg-secondary', 'extra-class')
    })

    it('suppresses the loading spinner and warns instead of adding a second child', () => {
      const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
      render(
        <Button asChild loading>
          <a href="/x">Loading link</a>
        </Button>,
      )
      const link = screen.getByRole('link', { name: 'Loading link' })
      expect(link.querySelector('.animate-spin')).not.toBeInTheDocument()
      expect(link).toHaveAttribute('aria-busy', 'true')
      expect(link).toHaveAttribute('aria-disabled', 'true')
      expect(warn).toHaveBeenCalledWith(expect.stringContaining('asChild` cannot render the loading spinner'))
      warn.mockRestore()
    })

    it('suppresses the spinner and warns for the deprecated isLoading alias too', () => {
      const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
      render(
        <Button asChild isLoading>
          <a href="/x">Loading link</a>
        </Button>,
      )
      expect(warn).toHaveBeenCalled()
      warn.mockRestore()
    })

    it('reflects isDisabled/disabled as aria-disabled on the child (no native disabled attribute)', () => {
      render(
        <Button asChild isDisabled>
          <a href="/x">Disabled link</a>
        </Button>,
      )
      const link = screen.getByRole('link', { name: 'Disabled link' })
      expect(link).toHaveAttribute('aria-disabled', 'true')
      expect(link).not.toHaveAttribute('disabled')
    })

    it('supports the row-link use case: a link-styled button rendering as the real row anchor', () => {
      render(
        <table>
          <tbody>
            <tr>
              <td>
                <Button asChild variant="link" size="sm">
                  <a href="/records/42">View record 42</a>
                </Button>
              </td>
            </tr>
          </tbody>
        </table>,
      )
      const link = screen.getByRole('link', { name: 'View record 42' })
      expect(link.tagName).toBe('A')
      expect(link).toHaveAttribute('href', '/records/42')
      expect(link).toHaveClass('text-primary', 'text-xs')
    })
  })
})
