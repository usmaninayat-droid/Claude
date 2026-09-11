import { describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen } from '@testing-library/react'
import { MAP_TOOL_DRAWER_WIDTH, PoiDrawer, ZonesDrawer, statusDotColor } from './ZonesDrawer'
import type { LivePoiDatum, LiveZoneDatum } from '../../map/live-types'

/**
 * ZonesDrawer.test.tsx — the right-docked Zones/POI drawers (SPEC §2.8) and
 * their tag filters (SPEC 3.20/3.21), covering the round-1 findings:
 * visual #21 (floating card over the tool stack), UX finding 12 (13px strip
 * of live map beyond the drawer), visual #45 (blue dot + wrapping POI names)
 * and UX-15 (search/filter must never clear checks).
 */
const ZONES: LiveZoneDatum[] = [
  { id: 'Z-1', label: 'Z-1', parent: 'Lot A', color: '#F79009', points: [], tags: ['depot', 'service-area'] },
  { id: 'Z-2', label: 'Z-2', parent: 'Lot B', color: '#12B76A', points: [], tags: ['customer-site'] },
  // A zone whose data colour is the brand blue — the dot must NOT be blue.
  { id: 'Z-3', label: 'Z-3', parent: 'Lot A', color: '#0072D6', points: [], tags: ['restricted'] },
]

const POIS: LivePoiDatum[] = [
  {
    id: 'poi-1',
    name: 'A point of interest with a name long enough to wrap onto three lines in a 347px drawer',
    position: [55.1, 25.1],
    tags: ['fuel'],
  },
  { id: 'poi-2', name: 'Second point', position: [55.2, 25.2], tags: ['workshop'] },
]

describe('ZonesDrawer — docking (visual #21 / UX finding 12)', () => {
  it('docks full-height and FLUSH to the pane inline-end edge at the Figma width', () => {
    render(<ZonesDrawer open onClose={vi.fn()} zones={ZONES} checkedIds={[]} onCheckedIdsChange={vi.fn()} />)
    const drawer = screen.getByRole('dialog', { name: 'Zones' })
    expect(drawer.className).toContain('inset-y-0')
    // No floating gap: `insetInlineEnd: 0`, not the old `end-3` card.
    expect(drawer.style.getPropertyValue('inset-inline-end')).toBe('0')
    expect(drawer.style.width).toBe(`${MAP_TOOL_DRAWER_WIDTH}px`)
  })

  it('paints no title header (Figma 495:34206) but keeps a keyboard-reachable close', () => {
    const onClose = vi.fn()
    render(<ZonesDrawer open onClose={onClose} zones={ZONES} checkedIds={[]} onCheckedIdsChange={vi.fn()} />)
    expect(screen.queryByRole('heading', { name: 'Zones' })).not.toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Close Zones' }))
    expect(onClose).toHaveBeenCalled()
  })
})

describe('ZonesDrawer — tag filters (SPEC 3.20)', () => {
  it('the square tag button reveals the row tags and filters by them', () => {
    render(<ZonesDrawer open onClose={vi.fn()} zones={ZONES} checkedIds={[]} onCheckedIdsChange={vi.fn()} />)
    expect(screen.queryByRole('button', { name: 'depot' })).not.toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Filter Zones by tag' }))
    fireEvent.click(screen.getByRole('button', { name: 'depot' }))
    expect(screen.getByText('Z-1')).toBeInTheDocument()
    expect(screen.queryByText('Z-2')).not.toBeInTheDocument()
    expect(screen.queryByText('Z-3')).not.toBeInTheDocument()
  })

  it('composes with the search box and never clears existing checkmarks (UX-15)', () => {
    const onCheckedIdsChange = vi.fn()
    render(
      <ZonesDrawer open onClose={vi.fn()} zones={ZONES} checkedIds={['Z-2']} onCheckedIdsChange={onCheckedIdsChange} />,
    )
    fireEvent.click(screen.getByRole('button', { name: 'Filter Zones by tag' }))
    fireEvent.click(screen.getByRole('button', { name: 'service-area' }))
    fireEvent.change(screen.getByLabelText('Search Zones'), { target: { value: 'Lot A' } })
    expect(screen.getByText('Z-1')).toBeInTheDocument()
    expect(screen.queryByText('Z-2')).not.toBeInTheDocument()
    // Filtering is pure view state — no check was written back.
    expect(onCheckedIdsChange).not.toHaveBeenCalled()
  })

  it('deselecting the last tag restores every row', () => {
    render(<ZonesDrawer open onClose={vi.fn()} zones={ZONES} checkedIds={[]} onCheckedIdsChange={vi.fn()} />)
    fireEvent.click(screen.getByRole('button', { name: 'Filter Zones by tag' }))
    fireEvent.click(screen.getByRole('button', { name: 'restricted' }))
    expect(screen.queryByText('Z-1')).not.toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'restricted' }))
    expect(screen.getByText('Z-1')).toBeInTheDocument()
  })
})

describe('ZonesDrawer — row anatomy (visual #45)', () => {
  it('snaps every colour dot onto the green/orange/red triad — never the brand blue', () => {
    render(<ZonesDrawer open onClose={vi.fn()} zones={ZONES} checkedIds={[]} onCheckedIdsChange={vi.fn()} />)
    const dots = Array.from(document.querySelectorAll<HTMLElement>('[data-slot="zone-color-dot"]'))
    expect(dots).toHaveLength(3)
    for (const dot of dots) {
      expect(['var(--color-success)', 'var(--color-warning)', 'var(--color-destructive)']).toContain(
        dot.style.backgroundColor || dot.getAttribute('style')?.replace(/^background-color:\s*/, '').replace(/;$/, ''),
      )
    }
  })

  it('maps hues to the triad and falls back deterministically for off-triad colours', () => {
    expect(statusDotColor('a', '#12B76A')).toBe('var(--color-success)')
    expect(statusDotColor('a', '#F79009')).toBe('var(--color-warning)')
    expect(statusDotColor('a', '#F04438')).toBe('var(--color-destructive)')
    // Brand blue is off-triad — stable, but never blue.
    expect(statusDotColor('Z-3100', '#0072D6')).toBe(statusDotColor('Z-3100', '#0072D6'))
    expect(statusDotColor('Z-3100', '#0072D6')).not.toContain('primary')
  })

  it('keeps POI names on a SINGLE line', () => {
    render(<PoiDrawer open onClose={vi.fn()} pois={POIS} checkedIds={[]} onCheckedIdsChange={vi.fn()} />)
    const name = screen.getByTitle(POIS[0]!.name)
    expect(name.className).toContain('truncate')
    expect(name.closest('tr')!.className).toContain('h-12')
  })
})

describe('PoiDrawer — tag filters (SPEC 3.21)', () => {
  it('filters rows by POI tag without touching checks', () => {
    const onCheckedIdsChange = vi.fn()
    render(<PoiDrawer open onClose={vi.fn()} pois={POIS} checkedIds={['poi-1']} onCheckedIdsChange={onCheckedIdsChange} />)
    fireEvent.click(screen.getByRole('button', { name: 'Filter POI by tag' }))
    fireEvent.click(screen.getByRole('button', { name: 'workshop' }))
    expect(screen.getByText('Second point')).toBeInTheDocument()
    expect(screen.queryByTitle(POIS[0]!.name)).not.toBeInTheDocument()
    expect(onCheckedIdsChange).not.toHaveBeenCalled()
  })

  it('checking a row still reports exactly that id (UX-15 geometry add/remove)', () => {
    const onCheckedIdsChange = vi.fn()
    render(<PoiDrawer open onClose={vi.fn()} pois={POIS} checkedIds={[]} onCheckedIdsChange={onCheckedIdsChange} />)
    fireEvent.click(screen.getByRole('checkbox', { name: 'Show Second point on map' }))
    expect(onCheckedIdsChange).toHaveBeenCalledWith(['poi-2'])
  })
})

/**
 * Header select-all (SPEC §3.20 / round-2 interaction 20b).
 *
 * The observed defect was NOT the handler: from the all-unchecked state a real
 * mouse press did nothing, while a dispatched `click` worked and a press with
 * the header already `indeterminate` worked. The drawer focuses its
 * (`sr-only`) close button on open; that button used `focus:not-sr-only`,
 * which turns it from `position:absolute` into a STATIC ~55px box the moment
 * it takes focus. The first press inside the drawer blurred it, the body
 * snapped 55px up between `mousedown` and `mouseup`, and the browser
 * dispatched `click` on the common ancestor instead of the checkbox.
 * So the regression test is a LAYOUT one: revealing the close button must
 * never move the rows.
 */
describe('ZonesDrawer — header select-all from the all-unchecked state (interaction 20b)', () => {
  it('checks every listed zone on the first activation, with nothing checked to begin with', () => {
    const onChange = vi.fn()
    render(<ZonesDrawer open onClose={vi.fn()} zones={ZONES} checkedIds={[]} onCheckedIdsChange={onChange} />)
    const selectAll = screen.getByRole('checkbox', { name: 'Show all zones on map' })
    expect(selectAll).toHaveAttribute('data-state', 'unchecked')
    fireEvent.click(selectAll)
    expect(onChange).toHaveBeenCalledWith(['Z-1', 'Z-2', 'Z-3'])
  })

  it('checks every listed POI on the first activation too', () => {
    const onChange = vi.fn()
    render(<PoiDrawer open onClose={vi.fn()} pois={POIS} checkedIds={[]} onCheckedIdsChange={onChange} />)
    fireEvent.click(screen.getByRole('checkbox', { name: 'Show all points of interest on map' }))
    expect(onChange).toHaveBeenCalledWith(['poi-1', 'poi-2'])
  })

  it('shows a PERMANENTLY visible close button, out of flow, that reflows nothing (F5)', () => {
    render(<ZonesDrawer open onClose={vi.fn()} zones={ZONES} checkedIds={[]} onCheckedIdsChange={vi.fn()} />)
    const close = screen.getByRole('button', { name: 'Close Zones' })
    // Round 4 had this control `sr-only` until focus, so a mouse user had no
    // visible way out at all (F5). It is visible in every state now…
    expect(close.className).not.toContain('sr-only')
    // …and still ABSOLUTE inside the reserved strip (inline geometry: a
    // consuming app's Tailwind build may not emit the arbitrary utilities
    // this would otherwise need), so it moves no row and covers no input —
    // the round-3 visual #2 regression cannot come back.
    expect(close.style.position).toBe('absolute')
    fireEvent.focus(close)
    expect(close.style.position).toBe('absolute')
    fireEvent.blur(close)
    expect(close.className).not.toContain('sr-only')
  })

  /* round-3 visual #2 — the close control landed ON TOP of the search input. */
  it('opens with focus on the SEARCH INPUT, not on the close control', () => {
    render(<ZonesDrawer open onClose={vi.fn()} zones={ZONES} checkedIds={[]} onCheckedIdsChange={vi.fn()} />)
    expect(document.activeElement).toBe(screen.getByRole('textbox', { name: 'Search Zones' }))
  })

  it('parks the close control in a PERMANENTLY reserved strip, last in DOM order', () => {
    const { container } = render(
      <ZonesDrawer open onClose={vi.fn()} zones={ZONES} checkedIds={[]} onCheckedIdsChange={vi.fn()} />,
    )
    const panel = container.querySelector('[data-slot="map-tool-drawer"]')!
    const strip = container.querySelector('[data-slot="map-tool-drawer-exit"]') as HTMLElement
    // The strip exists in EVERY state (so focusing reflows nothing) and is the
    // drawer's last child (so the tab order matches the visual order).
    expect(strip).toBeInTheDocument()
    expect(panel.lastElementChild).toBe(strip)
    expect(strip.style.height).toBe('40px')
    expect(strip.contains(screen.getByRole('button', { name: 'Close Zones' }))).toBe(true)
  })

  it('leads every POI row with a tinted tile rather than a bare colour dot (visual #13)', () => {
    const { container } = render(
      <PoiDrawer open onClose={vi.fn()} pois={POIS} checkedIds={[]} onCheckedIdsChange={vi.fn()} />,
    )
    const tiles = container.querySelectorAll('[data-slot="poi-tile"]')
    expect(tiles).toHaveLength(POIS.length)
    expect(container.querySelector('[data-slot="poi-color-dot"]')).toBeNull()
    expect((tiles[0] as HTMLElement).style.borderRadius).toBe('6px')
    // A tile is a GLYPH tile, not a swatch.
    expect(tiles[0].querySelector('svg')).not.toBeNull()
  })

  it('leads every zone PARENT cell with a lead icon (visual #14)', () => {
    const { container } = render(
      <ZonesDrawer open onClose={vi.fn()} zones={ZONES} checkedIds={[]} onCheckedIdsChange={vi.fn()} />,
    )
    expect(container.querySelectorAll('[data-slot="zone-parent-icon"]')).toHaveLength(ZONES.length)
  })
})
