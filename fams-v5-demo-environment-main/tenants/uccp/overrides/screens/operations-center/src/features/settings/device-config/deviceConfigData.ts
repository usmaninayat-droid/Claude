export type HardwareStatus = 'fitted' | 'pending' | 'missing'
export type VehicleType = 'TNK' | 'PMP' | 'RES' | 'SUP'

export type FeatureId = 'immobilizer' | 'canBus' | 'iButton'

export interface FeatureState {
  status: HardwareStatus
  enabled: boolean
}

export interface Vehicle {
  id: string
  plate: string
  vin: string
  type: VehicleType
  model: string
  imei: string
  deviceModel: string | null
  features: Record<FeatureId, FeatureState>
  lastSeen: string
}

export interface FeatureDef {
  id: FeatureId
  label: string
  description: string
}

export const FEATURES: FeatureDef[] = [
  { id: 'immobilizer', label: 'Immobilizer', description: 'Remote engine-start disable' },
  { id: 'canBus',      label: 'CAN Bus',     description: 'Vehicle bus telemetry (fuel, RPM, faults)' },
  { id: 'iButton',     label: 'iButton',     description: 'Driver identification via contact key' },
]

export const HARDWARE_LABEL: Record<HardwareStatus, string> = {
  fitted: 'Fitted',
  pending: 'Pending',
  missing: 'Not fitted',
}

export const VEHICLE_TYPE_LABEL: Record<VehicleType, string> = {
  TNK: 'Water tanker',
  PMP: 'Pump truck',
  RES: 'Rescue vehicle',
  SUP: 'Support vehicle',
}

const f = (status: HardwareStatus, enabled: boolean = false): FeatureState => ({ status, enabled })

const VEHICLES_SEED_COUNT = 12

// Weighted toward TNK — the fleet is tanker-led, with a handful of pump,
// rescue and support vehicles rounding it out (matches the live-monitoring
// fleet's tanker vocabulary — `LMV-QA01`..`18` — plus the rest of the
// telematics-equipped inventory that isn't on the live map).
const TYPE_POOL: VehicleType[] = ['TNK', 'TNK', 'TNK', 'TNK', 'TNK', 'PMP', 'PMP', 'RES', 'SUP']
const MODEL_POOL: Record<VehicleType, string[]> = {
  TNK: ['Volvo FMX 460 Tanker', 'Mercedes Actros Tanker', 'MAN TGS 33.480 Tanker', 'Iveco Trakker Tanker', 'Scania P 410 Tanker'],
  PMP: ['MAN TGM Pump Unit', 'Isuzu FVR Pump Unit'],
  RES: ['Toyota Land Cruiser 79 Rescue', 'Ford F-550 Rescue'],
  SUP: ['Hino 500 Support', 'DAF LF Support'],
}
const DEVICE_POOL = ['Teltonika FMB920', 'Queclink GV350', 'Ruptela FM-Eco4']
const HW_DISTRIBUTION: HardwareStatus[] = [
  'fitted', 'fitted', 'fitted', 'fitted', 'fitted', 'fitted', 'fitted',
  'pending',
  'missing', 'missing',
]
const LAST_SEEN_POOL = ['Just now', '2m ago', '5m ago', '9m ago', '14m ago', '22m ago', '1h ago', '3h ago', '1d ago']

function pseudo(n: number) {
  let x = (n * 2654435761) >>> 0
  x ^= x >>> 15
  x = Math.imul(x, 2246822507)
  x ^= x >>> 13
  return (x >>> 0) / 0xffffffff
}
function pick<T>(arr: T[], r: number): T {
  return arr[Math.floor(r * arr.length) % arr.length]
}

function generateFleet(count: number, startOffset: number): Vehicle[] {
  const out: Vehicle[] = []
  for (let i = 0; i < count; i++) {
    const seed = startOffset + i
    const r1 = pseudo(seed)
    const r2 = pseudo(seed + 1000)
    const r3 = pseudo(seed + 2000)
    const r4 = pseudo(seed + 3000)
    const r5 = pseudo(seed + 4000)
    const r6 = pseudo(seed + 5000)
    const r7 = pseudo(seed + 6000)
    const type = pick(TYPE_POOL, r1)
    const model = pick(MODEL_POOL[type], r2)
    // Continues the live-monitoring fleet's `LMV-QA01`..`18` numbering.
    const plateNum = 18 + startOffset + i
    const immobStatus = pick(HW_DISTRIBUTION, r3)
    const canStatus = pick(HW_DISTRIBUTION, r4)
    const ibStatus = pick(HW_DISTRIBUTION, r5)
    const anyFitted = immobStatus === 'fitted' || canStatus === 'fitted' || ibStatus === 'fitted'
    const hasDevice = anyFitted || immobStatus === 'pending' || canStatus === 'pending' || ibStatus === 'pending'
    out.push({
      id: `v-gen-${seed}`,
      plate: `LMV-QA${String(plateNum).padStart(2, '0')}`,
      vin: `GEN${String(seed).padStart(4, '0')}${Math.floor(r6 * 1e10).toString().padStart(10, '0')}`.slice(0, 17),
      type,
      model,
      imei: hasDevice ? String(860355050000000 + Math.floor(r6 * 9999999)).padStart(15, '0').slice(0, 15) : '—',
      deviceModel: hasDevice ? pick(DEVICE_POOL, r7) : null,
      features: {
        immobilizer: f(immobStatus, immobStatus === 'fitted' && r3 > 0.35),
        canBus:      f(canStatus,   canStatus === 'fitted'   && r4 > 0.25),
        iButton:     f(ibStatus,    ibStatus === 'fitted'    && r5 > 0.4),
      },
      lastSeen: pick(LAST_SEEN_POOL, r7),
    })
  }
  return out
}

export const VEHICLES: Vehicle[] = [
  {
    id: 'v-qa01', plate: 'LMV-QA01', vin: '5N1AR2MN4EC612044', type: 'TNK', model: 'Volvo FMX 460 Tanker',
    imei: '860355041234567', deviceModel: 'Teltonika FMB920',
    features: { immobilizer: f('fitted', true), canBus: f('fitted', true),   iButton: f('fitted', true) },
    lastSeen: '2m ago',
  },
  {
    id: 'v-qa02', plate: 'LMV-QA02', vin: '1HGCM82633A004352', type: 'TNK', model: 'Mercedes Actros Tanker',
    imei: '860355047781243', deviceModel: 'Teltonika FMB920',
    features: { immobilizer: f('fitted', true), canBus: f('fitted', true),   iButton: f('missing') },
    lastSeen: 'Just now',
  },
  {
    id: 'v-qa03', plate: 'LMV-QA03', vin: 'JN8AZ1MW6BW000345', type: 'TNK', model: 'MAN TGS 33.480 Tanker',
    imei: '860355043320019', deviceModel: 'Queclink GV350',
    features: { immobilizer: f('missing'),      canBus: f('fitted', false),  iButton: f('missing') },
    lastSeen: '18m ago',
  },
  {
    id: 'v-qa04', plate: 'LMV-QA04', vin: 'JH4KA7561PC008269', type: 'PMP', model: 'MAN TGM Pump Unit',
    imei: '860355041998112', deviceModel: 'Queclink GV350',
    features: { immobilizer: f('fitted', true), canBus: f('pending'),        iButton: f('fitted', true) },
    lastSeen: '5m ago',
  },
  {
    id: 'v-qa05', plate: 'LMV-QA05', vin: 'WBA3B1C50DK000123', type: 'TNK', model: 'Iveco Trakker Tanker',
    imei: '860355044412001', deviceModel: 'Teltonika FMB920',
    features: { immobilizer: f('fitted', false), canBus: f('fitted', true),  iButton: f('fitted', false) },
    lastSeen: '1h ago',
  },
  {
    id: 'v-qa06', plate: 'LMV-QA06', vin: 'JT2BF22K8W0110099', type: 'PMP', model: 'Isuzu FVR Pump Unit',
    imei: '860355045521774', deviceModel: 'Queclink GV350',
    features: { immobilizer: f('fitted', true), canBus: f('fitted', true),   iButton: f('fitted', true) },
    lastSeen: '9m ago',
  },
  {
    id: 'v-qa07', plate: 'LMV-QA07', vin: 'JN1AZ34E8ZT000778', type: 'RES', model: 'Toyota Land Cruiser 79 Rescue',
    imei: '860355046611200', deviceModel: 'Teltonika FMB920',
    features: { immobilizer: f('pending'),      canBus: f('pending'),        iButton: f('pending') },
    lastSeen: '2d ago',
  },
  {
    id: 'v-qa08', plate: 'LMV-QA08', vin: '2T1BR32E45C374123', type: 'TNK', model: 'Volvo FMX 460 Tanker',
    imei: '860355047201888', deviceModel: 'Queclink GV350',
    features: { immobilizer: f('missing'),      canBus: f('fitted', true),   iButton: f('missing') },
    lastSeen: '11m ago',
  },
  {
    id: 'v-qa09', plate: 'LMV-QA09', vin: 'KMHDU4AD4AU006521', type: 'TNK', model: 'Mercedes Actros Tanker',
    imei: '860355047890321', deviceModel: 'Teltonika FMB920',
    features: { immobilizer: f('fitted', true), canBus: f('fitted', true),   iButton: f('fitted', true) },
    lastSeen: '3m ago',
  },
  {
    id: 'v-qa10', plate: 'LMV-QA10', vin: '5YJ3E1EA7JF000998', type: 'SUP', model: 'Hino 500 Support',
    imei: '860355048112544', deviceModel: 'Queclink GV350',
    features: { immobilizer: f('fitted', true), canBus: f('fitted', false),  iButton: f('missing') },
    lastSeen: '7m ago',
  },
  {
    id: 'v-qa11', plate: 'LMV-QA11', vin: 'WVWZZZ1JZ3W386752', type: 'TNK', model: 'MAN TGS 33.480 Tanker',
    imei: '—', deviceModel: null,
    features: { immobilizer: f('missing'),      canBus: f('missing'),        iButton: f('missing') },
    lastSeen: '22m ago',
  },
  {
    id: 'v-qa12', plate: 'LMV-QA12', vin: '1FTFW1EF1EKE12345', type: 'TNK', model: 'Scania P 410 Tanker',
    imei: '860355049001233', deviceModel: 'Teltonika FMB920',
    features: { immobilizer: f('fitted', false), canBus: f('fitted', true),  iButton: f('fitted', true) },
    lastSeen: '14m ago',
  },
  ...generateFleet(90, VEHICLES_SEED_COUNT),
]
