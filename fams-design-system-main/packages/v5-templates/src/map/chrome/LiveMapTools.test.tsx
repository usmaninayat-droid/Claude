import { describe, expect, it, vi } from 'vitest'
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { LiveMapTools, LIVE_MAP_DEFAULT_TOOL_IDS } from './LiveMapTools'

/**
 * LiveMapTools.test.tsx — the Live Monitoring floating map chrome
 * (SPEC §2.3) and the three invoker decisions it carries: traffic (3.19),
 * place search + POI drop (3.18) and the refresh confirmation (UX-25).
 *
 * `@fams/ui-kit`'s `toast` is mocked so the default "unavailable tool raises
 * a toast" path is assertable without mounting a `<Toaster />`.
 */
/* `toast.info`, not a bare `toast`: a typed sonner toast renders a status
   glyph and a plain message renders none (round-4 UX finding N4 measured zero
   `<svg>` inside this toast). */
const toastSpy = vi.hoisted(() => Object.assign(vi.fn(), { info: vi.fn() }))
vi.mock('@fams/ui-kit', async (importOriginal) => ({
  ...(await importOriginal<Record<string, unknown>>()),
  toast: toastSpy,
}))

/** Application-supplied places — deliberately neutral: the design system
 *  must never carry environment place names. */
const PLACES = [
  { id: 'p1', name: 'North Terminal', position: [55.1, 25.1] as [number, number], category: 'Terminal' },
  { id: 'p2', name: 'South Yard', position: [55.3, 25.3] as [number, number], category: 'Yard' },
]

describe('LiveMapTools — the SPEC §2.3 control set', () => {
  it('renders the DEFAULT tool set — search, clustering, layers, traffic, POI, zones', () => {
    render(<LiveMapTools zonesAvailable poiAvailable />)
    for (const label of [
      'Search places on the map',
      'Switch basemap style',
      'Traffic overlay',
      'Points of interest',
      'Zones',
      'Disable clustering',
    ]) {
      expect(screen.getByRole('button', { name: label })).toBeInTheDocument()
    }
  })

  it('omits pin + refresh by default and renders them when `tools` asks for them', () => {
    const { rerender } = render(<LiveMapTools zonesAvailable poiAvailable />)
    expect(screen.queryByRole('button', { name: 'Drop a point of interest at a place' })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Refresh live positions' })).not.toBeInTheDocument()
    rerender(<LiveMapTools zonesAvailable poiAvailable tools={[...LIVE_MAP_DEFAULT_TOOL_IDS, 'pin', 'refresh']} />)
    expect(screen.getByRole('button', { name: 'Drop a point of interest at a place' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Refresh live positions' })).toBeInTheDocument()
  })

  it('drops any tool the caller leaves out of `tools`', () => {
    render(<LiveMapTools zonesAvailable poiAvailable tools={['search']} />)
    expect(screen.getByRole('button', { name: 'Search places on the map' })).toBeInTheDocument()
    for (const gone of ['Switch basemap style', 'Traffic overlay', 'Zones', 'Points of interest', 'Disable clustering']) {
      expect(screen.queryByRole('button', { name: gone })).not.toBeInTheDocument()
    }
  })

  it('omits the zones/POI tools when the blueprint declares none', () => {
    render(<LiveMapTools />)
    expect(screen.queryByRole('button', { name: 'Zones' })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Points of interest' })).not.toBeInTheDocument()
  })

  it('shifts the end stack inboard by the open drawer width so the tool stays reachable (21b)', () => {
    const { rerender } = render(<LiveMapTools zonesAvailable zonesOpen={false} />)
    const stack = () => document.querySelector<HTMLElement>('[data-slot="live-map-end-tools"]')!
    expect(stack().style.getPropertyValue('inset-inline-end')).toBe('16px')
    rerender(<LiveMapTools zonesAvailable zonesOpen endInset={347} />)
    expect(stack().style.getPropertyValue('inset-inline-end')).toBe('363px')
  })
})

describe('LiveMapTools — traffic (SPEC 3.19)', () => {
  it('toggles when the deployment has traffic data', () => {
    const onTrafficToggle = vi.fn()
    render(<LiveMapTools onTrafficToggle={onTrafficToggle} />)
    fireEvent.click(screen.getByRole('button', { name: 'Traffic overlay' }))
    expect(onTrafficToggle).toHaveBeenCalledTimes(1)
  })

  it('stays interactive and raises the METADATA message as a toast when unavailable', () => {
    toastSpy.info.mockClear()
    const onTrafficToggle = vi.fn()
    render(
      <LiveMapTools
        onTrafficToggle={onTrafficToggle}
        unavailableTools={[{ tool: 'traffic', message: 'Live traffic is off in this deployment.' }]}
      />,
    )
    const button = screen.getByRole('button', { name: 'Traffic overlay' })
    expect(button).not.toBeDisabled()
    fireEvent.click(button)
    expect(onTrafficToggle).not.toHaveBeenCalled()
    expect(toastSpy.info).toHaveBeenCalledWith('Live traffic is off in this deployment.')
    // The bare, glyph-less form is never used.
    expect(toastSpy).not.toHaveBeenCalled()
  })

  it('routes the unavailable message to a caller-supplied handler when given', () => {
    const onUnavailableTool = vi.fn()
    render(
      <LiveMapTools
        unavailableTools={[{ tool: 'traffic', message: 'No traffic feed.' }]}
        onUnavailableTool={onUnavailableTool}
      />,
    )
    fireEvent.click(screen.getByRole('button', { name: 'Traffic overlay' }))
    expect(onUnavailableTool).toHaveBeenCalledWith({ tool: 'traffic', message: 'No traffic feed.' })
  })
})

describe('LiveMapTools — place search + POI drop (SPEC 3.18)', () => {
  it('filters the APPLICATION-supplied place list and flies to the pick', async () => {
    const onPlacePick = vi.fn()
    render(<LiveMapTools places={PLACES} onPlacePick={onPlacePick} />)
    fireEvent.click(screen.getByRole('button', { name: 'Search places on the map' }))
    fireEvent.change(screen.getByRole('combobox'), { target: { value: 'south' } })
    await waitFor(() => expect(screen.getByText('South Yard')).toBeInTheDocument(), { timeout: 3000 })
    expect(screen.queryByText('North Terminal')).not.toBeInTheDocument()
    fireEvent.click(screen.getByText('South Yard'))
    expect(onPlacePick).toHaveBeenCalledWith(PLACES[1])
  })

  it('names the missed query back rather than showing an empty void', async () => {
    render(<LiveMapTools places={PLACES} />)
    fireEvent.click(screen.getByRole('button', { name: 'Search places on the map' }))
    fireEvent.change(screen.getByRole('combobox'), { target: { value: 'zzzz' } })
    await waitFor(() => expect(screen.getByText(/No matches for/)).toBeInTheDocument(), { timeout: 3000 })
    expect(screen.getByText(/try a district, zone or landmark/i)).toBeInTheDocument()
  })

  it('expands the trigger IN PLACE — the tile unmounts while the pill is open, and returns on close', async () => {
    render(<LiveMapTools places={PLACES} />)
    fireEvent.click(screen.getByRole('button', { name: 'Search places on the map' }))
    expect(screen.getByRole('combobox')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Search places on the map' })).not.toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Close search' }))
    await waitFor(() =>
      expect(screen.getByRole('button', { name: 'Search places on the map' })).toBeInTheDocument(),
    )
  })

  it('pin-01 arms drop mode: the next picked place drops a POI there', async () => {
    const onDropPin = vi.fn()
    const onPlacePick = vi.fn()
    render(<LiveMapTools tools={[...LIVE_MAP_DEFAULT_TOOL_IDS, 'pin']} places={PLACES} onDropPin={onDropPin} onPlacePick={onPlacePick} />)
    fireEvent.click(screen.getByRole('button', { name: 'Drop a point of interest at a place' }))
    // Arming opens the search with the drop-mode prompt.
    await waitFor(() => expect(screen.getByText('North Terminal')).toBeInTheDocument(), { timeout: 3000 })
    fireEvent.click(screen.getByText('North Terminal'))
    expect(onDropPin).toHaveBeenCalledWith(PLACES[0])
    expect(onPlacePick).toHaveBeenCalledWith(PLACES[0])
  })

  it('does not drop a pin when drop mode is not armed', async () => {
    const onDropPin = vi.fn()
    render(<LiveMapTools places={PLACES} onDropPin={onDropPin} />)
    fireEvent.click(screen.getByRole('button', { name: 'Search places on the map' }))
    await waitFor(() => expect(screen.getByText('North Terminal')).toBeInTheDocument(), { timeout: 3000 })
    fireEvent.click(screen.getByText('North Terminal'))
    expect(onDropPin).not.toHaveBeenCalled()
  })
})

describe('LiveMapTools — cluster toggle (map-features-video-analysis.md §2)', () => {
  it('renders as the bottom-start EYE button, flipping its tooltip text with state', () => {
    const { rerender } = render(<LiveMapTools clusterEnabled />)
    expect(screen.getByRole('button', { name: 'Disable clustering' })).toBeInTheDocument()
    rerender(<LiveMapTools clusterEnabled={false} />)
    expect(screen.getByRole('button', { name: 'Enable clustering' })).toBeInTheDocument()
  })

  it('calls onClusterToggle on click, instantly (no confirmation)', () => {
    const onClusterToggle = vi.fn()
    render(<LiveMapTools clusterEnabled onClusterToggle={onClusterToggle} />)
    fireEvent.click(screen.getByRole('button', { name: 'Disable clustering' }))
    expect(onClusterToggle).toHaveBeenCalledTimes(1)
  })
})

describe('LiveMapTools — refresh feedback (UX-25 / interaction 18e)', () => {
  it('spins while refreshing, then announces "Updated just now"', async () => {
    let resolve!: () => void
    const onRefresh = vi.fn(() => new Promise<void>((r) => (resolve = r)))
    render(<LiveMapTools tools={[...LIVE_MAP_DEFAULT_TOOL_IDS, 'refresh']} onRefresh={onRefresh} />)
    const button = screen.getByRole('button', { name: 'Refresh live positions' })
    fireEvent.click(button)
    expect(button.querySelector('.animate-spin')).not.toBeNull()
    await act(async () => {
      resolve()
    })
    expect(button.querySelector('.animate-spin')).toBeNull()
    await waitFor(() => expect(screen.getByRole('status')).toHaveTextContent('Updated just now'))
  })
})

describe('LiveMapTools — the eye IS the clustering toggle (reference-app parity)', () => {
  it('rests INACTIVE while clustered and lights up while unclustered ("eye on = see every asset")', () => {
    const { rerender } = render(<LiveMapTools clusterEnabled />)
    const clustered = screen.getByRole('button', { name: 'Disable clustering' })
    // Clustered = the resting white tile, not the lit primary one.
    expect(clustered).toHaveAttribute('aria-pressed', 'false')
    expect(clustered.className).not.toContain('before:bg-primary')
    expect(screen.queryByRole('button', { name: /vehicle markers/i })).not.toBeInTheDocument()

    rerender(<LiveMapTools clusterEnabled={false} />)
    const exploded = screen.getByRole('button', { name: 'Enable clustering' })
    expect(exploded).toHaveAttribute('aria-pressed', 'true')
    expect(exploded.className).toContain('before:bg-primary')
  })
})

describe('LiveMapTools — layers is a basemap STYLE SWITCHER, HOVER-ROW interaction (map-layer-switcher spec)', () => {
  it('expands into an option row on hover instead of a popover, and reports the picked style', () => {
    const onBasemapChange = vi.fn()
    render(<LiveMapTools onBasemapChange={onBasemapChange} />)
    fireEvent.mouseEnter(screen.getByRole('button', { name: 'Switch basemap style' }).parentElement!)
    const options = screen.getAllByRole('option')
    expect(options.length).toBeGreaterThan(1)
    fireEvent.click(options[1])
    expect(onBasemapChange).toHaveBeenCalled()
  })

  it('accepts a caller-supplied style list (no style vocabulary is baked in)', () => {
    render(
      <LiveMapTools
        basemapStyles={[
          { id: 'a', label: 'Style A' },
          { id: 'b', label: 'Style B' },
        ]}
        activeBasemapId="b"
        onBasemapChange={() => {}}
      />,
    )
    fireEvent.mouseEnter(screen.getByRole('button', { name: 'Switch basemap style' }).parentElement!)
    expect(screen.getByRole('option', { name: /Style A/ })).toBeInTheDocument()
    expect(screen.getByRole('option', { name: /Style B/ })).toHaveAttribute('aria-selected', 'true')
  })

  it('bridges the deprecated layersActive/onLayersToggle pair', () => {
    const onLayersToggle = vi.fn()
    render(<LiveMapTools layersActive={false} onLayersToggle={onLayersToggle} />)
    fireEvent.mouseEnter(screen.getByRole('button', { name: 'Switch basemap style' }).parentElement!)
    fireEvent.click(screen.getByRole('option', { name: /Roadmap/ }))
    expect(onLayersToggle).toHaveBeenCalledTimes(1)
  })

  it('paints the active style as a mini basemap thumbnail, not a plain tile (visual #23)', () => {
    render(<LiveMapTools />)
    const tile = document.querySelector('[data-slot="map-layers-switcher"]')!
    expect(tile.querySelector('span[aria-hidden="true"]')).not.toBeNull()
  })

  it('an unavailable layers tool reports instead of applying the picked style', () => {
    render(<LiveMapTools unavailableTools={[{ tool: 'layers', message: 'No alternate basemap here.' }]} />)
    fireEvent.mouseEnter(screen.getByRole('button', { name: 'Switch basemap style' }).parentElement!)
    fireEvent.click(screen.getAllByRole('option')[1])
    expect(toastSpy.info).toHaveBeenCalledWith('No alternate basemap here.')
  })
})

describe('LiveMapTools — Figma glyphs + hit areas (visual #22/#23/#41, E11)', () => {
  it('draws the REAL Figma marks, not the lucide substitutes', () => {
    render(<LiveMapTools zonesAvailable poiAvailable />)
    for (const label of [
      'Search places on the map',
      'Traffic overlay',
      'Points of interest',
      'Zones',
    ]) {
      const svg = screen.getByRole('button', { name: label }).querySelector('svg')!
      expect(svg).not.toBeNull()
      // The map tools draw the canonical library's own marks (`traffic-lights`,
      // `marker-pin-05`, `zone`, …) — never a near-miss from some other set.
      expect(svg.getAttribute('class') ?? '').not.toContain('lucide')
    }
  })

  it('every tool PAINTS 40×40 on a real, measurable 44×44 target (E11 / UX-NOTES C18 — S1)', () => {
    render(<LiveMapTools zonesAvailable poiAvailable />)
    for (const label of [
      'Search places on the map',
      'Switch basemap style',
      'Traffic overlay',
      'Points of interest',
      'Zones',
      'Disable clustering',
    ]) {
      const button = screen.getByRole('button', { name: label })
      // The element itself is the 44×44 target — `getBoundingClientRect` now
      // reports it, where a `-inset-0.5` overlay could only be found by a hit
      // test. `-m-0.5` keeps 40px of layout, so the 52px pitch is unchanged.
      expect(button.className).toContain('size-11')
      expect(button.className).toContain('-m-0.5')
      // …and the PAINT is still the Figma 40×40 tile, on the `::before`.
      expect(button.className).toContain('before:inset-0.5')
      expect(button.className).toContain('before:rounded-md')
    }
  })
})
