// @ts-check
/**
 * Terminal-vs-Overdue invariant (F2, 2026-09-05 job-orders review round 2 →
 * fixed 2026-09-06 fix8). The DS regression test at
 * `fams-design-system/packages/v5-templates/src/views/ListView.test.tsx`
 * only pins `FlagToneDateView`'s renderer contract (cue tracks `flagCol`,
 * never `status`) — it cannot enforce the actual product invariant, which is
 * a property of THIS repo's seed data: a record that has reached a terminal
 * pipeline status must never also be flagged Overdue. That pairing broke
 * twice this cycle (fix1, then fix5) and nothing enforced it; this is the
 * enforcement.
 *
 * Generic across any pipeline blueprint, no job-order vocabulary:
 *   - "terminal status" = a value in the `status` column's `listValues` that
 *     never appears as a KEY in `uiConfig.statusChangeRule` (i.e. it has no
 *     declared outgoing transition — nothing can move a record out of it).
 *   - "flagged Overdue" = whatever `{flagCol, flagValue}` pair a
 *     `FlagToneDateView` component placement reads anywhere in the resolved
 *     blueprint (listcolumns, kanban card placements, profile details, …) —
 *     found generically by walking the blueprint for that component name,
 *     never hardcoded to `systemcol32`/`"Overdue"`.
 *
 * A module only participates if it is `kind: "pipeline"` AND declares BOTH a
 * `statusChangeRule` AND at least one `FlagToneDateView` flag spec; anything
 * else is silently skipped (this cannot regress a module that has no such
 * pairing to begin with).
 */
import { paths, readJson, listTenants, licensedModules, readModuleSeed } from './repo.mjs';
import { resolveModule } from './resolve.mjs';

/**
 * Recursively collect every distinct {flagCol, flagValue} pair used by a
 * `FlagToneDateView` component anywhere under `node`.
 * @returns {Array<{flagCol: string, flagValue: unknown}>}
 */
function collectFlagToneSpecs(node, seen = new Set(), out = []) {
  if (node && typeof node === 'object') {
    if (!Array.isArray(node) && node.name === 'FlagToneDateView' && node.props && typeof node.props.flagCol === 'string') {
      const flagValue = 'flagValue' in node.props ? node.props.flagValue : true;
      // `\u0000` written as an ESCAPE, not a literal NUL byte: a raw NUL in
      // the source makes git classify this file as binary, so it shows up as
      // "Bin 0 -> 4847 bytes" in every diff and cannot be reviewed or merged
      // as text. Same separator, same dedupe behaviour, readable diff.
      const key = `${node.props.flagCol}\u0000${JSON.stringify(flagValue)}`;
      if (!seen.has(key)) {
        seen.add(key);
        out.push({ flagCol: node.props.flagCol, flagValue });
      }
    }
    for (const v of Array.isArray(node) ? node : Object.values(node)) collectFlagToneSpecs(v, seen, out);
  }
  return out;
}

/**
 * The set of `status` values that have no outgoing `statusChangeRule` entry
 * (nothing can transition a record out of them) — i.e. terminal. Returns
 * `null` when the blueprint does not declare enough shape to compute this
 * (no status column, no listValues, no statusChangeRule).
 * @returns {Set<string> | null}
 */
function terminalStatuses(bp) {
  const statusCol = (bp.systemcolumns ?? []).find((c) => c && c.col === 'status');
  const values = statusCol?.listValues;
  const rule = bp.uiConfig?.statusChangeRule;
  if (!Array.isArray(values) || !rule || typeof rule !== 'object') return null;
  return new Set(values.filter((v) => !(v in rule)));
}

/**
 * Assert no seed row is simultaneously terminal AND flagged Overdue.
 * @returns {{ errors: string[], warnings: string[] }}
 */
export function checkOverdueTerminalInvariant(root) {
  /** @type {string[]} */ const errors = [];
  /** @type {string[]} */ const warnings = [];

  for (const tenant of listTenants(root)) {
    let manifest;
    try { manifest = readJson(paths.tenantManifest(root, tenant)); }
    catch { continue; } // reported by runCheck.

    for (const m of licensedModules(manifest)) {
      let bp;
      try { bp = resolveModule(root, tenant, m).blueprint; }
      catch { continue; } // resolve failures reported by runCheck.

      if (bp.kind !== 'pipeline') continue;

      const terminal = terminalStatuses(bp);
      if (!terminal || terminal.size === 0) continue;

      const specs = collectFlagToneSpecs(bp);
      if (specs.length === 0) continue;

      const rows = readModuleSeed(root, tenant, m);
      for (const rec of rows) {
        if (!rec || !terminal.has(rec.status)) continue;
        for (const { flagCol, flagValue } of specs) {
          const raw = rec[flagCol];
          const flagged = flagValue === true ? (raw === true || raw === 'true') : raw === flagValue;
          if (flagged) {
            errors.push(
              `overdue-terminal: ${tenant}/${m} seed ${bp.code}#${rec.id ?? rec.uniqueidentifier ?? '?'} is in terminal status "${rec.status}" but "${flagCol}" is ${JSON.stringify(raw)} (flagged value is ${JSON.stringify(flagValue)}) — a record in a terminal pipeline status must never also read Overdue.`,
            );
          }
        }
      }
    }
  }

  return { errors, warnings };
}
