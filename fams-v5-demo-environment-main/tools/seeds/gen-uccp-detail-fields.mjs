#!/usr/bin/env node
// gen-uccp-detail-fields.mjs — adds the tanker-detail sheet's ADDITIVE record
// fields to the existing 18-record uccp live-monitoring seed
// (tenants/uccp/seeds/live-monitoring.seed.json), in place.
//
// Every field here is consumed by a GENERIC v5-templates tab component via
// field-key indirection (OverviewWidgets/RecordSectionsGrid/RecordTable/
// InteractiveReplay) — see tenants/uccp/modules/live-monitoring/blueprint.json's
// `uiConfig.profile`. Nothing already on the record is touched or removed;
// this only ADDS keys the profile's new tabs read.
//
// Run: `node tools/seeds/gen-uccp-detail-fields.mjs` from the demo repo root.
// Deterministic (index-seeded), so re-running is a byte-for-byte no-op.

import { readFileSync, writeFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const SEED = join(dirname(fileURLToPath(import.meta.url)), '../../tenants/uccp/seeds/live-monitoring.seed.json')
const records = JSON.parse(readFileSync(SEED, 'utf8'))

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
const TELEMATICS_MAP = { Online: ['Reporting', 'reporting'], Idle: ['Idle', 'stale'], Offline: ['Offline', 'offline'] }
const PRIORITIES = ['Low', 'Medium', 'High']
const JOB_TYPES = ['Scheduled', 'Unscheduled', 'Inspection']
const ISSUE_CATEGORIES = ['Engine', 'Brakes', 'Electrical', 'Tyres', 'Body']
const DRIVERS = ['Khalid Al-Mansoori', 'Zayd Al-Farsi', 'Hamad Al-Kubaisi', 'Rashid Al-Emadi']

// A single deterministic PRNG so re-running this script is a no-op.
function mulberry32(seed) {
  let a = seed >>> 0
  return function () {
    a |= 0; a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

// Records whose Interactive Replay ships the designed EMPTY state (Figma
// board 29672:26998's 4th state) — the rest carry a full replay timeline.
const EMPTY_REPLAY_INDEXES = new Set([5, 12])
// Records whose Documents tab ships the designed empty state.
const EMPTY_DOCS_INDEXES = new Set([9])

for (let i = 0; i < records.length; i++) {
  const r = records[i]
  const rand = mulberry32(0x46524d53 + i) // "UCCP" + index
  const ri = (min, max) => min + Math.floor(rand() * (max - min + 1))
  const pick = (arr) => arr[Math.floor(rand() * arr.length)]

  /* ── Overview tab ────────────────────────────────────────────────────── */
  r.upcomingTripId = `# ${231000 + i * 137}`
  r.upcomingTripAt = `${ri(20, 28)} Aug, 2026 ${String(ri(6, 20)).padStart(2, '0')}:00`
  const [telematics, telematicsState] = TELEMATICS_MAP[r.deviceStatus] ?? ['Offline', 'offline']
  r.telematics = telematics
  r.telematicsState = telematicsState
  r.telematicsSeen = r.lastRecord
  r.locationCenter = [r.lng, r.lat]
  r.locationPins = [{ id: `${r.id}-loc`, position: [r.lng, r.lat], color: 'var(--color-primary)' }]
  r.tripsByMonth = MONTHS.map((label) => ({ label, value: ri(4, 30) }))

  /* ── Fill Level Monitoring tab ───────────────────────────────────────── */
  r.avgCostPerKm = `${(ri(15, 45) / 10).toFixed(1)} QAR`
  r.avgConsumptionPerKm = `${(ri(280, 420) / 10).toFixed(1)} L/100km`
  r.totalConsumption = `${ri(800, 4200).toLocaleString('en-US')} L`
  r.totalCost = `${ri(2000, 9000).toLocaleString('en-US')} QAR`
  const baseFill = Number(r.fillLevel ?? r.fuelLevel ?? 60)
  r.fuelLevelTrend = Array.from({ length: 8 }, (_, k) => ({
    label: `${k * 50} km`,
    value: Math.max(5, Math.min(100, baseFill + ri(-8, 8) - k)),
  }))
  r.monthlyFuelCost = MONTHS.map((label) => ({ label, value: ri(400, 1800) }))

  /* ── Job Orders tab ──────────────────────────────────────────────────── */
  r.jobOrders = Array.from({ length: 3 }, (_, k) => ({
    id: `JO-${r.id}-${k}`,
    type: pick(JOB_TYPES),
    serviceDate: `${ri(1, 28)} ${pick(MONTHS)}, 26`,
    serviceCategory: pick(ISSUE_CATEGORIES),
    odometer: `${ri(1200, 180000).toLocaleString('en-US')} km`,
    priority: pick(PRIORITIES),
    status: pick(['Scheduled', 'Ongoing', 'Completed']),
  }))

  /* ── Preventive Maintenance tab ──────────────────────────────────────── */
  r.maintenanceRecords = Array.from({ length: 3 }, (_, k) => ({
    id: `PM-${r.id}-${k}`,
    service: pick(['Oil Change', 'Brake Inspection', 'Tyre Rotation', 'Coolant Flush']),
    currentOdometer: `${ri(1200, 180000).toLocaleString('en-US')} km`,
    creationDate: `${ri(1, 28)} ${pick(MONTHS)}, 26`,
    nextServiceOdometer: `${ri(1200, 200000).toLocaleString('en-US')} km`,
    odometerReading: `${ri(20, 95)}%`,
    periodOfInterval: `${ri(20, 95)}%`,
    engineHour: `${ri(20, 95)}%`,
  }))

  /* ── Reported Issues tab ─────────────────────────────────────────────── */
  r.reportedIssues = Array.from({ length: 2 }, (_, k) => ({
    id: `RI-${r.id}-${k}`,
    title: `${pick(ISSUE_CATEGORIES)} warning light`,
    issueCategory: pick(ISSUE_CATEGORIES),
    reportedBy: pick(DRIVERS),
    reportedOn: `${ri(1, 28)} ${pick(MONTHS)}, 26`,
    criticalityLevel: pick(['NORMAL', 'CRITICAL']),
  }))

  /* ── Documents tab ───────────────────────────────────────────────────── */
  r.documents = EMPTY_DOCS_INDEXES.has(i)
    ? []
    : Array.from({ length: 2 }, (_, k) => ({
        id: `DOC-${r.id}-${k}`,
        name: pick(['Registration Card', 'Insurance Policy', 'Inspection Certificate', 'Fitness Certificate']),
        type: 'PDF',
        expiryDate: `${ri(1, 28)} ${pick(MONTHS)}, 27`,
      }))

  /* ── Timeline tab ────────────────────────────────────────────────────── */
  r.timelineEntries = Array.from({ length: 3 }, (_, k) => ({
    id: `TL-${r.id}-${k}`,
    name: pick(DRIVERS),
    time: `${String(ri(6, 20)).padStart(2, '0')}:${String(ri(0, 59)).padStart(2, '0')} · ${ri(1, 28)} ${pick(MONTHS)}`,
    note: pick(['Updated vehicle status.', 'Completed pre-trip inspection.', 'Logged a fuel top-up.', 'Assigned to a new route.']),
  }))

  /* ── Interactive Replay tab ──────────────────────────────────────────── */
  if (EMPTY_REPLAY_INDEXES.has(i)) {
    r.replayStats = []
    r.replayTimeline = []
    r.replayBands = []
    r.replayRoute = []
    r.replayPins = []
  } else {
    const n = 10
    const startLat = r.lat
    const startLng = r.lng
    r.replayRoute = Array.from({ length: n }, (_, k) => [startLng + k * 0.006, startLat + k * 0.005])
    r.replayTimeline = Array.from({ length: n }, (_, k) => ({
      time: `${String(8 + Math.floor(k / 2)).padStart(2, '0')}:${k % 2 === 0 ? '00' : '30'}`,
      temperature: ri(18, 40),
      speed: ri(10, 100),
      average: 55,
      lat: startLat + k * 0.005,
      lng: startLng + k * 0.006,
      address: r.location,
    }))
    r.replayBands = [
      { type: 'overspeeding', label: 'Overspeeding', startIndex: 2, endIndex: 3, tone: 'danger' },
      { type: 'idling', label: 'Idling', startIndex: 6, endIndex: 7, tone: 'info' },
    ]
    r.replayPins = [
      { id: `${r.id}-rp0`, position: [startLng + 2 * 0.006, startLat + 2 * 0.005], color: 'var(--color-destructive)', label: 'Overspeeding' },
      { id: `${r.id}-rp1`, position: [startLng + 6 * 0.006, startLat + 6 * 0.005], color: 'var(--color-info)', label: 'Idling' },
    ]
    r.replayStats = [
      { icon: 'alert-triangle', label: 'Number of Events', value: r.events?.length ?? 2 },
      { icon: 'route', label: 'Total Trip Distance (km)', value: `${ri(20, 90)} km` },
      { icon: 'clock', label: 'Total Trip Duration', value: `${ri(1, 4)}h ${ri(1, 59)}m` },
    ]
  }
}

writeFileSync(SEED, JSON.stringify(records, null, 2) + '\n')
console.log(`updated ${records.length} uccp tanker records with the detail-sheet's additive fields → ${SEED}`)
