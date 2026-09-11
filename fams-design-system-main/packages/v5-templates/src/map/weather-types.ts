import type { LngLat } from './MapPanel.types'
import { haversineKm } from './search/highlight-geo'

/**
 * weather-types.ts — the weather-monitoring vocabulary the map's station
 * layer, its overlay panel and the station drawer share (Figma section
 * 22:41486, "Weather Monitoring").
 *
 * Tier-2 product vocabulary lives here by design (repo rule 10): `@fams/ui-kit`
 * stays business-free, `@fams/v5-templates` is where a v5 product concept like
 * "weather station" is allowed to be named.
 *
 * The design system ships NO weather data and calls NO weather service. Every
 * value below is application data — the demo environment seeds it from
 * `uiConfig.map.weather`, a real deployment would bind an API. Nothing in this
 * module fetches (rule 8).
 */

/** One row of the "Forecast — Open-Meteo" hourly table (22:38014 §6). */
export interface WeatherForecastRow {
  /** Pre-formatted local time label, e.g. "Wed 14:00". Never a live clock. */
  time: string
  /** Air temperature, °C. */
  tempC: number
  /** Precipitation, mm. */
  precipitationMm: number
  /** Precipitation probability, whole percent (0-100). */
  precipitationChance: number
  /** Wind speed, km/h. */
  windKmh: number
}

/** One row of the "QMD official — 10 day" table (22:38014 §7). */
export interface WeatherDailyRow {
  /** Pre-formatted date label, e.g. "Tue 25 Aug". */
  date: string
  /** The official one-word (or short-phrase) outlook/warning level, e.g.
   *  "Hot" / "Fine" / "Rain Expected" / "Storm Warning". Application copy —
   *  the QMD grid's "Official Outlook" row also reads this to flag a
   *  rain/storm/thunder day in the destructive tone. */
  warning: string
  /** Daily minimum, °C. */
  minC: number
  /** Daily maximum, °C. */
  maxC: number
  /**
   * QMD's official daily rainfall total, mm (rain-first deployments — this
   * design system ships no weather data, a rainy-season seed populates it).
   * Optional and additive: omitted entirely, the QMD grid's Rain row falls
   * back to its existing "no data" dash rather than a blank/zero.
   */
  rainMm?: number
}

/** One point of the drawer's "Last 24 hours" trend (22:38014 §5). */
export interface WeatherTrendPoint {
  /** Pre-formatted hour label, e.g. "14:00" — the chart's x category. */
  time: string
  /** Air temperature, °C. `null` marks a gap the line should break at. */
  tempC: number | null
  /** Rainfall for the hour, mm. Optional — the Figma chart plots temp only. */
  rainfallMm?: number
}

/** The current-conditions block (22:38014 §4). Every field is optional: a
 *  station with no reading renders the grid's "no data" dashes rather than a
 *  blank or broken grid (UX-NOTES #6). */
export interface WeatherStationReading {
  tempC?: number
  humidityPct?: number
  /** Wind speed, km/h. */
  windKmh?: number
  /** Compass direction abbreviation, e.g. "ENE". Application data. */
  windDirection?: string
  /** Gust speed, km/h. */
  gustKmh?: number
  pressureHpa?: number
  visibilityKm?: number
  rainfallMm?: number
  /** Pre-formatted observation timestamp, e.g. "25/08/2026, 15:20". */
  readingAt?: string
}

/**
 * One weather station as every weather surface consumes it. Structurally the
 * `uiConfig.map.weather.stations[]` shape.
 */
export interface WeatherStationDatum {
  id: string
  /** Human-readable station name, e.g. "Qatar University". */
  name: string
  /** `[lng, lat]` — GeoJSON order, same as everything else under `map/`. */
  position: LngLat
  /** Zone/area label shown as the drawer's leading chip, e.g. "Area 9". */
  area?: string
  /**
   * Whether this station is currently in service. `false` is the fix-wave's
   * generic "Inactive station" contract: `WeatherStationDrawer` still shows
   * identity (name/area/coordinates) but renders a single "No recent data"
   * empty state for the readings grid, and forces the trend chart/forecast/
   * daily tables to their OWN existing empty states regardless of whatever
   * `reading`/`trend`/`forecast`/`daily` this datum happens to carry — a
   * seed author marking a station inactive need not also remember to empty
   * its data arrays. Omit (default `true`) for every station that reports
   * normally — fully backward compatible; nothing here names a specific
   * station, this is a per-record flag any station can carry.
   */
  active?: boolean
  /** The current observation. Omit entirely for a station that is not reporting. */
  reading?: WeatherStationReading
  /** The drawer's 24h trend series. */
  trend?: WeatherTrendPoint[]
  /** The drawer's hourly forecast table (48 rows in the reference data). */
  forecast?: WeatherForecastRow[]
  /** The drawer's 10-day official outlook table. */
  daily?: WeatherDailyRow[]
}

/**
 * The overlay layers the map's weather checkbox row toggles (19:25255).
 * `stations` is the marker layer itself; the other three are the raster-like
 * field overlays.
 */
export const WEATHER_OVERLAY_IDS = ['stations', 'rain-heatmap', 'clouds', 'precipitation'] as const
export type WeatherOverlayId = (typeof WEATHER_OVERLAY_IDS)[number]

/** The row's labels, in the designer's fixed left-to-right order (19:25255). */
export const WEATHER_OVERLAY_LABELS: Record<WeatherOverlayId, string> = {
  stations: 'Stations',
  'rain-heatmap': 'Rain Heat-map',
  clouds: 'Clouds',
  precipitation: 'Precipitation',
}

/** The row's default state: stations on, the field overlays off (19:25255). */
export const WEATHER_DEFAULT_OVERLAY_IDS: WeatherOverlayId[] = ['stations']

/* ── Forecast bottom panel (`uiConfig.map.weather.forecast`) ─────────────── */

/** The expanded panel's "About Location" rail. All copy pre-formatted
 *  application data — the DS renders it verbatim (rule 8). */
export interface WeatherForecastLocation {
  /** e.g. "Doha, Qatar (+03:00)". */
  label: string
  /** Pre-formatted coordinates line, e.g. "25.285° N, 51.531° E". */
  coordinates?: string
  sunrise?: string
  sunset?: string
  /** e.g. "10 m (33 ft)". */
  elevation?: string
}

/** One day column of the Open-Meteo hourly timeline: a day header plus the
 *  hour cells beneath it. `hours[].time` is the short in-day label ("08:00"). */
export interface WeatherForecastDay {
  /** Column header, e.g. "Sun 31 Aug". */
  day: string
  hours: WeatherForecastRow[]
}

/**
 * Everything the map's bottom forecast panel renders
 * (`uiConfig.map.weather.forecast`). Exactly two models by product decision:
 * Open-Meteo (hourly timeline) and QMD, the Qatar Meteorology Department's
 * official daily outlook. The DS ships none of this data and calls no
 * weather service — the demo seeds it, a deployment binds an API.
 */
export interface WeatherForecastPanelData {
  location?: WeatherForecastLocation
  /** The Open-Meteo tab's day columns. */
  openMeteo?: WeatherForecastDay[]
  /** The QMD tab's 10-day official outlook columns. */
  qmd?: WeatherDailyRow[]
}

/** The panel's two models, in tab order. */
export const WEATHER_FORECAST_MODELS = ['open-meteo', 'qmd'] as const
export type WeatherForecastModelId = (typeof WEATHER_FORECAST_MODELS)[number]
export const WEATHER_FORECAST_MODEL_LABELS: Record<WeatherForecastModelId, string> = {
  'open-meteo': 'Open-Meteo',
  qmd: 'QMD',
}

/* ── nearest-station lookup (map click → location weather) ───────────────── */

/**
 * The station nearest to a clicked map location, with the great-circle
 * distance in km (`haversineKm` from `search/highlight-geo` — one geometry,
 * not two). Pure computation over caller-supplied stations; returns `null`
 * for an empty set.
 */
export function nearestWeatherStation(
  position: LngLat,
  stations: WeatherStationDatum[],
): { station: WeatherStationDatum; distanceKm: number } | null {
  let best: { station: WeatherStationDatum; distanceKm: number } | null = null
  for (const station of stations) {
    const d = haversineKm(position, station.position)
    if (!best || d < best.distanceKm) best = { station, distanceKm: d }
  }
  return best
}

/**
 * The expanded bottom panel's data for one clicked LOCATION: the nearest
 * station's own hourly forecast regrouped into day columns and its official
 * daily outlook, with the About Location rail retitled to the station.
 * Falls back to the seed-wide `base` grids (and keeps its sunrise/sunset/
 * elevation, which stations don't carry) where the station has no data —
 * pure reshaping of caller-supplied data, nothing fetched (rule 8).
 *
 * Station forecast rows are "Wed 14:00"-style; the day columns group on the
 * prefix before the last space and keep the "14:00" tail as the hour label.
 */
export function stationForecastPanelData(
  station: WeatherStationDatum,
  base?: WeatherForecastPanelData,
): WeatherForecastPanelData {
  const days: WeatherForecastDay[] = []
  if (station.active !== false) {
    for (const row of station.forecast ?? []) {
      const at = row.time.lastIndexOf(' ')
      const day = at > 0 ? row.time.slice(0, at) : row.time
      const time = at > 0 ? row.time.slice(at + 1) : row.time
      const last = days[days.length - 1]
      if (last && last.day === day) last.hours.push({ ...row, time })
      else days.push({ day, hours: [{ ...row, time }] })
    }
  }
  const daily = station.active !== false ? (station.daily ?? []) : []
  const [lng, lat] = station.position
  return {
    location: {
      label: station.area ? `${station.name} · ${station.area}` : station.name,
      coordinates: `${lat.toFixed(3)}° N, ${lng.toFixed(3)}° E`,
      sunrise: base?.location?.sunrise,
      sunset: base?.location?.sunset,
      elevation: base?.location?.elevation,
    },
    openMeteo: days.length > 0 ? days : base?.openMeteo,
    qmd: daily.length > 0 ? daily : base?.qmd,
  }
}

/** The station's current temperature, or `undefined` when it is not reporting. */
export function stationTempC(station: WeatherStationDatum): number | undefined {
  const value = station.reading?.tempC
  return typeof value === 'number' && Number.isFinite(value) ? value : undefined
}

/** The marker's label: the rounded temperature with its degree glyph, or the
 *  no-data dash the reference uses for a station with no reading. */
export function stationMarkerLabel(station: WeatherStationDatum): string {
  const temp = stationTempC(station)
  return temp === undefined ? '–' : `${Math.round(temp)}°`
}

/** The station's current rainfall, mm, or `undefined` when it is not
 *  reporting — distinct from a real `0` (a dry/calm station). */
export function stationRainMm(station: WeatherStationDatum): number | undefined {
  const value = station.reading?.rainfallMm
  return typeof value === 'number' && Number.isFinite(value) ? value : undefined
}

/** The rain-first map marker's label (2026-08-31, UCCP Flood & Rain Water
 *  Management — the marker's headline reading is current rainfall, not
 *  temperature): the mm value to one decimal with a clean integer at whole
 *  numbers (`0`, not `0.0`), capped `"30+"` at/above the extreme threshold
 *  so an off-scale flood reading never overflows the capsule, or the
 *  reference's "–" dash for a station with no reading (sensor gap). */
export function stationRainMarkerLabel(station: WeatherStationDatum): string {
  const mm = stationRainMm(station)
  if (mm === undefined) return '–'
  if (mm >= RAIN_MARKER_CAP_MM) return `${RAIN_MARKER_CAP_MM}+`
  const rounded = Math.round(mm * 10) / 10
  return `${rounded}`
}

/** The rain marker's display cap — matches `weather-color.ts`'s `extreme`
 *  band floor, kept here (not imported) so `weather-types.ts` stays free of
 *  a dependency on the colour module for one shared constant. */
const RAIN_MARKER_CAP_MM = 30
