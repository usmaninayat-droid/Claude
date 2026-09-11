/**
 * Shared, PURE stop-chain derivation for Plan Monitoring's replay map.
 *
 * Both `src/App.tsx` (runtime) and `scripts/build-routes.mjs` (the one-off
 * OSRM baker) derive the same stop chain from the same seeded PRNG, so the
 * pre-baked road geometry in `src/data/routes.json` really belongs to the run
 * it is keyed by. Nothing here imports React, the DS, or the DOM — the Node
 * script consumes it through a tiny esbuild-free `tsx`-less path (it is plain
 * TS with no type-only runtime needs, transpiled on the fly by `node
 * --experimental-strip-types`).
 *
 * The coastline guard, zone footprints and the metre/degree helpers moved here
 * from App.tsx unchanged — App.tsx re-exports nothing, it imports them back.
 */

export type Pt = [number, number];

/** Metres → degrees of latitude (the ~10% longitude error at 25°N is
 *  invisible at this zoom and keeps the maths one-liner-cheap). */
export const M_DEG = 1 / 111_320;

/* ── Coastline guard ──────────────────────────────────────────────────────
 * Every synthesized coordinate is an offset from a zone center, and for a
 * coastal zone (West Bay, Msheireb/Corniche, Al Wakrah Corniche, Lusail)
 * those offsets happily land in Doha Bay. The Qatar east coast around Doha
 * runs broadly N–S, so a *longitude* clamp is enough: `shoreLng(lat)`
 * interpolates the waterline longitude from the reference latitudes below
 * (N→S — Al Khor down past Al Wakrah), and `onLand` pushes any point west of
 * it by a ~1 km inland safety strip. Latitude is never touched.
 */
export const COASTLINE: [number, number][] = [
  [25.72, 51.545], // Al Khor bay
  [25.60, 51.530],
  [25.50, 51.520],
  [25.45, 51.518], // Lusail north
  [25.40, 51.522],
  [25.37, 51.512], // West Bay lagoon / Pearl channel — conservative
  [25.35, 51.522], // Katara
  [25.33, 51.535], // Al Dafna
  [25.31, 51.534], // West Bay peninsula
  [25.29, 51.538], // Corniche / MIA
  [25.28, 51.556], // Ras Abu Aboud — land pushes back east
  [25.26, 51.578],
  [25.22, 51.596],
  [25.19, 51.606], // Al Wakrah
  [25.15, 51.612],
  [25.05, 51.600],
];
const SHORE_MARGIN = 0.010; // ≈1.0 km of dry land between geometry and water

export function shoreLng(lat: number): number {
  const c = COASTLINE;
  if (lat >= c[0][0]) return c[0][1];
  for (let i = 0; i < c.length - 1; i++) {
    const [la, ga] = c[i];
    const [lb, gb] = c[i + 1];
    if (lat <= la && lat >= lb) return ga + ((gb - ga) * (la - lat)) / (la - lb);
  }
  return c[c.length - 1][1];
}

/** Clamp a point to the landward side of the coast (see `COASTLINE`). */
export function onLand([lat, lng]: [number, number]): [number, number] {
  return [lat, Math.min(lng, shoreLng(lat) - SHORE_MARGIN)];
}

export function zoneBox([lat, lng]: [number, number], h = 0.022): [number, number][] {
  return ([[lat + h, lng - h], [lat + h, lng + h], [lat - h, lng + h], [lat - h, lng - h]] as [number, number][])
    .map(onLand);
}

/* Centers are the geometry anchors for EVERY map in this screen, so the
 * coastal ones sit deliberately inland of their namesake waterfront (a
 * ±0.022° box around a true-waterfront center is half sea). */
export const ZONE_DEFS: { id: string; name: string; center: Pt; covered: boolean }[] = [
  { id: 'z1', name: 'Al Wakrah Corniche', center: [25.165, 51.578], covered: true },
  { id: 'z2', name: 'Lusail Marina', center: [25.428, 51.478], covered: true },
  { id: 'z3', name: 'Al Rayyan Underpass', center: [25.292, 51.424], covered: true },
  { id: 'z4', name: 'Umm Salal', center: [25.401, 51.405], covered: false },
  { id: 'z5', name: 'Al Sadd', center: [25.272, 51.505], covered: true },
  { id: 'z6', name: 'Industrial Area', center: [25.192, 51.465], covered: false },
  { id: 'z7', name: 'Msheireb', center: [25.283, 51.512], covered: true },
  { id: 'z8', name: 'West Bay', center: [25.318, 51.502], covered: true },
  { id: 'z9', name: 'Al Khor', center: [25.676, 51.487], covered: false },
];

/* ── Plan Monitoring row seeds ────────────────────────────────────────────
 * The subset of each PM_ROWS entry the stop chain depends on (id, zone,
 * progress, compliance) — App.tsx builds the full rows from these, and the
 * baker replays them without having to import TSX. `zoneIdx` indexes
 * `ZONE_DEFS`; the sequence is the original `PM_ZONE_SEQ`.
 */
export const PM_ROW_SEEDS: { id: string; zoneIdx: number; total: number; done: number; comp?: number }[] =
  [0, 1, 2, 4, 6, 7, 0, 1, 2, 4, 6, 7, 0, 1].map((zoneIdx, i) => ({
    id: `PID-${231454 + i * 37}`,
    zoneIdx,
    total: [132, 145, 118, 129, 148, 131, 142, 115, 149, 124, 138, 119, 147, 108][i],
    done: [0, 0, 0, 0, 88, 72, 95, 55, 110, 67, 138, 119, 147, 108][i],
    comp: [undefined, undefined, undefined, undefined, 95, 89, 82, 91, 85, 97, 93, 84, 89, 90][i],
  }));

/* ── The seeded PRNG + the stop chain ────────────────────────────────────── */

/** The exact seeding `synthesizePlanDetail` uses: row id folded into an
 *  index-salted seed, then a plain LCG. */
export function makeRnd(rowId: string, index: number): (n: number) => number {
  let seed = index * 7919 + 13;
  for (let i = 0; i < rowId.length; i++) seed = (seed * 31 + rowId.charCodeAt(i)) | 0;
  return (n: number) => Math.abs((seed = (seed * 1103515245 + 12345) | 0)) % n;
}

/** Replays the rnd() calls `synthesizePlanDetail` makes BEFORE it derives the
 *  stop chain, so a caller that only wants the stops (the baker) lands on the
 *  same PRNG state the app does. Mirrors that prefix exactly — keep in sync. */
export function consumePreStopRnd(
  rnd: (n: number) => number,
  row: { compliancePct?: number; progressTotal?: number; progressDone?: number },
): void {
  if (row.compliancePct == null) rnd(35);       // compliance
  const extractedL = 900 + rnd(3200);           // extractedL
  rnd(600);                                     // allowedL
  void extractedL;
  const totalSites = row.progressTotal || 40 + rnd(80);
  if (!row.progressDone) rnd(60);               // doneSites
  void totalSites;
  rnd(20);                                      // offPlanTotal
}

/** Anchor-relative placement, clamped to the Doha working window and to land. */
export function makeAt(anchor: Pt): (dLat: number, dLng: number) => Pt {
  const [lat, lng] = anchor;
  return (dLat: number, dLng: number) => onLand([
    Math.min(25.72, Math.max(25.10, lat + dLat)),
    Math.min(51.66, Math.max(51.35, lng + dLng)),
  ]);
}

export interface StopPlan {
  depotPos: Pt;
  assemblyPos: Pt;
  dischargePos: Pt;
  sitePos: Pt[];
  apron: Pt[];
  /** Actual chain: depot → assembly → every site → apron loop → discharge → depot. */
  stops: Pt[];
  /** Scheduled chain: the same, minus the last (off-plan) site and the apron. */
  plannedStops: Pt[];
}

/**
 * Run geography — depot and discharge station sit outside the assigned zone
 * (as they do in reality), the response sites sit INSIDE the zone overlay
 * polygon (`zoneBox` half-width 0.022, so a ≤0.013 ring is always inside),
 * and the actual track visits every one of them.
 *
 * `at`/`rnd` are injected so the runtime can keep ONE continuous PRNG stream
 * across the whole of `synthesizePlanDetail` (every downstream value depends
 * on it) while the baker can drive the same derivation standalone.
 */
export function deriveStops(at: (dLat: number, dLng: number) => Pt, rnd: (n: number) => number): StopPlan {
  const depotPos = at(-0.026 - rnd(10) * 0.001, -0.031 - rnd(10) * 0.001);
  const dischargePos = at(0.023 + rnd(10) * 0.001, 0.026 + rnd(10) * 0.001);
  const incidentCount = 3 + rnd(3);
  const sitePos: Pt[] = Array.from({ length: incidentCount }, (_, i) => {
    const ang = (i / incidentCount) * Math.PI * 2 + rnd(40) / 100;
    const r = 0.006 + rnd(71) / 10000;
    return at(Math.sin(ang) * r, Math.cos(ang) * r);
  });
  const assemblyPos: Pt = onLand([(depotPos[0] + sitePos[0][0]) / 2, (depotPos[1] + sitePos[0][1]) / 2]);
  // Approach apron: the tanker circles the discharge station's geozone
  // (weighbridge queue) before backing in — the detour the crew always drives.
  const apron: Pt[] = ([
    [dischargePos[0] - 0.0038, dischargePos[1] + 0.0031],
    [dischargePos[0] + 0.0026, dischargePos[1] + 0.0044],
  ] as Pt[]).map(onLand);
  return {
    depotPos, assemblyPos, dischargePos, sitePos, apron,
    stops: [depotPos, assemblyPos, ...sitePos, ...apron, dischargePos, depotPos],
    plannedStops: [depotPos, assemblyPos, ...sitePos.slice(0, -1), dischargePos, depotPos],
  };
}

/* ── Geometry helpers shared by the baker and the runtime ────────────────── */

/** Great-ish-circle metres between two points (the 0.9 factor is the cos(25°N)
 *  longitude foreshortening, good enough at city scale). */
export function metresBetween(a: Pt, b: Pt): number {
  return Math.hypot(a[0] - b[0], (a[1] - b[1]) * 0.9) / M_DEG;
}

/** Re-samples a polyline so consecutive fixes are ≤ `stepM` metres apart —
 *  OSRM returns geometry vertices only where the road bends, which reads as a
 *  drawn line rather than a stream of GPS reports. */
export function densify(path: Pt[], stepM: number): Pt[] {
  if (path.length < 2) return path.slice();
  const out: Pt[] = [path[0]];
  for (let i = 1; i < path.length; i++) {
    const a = out[out.length - 1];
    const b = path[i];
    const n = Math.max(1, Math.ceil(metresBetween(a, b) / stepM));
    for (let k = 1; k <= n; k++) {
      const t = k / n;
      out.push([a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t]);
    }
  }
  return out;
}

/** Nearest point on `path` to `p` (and its index), used to sit a pin on the
 *  road the trail actually rides. */
export function nearestOnPath(path: Pt[], p: Pt): { point: Pt; index: number } {
  let best = { point: path[0], index: 0 };
  let bestD = Infinity;
  for (let i = 0; i < path.length - 1; i++) {
    const a = path[i];
    const b = path[i + 1];
    const dy = b[0] - a[0];
    const dx = (b[1] - a[1]) * 0.9;
    const l2 = dy * dy + dx * dx;
    const t = l2 === 0 ? 0 : Math.max(0, Math.min(1, ((p[0] - a[0]) * dy + (p[1] - a[1]) * 0.9 * dx) / l2));
    const q: Pt = [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t];
    const d = Math.hypot(q[0] - p[0], (q[1] - p[1]) * 0.9);
    if (d < bestD) { bestD = d; best = { point: q, index: i }; }
  }
  return best;
}

/**
 * Turns clean road geometry into something that reads like a GPS trace while
 * still hugging the road: densify to ~50 m fixes, add ±5–10 m of receiver
 * noise, and park a tight report cluster at each intermediate stop (the crew
 * working the site). Deterministic — the caller's seeded `rnd` is the only
 * entropy.
 */
export function gpsify(
  geometry: Pt[],
  stops: Pt[],
  rnd: (n: number) => number,
  opts: { stepM?: number; noiseM?: number; dwell?: number; maxPoints?: number } = {},
): Pt[] {
  const { stepM = 50, noiseM = 8, dwell = 4, maxPoints = 460 } = opts;
  if (geometry.length < 2) return geometry.slice();
  let dense = densify(geometry, stepM);
  // Point budget: thin evenly rather than widening the step (a wider step
  // would start cutting corners off the road).
  if (dense.length > maxPoints) {
    const keep = maxPoints;
    const stride = dense.length / keep;
    dense = Array.from({ length: keep }, (_, i) => dense[Math.min(dense.length - 1, Math.round(i * stride))]);
  }
  // Where along the densified path each intermediate stop falls.
  const dwellAt = new Map<number, Pt>();
  if (dwell > 0) {
    for (const s of stops.slice(1, -1)) {
      const { index, point } = nearestOnPath(dense, s);
      dwellAt.set(index, point);
    }
  }
  const out: Pt[] = [];
  const jit = () => (rnd(2 * noiseM + 1) - noiseM) * M_DEG;
  dense.forEach((p, i) => {
    out.push(i === 0 || i === dense.length - 1 ? p : [p[0] + jit(), p[1] + jit()]);
    const park = dwellAt.get(i);
    if (park) for (let d = 0; d < dwell; d++) out.push([park[0] + jit() * 0.6, park[1] + jit() * 0.6]);
  });
  return out;
}

/* ── The baked table ─────────────────────────────────────────────────────── */

export interface BakedRoute {
  /** Road-snapped stop positions, in stop-chain order, as OSRM matched them. */
  stops: Pt[];
  depotPos: Pt;
  assemblyPos: Pt;
  dischargePos: Pt;
  sitePos: Pt[];
  /** Clean OSRM driving geometry through every stop. */
  actual: Pt[];
  /** Clean OSRM driving geometry minus the last (off-plan) site. */
  planned: Pt[];
  /** Anchor the plan was derived around (a zone center, unless overridden). */
  anchor: Pt;
  zoneId: string;
}

export type BakedRoutes = Record<string, BakedRoute>;

/** Nearest baked ZONE entry to an arbitrary anchor — how a live host record
 *  (FPL-xxxx, its own lat/lng nowhere near a baked run) gets REAL roads: it
 *  borrows the closest zone's snapped geometry rather than a translated
 *  synthetic track. */
export function nearestBakedZone(table: BakedRoutes, anchor: Pt): BakedRoute | undefined {
  let best: BakedRoute | undefined;
  let bestD = Infinity;
  for (const [key, entry] of Object.entries(table)) {
    if (!key.startsWith('zone-')) continue;
    const d = metresBetween(anchor, entry.anchor);
    if (d < bestD) { bestD = d; best = entry; }
  }
  return best;
}
