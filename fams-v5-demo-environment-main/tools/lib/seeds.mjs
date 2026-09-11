// @ts-check
/**
 * Seed-integrity check (decision #17: "CI check every push" — catch a broken
 * demo dataset BEFORE it reaches the app). This is the tools-level port of the
 * app's boot-time validation (`@fams/demo-kit` `validateSeedRefs`, which throws a
 * loud `DanglingSeedRefError`): every SingleReference/MultiReference seed value
 * must resolve to a seeded record of the right entity type — but here it runs
 * WITHOUT booting the app, so CI catches it on every push.
 *
 * Two outcomes, deliberately distinct (the brief):
 *   - unknown-and-dangling → FAILURE. The target entityType IS registered by a
 *     licensed module (so the app turns it into a real store reference and
 *     validates it), yet the referenced id is not among that type's seeds.
 *   - known-inert → WARNING, never a silent pass. The target entityType has no
 *     licensed module (e.g. `device/tracker`), so the app never builds a store
 *     reference for it and never checks it. We surface it loudly so a real
 *     dangling ref can never hide behind "oh that one isn't wired up yet".
 *
 * Registration + id-collection mirror the app bridge (`app/src/demo/model.ts`
 * `buildEntitySchemas`/`buildSeedSet`): a reference `entityType` is "registered"
 * iff some licensed module's blueprint `code` equals it; a type's seeded ids
 * come from that module's seeds (tenant seed overrides core).
 */
import { paths, readJson, listTenants, licensedModules, readModuleSeed } from './repo.mjs';
import { resolveModule } from './resolve.mjs';

const REF_TYPES = new Set(['SingleReference', 'MultiReference']);

/**
 * Normalize a raw seed cell into the list of referenced id strings. Matches the
 * app: a `one` ref uses the scalar (falsy → no reference); a `many` ref uses the
 * array (non-array → no reference). Empty/nullish entries are not references.
 */
function refIds(raw, cardinality) {
  if (cardinality === 'one') return raw == null || raw === '' ? [] : [String(raw)];
  if (!Array.isArray(raw)) return [];
  return raw.filter((v) => v != null && v !== '').map(String);
}

/**
 * Validate every seed reference across all tenants.
 * @returns {{ errors: string[], warnings: string[] }}
 */
export function checkSeedIntegrity(root) {
  /** @type {string[]} */ const errors = [];
  /** @type {string[]} */ const warnings = [];

  for (const tenant of listTenants(root)) {
    let manifest;
    try { manifest = readJson(paths.tenantManifest(root, tenant)); }
    catch { continue; } // JSON / missing-manifest errors are reported by runCheck.
    const modules = licensedModules(manifest);

    /** module → resolved blueprint */
    const blueprints = {};
    /** entity code → Set<seeded id> */
    const idsByType = new Map();
    const registered = new Set();

    for (const m of modules) {
      let bp;
      try { bp = resolveModule(root, tenant, m).blueprint; }
      catch { continue; } // resolve failures are reported by runCheck; skip here.
      if (typeof bp.code !== 'string') continue;
      blueprints[m] = bp;
      registered.add(bp.code);
      const set = idsByType.get(bp.code) ?? new Set();
      for (const r of readModuleSeed(root, tenant, m)) {
        if (r && r.id != null) set.add(String(r.id));
      }
      idsByType.set(bp.code, set);
    }

    for (const m of modules) {
      const bp = blueprints[m];
      if (!bp) continue;
      const rows = readModuleSeed(root, tenant, m);
      for (const col of bp.systemcolumns ?? []) {
        if (!REF_TYPES.has(col.type) || typeof col.entityType !== 'string') continue;
        const target = col.entityType;
        const cardinality = col.type === 'MultiReference' ? 'many' : 'one';

        if (!registered.has(target)) {
          // known-inert: loud warning, not a silent pass.
          warnings.push(
            `seed-integrity: ${tenant}/${m} field ${col.col} ("${col.name}") → entityType "${target}" has no licensed module — INERT, not integrity-checked (${rows.length} seed row(s)).`,
          );
          continue;
        }

        const targetIds = idsByType.get(target) ?? new Set();
        for (const rec of rows) {
          for (const id of refIds(rec[col.col], cardinality)) {
            if (!targetIds.has(id)) {
              errors.push(
                `seed-integrity: ${tenant}/${m} seed ${bp.code}#${rec.id ?? '?'}.${col.col} → ${target}#${id} (missing)`,
              );
            }
          }
        }
      }
    }
  }

  return { errors, warnings };
}
