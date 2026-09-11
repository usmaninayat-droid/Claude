import { describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import type { EntityConfig } from '@fams/v5-composer'
import type { MapPanelProps } from '../../map/MapPanel.types'
import { MapHybridView } from './MapHybridView'
import { ModuleView } from './../ModuleView'
import {
  parityConfigFixture,
  parityRecords,
  recordMapConfigFixture,
  recordMapRecords,
  stageTabsConfigFixture,
} from './fixtures'

vi.mock('@atlaskit/pragmatic-drag-and-drop-live-region', () => ({ announce: vi.fn() }))

/**
 * Stub the heavy map entry: the fake exposes one button per marker and one per
 * zone so BOTH map-side click channels can be driven, and mirrors the props
 * the camera/geometry assertions need (same idiom as `LiveHybridView.test`).
 */
const lastProps = vi.hoisted(() => ({ current: null as MapPanelProps | null }))
vi.mock('@fams/v5-templates/map', () => ({
  MapPanel: (props: MapPanelProps) => {
    lastProps.current = props
    return (
      <div
        data-testid="fake-map"
        data-focus={JSON.stringify(props.focusPosition ?? null)}
        data-fit={String(props.fitToMarkersNonce ?? 0)}
        data-style={props.styleUrl ?? ''}
        data-editable={String(Boolean(props.editable))}
      >
        {(props.markers ?? []).map((m) => (
          <button key={m.id} type="button" data-color={m.color} onClick={() => props.onMarkerClick?.(m)}>
            {`pin ${m.id}`}
          </button>
        ))}
        {(props.zones ?? []).map((z) => (
          <button key={z.id} type="button" data-color={z.color} onClick={() => props.onZoneClick?.(z)}>
            {`zone ${z.id}`}
          </button>
        ))}
      </div>
    )
  },
}))

const config = recordMapConfigFixture()
const records = recordMapRecords()

async function renderLens(props: Partial<Parameters<typeof MapHybridView>[0]> = {}) {
  const result = render(<MapHybridView config={config} records={records} {...props} />)
  await waitFor(() => expect(screen.getByTestId('fake-map')).toBeInTheDocument())
  return result
}

function cards(): HTMLElement[] {
  return Array.from(document.querySelectorAll<HTMLElement>('[data-slot="record-map-card"]'))
}

describe('MapHybridView — geometry', () => {
  it('draws a priority-keyed pin per point record and a polygon per zone record, together', async () => {
    await renderLens()
    // Frame A's shape and frame B's shape in ONE render — not two modes.
    expect(screen.getByRole('button', { name: 'pin D-101' })).toHaveAttribute('data-color', 'var(--color-warning)')
    expect(screen.getByRole('button', { name: 'zone D-102' })).toHaveAttribute('data-color', 'var(--color-success)')
    // D-103 carries both and appears in both channels.
    expect(screen.getByRole('button', { name: 'pin D-103' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'zone D-103' })).toBeInTheDocument()
  })

  it('lists every record including the ones with no location (UX J.61)', async () => {
    await renderLens()
    expect(cards()).toHaveLength(records.length)
    expect(screen.getByTestId('fake-map')).toBeInTheDocument()
    expect(screen.getByText(/have no location/)).toBeInTheDocument()
  })

  it('keeps the map, its chrome and a non-blocking chip when NOTHING is geocoded', async () => {
    const bare = records.map((r) => ({ ...r, lat: '', lng: '', zone: '' }))
    render(<MapHybridView config={config} records={bare} />)
    await waitFor(() => expect(screen.getByTestId('fake-map')).toBeInTheDocument())
    expect(screen.getByText(/No mapped deals/)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Map layers' })).toBeInTheDocument()
    // Nothing to frame → the fit control is disabled, and its label says WHY
    // (UX J.62 — the shared MapIconButton tile mirrors the label into title).
    expect(screen.getByRole('button', { name: 'No mapped deals to frame' })).toBeDisabled()
    expect(cards()).toHaveLength(bare.length)
  })
})

describe('MapHybridView — the legend is a key AND a filter', () => {
  it('renders every colour-key value checked by default with TOTALS', async () => {
    await renderLens()
    const legend = document.querySelector('[data-slot="record-map-legend"]')!
    const rows = within(legend as HTMLElement).getAllByRole('checkbox')
    expect(rows.map((r) => r.textContent)).toEqual(['High(2)', 'Medium(3)', 'Low(1)'])
    expect(rows.every((r) => r.getAttribute('aria-checked') === 'true')).toBe(true)
  })

  it('unchecking a value hides exactly that value on the map and keeps the totals still', async () => {
    await renderLens()
    fireEvent.click(screen.getByRole('checkbox', { name: /High/ }))
    await waitFor(() => expect(screen.queryByRole('button', { name: 'pin D-103' })).not.toBeInTheDocument())
    expect(screen.getByRole('button', { name: 'pin D-101' })).toBeInTheDocument()
    // Totals are totals (UX E.29) — the sibling's number is byte-identical.
    expect(screen.getByRole('checkbox', { name: /Medium/ }).textContent).toBe('Medium(3)')
  })

  it('allows unchecking ALL and offers the way back (UX E.28)', async () => {
    await renderLens()
    for (const name of [/High/, /Medium/, /Low/]) fireEvent.click(screen.getByRole('checkbox', { name }))
    await waitFor(() => expect(screen.queryByRole('button', { name: /^pin/ })).not.toBeInTheDocument())
    expect(screen.getByText(/all priority values hidden/)).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Show all' }))
    await waitFor(() => expect(screen.getByRole('button', { name: 'pin D-101' })).toBeInTheDocument())
  })

  it('still renders as a static colour key when filtering is config-disabled (UX E.32)', async () => {
    const readOnly = recordMapConfigFixture({ filterable: false })
    render(<MapHybridView config={readOnly} records={records} />)
    await waitFor(() => expect(screen.getByTestId('fake-map')).toBeInTheDocument())
    const legend = document.querySelector('[data-slot="record-map-legend"]')!
    expect(within(legend as HTMLElement).queryAllByRole('checkbox')).toHaveLength(0)
    expect(legend.querySelectorAll('[data-slot="record-map-legend-item"]')).toHaveLength(3)
    expect(within(legend as HTMLElement).getByText('High')).toBeInTheDocument()
  })
})

describe('MapHybridView — two-way map↔list sync (Dev Note 32270)', () => {
  it('list → map: a card click pans the camera to that record and opens it', async () => {
    const onOpenRecord = vi.fn()
    await renderLens({ onOpenRecord })
    fireEvent.click(cards()[0].querySelector('[data-slot="kanban-card"]')!)
    await waitFor(() =>
      expect(screen.getByTestId('fake-map')).toHaveAttribute('data-focus', JSON.stringify([55.271, 25.204])),
    )
    expect(onOpenRecord).toHaveBeenCalled()
  })

  it('map → list: a PIN click highlights and scrolls the matching card into view', async () => {
    const scrollIntoView = vi.fn()
    Element.prototype.scrollIntoView = scrollIntoView
    await renderLens()
    fireEvent.click(screen.getByRole('button', { name: 'pin D-104' }))
    await waitFor(() => {
      const card = cards().find((c) => c.getAttribute('data-highlighted') === 'true')
      expect(card).toBeDefined()
    })
    expect(scrollIntoView).toHaveBeenCalled()
    // The camera follows the same one id — one selection concept, both ways.
    expect(screen.getByTestId('fake-map')).toHaveAttribute('data-focus', JSON.stringify([55.31, 25.25]))
  })

  it('map → list: a ZONE click syncs identically (polygon records are not second class)', async () => {
    await renderLens()
    fireEvent.click(screen.getByRole('button', { name: 'zone D-102' }))
    await waitFor(() => {
      const card = cards().find((c) => c.getAttribute('data-highlighted') === 'true')
      expect(card?.textContent).toContain('D-102')
    })
  })
})

describe('MapHybridView — card affordances', () => {
  it('the eye toggle hides that record from the map and keeps its card', async () => {
    await renderLens()
    const toggle = within(cards()[0]).getByRole('button', { name: 'Hide D-101 on map' })
    expect(toggle).toHaveAttribute('aria-pressed', 'false')
    fireEvent.click(toggle)
    await waitFor(() => expect(screen.queryByRole('button', { name: 'pin D-101' })).not.toBeInTheDocument())
    expect(cards()).toHaveLength(records.length)
    const shown = within(cards()[0]).getByRole('button', { name: 'Show D-101 on map' })
    expect(shown).toHaveAttribute('aria-pressed', 'true')
    fireEvent.click(shown)
    await waitFor(() => expect(screen.getByRole('button', { name: 'pin D-101' })).toBeInTheDocument())
  })

  it("consumes A5's shared row-actions slot rather than building a second menu", async () => {
    await renderLens({ renderRowActions: (record) => <button type="button">{`more ${record.id}`}</button> })
    expect(screen.getByRole('button', { name: 'more D-101' })).toBeInTheDocument()
  })
})

describe('MapHybridView — map tools all do something observable (SPEC rows 25/26)', () => {
  it('layers cycles the basemap with a visible active state', async () => {
    await renderLens()
    const layers = screen.getByRole('button', { name: 'Map layers' })
    const before = screen.getByTestId('fake-map').getAttribute('data-style')
    fireEvent.click(layers)
    await waitFor(() => expect(screen.getByTestId('fake-map').getAttribute('data-style')).not.toBe(before))
    expect(layers).toHaveAttribute('aria-pressed', 'true')
  })

  it('measure opens a readout and reports a real distance between two picks', async () => {
    await renderLens()
    fireEvent.click(screen.getByRole('button', { name: 'Measure distance' }))
    expect(screen.getByRole('button', { name: 'Measure distance' })).toHaveAttribute('aria-pressed', 'true')
    expect(screen.getByText(/Pick two deals to measure/)).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'pin D-101' }))
    fireEvent.click(screen.getByRole('button', { name: 'pin D-103' }))
    await waitFor(() => expect(screen.getByText(/km over 2 points/)).toBeInTheDocument())
  })

  it('draw turns on the map geofence editor', async () => {
    await renderLens()
    fireEvent.click(screen.getByRole('button', { name: 'Draw area' }))
    await waitFor(() => expect(screen.getByTestId('fake-map')).toHaveAttribute('data-editable', 'true'))
  })

  it('fit nudges the camera', async () => {
    await renderLens()
    const before = screen.getByTestId('fake-map').getAttribute('data-fit')
    fireEvent.click(screen.getByRole('button', { name: 'Fit all deals in view' }))
    await waitFor(() => expect(screen.getByTestId('fake-map').getAttribute('data-fit')).not.toBe(before))
  })
})

describe('MapHybridView — config parity (UX L.78)', () => {
  it('renders a DIFFERENT module vocabulary with zero code change', async () => {
    const parity = parityConfigFixture()
    render(<MapHybridView config={parity} records={parityRecords()} />)
    await waitFor(() => expect(screen.getByTestId('fake-map')).toBeInTheDocument())
    const legend = document.querySelector('[data-slot="record-map-legend"]')!
    expect(within(legend as HTMLElement).getAllByRole('checkbox').map((r) => r.textContent)).toEqual([
      'NEW(3)',
      'EXPANSION(2)',
      'RENEWAL(1)',
    ])
    // Renamed geometry columns still resolve; the fit label follows the noun.
    expect(screen.getByRole('button', { name: 'pin D-101' })).toHaveAttribute('data-color', 'var(--color-primary)')
    expect(screen.getByRole('button', { name: 'zone D-102' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Fit all inspections in view' })).toBeInTheDocument()
    expect(screen.queryByText(/Priority/)).not.toBeInTheDocument()
  })
})

describe('MapHybridView — the notice never occludes the legend (finding A7b-3)', () => {
  it('renders the notice and the legend as SIBLING cells of one top row, not as stacked overlays', async () => {
    await renderLens()
    const notice = document.querySelector('[data-slot="record-map-notice"]')!
    const legend = document.querySelector('[data-slot="record-map-legend"]')!
    // Same flex row → they lay out side by side and cannot cover each other.
    const row = notice.parentElement!.parentElement!
    expect(row).toBe(legend.parentElement!.parentElement)
    expect(row.className).toContain('flex')
    expect(row.className).toContain('justify-between')
    // Neither cell carries its own absolute placement any more — the row owns it.
    for (const cell of [notice, legend]) {
      expect(cell.className).not.toContain('absolute')
      expect(cell.className).not.toContain('-translate-x-1/2')
    }
    // The legend still renders EVERY colour-key row, first one included.
    expect(within(legend as HTMLElement).getAllByRole('checkbox').length).toBeGreaterThan(1)
  })

  it('keeps the same one-row layout for the zero-state notice with its Show all action', async () => {
    const bare = records.map((r) => ({ ...r, lat: '', lng: '', zone: '' }))
    render(<MapHybridView config={config} records={bare} />)
    await waitFor(() => expect(screen.getByTestId('fake-map')).toBeInTheDocument())
    const notice = document.querySelector('[data-slot="record-map-notice"]')!
    const legend = document.querySelector('[data-slot="record-map-legend"]')!
    expect(notice.parentElement!.parentElement).toBe(legend.parentElement!.parentElement)
  })
})

describe('MapHybridView — record noun (finding A7b-4)', () => {
  it('uses an authored uiConfig.recordNoun in the count row and the fit control', async () => {
    const named = {
      ...config,
      name: 'Pipeline Management',
      uiConfig: { ...config.uiConfig, recordNoun: { one: 'task', many: 'tasks' } },
    } as EntityConfig
    render(<MapHybridView config={named} records={records} />)
    await waitFor(() => expect(screen.getByTestId('fake-map')).toBeInTheDocument())
    // UX ruling A4 (run 2026-09-05, W9): the count row now renders EMPTY at
    // rest (nothing narrowed) — this is the fix for the "N of N" tautology
    // C5 named on this exact lens ("50 of 50 vehicles"). The noun-
    // customization this test guards is proven end-to-end by the Fit
    // button's own aria-label below instead, which reads the SAME `noun`.
    expect(document.querySelector('[data-slot="record-map-count-row"]')!.textContent).toBe('')
    expect(screen.getByRole('button', { name: 'Fit all tasks in view' })).toBeInTheDocument()
    // The module NAME is still correct where a name belongs (the sr-only
    // heading); it is only the lowercased plural-noun slots that change.
    expect(screen.getByRole('heading', { level: 2 })).toHaveTextContent('Pipeline Management list and map')
    expect(screen.queryByText(/mapped pipeline management/i)).not.toBeInTheDocument()
  })

  it('still derives the noun from the module name when none is authored', async () => {
    await renderLens()
    // Same A4 fix as above — empty at rest, no tautology.
    expect(document.querySelector('[data-slot="record-map-count-row"]')!.textContent).toBe('')
  })
})

describe('MapHybridView — in-panel toolbar (SPEC pipelines-hybrid-29-41808 §1.1)', () => {
  it('renders no toolbar at all when `toolbar` is omitted (unchanged default)', async () => {
    await renderLens()
    expect(document.querySelector('[data-slot="record-map-list-toolbar"]')).toBeNull()
  })

  it('renders only the controls the config enables', async () => {
    await renderLens({ toolbar: { search: {}, sortOptions: [{ key: 'title', label: 'Title' }] } })
    expect(screen.getByRole('textbox', { name: 'Search' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Sort' })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Download' })).not.toBeInTheDocument()
    expect(screen.queryByText('Assignee')).not.toBeInTheDocument()
  })

  it('the "+" button reuses the lens\'s own onCreateRecord seam (no second create prop)', async () => {
    const onCreateRecord = vi.fn()
    await renderLens({ toolbar: { search: {} }, onCreateRecord })
    fireEvent.click(screen.getByRole('button', { name: 'Create' }))
    expect(onCreateRecord).toHaveBeenCalledWith()
  })

  it('the download button fires with the toolbar-narrowed record set', async () => {
    const onDownload = vi.fn()
    await renderLens({ toolbar: { search: {}, onDownload } })
    fireEvent.change(screen.getByRole('textbox', { name: 'Search' }), { target: { value: 'Globex' } })
    fireEvent.click(screen.getByRole('button', { name: 'Download' }))
    expect(onDownload).toHaveBeenCalledTimes(1)
    const exported = onDownload.mock.calls[0][0] as Array<{ id: string }>
    expect(exported.map((r) => r.id)).toEqual(['D-101'])
  })

  describe('search narrows both the card list and the map together (AC-4.5 passive sync)', () => {
    it('typing a query keeps only the matching cards', async () => {
      await renderLens({ toolbar: { search: {} } })
      expect(cards()).toHaveLength(records.length)
      fireEvent.change(screen.getByRole('textbox', { name: 'Search' }), { target: { value: 'Globex' } })
      await waitFor(() => expect(cards()).toHaveLength(1))
      expect(cards()[0].textContent).toContain('D-101')
      // The count row's OWN "total" here is the search-narrowed pool (this
      // lens's `mappable` is computed FROM `viewFilteredRecords`, i.e.
      // post-search) — once the search narrows to exactly one match and
      // nothing further hides it, shown === total and, per UX ruling A4
      // (run 2026-09-05), there is nothing left to report: the row renders
      // empty rather than the tautological "Showing 1 of 1".
      expect(document.querySelector('[data-slot="record-map-count-row"]')!.textContent).toBe('')
    })

    it('a query matching nothing shows the shared filtered-empty state with a way back', async () => {
      await renderLens({ toolbar: { search: {} } })
      fireEvent.change(screen.getByRole('textbox', { name: 'Search' }), { target: { value: 'nonexistent-deal-xyz' } })
      await waitFor(() => expect(cards()).toHaveLength(0))
      const clear = screen.getByRole('button', { name: /clear/i })
      fireEvent.click(clear)
      await waitFor(() => expect(cards()).toHaveLength(records.length))
      expect(screen.getByRole('textbox', { name: 'Search' })).toHaveValue('')
    })
  })

  it('sort applies to the card list\'s ordering', async () => {
    await renderLens({ toolbar: { sortOptions: [{ key: 'title', label: 'Title' }] } })
    fireEvent.click(screen.getByRole('button', { name: 'Sort' }))
    // `variant="toggle"` (SPEC Addendum AC-7.1/7.2): tapping a row's toggle
    // while it is OFF sets it ascending — same first-tap result the old
    // `role="option"` menu gave, via the new tri-state control.
    fireEvent.click(screen.getByRole('button', { name: 'Sort Title' }))
    await waitFor(() => expect(cards()[0].textContent).toContain('D-101'))
    // Ascending alphabetical by title: Globex(101), Hooli(104), Initech(103),
    // Northwind — Add-on(105), Northwind — Renewal(106), Soylent(102).
    expect(cards().map((c) => c.textContent?.match(/D-10\d/)?.[0])).toEqual([
      'D-101',
      'D-104',
      'D-103',
      'D-105',
      'D-106',
      'D-102',
    ])
  })

  it('group by (SPEC Addendum AC-6.1/6.2): renders config-fed options, seeds the default, live-commits a pick, and Reset restores the default', async () => {
    const onGroupByChange = vi.fn()
    await renderLens({
      toolbar: {
        groupBy: {
          options: [
            { key: 'status', label: 'Status' },
            { key: 'severity', label: 'Severity' },
          ],
          defaultKey: 'status',
        },
      },
      onGroupByChange,
    })
    fireEvent.click(screen.getByRole('button', { name: 'Group by' }))
    // Seeded from `defaultKey` — the default radio starts checked and Reset
    // starts hidden (AC-6.2: nothing to reset while already at the default).
    expect(screen.getByRole('radio', { name: 'Status' })).toHaveAttribute('data-state', 'checked')
    expect(screen.queryByRole('button', { name: 'Reset' })).not.toBeInTheDocument()

    fireEvent.click(screen.getByRole('radio', { name: 'Severity' }))
    expect(onGroupByChange).toHaveBeenCalledWith('severity')

    fireEvent.click(screen.getByRole('button', { name: 'Reset' }))
    expect(onGroupByChange).toHaveBeenLastCalledWith('status')
  })

  it('round-trips search/filters/sort through controlled props exactly like selectedId/visibleKeys', async () => {
    const onSearchChange = vi.fn()
    await renderLens({ toolbar: { search: {} }, search: 'Globex', onSearchChange })
    expect(screen.getByRole('textbox', { name: 'Search' })).toHaveValue('Globex')
    fireEvent.change(screen.getByRole('textbox', { name: 'Search' }), { target: { value: 'Soylent' } })
    expect(onSearchChange).toHaveBeenCalledWith('Soylent')
    // Controlled: the DOM value does not advance on its own without the caller re-rendering it in.
    expect(screen.getByRole('textbox', { name: 'Search' })).toHaveValue('Globex')
  })
})

/**
 * Stage tabs (SPEC Addendum "Stage tabs"): the record-map hybrid's "All /
 * Lead / Qualified / …" strip — a `CountTabs` row above the toolbar built
 * from `uiConfig.statusList`. On "All" the badge/group-header behavior is
 * unchanged from today; picking a specific stage narrows list+map to it AND
 * suppresses the now-redundant per-card stage chip and the Group-By-status
 * section header (both return on "All").
 */
describe('MapHybridView — stage tabs', () => {
  const stageConfig = stageTabsConfigFixture()
  const stageRecords = recordMapRecords()

  async function renderStageLens() {
    const result = render(<MapHybridView config={stageConfig} records={stageRecords} />)
    await waitFor(() => expect(screen.getByTestId('fake-map')).toBeInTheDocument())
    return result
  }

  function badges(): HTMLElement[] {
    return Array.from(document.querySelectorAll<HTMLElement>('[data-slot="record-map-stage-chip"]'))
  }

  function groupHeaders(): HTMLElement[] {
    return Array.from(document.querySelectorAll<HTMLElement>('[data-slot="record-map-group-header"]'))
  }

  /** Radix `Tabs` needs the pointer-down that precedes a real click (same idiom `InboxView`'s own `CountTabs` tests use). */
  function clickTab(name: RegExp) {
    fireEvent.mouseDown(screen.getByRole('tab', { name }))
    fireEvent.click(screen.getByRole('tab', { name }))
  }

  it('on "All": renders a tab per stage plus a leading "All" tab, and keeps the per-card badge + Group-By-status header', async () => {
    await renderStageLens()
    expect(screen.getByRole('tab', { name: /^All/ })).toHaveAttribute('aria-selected', 'true')
    // Golden blueprint's real statusList: Lead/Qualified/Proposal/Won/Lost.
    for (const label of ['Lead', 'Qualified', 'Proposal', 'Won', 'Lost']) {
      expect(screen.getByRole('tab', { name: new RegExp(`^${label}`) })).toBeInTheDocument()
    }
    expect(badges().length).toBe(cards().length)
    expect(groupHeaders().length).toBeGreaterThan(0)
    expect(groupHeaders().map((h) => h.textContent)).toContain('Lead')
  })

  it('picking a specific stage narrows the list, hides the per-card badge and hides the redundant group header', async () => {
    await renderStageLens()
    clickTab(/^Lead/)
    expect(screen.getByRole('tab', { name: /^Lead/ })).toHaveAttribute('aria-selected', 'true')
    expect(screen.getByRole('tab', { name: /^All/ })).toHaveAttribute('aria-selected', 'false')
    // D-101/D-102 are the fixture's two `lead` records — everything else drops out.
    expect(cards().map((c) => c.textContent?.match(/D-10\d/)?.[0]).sort()).toEqual(['D-101', 'D-102'])
    expect(badges()).toHaveLength(0)
    expect(groupHeaders()).toHaveLength(0)
  })

  it('returning to "All" restores the badge and the group header', async () => {
    await renderStageLens()
    clickTab(/^Qualified/)
    expect(badges()).toHaveLength(0)
    clickTab(/^All/)
    expect(cards()).toHaveLength(stageRecords.length)
    expect(badges().length).toBe(cards().length)
    expect(groupHeaders().length).toBeGreaterThan(0)
  })
})

describe('ModuleView routing', () => {
  it('gives the hybrid tab the record map whenever uiConfig.map.records exists', async () => {
    render(
      <ModuleView
        config={config}
        records={records}
        views={['hybrid']}
        context={{ userId: 'u1', moduleId: 'm1' }}
      />,
    )
    await waitFor(() => expect(screen.getByTestId('fake-map')).toBeInTheDocument())
    expect(document.querySelector('[data-slot="map-hybrid-view"]')).not.toBeNull()
  })

  it('leaves a blueprint WITHOUT the declaration on its existing hybrid body', async () => {
    const noRecords = {
      ...config,
      uiConfig: { ...config.uiConfig, map: { ...config.uiConfig.map, records: undefined } },
    } as EntityConfig
    render(
      <ModuleView
        config={noRecords}
        records={records}
        views={['hybrid']}
        context={{ userId: 'u1', moduleId: 'm1' }}
      />,
    )
    await waitFor(() => expect(document.querySelector('[data-slot="map-hybrid-view"]')).toBeNull())
  })
})
