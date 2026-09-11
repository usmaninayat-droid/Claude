import { useState } from 'react'
import { describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen } from '@testing-library/react'
import { SearchHighlightPin } from './SearchHighlightPin'
import type { MapSearchHighlight } from './search/search-types'

/**
 * SearchHighlightPin.test.tsx — the selected search-result marker
 * (map-features-video-analysis.md §1): hovering (or focusing) the pin reveals
 * the "Assets Nearby" panel, whose radius slider reports back so the caller
 * can live-resize the highlight circle and recount the fleet inside it.
 */

const HIGHLIGHT: MapSearchHighlight = { id: 'h1', title: 'Lusail, Al Daayen Municipality, Qatar', position: [51.49, 25.43], radiusKm: 5 }

/** Mirrors the real caller: the open state lives ABOVE the pin (LiveMapView). */
function Harness({ assetsNearbyCount = 0, onRadiusChange = () => {}, onClear = () => {} }) {
  const [open, setOpen] = useState(false)
  return (
    <SearchHighlightPin
      highlight={HIGHLIGHT}
      assetsNearbyCount={assetsNearbyCount}
      onRadiusChange={onRadiusChange}
      onClear={onClear}
      open={open}
      onOpenChange={setOpen}
    />
  )
}

const pin = () => screen.getByRole('button', { name: /Search result/ })

describe('SearchHighlightPin', () => {
  it('reveals the Assets Nearby panel on hover, with the title and the live count', () => {
    render(<Harness assetsNearbyCount={7} />)
    expect(screen.queryByText('Assets Nearby')).not.toBeInTheDocument()
    fireEvent.mouseEnter(pin().parentElement!)
    expect(screen.getByText('Assets Nearby')).toBeInTheDocument()
    expect(screen.getByText(HIGHLIGHT.title)).toBeInTheDocument()
    expect(screen.getByText('7 assets within 5 km')).toBeInTheDocument()
  })

  it('opens on keyboard focus too — the slider is never pointer-only', () => {
    render(<Harness />)
    fireEvent.focus(pin())
    expect(screen.getByRole('slider')).toBeInTheDocument()
  })

  it('stays open once revealed, so the pointer can travel down to the slider', () => {
    render(<Harness />)
    fireEvent.mouseEnter(pin().parentElement!)
    fireEvent.mouseLeave(pin().parentElement!)
    expect(screen.getByText('Assets Nearby')).toBeInTheDocument()
  })

  it('a keyboard blur out of the pin closes it', () => {
    render(<Harness />)
    fireEvent.focus(pin())
    fireEvent.blur(pin().parentElement!, { relatedTarget: document.body })
    expect(screen.queryByText('Assets Nearby')).not.toBeInTheDocument()
  })

  it('the radius slider reports back to the caller', () => {
    const onRadiusChange = vi.fn()
    render(<Harness onRadiusChange={onRadiusChange} />)
    fireEvent.mouseEnter(pin().parentElement!)
    fireEvent.keyDown(screen.getByRole('slider'), { key: 'ArrowRight' })
    expect(onRadiusChange).toHaveBeenCalled()
  })

  it('the panel × clears the highlight', () => {
    const onClear = vi.fn()
    render(<Harness onClear={onClear} />)
    fireEvent.mouseEnter(pin().parentElement!)
    fireEvent.click(screen.getByRole('button', { name: 'Clear search result' }))
    expect(onClear).toHaveBeenCalledTimes(1)
  })
})
