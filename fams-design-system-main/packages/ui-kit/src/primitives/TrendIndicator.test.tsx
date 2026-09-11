import { createRef } from 'react'
import { describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'
import { TrendIndicator } from './TrendIndicator'

describe('TrendIndicator', () => {
  it('renders the value', () => {
    render(<TrendIndicator direction="up" value="12%" />)
    expect(screen.getByText('12%')).toBeInTheDocument()
  })

  it('renders the optional note', () => {
    render(<TrendIndicator direction="up" value="12%" note="vs last month" />)
    expect(screen.getByText('vs last month')).toBeInTheDocument()
  })

  it('omits the note when not provided', () => {
    render(<TrendIndicator direction="flat" value="0%" />)
    expect(screen.queryByText(/vs /)).not.toBeInTheDocument()
  })

  // The DARK step of each ramp, not the 500: a 12px delta numeral in
  // `--color-success` measures 2.62:1 and in `--color-destructive` 3.76:1,
  // both below the 4.5:1 it needs.
  it('applies the AA-contrast success color for direction="up"', () => {
    render(<TrendIndicator direction="up" value="12%" />)
    expect(screen.getByText('12%').closest('[data-slot="trend-indicator"]')).toHaveClass('text-success-scale-700')
  })

  it('applies the AA-contrast error color for direction="down"', () => {
    render(<TrendIndicator direction="down" value="8%" />)
    expect(screen.getByText('8%').closest('[data-slot="trend-indicator"]')).toHaveClass('text-error-700')
  })

  it('applies the muted color for direction="flat"', () => {
    render(<TrendIndicator direction="flat" value="0%" />)
    expect(screen.getByText('0%').closest('[data-slot="trend-indicator"]')).toHaveClass('text-muted-foreground')
  })

  it('applies the sm size text class', () => {
    render(<TrendIndicator direction="up" value="12%" size="sm" />)
    expect(screen.getByText('12%').closest('[data-slot="trend-indicator"]')).toHaveClass('text-body-xs')
  })

  it('applies the md size text class by default', () => {
    render(<TrendIndicator direction="up" value="12%" />)
    expect(screen.getByText('12%').closest('[data-slot="trend-indicator"]')).toHaveClass('text-body-sm')
  })

  it('hides the icon from assistive tech', () => {
    const { container } = render(<TrendIndicator direction="up" value="12%" />)
    expect(container.querySelector('svg')).toHaveAttribute('aria-hidden', 'true')
  })

  // Round-2 UX QA #1 (verdict V12): the arrow is `aria-hidden` and the tint is
  // colour, so without a direction WORD "up 1" and "down 1" expose the same
  // accessible name. The two leaderboard cells that exposed this read "1 1"
  // (rank 1, up 1) and "4 2" (rank 4, down 2).
  it('exposes the direction as a word in the accessible name', () => {
    // A leaderboard rank cell computes its name from its contents, so the
    // direction word has to be IN the contents — asserted here through a
    // name-from-content container.
    render(
      <button type="button">
        1 <TrendIndicator direction="up" value="1" />
      </button>,
    )
    expect(screen.getByRole('button')).toHaveAccessibleName('1 up 1')
  })

  it('gives a rise and a fall of the same magnitude DIFFERENT accessible names', () => {
    render(
      <>
        <button type="button" data-testid="row1">
          1 <TrendIndicator direction="up" value="1" />
        </button>
        <button type="button" data-testid="row4">
          4 <TrendIndicator direction="down" value="2" />
        </button>
      </>,
    )
    // Round-2 UX QA #1: these two read "1 1" and "4 2" — indistinguishable in sign.
    const up = screen.getByTestId('row1')
    const down = screen.getByTestId('row4')
    expect(up).toHaveAccessibleName('1 up 1')
    expect(down).toHaveAccessibleName('4 down 2')
  })

  it('reads "no change" for direction="flat"', () => {
    render(
      <button type="button">
        <TrendIndicator direction="flat" value="0%" />
      </button>,
    )
    expect(screen.getByRole('button')).toHaveAccessibleName('no change 0%')
  })

  it('lets the caller override the direction word', () => {
    render(
      <button type="button">
        <TrendIndicator direction="up" value="1 place" directionLabel="up" />
      </button>,
    )
    expect(screen.getByRole('button')).toHaveAccessibleName('up 1 place')
  })

  it('omits the direction word when explicitly blanked', () => {
    const { container } = render(<TrendIndicator direction="up" value="12%" directionLabel="" />)
    expect(container.querySelector('[data-slot="trend-indicator-direction"]')).toBeNull()
  })

  it('keeps the direction word visually hidden', () => {
    const { container } = render(<TrendIndicator direction="down" value="8%" />)
    expect(container.querySelector('[data-slot="trend-indicator-direction"]')).toHaveClass('sr-only')
  })

  it('merges a custom className', () => {
    render(<TrendIndicator direction="up" value="12%" className="custom-class" />)
    expect(screen.getByText('12%').closest('[data-slot="trend-indicator"]')).toHaveClass('custom-class')
  })

  it('forwards the ref to the root element', () => {
    const ref = createRef<HTMLSpanElement>()
    render(<TrendIndicator ref={ref} direction="up" value="12%" />)
    expect(ref.current).toBeInstanceOf(HTMLSpanElement)
    expect(ref.current).toHaveAttribute('data-slot', 'trend-indicator')
  })
})
