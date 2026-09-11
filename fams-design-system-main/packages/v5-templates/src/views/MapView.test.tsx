import { describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import type { LiveMapViewProps } from '../map/LiveMapView'
import { MapView } from './MapView'
import { liveMonitoringConfig, liveVehicleRecords } from './live-fixtures'
import { dealsConfig, dealRecords } from './fixtures'

// The heavy map entry is reached only through MapView's runtime `import()` —
// stubbed here so the test asserts the SLOT's contract (derivation + props),
// not maplibre. `LiveMapView.test.tsx` covers the real surface.
const lastProps = vi.hoisted(() => ({ current: null as LiveMapViewProps | null }))
vi.mock('@fams/v5-templates/map', () => ({
  LiveMapView: (props: LiveMapViewProps) => {
    lastProps.current = props
    return <div data-testid="fake-live-map" data-count={props.vehicles.length} />
  },
}))

describe('MapView', () => {
  it('shows an explanatory empty state when the blueprint has no coordinate binding', () => {
    render(<MapView config={dealsConfig} records={dealRecords} />)
    expect(screen.getByText('No map binding')).toBeInTheDocument()
    expect(screen.queryByTestId('fake-live-map')).not.toBeInTheDocument()
  })

  it('lazily renders the live map with vehicles derived from the records', async () => {
    render(<MapView config={liveMonitoringConfig} records={liveVehicleRecords} />)
    await waitFor(() => expect(screen.getByTestId('fake-live-map')).toBeInTheDocument())
    expect(screen.getByTestId('fake-live-map')).toHaveAttribute('data-count', '4')
    expect(lastProps.current?.['aria-label']).toBe('Live Monitoring live map')
  })

  it('adapts onOpenRecord and getPopupData to the vehicle shape', async () => {
    const onOpenRecord = vi.fn()
    const getPopupData = vi.fn().mockReturnValue(undefined)
    render(
      <MapView
        config={liveMonitoringConfig}
        records={liveVehicleRecords}
        onOpenRecord={onOpenRecord}
        getPopupData={getPopupData}
      />,
    )
    await waitFor(() => expect(screen.getByTestId('fake-live-map')).toBeInTheDocument())
    const vehicle = lastProps.current!.vehicles[0]
    lastProps.current!.onOpenVehicle!(vehicle)
    expect(onOpenRecord).toHaveBeenCalledWith(liveVehicleRecords[0])
    lastProps.current!.getPopupData!(vehicle)
    expect(getPopupData).toHaveBeenCalledWith(liveVehicleRecords[0])
  })
})

describe('MapView — the map-only view owns the SPEC §2.3 chrome (visual #9 / UX findings 2, 18)', () => {
  const mapOnly = () =>
    render(<MapView config={liveMonitoringConfig} records={liveVehicleRecords} showTools />)

  it('threads the tool set + its metadata and reserves the drawer seams', async () => {
    mapOnly()
    await waitFor(() => expect(screen.getByTestId('fake-live-map')).toBeInTheDocument())
    expect(lastProps.current?.showTools).toBe(true)
    expect(lastProps.current?.places).toEqual(liveMonitoringConfig.uiConfig.map?.places)
    expect(lastProps.current?.unavailableTools).toEqual(liveMonitoringConfig.uiConfig.map?.unavailableTools)
    expect(lastProps.current?.poisAvailable).toBe(true)
    // The muted-but-coloured basemap is `LiveMapView`'s to resolve — round 1
    // fell through to raw Positron here (visual #8).
    expect(lastProps.current?.styleUrl).toBeUndefined()
  })

  it('draws NO zone until one is checked — the stray blue/green rectangles (UX finding 18)', async () => {
    mapOnly()
    await waitFor(() => expect(screen.getByTestId('fake-live-map')).toBeInTheDocument())
    // Regression guard: the old `zones ?? config.uiConfig.map.zones` fallback
    // painted every blueprint zone over the map-only view.
    expect(lastProps.current?.zones ?? []).toEqual([])
  })

  it('renders its own Zones drawer and feeds the checked zone to the map', async () => {
    mapOnly()
    await waitFor(() => expect(screen.getByTestId('fake-live-map')).toBeInTheDocument())
    expect(lastProps.current?.zonesAvailable).toBe(true)
    lastProps.current?.onZonesOpenChange?.(true)
    const zone = await screen.findByRole('checkbox', { name: 'Show Z-1234 on map' })
    fireEvent.click(zone)
    await waitFor(() => expect(lastProps.current?.zones?.map((z) => z.id)).toEqual(['Z-1234']))
  })

  it('leaves the drawers to the CALLER when the open state is controlled (the hybrid)', async () => {
    render(
      <MapView
        config={liveMonitoringConfig}
        records={liveVehicleRecords}
        showTools
        zonesOpen={false}
        onZonesOpenChange={() => {}}
        poiOpen={false}
        onPoiOpenChange={() => {}}
      />,
    )
    await waitFor(() => expect(screen.getByTestId('fake-live-map')).toBeInTheDocument())
    expect(screen.queryByRole('dialog', { name: 'Zones' })).not.toBeInTheDocument()
  })
})
