import { resolveToken } from './color'
import type { WeatherStationDatum } from './weather-types'
import { stationRainMm, stationTempC } from './weather-types'

/**
 * weather-color.ts — the temperature → colour band scale the station markers,
 * the map legend and the rain overlay share.
 *
 * The bands come from the designer's reference (19:25255): comfortable-for-
 * Qatar-August greens, orange as the heat builds, red at the extreme, grey
 * for a station that is not reporting. They are expressed as SEMANTIC tokens
 * (`--color-success` / `--color-warning` / `--color-error` /
 * `--color-muted-foreground`) rather than picked hexes, so a tenant retheming
 * its status palette retints the weather layer for free.
 *
 * Resolution goes through `color.ts`'s `resolveToken` for the same reason
 * everything else under `map/` does: these values reach a MapLibre paint
 * expression and a DOM `background-color`, neither of which the caller can
 * hand a live `var(--…)` string to safely (see that file's header). The hex
 * literals below appear ONLY as `resolveToken` fallbacks, which is the
 * documented `lint:tokens` exemption.
 */

/** The band a temperature falls in. `unknown` = the station is not reporting. */
export type WeatherTempBand = 'mild' | 'hot' | 'extreme' | 'unknown'

/** Band boundaries in °C, from the designer's reference. A reading BELOW
 *  `hot` is `mild`; at or above `extreme` is `extreme`. */
export const WEATHER_TEMP_BAND_THRESHOLDS = { hot: 42, extreme: 46 } as const

/** The band's inclusive display range, for the legend's key. */
export const WEATHER_TEMP_BAND_RANGE: Record<Exclude<WeatherTempBand, 'unknown'>, string> = {
  mild: `Below ${WEATHER_TEMP_BAND_THRESHOLDS.hot}°C`,
  hot: `${WEATHER_TEMP_BAND_THRESHOLDS.hot}–${WEATHER_TEMP_BAND_THRESHOLDS.extreme - 1}°C`,
  extreme: `${WEATHER_TEMP_BAND_THRESHOLDS.extreme}°C and above`,
}

/** Which band a °C reading falls in. `undefined`/non-finite → `unknown`. */
export function temperatureBand(tempC: number | undefined | null): WeatherTempBand {
  if (typeof tempC !== 'number' || !isFinite(tempC)) return 'unknown'
  if (tempC >= WEATHER_TEMP_BAND_THRESHOLDS.extreme) return 'extreme'
  if (tempC >= WEATHER_TEMP_BAND_THRESHOLDS.hot) return 'hot'
  return 'mild'
}

/** The band's fill colour, resolved to a literal (see the header). */
export function temperatureBandColor(band: WeatherTempBand): string {
  switch (band) {
    case 'extreme':
      return resolveToken('--color-error', '#f04438')
    case 'hot':
      return resolveToken('--color-warning', '#f79009')
    case 'mild':
      return resolveToken('--color-success', '#12b76a')
    default:
      return resolveToken('--color-muted-foreground', '#667085')
  }
}

/** A station's marker colour — its reading's band, or the no-data grey. */
export function stationBandColor(station: WeatherStationDatum): string {
  return temperatureBandColor(temperatureBand(stationTempC(station)))
}

/**
 * The map legend's entries for the station layer (UX-NOTES #3: the colour
 * bands must be discoverable, not merely inferable — every marker already
 * carries its number as text, so this key is the second, redundant channel
 * rather than the only one).
 */
export function weatherLegendEntries(): Array<{ id: string; label: string; color: string }> {
  return [
    { id: 'mild', label: WEATHER_TEMP_BAND_RANGE.mild, color: temperatureBandColor('mild') },
    { id: 'hot', label: WEATHER_TEMP_BAND_RANGE.hot, color: temperatureBandColor('hot') },
    { id: 'extreme', label: WEATHER_TEMP_BAND_RANGE.extreme, color: temperatureBandColor('extreme') },
    { id: 'unknown', label: 'No reading', color: temperatureBandColor('unknown') },
  ]
}

/* ── rain (mm) scale — RAIN-FIRST markers (2026-08-31, UCCP Flood & Rain
 * Water Management) ─────────────────────────────────────────────────────
 *
 * The map marker's PRIMARY reading switches from air temperature to current
 * rainfall (mm) for this deployment: it is a flood/rain system, so "how much
 * is it raining right now, here" outranks "how hot is it" as the one number
 * a dispatcher glances at across ~40 stations. Temperature keeps its own
 * band/colour above for the surfaces that still show it (the expanded
 * forecast panel's rows) — this is an ADDITIONAL scale, not a replacement.
 *
 * Bands mirror `WeatherForecastPanel`'s existing mm legend pill/`rainTone`
 * (stops at 1.5/2/3/7/10/20/30, green→orange→red): `moderate` picks up at
 * the legend's "3" stop, `heavy` at its "10" stop, `extreme` at its "30"
 * stop (the panel's cap). `calm` covers 0 through drizzle/light (<3mm) as
 * ONE green band — the map marker is a small capsule, not the legend, so it
 * doesn't need drizzle/light told apart by colour; the number does that.
 */
export type RainBand = 'calm' | 'moderate' | 'heavy' | 'extreme' | 'unknown'

/** Band floors, mm. A reading below `moderate` is `calm`. */
export const RAIN_MM_BAND_THRESHOLDS = { moderate: 3, heavy: 10, extreme: 30 } as const

/** The band's inclusive display range, for a legend key. */
export const RAIN_MM_BAND_RANGE: Record<Exclude<RainBand, 'unknown'>, string> = {
  calm: `Below ${RAIN_MM_BAND_THRESHOLDS.moderate} mm`,
  moderate: `${RAIN_MM_BAND_THRESHOLDS.moderate}–${RAIN_MM_BAND_THRESHOLDS.heavy - 1} mm`,
  heavy: `${RAIN_MM_BAND_THRESHOLDS.heavy}–${RAIN_MM_BAND_THRESHOLDS.extreme - 1} mm`,
  extreme: `${RAIN_MM_BAND_THRESHOLDS.extreme} mm and above`,
}

/** Which band an mm/h reading falls in. `undefined`/non-finite → `unknown`
 *  (the "No reading" sensor-gap case — NEVER conflated with a real `0`). */
export function rainBand(mm: number | undefined | null): RainBand {
  if (typeof mm !== 'number' || !isFinite(mm)) return 'unknown'
  if (mm >= RAIN_MM_BAND_THRESHOLDS.extreme) return 'extreme'
  if (mm >= RAIN_MM_BAND_THRESHOLDS.heavy) return 'heavy'
  if (mm >= RAIN_MM_BAND_THRESHOLDS.moderate) return 'moderate'
  return 'calm'
}

/**
 * The band's fill colour, resolved to a literal (see the header). `extreme`
 * uses the darker `--color-destructive-emphasis` token (not a second
 * `--color-destructive`) so the storm-cell cap reads visibly darker than
 * plain `heavy` — "green low → dark red 30+" per the product spec, using
 * only tokens already in the palette rather than a one-off hex.
 */
export function rainBandColor(band: RainBand): string {
  switch (band) {
    case 'extreme':
      return resolveToken('--color-destructive-emphasis', '#d92d20')
    case 'heavy':
      return resolveToken('--color-destructive', '#f04438')
    case 'moderate':
      return resolveToken('--color-warning', '#f79009')
    case 'calm':
      return resolveToken('--color-success', '#12b76a')
    default:
      return resolveToken('--color-muted-foreground', '#667085')
  }
}

/** A station's marker colour — its current rainfall's band, or the no-data
 *  grey for a station that isn't reporting. */
export function stationRainBandColor(station: WeatherStationDatum): string {
  return rainBandColor(rainBand(stationRainMm(station)))
}
