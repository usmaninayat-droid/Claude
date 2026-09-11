#!/usr/bin/env node
// gen-live-monitoring-seed.mjs — deterministic generator for the Live
// Monitoring demo seed. Emits 1,000 vehicle records to
//   ../../core/modules/live-monitoring/seeds/live-monitoring.seed.json
//
// Run: `node tools/seeds/gen-live-monitoring-seed.mjs` from the repo root.
//
// The seed JSON is the repo's single largest committed artifact (~4.9 MB) and
// used to be reproducible only from a run folder in a THIRD repo
// (`plan/run-2026-08-24-live-monitoring-v2/scripts/gen-lm-seeds.mjs`), which is
// not vendored anywhere here — so nobody could regenerate it with a different
// distribution without hand-editing 4.9 MB of JSON (Phase 7 code review,
// finding 9). It lives here now. This is metadata tooling, not UI, so the
// repo's metadata-only rule is unaffected.
//
// Provenance: originally authored for run 2026-08-24-live-monitoring-v2, WP4.
// The seed JSON stays the committed artifact; this script is the reproducible
// recipe (fixed PRNG seed — same output on every run, byte for byte).
//
// Contract highlights (SPEC.md §0 P0-2, §2.2, §2.4, §2.5, §2.10):
//   • 1,000 records, ids `Z-NNNN`; EXACTLY 6 ids contain "Z-77" (Figma 551:18786
//     "Showing 6 items out of 1,000"), one of them Z-7764 — the QA vehicle that
//     matches Card 495:4143 field-by-field (first record in the file).
//   • Dubai hotspot clusters + a few outliers → multi-tier cluster badges.
//   • Status mix across all four states; moving → speed+heading; idling/stopped/
//     non-reporting → dwell + "for/since" timestamp strings.
//   • `dwell` is now present on EVERY record (SPEED-column data, visual #13/#14/#26):
//     non-moving → the BARE duration ("11 mins") the §2.3 marker chip needs;
//     moving → the short since-last-fix label with no "ago" ("Just Now", "12 secs")
//     so the list summary reads "60 km/h · 12 secs". `timestamp` keeps the
//     TIMESTAMP-column form ("4 secs ago" / "since 2 hr") and `statusSince` keeps
//     the card's long form ("since 2 minutes").
//   • Full SPEC §2.6 columns catalog seeded (registration & dates, specs, fuel,
//     dimensions, misc, device, workforce) so every catalog toggle shows data.
//   • Per-record events/trips/tripDates/tripSummary/devices arrays (popup tabs);
//     8 records ship EMPTY arrays (card empty states).
//   • Facet coverage: every fuelType/assetStatus/vehicleType/mobility option has
//     hits; tags vocabulary includes "Street"; `privateTags` seeded for the
//     future "My Private Tags" group binding.
//   • Zero photo URLs (P0-1: 3D SVG vehicles ship from the DS, not seeds).

import { writeFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const OUT = join(
  dirname(fileURLToPath(import.meta.url)),
  '../../core/modules/live-monitoring/seeds/live-monitoring.seed.json',
)

/* ── deterministic PRNG ─────────────────────────────────────────────────── */
function mulberry32(seed) {
  let a = seed >>> 0
  return function () {
    a |= 0; a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}
const rand = mulberry32(0x4c4d5632) // "LMV2"
const ri = (min, max) => min + Math.floor(rand() * (max - min + 1))
const pick = (arr) => arr[Math.floor(rand() * arr.length)]
function shuffle(arr) {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}
/** Expands weighted [value, count] pairs into an exact-count shuffled pool. */
const pool = (pairs) => shuffle(pairs.flatMap(([v, n]) => Array(n).fill(v)))

/* ── vocabularies ───────────────────────────────────────────────────────── */
const N = 1000 // total records (1 QA + 999 generated)

// Exactly 6 ids in the Z-77xx band (incl. the QA vehicle's Z-7764).
const Z77_IDS = [7712, 7738, 7741, 7775, 7790] // + 7764 (QA)
const ZONE_ID_NUMBERS = new Set([1234, 2200, 3100]) // uiConfig.map.zones ids — avoid collisions
const idCandidates = []
for (let n = 1000; n <= 9999; n++) {
  if (n >= 7700 && n <= 7799) continue // Z-77 band reserved
  if (ZONE_ID_NUMBERS.has(n)) continue
  idCandidates.push(n)
}
const genericIds = shuffle(idCandidates).slice(0, N - 1 - Z77_IDS.length)
const restIds = shuffle([...Z77_IDS, ...genericIds]) // 999 ids for the non-QA records

// Make/model pool ("Figma vibe": Hilux, buses, mixers, vans, bikes…).
// "X6734" is reserved for the QA vehicle so "Mitsubishi X6734" stays unique.
const MAKES = [
  ['Mitsubishi', ['Canter', 'Fuso Bus', 'L200']],
  ['Toyota', ['Hilux', 'Land Cruiser', 'Coaster Bus', 'Hiace Van']],
  ['Nissan', ['Patrol', 'Urvan', 'Cabstar']],
  ['Ford', ['Transit Van', 'Ranger', 'F-750 Mixer']],
  ['Mercedes', ['Actros Mixer', 'Sprinter Van', 'Citaro Bus']],
  ['MAN', ["Lion's City Bus", 'TGS Cement Bulker']],
  ['Isuzu', ['NPR 400', 'D-Max', 'FVZ Concrete Pump']],
  ['Volvo', ['FMX Mixer', '9700 Bus', 'FE Garbage Compactor']],
  ['Scania', ['P410 Mixer', 'Citywide Bus', 'G460 Bulker']],
  ['Hino', ['500 Cement Bulker', '300 Mini Van']],
  ['Iveco', ['Daily Mini Van', 'Trakker Concrete Pump']],
  ['Tata', ['Prima Concrete Pump', 'Ultra Bus']],
  ['Ashok Leyland', ['Falcon Bus', 'Boss Tipper']],
  ['Honda', ['CB350', 'CRF250']],
  ['Yamaha', ['YBR 125', 'XTZ 150']],
  ['TVS', ['HLX 150', 'Star City']],
]

const FIRST = ['Omar', 'Dana', 'Ravi', 'Aisha', 'Bilal', 'Chloe', 'Yusuf', 'Elena', 'Faisal', 'Grace',
  'Hamza', 'Imran', 'Julia', 'Khalid', 'Lina', 'Marco', 'Noor', 'Pavel', 'Rania', 'Samir',
  'Tariq', 'Usha', 'Victor', 'Waleed', 'Yara', 'Zainab', 'Ahmed', 'Fatima', 'Sanjay', 'Mei']
const LAST = ['Reyes', 'Khan', 'Sharma', 'Haddad', 'Petrov', 'Almasi', 'Osei', 'Rahman', 'Costa', 'Nakamura',
  'Farouk', 'Iqbal', 'Sultan', 'Mendes', 'Kaur', 'Aziz', 'Botros', 'Diallo', 'Ivanov', 'Qureshi',
  'Saleh', 'Traore', 'Verma', 'Youssef', 'Zaman']

const COLORS = ['Black', 'Blue', 'Crimson', 'White', 'Silver', 'Grey', 'Green', 'Red', 'Yellow', 'Orange']

// Dubai hotspots (several distinct clusters → multi-tier cluster badges) + outliers.
const HOTSPOTS = [
  { count: 170, lat: 25.070, lng: 55.140, spread: 0.012, locations: ['Cluster M, JLT – Dubai', 'Marina Walk – Dubai', 'JBR The Walk – Dubai', 'Marina Fuel Station – Dubai'] },
  { count: 220, lat: 25.190, lng: 55.270, spread: 0.015, locations: ['Business Bay – Dubai', 'Downtown Boulevard – Dubai', 'Satwa Dubai', 'DIFC Gate Village – Dubai'] },
  { count: 160, lat: 25.252, lng: 55.352, spread: 0.014, locations: ['Deira Waterfront – Dubai', 'DXB Cargo Gate 4 – Dubai', 'Al Garhoud – Dubai', 'Port Saeed – Dubai'] },
  { count: 120, lat: 25.140, lng: 55.230, spread: 0.010, locations: ['Al Quoz Industrial 3 – Dubai', 'Al Quoz Depot – Dubai', 'Times Square Center – Dubai'] },
  { count: 110, lat: 25.010, lng: 55.075, spread: 0.012, locations: ['Jebel Ali Freezone South – Dubai', 'JAFZA Gate 5 – Dubai', 'Ibn Battuta – Dubai'] },
  { count: 90, lat: 25.165, lng: 55.405, spread: 0.010, locations: ['International City, Phase 2 – Dubai', 'Dragon Mart – Dubai', 'Warsan 3 – Dubai'] },
  { count: 70, lat: 25.330, lng: 55.420, spread: 0.012, locations: ['Al Nahda – Sharjah', 'Muwaileh – Sharjah', 'Industrial Area 12 – Sharjah'] },
  { count: 50, lat: 25.170, lng: 55.300, spread: 0.008, locations: ['Bukadra – Dubai', 'Meydan One – Dubai', 'Ras Al Khor Sanctuary – Dubai'] },
]
const OUTLIERS = [
  { count: 3, lat: 24.453, lng: 54.377, spread: 0.02, locations: ['Khalifa Port – Abu Dhabi', 'Corniche Road – Abu Dhabi', 'Mussafah M9 – Abu Dhabi'] },
  { count: 2, lat: 24.207, lng: 55.744, spread: 0.015, locations: ['Al Jimi – Al Ain', 'Hili Industrial – Al Ain'] },
  { count: 2, lat: 24.800, lng: 56.116, spread: 0.015, locations: ['Hatta Dam Access Rd – Hatta', 'Hatta Wadi Hub'] },
  { count: 2, lat: 25.789, lng: 55.943, spread: 0.015, locations: ['Al Hamra – Ras Al Khaimah', 'RAK Port – Ras Al Khaimah'] },
]

// Exact-count attribute pools for the 999 non-QA records (QA vehicle noted per line).
const statusPool = pool([['Moving', 430], ['Idling', 200], ['Stopped', 249], ['Non-Reporting', 120]]) // +QA Stopped → 250
const fuelPool = pool([['Petrol', 399], ['Diesel', 400], ['Hybrid', 200]]) // +QA Petrol → 400
const assetStatusPool = pool([['Active', 799], ['In-active', 130], ['Disabled', 70]]) // +QA Active → 800
const vehicleTypePool = pool([
  ['Garbage Vehicle', 180], ['Water Vehicle', 130], ['Coffee Delivery Truck', 80], ['Delivery Bike', 120],
  ['Inspection Officer Bike', 60], ['Waste Bins', 90], ['Delivery Centers', 40], ['Chiller Van', 109],
  ['Delivery Manager Bike', 70], ['Ambulance', 120],
]) // +QA Chiller Van → 110
const shiftPool = pool([['Stringer 234', 300], ['Stringer', 250], ['Day Shift', 200], ['Night Shift', 150], ['Street', 99]]) // +QA Street → 100
const healthPool = pool([['Good', 699], ['Fair', 200], ['Critical', 100]]) // +QA Good → 700
const colorPool = pool(COLORS.map((c, i) => [c, i === 0 ? 99 : 100])) // +QA Black → 100
const geoPool = pool([...HOTSPOTS, ...OUTLIERS].map((h) => [h, h.count])) // 999 slots

// 8 records ship EMPTY tab arrays (card empty states) — deterministic slots.
const EMPTY_TAB_INDEXES = new Set([50, 175, 300, 425, 550, 675, 800, 925]) // index into the 999 generated records

/* ── field helpers ──────────────────────────────────────────────────────── */
const usedPlates = new Set()
function plate() {
  for (;;) {
    const p = `${pick('ABCDEFGHJKLMNPRSTUVWXY'.split(''))} ${ri(10000, 99999)}`
    if (!usedPlates.has(p)) { usedPlates.add(p); return p }
  }
}
const vinChar = 'ABCDEFGHJKLMNPRSTUVWXYZ0123456789'.split('')
const vin = () => 'JT' + Array.from({ length: 15 }, () => pick(vinChar)).join('')
const imei = () => '3520' + Array.from({ length: 11 }, () => ri(0, 9)).join('')
const contact = () => `+971 5${ri(0, 9)} ${ri(100, 999)} ${ri(1000, 9999)}`
const pad2 = (n) => String(n).padStart(2, '0')
const clockTime = () => `${pad2(ri(0, 23))}:${pad2(ri(0, 59))}`
const eventTime = () => `${pad2(ri(1, 28))} Oct, 24 | ${pad2(ri(1, 12))}:${pad2(ri(0, 59))} ${pick(['AM', 'PM'])}`

const DWELL = {
  Idling: ['5 mins', '8 mins', '11 mins', '12 mins', '20 mins', '26 mins', '37 mins', '45 mins', '1 hr', '1 hr 35 mins', '2 hr'],
  Stopped: ['5 mins', '11 mins', '20 mins', '37 mins', '45 mins', '1 hr', '1 hr 35 mins', '2 hr', '3 hr', '4 hr', '6 hr'],
  'Non-Reporting': ['20 mins', '2 hr', '5 hr', '1 day 2 hr 30 mins', '2 days', '5 days'],
}
const MOVING_TS = ['Just now', '2 secs ago', '4 secs ago', '7 secs ago', '8 secs ago', '10 secs ago', '12 secs ago', '17 secs ago', '19 secs ago', '21 secs ago', '22 secs ago', '29 secs ago', '30 secs ago', '32 secs ago']
const LAST_RECORD = {
  Moving: ['Just now', '4 secs ago', '10 secs ago', '30 secs ago', '1 min ago'],
  Idling: ['1 min ago', '2 mins ago', '3 mins ago', '5 mins ago', '8 mins ago'],
  Stopped: ['1 min ago', '2 mins ago', '3 mins ago', '5 mins ago', '8 mins ago'],
  'Non-Reporting': ['23 mins ago', '45 mins ago', '2 hrs ago', '6 hrs ago', '1 day ago', '5 days ago'],
}
/** "1 hr 35 mins" → "1 hour 35 minutes" (the card's long-form status line). */
function longDuration(short) {
  return short
    .split(' ')
    .map((tok, i, all) => {
      const n = Number(all[i - 1])
      if (tok === 'hr') return n === 1 ? 'hour' : 'hours'
      if (tok === 'mins' || tok === 'min') return n === 1 ? 'minute' : 'minutes'
      return tok
    })
    .join(' ')
}

/** Moving rows' dwell = the short "since last fix" label, no "ago" (Figma
 *  "48 km/h · Just Now", "60 km/h · 12 secs"). */
const MOVING_DWELL = ['Just Now', '2 secs', '4 secs', '7 secs', '10 secs', '12 secs', '17 secs', '21 secs', '29 secs', '32 secs']

/* ── SPEC §2.6 columns-catalog vocabularies ─────────────────────────────── */
const NATIONALITIES = ['United Arab Emirates', 'India', 'Pakistan', 'Philippines', 'Egypt', 'Jordan', 'Nepal', 'Bangladesh', 'Sudan', 'Sri Lanka']
const RELIGIONS = ['Islam', 'Christianity', 'Hinduism', 'Buddhism', 'Not specified']
const LANGUAGE_SETS = ['Arabic, English', 'English, Hindi', 'English, Urdu', 'Arabic', 'English, Tagalog', 'English, Bengali']
const DEVICE_MAKES = ['Teltonika', 'Queclink', 'Ruptela', 'Concox', 'Suntech']
const DEVICE_MODELS = ['FMB920', 'GV75', 'FM-Eco4 S', 'GT06N', 'ST4340']
const DEVICE_STATUSES = ['Online', 'Offline', 'Idle']
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
const dmy = (minYear, maxYear) => `${ri(1, 28)} ${pick(MONTHS)} ${ri(minYear, maxYear)}`
const slug = (s) => s.toLowerCase().replace(/[^a-z]+/g, '.')

/** Every SPEC §2.6 catalog field that is not already a live-binding column. */
function makeCatalogFields(driverName, seq) {
  const [firstName, lastName] = driverName.split(' ')
  const manufacturingYear = ri(2014, 2024)
  const tank = ri(45, 320)
  const epaCity = ri(9, 26)
  const epaHwy = epaCity + ri(2, 8)
  return {
    manufacturingYear,
    registrationDate: dmy(manufacturingYear, manufacturingYear + 1),
    admissionDate: dmy(manufacturingYear + 1, 2025),
    enginePower: `${ri(90, 480)} hp`,
    topSpeed: `${ri(110, 210)} km/h`,
    maxAllowedSpeed: `${pick([80, 100, 110, 120])} km/h`,
    fuelTankCapacity: `${tank} L`,
    averageFuelConsumption: `${ri(60, 340) / 10} L/100 km`,
    epaCity: `${epaCity} mpg`,
    epaHighway: `${epaHwy} mpg`,
    epaCombined: `${Math.round((epaCity + epaHwy) / 2)} mpg`,
    length: `${ri(35, 125) / 10} m`,
    width: `${ri(16, 26) / 10} m`,
    height: `${ri(15, 40) / 10} m`,
    interiorVolume: `${ri(20, 180) / 10} m³`,
    groundVolume: `${ri(8, 60) / 10} m³`,
    cargo: `${ri(200, 9000).toLocaleString('en-US')} kg`,
    cargoVolume: `${ri(15, 420) / 10} m³`,
    curbWeight: `${ri(1200, 9500).toLocaleString('en-US')} kg`,
    grossVehicleWeight: `${ri(2500, 18000).toLocaleString('en-US')} kg`,
    maxPayload: `${ri(500, 9000).toLocaleString('en-US')} kg`,
    country: 'United Arab Emirates',
    timezone: 'Asia/Dubai (GST +04:00)',
    attachedDocuments: `${ri(0, 6)} files`,
    deviceName: pick(DEVICE_NAMES),
    deviceImei: imei(),
    deviceMake: pick(DEVICE_MAKES),
    deviceModel: pick(DEVICE_MODELS),
    deviceStatus: pick(DEVICE_STATUSES),
    deviceSerial: `SN-${ri(100000, 999999)}`,
    firmware: `0${ri(1, 9)}.${pad2(ri(0, 99))}.${pad2(ri(0, 99))}.Rev.${pad2(ri(1, 12))}`,
    deviceLife: `${ri(0, 6)} yr ${ri(1, 11)} mo`,
    deviceMobileNumber: contact(),
    firstName,
    lastName,
    gender: rand() < 0.78 ? 'Male' : 'Female',
    dateOfBirth: dmy(1972, 2001),
    nationality: pick(NATIONALITIES),
    religion: pick(RELIGIONS),
    languages: pick(LANGUAGE_SETS),
    email: `${slug(driverName)}${seq}@famsdemo.ae`,
    mobilePhone: contact(),
    driverReference: `DRV-${ri(1000, 9999)}`,
    driverDocuments: `${ri(0, 5)} files`,
  }
}

const EVENT_NAMES = [
  ['Harsh Braking', null], ['Overspeeding', 'Above 100 km/h limit'], ['Sharp Turn', null],
  ['Black Spot', 'Black Spot'], ['SOS Pressed', 'Driver panic button'], ['Harsh Acceleration', null],
  ['Idle Alert', 'Idle over 30 minutes'], ['Geofence Exit', 'Left assigned zone'],
]
const DEVICE_NAMES = ['GPS Tracker', 'Cold chain temperature sensor', 'Fuel Probe', 'Door Sensor', 'Dashcam']
const TRIP_DATE_LABELS = ['10 Oct', '11 Oct', '12 Oct', '13 Oct', '14 Oct']

function makeEvents(n, location) {
  return Array.from({ length: n }, (_, i) => {
    const [name, subtype] = pick(EVENT_NAMES)
    const critical = rand() < 0.7
    const ev = { id: `EV-${i}`, name, location, time: eventTime(), severity: critical ? 'critical' : 'warning' }
    if (subtype) ev.subtype = subtype
    if (!critical) ev.severityLabel = 'MINOR'
    return ev
  })
}
function makeTrips(n, origin, destinations) {
  return Array.from({ length: n }, (_, i) => ({
    id: `TR-${i}`,
    startTime: clockTime(),
    endTime: clockTime(),
    origin,
    // Figma's trip row ends on a greyed destination line under the terminus
    // dot; the DS renders it only when present, so every trip carries one.
    destination: pick(destinations),
    events: ri(0, 4),
    distance: `${ri(5, 60)} KM`,
    duration: `${ri(0, 3)}h ${ri(1, 59)}m`,
  }))
}
function makeTripDates() {
  const n = ri(3, 5)
  const dates = TRIP_DATE_LABELS.slice(0, n).map((label, i) => ({ id: `d${i + 1}`, label }))
  dates.push({ id: `d${n + 1}`, label: 'Today', today: true })
  return dates
}
function makeDevices(n) {
  return Array.from({ length: n }, (_, i) => {
    const name = pick(DEVICE_NAMES)
    const dv = { id: `DV-${i}`, name, imei: imei(), dataRec: clockTime() }
    const roll = rand()
    if (roll < 0.07) Object.assign(dv, { value: `${ri(51, 70)}°C`, valueTone: 'error', trend: true })
    else if (roll < 0.45) Object.assign(dv, { value: 'All Secure', valueTone: 'success' })
    else if (roll < 0.7) dv.value = `${ri(15, 45)}°C`
    else dv.value = `${ri(10, 99)}%`
    return dv
  })
}
function makeActivity() {
  const alerts = rand() < 0.3 ? 0 : ri(1, 9)
  return [
    { icon: 'alert-triangle', count: alerts === 0 ? '-' : alerts, tone: alerts === 0 ? 'neutral' : 'danger' },
    { icon: 'route', count: rand() < 0.1 ? '-' : ri(1, 9), tone: 'neutral' },
    { icon: 'speedometer-04', count: rand() < 0.08 ? '-' : `${ri(5, 95)} km`, tone: 'neutral' },
  ]
}
const PRIVATE_TAGS = ['Street', 'VIP', 'Leased', 'Trial Fleet', 'Under Watch']
function makePrivateTags(shiftType) {
  // "Street" doubles as a private tag (Figma "Tag: Street"); others sparse.
  const tags = []
  if (shiftType === 'Street') tags.push('Street')
  if (rand() < 0.15) tags.push(pick(PRIVATE_TAGS.slice(1)))
  return tags
}

/* ── the QA vehicle — Card 495:4143 field-by-field (SPEC §0 P0-2) ───────── */
const QA = {
  id: 'Z-7764',
  uniqueidentifier: 'Z-7764',
  title: 'Mitsubishi X6734',
  make: 'Mitsubishi',
  model: 'X6734',
  status: 'Stopped',
  plate: 'GFU47893',
  speed: 0,
  lat: 30.037, // popup Coordinates derive from lat/lng → renders "30.037 , 72.324"
  lng: 72.324,
  dwell: '2 mins',
  timestamp: 'since 2 mins',
  driver: 'Jhon Doe', // sic — Figma
  location: 'Rahsid Al-Makhtoom International Airport', // sic — Figma
  statusSince: 'since 2 minutes',
  shiftType: 'Street',
  privateTags: ['Street'],
  fuelType: 'Petrol',
  vehicleType: 'Chiller Van',
  health: 'Good',
  contact: '+1 000 000 0110',
  lastRecord: '23 Mins ago', // sic — Figma capitalization
  odometer: '0',
  sos: '--',
  temperature: '20°C',
  altitude: '0',
  vehicleColor: 'Black',
  vin: 'JT01BK3EH500911',
  imei: '352094089863184',
  assetStatus: 'Active',
  // SPEC §2.6 catalog fields (fixed values — the QA anchor stays deterministic).
  manufacturingYear: 2021,
  registrationDate: '12 Mar 2021',
  admissionDate: '05 Jun 2022',
  enginePower: '190 hp',
  topSpeed: '160 km/h',
  maxAllowedSpeed: '120 km/h',
  fuelTankCapacity: '80 L',
  averageFuelConsumption: '12.4 L/100 km',
  epaCity: '18 mpg',
  epaHighway: '24 mpg',
  epaCombined: '21 mpg',
  length: '5.2 m',
  width: '1.9 m',
  height: '2.1 m',
  interiorVolume: '3.4 m³',
  groundVolume: '1.2 m³',
  cargo: '1,200 kg',
  cargoVolume: '8.5 m³',
  curbWeight: '2,100 kg',
  grossVehicleWeight: '3,500 kg',
  maxPayload: '1,400 kg',
  country: 'United Arab Emirates',
  timezone: 'Asia/Dubai (GST +04:00)',
  attachedDocuments: '3 files',
  deviceName: 'Cold chain temperature sensor',
  deviceImei: '352094089863184',
  deviceMake: 'Teltonika',
  deviceModel: 'FMB920',
  deviceStatus: 'Online',
  deviceSerial: 'SN-482013',
  firmware: '03.27.06.Rev.03',
  deviceLife: '2 yr 4 mo',
  deviceMobileNumber: '+971 50 442 8891',
  firstName: 'Jhon',
  lastName: 'Doe',
  gender: 'Male',
  dateOfBirth: '14 Aug 1989',
  nationality: 'United Arab Emirates',
  religion: 'Islam',
  languages: 'Arabic, English',
  email: 'jhon.doe@famsdemo.ae',
  mobilePhone: '+1 000 000 0110',
  driverReference: 'DRV-7764',
  driverDocuments: '2 files',
  activity: [
    { icon: 'alert-triangle', count: '-', tone: 'neutral' },
    { icon: 'route', count: 7, tone: 'neutral' },
    { icon: 'speedometer-04', count: '48 km', tone: 'neutral' },
  ],
  events: Array.from({ length: 4 }, (_, i) => ({
    id: `EV-${i}`,
    name: 'Black Spot',
    subtype: 'Black Spot',
    location: 'Satwa Dubai',
    time: '07 Oct, 24 | 02:49 PM',
    severity: 'critical',
  })),
  tripDates: [
    { id: 'd1', label: '10 Oct' },
    { id: 'd2', label: '11 Oct' },
    { id: 'd3', label: '12 Oct' },
    { id: 'd4', label: '13 Oct' },
    { id: 'd5', label: '14 Oct' },
    { id: 'd6', label: 'Today', today: true },
    { id: 'd7', label: '15 Oct 2024' },
  ],
  trips: Array.from({ length: 2 }, (_, i) => ({
    id: `TR-${i}`,
    startTime: '15:30',
    endTime: '11:21',
    origin: 'Rahsid Al-Makhtoom International Airport',
    destination: i === 0 ? 'Jebel Ali Industrial Area 1' : 'Al Quoz Industrial Area 3',
    events: 2,
    distance: '30 KM',
    duration: '2h 43m',
  })),
  tripSummary: { distance: '43 km', trips: 30, duration: '2h43m' },
  devices: [
    { id: 'DV-0', name: 'Cold chain temperature sensor', imei: '352094089863184', dataRec: '12:32', value: '54°C', valueTone: 'error', trend: true },
    { id: 'DV-1', name: 'Cold chain temperature sensor', imei: '4901760034598235', dataRec: '12:32', value: 'All Secure', valueTone: 'success' },
    { id: 'DV-2', name: 'Cold chain temperature sensor', imei: '4901760034598235', dataRec: '12:32', value: 'All Secure', valueTone: 'success' },
  ],
}

/* ── generate the other 999 ─────────────────────────────────────────────── */
const records = [QA]
for (let i = 0; i < N - 1; i++) {
  const id = `Z-${restIds[i]}`
  const status = statusPool[i]
  const geo = geoPool[i]
  const [make, models] = pick(MAKES)
  const model = pick(models)
  const location = pick(geo.locations)
  const moving = status === 'Moving'
  // triangular-ish jitter around the hotspot center
  const jitter = () => (rand() + rand() + rand() - 1.5) * geo.spread * 2
  const lat = Number((geo.lat + jitter()).toFixed(6))
  const lng = Number((geo.lng + jitter()).toFixed(6))
  // `dwell` on EVERY record: bare duration when parked (marker chip, §2.3),
  // short since-last-fix label when moving (list SPEED summary, §2.2).
  const dwell = moving ? pick(MOVING_DWELL) : pick(DWELL[status])
  const timestamp = moving ? pick(MOVING_TS) : `${status === 'Idling' ? 'for' : 'since'} ${dwell}`
  const statusSince = moving
    ? `since ${pick(['2 minutes', '5 minutes', '12 minutes', '25 minutes', '1 hour'])}`
    : `since ${longDuration(dwell)}`
  const shiftType = shiftPool[i]
  const driverName = `${pick(FIRST)} ${pick(LAST)}`
  const emptyTabs = EMPTY_TAB_INDEXES.has(i)

  const rec = {
    id,
    uniqueidentifier: id,
    title: `${make} ${model}`,
    make,
    model,
    status,
    plate: plate(),
    speed: moving ? ri(12, 118) : 0,
    lat,
    lng,
    dwell,
    ...(moving ? { heading: ri(0, 359) } : {}),
    timestamp,
    driver: driverName,
    location,
    statusSince,
    shiftType,
    privateTags: makePrivateTags(shiftType),
    fuelType: fuelPool[i],
    vehicleType: vehicleTypePool[i],
    health: healthPool[i],
    contact: contact(),
    lastRecord: pick(LAST_RECORD[status]),
    odometer: `${ri(1200, 180000).toLocaleString('en-US')} km`,
    sos: rand() < 0.05 ? '--' : 'Normal',
    temperature: `${ri(17, 42)}°C`,
    altitude: `${ri(0, 90)} m`,
    vehicleColor: colorPool[i],
    vin: vin(),
    imei: imei(),
    assetStatus: assetStatusPool[i],
    ...makeCatalogFields(driverName, i),
    activity: emptyTabs ? [] : makeActivity(),
    events: emptyTabs ? [] : makeEvents(ri(2, 4), location),
    tripDates: emptyTabs ? [] : makeTripDates(),
    trips: emptyTabs ? [] : makeTrips(ri(2, 3), location, geo.locations),
    ...(emptyTabs ? {} : { tripSummary: { distance: `${ri(20, 160)} km`, trips: ri(2, 30), duration: `${ri(1, 9)}h${ri(1, 59)}m` } }),
    devices: emptyTabs ? [] : makeDevices(ri(2, 3)),
  }
  records.push(rec)
}

/* ── sanity + emit ──────────────────────────────────────────────────────── */
const z77 = records.filter((r) => r.uniqueidentifier.includes('Z-77'))
if (z77.length !== 6 || !z77.some((r) => r.id === 'Z-7764')) {
  throw new Error(`Z-77 invariant broken: ${z77.length} matches (${z77.map((r) => r.id).join(', ')})`)
}
if (new Set(records.map((r) => r.id)).size !== N) throw new Error('duplicate ids')
if (JSON.stringify(records).includes('picsum')) throw new Error('photo URL leaked into seeds')

writeFileSync(OUT, JSON.stringify(records, null, 2) + '\n')

const by = (key) =>
  Object.entries(records.reduce((m, r) => ((m[r[key]] = (m[r[key]] ?? 0) + 1), m), {}))
    .sort((a, b) => b[1] - a[1])
    .map(([k, v]) => `${k}=${v}`)
    .join(', ')
console.log(`wrote ${records.length} records → ${OUT}`)
console.log(`status: ${by('status')}`)
console.log(`fuelType: ${by('fuelType')}`)
console.log(`assetStatus: ${by('assetStatus')}`)
console.log(`vehicleType: ${by('vehicleType')}`)
console.log(`shiftType: ${by('shiftType')}`)
console.log(`health: ${by('health')}`)
console.log(`vehicleColor: ${by('vehicleColor')}`)
console.log(`dwell coverage: ${records.filter((r) => typeof r.dwell === 'string' && r.dwell !== '').length}/${records.length}`)
console.log(`Z-77 matches: ${z77.map((r) => r.id).join(', ')}`)
console.log(`empty-tab records: ${records.filter((r) => r.events.length === 0).map((r) => r.id).join(', ')}`)
