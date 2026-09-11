import { describe, expect, it, vi } from 'vitest'
import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import type { LiveMapViewProps } from '../map/LiveMapView'
import { LiveHybridView } from './LiveHybridView'
import { ModuleView } from './ModuleView'
import { liveMonitoringConfig, liveVehicleRecords } from './live-fixtures'
import { dealsConfig, dealRecords, managerUser } from './fixtures'

/*
 * Stub the heavy map entry — the fake exposes a select button per vehicle so
 * marker-side selection can be simulated (see MapView.test.tsx's rationale),
 * plus stand-ins for the `LiveMapTools` controls the real `LiveMapView`
 * renders behind `showTools`. Since the hybrid stopped hand-rolling its own
 * tool stack, those controls live BEHIND this boundary: the fake buttons are
 * how a view test proves the seams are actually threaded through it.
 */
const lastProps = vi.hoisted(() => ({ current: null as LiveMapViewProps | null }))
vi.mock('@fams/v5-templates/map', () => ({
  LiveMapView: (props: LiveMapViewProps) => {
    lastProps.current = props
    const markers = props.markersHidden ? [] : props.vehicles
    return (
      <div data-testid="fake-live-map" data-selected={props.selectedId ?? ''} data-focus={JSON.stringify(props.focusPosition ?? null)}>
        {markers.map((v) => (
          <button key={v.id} type="button" onClick={() => props.onSelect?.(v.id)}>
            marker {v.id}
          </button>
        ))}
        {props.showTools ? (
          <>
            <button
              type="button"
              onClick={() => props.onMarkersHiddenChange?.(!props.markersHidden)}
            >
              {props.markersHidden ? 'Show vehicle markers' : 'Hide vehicle markers'}
            </button>
            {props.zonesAvailable ? (
              <button type="button" onClick={() => props.onZonesOpenChange?.(!props.zonesOpen)}>
                Zones
              </button>
            ) : null}
            {props.poisAvailable ? (
              <button type="button" onClick={() => props.onPoiOpenChange?.(!props.poiOpen)}>
                Points of interest
              </button>
            ) : null}
            <button type="button" onClick={() => void props.onRefresh?.()}>
              Refresh live positions
            </button>
          </>
        ) : null}
      </div>
    )
  },
}))

describe('LiveHybridView', () => {
  it('renders the compact vehicle list (blueprint hybrid columns) beside the lazy map', async () => {
    render(<LiveHybridView config={liveMonitoringConfig} records={liveVehicleRecords} />)
    await waitFor(() => expect(screen.getByTestId('fake-live-map')).toBeInTheDocument())
    // Compact list from uiConfig.hybrid.listColumns: Vehicle / Mobility Status / Speed.
    expect(screen.getByRole('columnheader', { name: 'Vehicle' })).toBeInTheDocument()
    expect(screen.getByRole('columnheader', { name: 'Speed' })).toBeInTheDocument()
    expect(screen.getByText('Y 31022')).toBeInTheDocument()
  })

  it('syncs selection list → map: row click selects and pans to the vehicle', async () => {
    const onSelect = vi.fn()
    render(<LiveHybridView config={liveMonitoringConfig} records={liveVehicleRecords} onSelect={onSelect} />)
    await waitFor(() => expect(screen.getByTestId('fake-live-map')).toBeInTheDocument())
    fireEvent.click(screen.getByText('Y 31022'))
    expect(onSelect).toHaveBeenCalledWith('V-101')
    await waitFor(() => expect(screen.getByTestId('fake-live-map')).toHaveAttribute('data-selected', 'V-101'))
    // Camera nudge = the selected vehicle's [lng, lat].
    expect(screen.getByTestId('fake-live-map')).toHaveAttribute('data-focus', JSON.stringify([51.531, 25.324]))
  })

  it('syncs selection map → list: marker click tints the row', async () => {
    render(<LiveHybridView config={liveMonitoringConfig} records={liveVehicleRecords} />)
    await waitFor(() => expect(screen.getByTestId('fake-live-map')).toBeInTheDocument())
    fireEvent.click(screen.getByRole('button', { name: 'marker V-102' }))
    await waitFor(() => expect(screen.getByTestId('fake-live-map')).toHaveAttribute('data-selected', 'V-102'))
    const row = screen.getByText('D 88451').closest('tr')
    expect(row?.getAttribute('data-state') ?? row?.className).toBeTruthy()
  })
})

describe('LiveHybridView WP7 panels', () => {
  it('divider grabbers step width states and ✕ hides the panel with a reopen affordance', async () => {
    render(<LiveHybridView config={liveMonitoringConfig} records={liveVehicleRecords} />)
    await waitFor(() => expect(screen.getByTestId('fake-live-map')).toBeInTheDocument())
    // Collapsed default → widen reveals the expandedColumns (Status Since).
    expect(screen.queryByRole('columnheader', { name: 'Status Since' })).not.toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Widen vehicle list' }))
    expect(screen.getByRole('columnheader', { name: 'Status Since' })).toBeInTheDocument()
    // Hide → map full-bleed with a visible reopen affordance; reopen restores state.
    fireEvent.click(screen.getByRole('button', { name: 'Hide vehicle list' }))
    expect(screen.queryByRole('columnheader', { name: 'Vehicle' })).not.toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Show vehicle list' }))
    expect(screen.getByRole('columnheader', { name: 'Status Since' })).toBeInTheDocument()
  })

  it('search filters the list AND the map markers, with the count line', async () => {
    render(<LiveHybridView config={liveMonitoringConfig} records={liveVehicleRecords} />)
    await waitFor(() => expect(screen.getByTestId('fake-live-map')).toBeInTheDocument())
    fireEvent.change(screen.getByLabelText('Search vehicles'), { target: { value: 'Toyota' } })
    expect(document.querySelector('[data-slot="live-list-count"]')).toHaveTextContent('Showing 1 items out of 4')
    expect(screen.queryByRole('button', { name: 'marker V-101' })).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'marker V-102' })).toBeInTheDocument()
  })

  it('filter selections thin out list + markers and render applied chips', async () => {
    render(<LiveHybridView config={liveMonitoringConfig} records={liveVehicleRecords} />)
    await waitFor(() => expect(screen.getByTestId('fake-live-map')).toBeInTheDocument())
    fireEvent.click(screen.getByRole('button', { name: 'All filters' }))
    fireEvent.click(screen.getByRole('checkbox', { name: /Moving/ }))
    expect(document.querySelector('[data-slot="live-list-count"]')).toHaveTextContent('Showing 1 items out of 4')
    expect(screen.getByRole('button', { name: 'Clear Mobility Status filter' })).toBeInTheDocument()
  })

  it('eye-off hides every vehicle marker but keeps the list rows', async () => {
    render(<LiveHybridView config={liveMonitoringConfig} records={liveVehicleRecords} />)
    await waitFor(() => expect(screen.getByTestId('fake-live-map')).toBeInTheDocument())
    fireEvent.click(screen.getByRole('button', { name: 'Hide vehicle markers' }))
    expect(screen.queryByRole('button', { name: 'marker V-101' })).not.toBeInTheDocument()
    expect(screen.getByText('Y 31022')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Show vehicle markers' }))
    expect(screen.getByRole('button', { name: 'marker V-101' })).toBeInTheDocument()
  })

  it('zones/POI drawers check items onto the map (one drawer at a time)', async () => {
    render(<LiveHybridView config={liveMonitoringConfig} records={liveVehicleRecords} />)
    await waitFor(() => expect(screen.getByTestId('fake-live-map')).toBeInTheDocument())
    fireEvent.click(screen.getByRole('button', { name: 'Zones' }))
    fireEvent.click(screen.getByRole('checkbox', { name: 'Show Z-1234 on map' }))
    expect(lastProps.current?.zones?.map((z) => z.id)).toEqual(['Z-1234'])
    // Opening POI closes zones (one anchored surface at a time).
    fireEvent.click(screen.getByRole('button', { name: 'Points of interest' }))
    expect(screen.queryByRole('dialog', { name: 'Zones' })).not.toBeInTheDocument()
    fireEvent.click(screen.getByRole('checkbox', { name: /Central Depot/ }))
    expect(lastProps.current?.pois?.map((p) => p.id)).toEqual(['poi-2'])
  })

  it('column edits raise the unsaved-changes toast; Revert restores, Enable Autosave silences', async () => {
    render(<LiveHybridView config={liveMonitoringConfig} records={liveVehicleRecords} />)
    await waitFor(() => expect(screen.getByTestId('fake-live-map')).toBeInTheDocument())
    fireEvent.click(screen.getByRole('button', { name: 'Customize columns' }))
    fireEvent.click(screen.getByRole('switch', { name: /Driver/ }))
    expect(screen.getByRole('status')).toHaveTextContent('You have unsaved changes')
    fireEvent.click(screen.getByRole('button', { name: 'Revert' }))
    expect(screen.queryByRole('status')).not.toBeInTheDocument()
    fireEvent.click(screen.getByRole('switch', { name: /Driver/ }))
    fireEvent.click(screen.getByRole('button', { name: 'Enable Autosave' }))
    expect(screen.queryByRole('status')).not.toBeInTheDocument()
  })

  it('opens the Customize View drawer (controlled) and List View State round-trips the divider', async () => {
    render(
      <ModuleView
        config={liveMonitoringConfig}
        records={liveVehicleRecords}
        views={['hybrid']}
        context={{ userId: 'u1', moduleId: 'live-monitoring' }}
      />,
    )
    await waitFor(() => expect(screen.getByTestId('fake-live-map')).toBeInTheDocument())
    // keyDown Enter — Radix DropdownMenu's jsdom open workaround.
    fireEvent.keyDown(screen.getByRole('button', { name: 'View options' }), { key: 'Enter' })
    fireEvent.click(screen.getByRole('menuitem', { name: 'Customize View' }))
    expect(screen.getByRole('dialog', { name: 'Customize View' })).toBeInTheDocument()
    // List View State dropdown reflects/sets the divider's width state.
    expect(screen.getByLabelText('List View State')).toHaveTextContent('Collapsed')
    fireEvent.click(screen.getByRole('button', { name: 'Close Customize View' }))
    expect(screen.queryByRole('dialog', { name: 'Customize View' })).not.toBeInTheDocument()
  })

  it('Customize View drawer edits raise the unsaved-changes toast; Revert restores (round-1 `customize-unsaved-toast`)', async () => {
    render(
      <ModuleView
        config={liveMonitoringConfig}
        records={liveVehicleRecords}
        views={['hybrid']}
        context={{ userId: 'u1', moduleId: 'live-monitoring' }}
      />,
    )
    await waitFor(() => expect(screen.getByTestId('fake-live-map')).toBeInTheDocument())
    fireEvent.keyDown(screen.getByRole('button', { name: 'View options' }), { key: 'Enter' })
    fireEvent.click(screen.getByRole('menuitem', { name: 'Customize View' }))
    const drawer = screen.getByRole('dialog', { name: 'Customize View' })
    expect(screen.queryByRole('status')).not.toBeInTheDocument()
    fireEvent.click(within(drawer).getByRole('switch', { name: 'Private View' }))
    expect(screen.getByRole('status')).toHaveTextContent('You have unsaved changes')
    expect(within(drawer).getByRole('switch', { name: 'Private View' })).toHaveAttribute('aria-checked', 'true')
    fireEvent.click(screen.getByRole('button', { name: 'Revert' }))
    expect(screen.queryByRole('status')).not.toBeInTheDocument()
    expect(within(drawer).getByRole('switch', { name: 'Private View' })).toHaveAttribute('aria-checked', 'false')
  })

  it('"Sync With Map" defaults OFF, re-filters the LIST to the viewport only while ON, and never moves the map (reference rules 1/5)', async () => {
    // Isolate this test's fresh-view default from any OTHER test in this
    // file that may have flipped the persisted preference — the toggle's
    // localStorage key is shared across the whole jsdom window.
    window.localStorage.removeItem('fams.liveMonitoring.syncListWithMap')
    render(
      <ModuleView
        config={liveMonitoringConfig}
        records={liveVehicleRecords}
        views={['hybrid']}
        context={{ userId: 'u1', moduleId: 'live-monitoring' }}
      />,
    )
    await waitFor(() => expect(screen.getByTestId('fake-live-map')).toBeInTheDocument())
    const syncSwitch = screen.getByRole('switch', { name: 'Sync With Map' })
    expect(syncSwitch).toHaveAttribute('aria-checked', 'false')

    // Rule 1: OFF means the FULL fleet, whatever the map viewport says. The
    // viewport seam stays subscribed regardless (so a later toggle-ON has a
    // CURRENT reading, not a stale one) — it just is not applied.
    await waitFor(() => expect(lastProps.current?.onViewportChange).toBeTypeOf('function'))
    const fitBefore = lastProps.current!.fitToMarkersNonce
    act(() => lastProps.current!.onViewportChange!([51.5, 25.3, 51.545, 25.332], 12))
    expect(screen.getByText('N 55210')).toBeInTheDocument()
    expect(document.querySelector('[data-slot="live-list-count"]')).toHaveTextContent('Showing 4 items')

    // Rule 5: turning it ON filters IMMEDIATELY against the reading the map
    // already reported, and moves no camera (the fit nonce never ticks).
    fireEvent.click(syncSwitch)
    await waitFor(() => expect(screen.queryByText('N 55210')).not.toBeInTheDocument())
    expect(screen.getByText('Y 31022')).toBeInTheDocument()
    // Rule 2: one count string, in every state.
    expect(document.querySelector('[data-slot="live-list-count"]')).toHaveTextContent('Showing 3 items out of 4')
    expect(lastProps.current!.fitToMarkersNonce).toBe(fitBefore)
    // The MAP still receives the full search∩filter set — it is not clipped
    // to its own viewport (that would be circular).
    expect(lastProps.current?.vehicles).toHaveLength(4)

    // Turning it back OFF restores the full list, again without a camera move.
    fireEvent.click(screen.getByRole('switch', { name: 'Sync With Map' }))
    await waitFor(() => expect(screen.getByText('N 55210')).toBeInTheDocument())
    expect(lastProps.current!.fitToMarkersNonce).toBe(fitBefore)
  })

  it('marker/cluster selection NEVER narrows the list — only the toggle, viewport, filters and search do (rule 3)', async () => {
    window.localStorage.removeItem('fams.liveMonitoring.syncListWithMap')
    render(
      <ModuleView
        config={liveMonitoringConfig}
        records={liveVehicleRecords}
        views={['hybrid']}
        context={{ userId: 'u1', moduleId: 'live-monitoring' }}
      />,
    )
    await waitFor(() => expect(screen.getByTestId('fake-live-map')).toBeInTheDocument())
    const countLine = () => document.querySelector('[data-slot="live-list-count"]')
    expect(countLine()).toHaveTextContent('Showing 4 items')

    // A marker click is a SELECTION event. Sync OFF: row set untouched.
    act(() => lastProps.current!.onSelect?.('lv-102'))
    expect(countLine()).toHaveTextContent('Showing 4 items')
    expect(screen.getByText('N 55210')).toBeInTheDocument()

    // Sync ON, with a viewport already reported: selecting a DIFFERENT
    // marker still changes nothing about membership — only the bbox does.
    act(() => lastProps.current!.onViewportChange!([51.5, 25.3, 51.545, 25.332], 12))
    fireEvent.click(screen.getByRole('switch', { name: 'Sync With Map' }))
    await waitFor(() => expect(countLine()).toHaveTextContent('Showing 3 items out of 4'))
    act(() => lastProps.current!.onSelect?.('lv-101'))
    expect(countLine()).toHaveTextContent('Showing 3 items out of 4')
    act(() => lastProps.current!.onSelect?.(null))
    expect(countLine()).toHaveTextContent('Showing 3 items out of 4')
  })

  it("a selection's own fly-to never re-scopes the synced list; the user's next map gesture does (rules 3 + 6)", async () => {
    window.localStorage.removeItem('fams.liveMonitoring.syncListWithMap')
    render(
      <ModuleView
        config={liveMonitoringConfig}
        records={liveVehicleRecords}
        views={['hybrid']}
        context={{ userId: 'u1', moduleId: 'live-monitoring' }}
      />,
    )
    await waitFor(() => expect(screen.getByTestId('fake-live-map')).toBeInTheDocument())
    const countLine = () => document.querySelector('[data-slot="live-list-count"]')

    // Sync ON against a viewport holding three of the four vehicles.
    await waitFor(() => expect(lastProps.current?.onViewportChange).toBeTypeOf('function'))
    act(() => lastProps.current!.onViewportChange!([51.5, 25.3, 51.545, 25.332], 12))
    fireEvent.click(screen.getByRole('switch', { name: 'Sync With Map' }))
    await waitFor(() => expect(countLine()).toHaveTextContent('Showing 3 items out of 4'))

    // Selecting a row flies the camera to that vehicle. The viewport report
    // that fly-to produces must NOT collapse the list to the one vehicle —
    // membership survives the camera move the selection itself caused.
    act(() => lastProps.current!.onSelect?.('lv-101'))
    act(() => lastProps.current!.onViewportChange!([51.529, 25.3169, 51.531, 25.3171], 17))
    expect(countLine()).toHaveTextContent('Showing 3 items out of 4')

    // The user's OWN gesture on the map pane lifts the freeze, and the very
    // next reading scopes the list again — that same tight bbox, which the
    // freeze had been ignoring, now applies (it holds no vehicle centre).
    fireEvent.pointerDown(screen.getByTestId('fake-live-map'))
    act(() => lastProps.current!.onViewportChange!([51.529, 25.3169, 51.531, 25.3171], 17))
    await waitFor(() => expect(countLine()).toHaveTextContent('Showing 0 items out of 4'))
  })

  it('Escape closes the Customize View drawer without any console error (round-1 setState-in-render)', async () => {
    const errors: unknown[][] = []
    const spy = vi.spyOn(console, 'error').mockImplementation((...args) => void errors.push(args))
    render(
      <ModuleView
        config={liveMonitoringConfig}
        records={liveVehicleRecords}
        views={['hybrid']}
        context={{ userId: 'u1', moduleId: 'live-monitoring' }}
      />,
    )
    await waitFor(() => expect(screen.getByTestId('fake-live-map')).toBeInTheDocument())
    fireEvent.keyDown(screen.getByRole('button', { name: 'View options' }), { key: 'Enter' })
    fireEvent.click(screen.getByRole('menuitem', { name: 'Customize View' }))
    const drawer = screen.getByRole('dialog', { name: 'Customize View' })
    fireEvent.keyDown(within(drawer).getByLabelText('View name'), { key: 'Escape' })
    expect(screen.queryByRole('dialog', { name: 'Customize View' })).not.toBeInTheDocument()
    spy.mockRestore()
    expect(errors.filter((args) => String(args[0]).includes('while rendering'))).toHaveLength(0)
  })

  it('threads the SPEC §2.3 tool seams into the SHARED map chrome instead of a second stack', async () => {
    render(<LiveHybridView config={liveMonitoringConfig} records={liveVehicleRecords} />)
    await waitFor(() => expect(screen.getByTestId('fake-live-map')).toBeInTheDocument())
    // The hybrid asks `LiveMapView` for the tools rather than painting its
    // own — that duplicate stack is why the traffic toast, the place search
    // + fly-to and the refresh spinner were map-only fixes.
    expect(lastProps.current?.showTools).toBe(true)
    // …and it leaves the basemap to `LiveMapView`, whose layers tool only
    // owns the bright/muted flip while `styleUrl` is undefined.
    expect(lastProps.current?.styleUrl).toBeUndefined()
    // Place search + unavailable-tool messages are METADATA, threaded through.
    expect(lastProps.current?.places).toEqual(liveMonitoringConfig.uiConfig.map?.places)
    expect(lastProps.current?.unavailableTools).toEqual(liveMonitoringConfig.uiConfig.map?.unavailableTools)
    // Zones/POI tools render because the blueprint declares them.
    expect(lastProps.current?.zonesAvailable).toBe(true)
    expect(lastProps.current?.poisAvailable).toBe(true)
    // Refresh bumps the fit-to-fleet nonce.
    fireEvent.click(screen.getByRole('button', { name: 'Refresh live positions' }))
    expect(lastProps.current?.fitToMarkersNonce).toBe(1)
  })

  it('shifts nothing itself — the open drawer is reported to the chrome, which steps inboard by its width', async () => {
    render(<LiveHybridView config={liveMonitoringConfig} records={liveVehicleRecords} />)
    await waitFor(() => expect(screen.getByTestId('fake-live-map')).toBeInTheDocument())
    fireEvent.click(screen.getByRole('button', { name: 'Zones' }))
    // The tool that opened the drawer stays reachable (interaction 21b) and
    // the chrome knows a drawer is open, so its end stack moves inboard.
    expect(lastProps.current?.zonesOpen).toBe(true)
    expect(screen.getByRole('button', { name: 'Zones' })).toBeInTheDocument()
    expect(screen.getByRole('dialog', { name: 'Zones' })).toBeInTheDocument()
  })

  it("Create & Customize on a live hybrid lands on the new tab WITH the Customize View drawer open (WP5 seam)", async () => {
    render(
      <ModuleView
        config={liveMonitoringConfig}
        records={liveVehicleRecords}
        views={['hybrid']}
        context={{ userId: 'u1', moduleId: 'live-monitoring' }}
      />,
    )
    await waitFor(() => expect(screen.getByTestId('fake-live-map')).toBeInTheDocument())
    fireEvent.click(screen.getByRole('button', { name: 'Add view' }))
    fireEvent.click(screen.getByRole('button', { name: 'Create & Customize' }))
    const tab = await screen.findByRole('tab', { name: 'Hybrid View 2' })
    expect(tab).toHaveAttribute('data-state', 'active')
    expect(screen.getByRole('dialog', { name: 'Customize View' })).toBeInTheDocument()
  })
})

describe('ModuleView body selection', () => {
  it("renders the live hybrid for a coordinate-bound module's hybrid view", async () => {
    render(
      <ModuleView
        config={liveMonitoringConfig}
        records={liveVehicleRecords}
        views={['hybrid', 'map', 'list']}
        context={{ userId: 'u1', moduleId: 'live-monitoring' }}
      />,
    )
    await waitFor(() => expect(screen.getByTestId('fake-live-map')).toBeInTheDocument())
    expect(screen.getByRole('columnheader', { name: 'Vehicle' })).toBeInTheDocument()
  })

  it('renders the full-bleed map body for the map view kind', async () => {
    render(
      <ModuleView
        config={liveMonitoringConfig}
        records={liveVehicleRecords}
        views={['map']}
        context={{ userId: 'u1', moduleId: 'live-monitoring' }}
      />,
    )
    await waitFor(() => expect(screen.getByTestId('fake-live-map')).toBeInTheDocument())
    // Full-bleed: no compact list beside it.
    expect(screen.queryByRole('columnheader', { name: 'Vehicle' })).not.toBeInTheDocument()
  })

  it("live modules' list-only view carries the columns pencil + popover (round-1 `columns-listview-missing`)", () => {
    render(
      <ModuleView
        config={liveMonitoringConfig}
        records={liveVehicleRecords}
        views={['list']}
        context={{ userId: 'u1', moduleId: 'live-monitoring' }}
      />,
    )
    const pencil = screen.getByRole('button', { name: 'Customize columns' })
    fireEvent.click(pencil)
    const popover = screen.getByRole('dialog', { name: 'Columns' })
    expect(popover).toBeInTheDocument()
    // Toggling a hidden column on updates the table live + raises the toast.
    const headersBefore = screen.getAllByRole('columnheader').length
    fireEvent.click(within(popover).getByRole('switch', { name: /Driver/ }))
    expect(screen.getAllByRole('columnheader').length).toBe(headersBefore + 1)
    expect(screen.getByRole('status')).toHaveTextContent('You have unsaved changes')
    // Escape closes the popover.
    fireEvent.keyDown(popover, { key: 'Escape' })
    expect(screen.queryByRole('dialog', { name: 'Columns' })).not.toBeInTheDocument()
  })

  it('suppresses the page-level toolbar row for live modules — search/funnel live inside the view bodies (SPEC v2 §§2.2/2.10)', async () => {
    render(
      <ModuleView
        config={liveMonitoringConfig}
        records={liveVehicleRecords}
        views={['hybrid', 'list']}
        context={{ userId: 'u1', moduleId: 'live-monitoring' }}
      />,
    )
    await waitFor(() => expect(screen.getByTestId('fake-live-map')).toBeInTheDocument())
    // No ModuleViewFilters toolbar search…
    expect(screen.queryByRole('textbox', { name: 'Search' })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Filter' })).not.toBeInTheDocument()
    // …the hybrid panel's own search is the only one.
    expect(screen.getByLabelText('Search vehicles')).toBeInTheDocument()
  })

  it('keeps the page-level toolbar for non-live modules (unchanged)', () => {
    render(
      <ModuleView
        config={dealsConfig}
        records={dealRecords}
        views={['list']}
        context={{ userId: managerUser.id, moduleId: 'deals' }}
      />,
    )
    expect(screen.getByRole('textbox', { name: 'Search' })).toBeInTheDocument()
  })

  it('keeps the list+detail split for a hybrid module without coordinates', () => {
    render(
      <ModuleView
        config={dealsConfig}
        records={dealRecords}
        views={['hybrid']}
        context={{ userId: managerUser.id, moduleId: 'deals' }}
      />,
    )
    expect(screen.queryByTestId('fake-live-map')).not.toBeInTheDocument()
    expect(screen.getByText('No selection')).toBeInTheDocument()
  })
})

describe('LiveHybridView — hidden-panel restore does not collide with the shared map chrome', () => {
  it('parks the restore rail as a real layout sibling at the pane’s inline start, not an overlay on the map', async () => {
    render(<LiveHybridView config={liveMonitoringConfig} records={liveVehicleRecords} />)
    await waitFor(() => expect(screen.getByTestId('fake-live-map')).toBeInTheDocument())
    fireEvent.click(screen.getByRole('button', { name: 'Hide vehicle list' }))
    // SPEC `live-monitoring-4-19-27942` §1.3: the collapsed rail is a real
    // 13px LAYOUT width next to the map (a flex sibling), not a floating
    // button painted on top of it — so it can never collide with
    // `LiveMapTools`'s own `start-3 top-3` stack (search / pin / refresh).
    const rail = document.querySelector('[data-slot="live-panel-reopen"]')!
    expect(rail.className).not.toContain('absolute')
    expect(rail.className).toContain('flex-none')
    const restore = screen.getByRole('button', { name: 'Show vehicle list' })
    fireEvent.click(restore)
    expect(screen.getByRole('button', { name: 'Hide vehicle list' })).toBeInTheDocument()
  })
})

/**
 * Round-3 findings owned by the hybrid host: the filtered marker set must be
 * FRAMED (UX #1 — "Showing 6 items" over five visible vehicles), and any open
 * right drawer must step the map's end tool stack inboard (UX #5).
 */
describe('LiveHybridView — round-3 map/list reconciliation', () => {
  it('re-fits the camera to the filtered set on every narrowing, so the count matches what is on screen', async () => {
    render(<LiveHybridView config={liveMonitoringConfig} records={liveVehicleRecords} />)
    await waitFor(() => expect(screen.getByTestId('fake-live-map')).toBeInTheDocument())
    // Unfiltered: no fit is forced — the fleet's own framing stands.
    const atRest = lastProps.current!.fitToMarkersNonce
    fireEvent.change(screen.getByLabelText('Search vehicles'), { target: { value: 'Toyota' } })
    await waitFor(() => expect(lastProps.current!.fitToMarkersNonce).toBe((atRest ?? 0) + 1))
    // Re-typing the SAME narrowing does not re-fit (the effect keys on WHICH
    // records are listed, not on keystrokes) …
    fireEvent.change(screen.getByLabelText('Search vehicles'), { target: { value: 'Toyota Hilux' } })
    expect(lastProps.current!.fitToMarkersNonce).toBe((atRest ?? 0) + 1)
    // … a DIFFERENT narrowing does.
    fireEvent.change(screen.getByLabelText('Search vehicles'), { target: { value: 'Mitsubishi' } })
    await waitFor(() => expect(lastProps.current!.fitToMarkersNonce).toBe((atRest ?? 0) + 2))
    // …and clearing the search does NOT (the user's camera is left alone).
    fireEvent.change(screen.getByLabelText('Search vehicles'), { target: { value: '' } })
    await waitFor(() =>
      expect(document.querySelector('[data-slot="live-list-count"]')).toHaveTextContent(
        'Showing 4 items',
      ),
    )
    expect(lastProps.current!.fitToMarkersNonce).toBe((atRest ?? 0) + 2)
  })

  it('steps the map tool stack inboard while the Customize View drawer is open (UX #5)', async () => {
    const { rerender } = render(
      <LiveHybridView config={liveMonitoringConfig} records={liveVehicleRecords} customizeOpen={false} />,
    )
    await waitFor(() => expect(screen.getByTestId('fake-live-map')).toBeInTheDocument())
    expect(lastProps.current!.toolEndInset).toBeUndefined()
    rerender(<LiveHybridView config={liveMonitoringConfig} records={liveVehicleRecords} customizeOpen />)
    await waitFor(() => expect(lastProps.current!.toolEndInset).toBe(347))
  })
})

/*
 * Regression tripwire — THIRD occurrence of "the window/module-shell grows a
 * real vertical scrollbar on the Live Monitoring Hybrid View" (2026-08-31,
 * see this file's header comment + `hybrid-scroll-regression3` in Build
 * Delegate/media). The view's contract is: it fills its container exactly
 * (`h-full`); ALL scrolling happens inside its own panels (the list table's
 * `[role=region]`, the map canvas) — never on this view's own root, nor on
 * any ancestor. That only holds if every link between this root and the
 * scrollable table region keeps BOTH halves of the flex discipline: `h-full`
 * (or `flex-1`) so the box actually shrinks to the space it's given, AND
 * `min-h-0` so a flex item doesn't fall back to its content's intrinsic
 * (`min-height: auto`) size instead of honoring that shrink. Drop either half
 * anywhere in the chain and SOME ancestor ends up taller than the viewport —
 * which is exactly how this regressed three times. This test is a brittle
 * className tripwire on purpose (see `e2e/viewport-scroll-contract-verify.spec.ts`
 * in the demo repo for the real, rendered-pixel version of this contract) —
 * cheap, deterministic, and it fails LOUDLY the moment a future edit drops
 * one of these classes, instead of silently shipping a scrollbar again.
 */
describe('LiveHybridView — viewport height-chain contract (regression tripwire)', () => {
  it('keeps h-full + min-h-0 on every link from the view root down to the list panel', async () => {
    const { container } = render(<LiveHybridView config={liveMonitoringConfig} records={liveVehicleRecords} />)
    await waitFor(() => expect(screen.getByTestId('fake-live-map')).toBeInTheDocument())

    const root = container.querySelector('[data-slot="live-hybrid-view"]') as HTMLElement
    expect(root.className).toContain('h-full')
    expect(root.className).toContain('min-h-0')

    // The list panel's column wrapper (`LiveHybridView`'s own div around
    // `LiveListPanel`) — first child while the panel isn't hidden.
    const listColumn = root.firstElementChild as HTMLElement
    expect(listColumn.className).toContain('h-full')
    expect(listColumn.className).toContain('min-h-0')

    const listPanel = container.querySelector('[data-slot="live-list-panel"]') as HTMLElement
    expect(listPanel.className).toContain('h-full')
    expect(listPanel.className).toContain('min-h-0')

    // The table wrapper `LiveListPanel` renders around `DataTable` — the last
    // link before the table's own scroll region.
    const table = container.querySelector('table[aria-label$="vehicles"]') as HTMLElement
    const dataTableRoot = table.closest('[class*="overflow-hidden"]') as HTMLElement
    const tableWrapper = dataTableRoot.parentElement as HTMLElement
    expect(tableWrapper.className).toContain('min-h-0')
    expect(tableWrapper.className).toContain('flex-1')

    // `DataTable`'s own clipping root: `overflow-hidden` only contains
    // normal-flow descendants unless this box also establishes a containing
    // block (`position: relative`) — see `DataTable.test.tsx`'s sibling
    // tripwire for the full mechanism this guards.
    expect(dataTableRoot.className).toContain('relative')
  })
})
