// @ts-check
/**
 * live-geo — DATASET-SHAPE integrity for the map-bearing (live) modules, the
 * companion to `seeds.mjs`' reference integrity. Reference integrity answers
 * "does this id exist"; this answers "is this row RENDERABLE and HONEST":
 *
 *   (a) FILL LEVEL — every row of a module whose blueprint binds
 *       `uiConfig.map.fillLevelCol` must carry a finite 0-100 value on that
 *       column. A missing value is the em-dash cell the FILL LEVEL column
 *       renders as its fallback, which reads as "broken demo", and it is
 *       invisible in JSON review because the column binding lives in the
 *       blueprint while the hole lives in the seed.
 *
 *   (b) SPEED ⇄ STATUS — a status colour is a promise about motion
 *       (RED = Stopped, ORANGE = Idling, GREEN = Moving). A stopped/idling/
 *       non-reporting row must read exactly 0 km/h, and a moving row must
 *       read a plausible road speed. Bound generically through
 *       `uiConfig.map.statusCol`/`speedCol`, so a tenant that renames either
 *       column is still checked.
 *
 *   (c) GEOFENCE — a tenant may pin its dataset to a bounding box
 *       (`tenant.json` `demoBounds`). Every record coordinate, zone vertex,
 *       POI, place and authored map centre must fall inside it. This is what
 *       keeps a Qatar demo from opening over Dubai because one row kept a
 *       placeholder coordinate.
 *
 *   (d) SHARED-FALLBACK GEOFENCE — a CORE seed is not owned by any tenant, but
 *       `getModuleSeed` hands it to any tenant that ships no seed of its own,
 *       so a core row is one blueprint edit away from rendering inside a
 *       geofenced tenant. When any tenant declares `demoBounds`, every core
 *       seed coordinate must therefore fall inside the UNION of the declared
 *       boxes. This is the rule that would have caught the 1,000-row UAE core
 *       live-monitoring seed sitting behind a Qatar deployment.
 *
 * All four are OPT-IN by what the metadata already declares — a module that
 * binds no `fillLevelCol` is not fill-checked, a tenant that declares no
 * `demoBounds` is not geofenced — so the rule stays generic across tenants.
 */
import { readdirSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { paths, readJson, listTenants, licensedModules, readModuleSeed } from './repo.mjs';
import { resolveModule } from './resolve.mjs';

/** Statuses that MUST read exactly 0 km/h, lowercased. */
const STOPPED_STATUSES = new Set(['stopped', 'idling', 'idle', 'parked', 'non-reporting', 'offline']);
/** Statuses that MUST read a plausible road speed, lowercased. */
const MOVING_STATUSES = new Set(['moving', 'driving', 'in transit']);
const MIN_MOVING_KMH = 20;
const MAX_MOVING_KMH = 80;

const num = (v) => (typeof v === 'number' ? v : typeof v === 'string' && v.trim() !== '' ? Number(v) : NaN);

/**
 * @param {{minLat:number,maxLat:number,minLng:number,maxLng:number}} b
 * @param {number} lng @param {number} lat
 */
const inBounds = (b, lng, lat) =>
  Number.isFinite(lat) && Number.isFinite(lng) &&
  lat >= b.minLat && lat <= b.maxLat && lng >= b.minLng && lng <= b.maxLng;

/** Read a tenant's declared demo bounding box, if any. */
function readBounds(manifest) {
  const b = manifest?.demoBounds;
  if (!b) return null;
  const keys = ['minLat', 'maxLat', 'minLng', 'maxLng'];
  if (!keys.every((k) => typeof b[k] === 'number')) return null;
  return { minLat: b.minLat, maxLat: b.maxLat, minLng: b.minLng, maxLng: b.maxLng, label: b.label ?? 'demo bounds' };
}

/**
 * @returns {{ errors: string[], warnings: string[] }}
 */
/** Every `[lng, lat]`-ish pair reachable anywhere inside a JSON value. */
function collectCoordinates(node, out = []) {
  if (Array.isArray(node)) {
    // A bare `[lng, lat]` position pair.
    if (node.length === 2 && node.every((v) => typeof v === 'number')) out.push([node[0], node[1]]);
    for (const v of node) collectCoordinates(v, out);
    return out;
  }
  if (node && typeof node === 'object') {
    const lat = num(node.lat ?? node.latitude);
    const lng = num(node.lng ?? node.lon ?? node.longitude);
    if (Number.isFinite(lat) && Number.isFinite(lng)) out.push([lng, lat]);
    for (const v of Object.values(node)) collectCoordinates(v, out);
  }
  return out;
}

/**
 * Rule (d): core seeds are SHARED fallbacks, so they must respect the union of
 * every declared tenant bounding box. Reported per file with a sample, not per
 * row — a wrong-country seed is one finding, not a thousand.
 */
function checkCoreSeedBounds(root, boxes) {
  /** @type {string[]} */ const errors = [];
  if (boxes.length === 0) return errors;
  const union = {
    minLat: Math.min(...boxes.map((b) => b.minLat)),
    maxLat: Math.max(...boxes.map((b) => b.maxLat)),
    minLng: Math.min(...boxes.map((b) => b.minLng)),
    maxLng: Math.max(...boxes.map((b) => b.maxLng)),
  };
  const coreModules = join(root, 'core', 'modules');
  if (!existsSync(coreModules)) return errors;
  for (const moduleId of readdirSync(coreModules)) {
    const seedDir = join(coreModules, moduleId, 'seeds');
    if (!existsSync(seedDir)) continue;
    for (const file of readdirSync(seedDir).filter((f) => f.endsWith('.seed.json'))) {
      let data;
      try { data = readJson(join(seedDir, file)); } catch { continue; }
      const outside = collectCoordinates(data).filter(([lng, lat]) => !inBounds(union, lng, lat));
      if (outside.length === 0) continue;
      const [lng, lat] = outside[0];
      errors.push(
        `live-geo: core/modules/${moduleId}/seeds/${file} has ${outside.length} coordinate(s) outside every declared tenant demoBounds ` +
          `(e.g. [${lng}, ${lat}]; union lat ${union.minLat}..${union.maxLat}, lng ${union.minLng}..${union.maxLng}). ` +
          `A core seed is the fallback for any tenant shipping none of its own, so it must stay inside the demo's own geography.`,
      );
    }
  }
  return errors;
}

export function checkLiveGeoIntegrity(root) {
  /** @type {string[]} */ const errors = [];
  /** @type {string[]} */ const warnings = [];
  /** @type {{minLat:number,maxLat:number,minLng:number,maxLng:number}[]} */ const declaredBoxes = [];

  for (const tenant of listTenants(root)) {
    let manifest;
    try { manifest = readJson(paths.tenantManifest(root, tenant)); }
    catch { continue; }
    const bounds = readBounds(manifest);
    if (bounds) declaredBoxes.push(bounds);

    for (const m of licensedModules(manifest)) {
      let bp;
      try { bp = resolveModule(root, tenant, m).blueprint; }
      catch { continue; }
      const map = bp?.uiConfig?.map;
      if (!map) continue;
      const where = `live-integrity: ${tenant}/${m}`;
      const rows = readModuleSeed(root, tenant, m);

      // Workforce rows (2026-08-31 "add WORKFORCE alongside vehicles"
      // enhancement) share this SAME module's seed with the vehicle rows,
      // told apart by `uiConfig.map.workforce.kindCol` — the vehicle-only
      // checks below (fill level, speed⇄status) don't apply to a person, so
      // they're excluded from `rows` for those two checks only. Every OTHER
      // check (geofence, etc.) still runs over the full row set, workforce
      // included — a workforce member's coordinates still have to be inside
      // the tenant's demo bounds.
      const kindCol = map.workforce?.kindCol;
      const vehicleRows = kindCol
        ? rows.filter((r) => String(r?.[kindCol] ?? '').trim().toLowerCase() !== 'workforce')
        : rows;

      // (a) fill level
      if (typeof map.fillLevelCol === 'string') {
        for (const r of vehicleRows) {
          const v = num(r?.[map.fillLevelCol]);
          if (!Number.isFinite(v)) {
            errors.push(`${where} #${r?.id ?? '?'}: no "${map.fillLevelCol}" — the FILL LEVEL column renders "—".`);
          } else if (v < 0 || v > 100) {
            errors.push(`${where} #${r?.id ?? '?'}: ${map.fillLevelCol}=${v} is outside 0-100.`);
          }
        }
      }

      // (b) speed ⇄ status
      if (typeof map.speedCol === 'string' && typeof map.statusCol === 'string') {
        for (const r of vehicleRows) {
          const status = String(r?.[map.statusCol] ?? '').trim().toLowerCase();
          const speed = num(r?.[map.speedCol]);
          if (!status) continue;
          if (STOPPED_STATUSES.has(status)) {
            if (speed !== 0) errors.push(`${where} #${r?.id ?? '?'}: status "${r[map.statusCol]}" must read 0 km/h, got ${r?.[map.speedCol]}.`);
          } else if (MOVING_STATUSES.has(status)) {
            if (!Number.isFinite(speed) || speed < MIN_MOVING_KMH || speed > MAX_MOVING_KMH) {
              errors.push(`${where} #${r?.id ?? '?'}: status "${r[map.statusCol]}" must read ${MIN_MOVING_KMH}-${MAX_MOVING_KMH} km/h, got ${r?.[map.speedCol]}.`);
            }
          } else {
            warnings.push(`${where} #${r?.id ?? '?'}: status "${r[map.statusCol]}" is not classified as moving or stopped — speed not checked.`);
          }
        }
      }

      // (c) geofence — records, then every authored map geometry.
      if (!bounds) continue;
      const outside = (what, lng, lat) =>
        errors.push(`${where} ${what} at [${lng}, ${lat}] is outside ${bounds.label}.`);

      if (typeof map.latCol === 'string' && typeof map.lngCol === 'string') {
        for (const r of rows) {
          const lat = num(r?.[map.latCol]);
          const lng = num(r?.[map.lngCol]);
          if (!Number.isFinite(lat) && !Number.isFinite(lng)) continue;
          if (!inBounds(bounds, lng, lat)) outside(`record #${r?.id ?? '?'}`, lng, lat);
        }
      }
      if (Array.isArray(map.center) && map.center.length === 2) {
        const [lng, lat] = map.center.map(num);
        if (!inBounds(bounds, lng, lat)) outside('uiConfig.map.center', lng, lat);
      }
      for (const key of ['pois', 'places']) {
        for (const p of map[key] ?? []) {
          const [lng, lat] = (p?.position ?? []).map(num);
          if (!inBounds(bounds, lng, lat)) outside(`${key} "${p?.name ?? p?.id ?? '?'}"`, lng, lat);
        }
      }
      for (const z of map.zones ?? []) {
        for (const pt of z?.points ?? []) {
          const [lng, lat] = (pt ?? []).map(num);
          if (!inBounds(bounds, lng, lat)) outside(`zone "${z?.id ?? '?'}" vertex`, lng, lat);
        }
      }
    }
  }

  errors.push(...checkCoreSeedBounds(root, declaredBoxes));

  return { errors, warnings };
}
