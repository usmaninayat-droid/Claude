import { describe, expect, it, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { configureAxe } from 'vitest-axe'
// Deep import: vitest-axe's `./matchers` entry re-exports type-only, which
// verbatimModuleSyntax rejects for value use (same pattern as DataTablePagination.test.tsx).
import { toHaveNoViolations } from 'vitest-axe/dist/matchers.js'
import type { AxeMatchers } from 'vitest-axe'
import { Slider } from './Slider'

expect.extend({ toHaveNoViolations })

declare module 'vitest' {
  // eslint-disable-next-line @typescript-eslint/no-empty-object-type, @typescript-eslint/no-unused-vars
  interface Assertion<T> extends AxeMatchers {}
  // eslint-disable-next-line @typescript-eslint/no-empty-object-type
  interface AsymmetricMatchersContaining extends AxeMatchers {}
}

const axe = configureAxe({
  rules: { 'color-contrast': { enabled: false }, region: { enabled: false } },
})

describe('Slider', () => {
  it('renders a single slider thumb with the given value', () => {
    render(<Slider aria-label="fill level" defaultValue={40} min={0} max={100} step={5} />)
    const thumb = screen.getByRole('slider', { name: 'fill level' })
    expect(thumb).toHaveAttribute('aria-valuenow', '40')
    expect(thumb).toHaveAttribute('aria-valuemin', '0')
    expect(thumb).toHaveAttribute('aria-valuemax', '100')
  })

  it('renders two thumbs when given a [start, end] tuple (range mode)', () => {
    render(<Slider aria-label="range" defaultValue={[20, 80]} min={0} max={100} />)
    expect(screen.getAllByRole('slider')).toHaveLength(2)
  })

  it('clamps aria-valuenow within min/max and respects step via keyboard', () => {
    const onValueChange = vi.fn()
    render(
      <Slider
        aria-label="scrubber"
        defaultValue={10}
        min={0}
        max={20}
        step={5}
        onValueChange={onValueChange}
      />,
    )
    const thumb = screen.getByRole('slider')
    thumb.focus()
    fireEvent.keyDown(thumb, { key: 'ArrowRight' })
    expect(onValueChange).toHaveBeenCalledWith(15)
    expect(thumb).toHaveAttribute('aria-valuenow', '15')
  })

  it('emits onValueChange on ArrowLeft too, decrementing by step', () => {
    const onValueChange = vi.fn()
    render(<Slider aria-label="scrubber" defaultValue={10} min={0} max={20} step={5} onValueChange={onValueChange} />)
    const thumb = screen.getByRole('slider')
    thumb.focus()
    fireEvent.keyDown(thumb, { key: 'ArrowLeft' })
    expect(onValueChange).toHaveBeenCalledWith(5)
  })

  it('emits a [start, end] tuple from onValueChange in range mode', () => {
    const onValueChange = vi.fn()
    render(
      <Slider aria-label="range" defaultValue={[20, 80]} min={0} max={100} step={10} onValueChange={onValueChange} />,
    )
    const [firstThumb] = screen.getAllByRole('slider')
    firstThumb.focus()
    fireEvent.keyDown(firstThumb, { key: 'ArrowRight' })
    expect(onValueChange).toHaveBeenCalledWith([30, 80])
  })

  it('does not respond to keyboard input when disabled', () => {
    const onValueChange = vi.fn()
    render(<Slider aria-label="fill level" defaultValue={40} disabled onValueChange={onValueChange} />)
    const thumb = screen.getByRole('slider')
    expect(thumb).toHaveAttribute('data-disabled')
    thumb.focus()
    fireEvent.keyDown(thumb, { key: 'ArrowRight' })
    expect(onValueChange).not.toHaveBeenCalled()
  })

  it('is disabled via the deprecated isDisabled alias', () => {
    render(<Slider aria-label="fill level" defaultValue={40} isDisabled />)
    expect(screen.getByRole('slider')).toHaveAttribute('data-disabled')
  })

  it('renders a formatted label above the thumb when formatLabel is given', () => {
    render(<Slider aria-label="fill level" defaultValue={60} formatLabel={(v) => `${v}%`} />)
    expect(screen.getByText('60%')).toBeInTheDocument()
  })

  it('renders no label text when formatLabel is omitted', () => {
    const { container } = render(<Slider aria-label="fill level" defaultValue={60} />)
    expect(container.querySelector('[data-slot="slider-thumb"]')?.textContent).toBe('')
  })

  it('is a controlled component when value is provided', () => {
    const { rerender } = render(<Slider aria-label="fill level" value={20} onValueChange={() => {}} />)
    expect(screen.getByRole('slider')).toHaveAttribute('aria-valuenow', '20')
    rerender(<Slider aria-label="fill level" value={70} onValueChange={() => {}} />)
    expect(screen.getByRole('slider')).toHaveAttribute('aria-valuenow', '70')
  })

  it('forwards a ref to the root element', () => {
    let node: HTMLSpanElement | null = null
    render(
      <Slider
        aria-label="fill level"
        defaultValue={40}
        ref={(el) => {
          node = el
        }}
      />,
    )
    expect(node).toBeInstanceOf(HTMLSpanElement)
  })

  it('renders correctly under dir="rtl"', () => {
    render(
      <div dir="rtl">
        <Slider aria-label="fill level" defaultValue={[20, 80]} formatLabel={(v) => `${v}%`} />
      </div>,
    )
    expect(screen.getAllByRole('slider')).toHaveLength(2)
    expect(screen.getByText('20%')).toBeInTheDocument()
  })

  it('has no axe violations', async () => {
    const { container } = render(<Slider aria-label="fill level" defaultValue={[20, 80]} formatLabel={(v) => `${v}%`} />)
    const results = await axe(container)
    expect(results).toHaveNoViolations()
  })
})
