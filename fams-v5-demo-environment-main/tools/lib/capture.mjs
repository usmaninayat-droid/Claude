// @ts-check
/**
 * capture — the approval-time canonicalizer (decision #17).
 *
 * Input: a `resolved/<t>/<m>.blueprint.json` that has been edited in the working
 * tree (the designer "vibecoded" a change — decision #15). Capture computes the
 * difference between that TARGET and the BASE that `resolve(core + current
 * deltas)` would produce, and emits the MINIMAL set of typed ops that turns base
 * into target.
 *
 * Hard rule (brief + decision #17): NEVER guess silently. Capture only commits
 * ops when applying them to the base reproduces the target BYTE-FOR-BYTE. Any
 * residual difference (a change no supported op can express) makes the whole
 * module inexpressible → a `*.ops.proposed.json` file is written with the ops we
 * *could* derive plus a human-readable explanation, and capture exits non-zero.
 * Failure is loud and harmless: nothing is appended to the real deltas.
 */
import { validateBlueprint } from '@fams/v5-composer';
import { deepClone, deepEqual, stableStringify } from './blueprint.mjs';
import { applyOp, FIELD_PROP_ALLOWLIST, PLACEMENT_REGIONS, placementRegion } from './ops.mjs';
import { resolveModule } from './resolve.mjs';
import {
  paths, readJson, writeFileEnsuring, readDeltas, licensedModules,
  hashResolvedBlueprint,
} from './repo.mjs';
import { existsSync } from 'node:fs';

const byId = (arr, id) => (arr ?? []).find((n) => n && n.id === id);
const tabsOf = (bp) => bp?.uiConfig?.profile?.rightPanel?.tabs ?? [];

/**
 * Diff base → target for one module. Returns emitted ops and inexpressible
 * notes. Op ids are deterministic (`cap_<module>_<n>`).
 */
function diffModule(module, base, target) {
  /** @type {import('./ops.mjs').Op[]} */
  const ops = [];
  /** @type {string[]} */
  const notes = [];
  let n = 0;
  const nextId = () => `cap_${module.replace(/[^a-z0-9]+/gi, '_')}_${++n}`;

  const baseCols = base.systemcolumns ?? [];
  const targetCols = target.systemcolumns ?? [];

  // Track the addField op emitted for each new field id, so the placement pass
  // below can FOLD a field's new surface placements into its addField op (one
  // canonical op, not a follow-up placeField).
  /** @type {Map<string, import('./ops.mjs').Op>} */
  const addedFields = new Map();

  // --- systemcolumns: additions, label + allowlisted-prop changes ----------
  for (let i = 0; i < targetCols.length; i++) {
    const tc = targetCols[i];
    const bc = byId(baseCols, tc.id);
    if (!bc) {
      // New field. Position it after the immediately preceding target field —
      // which is present when this op applies (it is in base, or was itself
      // added by an earlier addField op; ops apply in target order). A field at
      // the very head has no `after` and would append, so flag it as a note.
      const after = i > 0 ? targetCols[i - 1].id : null;
      if (i === 0) {
        notes.push(`field "${tc.id}" was inserted before all pre-existing fields; addField appends or places after an existing field, not at the head.`);
      }
      const op = { opId: nextId(), op: 'addField', field: deepClone(tc), ...(after ? { after } : {}) };
      ops.push(op);
      addedFields.set(tc.id, op);
      continue;
    }
    if (tc.name !== bc.name) {
      ops.push({ opId: nextId(), op: 'setLabel', id: tc.id, label: tc.name });
    }
    for (const prop of FIELD_PROP_ALLOWLIST) {
      if (stableStringify(tc[prop] ?? null) !== stableStringify(bc[prop] ?? null)) {
        ops.push({ opId: nextId(), op: 'setFieldProp', id: tc.id, prop, value: tc[prop] ?? null });
      }
    }
  }
  for (const bc of baseCols) {
    if (!byId(targetCols, bc.id)) {
      notes.push(`field "${bc.id}" was removed from systemcolumns; there is no removeField op (fields are hidden, not deleted).`);
    }
  }

  // --- placements: list / details / kanbanCard.{header,body,footer} ---------
  // A new placement of a NEW field folds into that field's addField op; a new
  // placement of an EXISTING field becomes a placeField op. list removals map
  // to hideField (fields are hidden, not deleted); a removal from any other
  // surface has no op → note.
  diffPlacements(base, target, ops, notes, addedFields, nextId);

  // --- statusList: add / remove --------------------------------------------
  const baseStages = base.uiConfig?.statusList ?? [];
  const targetStages = target.uiConfig?.statusList ?? [];
  for (let i = 0; i < targetStages.length; i++) {
    const ts = targetStages[i];
    if (byId(baseStages, ts.id)) continue;
    let after = null;
    for (let j = i - 1; j >= 0; j--) {
      if (byId(baseStages, targetStages[j].id)) { after = targetStages[j].id; break; }
    }
    ops.push({ opId: nextId(), op: 'addStage', stage: deepClone(ts), ...(after ? { after } : {}) });
  }
  for (const bs of baseStages) {
    if (!byId(targetStages, bs.id)) ops.push({ opId: nextId(), op: 'removeStage', id: bs.id });
  }

  // --- tabs: add / hide / reorder ------------------------------------------
  const baseTabs = tabsOf(base);
  const targetTabs = tabsOf(target);
  for (const tt of targetTabs) {
    if (!byId(baseTabs, tt.id)) {
      const idx = targetTabs.indexOf(tt);
      const after = idx > 0 ? targetTabs[idx - 1].id : null;
      ops.push({ opId: nextId(), op: 'addTab', tab: deepClone(tt), ...(after ? { after } : {}) });
    }
  }
  for (const bt of baseTabs) {
    if (!byId(targetTabs, bt.id)) ops.push({ opId: nextId(), op: 'hideTab', id: bt.id });
  }
  // Pure reorder of a shared tab set.
  const sharedBase = baseTabs.filter((t) => byId(targetTabs, t.id)).map((t) => t.id);
  const sharedTarget = targetTabs.filter((t) => byId(baseTabs, t.id)).map((t) => t.id);
  if (sharedBase.length === sharedTarget.length && sharedBase.join('|') !== sharedTarget.join('|')
      && baseTabs.length === targetTabs.length) {
    ops.push({ opId: nextId(), op: 'reorderTabs', ids: targetTabs.map((t) => t.id) });
  }

  return { ops, notes };
}

/** Fold a new placement of a newly-added field into its addField op. */
function foldPlacement(addOp, region, after) {
  addOp.placements ??= {};
  const spec = after ? { after } : {};
  if (region === 'details') addOp.placements.details = spec;
  else if (region === 'list') addOp.placements.list = spec;
  else if (region.startsWith('kanbanCard.')) {
    addOp.placements.kanbanCard = { region: region.slice('kanbanCard.'.length), ...spec };
  }
}

/**
 * Diff placement regions base → target. New placements of a NEW field fold into
 * that field's addField op (`addedFields`); new placements of an EXISTING field
 * become `placeField` ops; list removals become `hideField`; removals from any
 * other surface have no op and are noted. `after` uses the immediately
 * preceding target sibling — present when the op applies (base node, or added
 * by an earlier op in this same batch).
 */
function diffPlacements(base, target, ops, notes, addedFields, nextId) {
  for (const region of PLACEMENT_REGIONS) {
    const baseArr = placementRegion(base, region, { create: false }) ?? [];
    const targetArr = placementRegion(target, region, { create: false }) ?? [];

    // Additions (in target order, so a folded `after` references an earlier op).
    for (let i = 0; i < targetArr.length; i++) {
      const node = targetArr[i];
      if (byId(baseArr, node.id)) continue;
      const after = i > 0 ? targetArr[i - 1].id : null;
      const addOp = addedFields.get(node.id);
      if (addOp) {
        foldPlacement(addOp, region, after);
      } else {
        ops.push({ opId: nextId(), op: 'placeField', id: node.id, region, ...(after ? { after } : {}) });
      }
    }

    // Removals.
    for (const bn of baseArr) {
      if (byId(targetArr, bn.id)) continue;
      if (region === 'list') ops.push({ opId: nextId(), op: 'hideField', id: bn.id });
      else notes.push(`placement "${bn.id}" was removed from ${region}; there is no removePlacement op.`);
    }
  }
}

/**
 * Capture one module: returns a status object. Does not write the proposed file
 * or the deltas — the caller decides (so tests can inspect the plan).
 * @returns {{ module: string, status: 'clean'|'expressible'|'ambiguous',
 *   ops: import('./ops.mjs').Op[], notes: string[] }}
 */
export function planCaptureModule(root, tenant, module) {
  const base = resolveModule(root, tenant, module).blueprint;
  const targetFile = paths.resolvedBlueprint(root, tenant, module);
  if (!existsSync(targetFile)) {
    return { module, status: 'clean', ops: [], notes: [] };
  }
  const target = readJson(targetFile);

  if (deepEqual(base, target)) return { module, status: 'clean', ops: [], notes: [] };

  const { ops, notes } = diffModule(module, base, target);

  // Verify: emitted ops MUST reproduce target exactly, else it is ambiguous.
  const candidate = deepClone(base);
  let applyError = null;
  try {
    for (const op of ops) applyOp(candidate, op);
  } catch (err) {
    applyError = String(err && err.message ? err.message : err);
  }
  const reproduced = !applyError && deepEqual(candidate, target);
  const validates = reproduced && validateBlueprint(candidate).valid !== false;

  if (notes.length || !reproduced || !validates) {
    if (applyError) notes.push(`emitted ops failed to apply cleanly: ${applyError}`);
    else if (!reproduced) notes.push('emitted ops do not reproduce the edited resolved file exactly — the change is not expressible with the supported op set.');
    else if (!validates) notes.push('the reproduced blueprint does not pass validateBlueprint.');
    return { module, status: 'ambiguous', ops, notes };
  }
  return { module, status: 'expressible', ops, notes };
}

/**
 * Run capture across a tenant's licensed modules. Returns per-module plans; the
 * CLI applies expressible plans (append + re-resolve) and writes proposals for
 * ambiguous ones.
 */
export function planCapture(root, tenant) {
  const manifest = readJson(paths.tenantManifest(root, tenant));
  return licensedModules(manifest).map((m) => planCaptureModule(root, tenant, m));
}

/** Append expressible ops to a tenant's deltas file (creating it if needed). */
export function appendOps(root, tenant, module, ops) {
  const existing = readDeltas(root, tenant, module);
  const doc = { $schema: '../../../tools/schemas/OpsFile.schema.json', module, ops: [...existing.ops, ...ops] };
  writeFileEnsuring(paths.deltas(root, tenant, module), stableStringify(doc));
}

/** Write a proposed-ops file with a human-readable explanation. */
export function writeProposed(root, tenant, module, plan) {
  const doc = {
    module,
    status: 'needs-human-review',
    explanation: [
      `Capture could not express the edit to resolved/${tenant}/${module}.blueprint.json as minimal typed ops.`,
      'The ops below are the part capture COULD derive; the notes list what it could not.',
      'Do NOT merge as-is. Either adjust the edit to fit the supported ops, or land it as a flagged override (tenant-model.md, capture failure ladder ②).',
    ].join(' '),
    notes: plan.notes,
    proposedOps: plan.ops,
  };
  const file = paths.deltasProposed(root, tenant, module);
  writeFileEnsuring(file, stableStringify(doc));
  return file;
}

/**
 * Write a COMMITTED capture-ladder-② override debt record for a module that was
 * merged as flagged debt (decision #17). Deterministic (no timestamps): it
 * carries the module, a human reason, the notes + proposed ops moved out of the
 * transient `.proposed` file, and a content hash pinning the hand-edited
 * resolved blueprint (which is committed as-is). `demo check` skips the
 * byte-compare for this module while the hash still matches, staying green with
 * a loud warning; a hash mismatch fails the build.
 * @returns {{ file: string, hash: string }}
 */
export function writeOverrideRecord(root, tenant, module, plan) {
  const hash = hashResolvedBlueprint(root, tenant, module);
  const doc = {
    module,
    reason: [
      `Capture could not express the edit to resolved/${tenant}/${module}.blueprint.json as minimal typed ops,`,
      'so it was merged as flagged debt (capture failure ladder ②, decision #17).',
      'Resolve it by deleting this record and canonicalizing the edit into typed deltas, then re-resolving.',
    ].join(' '),
    notes: plan.notes,
    proposedOps: plan.ops,
    resolvedHash: hash,
  };
  const file = paths.overrideRecord(root, tenant, module);
  writeFileEnsuring(file, stableStringify(doc));
  return { file, hash };
}
