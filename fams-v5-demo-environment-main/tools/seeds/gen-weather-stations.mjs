#!/usr/bin/env node
// gen-weather-stations.mjs — deterministic generator for the UCCP Live
// Monitoring "weather" map overlay (40 Qatar weather stations).
//
// Run: `node tools/seeds/gen-weather-stations.mjs` from the repo root.
// Splices the generated `{ enabled: true, stations: [...] }` object into
// tenants/uccp/modules/live-monitoring/blueprint.json at
// uiConfig.map.weather, matching this repo's convention of inlining map
// overlay data (zones/pois/places) directly in the blueprint rather than a
// separate seed file. Fixed PRNG seed — same output on every run, byte for
// byte. This is metadata tooling, not UI; the repo's metadata-only rule is
// unaffected.
//
// Also writes tenants/uccp/seeds/rain-sensors.seed.json (the "Weather
// Stations" entity module's 40 records), MERGE-SAFE onto whatever is
// already there — see the long comment at that write site. Do not assume
// this script alone reproduces that file; it has drifted from a pure
// derivation into a hand-curated superset (Weather Station detail-sheet
// data this script has no model of) on purpose.
//
// Consuming contract (design-system side, packages/v5-templates/map):
//   interface WeatherStationReading { tempC?; humidityPct?; windKmh?;
//     windDirection?; gustKmh?; pressureHpa?; visibilityKm?; rainfallMm?;
//     readingAt?: string }
//   interface WeatherTrendPoint { time: string; tempC: number | null;
//     rainfallMm?: number }
//   interface WeatherForecastRow { time; tempC; precipitationMm;
//     precipitationChance; windKmh }
//   interface WeatherDailyRow { date; warning; minC; maxC; rainMm? } — QMD's
//     daily rainfall total, ADDED 2026-08-31 (rain-first weather layer,
//     NEXT-weather-rain-data.md item 3): optional, additive.
//   interface WeatherStationDatum { id; name; position: [lng, lat]; area?;
//     reading?; trend?; forecast?; daily? }
//
// RAIN-FIRST (2026-08-31): the map marker's headline reading switched from
// temperature to `reading.rainfallMm` (mm) — this is a Flood & Rain Water
// Management system. See `RAIN_BAND_IDX` below for the rainy-season
// geographic distribution (a storm cell over the far-north coast, dry
// south) and every edge case it covers.

import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const BLUEPRINT = join(
  dirname(fileURLToPath(import.meta.url)),
  '../../tenants/uccp/modules/live-monitoring/blueprint.json',
);

/* ── deterministic PRNG ─────────────────────────────────────────────────── */
function mulberry32(seed) {
  let a = seed >>> 0;
  return function () {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const rand = mulberry32(0x51544157); // "QATW"
const rf = (min, max, dp = 1) => {
  const v = min + rand() * (max - min);
  const f = Math.pow(10, dp);
  return Math.round(v * f) / f;
};
const ri = (min, max) => min + Math.floor(rand() * (max - min + 1));
const pick = (arr) => arr[Math.floor(rand() * arr.length)];

/* ── station roster ─────────────────────────────────────────────────────── */
// [name, lng, lat, areaNumber]
const STATIONS = [
  ['Qatar University', 51.479, 25.382, 9],
  ['Hamad International Airport', 51.6086, 25.2731, 3],
  ['Al Khor', 51.4964, 25.6804, 5],
  ['Dukhan', 50.7822, 25.4147, 7],
  ['Mesaieed', 51.5493, 24.9925, 4],
  ['Al Wakrah', 51.6039, 25.1659, 4],
  ['Lusail', 51.4909, 25.4283, 1],
  ['Al Shamal', 51.2158, 26.1197, 11],
  ['Umm Salal', 51.4067, 25.4067, 6],
  ['Al Rayyan', 51.4244, 25.2919, 8],
  ['Abu Samra', 50.8378, 24.5686, 12],
  ['Ras Laffan', 51.5747, 25.912, 5],
  ['Doha Port', 51.5497, 25.2769, 3],
  ['Al Sadd', 51.5106, 25.2751, 2],
  ['Education City', 51.437, 25.3131, 9],
  ['Al Khaleej', 51.4783, 25.5028, 6],
  ['Madinat ash Shamal', 51.2497, 26.1319, 11],
  ['Al Ruwais', 51.2136, 26.1428, 11],
  ['Al Zubarah', 51.0261, 25.9789, 10],
  ['Simaisma', 51.5486, 25.4736, 6],
  ['Al Ghuwariyah', 51.3164, 25.6975, 5],
  ['Al Jumayliyah', 51.0703, 25.6122, 10],
  ['Umm Bab', 50.8064, 25.2136, 7],
  ['Al Karaanah', 51.0417, 25.0736, 12],
  ['Al Sheehaniya', 51.2497, 25.3742, 8],
  ['Wakrah South', 51.6136, 25.14, 4],
  ['Doha Corniche', 51.5322, 25.2919, 2],
  ['Al Thumama', 51.5311, 25.2311, 3],
  ['Al Wukair', 51.5644, 25.1264, 4],
  ['Barzan', 51.4344, 25.5211, 6],
  ['Fuwayrit', 51.3672, 25.8267, 5],
  ['Al Daayen', 51.4622, 25.4667, 1],
  ['Onaiza', 51.5083, 25.3444, 1],
  ['West Bay', 51.5303, 25.3319, 2],
  ['Industrial Area', 51.4581, 25.2028, 8],
  ['Al Khor Community', 51.5069, 25.6875, 5],
  ['Salwa Road', 51.35, 25.1667, 8],
  ['Umm Said', 51.5453, 24.9856, 4],
  ['Al Bidda', 51.5222, 25.2894, 2],
  ['Msheireb', 51.5278, 25.2867, 2],
];

if (STATIONS.length !== 40) {
  throw new Error(`expected 40 stations, got ${STATIONS.length}`);
}

const WIND_DIRS = ['N', 'NNE', 'NE', 'ENE', 'E', 'ESE', 'SE', 'SSE', 'S', 'SSW', 'SW', 'WSW', 'W', 'WNW', 'NW', 'NNW'];

// Temperature-band distribution across 40 stations, excluding the 2 no-data
// stations and the pinned Qatar University row (38.85 handled separately).
// Majority 37–41 (green), a good number 42–45 (orange), several >=46 (red).
function bandFor(i) {
  if (i < 20) return [37, 41]; // 20 green
  if (i < 32) return [42, 45]; // 12 orange
  return [46, 48.5]; // 6 red (indices 32..37 among readable stations)
}

const NO_DATA_IDX = new Set([17, 33]); // Al Ruwais, West Bay — grey "–" markers
const QATAR_UNIVERSITY_IDX = 0;

/* ── rain-first rainy-season distribution (2026-08-31, UCCP Flood & Rain
 * Water Management — NEXT-weather-rain-data.md) ─────────────────────────
 *
 * A single geographically-plausible storm system: the cell sits over the
 * far-north coast (Al Shamal / Madinat ash Shamal), a heavy ring of
 * north-coast stations surrounds it (Al Khor / Ras Laffan / Al Zubarah /
 * Fuwayrit), a moderate north-central fringe carries it toward the city,
 * light/drizzle reach central Doha, and the south/west stays dry — "the
 * map reads like a real radar day" per the spec. Every edge case the spec
 * calls out gets AT LEAST one station: extreme (30+), heavy (10-30),
 * moderate (3-10), light (1.5-3), drizzle (<1.5), dry (0), no-reading
 * (the existing `NO_DATA_IDX` sensor gaps, unchanged).
 *
 * Station indices below are into `STATIONS` (declared above); counts:
 * extreme 2, heavy 4, moderate 6, light 6, drizzle 8, dry 12, no-data 2 = 40.
 */
const RAIN_BAND_IDX = {
  extreme: new Set([7, 16]), // Al Shamal, Madinat ash Shamal — the storm core
  heavy: new Set([2, 11, 18, 30]), // Al Khor, Ras Laffan, Al Zubarah, Fuwayrit
  moderate: new Set([6, 15, 20, 29, 31, 35]), // Lusail…Al Khor Community — the fringe
  light: new Set([0, 8, 9, 12, 13, 19]), // Qatar University…Simaisma — reaching the city
  drizzle: new Set([1, 14, 24, 26, 27, 32, 38, 39]), // central Doha, trace rain
  // Everything else (12 stations, mostly south/west — Dukhan, Mesaieed, Al
  // Wakrah, Abu Samra, Al Jumayliyah, Umm Bab, Al Karaanah, Wakrah South,
  // Al Wukair, Industrial Area, Salwa Road, Umm Said) is `dry` by omission:
  // "some of the map must stay calm" per the spec.
};

function rainBandForIndex(i) {
  for (const [band, idxSet] of Object.entries(RAIN_BAND_IDX)) {
    if (idxSet.has(i)) return band;
  }
  return 'dry';
}

// mm/h range per band, and a wind bump for the extreme/flooding-level case
// ("high winds" per the spec) layered onto the station's own base wind.
const RAIN_BAND_MM_RANGE = {
  extreme: [30, 42],
  heavy: [10, 26],
  moderate: [3, 9.5],
  light: [1.5, 2.9],
  drizzle: [0.2, 1.4],
  dry: [0, 0],
};
const RAIN_BAND_WIND_BUMP_KMH = { extreme: [18, 32], heavy: [6, 14], moderate: [2, 6], light: [0, 2], drizzle: [0, 1], dry: [0, 0] };
const RAIN_BAND_WARNING = {
  extreme: 'Storm Warning',
  heavy: 'Heavy Rain Warning',
  moderate: 'Rain Expected',
  light: 'Light Showers',
  drizzle: 'Drizzle',
  dry: 'Fine',
};

function rainForBand(band) {
  const [min, max] = RAIN_BAND_MM_RANGE[band];
  return min === max ? min : rf(min, max, 1);
}
function windBumpForBand(band) {
  const [min, max] = RAIN_BAND_WIND_BUMP_KMH[band];
  return min === max ? min : rf(min, max, 1);
}

const DAY_ROLL = ['Wed', 'Thu', 'Fri', 'Sat', 'Sun', 'Mon', 'Tue'];
const DAILY_DATE_LABELS = [
  'Tue 25 Aug', 'Wed 26 Aug', 'Thu 27 Aug', 'Fri 28 Aug', 'Sat 29 Aug',
  'Sun 30 Aug', 'Mon 31 Aug', 'Tue 01 Sep', 'Wed 02 Sep', 'Thu 03 Sep',
];

// Rain peaks in the afternoon storm-build window (~13:00-17:00), same as
// the diurnal temperature peak — a rainy-season convective pattern, not
// scattered noise. `rainMm` is the station's CURRENT/headline reading (its
// band's representative intensity); the trend/forecast/daily tables scale
// around it rather than repeating one flat value everywhere.
function rainShapeAt(hour, rainMm) {
  if (rainMm <= 0) return 0;
  const phase = ((hour - 15 + 24) % 24) / 24; // 0 at the 15:00 peak
  const shape = Math.max(0, Math.cos(phase * 2 * Math.PI)); // 0 outside the rain window
  return rainMm * shape;
}

function buildTrend(peakTempC, rainMm) {
  const pts = [];
  for (let h = 0; h <= 24; h++) {
    // Diurnal curve: trough ~05:00 around 28-30C, peak ~15:00 at peakTempC.
    const phase = ((h - 15 + 24) % 24) / 24; // 0 at peak hour
    const shape = Math.cos(phase * 2 * Math.PI); // 1 at peak, -1 at trough
    const trough = 28.5 + rf(0, 1.5, 1);
    const tempC = Math.round((trough + (peakTempC - trough) * ((shape + 1) / 2)) * 10) / 10;
    const label = `${String(h).padStart(2, '0')}:00`;
    const rainfallMm = Math.round(rainShapeAt(h, rainMm) * 10) / 10;
    pts.push({ time: label, tempC, rainfallMm });
  }
  return pts;
}

function buildForecast(baseTempC, rainMm) {
  const rows = [];
  let dayIdx = 0, hour = 14; // "Wed 14:00" rolling start
  for (let i = 0; i < 48; i++) {
    const label = `${DAY_ROLL[dayIdx % DAY_ROLL.length]} ${String(hour).padStart(2, '0')}:00`;
    const phase = ((hour - 15 + 24) % 24) / 24;
    const shape = Math.cos(phase * 2 * Math.PI);
    const trough = 29 + rf(0, 1, 1);
    const tempC = Math.round((trough + (baseTempC - trough) * ((shape + 1) / 2)) * 100) / 100;
    const rainShape = rainShapeAt(hour, rainMm);
    const precipitationMm = rainShape > 0 ? Math.round(rainShape * (0.85 + rf(0, 0.3, 2)) * 100) / 100 : 0;
    // Chance spreads 0-100: scales with how much is falling, plus texture
    // so two hours with similar mm don't always read the same percent.
    const precipitationChance = precipitationMm > 0 ? Math.min(100, Math.round(35 + precipitationMm * 2.1 + ri(-8, 8))) : ri(0, 8);
    const windKmh = rf(4, 22, 2) + (rainShape > 0 ? rainShape * 0.6 : 0);
    rows.push({ time: label, tempC, precipitationMm, precipitationChance, windKmh: Math.round(windKmh * 100) / 100 });
    hour += 1;
    if (hour === 24) { hour = 0; dayIdx += 1; }
  }
  return rows;
}

function warningForRainMm(mm) {
  if (mm >= RAIN_BAND_MM_RANGE.extreme[0]) return RAIN_BAND_WARNING.extreme;
  if (mm >= RAIN_BAND_MM_RANGE.heavy[0]) return RAIN_BAND_WARNING.heavy;
  if (mm >= RAIN_BAND_MM_RANGE.moderate[0]) return RAIN_BAND_WARNING.moderate;
  if (mm > 0) return RAIN_BAND_WARNING.light;
  return null; // dry days keep the existing Hot/Fine outlook copy
}

function buildDaily(baseTempC, rainMm) {
  const rows = [];
  for (let i = 0; i < 10; i++) {
    const maxC = Math.round((baseTempC + rf(-1.5, 1.5, 1)) * 100) / 100;
    const minC = Math.round((maxC - rf(4, 8, 1)) * 100) / 100;
    // The station's own rain band tapers across the 10-day outlook (day 0 at
    // full intensity, trailing off) rather than repeating flat every day.
    const dayRainMm = rainMm > 0 ? Math.round(Math.max(0, rainMm * (1 - i * 0.09) + rf(-0.3, 0.3, 1)) * 10) / 10 : 0;
    const warning = warningForRainMm(dayRainMm) ?? (i === 3 || i === 7 ? 'Fine' : 'Hot');
    rows.push({ date: DAILY_DATE_LABELS[i], warning, minC, maxC: Math.max(maxC, minC + 1), rainMm: dayRainMm });
  }
  return rows;
}

function slugify(name) {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
}

const stations = STATIONS.map(([name, lng, lat, area], i) => {
  const id = `wx-${slugify(name)}`;
  const areaLabel = `Area ${area}`;

  if (NO_DATA_IDX.has(i)) {
    return { id, name, position: [lng, lat], area: areaLabel };
  }

  if (i === QATAR_UNIVERSITY_IDX) {
    // Qatar University keeps its fixed reference reading (pinned since the
    // 2026-08-25 seed, screenshot-stable) — LIGHT band per the rain-band map
    // above (reaching the city from the north storm system).
    const rainMm = rainForBand('light');
    const reading = {
      tempC: 38.85,
      humidityPct: 44.1,
      windKmh: 6.4,
      windDirection: 'ENE',
      gustKmh: 9.3,
      pressureHpa: 1000.4,
      visibilityKm: 16.48,
      rainfallMm: rainMm,
      readingAt: '25/08/2026, 15:20',
    };
    return {
      id, name, position: [51.479, 25.382], area: 'Area 9',
      reading,
      trend: buildTrend(38.85, rainMm),
      forecast: buildForecast(38.85, rainMm),
      daily: buildDaily(38.85, rainMm),
    };
  }

  const [bandMin, bandMax] = bandFor(i);
  const tempC = rf(bandMin, bandMax, 2);
  const rainBandName = rainBandForIndex(i);
  const rainMm = rainForBand(rainBandName);
  const windKmh = rf(3, 25, 1) + windBumpForBand(rainBandName);
  const gustKmh = Math.round((windKmh + rf(2, 8, 1) + (rainBandName === 'extreme' ? rf(6, 14, 1) : 0)) * 10) / 10;
  const minutes = (7 + i * 3) % 60;
  const reading = {
    tempC,
    humidityPct: rf(20, 75, 1),
    windKmh: Math.round(windKmh * 10) / 10,
    windDirection: pick(WIND_DIRS),
    gustKmh,
    pressureHpa: rf(995, 1010, 1),
    visibilityKm: rainBandName === 'extreme' ? rf(1, 4, 2) : rf(4, 20, 2), // flooding-level storm cuts visibility
    rainfallMm: rainMm,
    readingAt: `25/08/2026, 15:${String(minutes).padStart(2, '0')}`,
  };

  return {
    id, name, position: [lng, lat], area: areaLabel,
    reading,
    trend: buildTrend(tempC, rainMm),
    forecast: buildForecast(tempC, rainMm),
    daily: buildDaily(tempC, rainMm),
  };
});

/* ── bottom forecast panel (uiConfig.map.weather.forecast) ───────────────
 * The map's Open-Meteo / QMD timeline strip, shown while the weather layer
 * is on. Doha-region "About Location" rail + 10 deterministic day columns
 * per model, same PRNG stream as everything above (byte-for-byte stable).
 * Shape: @fams/v5-templates' WeatherForecastPanelData. */
const FORECAST_DAY_LABELS = [
  'Sun 31 Aug', 'Mon 01 Sep', 'Tue 02 Sep', 'Wed 03 Sep', 'Thu 04 Sep',
  'Fri 05 Sep', 'Sat 06 Sep', 'Sun 07 Sep', 'Mon 08 Sep', 'Tue 09 Sep',
];
/*
 * Per-day rain category for the bottom panel's 10-day sequence (the default
 * "About Location: Doha" view — distinct from the per-station arrays above,
 * same rainy-season scenario). Deliberately varied so the sequence alone
 * covers every edge case the spec calls out, including day 4's explicit
 * dry→storm→dry ARC within its own three hour samples (08:00 dry, 14:00
 * extreme/flooding-level, 20:00 back to dry) — the spec's "at least one day
 * transitioning dry→storm→dry".
 */
const FORECAST_DAY_CATEGORY = ['dry', 'drizzle', 'moderate', 'dry', 'storm', 'heavy', 'moderate', 'dry', 'light', 'dry'];

// mm range + chance range per category, for the 14:00 (peak) hour; 08:00/
// 20:00 taper toward dry except on the `storm` day, which explicitly returns
// to dry at both (the dry→storm→dry arc).
const FORECAST_CATEGORY_PEAK = {
  dry: { mm: [0, 0], chance: [0, 8] },
  drizzle: { mm: [0.2, 1.4], chance: [10, 25] },
  light: { mm: [1.5, 2.9], chance: [20, 40] },
  moderate: { mm: [3, 9.5], chance: [40, 65] },
  heavy: { mm: [10, 24], chance: [65, 85] },
  storm: { mm: [32, 44], chance: [90, 100] },
};

const openMeteo = FORECAST_DAY_LABELS.map((day, d) => {
  const category = FORECAST_DAY_CATEGORY[d];
  const peak = FORECAST_CATEGORY_PEAK[category];
  return {
    day,
    hours: [8, 14, 20].map((h) => {
      // Only the 14:00 sample carries the category's full intensity — 08:00
      // and 20:00 taper toward dry, and on the `storm` day they ARE dry
      // (the dry→storm→dry arc), never a lesser storm.
      const atPeak = h === 14;
      const precipitationMm = atPeak ? (peak.mm[0] === 0 ? 0 : rf(peak.mm[0], peak.mm[1], 2)) : category === 'storm' ? 0 : rf(0, peak.mm[1] * 0.25, 2);
      const precipitationChance = atPeak
        ? ri(peak.chance[0], peak.chance[1])
        : category === 'storm'
          ? ri(0, 8)
          : ri(Math.max(0, peak.chance[0] - 15), Math.max(5, Math.round(peak.chance[1] * 0.5)));
      return {
        time: `${String(h).padStart(2, '0')}:00`,
        tempC: rf(h === 14 ? (category === 'storm' || category === 'heavy' ? 33 : 38) : 31, h === 14 ? (category === 'storm' || category === 'heavy' ? 36 : 42.5) : 35),
        precipitationMm,
        precipitationChance,
        windKmh: rf(6, category === 'storm' ? 48 : category === 'heavy' ? 30 : 22),
      };
    }),
  };
});
const qmd = FORECAST_DAY_LABELS.map((date, d) => {
  const category = FORECAST_DAY_CATEGORY[d];
  const peak = FORECAST_CATEGORY_PEAK[category];
  const rainMm = peak.mm[0] === 0 && peak.mm[1] === 0 ? 0 : rf(peak.mm[0], peak.mm[1], 1);
  const rainy = category !== 'dry';
  const maxC = rf(rainy ? 34 : 38.5, rainy ? 39 : 42);
  return {
    date,
    warning: category === 'storm' ? 'Storm Warning' : category === 'heavy' ? 'Heavy Rain Warning' : rainy ? 'Rain Expected' : pick(['Hot', 'Fine', 'Hot']),
    minC: rf(30.5, 34.5),
    maxC,
    rainMm,
  };
});
const forecast = {
  location: {
    label: 'Doha, Qatar (+03:00)',
    coordinates: '25.285\u00b0 N, 51.531\u00b0 E',
    sunrise: '5:12 AM',
    sunset: '5:58 PM',
    elevation: '10 m (33 ft)',
  },
  openMeteo,
  qmd,
};

const weather = { enabled: true, stations, forecast };

const bp = JSON.parse(readFileSync(BLUEPRINT, 'utf8'));
if (!bp.uiConfig || !bp.uiConfig.map) {
  throw new Error('expected uiConfig.map to already exist in the blueprint');
}
bp.uiConfig.map.weather = weather;
writeFileSync(BLUEPRINT, JSON.stringify(bp, null, 2) + '\n');

console.log(`Wrote ${stations.length} weather stations into ${BLUEPRINT}`);
console.log(`No-data stations: ${[...NO_DATA_IDX].map((i) => STATIONS[i][0]).join(', ')}`);

/* ── Weather Stations entity module seed ─────────────────────────────────
 * Same-source contract (Part E): the `rain-sensors` module (display name
 * "Weather Stations") lists the SAME 40 stations as this map layer — derived
 * from the exact `stations` array above, never a second hand-authored list —
 * so the entity list and the map layer can never drift. `id` here follows the
 * module's own uidPrefix (RSN-01..RSN-40, 1-indexed by STATIONS order) rather
 * than the map layer's `wx-<slug>` id: two different id namespaces for the
 * same underlying station, matching how this repo already treats module
 * uidPrefixes as independent of map-layer feature ids elsewhere.
 */
const SEED = join(
  dirname(fileURLToPath(import.meta.url)),
  '../../tenants/uccp/seeds/rain-sensors.seed.json',
);

function fmtLastReading(s) {
  if (!s.reading) return '';
  return `${s.reading.readingAt} · ${s.reading.tempC}°C`;
}

function fmtWind(s) {
  if (!s.reading) return '';
  return `${s.reading.windKmh} km/h ${s.reading.windDirection}`;
}

/*
 * MERGE-SAFE write (2026-08-31): `rain-sensors.seed.json` has drifted well
 * past this generator's output — later commits (the Weather Station detail
 * sheet's full tab set: battery/signal/sensors tiles, device info, sensor
 * history, documents, timeline, Interactive Replay) hand-added dozens of
 * fields this script has never known how to produce, and a later commit
 * also moved `status` from Online/Offline to Active/Inactive. A blind
 * `stations.map(...)` overwrite — this script's ORIGINAL behaviour — would
 * silently delete every one of those fields and revert the status
 * vocabulary; that already happened to a prior agent. So: read whatever is
 * on disk, and for each station shallow-merge a FRESH `base` (exactly the
 * fields this generator legitimately owns — id/name/area/status/lat/lng,
 * the systemcol#/tile readings derived straight from `stations` above) onto
 * the EXISTING record, in that order, so every hand-curated field this
 * script doesn't know about survives untouched.
 */
const existingSeed = (() => {
  try {
    return JSON.parse(readFileSync(SEED, 'utf8'));
  } catch {
    return [];
  }
})();
const existingById = new Map(existingSeed.map((r) => [r.id, r]));

function fmtTile(value, unit) {
  return value === null || value === undefined ? '—' : `${value}${unit}`;
}

const seedRows = stations.map((s, i) => {
  const rsnId = `RSN-${String(i + 1).padStart(2, '0')}`;
  const online = !!s.reading;
  const base = {
    id: rsnId,
    uniqueidentifier: rsnId,
    title: s.name,
    systemcol1: s.area ?? '',
    status: online ? 'Active' : 'Inactive', // A25 vocabulary — see comment above
    systemcol2: online ? s.reading.tempC : null,
    systemcol3: online ? s.reading.humidityPct : null,
    systemcol4: online ? fmtWind(s) : '',
    systemcol5: online ? s.reading.pressureHpa : null,
    systemcol6: online ? s.reading.visibilityKm : null,
    systemcol7: online ? s.reading.rainfallMm : null,
    systemcol8: online ? fmtLastReading(s) : '',
    lat: s.position[1],
    lng: s.position[0],
    readingTempTile: online ? fmtTile(s.reading.tempC, '°C') : '—',
    readingHumidityTile: online ? fmtTile(s.reading.humidityPct, '%') : '—',
    readingWindTile: online ? fmtWind(s) : '—',
    readingPressureTile: online ? fmtTile(s.reading.pressureHpa, ' hPa') : '—',
    readingVisibilityTile: online ? fmtTile(s.reading.visibilityKm, ' km') : '—',
    // The rain-first tile (2026-08-31): same "— for no reading, clean
    // value otherwise" contract as the map marker/QMD grid.
    readingRainfallTile: online ? fmtTile(s.reading.rainfallMm, ' mm') : '—',
  };
  const existing = existingById.get(rsnId);
  return existing ? { ...existing, ...base } : base;
});

writeFileSync(SEED, JSON.stringify(seedRows, null, 2) + '\n');
console.log(`Wrote ${seedRows.length} weather-station rows into ${SEED} (merge-safe: ${existingSeed.length} existing records reconciled)`);
