import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { configureAxe } from 'vitest-axe'
// Deep import: vitest-axe's `./matchers` entry re-exports type-only, which
// verbatimModuleSyntax rejects for value use (same pattern as a11y.axe.test.tsx).
import { toHaveNoViolations } from 'vitest-axe/dist/matchers.js'
import type { AxeMatchers } from 'vitest-axe'
import { VehicleMarker } from './VehicleMarker'

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

describe('VehicleMarker', () => {
  it('renders as a button whose accessible name combines plate, status, and meta (UX-9)', () => {
    render(<VehicleMarker label="AUH-1" statusLabel="Moving" meta="41 km/h" tone="success" />)
    expect(screen.getByRole('button', { name: 'AUH-1 · Moving · 41 km/h' })).toBeInTheDocument()
  })

  it('falls back to label · meta (and just the label) when parts are missing', () => {
    const { rerender } = render(<VehicleMarker label="AUH-1" meta="41m" tone="success" />)
    expect(screen.getByRole('button', { name: 'AUH-1 · 41m' })).toBeInTheDocument()
    rerender(<VehicleMarker label="AUH-2" tone="muted" />)
    expect(screen.getByRole('button', { name: 'AUH-2' })).toBeInTheDocument()
  })

  it('calls onClick when the marker is pressed', () => {
    const onClick = vi.fn()
    render(<VehicleMarker label="AUH-1" tone="success" onClick={onClick} />)
    screen.getByRole('button').click()
    expect(onClick).toHaveBeenCalledTimes(1)
  })

  it('renders the 3D vehicle art (never a photo) inside the circle — P0-1', () => {
    const { container } = render(
      <VehicleMarker label="AUH-1" tone="success" photoUrl="https://example.com/car.jpg" />,
    )
    // The deprecated photoUrl is accepted but IGNORED: no <img> anywhere.
    expect(container.querySelector('img')).toBeNull()
    // The 3D art is an inline SVG with the vi3d- gradient defs.
    expect(container.querySelector('svg linearGradient[id^="vi3d-"]')).not.toBeNull()
  })

  it('renders the info capsule by default — the designer\'s with-data variant (13:17558)', () => {
    render(<VehicleMarker label="Y 31022" meta="100 km/h" statusLabel="Moving" tone="success" />)
    const pill = document.querySelector('[data-slot="vehicle-marker-pill"]') as HTMLElement
    expect(pill).not.toBeNull()
    expect(pill.className).toContain('opacity-100')
    expect(pill).toHaveTextContent('Y 31022')
    expect(pill).toHaveTextContent('100 km/h')
  })

  it('carries the trailing value for every status', () => {
    const pill = () => document.querySelector('[data-slot="vehicle-marker-pill"]') as HTMLElement
    const { rerender } = render(
      <VehicleMarker label="Y 31022" meta="100 km/h" statusLabel="Moving" tone="success" moving />,
    )
    expect(pill()).toHaveTextContent('100 km/h')

    rerender(<VehicleMarker label="X 1234" meta="11 mins" statusLabel="Idling" tone="warning" />)
    expect(pill()).toHaveTextContent('11 mins')

    rerender(<VehicleMarker label="V 71939" meta="49%" statusLabel="Stopped" tone="error" />)
    expect(pill()).toHaveTextContent('49%')
  })

  it('is ONE 120px capsule centred behind the circle, not two tucked chips', () => {
    const { container } = render(<VehicleMarker label="Y 31022" meta="100 km/h" tone="success" />)
    const pill = container.querySelector('[data-slot="vehicle-marker-pill"]') as HTMLElement
    expect(pill.style.width).toBe('120px')
    expect(pill.className).toContain('absolute')
    expect(pill.className).toContain('bg-black/40')
    expect(pill.className).toContain('rounded-full')
    // Paint order: the capsule precedes the circle in the same wrapper, so the
    // opaque circle paints OVER its middle (never the reverse).
    const wrapper = pill.parentElement as HTMLElement
    const circle = wrapper.querySelector('.size-10.rounded-full') as HTMLElement
    const order = Array.from(wrapper.children)
    expect(order.indexOf(pill)).toBeLessThan(order.indexOf(circle))
  })

  it('hides the capsule in the dense treatment (showPill={false}), revealed on hover', () => {
    const { container } = render(<VehicleMarker label="AUH-1" meta="41m" tone="success" showPill={false} />)
    const pill = container.querySelector('[data-slot="vehicle-marker-pill"]') as HTMLElement
    expect(pill.className).toContain('opacity-0')
    expect(pill.className).toContain('group-hover:opacity-100')
  })

  it('drops the capsule entirely while selected — the popup carries both values', () => {
    const { container } = render(<VehicleMarker label="V 71939" meta="12 mins" tone="error" selected />)
    expect(container.querySelector('[data-slot="vehicle-marker-pill"]')).toBeNull()
    // …but the data is still in the accessible name, so no channel is lost.
    expect(screen.getByRole('button', { name: 'V 71939 · 12 mins' })).toBeInTheDocument()
  })

  it('shows the capsule when showPill is forced without selection', () => {
    const { container } = render(<VehicleMarker label="AUH-1" meta="41m" tone="success" showPill />)
    expect((container.querySelector('[data-slot="vehicle-marker-pill"]') as HTMLElement).className).toContain(
      'opacity-100',
    )
  })

  it('shows the moving arrow badge glyph rotated to the heading', () => {
    const { container } = render(<VehicleMarker label="AUH-1" tone="success" moving heading={90} />)
    const arrow = container.querySelector('[data-icon="navigation-pointer-01"]')
    expect(arrow).not.toBeNull()
    expect(arrow?.parentElement?.getAttribute('style') ?? '').toContain('rotate(90deg)')
  })

  it('keeps the arrow unrotated when the vehicle is not moving', () => {
    const { container } = render(<VehicleMarker label="AUH-1" tone="success" moving={false} />)
    const arrow = container.querySelector('[data-icon="navigation-pointer-01"]')
    expect(arrow).not.toBeNull()
    expect(arrow?.parentElement?.getAttribute('style') ?? '').not.toContain('rotate')
  })

  it('uses pause / square badge glyphs for idling / stopped tones', () => {
    const { container, rerender } = render(<VehicleMarker label="AUH-1" tone="warning" />)
    expect(container.querySelector('[data-icon="pause-circle"]')).not.toBeNull()
    rerender(<VehicleMarker label="AUH-1" tone="error" />)
    expect(container.querySelector('[data-icon="square"]')).not.toBeNull()
  })

  it('applies the tone ring — status-500 hues sampled from the marker exports', () => {
    const { container, rerender } = render(<VehicleMarker label="AUH-1" tone="success" />)
    expect(container.querySelector('.border-success-scale-500')).not.toBeNull()

    rerender(<VehicleMarker label="AUH-1" tone="warning" />)
    expect(container.querySelector('.border-warning-scale-500')).not.toBeNull()

    rerender(<VehicleMarker label="AUH-1" tone="error" />)
    expect(container.querySelector('.border-destructive')).not.toBeNull()
  })

  it('selected keeps its own status colour and takes the tinted body + 2px ring (13:18868)', () => {
    const { container, rerender } = render(<VehicleMarker label="AUH-1" tone="success" selected />)
    // NOT recoloured red any more — the status hue is preserved…
    expect(container.querySelector('.border-success-scale-500')).not.toBeNull()
    // …and the body takes that hue's lightest tint behind a 2px ring.
    expect(container.querySelector('.bg-success-scale-50')).not.toBeNull()
    expect(container.querySelector('.border-2')).not.toBeNull()

    rerender(<VehicleMarker label="AUH-1" tone="warning" selected />)
    expect(container.querySelector('.bg-warning-scale-50')).not.toBeNull()
    rerender(<VehicleMarker label="AUH-1" tone="error" selected />)
    expect(container.querySelector('.bg-error-50')).not.toBeNull()
  })

  it('thickens and lengthens the leader stem while selected', () => {
    const { container, rerender } = render(<VehicleMarker label="AUH-1" tone="success" />)
    const stem = () => container.querySelectorAll('button > span.rounded-full')[0] as HTMLElement
    expect(stem().style.width).toBe('1px')
    expect(stem().style.height).toBe('16px')
    rerender(<VehicleMarker label="AUH-1" tone="success" selected />)
    expect(stem().style.width).toBe('2px')
    expect(stem().style.height).toBe('20px')
  })

  it('covers the full visual footprint with a ≥44px-wide hit area (UX C19)', () => {
    render(<VehicleMarker label="AUH-1" tone="success" />)
    expect(screen.getByRole('button').style.minWidth).toBe('44px')
  })

  it('renders a custom icon in place of the default 3D art', () => {
    render(
      <VehicleMarker
        label="AUH-1"
        tone="success"
        icon={<svg data-testid="custom-marker-icon" aria-hidden="true" />}
      />,
    )
    expect(screen.getByTestId('custom-marker-icon')).toBeInTheDocument()
  })

  /* UX MUST G.35 — the selected route must not be carried by the polylines
     alone; every OTHER pin recedes while one is selected. */
  it('dims when a sibling marker is selected', () => {
    render(<VehicleMarker label="AUH-1" tone="success" dimmed />)
    const marker = screen.getByRole('button')
    expect(marker).toHaveAttribute('data-dimmed', 'true')
    expect(marker.className).toContain('opacity-55')
    // A dimmed pin stays fully usable — hover and focus restore full strength.
    expect(marker.className).toContain('hover:opacity-100')
  })

  it('never dims the marker that IS selected', () => {
    render(<VehicleMarker label="AUH-1" tone="success" dimmed selected />)
    expect(screen.getByRole('button').className).not.toContain('opacity-55')
  })

  it('has no axe violations', async () => {
    render(<VehicleMarker label="AUH-1" statusLabel="Moving" meta="41m" tone="success" selected />)
    const results = await axe(document.body)
    expect(results).toHaveNoViolations()
  })

  /* Round-1 UX finding 17 — the map layer computes collisions, the marker
     only renders the verdict. */
  it('hides the capsule while chipsSuppressed, and reflects the collision priority', () => {
    const { container } = render(
      <VehicleMarker label="Z-7764" meta="37 mins" chipsSuppressed collisionPriority={3} />,
    )
    const button = screen.getByRole('button')
    expect(button).toHaveAttribute('data-chips-suppressed', 'true')
    expect(button).toHaveAttribute('data-collision-priority', '3')
    const capsule = container.querySelector('[data-slot="vehicle-marker-pill"]') as HTMLElement
    expect(capsule.className).toContain('opacity-0')
  })

  it('drops the capsule on a SELECTED marker regardless of suppression', () => {
    const { container } = render(<VehicleMarker label="Z-7764" meta="37 mins" chipsSuppressed selected />)
    expect(container.querySelector('[data-slot="vehicle-marker-pill"]')).toBeNull()
  })

  it('never drops the chip data from the accessible name when suppressed (UX-9)', () => {
    render(
      <VehicleMarker label="Z-7764" meta="37 mins" statusLabel="Stopped" chipsSuppressed />,
    )
    expect(screen.getByRole('button', { name: 'Z-7764 · Stopped · 37 mins' })).toBeInTheDocument()
  })
})

/**
 * MapLibre stamps a generic `aria-label="Map marker"` on EVERY marker
 * container it positions — cluster badges included — so that attribute cannot
 * distinguish a single vehicle from an aggregate (round-2 interaction 14a was
 * exactly that conflation: the "swallowed" marker clicks were clusters
 * expanding). The slot below is the channel that can.
 */
describe('VehicleMarker — identifiable as a single vehicle', () => {
  it('carries data-slot="vehicle-marker" on its click target', () => {
    render(<VehicleMarker label="Z-1" statusLabel="Moving" tone="success" />)
    expect(screen.getByRole('button', { name: /Z-1/ })).toHaveAttribute('data-slot', 'vehicle-marker')
  })
})
