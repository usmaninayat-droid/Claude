import { describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'
import {
  HybridView,
  MapPlaceholder,
} from './HybridView'

describe('HybridView', () => {
  it('renders both the list and map regions', () => {
    render(
      <HybridView
        list={<div data-testid="my-list">list</div>}
        map={<div data-testid="my-map">map</div>}
      />,
    )
    expect(screen.getByTestId('my-list')).toBeInTheDocument()
    expect(screen.getByTestId('my-map')).toBeInTheDocument()
  })

  it('is side-by-side on md+ (md:flex-row) and tabbed below md', () => {
    render(<HybridView list={<div>l</div>} map={<div>m</div>} />)
    // The split body goes row from md up.
    const list = screen.getByTestId('hybrid-list')
    const splitBody = list.parentElement!
    expect(splitBody.className).toContain('md:flex-row')

    // Mobile tab strip exists but is hidden from md up.
    const tablist = screen.getByRole('tablist', { name: /Hybrid view panels/i })
    expect(tablist.className).toContain('md:hidden')
    expect(screen.getByRole('tab', { name: 'List' })).toBeInTheDocument()
    expect(screen.getByRole('tab', { name: 'Map' })).toBeInTheDocument()
  })

  it('forces both panels mounted but keeps the list visible at md+ even when its tab is inactive', () => {
    render(<HybridView list={<div>l</div>} map={<div>m</div>} />)
    const list = screen.getByTestId('hybrid-list')
    // md override keeps the start panel shown regardless of mobile tab state.
    expect(list.className).toContain('md:data-[state=inactive]:flex')
  })

  it('honours custom mobile tab labels', () => {
    render(
      <HybridView
        listLabel="Fleet"
        mapLabel="Tracker"
        list={<div>l</div>}
        map={<div>m</div>}
      />,
    )
    expect(screen.getByRole('tab', { name: 'Fleet' })).toBeInTheDocument()
    expect(screen.getByRole('tab', { name: 'Tracker' })).toBeInTheDocument()
  })

  it('MapPlaceholder renders a labelled empty surface', () => {
    render(<MapPlaceholder label="Live tracking" />)
    expect(screen.getByText('Live tracking placeholder')).toBeInTheDocument()
  })
})
