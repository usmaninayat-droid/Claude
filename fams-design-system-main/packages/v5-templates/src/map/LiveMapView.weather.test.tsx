// MUST be the first import — see `test/map-mocks.ts`'s header.
import './test/map-mocks'
import { reactMapGlTestState } from './test/map-mocks'
import { afterEach, describe, expect, it } from 'vitest'
import { act, fireEvent, render, screen } from '@testing-library/react'
import { LiveMapView } from './LiveMapView'
import { __resetSingleMapGuardForTests } from './mount-guard'
import { sampleWeatherForecast, sampleWeatherStations } from './weather-fixtures'
import type { LiveVehicleDatum } from './live-types'

/**
 * LiveMapView.weather.test.tsx — the weather layer's integration into the live
 * map (19:25255 / 19:27942), kept out of `LiveMapView.test.tsx` so the base
 * suite stays about the fleet.
 *
 * The load-bearing claim these tests defend is that the layer is ADDITIVE:
 * a map with no `weatherStations` must render exactly what it rendered
 * before, tool button included.
 */
afterEach(() => {
  __resetSingleMapGuardForTests()
})

const VEHICLES: LiveVehicleDatum[] = [{ id: 'V-1', position: [51.5, 25.3], status: 'moving', plate: 'Y 31022' }]

function renderMap(props: Partial<Parameters<typeof LiveMapView>[0]> = {}) {
  return render(
    <LiveMapView
      vehicles={VEHICLES}
      cluster={false}
      showTools
      tools={['weather', 'traffic']}
      aria-label="Fleet live map"
      {...props}
    />,
  )
}

const openWeather = () => fireEvent.click(screen.getByRole('button', { name: 'Weather layer' }))

describe('LiveMapView — weather layer', () => {
  it('renders no weather affordance at all without stations', () => {
    renderMap()
    expect(screen.queryByRole('button', { name: /Weather layer/ })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /^Weather station/ })).not.toBeInTheDocument()
    expect(screen.queryByRole('complementary')).not.toBeInTheDocument()
  })

  it('starts OFF, and the tool reveals the station markers', () => {
    renderMap({ weatherStations: sampleWeatherStations })
    expect(screen.queryByRole('button', { name: /^Weather station/ })).not.toBeInTheDocument()
    openWeather()
    expect(screen.getByRole('button', { name: /Weather station Qatar University/ })).toBeInTheDocument()
    expect(screen.getAllByRole('button', { name: /^Weather station/ })).toHaveLength(sampleWeatherStations.length)
  })

  it('plots the stations UNCLUSTERED, so all of them survive a zoom the tankers cluster at', () => {
    renderMap({ weatherStations: sampleWeatherStations, cluster: true })
    openWeather()
    expect(screen.getAllByRole('button', { name: /^Weather station/ })).toHaveLength(sampleWeatherStations.length)
  })

  it('keys the rain bands on each marker (aria-label, no separate legend)', () => {
    renderMap({ weatherStations: sampleWeatherStations })
    openWeather()
    // The band key comes from the marker's own accessible name now — there
    // is no separate legend card any more (removed 2026-08-31). The marker's
    // headline reading is rain (mm), not temperature (rain-first, 2026-08-31).
    expect(screen.getByRole('button', { name: /Weather station Al Ruwais, no reading/ })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Weather station Qatar University, 0 mm rain/ })).toBeInTheDocument()
  })

  it('renders the rain mm value, not temperature, as the marker\'s visible text', () => {
    renderMap({ weatherStations: sampleWeatherStations })
    openWeather()
    const marker = screen.getByRole('button', { name: /Weather station Qatar University/ })
    expect(marker).toHaveTextContent('0')
    expect(marker).not.toHaveTextContent('39°')
    // No reading → the reference dash, same convention as before.
    expect(screen.getByRole('button', { name: /Weather station Al Ruwais/ })).toHaveTextContent('–')
  })

  it('opens the docked drawer on a marker click and swaps it on the next marker', () => {
    renderMap({ weatherStations: sampleWeatherStations })
    openWeather()
    fireEvent.click(screen.getByRole('button', { name: /Weather station Qatar University/ }))
    expect(screen.getByRole('complementary', { name: 'Weather station Qatar University' })).toBeInTheDocument()

    // Straight to another station — no close/reopen (19:27942, interaction 5).
    fireEvent.click(screen.getByRole('button', { name: /Weather station Al Khor/ }))
    expect(screen.getByRole('complementary', { name: 'Weather station Al Khor' })).toBeInTheDocument()
    expect(screen.queryByRole('heading', { name: 'Qatar University' })).not.toBeInTheDocument()
  })

  it('closes the drawer when the same marker is clicked again', () => {
    renderMap({ weatherStations: sampleWeatherStations })
    openWeather()
    const marker = () => screen.getByRole('button', { name: /Weather station Qatar University/ })
    fireEvent.click(marker())
    fireEvent.click(marker())
    expect(screen.queryByRole('complementary')).not.toBeInTheDocument()
  })

  it('closes an open drawer when the whole layer is switched off', () => {
    renderMap({ weatherStations: sampleWeatherStations })
    openWeather()
    fireEvent.click(screen.getByRole('button', { name: /Weather station Qatar University/ }))
    fireEvent.click(screen.getByRole('button', { name: 'Hide weather layer' }))
    expect(screen.queryByRole('complementary')).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /^Weather station/ })).not.toBeInTheDocument()
  })

  it('runs fully controlled when the host owns the selection', () => {
    const seen: Array<string | null> = []
    renderMap({
      weatherStations: sampleWeatherStations,
      selectedStationId: null,
      onStationSelect: (id) => seen.push(id),
    })
    openWeather()
    fireEvent.click(screen.getByRole('button', { name: /Weather station Qatar University/ }))
    expect(seen).toEqual(['qu'])
    // Controlled and still null — the drawer must NOT open on its own.
    expect(screen.queryByRole('complementary')).not.toBeInTheDocument()
  })

  it('leaves the tanker markers alone while the weather layer is on', () => {
    renderMap({ weatherStations: sampleWeatherStations })
    openWeather()
    expect(screen.getByRole('button', { name: /Y 31022/ })).toBeInTheDocument()
  })
})

describe('LiveMapView — weather forecast bottom panel', () => {
  const basemapClick = (lng: number, lat: number) =>
    act(() => {
      reactMapGlTestState.lastOnClick?.({ lngLat: { lng, lat } })
    })

  it('activates WITH the layer, showing the two model tabs, and deactivates with it', () => {
    renderMap({ weatherStations: sampleWeatherStations, weatherForecast: sampleWeatherForecast })
    expect(screen.queryByRole('button', { name: 'Open-Meteo' })).not.toBeInTheDocument()
    openWeather()
    expect(screen.getByRole('button', { name: 'Open-Meteo' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'QMD' })).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Hide weather layer' }))
    expect(screen.queryByRole('button', { name: 'Open-Meteo' })).not.toBeInTheDocument()
  })

  it('never renders without forecast data, even with the layer on', () => {
    renderMap({ weatherStations: sampleWeatherStations })
    openWeather()
    expect(screen.queryByRole('button', { name: 'Open-Meteo' })).not.toBeInTheDocument()
  })

  it('expands into the timeline grid and switches models', () => {
    renderMap({ weatherStations: sampleWeatherStations, weatherForecast: sampleWeatherForecast })
    openWeather()
    fireEvent.click(screen.getByRole('button', { name: 'Expand forecast panel' }))
    expect(screen.getByText('Sun 31 Aug')).toBeInTheDocument()
    expect(screen.getByText('Temperature')).toBeInTheDocument()
    expect(screen.getByText('About Location')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'QMD' }))
    expect(screen.getByText('Official Outlook')).toBeInTheDocument()
    expect(screen.getByText('Rain Expected')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Close forecast panel' }))
    expect(screen.getByRole('button', { name: 'Expand forecast panel' })).toBeInTheDocument()
  })

  it('opens the EXPANDED view with that station\'s data when a temperature marker is clicked', () => {
    renderMap({ weatherStations: sampleWeatherStations, weatherForecast: sampleWeatherForecast })
    openWeather()
    fireEvent.click(screen.getByRole('button', { name: /Weather station Qatar University/ }))
    // Expanded (close control present) and retitled to the clicked location.
    expect(screen.getByRole('button', { name: 'Close forecast panel' })).toBeInTheDocument()
    expect(screen.getByText('Qatar University · Area 9')).toBeInTheDocument()
    // No side panel, and NOT the station drawer — the refinement's contract.
    expect(screen.queryByRole('complementary')).not.toBeInTheDocument()
  })

  it('resolves a basemap click to the nearest station and swaps the data in place', () => {
    renderMap({ weatherStations: sampleWeatherStations, weatherForecast: sampleWeatherForecast })
    openWeather()
    basemapClick(51.48, 25.38) // right on Qatar University
    expect(screen.getByText('Qatar University · Area 9')).toBeInTheDocument()
    basemapClick(51.498, 25.684) // Al Khor — swaps without closing
    expect(screen.getByText(/Al Khor · Area 4/)).toBeInTheDocument()
    expect(screen.queryByText('Qatar University · Area 9')).not.toBeInTheDocument()
  })

  it('does nothing on a basemap click while the layer is off', () => {
    renderMap({ weatherStations: sampleWeatherStations, weatherForecast: sampleWeatherForecast })
    basemapClick(51.48, 25.38)
    expect(screen.queryByRole('button', { name: 'Close forecast panel' })).not.toBeInTheDocument()
  })

  it('X returns to the collapsed strip with the default location, and layer-off removes it all', () => {
    renderMap({ weatherStations: sampleWeatherStations, weatherForecast: sampleWeatherForecast })
    openWeather()
    basemapClick(51.48, 25.38)
    fireEvent.click(screen.getByRole('button', { name: 'Close forecast panel' }))
    expect(screen.getByRole('button', { name: 'Expand forecast panel' })).toBeInTheDocument()
    // Reopening from the chevron shows the seed-wide default location again.
    fireEvent.click(screen.getByRole('button', { name: 'Expand forecast panel' }))
    expect(screen.getByText('Doha, Qatar (+03:00)')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Hide weather layer' }))
    expect(screen.queryByRole('button', { name: /forecast panel/ })).not.toBeInTheDocument()
  })

  it('keeps the docked station drawer for marker clicks when NO forecast data is supplied', () => {
    renderMap({ weatherStations: sampleWeatherStations })
    openWeather()
    fireEvent.click(screen.getByRole('button', { name: /Weather station Qatar University/ }))
    expect(screen.getByRole('complementary', { name: 'Weather station Qatar University' })).toBeInTheDocument()
  })
})

describe('LiveMapView — weather selection dimming', () => {
  const otherMarkers = () =>
    screen.getAllByRole('button', { name: /^Weather station/ }).filter((el) => !/Qatar University/.test(el.getAttribute('aria-label') ?? ''))

  it('leaves every marker at full strength before any location is focused', () => {
    renderMap({ weatherStations: sampleWeatherStations, weatherForecast: sampleWeatherForecast })
    openWeather()
    for (const marker of screen.getAllByRole('button', { name: /^Weather station/ })) {
      expect(marker).not.toHaveAttribute('data-dimmed')
    }
  })

  it('dims every OTHER marker to 40% once the expanded panel focuses one station, and keeps the selected one full', () => {
    renderMap({ weatherStations: sampleWeatherStations, weatherForecast: sampleWeatherForecast })
    openWeather()
    fireEvent.click(screen.getByRole('button', { name: /Weather station Qatar University/ }))
    const selected = screen.getByRole('button', { name: /Weather station Qatar University/ })
    expect(selected).not.toHaveAttribute('data-dimmed')
    expect(otherMarkers().length).toBeGreaterThan(0)
    for (const marker of otherMarkers()) {
      expect(marker).toHaveAttribute('data-dimmed', '')
    }
  })

  it('restores every marker to 100% when the expanded panel is closed', () => {
    renderMap({ weatherStations: sampleWeatherStations, weatherForecast: sampleWeatherForecast })
    openWeather()
    fireEvent.click(screen.getByRole('button', { name: /Weather station Qatar University/ }))
    fireEvent.click(screen.getByRole('button', { name: 'Close forecast panel' }))
    for (const marker of screen.getAllByRole('button', { name: /^Weather station/ })) {
      expect(marker).not.toHaveAttribute('data-dimmed')
    }
  })
})
