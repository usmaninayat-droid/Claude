import type { WeatherForecastPanelData, WeatherStationDatum } from './weather-types'

/**
 * weather-fixtures.ts — the small station set every weather test, axe fixture
 * and showcase demo renders. Shaped exactly like a slice of a real
 * `uiConfig.map.weather.stations`, one station per temperature band plus the
 * non-reporting case, so a surface is exercised across the whole colour scale
 * without a 40-station seed.
 */
export const sampleWeatherStations: WeatherStationDatum[] = [
  {
    id: 'qu',
    name: 'Qatar University',
    position: [51.479, 25.382],
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
      { time: 'Wed 15:00', tempC: 40.1, precipitationMm: 0, precipitationChance: 0, windKmh: 15 },
    ],
    daily: [
      { date: 'Tue 25 Aug', warning: 'Hot', minC: 33, maxC: 41 },
      { date: 'Wed 26 Aug', warning: 'Fine', minC: 32, maxC: 42 },
    ],
  },
  {
    id: 'al-khor',
    name: 'Al Khor',
    position: [51.498, 25.684],
    area: 'Area 4',
    reading: { tempC: 43.4, humidityPct: 31, windKmh: 11, windDirection: 'NW', readingAt: '25/08/2026, 15:18' },
  },
  {
    id: 'abu-samra',
    name: 'Abu Samra',
    position: [50.842, 24.749],
    area: 'Area 12',
    reading: { tempC: 47.1, humidityPct: 18, windKmh: 19, windDirection: 'W', readingAt: '25/08/2026, 15:15' },
  },
  {
    // No `reading` at all — the grey "–" marker and the dashed detail grid.
    // NOT `active: false` — this is the OLDER "some fields missing" contract
    // (a station still in service, just not reporting one value), distinct
    // from the fixture below.
    id: 'al-ruwais',
    name: 'Al Ruwais',
    position: [51.213, 26.132],
    area: 'Area 1',
  },
  {
    // `active: false` — the fix-wave's generic Inactive-station contract:
    // identity renders, every data section goes to its OWN "no data" empty
    // state regardless of the (deliberately populated, to prove they're
    // ignored) reading/trend/forecast/daily below.
    id: 'sealine',
    name: 'Sealine',
    position: [51.014, 24.783],
    area: 'Area 21',
    active: false,
    reading: { tempC: 41.2, humidityPct: 22, windKmh: 8, readingAt: '25/08/2026, 15:20' },
    trend: [{ time: '00:00', tempC: 30 }],
    forecast: [{ time: 'Wed 14:00', tempC: 40, precipitationMm: 0, precipitationChance: 0, windKmh: 10 }],
    daily: [{ date: 'Tue 25 Aug', warning: 'Hot', minC: 30, maxC: 41 }],
  },
]

/** The bottom forecast panel's fixture — shaped exactly like
 *  `uiConfig.map.weather.forecast` (two models: Open-Meteo hourly days,
 *  QMD 10-day outlook), trimmed to what a test needs. */
export const sampleWeatherForecast: WeatherForecastPanelData = {
  location: {
    label: 'Doha, Qatar (+03:00)',
    coordinates: '25.285° N, 51.531° E',
    sunrise: '5:12 AM',
    sunset: '5:58 PM',
    elevation: '10 m (33 ft)',
  },
  openMeteo: [
    {
      day: 'Sun 31 Aug',
      hours: [
        { time: '08:00', tempC: 33.4, precipitationMm: 0, precipitationChance: 0, windKmh: 9.2 },
        { time: '14:00', tempC: 40.8, precipitationMm: 0, precipitationChance: 5, windKmh: 14.6 },
        { time: '20:00', tempC: 35.1, precipitationMm: 0.4, precipitationChance: 45, windKmh: 22.3 },
      ],
    },
    {
      day: 'Mon 01 Sep',
      hours: [
        { time: '08:00', tempC: 32.9, precipitationMm: 0, precipitationChance: 0, windKmh: 8.1 },
        { time: '14:00', tempC: 41.2, precipitationMm: 0, precipitationChance: 0, windKmh: 12.4 },
        { time: '20:00', tempC: 34.6, precipitationMm: 0, precipitationChance: 10, windKmh: 26.8 },
      ],
    },
  ],
  qmd: [
    { date: 'Sun 31 Aug', warning: 'Hot', minC: 32.5, maxC: 41.4 },
    { date: 'Mon 01 Sep', warning: 'Fine', minC: 31.8, maxC: 40.2 },
    { date: 'Tue 02 Sep', warning: 'Rain Expected', minC: 30.4, maxC: 37.9 },
  ],
}
