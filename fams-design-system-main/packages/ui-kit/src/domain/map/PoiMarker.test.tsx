import { describe, it, expect } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { PoiMarker, PoiCategoryChip, POI_CATEGORIES, poiCategoryArt } from '../../index'

describe('POI_CATEGORIES registry', () => {
  it('covers every category asset in poi-marker-art.ts', () => {
    expect(POI_CATEGORIES.length).toBeGreaterThanOrEqual(16)
    for (const c of POI_CATEGORIES) {
      expect(c.id).toBeTruthy()
      expect(c.label).toBeTruthy()
      expect(c.color).toBeTruthy()
      expect(c.src).toMatch(/^data:image\/svg\+xml;base64,/)
    }
  })

  it('resolves a known category and returns undefined for an unknown one', () => {
    expect(poiCategoryArt('port')?.color).toBe('#1EACFF')
    expect(poiCategoryArt('fuel-station')?.color).toBe('#FF9503')
    expect(poiCategoryArt('hospital')?.color).toBe('#E3132E')
    expect(poiCategoryArt('mosque')?.color).toBe('#057D4B')
    expect(poiCategoryArt('nonexistent-category')).toBeUndefined()
    expect(poiCategoryArt(undefined)).toBeUndefined()
  })
})

describe('PoiMarker', () => {
  it('renders the category art with an accessible name', () => {
    render(<PoiMarker poi={{ id: '1', name: 'Doha Port', category: 'port' }} />)
    const marker = screen.getByRole('button', { name: /Doha Port, Port/ })
    expect(marker).toBeInTheDocument()
    expect(marker).toHaveAttribute('data-category', 'port')
  })

  it('shows the hover tooltip with name and radius', () => {
    render(<PoiMarker poi={{ id: '1', name: 'Doha Port', category: 'port', radiusMeters: 50 }} />)
    const marker = screen.getByRole('button')
    fireEvent.mouseEnter(marker)
    expect(screen.getByRole('tooltip')).toHaveTextContent('Doha Port')
    expect(screen.getByRole('tooltip')).toHaveTextContent('Radius 50 meters')
  })

  it('renders nothing for an unrecognized category', () => {
    const { container } = render(<PoiMarker poi={{ id: '1', name: 'Mystery', category: 'nope' }} />)
    expect(container.firstChild).toBeNull()
  })
})

describe('PoiCategoryChip', () => {
  it('renders a circular chip carrying the category label for a11y', () => {
    render(<PoiCategoryChip category="hospital" />)
    const chip = screen.getByRole('img', { name: 'Hospital' })
    expect(chip).toHaveAttribute('data-category', 'hospital')
    expect(chip.className).toContain('rounded-full')
  })

  it('falls back to a tinted circle with a generic label for an unknown category', () => {
    render(<PoiCategoryChip category="unknown-cat" />)
    expect(screen.getByRole('img', { name: 'Point of interest' })).toBeInTheDocument()
  })
})
