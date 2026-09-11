import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { AssetStatusIcon } from './AssetStatusIcon'
import { MOBILITY_STATUS_LABELS, type MobilityStatus } from './mobility-status'

const STATUSES: MobilityStatus[] = ['moving', 'idle', 'stopped', 'non-moving', 'non-reporting', 'immobilized']

describe('AssetStatusIcon', () => {
  it('renders with the status label as its accessible name by default', () => {
    render(<AssetStatusIcon status="moving" icon={<img src="/car.svg" alt="" />} />)
    expect(screen.getByRole('img', { name: 'Moving' })).toBeInTheDocument()
  })

  it('accepts a custom accessible label', () => {
    render(<AssetStatusIcon status="stopped" icon={<img src="/car.svg" alt="" />} label="Truck 12 · Stopped" />)
    expect(screen.getByRole('img', { name: 'Truck 12 · Stopped' })).toBeInTheDocument()
  })

  it.each(STATUSES)('renders every status (%s) with its label mapping', (status) => {
    render(<AssetStatusIcon status={status} icon={<img src="/car.svg" alt="" />} />)
    expect(screen.getByRole('img', { name: MOBILITY_STATUS_LABELS[status] })).toBeInTheDocument()
  })

  it('applies the status badge color', () => {
    const { container, rerender } = render(<AssetStatusIcon status="stopped" icon={<img src="/car.svg" alt="" />} />)
    expect(container.querySelector('.bg-error-500')).not.toBeNull()

    rerender(<AssetStatusIcon status="non-moving" icon={<img src="/car.svg" alt="" />} />)
    expect(container.querySelector('.bg-info-scale-500')).not.toBeNull()
  })

  it('accepts a string src for the icon prop', () => {
    render(<AssetStatusIcon status="moving" icon="/car.svg" />)
    const img = screen.getByRole('img', { name: 'Moving' }).querySelector('img')
    expect(img).toHaveAttribute('src', '/car.svg')
  })

  it('accepts a ReactNode for the icon prop', () => {
    render(<AssetStatusIcon status="moving" icon={<span data-testid="asset-icon" />} />)
    expect(screen.getByTestId('asset-icon')).toBeInTheDocument()
  })

  it('scales the icon box per size', () => {
    const { container, rerender } = render(<AssetStatusIcon status="moving" icon="/car.svg" size="md" />)
    const root = container.querySelector('[data-slot="asset-status-icon"]') as HTMLElement
    expect(root.style.width).toBe('40px')

    rerender(<AssetStatusIcon status="moving" icon="/car.svg" size="lg" />)
    const rootLg = container.querySelector('[data-slot="asset-status-icon"]') as HTMLElement
    expect(rootLg.style.width).toBe('48px')
  })

  it('positions the badge at the same fixed anchor regardless of size or icon', () => {
    const { container: c1 } = render(<AssetStatusIcon status="moving" icon="/car.svg" size="sm" />)
    const { container: c2 } = render(<AssetStatusIcon status="stopped" icon={<span>x</span>} size="sm" />)
    const badge1 = c1.querySelector('[data-slot="asset-status-icon"] > span:last-child') as HTMLElement
    const badge2 = c2.querySelector('[data-slot="asset-status-icon"] > span:last-child') as HTMLElement
    expect(badge1.style.insetInlineStart).toBe(badge2.style.insetInlineStart)
    expect(badge1.style.top).toBe(badge2.style.top)
    expect(badge1.style.width).toBe(badge2.style.width)
  })

  it('allows overriding a status color via statusStyles', () => {
    const { container } = render(
      <AssetStatusIcon
        status="moving"
        icon="/car.svg"
        statusStyles={{ moving: { bg: 'bg-accent-family-plum-normal' } }}
      />,
    )
    expect(container.querySelector('.bg-accent-family-plum-normal')).not.toBeNull()
  })
})
