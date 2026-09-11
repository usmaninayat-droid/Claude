import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { configureAxe } from 'vitest-axe'
// Deep import: vitest-axe's `./matchers` entry re-exports type-only, which
// verbatimModuleSyntax rejects for value use (same pattern as a11y.axe.test.tsx).
import { toHaveNoViolations } from 'vitest-axe/dist/matchers.js'
import type { AxeMatchers } from 'vitest-axe'
import { VehicleIcon3D } from './VehicleIcon3D'

expect.extend({ toHaveNoViolations })

declare module 'vitest' {
  // eslint-disable-next-line @typescript-eslint/no-empty-object-type, @typescript-eslint/no-unused-vars
  interface Assertion<T> extends AxeMatchers {}
  // eslint-disable-next-line @typescript-eslint/no-empty-object-type
  interface AsymmetricMatchersContaining extends AxeMatchers {}
}

const axe = configureAxe({
  rules: {
    'color-contrast': { enabled: false },
    region: { enabled: false },
  },
})

/** Master art aspect (Figma node 495:4149) — height per unit of width. */
const ASPECT = 32.3287 / 57.0437

const box = (container: HTMLElement) => container.firstElementChild as HTMLElement

describe('VehicleIcon3D', () => {
  it('renders the embedded Figma art (47 paths, vi3d-prefixed gradients, no raw hex)', () => {
    const { container } = render(<VehicleIcon3D />)
    const svg = container.querySelector('svg')
    expect(svg).not.toBeNull()
    expect(svg?.getAttribute('viewBox')).toBe('0 0 57.0437 32.3287')
    expect(container.querySelectorAll('svg path')).toHaveLength(47)
    expect(container.querySelectorAll('svg linearGradient')).toHaveLength(15)
    // Every gradient id is vi3d-prefixed so it cannot collide with other components.
    for (const grad of container.querySelectorAll('svg linearGradient')) {
      expect(grad.id).toMatch(/^vi3d-/)
    }
    // Brand-asset colors are rgb()/rgba() literals — never raw hex (lint-tokens).
    expect(container.innerHTML).not.toMatch(/#[0-9a-fA-F]{3,8}\b/)
  })

  it("size='sm' renders the 39x29 list-thumb box with the list-scale art width", () => {
    const { container } = render(<VehicleIcon3D size="sm" />)
    expect(box(container).style.width).toBe('39px')
    expect(box(container).style.height).toBe('29px')
    const svg = container.querySelector('svg')
    expect(Number(svg?.getAttribute('width'))).toBeCloseTo(38.8182, 3)
    expect(Number(svg?.getAttribute('height'))).toBeCloseTo(38.8182 * ASPECT, 3)
  })

  it("size='md' (default) renders the master 57.0437-wide art box", () => {
    const { container } = render(<VehicleIcon3D size="md" />)
    expect(parseFloat(box(container).style.width)).toBeCloseTo(57.0437, 3)
    expect(parseFloat(box(container).style.height)).toBeCloseTo(32.3287, 3)
  })

  it('numeric size renders width n and height n x the master aspect', () => {
    const { container } = render(<VehicleIcon3D size={26} />)
    expect(box(container).style.width).toBe('26px')
    expect(parseFloat(box(container).style.height)).toBeCloseTo(26 * ASPECT, 3)
    const svg = container.querySelector('svg')
    expect(Number(svg?.getAttribute('width'))).toBe(26)
  })

  it("badge='start' renders the 15px bottom-start status dot in the tone color", () => {
    const { container } = render(<VehicleIcon3D size="sm" tone="success" badge="start" />)
    const dot = container.querySelector('.bg-success-scale-500') as HTMLElement
    expect(dot).not.toBeNull()
    // Logical INLINE styles (not `-start-0.5`) so the offset survives a
    // consumer Tailwind build that never emits negative logical utilities.
    expect(dot.style.insetInlineStart).toBe('-2px')
    expect(dot.style.insetBlockEnd).toBe('-2px')
    expect(dot.style.width).toBe('15px')
    expect(dot.style.height).toBe('15px')
  })

  it("badge='end' renders the 16px bottom-end status dot (idling = warning-500)", () => {
    const { container } = render(<VehicleIcon3D tone="warning" badge="end" />)
    // The idle dot is warning-500 (#F79009) — sampled from the designer's own
    // list-thumbnail export `Group 1261154727.svg` (Figma 13:18867).
    const dot = container.querySelector('.bg-warning-scale-500') as HTMLElement
    expect(dot).not.toBeNull()
    expect(dot.style.insetInlineEnd).toBe('-4px')
    expect(dot.style.insetBlockEnd).toBe('-4px')
    expect(dot.style.width).toBe('16px')
    expect(dot.style.height).toBe('16px')
  })

  it('maps each tone to its status color class', () => {
    const { container, rerender } = render(<VehicleIcon3D tone="error" badge="end" />)
    expect(container.querySelector('.bg-error-600')).not.toBeNull()
    rerender(<VehicleIcon3D tone="muted" badge="end" />)
    // Non-Reporting is grey-400 (#98A2B3) per SPEC §1 — visual finding #33.
    expect(container.querySelector('.bg-gray-400')).not.toBeNull()
  })

  it('renders no badge dot by default', () => {
    const { container } = render(<VehicleIcon3D tone="success" />)
    expect(container.querySelector('.bg-success-scale-500')).toBeNull()
    expect(container.querySelectorAll('.rounded-full')).toHaveLength(0)
  })

  it("never renders the mobility badge for art='weather-station', even when badge is requested (a stationary asset has no moving/idling/stopped status)", () => {
    const { container } = render(
      <VehicleIcon3D art="weather-station" tone="success" badge="start" />,
    )
    expect(container.querySelector('[data-slot="vehicle-icon-3d-badge"]')).toBeNull()
    expect(container.querySelector('.bg-success-scale-500')).toBeNull()
  })

  it("renders the mobility badge for art='tanker' exactly as for the default 'car' art", () => {
    const { container } = render(<VehicleIcon3D art="tanker" tone="warning" badge="end" />)
    expect(container.querySelector('[data-slot="vehicle-icon-3d-badge"]')).not.toBeNull()
    expect(container.querySelector('.bg-warning-scale-500')).not.toBeNull()
  })

  it('with a label it is an image named by the label', () => {
    render(<VehicleIcon3D label="Vehicle 45213" tone="success" badge="start" />)
    expect(screen.getByRole('img', { name: 'Vehicle 45213' })).toBeInTheDocument()
  })

  it('without a label it is decorative (aria-hidden, no img role)', () => {
    const { container } = render(<VehicleIcon3D />)
    expect(box(container).getAttribute('aria-hidden')).toBe('true')
    expect(box(container).getAttribute('role')).toBeNull()
    expect(screen.queryByRole('img')).toBeNull()
  })

  it('has no axe violations with and without a label', async () => {
    const { unmount } = render(
      <VehicleIcon3D label="Vehicle 45213" tone="success" badge="start" size="sm" />,
    )
    expect(await axe(document.body)).toHaveNoViolations()
    unmount()
    render(<VehicleIcon3D badge="end" tone="error" />)
    expect(await axe(document.body)).toHaveNoViolations()
  })
})
