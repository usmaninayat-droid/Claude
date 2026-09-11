// @ts-check
/**
 * Repo layout + IO helpers. Encodes the tenant-model folder contract so the
 * rest of the tools never hard-code paths.
 *
 *   core/modules/<m>/blueprint.json          canonical module
 *   tenants/<t>/tenant.json                  manifest (TenantConfig shape)
 *   tenants/<t>/deltas/<m>.ops.json          typed ops
 *   tenants/<t>/modules/<m>/blueprint.json   tenant-native module (overrides core)
 *   resolved/<t>/<m>.blueprint.json          GENERATED + COMMITTED
 *   resolved/<t>/<m>.provenance.json         GENERATED + COMMITTED
 */
import { readFileSync, writeFileSync, existsSync, readdirSync, mkdirSync, unlinkSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';

/** Repo root = two levels up from tools/lib. */
export const REPO_ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..');

export const paths = {
  coreModule: (root, m) => join(root, 'core', 'modules', m, 'blueprint.json'),
  coreModuleDir: (root, m) => join(root, 'core', 'modules', m),
  tenantDir: (root, t) => join(root, 'tenants', t),
  tenantManifest: (root, t) => join(root, 'tenants', t, 'tenant.json'),
  tenantModule: (root, t, m) => join(root, 'tenants', t, 'modules', m, 'blueprint.json'),
  tenantModuleDir: (root, t, m) => join(root, 'tenants', t, 'modules', m),
  deltas: (root, t, m) => join(root, 'tenants', t, 'deltas', `${m}.ops.json`),
  deltasDir: (root, t) => join(root, 'tenants', t, 'deltas'),
  deltasProposed: (root, t, m) => join(root, 'tenants', t, 'deltas', `${m}.ops.proposed.json`),
  // Capture-ladder ② tracked-debt record (COMMITTED, not gitignored): pins a
  // hand-edited resolved blueprint that was merged as flagged debt.
  overrideRecord: (root, t, m) => join(root, 'tenants', t, 'deltas', `${m}.override.json`),
  overridesDir: (root, t, m) => join(root, 'tenants', t, 'overrides', 'screens', m),
  overridesScreensDir: (root, t) => join(root, 'tenants', t, 'overrides', 'screens'),
  coreSeed: (root, m) => join(root, 'core', 'modules', m, 'seeds', `${m}.seed.json`),
  tenantSeed: (root, t, m) => join(root, 'tenants', t, 'seeds', `${m}.seed.json`),
  resolvedBlueprint: (root, t, m) => join(root, 'resolved', t, `${m}.blueprint.json`),
  resolvedProvenance: (root, t, m) => join(root, 'resolved', t, `${m}.provenance.json`),
  resolvedDir: (root, t) => join(root, 'resolved', t),
  debtDashboard: (root) => join(root, 'docs', 'debt-dashboard.md'),
};

export function readJson(file) {
  return JSON.parse(readFileSync(file, 'utf8'));
}

export function writeFileEnsuring(file, contents) {
  mkdirSync(dirname(file), { recursive: true });
  writeFileSync(file, contents);
}

/** Every tenant folder under tenants/, sorted. */
export function listTenants(root) {
  const dir = join(root, 'tenants');
  if (!existsSync(dir)) return [];
  return readdirSync(dir, { withFileTypes: true })
    .filter((d) => d.isDirectory())
    .map((d) => d.name)
    .sort();
}

/** Modules a tenant has licensed (manifest `modules`), sorted + deduped. */
export function licensedModules(manifest) {
  return [...new Set(manifest.modules ?? [])].sort();
}

/**
 * Locate a module's base blueprint for a tenant: a tenant-native module wins
 * over core. Returns { file, source } or null when neither exists.
 * @returns {{ file: string, source: 'core' | 'tenant-native' } | null}
 */
export function locateModule(root, tenant, module) {
  const native = paths.tenantModule(root, tenant, module);
  if (existsSync(native)) return { file: native, source: 'tenant-native' };
  const core = paths.coreModule(root, module);
  if (existsSync(core)) return { file: core, source: 'core' };
  return null;
}

/** Load a tenant's ops file for a module ({ module, ops }), or an empty set. */
export function readDeltas(root, tenant, module) {
  const file = paths.deltas(root, tenant, module);
  if (!existsSync(file)) return { module, ops: [] };
  const doc = readJson(file);
  return { module: doc.module ?? module, ops: doc.ops ?? [] };
}

/** True when a tenant has a bespoke override screen dir for the module. */
export function hasOverrides(root, tenant, module) {
  return existsSync(paths.overridesDir(root, tenant, module));
}

/**
 * Seed rows for a module: the tenant's own seed if present, else the core seed,
 * else an empty array. Mirrors the app's `getModuleSeed` precedence (tenant
 * overrides core) so a tools-level check sees exactly what the app would load.
 * @returns {Record<string, any>[]}
 */
export function readModuleSeed(root, tenant, module) {
  const tenantFile = paths.tenantSeed(root, tenant, module);
  if (existsSync(tenantFile)) {
    const rows = readJson(tenantFile);
    return Array.isArray(rows) ? rows : [];
  }
  const coreFile = paths.coreSeed(root, module);
  if (existsSync(coreFile)) {
    const rows = readJson(coreFile);
    return Array.isArray(rows) ? rows : [];
  }
  return [];
}

/** Names of a tenant's override-screen modules (overrides/screens/<m>), sorted. */
export function overrideModules(root, tenant) {
  const dir = paths.overridesScreensDir(root, tenant);
  if (!existsSync(dir)) return [];
  return readdirSync(dir, { withFileTypes: true })
    .filter((d) => d.isDirectory())
    .map((d) => d.name)
    .sort();
}

/** Outstanding `*.ops.proposed.json` basenames (module ids) for a tenant, sorted. */
export function proposedModules(root, tenant) {
  const dir = paths.deltasDir(root, tenant);
  if (!existsSync(dir)) return [];
  return readdirSync(dir)
    .filter((f) => f.endsWith('.ops.proposed.json'))
    .map((f) => f.slice(0, -'.ops.proposed.json'.length))
    .sort();
}

/**
 * Module ids carrying a COMMITTED capture-ladder-② override record
 * (`<m>.override.json`) for a tenant, sorted. This is tracked debt — distinct
 * from `overrideModules` (bespoke `overrides/screens/<m>` UI).
 */
export function overrideRecordModules(root, tenant) {
  const dir = paths.deltasDir(root, tenant);
  if (!existsSync(dir)) return [];
  return readdirSync(dir)
    .filter((f) => f.endsWith('.override.json'))
    .map((f) => f.slice(0, -'.override.json'.length))
    .sort();
}

/** Read a tenant module's override debt record, or null when none exists. */
export function readOverrideRecord(root, tenant, module) {
  const file = paths.overrideRecord(root, tenant, module);
  if (!existsSync(file)) return null;
  return readJson(file);
}

/**
 * Deterministic content hash of a module's COMMITTED resolved blueprint bytes —
 * the anchor an override record pins so `demo check` can detect a resolved file
 * that was edited again without re-flagging. Returns `sha256:<hex>`.
 */
export function hashResolvedBlueprint(root, tenant, module) {
  const file = paths.resolvedBlueprint(root, tenant, module);
  return `sha256:${createHash('sha256').update(readFileSync(file)).digest('hex')}`;
}

/** Remove a transient `<m>.ops.proposed.json` if present (no-op otherwise). */
export function removeProposed(root, tenant, module) {
  const file = paths.deltasProposed(root, tenant, module);
  if (existsSync(file)) unlinkSync(file);
}
