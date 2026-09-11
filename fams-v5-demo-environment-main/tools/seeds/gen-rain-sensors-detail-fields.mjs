#!/usr/bin/env node
// gen-rain-sensors-detail-fields.mjs — adds the Weather Station detail
// sheet's ADDITIVE record fields to the existing 40-record rain-sensors
// seed (tenants/uccp/seeds/rain-sensors.seed.json), in place.
//
// Every field here is consumed by a GENERIC v5-templates tab component via
// field-key indirection (OverviewWidgets/EventsOverview/EntityCardHistory/
// DocumentsList/ActivityCommentFeed) — see
// tenants/uccp/modules/rain-sensors/blueprint.json's `uiConfig.profile`.
// Nothing already on the record is touched or removed; this only ADDS keys
// the profile's new tabs read. Mirrors the tanker/live-monitoring sibling
// script (gen-uccp-detail-fields.mjs) for the same reasons: deterministic,
// index-seeded, idempotent.
//
// Run: `node tools/seeds/gen-rain-sensors-detail-fields.mjs` from the demo
// repo root. Re-run after `node tools/seeds/gen-weather-stations.mjs` if
// the base station roster ever changes, since that script rewrites the
// seed's core columns (title/status/systemcol*) from scratch.

import { readFileSync, writeFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const SEED = join(dirname(fileURLToPath(import.meta.url)), '../../tenants/uccp/seeds/rain-sensors.seed.json')
const records = JSON.parse(readFileSync(SEED, 'utf8'))

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
const SENSOR_MAKES = ['Vaisala', 'Campbell Scientific', 'Davis Instruments', 'Gill Instruments']
const SENSOR_MODELS = ['WXT536', 'CS215', 'Vantage Pro2', 'MaxiMet GMX200']
const NOTE_AUTHORS = ['Rashid Al-Emadi', 'Khalid Al-Mansoori', 'Fahad Al-Kuwari', 'Hamad Al-Kubaisi']
const NOTES = [
  'Recalibrated rain gauge tipping bucket.',
  'Cleared debris from anemometer cups.',
  'Verified thermometer against reference station.',
  'Replaced desiccant pack in enclosure.',
  'Confirmed cellular uplink after outage.',
]

// Stations whose Documents tab ships the designed empty state — spread
// across the roster (index mod), matching the sibling script's approach of
// carrying at least one deliberate empty state rather than none.
const EMPTY_DOCS_INDEXES = new Set([13, 27])

function mulberry32(seed) {
  let a = seed >>> 0
  return function () {
    a |= 0; a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

for (let i = 0; i < records.length; i++) {
  const r = records[i]
  const rand = mulberry32(0x52534e30 + i) // "RSN0" + index
  const ri = (min, max) => min + Math.floor(rand() * (max - min + 1))
  const pick = (arr) => arr[Math.floor(rand() * arr.length)]

  const online = r.status === 'Active'

  /* ── Overview tab: status cards ──────────────────────────────────────── */
  r.batteryState = online ? (ri(0, 9) === 0 ? 'stale' : 'reporting') : 'offline'
  r.batteryStatus = r.batteryState === 'reporting' ? `${ri(72, 100)}%` : r.batteryState === 'stale' ? `${ri(20, 40)}%` : '—'
  r.batterySeen = online ? `${ri(1, 20)} mins ago` : `${ri(2, 9)} hrs ago`

  r.signalState = online ? (ri(0, 8) === 0 ? 'stale' : 'reporting') : 'offline'
  r.signalStatus = r.signalState === 'reporting' ? `${ri(3, 5)} bars` : r.signalState === 'stale' ? `${ri(1, 2)} bars` : 'No Signal'
  r.signalSeen = r.batterySeen

  r.sensorsState = online ? 'reporting' : 'offline'
  r.sensorsStatus = online ? 'All Reporting' : 'Not Reporting'
  r.sensorsSeen = r.batterySeen

  /* ── Overview tab: readings summary tiles ────────────────────────────── */
  r.readingTempTile = online ? `${r.systemcol2}°C` : '—'
  r.readingHumidityTile = online ? `${r.systemcol3}%` : '—'
  r.readingWindTile = online ? r.systemcol4 : '—'
  r.readingPressureTile = online ? `${r.systemcol5} hPa` : '—'
  r.readingVisibilityTile = online ? `${r.systemcol6} km` : '—'
  r.readingRainfallTile = online ? `${r.systemcol7} mm` : '—'

  /* ── Overview tab: location map ──────────────────────────────────────── */
  r.locationCenter = [r.lng, r.lat]
  r.locationPins = [{ id: `${r.id}-loc`, position: [r.lng, r.lat], color: online ? 'var(--color-success-500)' : 'var(--color-error-500)' }]

  /* ── Overview tab: 24h readings chart ────────────────────────────────── */
  const baseTemp = online ? Number(r.systemcol2) : 30 + ri(-2, 2)
  r.readingsTrend24h = Array.from({ length: 25 }, (_, h) => {
    const phase = ((h - 15 + 24) % 24) / 24
    const shape = Math.cos(phase * 2 * Math.PI)
    const trough = 27 + ri(0, 2)
    const tempC = Math.round((trough + (baseTemp - trough) * ((shape + 1) / 2)) * 10) / 10
    const rainfallMm = online && r.systemcol7 > 0 && (h === 4 || h === 5) ? r.systemcol7 : 0
    return { time: `${String(h).padStart(2, '0')}:00`, tempC, rainfallMm }
  })

  /* ── Interactive Replay tab: 24h replay series + static position pin ────
   * Entity-agnostic `InteractiveReplay` (fams-design-system, DS c7ed860)
   * reused as-is for a stationary entity: no `routeField`/`pinsField`
   * heading/ignition (those stay undefined on every point — the component
   * treats them as optional, per its own type doc), map shows one static
   * pin at the station's fixed position. `replayStats` mirrors the frame's
   * three-chip row; `replayTimeline` reuses the same shape as
   * `readingsTrend24h` above but with the field-key names the station's
   * blueprint `series[].key` list expects (temperature/humidity/rainfall)
   * and adds a humidity trace `readingsTrend24h` doesn't carry. */
  r.replayStats = [
    { icon: 'thermometer-01', label: 'Avg Temperature', value: online ? `${Math.round(baseTemp)}°C` : '—' },
    { icon: 'droplets-01', label: 'Avg Humidity', value: online ? `${r.systemcol3}%` : '—' },
    { icon: 'drop', label: 'Total Rainfall (24h)', value: online ? `${r.systemcol7} mm` : '0 mm' },
  ]
  r.replayTimeline = Array.from({ length: 25 }, (_, h) => {
    const phase = ((h - 15 + 24) % 24) / 24
    const shape = Math.cos(phase * 2 * Math.PI)
    const trough = 27 + ri(0, 2)
    const temperature = Math.round((trough + (baseTemp - trough) * ((shape + 1) / 2)) * 10) / 10
    const humidityBase = online ? Number(r.systemcol3) : 40 + ri(-5, 5)
    const humidity = Math.max(5, Math.min(100, Math.round(humidityBase + (1 - (shape + 1) / 2) * 15 + ri(-3, 3))))
    const rainfall = online && r.systemcol7 > 0 && (h === 4 || h === 5) ? r.systemcol7 : 0
    return { time: `${String(h).padStart(2, '0')}:00`, temperature, humidity, rainfall }
  })
  r.replayPins = [{ id: `${r.id}-replay`, position: [r.lng, r.lat], color: online ? 'var(--color-success-500)' : 'var(--color-error-500)', label: r.title }]

  /* ── Overview tab: recent alerts ─────────────────────────────────────── */
  const alertTypes = online
    ? ['Threshold Breach', 'Calibration Due']
    : ['Offline Period', 'Low Battery']
  r.recentAlerts = alertTypes.map((type, k) => ({
    id: `AL-${r.id}-${k}`,
    name: type,
    type,
    detail:
      type === 'Threshold Breach' ? `Rainfall exceeded ${ri(15, 40)}mm/hr threshold`
      : type === 'Calibration Due' ? `Next calibration due ${ri(1, 28)} ${pick(MONTHS)}, 27`
      : type === 'Offline Period' ? `Station unreachable for ${ri(2, 18)} hrs`
      : `Battery at ${ri(10, 25)}%, replace soon`,
    time: `${ri(1, 28)} ${pick(MONTHS)}, 26 · ${String(ri(6, 22)).padStart(2, '0')}:${String(ri(0, 59)).padStart(2, '0')}`,
    severity: type === 'Threshold Breach' || type === 'Offline Period' ? 'critical' : 'warning',
  }))

  /* ── Events/Alerts tab ────────────────────────────────────────────────── */
  const eventDefs = [
    { key: 'threshold-breach', name: 'Threshold Breach', likely: online },
    { key: 'offline-period', name: 'Offline Period', likely: !online },
    { key: 'low-battery', name: 'Low Battery', likely: r.batteryState !== 'reporting' },
    { key: 'calibration-due', name: 'Calibration Due', likely: true },
    { key: 'sensor-fault', name: 'Sensor Fault', likely: ri(0, 4) === 0 },
  ].filter((e) => e.likely)
  r.eventsCatalog = eventDefs.map((e, k) => ({
    id: `EV-${r.id}-${k}`,
    name: e.name,
    label: e.name,
    type: e.key,
    subtype: e.name,
    location: r.title,
    address: r.title,
    lat: r.lat + (rand() - 0.5) * 0.01,
    lng: r.lng + (rand() - 0.5) * 0.01,
    time: `${ri(1, 28)} ${pick(MONTHS)}, 26 | ${String(ri(6, 22)).padStart(2, '0')}:${String(ri(0, 59)).padStart(2, '0')}`,
    startTime: `${ri(1, 28)} ${pick(MONTHS)}, 26 | ${String(ri(6, 22)).padStart(2, '0')}:00`,
    endTime: `${ri(1, 28)} ${pick(MONTHS)}, 26 | ${String(ri(6, 22)).padStart(2, '0')}:30`,
    severity: e.key === 'calibration-due' ? 'info' : e.key === 'sensor-fault' || e.key === 'low-battery' ? 'warning' : 'critical',
  }))
  if (r.eventsCatalog.length === 0) {
    r.eventsCatalog = [{
      id: `EV-${r.id}-0`,
      name: 'Calibration Due',
      label: 'Calibration Due',
      type: 'calibration-due',
      subtype: 'Calibration Due',
      location: r.title,
      address: r.title,
      lat: r.lat,
      lng: r.lng,
      time: `${ri(1, 28)} ${pick(MONTHS)}, 26 | 09:00`,
      startTime: `${ri(1, 28)} ${pick(MONTHS)}, 26 | 09:00`,
      endTime: `${ri(1, 28)} ${pick(MONTHS)}, 26 | 09:30`,
      severity: 'info',
    }]
  }

  /* ── Devices tab: sensor array ───────────────────────────────────────── */
  r.deviceMake = pick(SENSOR_MAKES)
  r.deviceModel = pick(SENSOR_MODELS)
  r.firmware = `v${ri(1, 4)}.${ri(0, 9)}.${ri(0, 9)}`
  r.deviceLife = `${ri(1, 5)} yr ${ri(0, 11)} mo`
  r.deviceSerial = `SN-${r.id}`
  r.deviceImageUrl = null
  const SENSOR_UNITS = ['Rain Gauge', 'Anemometer', 'Thermometer', 'Hygrometer', 'Barometer', 'Visibility Sensor']
  r.sensorHistory = SENSOR_UNITS.map((unit, k) => {
    const active = k < 4 || online
    return {
      id: `SH-${r.id}-${k}`,
      device: unit,
      linkedOn: `${ri(1, 28)} ${pick(MONTHS)}, ${2022 + ri(0, 3)}`,
      removedOn: active ? '—' : `${ri(1, 28)} ${pick(MONTHS)}, 26`,
    }
  })

  /* ── Documents tab ───────────────────────────────────────────────────── */
  r.documents = EMPTY_DOCS_INDEXES.has(i)
    ? []
    : Array.from({ length: 2 }, (_, k) => ({
        id: `DOC-${r.id}-${k}`,
        name: pick(['Calibration Certificate', 'Installation Report', 'Site Survey', 'Warranty Card']),
        type: 'PDF',
        expiryDate: `${ri(1, 28)} ${pick(MONTHS)}, 27`,
      }))

  /* ── Timeline tab ─────────────────────────────────────────────────────
   * ActivityCommentFeed's SeedEntry shape: { id, kind: 'log'|'comment',
   * actor, text, at (ISO datetime), icon? }. Rows without `text`/`actor`
   * are silently filtered out by the component — {name,time,note} (this
   * script's earlier shape) rendered an empty feed.
   */
  {
    const MONTH_NUM = { Jan: '01', Feb: '02', Mar: '03', Apr: '04', May: '05', Jun: '06', Jul: '07', Aug: '08', Sep: '09', Oct: '10', Nov: '11', Dec: '12' }
    r.timelineEntries = Array.from({ length: 3 }, (_, k) => {
      const month = pick(MONTHS)
      const day = String(ri(1, 28)).padStart(2, '0')
      const hh = String(ri(6, 20)).padStart(2, '0')
      const mm = String(ri(0, 59)).padStart(2, '0')
      return {
        id: `TL-${r.id}-${k}`,
        kind: 'log',
        actor: pick(NOTE_AUTHORS),
        text: pick(NOTES),
        at: `2026-${MONTH_NUM[month]}-${day}T${hh}:${mm}:00`,
        icon: 'updated',
      }
    })
  }
}

writeFileSync(SEED, JSON.stringify(records, null, 2) + '\n')
console.log(`updated ${records.length} rain-sensors records with the detail-sheet's additive fields → ${SEED}`)
