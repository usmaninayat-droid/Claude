import { describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'
import { Badge } from './Badge'

describe('Badge', () => {
  it('renders its label', () => {
    render(<Badge>Active</Badge>)
    expect(screen.getByText('Active')).toBeInTheDocument()
  })

  it('applies the default variant class', () => {
    render(<Badge>Default</Badge>)
    expect(screen.getByText('Default')).toHaveClass('bg-primary')
  })

  it('applies a status variant class', () => {
    render(<Badge variant="success">Compliant</Badge>)
    expect(screen.getByText('Compliant')).toHaveClass('bg-success-scale-50', 'text-success-scale-700')
  })

  it('applies the xs count-pill size', () => {
    render(<Badge size="xs">3</Badge>)
    expect(screen.getByText('3')).toHaveClass('rounded-full')
  })

  it('renders a leading dot when dot is set', () => {
    render(<Badge dot>Live</Badge>)
    const dot = screen.getByText('Live').querySelector('[aria-hidden="true"]')
    expect(dot).not.toBeNull()
    expect(dot).toHaveClass('bg-current')
  })

  it('does not render a dot by default', () => {
    render(<Badge>No dot</Badge>)
    expect(screen.getByText('No dot').querySelector('[aria-hidden="true"]')).toBeNull()
  })

  it('applies the uppercase state-pill treatment', () => {
    render(<Badge uppercase>Won</Badge>)
    expect(screen.getByText('Won')).toHaveClass('uppercase', 'tracking-wide')
  })

  it('applies the lg chunky-chip size', () => {
    render(<Badge size="lg">CAR</Badge>)
    expect(screen.getByText('CAR')).toHaveClass('h-10', 'px-5', 'text-base')
  })

  it('swaps the light tint for a solid fill on a status variant', () => {
    render(
      <Badge variant="success" solid>
        Active
      </Badge>,
    )
    const el = screen.getByText('Active')
    // fix7 (A7 gate blocker): `bg-success` (`--color-success`, #12b76a) is
    // only 2.62:1 white-on-fill — the same D-6 finding that already forced
    // `success-text` onto `success-scale-700` for TEXT use applies equally
    // here, since white-on-fill contrast is symmetric with white-on-text.
    // `success-scale-700` is the vetted accessible alias (5.41:1 on white)
    // AND already carries each tenant's own correct-hue accessible green.
    expect(el).toHaveClass('bg-success-scale-700', 'text-white')
    expect(el).not.toHaveClass('bg-success-scale-50', 'bg-success')
  })

  it('leaves non-status variants unaffected by solid', () => {
    render(
      <Badge variant="secondary" solid>
        Tag
      </Badge>,
    )
    expect(screen.getByText('Tag')).toHaveClass('bg-secondary', 'text-secondary-foreground')
  })

  it('maps colorIndex to a categorical chart token and overrides variant color', () => {
    render(
      <Badge variant="destructive" colorIndex={3}>
        Lot 7
      </Badge>,
    )
    const el = screen.getByText('Lot 7')
    expect(el).toHaveClass('bg-chart-3/10', 'border-chart-3/30', 'text-foreground')
    expect(el).not.toHaveClass('bg-error-50')
  })

  it('colors the dot with the categorical token when colorIndex is set', () => {
    render(
      <Badge dot colorIndex={5}>
        District 5
      </Badge>,
    )
    const dot = screen.getByText('District 5').querySelector('[aria-hidden="true"]')
    expect(dot).toHaveClass('bg-chart-5')
  })

  it('forwards a ref to the underlying span', () => {
    let node: HTMLSpanElement | null = null
    render(
      <Badge
        ref={(el) => {
          node = el
        }}
      >
        Ref
      </Badge>,
    )
    expect(node).toBeInstanceOf(HTMLSpanElement)
  })
})
