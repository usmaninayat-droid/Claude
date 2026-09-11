import { describe, expect, it, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { Checkbox } from './Checkbox'

describe('Checkbox', () => {
  it('renders a checkbox role', () => {
    render(<Checkbox aria-label="accept" />)
    expect(screen.getByRole('checkbox', { name: 'accept' })).toBeInTheDocument()
  })

  it('reflects the checked prop', () => {
    render(<Checkbox aria-label="accept" checked />)
    expect(screen.getByRole('checkbox')).toHaveAttribute(
      'data-state',
      'checked',
    )
  })

  it('calls onCheckedChange when toggled', () => {
    const onCheckedChange = vi.fn()
    render(
      <Checkbox aria-label="accept" onCheckedChange={onCheckedChange} />,
    )
    fireEvent.click(screen.getByRole('checkbox'))
    expect(onCheckedChange).toHaveBeenCalledWith(true)
  })

  it('is disabled when the deprecated isDisabled alias is set', () => {
    render(<Checkbox aria-label="accept" isDisabled />)
    expect(screen.getByRole('checkbox')).toBeDisabled()
  })

  it('is disabled when the native disabled prop is set', () => {
    render(<Checkbox aria-label="accept" disabled />)
    expect(screen.getByRole('checkbox')).toBeDisabled()
  })

  it('prefers native disabled over the deprecated isDisabled alias when both are set', () => {
    render(<Checkbox aria-label="accept" disabled={false} isDisabled />)
    expect(screen.getByRole('checkbox')).not.toBeDisabled()
  })

  it('applies the primary background when checked', () => {
    render(<Checkbox aria-label="accept" checked />)
    expect(screen.getByRole('checkbox')).toHaveClass(
      'data-[state=checked]:bg-primary',
    )
  })

  it('forwards a ref', () => {
    let node: HTMLButtonElement | null = null
    render(
      <Checkbox
        aria-label="accept"
        ref={(el) => {
          node = el
        }}
      />,
    )
    expect(node).toBeInstanceOf(HTMLButtonElement)
  })
})
