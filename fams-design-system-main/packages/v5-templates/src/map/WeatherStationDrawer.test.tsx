import { describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen } from '@testing-library/react'
import { WeatherStationDrawer } from './WeatherStationDrawer'
import { WeatherStationMarker } from './WeatherStationMarker'
import { MapOverlayLayersPanel } from './chrome/MapOverlayLayersPanel'
import { currentConditionRows, nowBandMarkArea, stationCoordinates, NO_VALUE } from './WeatherStationDrawerParts'
import { WEATHER_OVERLAY_IDS, WEATHER_OVERLAY_LABELS } from './weather-types'
import { sampleWeatherStations } from './weather-fixtures'

const [QU, , , NO_DATA, INACTIVE] = sampleWeatherStations

describe('WeatherStationDrawer', () => {
  it('renders nothing with no station, so the caller need not branch', () => {
    const { container } = render(<WeatherStationDrawer station={null} onClose={vi.fn()} />)
    expect(container).toBeEmptyDOMElement()
  })

  it('shows the station identity, its conditions and both forecast tables', () => {
    render(<WeatherStationDrawer station={QU} onClose={vi.fn()} />)
    expect(screen.getByRole('heading', { name: 'Qatar University' })).toBeInTheDocument()
    expect(screen.getByText('Area 9')).toBeInTheDocument()
    expect(screen.getByText(stationCoordinates(QU))).toBeInTheDocument()
    expect(screen.getByText('38.85 °C')).toBeInTheDocument()
    expect(screen.getByText('6.4 ENE')).toBeInTheDocument()
    expect(screen.getByText('Forecast — Open-Meteo')).toBeInTheDocument()
    expect(screen.getByText('QMD official — 10 day')).toBeInTheDocument()
  })

  it('is a docked region, not a modal dialog — the map stays live behind it', () => {
    render(<WeatherStationDrawer station={QU} onClose={vi.fn()} />)
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(screen.getByRole('complementary', { name: 'Weather station Qatar University' })).toBeInTheDocument()
  })

  it('closes on the × button', () => {
    const onClose = vi.fn()
    render(<WeatherStationDrawer station={QU} onClose={onClose} />)
    fireEvent.click(screen.getByRole('button', { name: 'Close Qatar University details' }))
    expect(onClose).toHaveBeenCalledTimes(1)
  })

  it('closes on Escape', () => {
    const onClose = vi.fn()
    render(<WeatherStationDrawer station={QU} onClose={onClose} />)
    fireEvent.keyDown(document, { key: 'Escape' })
    expect(onClose).toHaveBeenCalledTimes(1)
  })

  it('dashes every absent field for a non-reporting station instead of going blank', () => {
    render(<WeatherStationDrawer station={NO_DATA} onClose={vi.fn()} />)
    expect(screen.getByRole('heading', { name: 'Al Ruwais' })).toBeInTheDocument()
    expect(screen.getAllByText(NO_VALUE).length).toBe(8)
    expect(screen.getByText('No readings recorded in the last 24 hours.')).toBeInTheDocument()
    expect(screen.getByText('No hourly forecast for this station.')).toBeInTheDocument()
    expect(screen.getByText('No official outlook for this station.')).toBeInTheDocument()
  })

  describe('Inactive station (active: false) — generic no-data mode', () => {
    it('still shows identity (name, area, coordinates) — only the data sections change', () => {
      render(<WeatherStationDrawer station={INACTIVE} onClose={vi.fn()} />)
      expect(screen.getByRole('heading', { name: 'Sealine' })).toBeInTheDocument()
      expect(screen.getByText('Area 21')).toBeInTheDocument()
      expect(screen.getByText(stationCoordinates(INACTIVE))).toBeInTheDocument()
    })

    it('renders ONE "No recent data" notice instead of the 8-field readings grid', () => {
      render(<WeatherStationDrawer station={INACTIVE} onClose={vi.fn()} />)
      expect(screen.getByText('No recent data')).toBeInTheDocument()
      // Not the dashed-grid contract — no per-field dashes for this station.
      expect(screen.queryAllByText(NO_VALUE)).toHaveLength(0)
      expect(screen.queryByText('Temp')).not.toBeInTheDocument()
    })

    it('forces the trend chart, forecast and daily tables to their OWN empty states, even though this fixture deliberately carries populated data for all three', () => {
      render(<WeatherStationDrawer station={INACTIVE} onClose={vi.fn()} />)
      expect(screen.getByText('No readings recorded in the last 24 hours.')).toBeInTheDocument()
      expect(screen.getByText('No hourly forecast for this station.')).toBeInTheDocument()
      expect(screen.getByText('No official outlook for this station.')).toBeInTheDocument()
    })

    it('an active station (the default — active omitted) is completely unaffected', () => {
      render(<WeatherStationDrawer station={QU} onClose={vi.fn()} />)
      expect(screen.queryByText('No recent data')).not.toBeInTheDocument()
      expect(screen.getByText('38.85 °C')).toBeInTheDocument()
    })
  })
})

describe('currentConditionRows', () => {
  it('keeps the designer\'s eight labels in reading order', () => {
    expect(currentConditionRows(QU.reading).map(([label]) => label)).toEqual([
      'Temp',
      'Humidity',
      'Wind',
      'Gust',
      'Pressure',
      'Visibility',
      'Rainfall',
      'Reading',
    ])
  })

  it('omits the direction when only a wind speed is known', () => {
    expect(currentConditionRows({ windKmh: 6.4 })[2][1]).toBe('6.4')
  })
})

describe('nowBandMarkArea', () => {
  it('brackets the hour of the current reading', () => {
    const band = nowBandMarkArea(['00:00', '04:00', '08:00'], '04:00')
    expect(band?.data[0][0]).toEqual({ xAxis: '00:00' })
    expect(band?.data[0][1]).toEqual({ xAxis: '08:00' })
  })

  it('clamps at the ends rather than reading off the array', () => {
    const band = nowBandMarkArea(['00:00', '04:00'], '00:00')
    expect(band?.data[0][0]).toEqual({ xAxis: '00:00' })
  })

  it('returns null when the reading time is not plotted', () => {
    expect(nowBandMarkArea(['00:00'], '13:00')).toBeNull()
    expect(nowBandMarkArea(['00:00'], undefined)).toBeNull()
  })
})

describe('WeatherStationMarker', () => {
  it('carries the rainfall (mm) as text — the rain-first marker (2026-08-31) — so colour is never the only channel', () => {
    render(<WeatherStationMarker station={QU} />)
    // QU's fixture reading is `rainfallMm: 0` — a dry/calm station, band 'calm'.
    const button = screen.getByRole('button', { name: 'Weather station Qatar University, 0 mm rain' })
    expect(button).toHaveTextContent('0')
    expect(button).not.toHaveTextContent('39°')
    expect(button).toHaveAttribute('data-band', 'calm')
  })

  it('shows the no-data dash and the unknown band for a station with no reading', () => {
    render(<WeatherStationMarker station={NO_DATA} />)
    const button = screen.getByRole('button', { name: 'Weather station Al Ruwais, no reading' })
    expect(button).toHaveTextContent('–')
    expect(button).toHaveAttribute('data-band', 'unknown')
  })

  it('reports its selection and its click', () => {
    const onClick = vi.fn()
    render(<WeatherStationMarker station={QU} selected onClick={onClick} />)
    const button = screen.getByRole('button', { name: /Qatar University/ })
    expect(button).toHaveAttribute('aria-pressed', 'true')
    fireEvent.click(button)
    expect(onClick).toHaveBeenCalledTimes(1)
  })

  it('names the station on hover', () => {
    render(<WeatherStationMarker station={QU} />)
    fireEvent.mouseEnter(screen.getByRole('button', { name: /Qatar University/ }))
    expect(screen.getByRole('tooltip')).toHaveTextContent('Qatar University')
  })
})

describe('MapOverlayLayersPanel', () => {
  const entries = WEATHER_OVERLAY_IDS.map((id) => ({ id, label: WEATHER_OVERLAY_LABELS[id] }))

  it('renders the designer\'s four overlays in order as INDEPENDENT checkboxes', () => {
    render(<MapOverlayLayersPanel entries={entries} checkedIds={['stations']} onToggle={vi.fn()} />)
    const boxes = screen.getAllByRole('checkbox')
    expect(boxes).toHaveLength(4)
    expect(screen.getByRole('group', { name: 'Map overlays' })).toBeInTheDocument()
    expect(screen.getByRole('checkbox', { name: 'Stations' })).toBeChecked()
    expect(screen.getByRole('checkbox', { name: 'Rain Heat-map' })).not.toBeChecked()
    // Radios would be mutually exclusive — these must not be.
    expect(screen.queryAllByRole('radio')).toHaveLength(0)
  })

  it('toggles by id, including via the label text (the full hit area)', () => {
    const onToggle = vi.fn()
    render(<MapOverlayLayersPanel entries={entries} checkedIds={['stations']} onToggle={onToggle} />)
    fireEvent.click(screen.getByText('Clouds'))
    expect(onToggle).toHaveBeenCalledWith('clouds')
  })

  it('renders the optional meta and refresh affordances only when asked', () => {
    const onRefresh = vi.fn()
    const { rerender } = render(<MapOverlayLayersPanel entries={entries} checkedIds={[]} onToggle={vi.fn()} />)
    expect(screen.queryByRole('button', { name: 'Refresh overlay data' })).not.toBeInTheDocument()
    rerender(
      <MapOverlayLayersPanel entries={entries} checkedIds={[]} onToggle={vi.fn()} meta="40 stations · 15:20" onRefresh={onRefresh} />,
    )
    expect(screen.getByText('40 stations · 15:20')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Refresh overlay data' }))
    expect(onRefresh).toHaveBeenCalledTimes(1)
  })

  it('renders nothing for an empty entry list', () => {
    const { container } = render(<MapOverlayLayersPanel entries={[]} checkedIds={[]} onToggle={vi.fn()} />)
    expect(container).toBeEmptyDOMElement()
  })
})
