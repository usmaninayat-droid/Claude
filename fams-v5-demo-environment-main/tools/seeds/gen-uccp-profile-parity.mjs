#!/usr/bin/env node
// gen-uccp-profile-parity.mjs — the 2026-09-01 Asset-Profile parity pass over
// tenants/uccp/seeds/live-monitoring.seed.json, in place.
//
// The tanker detail sheet's Trips / Events tabs were rendering EMPTY because
// the blueprint's field-key indirection named fields nothing ever seeded
// (`tripsKpis`/`tripsList`/`tripEventPins`/`eventsCatalog`), and the
// Devices/Workforce tabs' History tables + person card were mostly "—". This
// script DERIVES those fields from data the seed already carries (`trips`,
// `tripDates`, `tripSummary`, `events`, `device*`, `driver`), adds the new
// "Plans" tab's `completedPlans` (joined off the plan-monitoring seed), and
// gives the WORKFORCE rows (`kind: "workforce"`) the person-shaped fields
// their own tab set reads — so both record shapes in this one module render a
// complete profile.
//
// Nothing already on a record is removed; every key here is ADDITIVE and is
// consumed by a GENERIC v5-templates tab component via field-key indirection.
//
// Run: `node tools/seeds/gen-uccp-profile-parity.mjs` from the demo repo root.
// Deterministic (index-seeded), so re-running is a byte-for-byte no-op.

import { readFileSync, writeFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const HERE = dirname(fileURLToPath(import.meta.url))
const SEED = join(HERE, '../../tenants/uccp/seeds/live-monitoring.seed.json')
const PLANS = join(HERE, '../../tenants/uccp/seeds/plan-monitoring.seed.json')

const records = JSON.parse(readFileSync(SEED, 'utf8'))
const plans = JSON.parse(readFileSync(PLANS, 'utf8'))

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

function mulberry32(seed) {
  let a = seed >>> 0
  return function () {
    a |= 0; a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

/** A gentle 6-point polyline between two coordinates — the map needs a drawable
 *  route per trip and the seed only carries the two endpoints. */
function interpolate(originLng, originLat, destLng, destLat) {
  const n = 6
  return Array.from({ length: n }, (_, k) => {
    const t = k / (n - 1)
    // A small lateral bow so the line reads as a route, not a ruler.
    const bow = Math.sin(t * Math.PI) * 0.012
    return [originLng + (destLng - originLng) * t + bow, originLat + (destLat - originLat) * t]
  })
}

/* ── Events: the reference's own event vocabulary ───────────────────────────
 * `events` (Overview's Critical Events) stays untouched; `eventsCatalog` is
 * the Events TAB's own richer, mixed-severity list keyed on the blueprint's
 * `iconMap`/`toneMap` type keys. */
const EVENT_TYPES = [
  { type: 'blackspot', label: 'Blackspot' },
  { type: 'idling', label: 'Idling' },
  { type: 'overspeeding', label: 'Overspeeding' },
  { type: 'harsh-braking', label: 'Harsh Braking' },
  { type: 'cornering', label: 'Cornering' },
  { type: 'harsh-cornering', label: 'Harsh Cornering' },
]

const QATAR_PLACES = [
  ['Al Wakrah, Qatar', 25.1715, 51.6032],
  ['Al Rayyan, Qatar', 25.2919, 51.4241],
  ['Lusail, Qatar', 25.4283, 51.4919],
  ['Doha Corniche, Qatar', 25.29, 51.531],
  ['Umm Salal, Qatar', 25.4108, 51.4058],
  ['Al Khor, Qatar', 25.6802, 51.4967],
  ['Industrial Area, Qatar', 25.2028, 51.4581],
  ['Msheireb Downtown, Doha, Qatar', 25.2867, 51.5222],
]

const EMPLOYMENT_TYPES = ['Full Time', 'Part Time', 'Contract']
const EMPLOYEE_TYPES = ['Permanent', 'Contractor', 'Seconded']
const MANAGERS = ['Hassan Al-Emadi', 'Aisha Al-Marri', 'Khalid Al-Naimi', 'Noora Al-Sulaiti']
const TRACKER_MAKES = ['Teltonika', 'Queclink', 'Ruptela']
const WF_STATUS_ART = {
  'On Duty': 'on-duty',
  'On Break': 'on-break',
  'In Transit': 'in-transit',
  'Clocked In': 'clocked-in',
  'Not Clocked In': 'not-clocked-in',
}

/* ── Plans: the Plans tab's row source ──────────────────────────────────────
 * REAL completed plans for this tanker first (`systemcol4` names it by title
 * or by plate, sometimes as a comma list), then a deterministic top-up of
 * earlier completions drawn from the SAME plan catalogue — so every tanker has
 * a history worth searching rather than an empty tab on the 8 of 18 that
 * happen to own no currently-completed plan.
 */
const COMPLETED_PLANS = plans.filter((p) => p.status === 'Completed')

function realPlansFor(rec) {
  const keys = [String(rec.title ?? ''), String(rec.plate ?? '')].filter(Boolean)
  return plans.filter((p) => {
    if (p.status !== 'Completed') return false
    const owners = String(p.systemcol4 ?? '').split(',').map((s) => s.trim())
    return owners.some((o) => keys.includes(o))
  })
}

function planRow(p, id, completedOn, stops, total, compliance) {
  return {
    id,
    planId: p.uniqueidentifier ?? p.id,
    name: p.title,
    zone: p.systemcol3,
    blackSpot: p.systemcol2,
    shift: p.systemcol7,
    completedOn,
    stops: `${stops} / ${total} stops`,
    compliance: `${compliance}% compliance`,
    status: 'Completed',
  }
}

for (let i = 0; i < records.length; i++) {
  const r = records[i]
  const rand = mulberry32(0x50524f46 + i) // "PROF" + index
  const ri = (min, max) => min + Math.floor(rand() * (max - min + 1))
  const pick = (arr) => arr[Math.floor(rand() * arr.length)]
  const isWorkforce = r.kind === 'workforce'

  // An EXPLICIT record-shape discriminator for the blueprint's tab
  // `visibleWhen` + identity-rail variants — the workforce rows already carry
  // `kind`, the tanker rows never did (an absent value is not a value a
  // `$eq` gate can key on).
  if (!isWorkforce) r.kind = 'tanker'

  /* ── Events tab (both shapes) ─────────────────────────────────────────── */
  r.eventsCatalog = Array.from({ length: 6 }, (_, k) => {
    const kind = EVENT_TYPES[(i + k) % EVENT_TYPES.length]
    const [address, lat, lng] = QATAR_PLACES[(i + k * 3) % QATAR_PLACES.length]
    return {
      id: `EVC-${r.id}-${k}`,
      type: kind.type,
      label: kind.label,
      time: `${String(ri(6, 20)).padStart(2, '0')}:${String(ri(0, 5))}${ri(0, 9)} · ${ri(1, 28)} ${MONTHS[(i + k) % 12]}, 26`,
      address,
      lat: lat + ri(-40, 40) / 10000,
      lng: lng + ri(-40, 40) / 10000,
    }
  })

  /* ── Plans tab (both shapes) ──────────────────────────────────────────── */
  const real = isWorkforce
    ? plans.filter(
        (p) => p.status === 'Completed' && (p.systemcol5 === r.title || p.systemcol6 === r.title),
      )
    : realPlansFor(r)
  const rows = real.map((p, k) =>
    planRow(p, `PL-${r.id}-r${k}`, `${ri(20, 28)} Aug, 2026`, p.systemcol10, p.systemcol11, p.systemcol12),
  )
  for (let k = rows.length; k < 6; k++) {
    const p = COMPLETED_PLANS[(i * 3 + k) % COMPLETED_PLANS.length]
    const total = ri(8, 14)
    rows.push(
      planRow(
        p,
        `PL-${r.id}-h${k}`,
        `${ri(1, 28)} ${MONTHS[(i + k) % 8]}, 2026`,
        total,
        total,
        ri(88, 99),
      ),
    )
  }
  r.completedPlans = rows

  if (isWorkforce) {
    /* ── WORKFORCE rows: the person-shaped profile ─────────────────────── */
    const [firstName, ...restName] = String(r.title).split(' ')
    r.firstName = firstName
    r.lastName = restName.join(' ')
    // The identity rail's "ID #…" line reads `uniqueidentifier`; the workforce
    // rows only ever carried `employeeId`, so the line rendered blank.
    r.uniqueidentifier = r.uniqueidentifier ?? r.employeeId
    r.icon3dArt = 'workforce'
    r.workforceArtStatus = WF_STATUS_ART[r.workforceStatus] ?? 'not-clocked-in'
    r.employeeType = pick(EMPLOYEE_TYPES)
    r.employmentType = pick(EMPLOYMENT_TYPES)
    r.experience = `${ri(2, 18)} yrs`
    r.hiredOn = `${ri(1, 28)} ${pick(MONTHS)} ${ri(2015, 2024)}`
    r.contractFor = `${ri(1, 5)} yrs`
    r.contractExpiry = `${ri(1, 28)} ${pick(MONTHS)} ${ri(2026, 2030)}`
    r.manager = pick(MANAGERS)
    r.gender = ri(0, 3) === 0 ? 'Female' : 'Male'
    r.nationality = pick(['Qatar', 'Egypt', 'India', 'Jordan', 'Pakistan'])
    r.dateOfBirth = `${ri(1, 28)} ${pick(MONTHS)} ${ri(1975, 1998)}`
    r.languages = pick(['Arabic, English', 'Arabic', 'English, Hindi, Arabic'])
    r.religion = 'Islam'
    r.mobilePhone = r.contact
    r.bloodGroup = pick(['A+', 'B+', 'O+', 'AB+'])
    r.emergencyContact = `+974 ${ri(5000, 5999)} ${ri(1000, 9999)}`
    r.address = pick(QATAR_PLACES)[0]
    r.baseStation = pick(['Al Wakra Depot', 'Lusail Depot', 'Industrial Area Depot'])
    r.attendanceStatus = r.workforceStatus
    r.attendanceSeen = r.lastRecord
    r.dutyStatus = r.workforceStatus
    r.dutySeen = r.statusSince
    r.deviceStatusLabel = 'Reporting'
    r.deviceSeen = r.lastRecord
    r.locationStatus = 'Reporting'
    r.locationSeen = r.lastRecord
    r.upcomingShiftId = `# SH-${9100 + i}`
    r.upcomingShiftAt = `${ri(1, 3)} Sep, 2026 ${String(ri(5, 9)).padStart(2, '0')}:00`
    r.locationCenter = [r.lng, r.lat]
    r.locationPins = [{ id: `${r.id}-loc`, position: [r.lng, r.lat], color: 'var(--color-primary)' }]

    // Shift totals + list — the person's counterpart of a tanker's trips,
    // read by the SAME generic `TripsOverview` via different field keys.
    const shifts = Array.isArray(r.shifts) ? r.shifts : []
    const totalKm = shifts.reduce((sum, s) => sum + (parseInt(String(s.distance), 10) || 0), 0)
    r.shiftsKpis = [
      { label: 'Total Shifts', value: String(shifts.length), icon: 'clock' },
      { label: 'Total Time', value: `${ri(5, 9)}h ${ri(10, 59)}m`, icon: 'clock-stopwatch' },
      { label: 'Total Distance', value: `${totalKm} km`, icon: 'route' },
    ]
    r.shiftsList = shifts.map((s, k) => {
      const [oName, oLat, oLng] = QATAR_PLACES[(i + k) % QATAR_PLACES.length]
      const [dName, dLat, dLng] = QATAR_PLACES[(i + k + 3) % QATAR_PLACES.length]
      const today = k < 2
      return {
        id: s.id,
        dayKey: today ? '2026-08-31' : '2026-08-30',
        dayLabel: today ? 'Today' : '30 Aug, 2026',
        originLabel: s.origin ?? oName,
        originTime: s.startTime,
        destinationLabel: s.destination ?? dName,
        destinationTime: s.endTime,
        eventsCount: String(s.events ?? 0),
        distance: s.distance,
        duration: s.duration,
        tripNumber: `Shift#${k + 1}`,
        route: interpolate(oLng, oLat, dLng, dLat),
        originPosition: [oLng, oLat],
        destinationPosition: [dLng, dLat],
      }
    })
    r.shiftEventPins = r.eventsCatalog.slice(0, 4).map((e) => ({
      id: `${e.id}-pin`,
      position: [e.lng, e.lat],
      category: e.type === 'blackspot' || e.type === 'idling' ? 'normal' : 'critical',
      color: e.type === 'blackspot' || e.type === 'idling' ? 'var(--color-info-scale-500)' : 'var(--color-error-500)',
      label: e.label,
    }))

    // Replay: the same shape the tanker rows carry, over the person's own path.
    const n = 10
    r.replayRoute = Array.from({ length: n }, (_, k) => [r.lng + k * 0.005, r.lat + k * 0.004])
    r.replayTimeline = Array.from({ length: n }, (_, k) => ({
      time: `${String(6 + Math.floor(k / 2)).padStart(2, '0')}:${k % 2 === 0 ? '00' : '30'}`,
      temperature: ri(20, 41),
      speed: ri(0, 60),
      average: 30,
      lat: r.lat + k * 0.004,
      lng: r.lng + k * 0.005,
      address: r.location,
    }))
    r.replayBands = [
      { type: 'idling', label: 'On Break', startIndex: 4, endIndex: 5, tone: 'info' },
    ]
    r.replayPins = [
      { id: `${r.id}-rp0`, position: [r.lng + 4 * 0.005, r.lat + 4 * 0.004], color: 'var(--color-info)', label: 'On Break' },
    ]
    r.replayStats = [
      { icon: 'alert-triangle', label: 'Number of Events', value: r.events?.length ?? 0 },
      { icon: 'route', label: 'Total Distance (km)', value: `${totalKm} km` },
      { icon: 'clock', label: 'Total Duration', value: `${ri(5, 9)}h ${ri(10, 59)}m` },
    ]

    r.documents = Array.from({ length: 2 }, (_, k) => ({
      id: `DOC-${r.id}-${k}`,
      name: ['Employment Contract', 'Qatar ID', 'Driving Licence', 'Safety Training Certificate'][(i + k) % 4],
      type: 'PDF',
      expiryDate: `${ri(1, 28)} ${pick(MONTHS)}, 27`,
    }))
    r.timelineEntries = Array.from({ length: 3 }, (_, k) => ({
      id: `TL-${r.id}-${k}`,
      name: pick(MANAGERS),
      time: `${String(ri(6, 20)).padStart(2, '0')}:${String(ri(10, 59))} · ${ri(1, 28)} ${pick(MONTHS)}`,
      note: ['Assigned to a new zone.', 'Completed a safety briefing.', 'Shift schedule updated.', 'Clocked in at the depot.'][(i + k) % 4],
    }))
    continue
  }

  /* ── TANKER rows ──────────────────────────────────────────────────────── */

  // Trips tab: the KPI chips + grouped list + per-trip route the blueprint's
  // `TripsOverview` names but nothing seeded.
  const trips = Array.isArray(r.trips) ? r.trips : []
  r.tripsKpis = [
    { label: 'Total Trips', value: String(r.tripSummary?.trips ?? trips.length), icon: 'route' },
    { label: 'Total Time', value: String(r.tripSummary?.duration ?? '—'), icon: 'clock' },
    { label: 'Total Distance', value: String(r.tripSummary?.distance ?? '—'), icon: 'gauge' },
  ]
  r.tripsList = trips.map((t, k) => {
    const today = k < 2
    return {
      id: t.id,
      dayKey: today ? '2026-08-31' : '2026-08-30',
      dayLabel: today ? 'Today' : '30 Aug, 2026',
      originLabel: t.origin,
      originTime: t.startTime,
      destinationLabel: t.destination,
      destinationTime: t.endTime,
      eventsCount: String(t.events ?? 0),
      distance: t.distance,
      duration: t.duration,
      tripNumber: `Trip#${k + 1}`,
      route: interpolate(t.originLng, t.originLat, t.destinationLng, t.destinationLat),
      originPosition: [t.originLng, t.originLat],
      destinationPosition: [t.destinationLng, t.destinationLat],
    }
  })
  // Layer pins over the trip map — `category` matches the blueprint's own
  // layer keys so the checkboxes actually toggle something.
  r.tripEventPins = [
    // Not every seeded critical event carries coordinates (e.g. LMV-QA04's
    // three events) — a `[null, null]` pin poisons the map's fit-to-markers
    // bounds for the WHOLE tab, so those are dropped rather than emitted.
    ...(Array.isArray(r.events) ? r.events : [])
      .filter((e) => Number.isFinite(e.lng) && Number.isFinite(e.lat))
      .map((e, k) => ({
        id: `${e.id}-pin${k}`,
        position: [e.lng, e.lat],
        category: 'critical',
        color: 'var(--color-error-500)',
        label: e.name,
      })),
    ...r.eventsCatalog.slice(0, 3).map((e) => ({
      id: `${e.id}-pin`,
      position: [e.lng, e.lat],
      category: 'normal',
      color: 'var(--color-info-scale-500)',
      label: e.label,
    })),
    ...trips.map((t, k) => ({
      id: `${t.id}-cp`,
      position: [t.destinationLng, t.destinationLat],
      category: 'checkpoint',
      color: 'var(--color-foreground)',
      label: `Checkpoint — ${t.destination}`,
    })),
  ]

  // Devices tab: the History table (DEVICE | LINKED ON | REMOVED ON) — was
  // rendering "No rows" because nothing ever seeded the blueprint's
  // `historyField: "deviceHistory"`. NOT `devices`, which is the LIST view's
  // own `devicesCol` and must keep its existing shape.
  r.deviceInstalledOn = r.registrationDate
  r.deviceHistory = [
    {
      id: `DV-${r.id}-0`,
      device: `${r.deviceMake} ${r.deviceModel} · ${r.deviceSerial}`,
      linkedOn: r.registrationDate,
      removedOn: '—',
    },
    {
      id: `DV-${r.id}-1`,
      device: `${pick(TRACKER_MAKES)} GV${ri(50, 90)} · SN-QA${String(1000 + i)}`,
      linkedOn: `${ri(1, 28)} ${MONTHS[i % 6]}, 2021`,
      removedOn: r.registrationDate,
    },
  ]

  // Workforce tab: the person card's "—" rows + its own History table.
  r.employeeType = pick(EMPLOYEE_TYPES)
  r.employmentType = pick(EMPLOYMENT_TYPES)
  r.experience = `${ri(3, 20)} yrs`
  r.hiredOn = `${ri(1, 28)} ${pick(MONTHS)} ${ri(2014, 2023)}`
  r.contractFor = `${ri(1, 5)} yrs`
  r.contractExpiry = `${ri(1, 28)} ${pick(MONTHS)} ${ri(2026, 2030)}`
  r.manager = pick(MANAGERS)
  // The Workforce card's person art (`artField`) — the SAME vendored
  // avatar/coin illustration the map popup and the workforce rail use. A
  // tanker's assigned driver is a field role, so the field (green) coin is
  // always the correct one here.
  r.driverArtStatus = 'on-duty'
  r.workforceHistory = [
    {
      id: `WH-${r.id}-0`,
      workforce: r.driver,
      employeeId: r.driverReference,
      linkedOn: r.assignedOn,
      removedOn: '—',
    },
    {
      id: `WH-${r.id}-1`,
      workforce: MANAGERS[(i + 1) % MANAGERS.length],
      employeeId: `DRV-QA${String(200 + i).padStart(3, '0')}`,
      linkedOn: `${ri(1, 28)} ${MONTHS[i % 6]}, 2023`,
      removedOn: r.assignedOn,
    },
  ]
}

writeFileSync(SEED, JSON.stringify(records, null, 2) + '\n')
const tankers = records.filter((r) => r.kind === 'tanker').length
const workforce = records.filter((r) => r.kind === 'workforce').length
console.log(
  `profile-parity: ${tankers} tanker + ${workforce} workforce record(s) updated → ${SEED}`,
)
