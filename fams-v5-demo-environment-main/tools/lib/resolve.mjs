// @ts-check
/**
 * The resolver: base blueprint (core or tenant-native) + ordered typed deltas
 * → a complete per-tenant blueprint plus per-node provenance. "Deltas are the
 * database, resolved is the UI" (tenant-model.md; decision #14).
 *
 * Overrides (`tenants/<t>/overrides/screens/<m>`) are REFERENCED, never merged
 * into the blueprint — the tenant-model keeps bespoke screens out of the
 * composed config.
 */
import { validateBlueprint } from '@fams/v5-composer';
import { deepClone, collectNodeIds, stableStringify } from './blueprint.mjs';
import { validateOp, applyOp } from './ops.mjs';
import {
  paths, readJson, writeFileEnsuring, locateModule, readDeltas,
  hasOverrides, licensedModules, overrideRecordModules,
} from './repo.mjs';

/**
 * Resolve one module for one tenant, in memory.
 * @returns {{
 *   module: string, tenant: string, source: 'core' | 'tenant-native',
 *   blueprint: Record<string, any>,
 *   provenance: { module: string, tenant: string, base: string,
 *                 overrides: string[], nodes: Record<string, any> },
 * }}
 */
export function resolveModule(root, tenant, module) {
  const located = locateModule(root, tenant, module);
  if (!located) {
    throw new Error(`resolve: tenant "${tenant}" licenses module "${module}" but no blueprint exists (neither core/modules/${module} nor tenants/${tenant}/modules/${module})`);
  }

  const base = readJson(located.file);
  // Generated output carries no authoring $schema hint (its relative path would
  // be wrong from resolved/ and it plays no role in validation).
  delete base.$schema;

  const blueprint = deepClone(base);
  /** @type {Record<string, any>} */
  const nodes = {};
  for (const id of collectNodeIds(blueprint)) nodes[id] = { source: located.source };

  const { ops } = readDeltas(root, tenant, module);
  ops.forEach((op, index) => {
    const errs = validateOp(op, blueprint);
    if (errs.length) {
      throw new Error(`resolve: invalid op at ${tenant}/deltas/${module}.ops.json[${index}]:\n  - ${errs.join('\n  - ')}`);
    }
    const effect = applyOp(blueprint, op);
    for (const id of effect.touched ?? []) {
      nodes[id] = { source: 'delta', op: op.op, opId: op.opId, opIndex: index };
    }
    for (const id of effect.removed ?? []) delete nodes[id];
  });

  // Resolved output must be a structurally valid blueprint.
  const result = validateBlueprint(blueprint);
  if (result.valid === false) {
    const detail = result.errors.map((e) => `${e.path}: ${e.message}`).join('\n  - ');
    throw new Error(`resolve: ${tenant}/${module} failed validateBlueprint:\n  - ${detail}`);
  }

  const overrides = hasOverrides(root, tenant, module)
    ? [`tenants/${tenant}/overrides/screens/${module}`]
    : [];

  return {
    module,
    tenant,
    source: located.source,
    blueprint,
    provenance: { module, tenant, base: located.source, overrides, nodes },
  };
}

/** Resolve every licensed module for one tenant. */
export function resolveTenant(root, tenant) {
  const manifest = readJson(paths.tenantManifest(root, tenant));
  return licensedModules(manifest).map((m) => resolveModule(root, tenant, m));
}

/**
 * Write a resolved module's blueprint + provenance to disk (deterministic).
 * @returns {{ blueprintFile: string, provenanceFile: string }}
 */
export function writeResolved(root, resolved) {
  const { tenant, module, blueprint, provenance } = resolved;
  const blueprintFile = paths.resolvedBlueprint(root, tenant, module);
  const provenanceFile = paths.resolvedProvenance(root, tenant, module);
  writeFileEnsuring(blueprintFile, stableStringify(blueprint));
  writeFileEnsuring(provenanceFile, stableStringify(provenance));
  return { blueprintFile, provenanceFile };
}

/**
 * Resolve + write for a tenant (or all tenants when tenant is null).
 *
 * OVERRIDE-AWARE (capture ladder ②): a tenant module carrying a committed
 * `<m>.override.json` debt record pins a HAND-EDITED resolved blueprint whose
 * hash is anchored in the record and enforced by `demo check`. Regenerating it
 * from core + committed deltas would CLOBBER that pinned content and then trip
 * check's hash guard with a misleading "edited again without re-flagging"
 * failure. So we SKIP writing any override module here — its resolved/ is left
 * exactly as pinned — and emit a loud notice naming the skipped module + its
 * debt. (Resolution still happens in memory via resolveTenant so a broken delta
 * still surfaces; only the WRITE is skipped.)
 *
 * @returns {string[]} written file paths, sorted (skipped override modules are
 * excluded — they were intentionally left untouched)
 */
export function resolveAndWrite(root, tenant, listTenantsFn) {
  const tenants = tenant ? [tenant] : listTenantsFn(root);
  const written = [];
  /** @type {{ tenant: string, module: string }[]} */
  const skipped = [];
  for (const t of tenants) {
    const overrides = new Set(overrideRecordModules(root, t));
    for (const resolved of resolveTenant(root, t)) {
      if (overrides.has(resolved.module)) {
        skipped.push({ tenant: t, module: resolved.module });
        continue;
      }
      const { blueprintFile, provenanceFile } = writeResolved(root, resolved);
      written.push(blueprintFile, provenanceFile);
    }
  }
  for (const s of skipped) {
    console.warn(
      `resolve: SKIPPED ${s.tenant}/${s.module} — active override debt ` +
      `(tenants/${s.tenant}/deltas/${s.module}.override.json pins the hand-edited resolved; ` +
      `capture ladder ②). Left byte-untouched; canonicalize the override to resume normal resolution.`,
    );
  }
  return written.sort();
}
