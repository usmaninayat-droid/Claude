// Dummy "raw data" behind each KPI, surfaced in the KPI detail side sheet.
// Columns mirror the Figma "KPI-Raw Data" frame (node 2227:79382): a routes
// table (Route / Plan / Vehicle / Driver / Response Type / Incident Type /
// Planned Time). Real per-KPI datasets can be swapped in later — for now every
// KPI shows this representative routes table with its own item count in the
// header.

export type RawRoute = {
  route: string
  plan: string
  vehicle: string
  driver: string
  service: string
  waste: string
  start: string
  end: string
}

const PLANS = [
  'Response Route Al Wakrah Corniche',
  'Response Route Lusail Marina',
  'Response Route Al Rayyan Road',
  'Response Route Umm Salal Roundabout',
  'Response Route Al Sadd Junction',
  'Response Route Salwa Road',
  'Response Route Industrial Area',
  'Response Route Msheireb Downtown',
  'Response Route Mesaieed Industrial Zone',
  'Response Route West Bay',
  'Response Route Al Khor Community',
  'Response Route Education City',
  'Response Route Doha Corniche',
  'Response Route Ras Laffan',
  'Response Route Al Wukair',
  'Response Route Al Khaleej',
]

const DRIVERS = [
  'Mohammed Al-Kuwari', 'Abdullah Al-Marri', 'Fahad Al-Sulaiti', 'Rashid Al-Naimi', 'Imran Khan',
  'Muhammad Iqbal', 'Ashraf Hossain', 'Rafiqul Islam', 'Suresh Kumar', 'Ravi Sharma',
  'Anil Nair', 'Nimal Perera', 'Sunil Fernando', 'Yousuf Al-Hajri', 'Khalid Al-Emadi',
  'Bilal Ahmed',
]

// A representative sample of rows (the sheet shows the full scrollable list;
// the true KPI count is shown in the header via `showing`).
export const rawRoutes: RawRoute[] = PLANS.map((plan, i) => ({
  route: `R-${42313 + i}`,
  plan,
  vehicle: `LMV-QA${String((i % 18) + 1).padStart(2, '0')}`,
  driver: DRIVERS[i % DRIVERS.length],
  service: 'Flood Response',
  waste: 'Storm Drain',
  start: '30 JUN | 06:00',
  end: '30 JUN | 14:00',
}))

/** Leading numeric part of a KPI value ("270/292" → 270, "26,683" → 26683). */
export function kpiCount(value: string): number {
  const digits = value.split('/')[0].replace(/[^0-9]/g, '')
  return digits ? Number(digits) : rawRoutes.length
}
