// @ts-check
import { describe, it, expect, afterEach } from 'vitest';
import { existsSync } from 'node:fs';
import { planCaptureModule } from '../lib/capture.mjs';
import { main as captureCli } from '../capture.mjs';
import { runCheck } from '../lib/check.mjs';
import { paths } from '../lib/repo.mjs';
import { stableStringify } from '../lib/blueprint.mjs';
import { makeRepo, readText, writeText } from './helpers.mjs';

let cleanups = [];
afterEach(() => { cleanups.forEach((c) => c()); cleanups = []; });
function repo() { const r = makeRepo(); cleanups.push(r.cleanup); return r.root; }

/** Edit the committed resolved blueprint in the working tree (simulate vibecode). */
function editResolved(root, mutate) {
  const file = paths.resolvedBlueprint(root, 't_delta', 'widget');
  const bp = JSON.parse(readText(file));
  mutate(bp);
  writeText(file, stableStringify(bp));
}

describe('capture — expressible edits → minimal ops', () => {
  it('hide a field → hideField', () => {
    const root = repo();
    editResolved(root, (bp) => { bp.listcolumns = bp.listcolumns.filter((c) => c.id !== 'fld_owner'); });
    const plan = planCaptureModule(root, 't_delta', 'widget');
    expect(plan.status).toBe('expressible');
    expect(plan.ops).toHaveLength(1);
    expect(plan.ops[0]).toMatchObject({ op: 'hideField', id: 'fld_owner' });
  });

  it('rename a label → setLabel', () => {
    const root = repo();
    editResolved(root, (bp) => { bp.systemcolumns.find((c) => c.id === 'fld_kind').name = 'Vertical'; });
    const plan = planCaptureModule(root, 't_delta', 'widget');
    expect(plan.status).toBe('expressible');
    expect(plan.ops[0]).toMatchObject({ op: 'setLabel', id: 'fld_kind', label: 'Vertical' });
  });

  it('add a field → addField (with after)', () => {
    const root = repo();
    editResolved(root, (bp) => {
      const i = bp.systemcolumns.findIndex((c) => c.id === 'fld_region');
      bp.systemcolumns.splice(i + 1, 0, { id: 'fld_extra', col: 'systemcol5', name: 'Extra', type: 'SmallText' });
    });
    const plan = planCaptureModule(root, 't_delta', 'widget');
    expect(plan.status).toBe('expressible');
    expect(plan.ops[0]).toMatchObject({ op: 'addField', after: 'fld_region', field: { id: 'fld_extra' } });
  });

  it('add a field + its detail placement → ONE addField with placements', () => {
    const root = repo();
    editResolved(root, (bp) => {
      bp.systemcolumns.push({ id: 'fld_sev', col: 'systemcol5', name: 'Severity', type: 'SingleSelect', listValues: ['Low', 'High'] });
      // The canonical placement node shape (matches what applyOp synthesizes).
      bp.uiConfig.profile.details.push({ id: 'fld_sev', col: 'systemcol5', order: 1, pos: 'left' });
    });
    const plan = planCaptureModule(root, 't_delta', 'widget');
    expect(plan.status).toBe('expressible');
    // ONE op — the field and its placement are a single canonical addField.
    expect(plan.ops).toHaveLength(1);
    expect(plan.ops[0]).toMatchObject({
      op: 'addField',
      after: 'fld_cost',
      field: { id: 'fld_sev' },
      placements: { details: { after: 'fld_cost' } },
    });
  });

  it('add a field placed on list + detail → one addField fanning both surfaces', () => {
    const root = repo();
    editResolved(root, (bp) => {
      bp.systemcolumns.push({ id: 'fld_sev', col: 'systemcol5', name: 'Severity', type: 'SmallText' });
      bp.uiConfig.profile.details.push({ id: 'fld_sev', col: 'systemcol5', order: 1, pos: 'left' });
      bp.listcolumns.push({ id: 'fld_sev', col: 'systemcol5', component: { name: 'TextView' } });
    });
    const plan = planCaptureModule(root, 't_delta', 'widget');
    expect(plan.status).toBe('expressible');
    expect(plan.ops).toHaveLength(1);
    expect(plan.ops[0].placements).toMatchObject({ details: { after: 'fld_cost' }, list: { after: 'fld_owner' } });
  });

  it('place an EXISTING field onto a new surface → placeField', () => {
    const root = repo();
    editResolved(root, (bp) => {
      // fld_region exists (added by the delta) but is not in details; place it.
      bp.uiConfig.profile.details.push({ id: 'fld_region', col: 'systemcol4', order: 1, pos: 'left' });
    });
    const plan = planCaptureModule(root, 't_delta', 'widget');
    expect(plan.status).toBe('expressible');
    expect(plan.ops).toHaveLength(1);
    expect(plan.ops[0]).toMatchObject({ op: 'placeField', id: 'fld_region', region: 'details', after: 'fld_cost' });
  });

  it('canonical capture then re-resolve is byte-identical to the hand edit', () => {
    const root = repo();
    editResolved(root, (bp) => {
      bp.systemcolumns.push({ id: 'fld_sev', col: 'systemcol5', name: 'Severity', type: 'SmallText' });
      bp.uiConfig.profile.details.push({ id: 'fld_sev', col: 'systemcol5', order: 1, pos: 'left' });
    });
    const handEdited = readText(paths.resolvedBlueprint(root, 't_delta', 'widget'));
    const code = captureCli(['t_delta'], root);
    expect(code).toBe(0);
    // Deltas carry the placement, resolved regenerated, and it matches byte-for-byte.
    expect(readText(paths.deltas(root, 't_delta', 'widget'))).toMatch(/"placements"/);
    expect(readText(paths.resolvedBlueprint(root, 't_delta', 'widget'))).toBe(handEdited);
    expect(runCheck(root).ok).toBe(true);
  });

  it('CLI appends ops, re-resolves, and check passes afterward', () => {
    const root = repo();
    editResolved(root, (bp) => { bp.systemcolumns.find((c) => c.id === 'fld_kind').name = 'Vertical'; });
    const code = captureCli(['t_delta'], root);
    expect(code).toBe(0);
    // The op is now committed as a delta and the resolved is regenerated.
    expect(readText(paths.deltas(root, 't_delta', 'widget'))).toMatch(/"setLabel"/);
    expect(runCheck(root).ok).toBe(true);
  });
});

describe('capture — inexpressible edits → proposal + non-zero', () => {
  it('editing a non-op-addressable region (profile overview) is ambiguous', () => {
    const root = repo();
    editResolved(root, (bp) => { bp.uiConfig.profile.overview[0].value = 99; });
    const plan = planCaptureModule(root, 't_delta', 'widget');
    expect(plan.status).toBe('ambiguous');
    expect(plan.notes.join('\n')).toMatch(/do not reproduce/);
  });

  it('a placement whose node shape is non-canonical stays ambiguous (proposal path)', () => {
    const root = repo();
    editResolved(root, (bp) => {
      bp.systemcolumns.push({ id: 'fld_sev', col: 'systemcol5', name: 'Severity', type: 'SmallText' });
      // pos:'right' is NOT what applyOp synthesizes → cannot be reproduced.
      bp.uiConfig.profile.details.push({ id: 'fld_sev', col: 'systemcol5', order: 2, pos: 'right' });
    });
    const plan = planCaptureModule(root, 't_delta', 'widget');
    expect(plan.status).toBe('ambiguous');
    expect(plan.notes.join('\n')).toMatch(/do not reproduce/);
  });

  it('changing a field storage slot (col) is ambiguous', () => {
    const root = repo();
    editResolved(root, (bp) => { bp.systemcolumns.find((c) => c.id === 'fld_region').col = 'systemcol8'; });
    const plan = planCaptureModule(root, 't_delta', 'widget');
    expect(plan.status).toBe('ambiguous');
  });

  it('CLI writes a .ops.proposed.json and returns non-zero; deltas untouched', () => {
    const root = repo();
    const deltasBefore = readText(paths.deltas(root, 't_delta', 'widget'));
    editResolved(root, (bp) => { bp.uiConfig.profile.overview[0].value = 42; });
    const code = captureCli(['t_delta'], root);
    expect(code).toBe(1);
    expect(existsSync(paths.deltasProposed(root, 't_delta', 'widget'))).toBe(true);
    // NEVER guess silently: the real deltas are unchanged.
    expect(readText(paths.deltas(root, 't_delta', 'widget'))).toBe(deltasBefore);
  });
});
