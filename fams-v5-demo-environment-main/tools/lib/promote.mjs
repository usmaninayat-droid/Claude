// @ts-check
/**
 * promote — the two module-lifecycle graduations (decision #16).
 *
 * OP PROMOTION (`--op <opId>`): a tenant delta has proven itself and belongs in
 * the shared product. Apply the op's effect to the CORE blueprint, remove the op
 * from the tenant's deltas, and re-resolve ALL tenants — so the inheritance is
 * visible in the diff (every tenant now carries the change from core).
 *
 * MODULE PROMOTION (`--module <m>`): a tenant-first incubated module is proven.
 * MOVE `tenants/<t>/modules/<m>` → `core/modules/<m>` (no copy stays behind),
 * grant the module in the tenant manifest, and re-resolve. The tenant then
 * renders 1:1 via core + zero deltas.
 */
import { existsSync, renameSync, mkdirSync } from 'node:fs';
import { dirname } from 'node:path';
import { validateBlueprint } from '@fams/v5-composer';
import { stableStringify } from './blueprint.mjs';
import { validateOp, applyOp } from './ops.mjs';
import { resolveAndWrite } from './resolve.mjs';
import {
  paths, readJson, writeFileEnsuring, readDeltas, listTenants,
  licensedModules, overrideRecordModules,
} from './repo.mjs';

/**
 * Find which licensed module's deltas hold an opId for a tenant. Scans EVERY
 * licensed module (not first-match) so a duplicate opId across modules is an
 * error, not a silent alphabetically-first pick.
 */
function findOp(root, tenant, opId) {
  const manifest = readJson(paths.tenantManifest(root, tenant));
  /** @type {{ module: string, index: number, op: any, ops: any[] }[]} */
  const matches = [];
  for (const module of licensedModules(manifest)) {
    const { ops } = readDeltas(root, tenant, module);
    const index = ops.findIndex((o) => o.opId === opId);
    if (index >= 0) matches.push({ module, index, op: ops[index], ops });
  }
  if (matches.length > 1) {
    const where = matches.map((m) => m.module).join(', ');
    throw new Error(`promote --op: opId "${opId}" is ambiguous — it appears in ${matches.length} modules (${where}) of tenant "${tenant}". opIds must be unique per tenant; rename one before promoting.`);
  }
  return matches[0] ?? null;
}

/**
 * Promote a single op into core.
 * @returns {{ module: string, opId: string, written: string[] }}
 */
export function promoteOp(root, tenant, opId) {
  const found = findOp(root, tenant, opId);
  if (!found) throw new Error(`promote --op: no op "${opId}" in any delta of tenant "${tenant}"`);
  const { module, index, op, ops } = found;

  // Refuse to promote out of a module that carries active override debt: its
  // resolved/ is a pinned hand-edit (capture ladder ②), so re-resolving after a
  // promote is skipped for it — the graduation would silently not take effect.
  if (overrideRecordModules(root, tenant).includes(module)) {
    throw new Error(`promote --op: op "${opId}" targets module "${module}" of tenant "${tenant}", which carries active override debt (tenants/${tenant}/deltas/${module}.override.json). Canonicalize the override first (delete the record + fold the edit into typed deltas, then re-resolve), then promote.`);
  }

  const coreFile = paths.coreModule(root, module);
  if (!existsSync(coreFile)) {
    throw new Error(`promote --op: op "${opId}" targets module "${module}" which has no core blueprint. Promote the module first (--module ${module}).`);
  }
  const core = readJson(coreFile);
  const schema = core.$schema;
  delete core.$schema;

  const errs = validateOp(op, core);
  if (errs.length) throw new Error(`promote --op: op "${opId}" does not apply to core "${module}":\n  - ${errs.join('\n  - ')}`);
  applyOp(core, op);

  const result = validateBlueprint(core);
  if (result.valid === false) {
    throw new Error(`promote --op: applying "${opId}" made core "${module}" invalid:\n  - ${result.errors.map((e) => `${e.path}: ${e.message}`).join('\n  - ')}`);
  }
  if (schema) core.$schema = schema;
  writeFileEnsuring(coreFile, stableStringify(core));

  // Remove the op from the tenant's deltas.
  const remaining = ops.filter((_, i) => i !== index);
  const deltasDoc = { $schema: '../../../tools/schemas/OpsFile.schema.json', module, ops: remaining };
  writeFileEnsuring(paths.deltas(root, tenant, module), stableStringify(deltasDoc));

  // Inheritance is visible: re-resolve everyone.
  const written = resolveAndWrite(root, null, listTenants);
  return { module, opId, written };
}

/**
 * Promote a tenant-native module into core (MOVE, no copy stays).
 * @returns {{ module: string, from: string, to: string, written: string[] }}
 */
export function promoteModule(root, tenant, module) {
  const from = paths.tenantModuleDir(root, tenant, module);
  const to = paths.coreModuleDir(root, module);
  if (!existsSync(from)) throw new Error(`promote --module: tenant "${tenant}" has no native module "${module}" at ${from}`);
  if (existsSync(to)) throw new Error(`promote --module: core already has a module "${module}" at ${to} — resolve the collision first`);
  if (overrideRecordModules(root, tenant).includes(module)) {
    throw new Error(`promote --module: module "${module}" of tenant "${tenant}" carries active override debt (tenants/${tenant}/deltas/${module}.override.json). Canonicalize the override first, then promote.`);
  }

  mkdirSync(dirname(to), { recursive: true });
  renameSync(from, to); // MOVE — decision #16: no copy stays behind.

  // Grant the module in the manifest (idempotent) so the tenant keeps rendering it.
  const manifestFile = paths.tenantManifest(root, tenant);
  const manifest = readJson(manifestFile);
  manifest.modules = [...new Set([...(manifest.modules ?? []), module])];
  writeFileEnsuring(manifestFile, stableStringify(manifest));

  const written = resolveAndWrite(root, null, listTenants);
  return { module, from, to, written };
}
