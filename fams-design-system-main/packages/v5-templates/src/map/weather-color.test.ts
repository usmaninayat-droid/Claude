import { describe, expect, it } from 'vitest'
import {
  RAIN_MM_BAND_THRESHOLDS,
  WEATHER_TEMP_BAND_THRESHOLDS,
  rainBand,
  rainBandColor,
  stationBandColor,
  stationRainBandColor,
  temperatureBand,
  temperatureBandColor,
  weatherLegendEntries,
} from './weather-color'
import { stationMarkerLabel, stationRainMarkerLabel, stationRainMm, stationTempC } from './weather-types'
import { sampleWeatherStations } from './weather-fixtures'

/**
 * weather-color.test.ts — the temperature band scale (19:25255). The bands
 * are the one piece of the weather layer with a real decision boundary, so
 * they are pinned at their edges, not just in the middle of each range.
 */
describe('temperatureBand', () => {
  it('bands a reading below the hot threshold as mild', () => {
    expect(temperatureBand(38.85)).toBe('mild')
    expect(temperatureBand(WEATHER_TEMP_BAND_THRESHOLDS.hot - 0.01)).toBe('mild')
  })

  it('is inclusive at the hot boundary', () => {
    expect(temperatureBand(WEATHER_TEMP_BAND_THRESHOLDS.hot)).toBe('hot')
    expect(temperatureBand(WEATHER_TEMP_BAND_THRESHOLDS.extreme - 0.01)).toBe('hot')
  })

  it('is inclusive at the extreme boundary', () => {
    expect(temperatureBand(WEATHER_TEMP_BAND_THRESHOLDS.extreme)).toBe('extreme')
    expect(temperatureBand(58)).toBe('extreme')
  })

  it('treats a missing or non-finite reading as unknown, never as 0°C', () => {
    expect(temperatureBand(undefined)).toBe('unknown')
    expect(temperatureBand(null)).toBe('unknown')
    expect(temperatureBand(Number.NaN)).toBe('unknown')
    expect(temperatureBand(Number.POSITIVE_INFINITY)).toBe('unknown')
  })
})

describe('temperatureBandColor', () => {
  it('gives every band its own colour', () => {
    const colors = (['mild', 'hot', 'extreme', 'unknown'] as const).map(temperatureBandColor)
    expect(new Set(colors).size).toBe(4)
  })

  it('resolves a station with no reading to the unknown colour', () => {
    const station = sampleWeatherStations.find((s) => s.id === 'al-ruwais')!
    expect(stationBandColor(station)).toBe(temperatureBandColor('unknown'))
  })
})

describe('weatherLegendEntries', () => {
  it('keys all four bands, so the scale is discoverable and not colour-alone', () => {
    const entries = weatherLegendEntries()
    expect(entries.map((e) => e.id)).toEqual(['mild', 'hot', 'extreme', 'unknown'])
    expect(entries.every((e) => e.label.length > 0)).toBe(true)
  })
})

describe('station label helpers', () => {
  it('rounds the reading and appends the degree glyph', () => {
    expect(stationMarkerLabel(sampleWeatherStations[0])).toBe('39°')
  })

  it('shows the reference dash for a station with no reading', () => {
    const station = sampleWeatherStations.find((s) => s.id === 'al-ruwais')!
    expect(stationTempC(station)).toBeUndefined()
    expect(stationMarkerLabel(station)).toBe('–')
  })
})

/**
 * rainBand / rainBandColor — the rain-first marker scale (2026-08-31). Same
 * boundary-pinning discipline as the temperature suite above: this scale has
 * three real decision edges (moderate/heavy/extreme).
 */
describe('rainBand', () => {
  it('bands 0 and everything below the moderate threshold as calm', () => {
    expect(rainBand(0)).toBe('calm')
    expect(rainBand(RAIN_MM_BAND_THRESHOLDS.moderate - 0.01)).toBe('calm')
  })

  it('is inclusive at the moderate boundary', () => {
    expect(rainBand(RAIN_MM_BAND_THRESHOLDS.moderate)).toBe('moderate')
    expect(rainBand(RAIN_MM_BAND_THRESHOLDS.heavy - 0.01)).toBe('moderate')
  })

  it('is inclusive at the heavy boundary', () => {
    expect(rainBand(RAIN_MM_BAND_THRESHOLDS.heavy)).toBe('heavy')
    expect(rainBand(RAIN_MM_BAND_THRESHOLDS.extreme - 0.01)).toBe('heavy')
  })

  it('is inclusive at the extreme boundary and stays extreme far past it', () => {
    expect(rainBand(RAIN_MM_BAND_THRESHOLDS.extreme)).toBe('extreme')
    expect(rainBand(80)).toBe('extreme')
  })

  it('treats a missing or non-finite reading as unknown ("No reading"), never as 0mm', () => {
    expect(rainBand(undefined)).toBe('unknown')
    expect(rainBand(null)).toBe('unknown')
    expect(rainBand(Number.NaN)).toBe('unknown')
    expect(rainBand(Number.POSITIVE_INFINITY)).toBe('unknown')
  })
})

describe('rainBandColor', () => {
  it('gives every band its own colour, including a darker extreme than heavy', () => {
    const colors = (['calm', 'moderate', 'heavy', 'extreme', 'unknown'] as const).map(rainBandColor)
    expect(new Set(colors).size).toBe(5)
  })

  it('resolves a station with no reading to the unknown colour', () => {
    const station = sampleWeatherStations.find((s) => s.id === 'al-ruwais')!
    expect(stationRainBandColor(station)).toBe(rainBandColor('unknown'))
  })

  it('resolves a dry (0mm) station to the calm colour, not unknown', () => {
    const station = sampleWeatherStations[0] // Qatar University, rainfallMm: 0
    expect(stationRainMm(station)).toBe(0)
    expect(stationRainBandColor(station)).toBe(rainBandColor('calm'))
  })
})

describe('rain marker label', () => {
  it('renders a dry 0mm station cleanly, not "0.0"', () => {
    expect(stationRainMarkerLabel(sampleWeatherStations[0])).toBe('0')
  })

  it('caps an off-scale flood reading at "30+"', () => {
    const station = { ...sampleWeatherStations[0], reading: { ...sampleWeatherStations[0].reading!, rainfallMm: 46.8 } }
    expect(stationRainMarkerLabel(station)).toBe('30+')
  })

  it('shows the exact value just under the cap', () => {
    const station = { ...sampleWeatherStations[0], reading: { ...sampleWeatherStations[0].reading!, rainfallMm: 12.34 } }
    expect(stationRainMarkerLabel(station)).toBe('12.3')
  })

  it('shows the reference dash for a station with no reading', () => {
    const station = sampleWeatherStations.find((s) => s.id === 'al-ruwais')!
    expect(stationRainMm(station)).toBeUndefined()
    expect(stationRainMarkerLabel(station)).toBe('–')
  })
})
