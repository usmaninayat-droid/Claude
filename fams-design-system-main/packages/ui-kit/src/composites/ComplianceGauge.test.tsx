import { describe, expect, it, afterEach } from 'vitest'
import { render, cleanup } from '@testing-library/react'
import { configureAxe } from 'vitest-axe'
// Deep import: vitest-axe's `./matchers` entry re-exports type-only, which
// verbatimModuleSyntax rejects for value use (same pattern as ChartContainer.test.tsx).
import { toHaveNoViolations } from 'vitest-axe/dist/matchers.js'
import type { AxeMatchers } from 'vitest-axe'
import { ComplianceGauge } from './ComplianceGauge'

expect.extend({ toHaveNoViolations })

declare module 'vitest' {
  // eslint-disable-next-line @typescript-eslint/no-empty-object-type, @typescript-eslint/no-unused-vars
  interface Assertion<T> extends AxeMatchers {}
}

const axe = configureAxe({
  rules: {
    'color-contrast': { enabled: false },
    region: { enabled: false },
  },
})

describe('ComplianceGauge', () => {
  afterEach(() => {
    cleanup()
  })

  it('renders a role="img" wrapper carrying the required aria-label', () => {
    const { container } = render(<ComplianceGauge value={54} aria-label="Overall compliance: 54 percent, at-risk" />)
    const wrapper = container.querySelector('[data-slot="compliance-gauge"]')
    expect(wrapper).toHaveAttribute('role', 'img')
    expect(wrapper).toHaveAttribute('aria-label', 'Overall compliance: 54 percent, at-risk')
    expect(wrapper).toHaveAttribute('aria-busy', 'false')
  })

  it('draws exactly 3 gapped, rounded-cap arc segments sharing one continuous gradient by default', () => {
    const { container } = render(<ComplianceGauge value={54} aria-label="Reading" />)
    const paths = container.querySelectorAll('[data-slot="compliance-gauge-arc"] path')
    expect(paths).toHaveLength(3)
    paths.forEach((path) => {
      expect(path).toHaveAttribute('stroke-linecap', 'round')
      expect(path.getAttribute('stroke')).toMatch(/^url\(#.+\)$/)
    })
    // All three segments reference the SAME gradient id — one continuous sweep, not per-segment fills.
    const strokes = new Set(Array.from(paths).map((p) => p.getAttribute('stroke')))
    expect(strokes.size).toBe(1)
    const gradient = container.querySelector('linearGradient')
    expect(gradient).toBeInTheDocument()
    const stops = gradient!.querySelectorAll('stop')
    expect(stops).toHaveLength(3)
  })

  it('splits the default 3 segments at criticalThreshold/warningThreshold', () => {
    const { container } = render(
      <ComplianceGauge value={50} aria-label="Reading" criticalThreshold={30} warningThreshold={60} />,
    )
    const paths = container.querySelectorAll('[data-slot="compliance-gauge-arc"] path')
    expect(paths).toHaveLength(3)
  })

  it('falls back to evenly-spaced gapped bands for a non-default segment count', () => {
    const { container } = render(<ComplianceGauge value={50} aria-label="Reading" segments={5} />)
    const paths = container.querySelectorAll('[data-slot="compliance-gauge-arc"] path')
    expect(paths).toHaveLength(5)
  })

  it('clamps the value to [min, max] before rendering it', () => {
    const { container } = render(<ComplianceGauge value={150} min={0} max={100} aria-label="Reading" />)
    expect(container.querySelector('[data-slot="compliance-gauge-value-number"]')).toHaveTextContent('100')
  })

  it('defaults the unit to "%" but lets a caller override it', () => {
    const { container, rerender } = render(<ComplianceGauge value={81} aria-label="Reading" />)
    expect(container.querySelector('[data-slot="compliance-gauge-value"]')).toHaveTextContent('81%')

    rerender(<ComplianceGauge value={81} unit=" pts" aria-label="Reading" />)
    expect(container.querySelector('[data-slot="compliance-gauge-value"]')).toHaveTextContent('81 pts')
  })

  it('renders the label as the muted caption directly under the value', () => {
    const { container } = render(<ComplianceGauge value={54} label="Overall Compliance" aria-label="Reading" />)
    expect(container.querySelector('[data-slot="compliance-gauge-value"]')).toHaveTextContent('Overall Compliance')
  })

  it('shows the needle marker by default and hides it when showNeedle is false', () => {
    const { container, rerender } = render(<ComplianceGauge value={50} aria-label="Reading" />)
    expect(container.querySelector('[data-slot="compliance-gauge-arc"] polygon')).toBeInTheDocument()

    rerender(<ComplianceGauge value={50} aria-label="Reading" showNeedle={false} />)
    expect(container.querySelector('[data-slot="compliance-gauge-arc"] polygon')).not.toBeInTheDocument()
  })

  it('applies the size-driven value typography class, sm/md/lg', () => {
    const { container, rerender } = render(<ComplianceGauge value={50} aria-label="Reading" size="sm" />)
    expect(container.querySelector('[data-slot="compliance-gauge-value-number"]')).toHaveClass('text-h4')

    rerender(<ComplianceGauge value={50} aria-label="Reading" size="md" />)
    expect(container.querySelector('[data-slot="compliance-gauge-value-number"]')).toHaveClass('text-h2')

    rerender(<ComplianceGauge value={50} aria-label="Reading" size="lg" />)
    expect(container.querySelector('[data-slot="compliance-gauge-value-number"]')).toHaveClass('text-h1')
  })

  it('lets an explicit height prop override the natural size-driven layout', () => {
    const { container } = render(<ComplianceGauge value={50} aria-label="Reading" height={444} />)
    const wrapper = container.querySelector('[data-slot="compliance-gauge"]') as HTMLElement
    expect(wrapper.style.height).toBe('444px')
  })

  it('replaces the built-in value/label stack with centerContent when supplied', () => {
    const { container } = render(
      <ComplianceGauge value={50} aria-label="Reading" centerContent={<div data-testid="custom">Custom</div>} />,
    )
    expect(container.querySelector('[data-testid="custom"]')).toBeInTheDocument()
    expect(container.querySelector('[data-slot="compliance-gauge-value"]')).not.toBeInTheDocument()
  })

  it('renders an optional caption below everything else, separate from the under-value label', () => {
    const { container } = render(
      <ComplianceGauge value={50} label="Overall Compliance" caption="Bands: 0-50 critical, 50-80 at-risk, 80-100 on-track" aria-label="Reading" />,
    )
    expect(container.querySelector('[data-slot="compliance-gauge-caption"]')).toHaveTextContent('Bands: 0-50 critical')
  })

  it('shows a skeleton in place of the arc while loading, keeping the wrapper aria-busy', () => {
    const { container } = render(<ComplianceGauge value={50} aria-label="Reading" loading />)
    const wrapper = container.querySelector('[data-slot="compliance-gauge"]')
    expect(wrapper).toHaveAttribute('aria-busy', 'true')
    expect(container.querySelector('[data-slot="compliance-gauge-loading"] [data-slot="skeleton"]')).toBeInTheDocument()
    expect(container.querySelector('[data-slot="compliance-gauge-arc"]')).not.toBeInTheDocument()
  })

  it('merges a consumer className and style with its own', () => {
    const { container } = render(<ComplianceGauge value={50} aria-label="Reading" className="ms-2" style={{ width: '90%' }} />)
    const wrapper = container.querySelector('[data-slot="compliance-gauge"]') as HTMLElement
    expect(wrapper).toHaveClass('ms-2')
    expect(wrapper.style.width).toBe('90%')
  })

  it('resolves dir from the given prop (RTL)', () => {
    const { container } = render(<ComplianceGauge value={50} aria-label="Reading" dir="rtl" />)
    expect(container.querySelector('[data-slot="compliance-gauge"]')).toHaveAttribute('dir', 'rtl')
  })

  it('accepts the deprecated renderer/onChartReady props as no-ops without forwarding them to the DOM', () => {
    const onChartReady = () => {}
    const { container } = render(
      <ComplianceGauge value={50} aria-label="Reading" renderer="svg" onChartReady={onChartReady} />,
    )
    const wrapper = container.querySelector('[data-slot="compliance-gauge"]') as HTMLElement
    expect(wrapper.getAttribute('renderer')).toBeNull()
    expect(wrapper.getAttribute('onchartready')).toBeNull()
  })

  it('has no axe violations', async () => {
    const { container } = render(<ComplianceGauge value={81} label="Fleet compliance" aria-label="Compliance: 81 percent" />)
    expect(await axe(container)).toHaveNoViolations()
  })

  it('has no axe violations while loading', async () => {
    const { container } = render(<ComplianceGauge value={81} aria-label="Compliance" loading />)
    expect(await axe(container)).toHaveNoViolations()
  })

  it('has no axe violations under dir="rtl"', async () => {
    const { container } = render(
      <ComplianceGauge value={81} label="Fleet compliance" aria-label="Compliance: 81 percent" dir="rtl" />,
    )
    expect(await axe(container)).toHaveNoViolations()
  })
})
