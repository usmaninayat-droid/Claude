// @ts-check
/**
 * check — the CI gate (decision #17: "CI check every push"). It fails loudly
 * (non-zero) when any of these do not hold:
 *   1. Every tenant.json is well-formed and licenses only resolvable modules.
 *   2. Every ops file validates against `tools/schemas/OpsFile.schema.json`
 *      (real JSON-Schema validation via ajv — lib/ops-schema.mjs) AND every op
 *      references live stable ids (enforced by the resolver, which runs
 *      validateOp on each op).
 *   3. re-resolve(core + deltas) === the committed resolved/ files, byte for
 *      byte (decision #14). No orphaned resolved files. EXCEPTION: a module with
 *      a committed `<m>.override.json` debt record (capture ladder ②) has its
 *      byte-compare SKIPPED and instead emits a LOUD warning while staying green
 *      — as long as the record's hash still pins the committed resolved
 *      blueprint. A hash mismatch (resolved edited again without re-flagging)
 *      FAILS. Deleting the record + canonicalizing resumes the normal path.
 *   4. Every JSON file in the repo parses.
 *   5. Seed-integrity (decision #17): every SingleReference/MultiReference seed
 *      value resolves to a real seeded record (see lib/seeds.mjs).
 *   5b. Terminal-vs-Overdue invariant (2026-09-05 job-orders review F2, fixed
 *      fix8): no pipeline seed row is both in a terminal status and flagged
 *      Overdue (see lib/overdue-terminal.mjs) — a property of seed data that a
 *      DS renderer test cannot see or enforce.
 *   6. The debt dashboard (where committed) is not stale.
 */
import { readFileSync, readdirSync, existsSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';
import { validateBlueprint } from '@fams/v5-composer';
import { OP_TYPES } from './ops.mjs';
import { validateOpsFileSchema } from './ops-schema.mjs';
import { validateBlueprintSchema } from './blueprint-schema.mjs';
import { stableStringify } from './blueprint.mjs';
import { resolveTenant } from './resolve.mjs';
import { checkSeedIntegrity } from './seeds.mjs';
import { checkOverdueTerminalInvariant } from './overdue-terminal.mjs';
import { buildDebtDashboard } from './debt.mjs';
import {
  paths, readJson, listTenants, licensedModules, locateModule, readDeltas,
  overrideRecordModules, readOverrideRecord, hashResolvedBlueprint,
} from './repo.mjs';

/** First line index where two strings differ (for a precise mismatch note). */
function firstDiffLine(a, b) {
  const la = a.split('\n');
  const lb = b.split('\n');
  const n = Math.max(la.length, lb.length);
  for (let i = 0; i < n; i++) {
    if (la[i] !== lb[i]) {
      return `line ${i + 1}:\n    committed: ${JSON.stringify(la[i])}\n    resolved:  ${JSON.stringify(lb[i])}`;
    }
  }
  return 'files differ in length only';
}

/** Recursively list every *.json file under root (skips node_modules/.git). */
function allJsonFiles(root, dir = root, acc = []) {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    if (entry.name === 'node_modules' || entry.name === '.git') continue;
    const full = join(dir, entry.name);
    if (entry.isDirectory()) allJsonFiles(root, full, acc);
    else if (entry.name.endsWith('.json')) acc.push(full);
  }
  return acc;
}

/**
 * Run all checks against a repo root.
 * @returns {{ ok: boolean, errors: string[], warnings: string[], checked: number }}
 */
export function runCheck(root) {
  /** @type {string[]} */
  const errors = [];
  /** @type {string[]} */
  const warnings = [];
  let checked = 0;

  // 4 (first, so a syntax error surfaces before anything else touches it).
  for (const file of allJsonFiles(root)) {
    try { JSON.parse(readFileSync(file, 'utf8')); }
    catch (err) { errors.push(`invalid JSON: ${relative(root, file)} — ${err.message}`); }
  }

  const expectedResolved = new Set();

  for (const tenant of listTenants(root)) {
    // 1. tenant.json.
    const manifestFile = paths.tenantManifest(root, tenant);
    if (!existsSync(manifestFile)) { errors.push(`tenant "${tenant}" has no tenant.json`); continue; }
    let manifest;
    try { manifest = readJson(manifestFile); }
    catch { continue; } // JSON error already reported.

    for (const key of ['id', 'name']) {
      if (typeof manifest[key] !== 'string') errors.push(`tenants/${tenant}/tenant.json: missing string "${key}"`);
    }
    if (manifest.id && manifest.id !== tenant) errors.push(`tenants/${tenant}/tenant.json: id "${manifest.id}" does not match folder "${tenant}"`);

    const modules = licensedModules(manifest);
    // opIds must be unique REPO-WIDE per tenant, not just within one deltas
    // file: promote resolves an op by scanning every module, so a cross-module
    // duplicate is genuinely ambiguous. Track opId → module across all modules.
    /** @type {Map<string, string>} */
    const seenOpIds = new Map();
    for (const m of modules) {
      if (!locateModule(root, tenant, m)) errors.push(`tenants/${tenant}/tenant.json: licensed module "${m}" has no blueprint`);

      // 2. ops file shape: real JSON-Schema validation against
      // tools/schemas/OpsFile.schema.json (previously documentation-only —
      // nothing loaded it), plus repo-wide checks the static schema cannot
      // express (opId uniqueness across a tenant's modules). Stable-id
      // existence semantics are enforced by the resolver below.
      const deltasFile = paths.deltas(root, tenant, m);
      if (existsSync(deltasFile)) {
        let doc;
        try { doc = readJson(deltasFile); } catch { doc = null; }
        if (doc) {
          for (const e of validateOpsFileSchema(doc)) {
            errors.push(`${relative(root, deltasFile)}: ${e}`);
          }
          if (!Array.isArray(doc.ops)) errors.push(`${relative(root, deltasFile)}: "ops" must be an array`);
          else {
            doc.ops.forEach((op, i) => {
              if (!op || typeof op !== 'object') { errors.push(`${relative(root, deltasFile)}[${i}]: not an object`); return; }
              if (typeof op.opId !== 'string' || !op.opId) errors.push(`${relative(root, deltasFile)}[${i}]: missing string "opId"`);
              else if (seenOpIds.has(op.opId)) {
                const other = seenOpIds.get(op.opId);
                errors.push(other === m
                  ? `${relative(root, deltasFile)}[${i}]: duplicate opId "${op.opId}"`
                  : `${relative(root, deltasFile)}[${i}]: duplicate opId "${op.opId}" — already used by tenant "${tenant}" in module "${other}". opIds must be unique per tenant (promote resolves ops across modules).`);
              }
              else seenOpIds.set(op.opId, m);
              if (!OP_TYPES.includes(op.op)) errors.push(`${relative(root, deltasFile)}[${i}]: unknown op type "${op.op}"`);
            });
          }
        }
      }
    }

    // 3. re-resolve and byte-compare.
    let resolvedList;
    try { resolvedList = resolveTenant(root, tenant); }
    catch (err) { errors.push(`resolve failed for tenant "${tenant}": ${err.message}`); continue; }

    // Modules merged as flagged debt (capture ladder ②): byte-compare is skipped
    // for these; instead the record's hash must still pin the committed resolved.
    const overrideRecs = new Map();
    for (const m of overrideRecordModules(root, tenant)) overrideRecs.set(m, readOverrideRecord(root, tenant, m));

    for (const r of resolvedList) {
      const bpFile = paths.resolvedBlueprint(root, tenant, r.module);
      const provFile = paths.resolvedProvenance(root, tenant, r.module);
      // Register both files as expected regardless, so an override module's
      // hand-edited resolved is never flagged as an orphan below.
      expectedResolved.add(bpFile);
      expectedResolved.add(provFile);

      const rec = overrideRecs.get(r.module);
      if (rec) {
        const recFile = paths.overrideRecord(root, tenant, r.module);
        if (!existsSync(bpFile)) {
          errors.push(`override module ${tenant}/${r.module}: missing committed resolved blueprint ${relative(root, bpFile)} that ${relative(root, recFile)} pins.`);
          continue;
        }
        // (a) INTEGRITY: the record's hash must still pin the committed resolved.
        // A mismatch means the pinned content changed after the record was
        // written — resolved/ was hand-edited again without re-flagging (resolve
        // and promote deliberately SKIP regenerating override modules, so a tool
        // run is not a cause here).
        const actual = hashResolvedBlueprint(root, tenant, r.module);
        if (rec.resolvedHash !== actual) {
          errors.push(`override record hash mismatch: ${relative(root, recFile)} pins ${rec.resolvedHash} but resolved/${tenant}/${r.module}.blueprint.json now hashes to ${actual} — the pinned resolved was hand-edited again without re-flagging. Re-run capture (--override) to re-pin, or canonicalize the edit into typed deltas and delete the record.`);
          continue;
        }
        // (b) AUTHENTICITY is NOT implied by a matching hash: the hash only proves
        // the pinned content has not been silently re-edited, not that it is a
        // legitimate blueprint. Validate the pinned content so forged/garbage
        // resolved can't ride in behind a self-consistent hash (integrity ≠
        // authenticity — legitimacy comes from human PR review + the dashboard).
        let pinned = null;
        try { pinned = JSON.parse(readFileSync(bpFile, 'utf8')); }
        catch { pinned = null; } // JSON parse error already reported by check 4.
        if (pinned && typeof pinned === 'object') {
          const bp = { ...pinned };
          delete bp.$schema;
          const result = validateBlueprint(bp);
          if (result.valid === false) {
            const detail = result.errors.map((e) => `${e.path}: ${e.message}`).join('\n    - ');
            errors.push(`override module ${tenant}/${r.module}: the pinned resolved blueprint ${relative(root, bpFile)} FAILS validateBlueprint (a matching hash proves integrity, NOT that the content is a valid blueprint):\n    - ${detail}`);
            continue;
          }
          // 7 (fix-d6 finding 1): validateBlueprint above is the hand-rolled
          // structural validator (stable ids, reference integrity) — it does
          // not enforce `additionalProperties: false`, so it cannot catch a
          // config key that is real in types.ts but missing from the JSON
          // Schema. Validate against the schema this blueprint's `$schema`
          // would declare too, so a hand-edited override can't ship invalid
          // against its own contract either.
          for (const e of validateBlueprintSchema(bp)) {
            errors.push(`override module ${tenant}/${r.module}: the pinned resolved blueprint ${relative(root, bpFile)} FAILS its JSON Schema: ${e}`);
          }
        }
        warnings.push(`module ${tenant}/${r.module} merged as override — needs canonicalization (capture ladder ②; tracked in ${relative(root, recFile)}). Byte-compare skipped while the debt stands.`);
        continue;
      }

      for (const [file, obj] of [[bpFile, r.blueprint], [provFile, r.provenance]]) {
        checked++;
        const fresh = stableStringify(obj);
        if (!existsSync(file)) {
          errors.push(`missing committed resolved file: ${relative(root, file)} (run: pnpm demo resolve ${tenant})`);
          continue;
        }
        const committed = readFileSync(file, 'utf8');
        if (committed !== fresh) {
          errors.push(`STALE resolved file: ${relative(root, file)} — re-resolve does not match committed content.\n  ${firstDiffLine(committed, fresh)}\n  fix: pnpm demo resolve ${tenant}`);
        }
      }

      // 7 (fix-d6 finding 1): every resolved blueprint must validate against
      // the JSON Schema its `kind` selects (EntityModuleConfig/
      // PipelineModuleConfig/…) — a config key real in types.ts/
      // blueprint-schema.ts but missing from the JSON Schema previously
      // shipped green here and red in any editor honouring the blueprint's
      // own `$schema` line. Ajv-based (MIT, already a repo dependency; see
      // tools/lib/blueprint-schema.mjs).
      for (const e of validateBlueprintSchema(r.blueprint)) {
        errors.push(`${relative(root, bpFile)} FAILS its JSON Schema (kind: ${r.blueprint.kind ?? 'entity'}): ${e}`);
      }
    }
  }

  // Orphaned resolved files (committed but no longer produced).
  const resolvedRoot = join(root, 'resolved');
  if (existsSync(resolvedRoot)) {
    for (const file of allJsonFiles(root, resolvedRoot)) {
      if (!expectedResolved.has(file)) errors.push(`orphaned resolved file (nothing resolves to it): ${relative(root, file)}`);
    }
  }

  // 5. Seed-integrity (decision #17): every reference resolves; inert targets
  //    warn. Ported from the app's boot-time validateSeedRefs — runs without the app.
  const seed = checkSeedIntegrity(root);
  errors.push(...seed.errors);
  warnings.push(...seed.warnings);

  // 5b. Terminal-vs-Overdue invariant (2026-09-05 job-orders review F2, fixed
  // fix8): no pipeline seed row may be BOTH in a terminal status and flagged
  // Overdue — this broke twice this cycle and only lived as a DS renderer
  // test, which cannot see seed data. See tools/lib/overdue-terminal.mjs.
  const overdueTerminal = checkOverdueTerminalInvariant(root);
  errors.push(...overdueTerminal.errors);
  warnings.push(...overdueTerminal.warnings);

  // 6. Debt dashboard must not be stale (byte-compare, same pattern as resolved/).
  //    Only enforced where a docs/ tree exists (the pilot repo commits it; the
  //    synthetic fixtures do not use it).
  if (existsSync(join(root, 'docs'))) {
    const file = paths.debtDashboard(root);
    const fresh = buildDebtDashboard(root);
    if (!existsSync(file)) {
      errors.push(`missing debt dashboard: ${relative(root, file)} (run: pnpm demo debt)`);
    } else if (readFileSync(file, 'utf8') !== fresh) {
      errors.push(`STALE debt dashboard: ${relative(root, file)} — regenerate with: pnpm demo debt`);
    }
  }

  return { ok: errors.length === 0, errors, warnings, checked };
}
