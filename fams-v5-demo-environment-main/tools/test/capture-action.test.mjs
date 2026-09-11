// @ts-check
import { describe, it, expect, afterEach, vi } from 'vitest';
import { existsSync, rmSync as fsRm } from 'node:fs';
import { join } from 'node:path';
import { runCaptureAction } from '../lib/capture-action.mjs';
import { main as captureActionMain } from '../capture-action.mjs';
import { runCheck } from '../lib/check.mjs';
import { buildDebtDashboard } from '../lib/debt.mjs';
import { promoteOp } from '../lib/promote.mjs';
import { resolveAndWrite } from '../lib/resolve.mjs';
import { paths, listTenants, hashResolvedBlueprint } from '../lib/repo.mjs';
import { stableStringify } from '../lib/blueprint.mjs';
import { makeRepo, readText, writeText } from './helpers.mjs';

let cleanups = [];
afterEach(() => { cleanups.forEach((c) => c()); cleanups = []; });
function repo() { const r = makeRepo(); cleanups.push(r.cleanup); return r.root; }

/** Hand-edit a tenant's committed resolved blueprint (simulate the vibecoded PR diff). */
function editResolvedFor(root, tenant, mutate) {
  const file = paths.resolvedBlueprint(root, tenant, 'widget');
  const bp = JSON.parse(readText(file));
  mutate(bp);
  writeText(file, stableStringify(bp));
}
/** Convenience for the common t_delta case. */
function editResolved(root, mutate) { editResolvedFor(root, 't_delta', mutate); }

describe('capture-action — SUCCESS path', () => {
  it('canonicalizes an expressible edit → commits ops + reports them; check passes', () => {
    const root = repo();
    editResolved(root, (bp) => { bp.systemcolumns.find((c) => c.id === 'fld_kind').name = 'Vertical'; });
    const res = runCaptureAction(root);
    expect(res.outcome).toBe('success');
    expect(res.exitCode).toBe(0);
    expect(res.committed).toHaveLength(1);
    expect(res.committed[0]).toMatchObject({ tenant: 't_delta', module: 'widget' });
    // Report lists the op.
    expect(res.report).toMatch(/setLabel/);
    expect(res.report).toMatch(/Vertical/);
    // The op is now a real delta and resolved/ is regenerated → check green.
    expect(readText(paths.deltas(root, 't_delta', 'widget'))).toMatch(/"setLabel"/);
    expect(runCheck(root).ok).toBe(true);
  });

  it('is a no-op with a report when the tree already matches (never silent)', () => {
    const root = repo();
    const res = runCaptureAction(root);
    expect(res.outcome).toBe('success');
    expect(res.committed).toEqual([]);
    expect(res.report).toMatch(/No working-tree edits/);
  });
});

describe('capture-action — AMBIGUOUS path (ladder ①)', () => {
  it('inexpressible edit → non-zero, proposal written, deltas untouched, report explains', () => {
    const root = repo();
    const deltasBefore = readText(paths.deltas(root, 't_delta', 'widget'));
    editResolved(root, (bp) => { bp.uiConfig.profile.overview[0].value = 42; });
    const res = runCaptureAction(root);
    expect(res.outcome).toBe('ambiguous');
    expect(res.exitCode).toBe(1);
    expect(existsSync(paths.deltasProposed(root, 't_delta', 'widget'))).toBe(true);
    expect(res.report).toMatch(/agent-proposed ops/i);
    expect(res.report).toMatch(/needs-canonicalization/);
    // NEVER guess silently — real deltas unchanged.
    expect(readText(paths.deltas(root, 't_delta', 'widget'))).toBe(deltasBefore);
  });
});

describe('capture-action — OVERRIDE path (ladder ②)', () => {
  /** t_base gets an EXPRESSIBLE edit; t_delta gets an AMBIGUOUS one. */
  function setupBoth(root) {
    editResolvedFor(root, 't_base', (bp) => { bp.systemcolumns.find((c) => c.id === 'fld_kind').name = 'Category'; });
    editResolvedFor(root, 't_delta', (bp) => { bp.uiConfig.profile.overview[0].value = 7; });
  }

  it('commits expressible modules AND lands ambiguous ones as tracked debt; check green with a loud warning', () => {
    const root = repo();
    setupBoth(root);
    const res = runCaptureAction(root, { override: true });
    expect(res.outcome).toBe('override');
    expect(res.exitCode).toBe(0);

    // (i) expressible module committed — t_base delta appended + resolved regenerated.
    expect(res.committed).toEqual(expect.arrayContaining([
      expect.objectContaining({ tenant: 't_base', module: 'widget' }),
    ]));
    expect(readText(paths.deltas(root, 't_base', 'widget'))).toMatch(/"setLabel"/);

    // (ii) override.json committed + hand-edited resolved kept as-is.
    const recFile = paths.overrideRecord(root, 't_delta', 'widget');
    expect(existsSync(recFile)).toBe(true);
    const rec = JSON.parse(readText(recFile));
    expect(rec.module).toBe('widget');
    expect(rec.resolvedHash).toMatch(/^sha256:[0-9a-f]{64}$/);
    expect(Array.isArray(rec.proposedOps)).toBe(true);
    // resolved blueprint still carries the hand-edit (value 7), NOT re-resolved to core's 50.
    const bp = JSON.parse(readText(paths.resolvedBlueprint(root, 't_delta', 'widget')));
    expect(bp.uiConfig.profile.overview[0].value).toBe(7);
    // The transient proposal file is gone — the debt now lives in the record.
    expect(existsSync(paths.deltasProposed(root, 't_delta', 'widget'))).toBe(false);
    // Report surfaces both halves.
    expect(res.report).toMatch(/FLAGGED DEBT/);
    expect(res.report).toMatch(/needs-canonicalization/);

    // (iii) demo check stays GREEN, WITH the loud override warning.
    const chk = runCheck(root);
    expect(chk.ok).toBe(true);
    expect(chk.warnings.some((w) => /merged as override — needs canonicalization/.test(w))).toBe(true);
  });

  it('(iv) hash mismatch — resolved edited again without re-flagging → check FAILS', () => {
    const root = repo();
    editResolved(root, (bp) => { bp.uiConfig.profile.overview[0].value = 7; });
    runCaptureAction(root, { override: true });
    // Someone edits the merged-as-debt resolved file again but does not re-flag.
    editResolved(root, (bp) => { bp.uiConfig.profile.overview[0].value = 99; });
    const chk = runCheck(root);
    expect(chk.ok).toBe(false);
    expect(chk.errors.join('\n')).toMatch(/override record hash mismatch/);
    expect(chk.errors.join('\n')).toMatch(/hand-edited again without re-flagging/);
  });

  it('(v) the override shows up on the debt dashboard as outstanding debt', () => {
    const root = repo();
    editResolved(root, (bp) => { bp.uiConfig.profile.overview[0].value = 7; });
    runCaptureAction(root, { override: true });
    const md = buildDebtDashboard(root);
    expect(md).toMatch(/widget\.override\.json/);
    expect(md).toMatch(/override \(merged as flagged debt\)/);
  });

  it('resolving the debt (delete the record + canonicalize) resumes the normal green path', () => {
    const root = repo();
    editResolved(root, (bp) => { bp.uiConfig.profile.overview[0].value = 7; });
    runCaptureAction(root, { override: true });
    expect(existsSync(paths.overrideRecord(root, 't_delta', 'widget'))).toBe(true);

    // Clean up the debt: delete the record and canonicalize (here: revert the
    // hand-edit so resolved/ equals resolve(core + deltas) again).
    fsRm(paths.overrideRecord(root, 't_delta', 'widget'));
    editResolved(root, (bp) => { bp.uiConfig.profile.overview[0].value = 50; });

    const chk = runCheck(root);
    expect(chk.ok).toBe(true);
    expect(chk.warnings.some((w) => /merged as override/.test(w))).toBe(false);
  });
});

describe('override-aware resolve/promote (final audit — Important 1)', () => {
  /** Land an AMBIGUOUS edit on a tenant as flagged debt → committed override.json. */
  function landOverride(root, tenant) {
    editResolvedFor(root, tenant, (bp) => { bp.uiConfig.profile.overview[0].value = 7; });
    const res = runCaptureAction(root, { override: true });
    expect(res.outcome).toBe('override');
    expect(existsSync(paths.overrideRecord(root, tenant, 'widget'))).toBe(true);
    return res;
  }

  it('(a) promoting an unrelated op leaves an active override module byte-untouched; check green', () => {
    const root = repo();
    landOverride(root, 't_base'); // t_base/widget is now pinned debt (value 7)
    const pinned = readText(paths.resolvedBlueprint(root, 't_base', 'widget'));
    expect(runCheck(root).ok).toBe(true);

    // op_add_region lives in t_delta/widget (NOT overridden) → promote is allowed.
    // Its re-resolve of ALL tenants must NOT clobber t_base's pinned resolved.
    promoteOp(root, 't_delta', 'op_add_region');

    expect(readText(paths.resolvedBlueprint(root, 't_base', 'widget'))).toBe(pinned);
    const chk = runCheck(root);
    expect(chk.ok).toBe(true);
    expect(chk.errors).toEqual([]);
    expect(chk.warnings.some((w) => /t_base\/widget merged as override/.test(w))).toBe(true);
  });

  it('(b) resolve --all with an active override leaves it byte-untouched; check green', () => {
    const root = repo();
    landOverride(root, 't_base');
    const pinned = readText(paths.resolvedBlueprint(root, 't_base', 'widget'));

    const written = resolveAndWrite(root, null, listTenants); // === demo resolve --all
    // The skipped override module is NOT in the written set.
    expect(written).not.toContain(paths.resolvedBlueprint(root, 't_base', 'widget'));

    expect(readText(paths.resolvedBlueprint(root, 't_base', 'widget'))).toBe(pinned);
    expect(runCheck(root).ok).toBe(true);
  });

  it('(c) promote targeting the overridden module refuses; core untouched', () => {
    const root = repo();
    landOverride(root, 't_delta'); // t_delta/widget is the overridden module
    const coreBefore = readText(paths.coreModule(root, 'widget'));

    // op_add_region lives in the overridden t_delta/widget → must refuse.
    expect(() => promoteOp(root, 't_delta', 'op_add_region')).toThrow(/active override debt/);
    expect(() => promoteOp(root, 't_delta', 'op_add_region')).toThrow(/canonicalize the override first/i);

    expect(readText(paths.coreModule(root, 'widget'))).toBe(coreBefore); // refused before writing
  });
});

describe('override content validation (final audit — Important 2)', () => {
  it('forged override record pinning schema-invalid resolved → check FAILS naming the validation errors', () => {
    const root = repo();
    // Corrupt t_delta/widget resolved to be schema-invalid: drop a stable id.
    const bpFile = paths.resolvedBlueprint(root, 't_delta', 'widget');
    const bp = JSON.parse(readText(bpFile));
    delete bp.systemcolumns[0].id; // violates the stable-ID rule
    writeText(bpFile, stableStringify(bp));

    // Forge a SELF-CONSISTENT override record: pin the hash of the garbage so the
    // integrity (hash) check passes — only the content validation can catch it.
    const hash = hashResolvedBlueprint(root, 't_delta', 'widget');
    writeText(paths.overrideRecord(root, 't_delta', 'widget'), stableStringify({
      module: 'widget', reason: 'forged', notes: [], proposedOps: [], resolvedHash: hash,
    }));

    const chk = runCheck(root);
    expect(chk.ok).toBe(false);
    const joined = chk.errors.join('\n');
    expect(joined).toMatch(/FAILS validateBlueprint/);
    expect(joined).toMatch(/stable id is required/);
    // The hash DOES match, so the misleading hash-mismatch path must NOT fire.
    expect(joined).not.toMatch(/hash mismatch/);
  });
});

describe('capture-action glue — never silent', () => {
  it('(vi) a core crash still writes capture-report.md (with the error) and exits non-zero', () => {
    const root = repo();
    // Corrupt a tenant manifest → planCapture readJson throws inside the core.
    writeText(paths.tenantManifest(root, 't_delta'), '{ not valid json');
    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    const errSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const code = captureActionMain([], root);
    logSpy.mockRestore(); errSpy.mockRestore();

    expect(code).toBe(1);
    const report = readText(join(root, 'capture-report.md'));
    expect(report).toMatch(/CRASHED/);
  });
});
