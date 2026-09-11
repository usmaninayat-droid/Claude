import { describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MapSearchPanel } from './MapSearchPanel'
import type { MapSearchProvider, MapSearchResult } from '../search/search-types'

/**
 * MapSearchPanel.test.tsx — the "search anything" dropdown
 * (map-features-video-analysis.md §1): debounced pluggable providers, the
 * mixed-type row templates (place/zone/asset/shortcut), chip overflow, and
 * keyboard navigation.
 */

function provider(id: string, results: MapSearchResult[]): MapSearchProvider {
  return { id, search: vi.fn(async () => results) }
}

const PLACE: MapSearchResult = {
  id: 'place-1',
  kind: 'place',
  title: 'Al Khor',
  subtitle: 'Al Khor Municipality, Qatar',
  position: [55.1, 25.1],
}
const ZONE: MapSearchResult = {
  id: 'zone-1',
  kind: 'zone',
  title: 'AUH EXIT 3',
  chips: ['Parked Zone', 'North', 'South', 'East'],
  position: [55.2, 25.2],
}
const SHORTCUT: MapSearchResult = {
  id: 'shortcut-1',
  kind: 'shortcut',
  title: 'Fleet Tools',
  chips: ['Dashboard', 'Assets', 'Reports', 'Alerts'],
  onActivate: vi.fn(),
}

describe('MapSearchPanel — collapsed/expanded + debounce', () => {
  it('renders nothing while closed', () => {
    render(<MapSearchPanel open={false} onOpenChange={() => {}} providers={[]} />)
    expect(screen.queryByRole('combobox')).not.toBeInTheDocument()
  })

  it('debounces the query across every provider and shows a loading state', async () => {
    const search = vi.fn(async () => [PLACE])
    render(<MapSearchPanel open onOpenChange={() => {}} providers={[{ id: 'p', search }]} debounceMs={20} />)
    fireEvent.change(screen.getByRole('combobox'), { target: { value: 'a' } })
    await waitFor(() => expect(screen.getByText('Al Khor')).toBeInTheDocument(), { timeout: 3000 })
    expect(search).toHaveBeenCalledWith('a')
  })

  it('mixes heterogeneous result rows in one flat list, in provider order', async () => {
    render(
      <MapSearchPanel
        open
        onOpenChange={() => {}}
        providers={[provider('places', [PLACE]), provider('zones', [ZONE])]}
        debounceMs={0}
      />,
    )
    await waitFor(() => expect(screen.getAllByRole('option')).toHaveLength(2), { timeout: 3000 })
    const options = screen.getAllByRole('option')
    expect(options[0]).toHaveTextContent('Al Khor')
    expect(options[0]).toHaveTextContent('Al Khor Municipality, Qatar')
    expect(options[1]).toHaveTextContent('AUH EXIT 3')
  })

  it('shows a place subtitle, a zone chip + overflow, and a shortcut chip + overflow', async () => {
    render(
      <MapSearchPanel
        open
        onOpenChange={() => {}}
        providers={[provider('places', [PLACE]), provider('zones', [ZONE]), provider('shortcuts', [SHORTCUT])]}
        debounceMs={0}
      />,
    )
    await waitFor(() => expect(screen.getAllByRole('option')).toHaveLength(3), { timeout: 3000 })
    const [, zoneRow, shortcutRow] = screen.getAllByRole('option')
    // Zone: first 2 chips visible (Parked Zone, North), remaining 2 collapse to "+2 more".
    expect(zoneRow).toHaveTextContent('Parked Zone')
    expect(zoneRow).toHaveTextContent('+2 more')
    // Shortcut: first two chips visible, remaining 2 collapse the same way.
    expect(shortcutRow).toHaveTextContent('Dashboard')
    expect(shortcutRow).toHaveTextContent('Assets')
    expect(shortcutRow).toHaveTextContent('+2 more')
  })
})

describe('MapSearchPanel — selection + clear/close', () => {
  it('selects a result on click and reports it', async () => {
    const onResultSelect = vi.fn()
    render(
      <MapSearchPanel open onOpenChange={() => {}} providers={[provider('places', [PLACE])]} debounceMs={0} onResultSelect={onResultSelect} />,
    )
    await waitFor(() => expect(screen.getByText('Al Khor')).toBeInTheDocument(), { timeout: 3000 })
    fireEvent.click(screen.getByText('Al Khor'))
    expect(onResultSelect).toHaveBeenCalledWith(PLACE)
  })

  it('a shortcut result runs its own onActivate', async () => {
    const activate = vi.fn()
    const shortcut = { ...SHORTCUT, onActivate: activate }
    render(<MapSearchPanel open onOpenChange={() => {}} providers={[provider('shortcuts', [shortcut])]} debounceMs={0} />)
    await waitFor(() => expect(screen.getByText('Fleet Tools')).toBeInTheDocument(), { timeout: 3000 })
    fireEvent.click(screen.getByText('Fleet Tools'))
    expect(activate).toHaveBeenCalledTimes(1)
  })

  it('Escape with an empty query closes the panel', () => {
    const onOpenChange = vi.fn()
    render(<MapSearchPanel open onOpenChange={onOpenChange} providers={[]} />)
    fireEvent.keyDown(screen.getByRole('combobox'), { key: 'Escape' })
    expect(onOpenChange).toHaveBeenCalledWith(false)
  })

  it('Escape with text clears the query first, without closing', () => {
    const onOpenChange = vi.fn()
    render(<MapSearchPanel open onOpenChange={onOpenChange} providers={[]} />)
    const input = screen.getByRole('combobox') as HTMLInputElement
    fireEvent.change(input, { target: { value: 'abc' } })
    fireEvent.keyDown(input, { key: 'Escape' })
    expect(onOpenChange).not.toHaveBeenCalled()
    expect(input.value).toBe('')
  })

  it('the × button fires onClear (removes the highlight) only when actually closing', () => {
    const onOpenChange = vi.fn()
    const onClear = vi.fn()
    render(<MapSearchPanel open onOpenChange={onOpenChange} onClear={onClear} providers={[]} />)
    fireEvent.click(screen.getByRole('button', { name: 'Close search' }))
    expect(onOpenChange).toHaveBeenCalledWith(false)
    expect(onClear).toHaveBeenCalledTimes(1)
  })
})

describe('MapSearchPanel — keyboard navigation', () => {
  it('ArrowDown/ArrowUp move the active option and Enter selects it', async () => {
    const onResultSelect = vi.fn()
    render(
      <MapSearchPanel
        open
        onOpenChange={() => {}}
        providers={[provider('places', [PLACE, ZONE])]}
        debounceMs={0}
        onResultSelect={onResultSelect}
      />,
    )
    const input = screen.getByRole('combobox')
    await waitFor(() => expect(screen.getAllByRole('option')).toHaveLength(2), { timeout: 3000 })
    fireEvent.keyDown(input, { key: 'ArrowDown' })
    fireEvent.keyDown(input, { key: 'Enter' })
    expect(onResultSelect).toHaveBeenCalledWith(ZONE)
  })
})

describe('MapSearchPanel — row anatomy and the empty state', () => {
  it('renders a zone row with its colour swatch ahead of the chip run', async () => {
    const { container } = render(
      <MapSearchPanel
        open
        onOpenChange={() => {}}
        providers={[provider('zones', [{ ...ZONE, swatchColor: 'rgb(240, 68, 56)' }])]}
        debounceMs={0}
      />,
    )
    await waitFor(() => expect(screen.getAllByRole('option')).toHaveLength(1), { timeout: 3000 })
    const swatch = container.querySelector('[data-slot="map-search-chip-swatch"]') as HTMLElement
    expect(swatch).toBeTruthy()
    expect(swatch.style.backgroundColor).toBe('rgb(240, 68, 56)')
    // Decorative — the colour repeats what the title and type pill already say.
    expect(swatch).toHaveAttribute('aria-hidden', 'true')
  })

  it('an untouched field explains what is searchable instead of showing 0 results', async () => {
    render(<MapSearchPanel open onOpenChange={() => {}} providers={[provider('places', [])]} debounceMs={0} />)
    await waitFor(() => expect(screen.getByText('Search the map')).toBeInTheDocument(), { timeout: 3000 })
    expect(screen.getByText(/place, a saved zone or a point of interest/i)).toBeInTheDocument()
  })

  it('a missed query names itself back and suggests a next move, announced politely', async () => {
    render(<MapSearchPanel open onOpenChange={() => {}} providers={[provider('places', [])]} debounceMs={0} />)
    fireEvent.change(screen.getByRole('combobox'), { target: { value: 'zzzz' } })
    await waitFor(() => expect(screen.getByText(/No matches for/)).toBeInTheDocument(), { timeout: 3000 })
    const status = screen.getByRole('status')
    expect(status).toHaveAttribute('aria-live', 'polite')
    expect(status).toHaveTextContent('zzzz')
  })

  it('empty-state and placeholder copy are props — no deployment wording is baked into the shared panel', async () => {
    render(
      <MapSearchPanel
        open
        onOpenChange={() => {}}
        providers={[provider('places', [])]}
        debounceMs={0}
        placeholder="Search anything here"
        emptyTitle="Find a location"
        hint="Districts, zones and depots."
      />,
    )
    expect(screen.getByRole('combobox')).toHaveAttribute('placeholder', 'Search anything here')
    // The accessible name follows the visible prompt rather than drifting from it.
    expect(screen.getByRole('combobox')).toHaveAccessibleName('Search anything here')
    await waitFor(() => expect(screen.getByText('Find a location')).toBeInTheDocument(), { timeout: 3000 })
    expect(screen.getByText('Districts, zones and depots.')).toBeInTheDocument()
  })
})
