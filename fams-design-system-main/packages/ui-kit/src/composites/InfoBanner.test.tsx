import { describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'
import { ShieldCheck } from '../icons'
import { InfoBanner } from './InfoBanner'

describe('InfoBanner', () => {
  it('renders the title and a default bell icon', () => {
    const { container } = render(<InfoBanner title="Upcoming Plan" />)
    expect(screen.getByText('Upcoming Plan')).toBeInTheDocument()
    expect(container.querySelector('[data-slot="info-banner"]')).toBeInTheDocument()
  })

  it('renders trailing metadata items separated by a divider', () => {
    render(
      <InfoBanner
        title="Upcoming Plan"
        meta={[{ label: '# 231454' }, { label: '22 Jul, 2025 12:00pm' }]}
      />,
    )
    expect(screen.getByText('# 231454')).toBeInTheDocument()
    expect(screen.getByText('22 Jul, 2025 12:00pm')).toBeInTheDocument()
    const meta = document.querySelector('[data-slot="info-banner-meta"]')
    expect(meta?.querySelectorAll('[aria-hidden="true"]').length).toBe(1)
  })

  it('renders no metadata block when `meta` is omitted', () => {
    render(<InfoBanner title="No meta" />)
    expect(document.querySelector('[data-slot="info-banner-meta"]')).not.toBeInTheDocument()
  })

  it('accepts a custom icon + tone', () => {
    const { container } = render(<InfoBanner title="Custom" icon={ShieldCheck} iconTone="warning" />)
    expect(container.querySelector('[data-slot="icon-badge"]')).toBeInTheDocument()
  })

  it('forwards the ref to the root element', () => {
    let node: HTMLDivElement | null = null
    render(
      <InfoBanner
        title="Ref test"
        ref={(el) => {
          node = el
        }}
      />,
    )
    expect(node).toBeInstanceOf(HTMLDivElement)
  })

  it('renders the insight variant as a tinted pill with a bare accent glyph', () => {
    const { container } = render(<InfoBanner variant="insight" tone="success" title="3 anomalies resolved" />)
    const root = container.querySelector('[data-slot="info-banner"]')
    expect(root).toHaveAttribute('data-variant', 'insight')
    expect(root).toHaveClass('rounded-full')
    expect(container.querySelector('[data-slot="info-banner-glyph"]')).toHaveClass('text-success')
    // The insight shape drops the icon disc used by the default variant.
    expect(container.querySelector('[data-slot="icon-badge"]')).toBeNull()
  })

  it('renders the accent variant with a leading accent bar and a trailing slot', () => {
    const { container } = render(
      <InfoBanner variant="accent" tone="warning" title="Plan updated" trailing={<span>2h ago</span>} />,
    )
    expect(container.querySelector('[data-slot="info-banner-accent"]')).toHaveClass('bg-warning')
    expect(container.querySelector('[data-slot="info-banner-trailing"]')).toHaveTextContent('2h ago')
  })

  it('leaves the default variant untouched', () => {
    const { container } = render(<InfoBanner title="Upcoming Plan" />)
    const root = container.querySelector('[data-slot="info-banner"]')
    expect(root).toHaveAttribute('data-variant', 'default')
    expect(root).toHaveClass('border', 'rounded-sm')
    expect(container.querySelector('[data-slot="icon-badge"]')).not.toBeNull()
    expect(container.querySelector('[data-slot="info-banner-glyph"]')).toBeNull()
  })
})
