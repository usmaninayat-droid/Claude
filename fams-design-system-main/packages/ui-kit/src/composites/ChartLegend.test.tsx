import { createRef } from 'react'
import { describe, expect, it, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { ChartLegend, type ChartLegendItem } from './ChartLegend'

const ITEMS: ChartLegendItem[] = [
  { id: 'lot1', label: 'Lot 1', colorIndex: 1, value: 42 },
  { id: 'lot2', label: 'Lot 2', colorIndex: 2, value: 7 },
]

describe('ChartLegend', () => {
  it('renders every item label', () => {
    render(<ChartLegend items={ITEMS} />)
    expect(screen.getByText('Lot 1')).toBeInTheDocument()
    expect(screen.getByText('Lot 2')).toBeInTheDocument()
  })

  it('applies the colorIndex token class to each swatch', () => {
    const { container } = render(<ChartLegend items={ITEMS} />)
    const swatches = container.querySelectorAll('[aria-hidden="true"]')
    expect(swatches[0]).toHaveClass('bg-chart-1')
    expect(swatches[1]).toHaveClass('bg-chart-2')
  })

  it('is static (no buttons) when onToggle is omitted', () => {
    render(<ChartLegend items={ITEMS} />)
    expect(screen.queryByRole('button')).not.toBeInTheDocument()
    expect(screen.getAllByRole('listitem')).toHaveLength(2)
  })

  it('does not render count chips unless showCounts is set', () => {
    render(<ChartLegend items={ITEMS} />)
    expect(screen.queryByText('42')).not.toBeInTheDocument()
  })

  it('renders count chips when showCounts is set', () => {
    render(<ChartLegend items={ITEMS} showCounts />)
    expect(screen.getByText('42')).toBeInTheDocument()
    expect(screen.getByText('7')).toBeInTheDocument()
  })

  it('stacks vertically when orientation="vertical"', () => {
    render(<ChartLegend items={ITEMS} orientation="vertical" data-testid="legend" />)
    expect(screen.getByTestId('legend')).toHaveClass('flex-col')
  })

  it('applies the tinted background strip', () => {
    render(<ChartLegend items={ITEMS} tinted data-testid="legend" />)
    expect(screen.getByTestId('legend')).toHaveClass('bg-muted')
  })

  it('becomes interactive and calls onToggle with the item id when onToggle is provided', () => {
    const onToggle = vi.fn()
    render(<ChartLegend items={ITEMS} onToggle={onToggle} />)

    const buttons = screen.getAllByRole('button')
    expect(buttons).toHaveLength(2)

    fireEvent.click(buttons[0])
    expect(onToggle).toHaveBeenCalledWith('lot1')
  })

  it('dims and strikes through hidden items (interactive)', () => {
    render(<ChartLegend items={ITEMS} onToggle={vi.fn()} hiddenIds={['lot1']} />)
    const button = screen.getByText('Lot 1').closest('button')
    expect(button).toHaveClass('opacity-50')
    expect(button).toHaveAttribute('aria-pressed', 'false')
    expect(screen.getByText('Lot 1')).toHaveClass('line-through')
  })

  it('dims hidden items in static mode too', () => {
    render(<ChartLegend items={ITEMS} hiddenIds={['lot2']} />)
    const wrapper = screen.getByText('Lot 2').closest('[data-slot="chart-legend-static"]')
    expect(wrapper).toHaveClass('opacity-50')
  })

  it('forwards the ref to the underlying ul', () => {
    const ref = createRef<HTMLUListElement>()
    render(<ChartLegend items={ITEMS} ref={ref} />)
    expect(ref.current).toBeInstanceOf(HTMLUListElement)
  })

  it('merges a consumer className with the base classes', () => {
    render(<ChartLegend items={ITEMS} className="ms-2" data-testid="legend" />)
    expect(screen.getByTestId('legend')).toHaveClass('ms-2', 'flex')
  })

  it('renders an item trailing slot at the end of the row', () => {
    render(<ChartLegend items={[{ id: 'lot1', label: 'Lot 1', colorIndex: 1, trailing: <span>+12%</span> }]} />)
    expect(screen.getByText('+12%')).toBeInTheDocument()
  })

  it('renders the trailing slot after the count chip, using logical spacing only', () => {
    const { container } = render(
      <ChartLegend items={[{ id: 'lot1', label: 'Lot 1', colorIndex: 1, value: 42, trailing: 'leading axis' }]} showCounts />,
    )
    const trailing = container.querySelector('[data-slot="chart-legend-trailing"]') as HTMLElement
    expect(trailing).toHaveTextContent('leading axis')
    expect(trailing.className).toContain('ms-auto')
    expect(trailing.className).not.toMatch(/\bml-|\bmr-/)
    expect(trailing.previousElementSibling?.textContent).toBe('42')
  })

  it('renders no trailing element when the item has no trailing content', () => {
    const { container } = render(<ChartLegend items={ITEMS} />)
    expect(container.querySelector('[data-slot="chart-legend-trailing"]')).not.toBeInTheDocument()
  })


  it('paints a non-categorical swatch from item.color, overriding the colorIndex class', () => {
    const { container } = render(
      <ChartLegend items={[{ id: 'a', label: 'Braking', colorIndex: 1, color: 'rgb(0, 114, 214)' }]} />,
    )
    const swatch = container.querySelector('[data-slot="chart-legend-static"] span') as HTMLElement
    expect(swatch).toHaveStyle({ backgroundColor: 'rgb(0, 114, 214)' })
    // The categorical class stays on as the fallback — an inline background
    // always wins, so no conditional class swap is needed.
    expect(swatch.className).toContain('bg-chart-1')
  })

  it('leaves the categorical class alone when no color override is given', () => {
    const { container } = render(<ChartLegend items={[{ id: 'a', label: 'Braking', colorIndex: 2 }]} />)
    const swatch = container.querySelector('[data-slot="chart-legend-static"] span') as HTMLElement
    expect(swatch.getAttribute('style')).toBeNull()
    expect(swatch.className).toContain('bg-chart-2')
  })

})
