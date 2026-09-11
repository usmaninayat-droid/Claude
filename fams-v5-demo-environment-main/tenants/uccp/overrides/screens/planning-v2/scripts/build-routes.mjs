/**
 * One-off baker: real ROAD geometry for Plan Monitoring's replay map.
 *
 *   node --run build:routes        (or: node scripts/build-routes.mjs)
 *
 * The replay trails used to be synthesized as a Manhattan grid around each
 * zone center, which floated over blocks, sabkha and open desert instead of
 * following the streets the basemap actually draws (2026-09-04 feedback:
 * "make sure the routes and the lines on the map are actually aligned with the
 * map"). Routing at RUNTIME is not an option — the demo must work offline and
 * inside an iframe with no network budget — so we bake it once, here, and
 * commit `src/data/routes.json` into the source tree.
 *
 * For every one of the 14 static PM_ROWS runs, plus every zone in ZONE_DEFS
 * (the fallback table live host records borrow from), it:
 *   1. derives the stop chain with the SAME seeded PRNG the runtime uses
 *      (`src/data/stop-plan.ts` — imported, not duplicated),
 *   2. asks the public OSRM demo router for the driving route through those
 *      stops (actual = every stop; planned = minus the last, off-plan site),
 *   3. records OSRM's own snapped waypoint positions so the depot / assembly /
 *      discharge / site pins sit ON the road too.
 *
 * Politeness: strictly sequential, ~700 ms between calls, and a single retry.
 * If OSRM is unreachable the run aborts WITHOUT writing a partial table — the
 * runtime then falls back to the old synthetic `buildTrack`, which is why that
 * function is still there.
 */

import { writeFileSync, mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import {
  ZONE_DEFS, PM_ROW_SEEDS, makeRnd, consumePreStopRnd, makeAt, deriveStops, onLand,
} from '../src/data/stop-plan.ts';

const OSRM = 'https://router.project-osrm.org/route/v1/driving';
const DELAY_MS = 700;
const HERE = dirname(fileURLToPath(import.meta.url));
const OUT = join(HERE, '..', 'src', 'data', 'routes.json');

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/** `[lat,lng][]` → OSRM's `lng,lat;…` coordinate list. */
const coords = (pts) => pts.map(([lat, lng]) => `${lng.toFixed(6)},${lat.toFixed(6)}`).join(';');

/** OSRM output is BY DEFINITION on a real road, so it must NOT go through the
 *  synthetic `onLand` coastline clamp (that would shove a corniche road ~1 km
 *  inland and undo the whole point of routing). Only round it. */
const round = ([lat, lng]) => [Number(lat.toFixed(5)), Number(lng.toFixed(5))];

/** Ramer–Douglas–Peucker, tolerance in metres — OSRM returns a vertex every
 *  ~30 m even down a dead-straight highway; 4 m of tolerance keeps every bend
 *  the road actually has and cuts the committed table to a third. The runtime
 *  re-densifies to an even ~50 m GPS cadence anyway. */
const M_DEG = 1 / 111_320;
function simplify(path, tolM) {
  if (path.length < 3) return path.slice();
  const tol = tolM * M_DEG;
  const keep = new Uint8Array(path.length);
  keep[0] = keep[path.length - 1] = 1;
  const stack = [[0, path.length - 1]];
  while (stack.length) {
    const [i0, i1] = stack.pop();
    const a = path[i0];
    const b = path[i1];
    const dy = b[0] - a[0];
    const dx = (b[1] - a[1]) * 0.9;
    const l2 = dy * dy + dx * dx;
    let far = -1;
    let farD = tol;
    for (let i = i0 + 1; i < i1; i++) {
      const p = path[i];
      const t = l2 === 0 ? 0 : Math.max(0, Math.min(1, ((p[0] - a[0]) * dy + (p[1] - a[1]) * 0.9 * dx) / l2));
      const d = Math.hypot(a[0] + dy * t - p[0], (a[1] + (b[1] - a[1]) * t - p[1]) * 0.9);
      if (d > farD) { farD = d; far = i; }
    }
    if (far > 0) { keep[far] = 1; stack.push([i0, far], [far, i1]); }
  }
  return path.filter((_, i) => keep[i]);
}

async function osrm(stops, label) {
  const url = `${OSRM}/${coords(stops)}?overview=full&geometries=geojson`;
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const res = await fetch(url, { headers: { 'User-Agent': 'uccp-planning-v2-route-baker/1.0' } });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = await res.json();
      if (json.code !== 'Ok' || !json.routes?.[0]?.geometry?.coordinates?.length) {
        throw new Error(`OSRM code=${json.code}`);
      }
      return {
        geometry: simplify(json.routes[0].geometry.coordinates.map(([lng, lat]) => round([lat, lng])), 4),
        // OSRM reports where it snapped each requested waypoint onto the road
        // network — that is the true on-road position for that stop.
        snapped: (json.waypoints ?? []).map((w) => round([w.location[1], w.location[0]])),
        distance: json.routes[0].distance,
      };
    } catch (err) {
      if (attempt === 1) throw new Error(`${label}: ${err.message}`);
      await sleep(1500);
    }
  }
  return null;
}

/** One baked entry: stop chain → actual + planned road geometry. */
async function bake(key, rowSeed, anchor, zoneId) {
  const rnd = makeRnd(rowSeed.id, rowSeed.index);
  consumePreStopRnd(rnd, rowSeed);
  const plan = deriveStops(makeAt(anchor), rnd);

  const actual = await osrm(plan.stops, `${key} actual`);
  await sleep(DELAY_MS);
  const planned = await osrm(plan.plannedStops, `${key} planned`);
  await sleep(DELAY_MS);

  // Snapped waypoints come back in stop order: depot, assembly, sites…, apron…, discharge, depot.
  const snap = actual.snapped.length === plan.stops.length ? actual.snapped : plan.stops;
  const nSites = plan.sitePos.length;
  return {
    entry: {
      zoneId,
      anchor,
      stops: snap,
      depotPos: snap[0],
      assemblyPos: snap[1],
      sitePos: snap.slice(2, 2 + nSites),
      dischargePos: snap[snap.length - 2],
      actual: actual.geometry,
      planned: planned.geometry,
    },
    km: (actual.distance / 1000).toFixed(1),
  };
}

const table = {};
const log = [];

// 1) The 14 static Plan Monitoring runs.
for (let i = 0; i < PM_ROW_SEEDS.length; i++) {
  const s = PM_ROW_SEEDS[i];
  const zone = ZONE_DEFS[s.zoneIdx];
  const { entry, km } = await bake(s.id, {
    id: s.id, index: i, compliancePct: s.comp, progressTotal: s.total, progressDone: s.done,
  }, onLand(zone.center), zone.id);
  table[s.id] = entry;
  log.push(`  ok  ${s.id.padEnd(11)} ${zone.name.padEnd(21)} ${entry.actual.length.toString().padStart(4)} pts  ${km} km`);
  console.log(log[log.length - 1]);
}

// 2) One entry per zone — the table a live host record (FPL-xxxx) borrows when
//    its own coordinates aren't in the baked set. Seeded off the zone id so it
//    is stable and independent of the runs above.
for (let zi = 0; zi < ZONE_DEFS.length; zi++) {
  const zone = ZONE_DEFS[zi];
  const key = `zone-${zone.id}`;
  const { entry, km } = await bake(key, {
    id: key, index: zi, compliancePct: 80, progressTotal: 120, progressDone: 60,
  }, onLand(zone.center), zone.id);
  table[key] = entry;
  log.push(`  ok  ${key.padEnd(11)} ${zone.name.padEnd(21)} ${entry.actual.length.toString().padStart(4)} pts  ${km} km`);
  console.log(log[log.length - 1]);
}

mkdirSync(dirname(OUT), { recursive: true });
writeFileSync(OUT, `${JSON.stringify(table)}\n`);
console.log(`\nwrote ${OUT} — ${Object.keys(table).length} entries`);
