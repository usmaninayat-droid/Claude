import { describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'
import { Label } from './Label'

describe('Label', () => {
  it('renders its text', () => {
    render(<Label>Email</Label>)
    expect(screen.getByText('Email')).toBeInTheDocument()
  })

  it('applies token text classes', () => {
    render(<Label>Email</Label>)
    expect(screen.getByText('Email')).toHaveClass(
      'text-sm',
      'font-medium',
      'text-foreground',
    )
  })

  it('associates with a control via htmlFor', () => {
    render(
      <>
        <Label htmlFor="email">Email</Label>
        <input id="email" />
      </>,
    )
    const label = screen.getByText('Email')
    expect(label).toHaveAttribute('for', 'email')
  })

  it('forwards a ref to the label element', () => {
    let node: HTMLLabelElement | null = null
    render(
      <Label
        ref={(el) => {
          node = el
        }}
      >
        Email
      </Label>,
    )
    expect(node).toBeInstanceOf(HTMLLabelElement)
  })
})
