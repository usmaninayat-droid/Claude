import { describe, it, expect, vi } from 'vitest'
import { fireEvent, render, screen } from '@testing-library/react'
import { configureAxe } from 'vitest-axe'
// Deep import: vitest-axe's `./matchers` entry re-exports type-only, which
// verbatimModuleSyntax rejects for value use (same pattern as a11y.axe.test.tsx).
import { toHaveNoViolations } from 'vitest-axe/dist/matchers.js'
import type { AxeMatchers } from 'vitest-axe'
import {
  MapIconButton,
  MapControlGroup,
  MapLayersControl,
  MapLayersSwitcher,
  MapSearchControl,
  MapZoomControl,
  findUnavailableTool,
} from './MapControls'

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

describe('MapIconButton', () => {
  it('renders with its accessible label and calls onClick when pressed', () => {
    const onClick = vi.fn()
    render(
      <MapIconButton label="Search the map" onClick={onClick}>
        <svg aria-hidden="true" />
      </MapIconButton>,
    )
    const button = screen.getByRole('button', { name: 'Search the map' })
    button.click()
    expect(onClick).toHaveBeenCalledTimes(1)
  })

  it('reflects the inactive state via aria-pressed and a muted tint by default', () => {
    render(
      <MapIconButton label="Layers">
        <svg aria-hidden="true" />
      </MapIconButton>,
    )
    const button = screen.getByRole('button', { name: 'Layers' })
    expect(button).toHaveAttribute('aria-pressed', 'false')
    // SPEC §2.3 / visual #41: control glyphs are grey-700, not grey-500.
    expect(button.className).toContain('text-gray-700')
  })

  it('reflects the active state via aria-pressed and a primary tint', () => {
    render(
      <MapIconButton label="Layers" active>
        <svg aria-hidden="true" />
      </MapIconButton>,
    )
    const button = screen.getByRole('button', { name: 'Layers' })
    expect(button).toHaveAttribute('aria-pressed', 'true')
    expect(button.className).toContain('text-primary')
  })

  it('has no axe violations', async () => {
    render(
      <MapIconButton label="Search the map">
        <svg aria-hidden="true" />
      </MapIconButton>,
    )
    const results = await axe(document.body)
    expect(results).toHaveNoViolations()
  })
})

describe('MapControlGroup', () => {
  it('renders children stacked vertically by default', () => {
    render(
      <MapControlGroup>
        <button type="button">A</button>
        <button type="button">B</button>
      </MapControlGroup>,
    )
    expect(screen.getByRole('button', { name: 'A' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'B' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'A' }).parentElement?.className).toContain('flex-col')
  })

  it('stacks horizontally when orientation is horizontal', () => {
    render(
      <MapControlGroup orientation="horizontal">
        <button type="button">A</button>
      </MapControlGroup>,
    )
    expect(screen.getByRole('button', { name: 'A' }).parentElement?.className).toContain('flex-row')
  })
})

describe('MapZoomControl', () => {
  it('calls onZoomIn and onZoomOut when their buttons are pressed', () => {
    const onZoomIn = vi.fn()
    const onZoomOut = vi.fn()
    render(<MapZoomControl onZoomIn={onZoomIn} onZoomOut={onZoomOut} />)
    screen.getByRole('button', { name: 'Zoom in' }).click()
    screen.getByRole('button', { name: 'Zoom out' }).click()
    expect(onZoomIn).toHaveBeenCalledTimes(1)
    expect(onZoomOut).toHaveBeenCalledTimes(1)
  })

  it('omits the fullscreen button when onFullscreen is not provided', () => {
    render(<MapZoomControl onZoomIn={() => {}} onZoomOut={() => {}} />)
    expect(screen.queryByRole('button', { name: 'Fullscreen' })).not.toBeInTheDocument()
  })

  it('renders and wires the fullscreen button when onFullscreen is provided', () => {
    const onFullscreen = vi.fn()
    render(<MapZoomControl onZoomIn={() => {}} onZoomOut={() => {}} onFullscreen={onFullscreen} />)
    screen.getByRole('button', { name: 'Fullscreen' }).click()
    expect(onFullscreen).toHaveBeenCalledTimes(1)
  })

  it('has no axe violations', async () => {
    render(<MapZoomControl onZoomIn={() => {}} onZoomOut={() => {}} onFullscreen={() => {}} />)
    const results = await axe(document.body)
    expect(results).toHaveNoViolations()
  })
})

/* ────────────────────────────────────────────────────────────────────────
 * Round-1 fixes: hit area (E11), unavailable tools (invoker decision 1),
 * the basemap style switcher (19b) and place search (invoker decision 2).
 * ──────────────────────────────────────────────────────────────────────── */

describe('MapIconButton — ≥44×44 hit area (WCAG 2.5.8, interaction E11)', () => {
  it('is a REAL 44×44 target that paints the Figma 40×40 tile on its ::before', () => {
    render(<MapIconButton label="Zones">glyph</MapIconButton>)
    const button = screen.getByRole('button', { name: 'Zones' })
    // The element IS the target: 44×44, measurable with
    // `getBoundingClientRect`. A `-inset-0.5` overlay also gave 44×44 of hit
    // area, but only a hit test could see it — the round-4 UX gate measured
    // the element, read 40×40, and filed it against a ≥44 MUST (S1).
    expect(button.className).toContain('size-11')
    // …while occupying 40px of layout, so the Figma 52px pitch is unchanged.
    expect(button.className).toContain('-m-0.5')
    // Everything painted rides the inert ::before at the old 40×40 box.
    expect(button.className).toContain('before:inset-0.5')
    expect(button.className).toContain('before:rounded-md')
    // `overflow-hidden` on the button would clip the painted tile.
    expect(button.className).not.toContain('overflow-hidden')
  })
})

describe('MapIconButton — unavailable tools (invoker decision 1)', () => {
  it('reports the caller message and does NOT toggle', () => {
    const onClick = vi.fn()
    const onUnavailable = vi.fn()
    render(
      <MapIconButton
        label="Traffic"
        onClick={onClick}
        unavailableMessage="Traffic data is not connected here."
        onUnavailable={onUnavailable}
      >
        glyph
      </MapIconButton>,
    )
    const button = screen.getByRole('button', { name: 'Traffic' })
    expect(button).toHaveAttribute('data-unavailable', 'true')
    fireEvent.click(button)
    expect(onUnavailable).toHaveBeenCalledWith('Traffic data is not connected here.')
    expect(onClick).not.toHaveBeenCalled()
  })

  it('findUnavailableTool matches by tool id', () => {
    const tools = [{ tool: 'traffic', message: 'nope' }]
    expect(findUnavailableTool(tools, 'traffic')?.message).toBe('nope')
    expect(findUnavailableTool(tools, 'zones')).toBeUndefined()
    expect(findUnavailableTool(undefined, 'traffic')).toBeUndefined()
  })
})

describe('MapLayersControl — basemap STYLE SWITCHER (SPEC 3.19, interaction 19b)', () => {
  const STYLES = [
    { id: 'muted', label: 'Muted' },
    { id: 'bright', label: 'Bright' },
    { id: 'satellite', label: 'Satellite' },
  ]

  it('paints the active style as a preview thumbnail, not a plain white tile', () => {
    render(<MapLayersControl styles={STYLES} activeStyleId="bright" />)
    const tile = screen.getByRole('button', { name: 'Map layers' })
    // Visual #23: the selected tile carries a mini basemap preview.
    expect(tile.querySelector('[aria-hidden="true"]')).toBeTruthy()
    expect(tile).toHaveAttribute('aria-pressed', 'true')
  })

  /*
   * WCAG 1.4.11 on the ONE tool whose glyph rides a thumbnail (round-2 UX
   * finding 1): white-on-preview measured 1.48:1 on the tinted half and
   * ~1.03:1 on the near-white half, so the lower two thirds of the glyph was
   * invisible. A fixed scrim between the preview and the glyph puts the floor
   * under EVERY caller-supplied thumbnail, not just the built-in one.
   */
  it('scrims the preview so the white glyph clears the 3:1 non-text floor', () => {
    render(<MapLayersControl styles={STYLES} activeStyleId="bright" />)
    const tile = screen.getByRole('button', { name: 'Map layers' })
    expect(tile).toHaveClass('text-white')
    const scrim = tile.querySelector('.bg-gray-900\\/50')
    expect(scrim).not.toBeNull()
    // …and it lives inside the preview layer, under the glyph, not over it.
    expect(scrim?.parentElement).toHaveClass('overflow-hidden')
    expect(scrim?.parentElement?.parentElement).toBe(tile)
  })

  /* round-3 UX #8: selection was signalled by the label's COLOUR alone. */
  it('marks the selected style with a tick, not colour alone (WCAG 1.4.1)', () => {
    render(<MapLayersControl styles={STYLES} activeStyleId="bright" />)
    fireEvent.click(screen.getByRole('button', { name: 'Map layers' }))
    const options = screen.getAllByRole('option')
    const selected = options.find((o) => o.getAttribute('aria-selected') === 'true')!
    const other = options.find((o) => o.getAttribute('aria-selected') !== 'true')!
    // Every row reserves the tick gutter (so picking one moves nothing) and
    // only the selected row fills it.
    expect(selected.lastElementChild!.querySelector('svg')).not.toBeNull()
    expect(other.lastElementChild!.querySelector('svg')).toBeNull()
  })

  it('opens an option list and reports the picked style (not a binary toggle)', () => {
    const onStyleChange = vi.fn()
    render(<MapLayersControl styles={STYLES} activeStyleId="muted" onStyleChange={onStyleChange} />)
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Map layers' }))
    expect(screen.getByRole('listbox', { name: 'Basemap style' })).toBeInTheDocument()
    expect(screen.getAllByRole('option')).toHaveLength(3)
    fireEvent.click(screen.getByRole('option', { name: /Satellite/ }))
    expect(onStyleChange).toHaveBeenCalledWith('satellite')
  })

  it('never opens the list when the tool is unavailable — it reports instead', () => {
    const onUnavailable = vi.fn()
    render(
      <MapLayersControl
        styles={STYLES}
        unavailableMessage="No basemaps configured."
        onUnavailable={onUnavailable}
      />,
    )
    fireEvent.click(screen.getByRole('button', { name: 'Map layers' }))
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument()
    expect(onUnavailable).toHaveBeenCalledWith('No basemaps configured.')
  })
})

describe('MapSearchControl — generic place search (invoker decision 2, SPEC 3.18)', () => {
  const PLACES = [
    { id: 'p1', name: 'North Depot', position: [55.1, 25.1] as [number, number], category: 'Depot' },
    { id: 'p2', name: 'South Yard', position: [55.2, 25.2] as [number, number] },
  ]

  it('expands into a combobox over the CALLER-supplied places and reports the pick', () => {
    const onPlaceSelect = vi.fn()
    render(<MapSearchControl places={PLACES} onPlaceSelect={onPlaceSelect} />)
    fireEvent.click(screen.getByRole('button', { name: 'Search map' }))
    const input = screen.getByRole('combobox', { name: 'Search map' })
    expect(screen.getAllByRole('option')).toHaveLength(2)

    fireEvent.change(input, { target: { value: 'south' } })
    const options = screen.getAllByRole('option')
    expect(options).toHaveLength(1)
    fireEvent.click(options[0])
    expect(onPlaceSelect).toHaveBeenCalledWith(PLACES[1])
  })

  it('matches on category too, and shows the empty label when nothing matches', () => {
    render(<MapSearchControl places={PLACES} />)
    fireEvent.click(screen.getByRole('button', { name: 'Search map' }))
    const input = screen.getByRole('combobox', { name: 'Search map' })
    fireEvent.change(input, { target: { value: 'depot' } })
    expect(screen.getAllByRole('option')).toHaveLength(1)
    fireEvent.change(input, { target: { value: 'zzz' } })
    expect(screen.queryAllByRole('option')).toHaveLength(0)
    expect(screen.getByText('No matching places')).toBeInTheDocument()
  })

  it('moves the active option with the arrow keys and picks it with Enter', () => {
    const onPlaceSelect = vi.fn()
    render(<MapSearchControl places={PLACES} onPlaceSelect={onPlaceSelect} />)
    fireEvent.click(screen.getByRole('button', { name: 'Search map' }))
    const input = screen.getByRole('combobox', { name: 'Search map' })
    fireEvent.keyDown(input, { key: 'ArrowDown' })
    expect(screen.getAllByRole('option')[1]).toHaveAttribute('aria-selected', 'true')
    fireEvent.keyDown(input, { key: 'Enter' })
    expect(onPlaceSelect).toHaveBeenCalledWith(PLACES[1])
  })

  it('renders NO gazetteer of its own — with no places the list is empty', () => {
    render(<MapSearchControl />)
    fireEvent.click(screen.getByRole('button', { name: 'Search map' }))
    expect(screen.queryAllByRole('option')).toHaveLength(0)
  })
})

const SWITCHER_STYLES = [
  { id: 'a', label: 'Streets' },
  { id: 'b', label: 'Dark' },
  { id: 'c', label: 'Satellite' },
]

describe('MapLayersSwitcher', () => {
  it('renders collapsed with the active style as an accessible-name control', () => {
    render(<MapLayersSwitcher styles={SWITCHER_STYLES} activeStyleId="b" />)
    expect(screen.getByRole('button', { name: 'Map layers' })).toBeInTheDocument()
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument()
  })

  it('expands into a row of options on hover, and collapses on mouse-leave', () => {
    render(<MapLayersSwitcher styles={SWITCHER_STYLES} activeStyleId="a" />)
    fireEvent.mouseEnter(screen.getByRole('button', { name: 'Map layers' }).parentElement!)
    const options = screen.getAllByRole('option')
    expect(options).toHaveLength(3)
    // The SELECTED card always renders LAST — the row is anchored
    // `insetInlineEnd: 0`, so the last child lands in the trigger slot
    // (map-layer-switcher spec point 1; matches the reference
    // `BasemapSwitcher` ordering).
    expect(options[options.length - 1]).toHaveAttribute('aria-selected', 'true')
    fireEvent.mouseLeave(options[0].closest('[data-slot="map-layers-switcher"]')!)
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument()
  })

  it('renders the selected style in the trigger slot (last), fanning the others to the start side in their original relative order', () => {
    render(<MapLayersSwitcher styles={SWITCHER_STYLES} activeStyleId="b" />)
    fireEvent.mouseEnter(screen.getByRole('button', { name: 'Map layers' }).parentElement!)
    const options = screen.getAllByRole('option')
    // SWITCHER_STYLES = [a, b, c]; active is 'b' → fanned = [a, c], trigger slot = b.
    expect(options.map((o) => o.textContent)).toEqual(['Streets', 'Satellite', 'Dark'])
    expect(options[2]).toHaveAttribute('aria-selected', 'true')
  })

  it('re-anchors the newly selected style into the trigger slot on the next expand', () => {
    const { container, rerender } = render(<MapLayersSwitcher styles={SWITCHER_STYLES} activeStyleId="a" />)
    const wrapper = container.querySelector('[data-slot="map-layers-switcher"]')!
    fireEvent.mouseEnter(wrapper)
    let options = screen.getAllByRole('option')
    expect(options[options.length - 1]).toHaveAttribute('aria-selected', 'true')
    expect(options[options.length - 1]).toHaveTextContent('Streets')

    // Simulate the caller applying the selection (fully controlled component
    // — the switcher owns no selection state of its own).
    fireEvent.mouseLeave(wrapper)
    rerender(<MapLayersSwitcher styles={SWITCHER_STYLES} activeStyleId="c" />)
    fireEvent.mouseEnter(wrapper)
    options = screen.getAllByRole('option')
    expect(options[options.length - 1]).toHaveAttribute('aria-selected', 'true')
    expect(options[options.length - 1]).toHaveTextContent('Satellite')
  })

  it('also expands on focus (keyboard reachability) and selects on click', () => {
    const onStyleChange = vi.fn()
    render(<MapLayersSwitcher styles={SWITCHER_STYLES} activeStyleId="a" onStyleChange={onStyleChange} />)
    fireEvent.focus(screen.getByRole('button', { name: 'Map layers' }))
    // active = 'a' → fanned order is [b, c, a]; index 1 is the 'c' card.
    const options = screen.getAllByRole('option')
    fireEvent.click(options[1])
    expect(onStyleChange).toHaveBeenCalledWith('c')
  })

  it('moves focus between cards with arrow keys, selects with Enter, and Escape collapses', () => {
    const onStyleChange = vi.fn()
    render(<MapLayersSwitcher styles={SWITCHER_STYLES} activeStyleId="a" onStyleChange={onStyleChange} />)
    const control = screen.getByRole('button', { name: 'Map layers' })
    fireEvent.keyDown(control, { key: 'ArrowRight' })
    expect(screen.getByRole('listbox')).toBeInTheDocument()
    // Fanned order for active='a' is [b, c, a]; focus starts on the
    // trigger-slot card (index 2, 'a'). ArrowLeft walks it back toward the
    // start of the row.
    expect(screen.getAllByRole('option')[2]).toHaveAttribute('tabindex', '0')
    fireEvent.keyDown(screen.getAllByRole('option')[2], { key: 'ArrowLeft' })
    expect(screen.getAllByRole('option')[1]).toHaveAttribute('tabindex', '0')
    fireEvent.keyDown(screen.getAllByRole('option')[1], { key: 'Enter' })
    expect(onStyleChange).toHaveBeenCalledWith('c')
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument()
    fireEvent.keyDown(screen.getByRole('button', { name: 'Map layers' }), { key: 'ArrowDown' })
    fireEvent.keyDown(screen.getAllByRole('option')[0], { key: 'Escape' })
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument()
  })

  it('shows the layer name via a Tooltip on hover of a card', async () => {
    render(<MapLayersSwitcher styles={SWITCHER_STYLES} activeStyleId="a" />)
    fireEvent.mouseEnter(screen.getByRole('button', { name: 'Map layers' }).parentElement!)
    // active = 'a' → fanned order is [b, c, a]; index 0 is the 'Dark' card.
    const options = screen.getAllByRole('option')
    fireEvent.mouseEnter(options[0])
    expect(await screen.findAllByText('Dark')).not.toHaveLength(0)
  })

  it('has no axe violations expanded', async () => {
    const { container } = render(<MapLayersSwitcher styles={SWITCHER_STYLES} activeStyleId="a" />)
    fireEvent.mouseEnter(screen.getByRole('button', { name: 'Map layers' }).parentElement!)
    const results = await axe(container)
    expect(results).toHaveNoViolations()
  })

  describe('collapsed trigger geometry (designer round 5: no primary halo, sibling-tile chrome)', () => {
    it('paints NO primary ring/border on the collapsed trigger', () => {
      const { container } = render(<MapLayersSwitcher styles={SWITCHER_STYLES} activeStyleId="a" />)
      const trigger = screen.getByRole('button', { name: 'Map layers' })
      expect(trigger.className).not.toMatch(/\bborder-2\b/)
      expect(trigger.className).not.toMatch(/ring-primary/)
      // The dedicated ring overlay is gone entirely.
      expect(container.querySelector('[data-slot="map-layers-switcher"] > span[aria-hidden="true"]')).toBeNull()
      expect(container.innerHTML).not.toMatch(/ring-primary/)
    })

    it('carries the same tile geometry as every other map control button', () => {
      render(<MapLayersSwitcher styles={SWITCHER_STYLES} activeStyleId="a" />)
      const trigger = screen.getByRole('button', { name: 'Map layers' })
      // 44×44 measurable target painting a 40×40 `rounded-md` tile with
      // Shadow/Map. Radius is 6px — Figma 19:23006's value AND the repo's
      // `--radius-md`; `rounded-lg` was Tailwind's untokened 8px.
      expect(trigger.className).toMatch(/\bsize-11\b/)
      expect(trigger.className).toMatch(/before:rounded-md/)
      expect(trigger.className).toMatch(/before:shadow-\[6px_10px_12px_0_rgba\(0,0,0,0\.05\)\]/)
    })

    it('keeps the primary border on the SELECTED card inside the expanded row', () => {
      const { container } = render(<MapLayersSwitcher styles={SWITCHER_STYLES} activeStyleId="a" />)
      fireEvent.mouseEnter(container.querySelector('[data-slot="map-layers-switcher"]')!)
      const selected = screen.getByRole('option', { selected: true })
      expect(selected.className).toMatch(/border-primary/)
    })
  })

  describe('layout shift (map-layer-switcher spec point 2: expanded row must not move siblings)', () => {
    it('keeps the wrapper a fixed 44×44 footprint whether collapsed or expanded', () => {
      const { container } = render(<MapLayersSwitcher styles={SWITCHER_STYLES} activeStyleId="a" />)
      const wrapper = container.querySelector('[data-slot="map-layers-switcher"]')!
      expect(wrapper.className).toMatch(/\bsize-11\b/)
      expect(wrapper.className).toMatch(/\bshrink-0\b/)
      fireEvent.mouseEnter(wrapper)
      // Expanding must not add/replace the wrapper's own sizing classes —
      // the row is an absolutely positioned overlay INSIDE this fixed box,
      // never a layout participant that could widen it.
      expect(wrapper.className).toMatch(/\bsize-11\b/)
      expect(wrapper.className).toMatch(/\bshrink-0\b/)
    })

    it('renders the expanded row as an absolutely positioned overlay anchored top-end, above other controls', () => {
      render(<MapLayersSwitcher styles={SWITCHER_STYLES} activeStyleId="a" />)
      fireEvent.mouseEnter(screen.getByRole('button', { name: 'Map layers' }).parentElement!)
      const row = screen.getByRole('listbox')
      expect(row.className).toMatch(/\babsolute\b/)
      expect(row.className).toMatch(/\bz-20\b/)
      expect(row.getAttribute('style')).toMatch(/inset-inline-end:\s*0/)
      expect(row.getAttribute('style')).toMatch(/inset-block-start:\s*0/)
    })
  })
})
