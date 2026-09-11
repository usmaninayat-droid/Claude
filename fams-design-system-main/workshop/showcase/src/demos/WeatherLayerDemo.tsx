import { useState } from 'react'
import {
  MapOverlayLayersPanel,
  WeatherStationDrawer,
  WeatherStationMarker,
  WEATHER_OVERLAY_IDS,
  WEATHER_OVERLAY_LABELS,
  temperatureBand,
  weatherLegendEntries,
  type WeatherOverlayId,
  type WeatherStationDatum,
} from '@fams/v5-templates/map'
import { DocPage, DocSection, Prose, PropsTable, Gallery, Guidelines, A11yList, Code } from '../docs'

/**
 * Neutral demo stations — never real geography, matching the pattern every
 * other map demo in this showcase follows. One per temperature band plus the
 * non-reporting case, so the whole colour scale is on screen at once.
 */
const STATIONS: WeatherStationDatum[] = [
  {
    id: 's1',
    name: 'North Terminal',
    position: [10.05, 10.05],
    area: 'Area 9',
    reading: {
      tempC: 38.85,
      humidityPct: 44.1,
      windKmh: 6.4,
      windDirection: 'ENE',
      gustKmh: 9.3,
      pressureHpa: 1000.4,
      visibilityKm: 16.48,
      rainfallMm: 0,
      readingAt: '25/08/2026, 15:20',
    },
    trend: [
      { time: '00:00', tempC: 31.2 },
      { time: '04:00', tempC: 29.8 },
      { time: '08:00', tempC: 34.1 },
      { time: '12:00', tempC: 40.6 },
      { time: '16:00', tempC: 38.9 },
      { time: '20:00', tempC: 34.2 },
      { time: '24:00', tempC: 32.0 },
    ],
    forecast: [
      { time: 'Wed 14:00', tempC: 42.2, precipitationMm: 0, precipitationChance: 0, windKmh: 13.7 },
      { time: 'Wed 15:00', tempC: 40.1, precipitationMm: 0, precipitationChance: 0, windKmh: 15.0 },
      { time: 'Wed 16:00', tempC: 38.6, precipitationMm: 0, precipitationChance: 0, windKmh: 15.1 },
      { time: 'Wed 17:00', tempC: 37.2, precipitationMm: 0, precipitationChance: 0, windKmh: 14.8 },
    ],
    daily: [
      { date: 'Tue 25 Aug', warning: 'Hot', minC: 33, maxC: 41 },
      { date: 'Wed 26 Aug', warning: 'Hot', minC: 32, maxC: 42 },
      { date: 'Thu 27 Aug', warning: 'Fine', minC: 26, maxC: 45 },
    ],
  },
  { id: 's2', name: 'South Yard', position: [15.02, -4.98], area: 'Area 4', reading: { tempC: 43.4, humidityPct: 31, windKmh: 11, windDirection: 'NW', readingAt: '25/08/2026, 15:18' } },
  { id: 's3', name: 'West Depot', position: [8.1, 6.2], area: 'Area 12', reading: { tempC: 47.1, humidityPct: 18, windKmh: 19, windDirection: 'W', readingAt: '25/08/2026, 15:15' } },
  { id: 's4', name: 'East Outpost', position: [12.4, 3.3], area: 'Area 1' },
]

/**
 * WeatherLayerDemo — the weather monitoring layer's three pieces
 * (`MapOverlayLayersPanel`, `WeatherStationMarker`, `WeatherStationDrawer`)
 * shown standalone.
 *
 * Deliberately NOT mounted on a live map: `MapPanel`'s one-map guard means
 * only one map may exist per page, and `LiveMapView`'s demo already owns it.
 * The layer's map-side integration (the `weather` tool, the seeded field
 * overlays) is exercised there via `weatherStations`.
 */
export default function WeatherLayerDemo() {
  const [checkedIds, setCheckedIds] = useState<WeatherOverlayId[]>(['stations'])
  const [openId, setOpenId] = useState<string | null>('s1')
  const open = STATIONS.find((s) => s.id === openId) ?? null

  return (
    <DocPage
      title="Weather monitoring layer"
      badge="wip"
      summary="The live map's weather layer — colour-banded temperature station markers, a multi-select overlay checkbox row, and a docked station detail drawer (identity chips, current-conditions grid, 24h trend, hourly forecast + 10-day outlook tables). Ships from @fams/v5-templates/map; LiveMapView wires all of it from a single weatherStations prop."
    >
      <DocSection id="preview" title="Preview">
        <Prose>
          Toggle the overlays — each is independent, unlike the basemap <Code>MapLayersSwitcher</Code>,
          which is single-select. Click a marker to swap the drawer's contents in place. The drawer is
          docked, not modal: no scrim, no focus trap, so the map behind it stays live.
        </Prose>
        <div className="flex flex-col gap-4">
          <MapOverlayLayersPanel
            label="Weather overlays"
            entries={WEATHER_OVERLAY_IDS.map((id) => ({ id, label: WEATHER_OVERLAY_LABELS[id] }))}
            checkedIds={checkedIds}
            onToggle={(id) =>
              setCheckedIds((prev) =>
                prev.includes(id as WeatherOverlayId)
                  ? prev.filter((x) => x !== id)
                  : [...prev, id as WeatherOverlayId],
              )
            }
            meta="40 stations · 15:20"
            onRefresh={() => {}}
          />
          <div className="flex items-start gap-8">
            <div className="flex flex-wrap items-center gap-6 p-4">
              {STATIONS.map((station) => (
                <WeatherStationMarker
                  key={station.id}
                  station={station}
                  selected={station.id === openId}
                  onClick={() => setOpenId(station.id === openId ? null : station.id)}
                />
              ))}
            </div>
            <div className="h-[40rem] overflow-hidden rounded-md border border-border">
              <WeatherStationDrawer station={open} onClose={() => setOpenId(null)} />
            </div>
          </div>
        </div>
      </DocSection>

      <DocSection id="gallery" title="Gallery">
        <Gallery
          items={[
            ...STATIONS.map((station) => ({
              label: `${temperatureBand(station.reading?.tempC)} — ${station.name}`,
              node: <WeatherStationMarker station={station} />,
            })),
            {
              label: 'selected',
              node: <WeatherStationMarker station={STATIONS[0]} selected />,
            },
          ]}
        />
        <Prose>
          The band key the map paints beside the markers, so the colour scale is discoverable rather
          than merely inferable:
        </Prose>
        <ul className="flex flex-wrap gap-4">
          {weatherLegendEntries().map((entry) => (
            <li key={entry.id} className="flex items-center gap-2 text-body-sm text-muted-foreground">
              <span aria-hidden="true" className="size-3 rounded-full" style={{ backgroundColor: entry.color }} />
              {entry.label}
            </li>
          ))}
        </ul>
      </DocSection>

      <DocSection id="props" title="Props">
        <Prose>
          <Code>LiveMapView</Code>'s weather props — supplying <Code>weatherStations</Code> is what
          makes the whole layer available:
        </Prose>
        <PropsTable
          rows={[
            { prop: 'weatherStations', type: 'WeatherStationDatum[]', description: 'The stations to plot (uiConfig.map.weather.stations). Omit and nothing weather-related renders. Always application data — the DS ships no weather feed and calls no weather service.' },
            { prop: 'weatherOverlayIds', type: 'WeatherOverlayId[]', description: 'Controlled overlay set (stations | rain-heatmap | clouds | precipitation). Omit to run uncontrolled from WEATHER_DEFAULT_OVERLAY_IDS.' },
            { prop: 'onWeatherOverlayToggle', type: '(id: WeatherOverlayId) => void', description: 'An overlay checkbox was toggled.' },
            { prop: 'selectedStationId', type: 'string | null', description: 'Controlled open station (its drawer). Omit for uncontrolled.' },
            { prop: 'onStationSelect', type: '(id: string | null) => void', description: 'A station marker was clicked (null closes).' },
          ]}
        />
        <Prose>
          <Code>MapOverlayLayersPanel</Code>:
        </Prose>
        <PropsTable
          rows={[
            { prop: 'entries', type: 'MapOverlayLayerEntry[]', required: true, description: '{ id, label, disabled?, hint? } — generic, so nothing about weather is named in the component.' },
            { prop: 'checkedIds', type: 'string[]', required: true, description: 'Ids currently checked. Controlled — the caller owns this state (rule 8).' },
            { prop: 'onToggle', type: '(id: string) => void', required: true, description: 'One entry was toggled. Independent, never mutually exclusive.' },
            { prop: 'label', type: 'string', description: 'Accessible name of the group. Default "Map overlays".' },
            { prop: 'meta', type: 'string', description: 'Optional trailing status text, e.g. "40 stations · 15:20". Off by default — the Figma row ends at its last checkbox.' },
            { prop: 'onRefresh', type: '() => void', description: 'Renders a refresh control after meta.' },
          ]}
        />
        <Prose>
          <Code>WeatherStationDrawer</Code> and <Code>WeatherStationMarker</Code>:
        </Prose>
        <PropsTable
          rows={[
            { prop: 'station', type: 'WeatherStationDatum | null', required: true, description: 'Drawer: the station to show; null renders nothing, so the caller need not branch. Marker: the station to plot.' },
            { prop: 'onClose', type: '() => void', required: true, description: 'Drawer: close intent (× button or Escape).' },
            { prop: 'width', type: 'string', description: 'Drawer width (CSS length). Defaults to the design’s 550px.' },
            { prop: 'selected', type: 'boolean', description: 'Marker: emphasises the station whose drawer is open.' },
            { prop: 'onClick', type: '() => void', description: 'Marker: click intent.' },
          ]}
        />
      </DocSection>

      <DocSection id="guidelines" title="Guidelines">
        <Guidelines
          dos={[
            'Bind stations from the module blueprint (uiConfig.map.weather) and pass them to LiveMapView — the layer is config-driven, not a per-tenant fork.',
            'Keep the temperature inside every marker: the number is the primary channel and the band colour is the redundant one.',
            'Give a station with no current observation no reading field at all — the marker and the drawer both have a designed no-data state.',
            'Let each forecast table scroll inside its own bounded region; never crush the columns to fit the 550px panel.',
          ]}
          donts={[
            'Don’t merge this with MapLayersSwitcher — that control is single-select and picks the basemap STYLE; this one is multi-select and picks which DATA layers paint over it.',
            'Don’t run the stations through the marker/supercluster pipeline — a fixed ~40-station network is meant to stay individually readable at every zoom.',
            'Don’t add a second y-axis for rainfall on the 24h trend. The design is temperature-only, and a dual-axis line chart is unreadable by construction.',
            'Don’t call a weather service. Readings, forecasts and outlooks are seeded application data; the rain/cloud/precipitation washes are a deterministic seeded field.',
          ]}
        />
      </DocSection>

      <DocSection id="accessibility" title="Accessibility">
        <A11yList
          items={[
            'Every marker is a real button named "Weather station {name}, {reading}" and carries aria-pressed for the open station.',
            'Temperature is never colour alone — the value is text inside the marker, and the map paints a band key beside the layer.',
            'The overlay row is a fieldset/legend checkbox group; each label is inside its control, so the hit area is the full label, not the glyph.',
            'A station with no reading renders an em dash per field rather than a blank grid, and each empty section states why it is empty.',
            'The drawer is a labelled complementary region, not a dialog: no focus trap and no scrim, because the map behind it stays interactive by design. Escape still closes it.',
            'The 24h trend renders as SVG rather than canvas, so its text stays crisp and the chart is inspectable by assistive tech.',
          ]}
        />
      </DocSection>
    </DocPage>
  )
}
