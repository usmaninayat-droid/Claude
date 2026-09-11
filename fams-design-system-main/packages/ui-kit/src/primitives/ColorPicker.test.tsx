import { describe, expect, it, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { configureAxe } from 'vitest-axe'
// Deep import: vitest-axe's `./matchers` entry re-exports type-only, which
// verbatimModuleSyntax rejects for value use (same pattern as Gauge.test.tsx).
import { toHaveNoViolations } from 'vitest-axe/dist/matchers.js'
import type { AxeMatchers } from 'vitest-axe'
import { ColorPicker } from './ColorPicker'

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

const PRESETS = ['#12b76a', '#f79009', '#f04438']

describe('ColorPicker', () => {
  it('renders the swatch trigger showing the current value', () => {
    render(<ColorPicker value="#0072d6" onChange={() => {}} />)
    const trigger = screen.getByRole('button', { name: 'Pick a color' })
    expect(trigger).toBeInTheDocument()
    expect(trigger).toHaveStyle({ backgroundColor: '#0072d6' })
  })

  it('supports a custom accessible label on the trigger', () => {
    render(<ColorPicker value="#0072d6" onChange={() => {}} label="Zone color" />)
    expect(screen.getByRole('button', { name: 'Zone color' })).toBeInTheDocument()
  })

  it('is closed by default and opens the popover on trigger click', () => {
    render(<ColorPicker value="#0072d6" onChange={() => {}} presets={PRESETS} />)
    expect(screen.queryByRole('group', { name: 'Presets' })).not.toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Pick a color' }))
    expect(screen.getByRole('group', { name: 'Presets' })).toBeInTheDocument()
  })

  it('hides the preset row entirely when no presets are given', () => {
    render(<ColorPicker value="#0072d6" onChange={() => {}} defaultOpen />)
    expect(screen.queryByRole('group', { name: 'Presets' })).not.toBeInTheDocument()
  })

  it('shows a hex text field bound to the current value', () => {
    render(<ColorPicker value="#0072d6" onChange={() => {}} defaultOpen />)
    const hexInput = screen.getByLabelText('Hex') as HTMLInputElement
    expect(hexInput.value.toLowerCase()).toBe('#0072d6')
  })

  it('fires onChange with the preset hex when a preset swatch is clicked', () => {
    const onChange = vi.fn()
    render(<ColorPicker value="#0072d6" onChange={onChange} presets={PRESETS} defaultOpen />)
    fireEvent.click(screen.getByRole('button', { name: 'Use preset #f79009' }))
    expect(onChange).toHaveBeenCalledWith('#f79009')
  })

  it('marks the preset matching the current value as pressed', () => {
    render(<ColorPicker value="#F79009" onChange={() => {}} presets={PRESETS} defaultOpen />)
    expect(screen.getByRole('button', { name: 'Use preset #f79009' })).toHaveAttribute(
      'aria-pressed',
      'true',
    )
    expect(screen.getByRole('button', { name: 'Use preset #12b76a' })).toHaveAttribute(
      'aria-pressed',
      'false',
    )
  })

  it('disables the trigger and prevents opening when disabled', () => {
    render(<ColorPicker value="#0072d6" onChange={() => {}} presets={PRESETS} disabled />)
    const trigger = screen.getByRole('button', { name: 'Pick a color' })
    expect(trigger).toBeDisabled()
    fireEvent.click(trigger)
    expect(screen.queryByRole('group', { name: 'Presets' })).not.toBeInTheDocument()
  })

  it('applies the sm/md/lg trigger sizes', () => {
    const { rerender } = render(<ColorPicker value="#0072d6" onChange={() => {}} size="sm" />)
    expect(screen.getByRole('button', { name: 'Pick a color' })).toHaveClass('size-7')

    rerender(<ColorPicker value="#0072d6" onChange={() => {}} size="lg" />)
    expect(screen.getByRole('button', { name: 'Pick a color' })).toHaveClass('size-11')
  })

  it('renders under RTL (dir=rtl) without error', () => {
    const { container } = render(
      <div dir="rtl">
        <ColorPicker value="#0072d6" onChange={() => {}} presets={PRESETS} defaultOpen />
      </div>,
    )
    expect(container.querySelector('[dir="rtl"]')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Pick a color' })).toBeInTheDocument()
    expect(screen.getByRole('group', { name: 'Presets' })).toBeInTheDocument()
  })

  it('has no axe violations', async () => {
    render(<ColorPicker value="#0072d6" onChange={() => {}} presets={PRESETS} defaultOpen />)
    // Popover content portals onto document.body, outside the render
    // container — scan the whole body so it's included.
    expect(await axe(document.body)).toHaveNoViolations()
  })
})
