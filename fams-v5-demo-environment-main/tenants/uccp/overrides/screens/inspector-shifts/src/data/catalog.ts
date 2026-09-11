/**
 * Static reference data for the QATAR MME (Doha) waste-management context:
 * operational zones, Environmental Service Providers (contractors), inspectors,
 * the KPI / penalty-matrix violation catalogue, physical assets and the dynamic
 * checklist templates keyed by service type.
 *
 * All invented for the demo — not from the Figma sample data.
 *
 * ZONE SYNC (2026-09-01): the zone catalogue below is the SAME 16 Doha
 * catchment zones the Operations Center module ships in
 * `tenants/uccp/overrides/screens/operations-center/src/features/zones/zonesData.ts`
 * (`SEEDS`) — same names, same order, and `code` carries that module's own zone
 * id (`Z-1041`…`Z-1056`) so a lot named here resolves to the identical zone
 * there. `center` is the centroid of that module's road-following polygon for
 * the same zone, so every lot/sector pin in Inspector Shifts lands inside the
 * corresponding Operations Center boundary. Keep the two lists in step: adding
 * or renaming a zone in zonesData.ts means the same edit here.
 */
import type {
  Zone, Esp, Inspector, ViolationType, Asset, ChecklistTemplate, KpiCategory,
} from './types';

export const ZONES: Zone[] = [
  { id: 'z-wakrah-ind-1', name: 'Al Wakrah Industrial 1', code: 'Z-1041', center: { lat: 25.2620, lng: 51.5693 }, riskLevel: 'high' },
  { id: 'z-wakrah-ind-2', name: 'Al Wakrah Industrial 2', code: 'Z-1042', center: { lat: 25.2584, lng: 51.5909 }, riskLevel: 'medium' },
  { id: 'z-alsadd', name: 'Al Sadd', code: 'Z-1043', center: { lat: 25.2651, lng: 51.5351 }, riskLevel: 'high' },
  { id: 'z-ummsalal-1', name: 'Umm Salal 1', code: 'Z-1044', center: { lat: 25.2360, lng: 51.5313 }, riskLevel: 'medium' },
  { id: 'z-ummsalal-2', name: 'Umm Salal 2', code: 'Z-1045', center: { lat: 25.2379, lng: 51.5740 }, riskLevel: 'low' },
  { id: 'z-lusail-marina', name: 'Lusail Marina District', code: 'Z-1046', center: { lat: 25.2647, lng: 51.5184 }, riskLevel: 'medium' },
  { id: 'z-doha-port', name: 'Doha Port', code: 'Z-1047', center: { lat: 25.2991, lng: 51.5568 }, riskLevel: 'high' },
  { id: 'z-msheireb', name: 'Msheireb Second', code: 'Z-1048', center: { lat: 25.2829, lng: 51.5222 }, riskLevel: 'low' },
  { id: 'z-lusail-waterfront', name: 'Lusail Waterfront', code: 'Z-1049', center: { lat: 25.2774, lng: 51.5836 }, riskLevel: 'medium' },
  { id: 'z-industrial-area-1', name: 'Industrial Area 1', code: 'Z-1050', center: { lat: 25.2329, lng: 51.4732 }, riskLevel: 'high' },
  { id: 'z-westbay', name: 'West Bay', code: 'Z-1051', center: { lat: 25.2661, lng: 51.4946 }, riskLevel: 'medium' },
  { id: 'z-educationcity-2', name: 'Education City 2', code: 'Z-1052', center: { lat: 25.3098, lng: 51.5322 }, riskLevel: 'low' },
  { id: 'z-educationcity-1', name: 'Education City 1', code: 'Z-1053', center: { lat: 25.3216, lng: 51.5392 }, riskLevel: 'low' },
  { id: 'z-althumama', name: 'Al Thumama', code: 'Z-1054', center: { lat: 25.3260, lng: 51.5250 }, riskLevel: 'medium' },
  { id: 'z-doha-corniche', name: 'Doha Corniche Heritage', code: 'Z-1055', center: { lat: 25.3372, lng: 51.5182 }, riskLevel: 'high' },
  { id: 'z-alkhor', name: 'Al Khor Corniche', code: 'Z-1056', center: { lat: 25.3505, lng: 51.5352 }, riskLevel: 'medium' },
];

/**
 * Environmental Service Providers (waste-management contractors). All names are
 * fictional and invented for this demo — not real companies.
 */
export const ESPS: Esp[] = [
  { id: 'esp-nadeef', name: 'Nadeef Environmental', code: 'ESP-NDF', contactPerson: 'Khalid Al Mannai', zoneIds: ['z-alsadd', 'z-msheireb', 'z-doha-corniche'], slaCompliancePct: 92, avatarColor: '#0072D6' },
  { id: 'esp-greenarc', name: 'GreenArc Services', code: 'ESP-GRA', contactPerson: 'Sara Al Kuwari', zoneIds: ['z-educationcity-1', 'z-lusail-marina', 'z-industrial-area-1', 'z-westbay'], slaCompliancePct: 86, avatarColor: '#12B76A' },
  { id: 'esp-madar', name: 'Madar Waste Solutions', code: 'ESP-MDR', contactPerson: 'Tariq Al Emadi', zoneIds: ['z-wakrah-ind-1', 'z-wakrah-ind-2', 'z-doha-port'], slaCompliancePct: 79, avatarColor: '#F79009' },
  { id: 'esp-safwa', name: 'Safwa EcoServ', code: 'ESP-SFW', contactPerson: 'Reem Al Sulaiti', zoneIds: ['z-ummsalal-1', 'z-ummsalal-2', 'z-althumama'], slaCompliancePct: 95, avatarColor: '#9E77ED' },
  { id: 'esp-mirsal', name: 'Mirsal Urban Cleaning', code: 'ESP-MRS', contactPerson: 'Imran Farooqi', zoneIds: ['z-alkhor', 'z-lusail-waterfront', 'z-educationcity-2'], slaCompliancePct: 71, avatarColor: '#06B6D4' },
  { id: 'esp-bayan', name: 'Bayan Facility Care', code: 'ESP-BYN', contactPerson: 'Noura Al Misnad', zoneIds: ['z-lusail-marina', 'z-westbay', 'z-doha-port'], slaCompliancePct: 84, avatarColor: '#F63D68' },
  { id: 'esp-rimal', name: 'Rimal Sanitation Co.', code: 'ESP-RML', contactPerson: 'Yaqoob Al Attiyah', zoneIds: ['z-althumama', 'z-doha-corniche', 'z-wakrah-ind-1'], slaCompliancePct: 88, avatarColor: '#DC6803' },
];

/** Field inspectors. All names fictional. */
export const INSPECTORS: Inspector[] = [
  { id: 'insp-adnan', name: 'Adnan Al Rayes', badge: 'INS-0142', avatarColor: '#0072D6', homeZoneId: 'z-alsadd' },
  { id: 'insp-huda', name: 'Huda Al Marri', badge: 'INS-0118', avatarColor: '#9E77ED', homeZoneId: 'z-msheireb' },
  { id: 'insp-bilal', name: 'Bilal Siddiqui', badge: 'INS-0207', avatarColor: '#12B76A', homeZoneId: 'z-industrial-area-1' },
  { id: 'insp-mariam', name: 'Mariam Al Suwaidi', badge: 'INS-0231', avatarColor: '#F79009', homeZoneId: 'z-lusail-marina' },
  { id: 'insp-tariq', name: 'Tariq Habib', badge: 'INS-0185', avatarColor: '#06B6D4', homeZoneId: 'z-alkhor' },
  { id: 'insp-salma', name: 'Salma Al Dhaheri', badge: 'INS-0259', avatarColor: '#F63D68', homeZoneId: 'z-althumama' },
  { id: 'insp-jamal', name: 'Jamal Othman', badge: 'INS-0273', avatarColor: '#DC6803', homeZoneId: 'z-doha-corniche' },
  { id: 'insp-noor', name: 'Noor Abbas', badge: 'INS-0291', avatarColor: '#7F56D9', homeZoneId: 'z-wakrah-ind-1' },
];

export const CURRENT_INSPECTOR_ID = 'insp-adnan';

/**
 * KPI / penalty-matrix catalogue — 7 categories. zeroTolerance items skip ESP
 * self-rectification and escalate to the Project Officer immediately on report.
 */
export const VIOLATION_TYPES: ViolationType[] = [
  // Solid Waste
  { id: 'v-sw-missed', pmCode: 'PM-SW-01', category: 'Solid Waste', name: 'Missed scheduled collection round', nameAr: 'تفويت جولة الجمع', defaultSeverity: 'high', zeroTolerance: false, penaltyAed: 2400, rectifyWithinHrs: 6 },
  { id: 'v-sw-overflow', pmCode: 'PM-SW-02', category: 'Solid Waste', name: 'Overflowing bin left unattended', nameAr: 'حاوية ممتلئة', defaultSeverity: 'medium', zeroTolerance: false, penaltyAed: 1400, rectifyWithinHrs: 4 },
  { id: 'v-sw-binwash', pmCode: 'PM-SW-03', category: 'Solid Waste', name: 'Bin unwashed / persistent odour', nameAr: 'حاوية غير مغسولة', defaultSeverity: 'medium', zeroTolerance: false, penaltyAed: 950, rectifyWithinHrs: 12 },
  { id: 'v-sw-bulky', pmCode: 'PM-SW-04', category: 'Solid Waste', name: 'Bulky waste not removed on request', defaultSeverity: 'medium', zeroTolerance: false, penaltyAed: 1750, rectifyWithinHrs: 24 },
  { id: 'v-sw-segregation', pmCode: 'PM-SW-05', category: 'Solid Waste', name: 'Recyclables mixed with general waste', defaultSeverity: 'low', zeroTolerance: false, penaltyAed: 700, rectifyWithinHrs: 24 },
  { id: 'v-sw-dumping', pmCode: 'PM-SW-06', category: 'Solid Waste', name: 'Illegal dumping / hazardous spill', defaultSeverity: 'critical', zeroTolerance: true, penaltyAed: 8500, rectifyWithinHrs: 2 },
  // Mechanical Sweeping
  { id: 'v-ms-missed', pmCode: 'PM-MS-01', category: 'Mechanical Sweeping', name: 'Sweeping route left incomplete', defaultSeverity: 'high', zeroTolerance: false, penaltyAed: 2100, rectifyWithinHrs: 8 },
  { id: 'v-ms-quality', pmCode: 'PM-MS-02', category: 'Mechanical Sweeping', name: 'Debris remaining after sweep pass', defaultSeverity: 'medium', zeroTolerance: false, penaltyAed: 1150, rectifyWithinHrs: 8 },
  { id: 'v-ms-sand', pmCode: 'PM-MS-03', category: 'Mechanical Sweeping', name: 'Sand accumulation not cleared', defaultSeverity: 'medium', zeroTolerance: false, penaltyAed: 1300, rectifyWithinHrs: 12 },
  // Manual Sweeping
  { id: 'v-mn-absent', pmCode: 'PM-MN-01', category: 'Manual Sweeping', name: 'Manual sweeper not on station', defaultSeverity: 'medium', zeroTolerance: false, penaltyAed: 950, rectifyWithinHrs: 6 },
  { id: 'v-mn-quality', pmCode: 'PM-MN-02', category: 'Manual Sweeping', name: 'Footpath segment left unswept', defaultSeverity: 'low', zeroTolerance: false, penaltyAed: 550, rectifyWithinHrs: 12 },
  { id: 'v-mn-litter', pmCode: 'PM-MN-03', category: 'Manual Sweeping', name: 'Litter bins along route not emptied', defaultSeverity: 'medium', zeroTolerance: false, penaltyAed: 800, rectifyWithinHrs: 8 },
  // Fleet
  { id: 'v-fl-condition', pmCode: 'PM-FL-01', category: 'Fleet', name: 'Vehicle in unfit / unhygienic state', defaultSeverity: 'medium', zeroTolerance: false, penaltyAed: 1450, rectifyWithinHrs: 24 },
  { id: 'v-fl-leak', pmCode: 'PM-FL-02', category: 'Fleet', name: 'Leachate / fluid leak onto roadway', defaultSeverity: 'critical', zeroTolerance: true, penaltyAed: 6200, rectifyWithinHrs: 3 },
  { id: 'v-fl-gps', pmCode: 'PM-FL-03', category: 'Fleet', name: 'On-board GPS tracker offline', defaultSeverity: 'low', zeroTolerance: false, penaltyAed: 750, rectifyWithinHrs: 48 },
  { id: 'v-fl-overload', pmCode: 'PM-FL-04', category: 'Fleet', name: 'Vehicle operating over rated load', defaultSeverity: 'high', zeroTolerance: false, penaltyAed: 2600, rectifyWithinHrs: 6 },
  // EHS
  { id: 'v-ehs-ppe', pmCode: 'PM-EHS-01', category: 'EHS', name: 'Crew working without mandatory PPE', defaultSeverity: 'high', zeroTolerance: false, penaltyAed: 3200, rectifyWithinHrs: 1 },
  { id: 'v-ehs-unsafe', pmCode: 'PM-EHS-02', category: 'EHS', name: 'Unsafe practice / missing work-zone signage', defaultSeverity: 'high', zeroTolerance: false, penaltyAed: 2700, rectifyWithinHrs: 2 },
  { id: 'v-ehs-spill', pmCode: 'PM-EHS-03', category: 'EHS', name: 'Chemical / biohazard exposure', defaultSeverity: 'critical', zeroTolerance: true, penaltyAed: 11000, rectifyWithinHrs: 1 },
  { id: 'v-ehs-firstaid', pmCode: 'PM-EHS-04', category: 'EHS', name: 'First-aid kit missing / expired', defaultSeverity: 'low', zeroTolerance: false, penaltyAed: 650, rectifyWithinHrs: 24 },
  // Resource Allocation
  { id: 'v-ra-manpower', pmCode: 'PM-RA-01', category: 'Resource Allocation', name: 'Manpower below contracted headcount', defaultSeverity: 'medium', zeroTolerance: false, penaltyAed: 2000, rectifyWithinHrs: 24 },
  { id: 'v-ra-equipment', pmCode: 'PM-RA-02', category: 'Resource Allocation', name: 'Required equipment not deployed', defaultSeverity: 'medium', zeroTolerance: false, penaltyAed: 1700, rectifyWithinHrs: 24 },
  { id: 'v-ra-shift', pmCode: 'PM-RA-03', category: 'Resource Allocation', name: 'Shift not covered per roster', defaultSeverity: 'high', zeroTolerance: false, penaltyAed: 2300, rectifyWithinHrs: 8 },
  // PCC (Public Cleanliness Complaints)
  { id: 'v-pcc-complaint', pmCode: 'PM-PCC-01', category: 'PCC', name: 'Public cleanliness complaint unresolved', defaultSeverity: 'medium', zeroTolerance: false, penaltyAed: 1150, rectifyWithinHrs: 8 },
  { id: 'v-pcc-response', pmCode: 'PM-PCC-02', category: 'PCC', name: 'Complaint response SLA breached', defaultSeverity: 'high', zeroTolerance: false, penaltyAed: 1900, rectifyWithinHrs: 4 },
  { id: 'v-pcc-repeat', pmCode: 'PM-PCC-03', category: 'PCC', name: 'Repeat complaint at same location', defaultSeverity: 'high', zeroTolerance: false, penaltyAed: 2200, rectifyWithinHrs: 6 },
];

export const ASSETS: Asset[] = [
  { id: 'a-bin-01', type: 'Bin', label: '1100L Bin · Al Sadd Street', rfid: 'RFID-1043-1042', zoneId: 'z-alsadd', espId: 'esp-nadeef', location: { lat: 25.2658, lng: 51.5362 } },
  { id: 'a-bin-02', type: 'Bin', label: '660L Bin · Msheireb Park', rfid: 'RFID-1048-0231', zoneId: 'z-msheireb', espId: 'esp-nadeef', location: { lat: 25.2836, lng: 51.5231 } },
  { id: 'a-cont-01', type: 'Container', label: 'Skip Container · Umm Salal Depot', rfid: 'RFID-1044-7781', zoneId: 'z-ummsalal-1', espId: 'esp-safwa', location: { lat: 25.2368, lng: 51.5324 } },
  { id: 'a-cont-02', type: 'Container', label: '40yd Container · Doha Port', rfid: 'RFID-1047-3390', zoneId: 'z-doha-port', espId: 'esp-madar', location: { lat: 25.2999, lng: 51.5579 } },
  { id: 'a-veh-01', type: 'Sweeper Vehicle', label: 'Mechanical Sweeper · MS-204', rfid: 'RFID-VEH-0204', zoneId: 'z-lusail-marina', espId: 'esp-greenarc', location: { lat: 25.2655, lng: 51.5195 } },
  { id: 'a-veh-02', type: 'Sweeper Vehicle', label: 'Compactor Truck · CT-118', rfid: 'RFID-VEH-0118', zoneId: 'z-wakrah-ind-1', espId: 'esp-madar', location: { lat: 25.2628, lng: 51.5704 } },
  { id: 'a-street-01', type: 'Street Segment', label: 'Al Khor Corniche Rd · Seg 12', rfid: 'RFID-1056-0012', zoneId: 'z-alkhor', espId: 'esp-mirsal', location: { lat: 25.3513, lng: 51.5363 } },
  { id: 'a-street-02', type: 'Street Segment', label: 'Al Corniche St · Seg 47', rfid: 'RFID-1055-0047', zoneId: 'z-doha-corniche', espId: 'esp-nadeef', location: { lat: 25.3380, lng: 51.5193 } },
  { id: 'a-skip-01', type: 'Skip', label: 'Skip · Education City Pavilion', rfid: 'RFID-1052-0556', zoneId: 'z-educationcity-2', espId: 'esp-mirsal', location: { lat: 25.3106, lng: 51.5333 } },
  { id: 'a-bin-03', type: 'Bin', label: '1100L Bin · Lusail Marina Walk', rfid: 'RFID-1046-0889', zoneId: 'z-lusail-marina', espId: 'esp-bayan', location: { lat: 25.2639, lng: 51.5173 } },
  { id: 'a-bin-04', type: 'Bin', label: '240L Bin · Al Thumama Rd', rfid: 'RFID-1054-0417', zoneId: 'z-althumama', espId: 'esp-rimal', location: { lat: 25.3268, lng: 51.5261 } },
  { id: 'a-cont-03', type: 'Container', label: 'Skip Container · Lusail Waterfront', rfid: 'RFID-1049-6620', zoneId: 'z-lusail-waterfront', espId: 'esp-mirsal', location: { lat: 25.2782, lng: 51.5847 } },
  { id: 'a-street-03', type: 'Street Segment', label: 'West Bay · Seg 08', rfid: 'RFID-1051-0008', zoneId: 'z-westbay', espId: 'esp-greenarc', location: { lat: 25.2669, lng: 51.4957 } },
  { id: 'a-skip-02', type: 'Skip', label: 'Skip · Industrial Area 1', rfid: 'RFID-1050-0339', zoneId: 'z-industrial-area-1', espId: 'esp-greenarc', location: { lat: 25.2337, lng: 51.4743 } },
  { id: 'a-bin-05', type: 'Bin', label: '1100L Bin · Education City 1', rfid: 'RFID-1053-0110', zoneId: 'z-educationcity-1', espId: 'esp-greenarc', location: { lat: 25.3224, lng: 51.5403 } },
  { id: 'a-bin-06', type: 'Bin', label: '660L Bin · Umm Salal 2 Villas', rfid: 'RFID-1045-0662', zoneId: 'z-ummsalal-2', espId: 'esp-safwa', location: { lat: 25.2387, lng: 51.5751 } },
  { id: 'a-cont-04', type: 'Container', label: 'Skip Container · Al Wakrah Ind 2', rfid: 'RFID-1042-4418', zoneId: 'z-wakrah-ind-2', espId: 'esp-madar', location: { lat: 25.2592, lng: 51.5920 } },
];

const PF = 'pass_fail' as const;
const PHOTO = 'photo' as const;
const NUM = 'numeric' as const;

/**
 * KPI Categories master list — the ESP-contract KPI numbering scheme used by the
 * "Inspection KPIs" tab of the New Inspection flow (Tadweer design). Numbers are
 * intentionally non-contiguous (they map to a larger real-world penalty matrix
 * that this demo only partially models).
 */
export interface KpiCategoryDef {
  no: number;            // KPI number shown in the table, e.g. 1.0
  title: string;         // display title
  category: KpiCategory; // maps to the existing KpiCategory union
}

export const KPI_CATEGORIES: KpiCategoryDef[] = [
  { no: 1.0, title: 'Resource Allocation', category: 'Resource Allocation' },
  { no: 2.0, title: 'Solid Waste Collection & Transportation Services', category: 'Solid Waste' },
  { no: 3.0, title: 'Mechanical Sweeping / Sand Removal', category: 'Mechanical Sweeping' },
  { no: 4.0, title: 'Manual Sweeping & Cleaning Services', category: 'Manual Sweeping' },
  { no: 9.0, title: 'Vehicles / Fleet Management', category: 'Fleet' },
  { no: 10.0, title: 'Environmental, Health & Safety', category: 'EHS' },
  { no: 11.0, title: 'Public Cleanliness Complaints', category: 'PCC' },
];

/**
 * Deterministic per-lot KPI assignment — which KPI categories are "assigned to
 * this lot" per its ESP contract. Every zone (treated as a Lot elsewhere in the
 * app) gets a stable ~6-item subset of KPI_CATEGORIES, rotated by zone index so
 * different lots show different (but repeatable) KPI sets.
 */
export function kpiCategoriesForZone(zoneId: string): KpiCategoryDef[] {
  const idx = Math.max(0, ZONES.findIndex((z) => z.id === zoneId));
  const count = Math.min(6, KPI_CATEGORIES.length);
  return Array.from({ length: count }, (_, i) => KPI_CATEGORIES[(idx + i) % KPI_CATEGORIES.length]);
}

/** Canonical KPI line-item code "{categoryNo}.{itemIndex}" for a violation —
 *  rooted in KPI_CATEGORIES.no so the seed, the penalty flow, and the inspection
 *  KPI table all agree (e.g. Fleet violations → "9.x", Solid Waste → "2.x"). */
export function kpiCodeFor(violationId: string): string {
  const vt = VIOLATION_TYPES.find((v) => v.id === violationId);
  if (!vt) return '—';
  const catNo = Math.round(KPI_CATEGORIES.find((c) => c.category === vt.category)?.no ?? 0);
  const idx = VIOLATION_TYPES.filter((v) => v.category === vt.category).findIndex((v) => v.id === vt.id) + 1;
  return `${catNo}.${idx}`;
}

export const CHECKLIST_TEMPLATES: ChecklistTemplate[] = [
  {
    id: 'cl-binwash', serviceType: 'Bin Washing',
    items: [
      { id: 'bw-1', section: 'Condition', text: 'Bin exterior free of stains and residue', responseType: PF, required: true, violationTypeId: 'v-sw-binwash' },
      { id: 'bw-2', section: 'Condition', text: 'Bin interior washed and disinfected', responseType: PF, required: true, violationTypeId: 'v-sw-binwash' },
      { id: 'bw-3', section: 'Condition', text: 'No foul odour present', responseType: PF, required: true, violationTypeId: 'v-sw-binwash' },
      { id: 'bw-4', section: 'Compliance', text: 'Wash frequency matches schedule', responseType: PF, required: true },
      { id: 'bw-5', section: 'Evidence', text: 'Photo of washed bin captured', responseType: PHOTO, required: true },
    ],
  },
  {
    id: 'cl-collection', serviceType: 'Container Collection',
    items: [
      { id: 'cc-1', section: 'Service', text: 'Container emptied per schedule', responseType: PF, required: true, violationTypeId: 'v-sw-missed' },
      { id: 'cc-2', section: 'Service', text: 'No overflow at collection point', responseType: PF, required: true, violationTypeId: 'v-sw-overflow' },
      { id: 'cc-3', section: 'Service', text: 'Surroundings clear after collection', responseType: PF, required: true },
      { id: 'cc-4', section: 'Service', text: 'Bulky waste removed if present', responseType: PF, required: false, violationTypeId: 'v-sw-bulky' },
      { id: 'cc-5', section: 'Evidence', text: 'Fill level (%) recorded', responseType: NUM, required: false },
    ],
  },
  {
    id: 'cl-mechsweep', serviceType: 'Mechanical Street Sweeping',
    items: [
      { id: 'ms-1', section: 'Coverage', text: 'Assigned route fully completed', responseType: PF, required: true, violationTypeId: 'v-ms-missed' },
      { id: 'ms-2', section: 'Quality', text: 'No debris left along kerb line', responseType: PF, required: true, violationTypeId: 'v-ms-quality' },
      { id: 'ms-3', section: 'Quality', text: 'Gully gratings clear', responseType: PF, required: false },
      { id: 'ms-4', section: 'Fleet', text: 'Sweeper in serviceable condition', responseType: PF, required: true, violationTypeId: 'v-fl-condition' },
    ],
  },
  {
    id: 'cl-manualsweep', serviceType: 'Manual Sweeping',
    items: [
      { id: 'mn-1', section: 'Deployment', text: 'Sweeper deployed at assigned location', responseType: PF, required: true, violationTypeId: 'v-mn-absent' },
      { id: 'mn-2', section: 'Quality', text: 'Street segment swept to standard', responseType: PF, required: true, violationTypeId: 'v-mn-quality' },
      { id: 'mn-3', section: 'EHS', text: 'Worker wearing mandatory PPE', responseType: PF, required: true, violationTypeId: 'v-ehs-ppe' },
    ],
  },
  {
    id: 'cl-fleet', serviceType: 'Fleet & Vehicle',
    items: [
      { id: 'fl-1', section: 'Condition', text: 'Vehicle clean and hygienic', responseType: PF, required: true, violationTypeId: 'v-fl-condition' },
      { id: 'fl-2', section: 'Safety', text: 'No fluid / leachate leakage', responseType: PF, required: true, violationTypeId: 'v-fl-leak' },
      { id: 'fl-3', section: 'Compliance', text: 'GPS tracker functional', responseType: PF, required: true, violationTypeId: 'v-fl-gps' },
      { id: 'fl-4', section: 'Compliance', text: 'Trade-licence & permit valid', responseType: PF, required: false },
    ],
  },
  {
    id: 'cl-ehs', serviceType: 'EHS Compliance',
    items: [
      { id: 'eh-1', section: 'PPE', text: 'All workers in mandatory PPE', responseType: PF, required: true, violationTypeId: 'v-ehs-ppe' },
      { id: 'eh-2', section: 'Practice', text: 'Safe work practices observed', responseType: PF, required: true, violationTypeId: 'v-ehs-unsafe' },
      { id: 'eh-3', section: 'Hazard', text: 'No chemical / biohazard exposure', responseType: PF, required: true, violationTypeId: 'v-ehs-spill' },
      { id: 'eh-4', section: 'Signage', text: 'Work-zone signage in place', responseType: PF, required: false, violationTypeId: 'v-ehs-unsafe' },
    ],
  },
];
