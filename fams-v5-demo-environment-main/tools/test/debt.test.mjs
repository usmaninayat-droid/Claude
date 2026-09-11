// @ts-check
import { describe, it, expect, afterEach } from 'vitest';
import { readFileSync } from 'node:fs';
import { paths } from '../lib/repo.mjs';
import { stableStringify } from '../lib/blueprint.mjs';
import { gatherDebt, buildDebtDashboard } from '../lib/debt.mjs';
import { main as debtMain } from '../debt-dashboard.mjs';
import { runCheck } from '../lib/check.mjs';
import { makeRepo, readText, writeText } from './helpers.mjs';

let cleanups = [];
afterEach(() => { cleanups.forEach((c) => c()); cleanups = []; });
function repo() { const r = makeRepo(); cleanups.push(r.cleanup); return r.root; }

describe('debt dashboard — content', () => {
  it('reports per-tenant delta counts', () => {
    const { tenants } = gatherDebt(repo());
    const tDelta = tenants.find((t) => t.tenant === 't_delta');
    const widget = tDelta.modules.find((m) => m.module === 'widget');
    expect(widget.deltaCount).toBe(9); // WIDGET_DELTAS has 9 ops
    const tBase = tenants.find((t) => t.tenant === 't_base');
    expect(tBase.modules.find((m) => m.module === 'widget').deltaCount).toBe(0);
  });

  it('flags a promotion candidate when the same op shape appears in ≥2 tenants', () => {
    const root = repo();
    // t_base gains the SAME shape as t_delta's op_label_kind (setLabel fld_kind).
    writeText(paths.deltas(root, 't_base', 'widget'), stableStringify({
      module: 'widget',
      ops: [{ opId: 'op_base_label_kind', op: 'setLabel', id: 'fld_kind', label: 'Segment' }],
    }));
    const { candidates } = gatherDebt(root);
    const shared = candidates.find((c) => c.shape === 'widget:setLabel:fld_kind');
    expect(shared).toBeTruthy();
    expect(shared.tenants).toEqual(['t_base', 't_delta']);
  });

  it('renders deterministic markdown (stable across two builds)', () => {
    const root = repo();
    expect(buildDebtDashboard(root)).toBe(buildDebtDashboard(root));
    expect(buildDebtDashboard(root)).toMatch(/# Customization Debt Dashboard/);
  });
});

describe('debt dashboard — staleness gate', () => {
  it('demo check fails on a stale dashboard and passes once regenerated', () => {
    const root = repo();
    // Seed a docs/ tree so the staleness gate activates for this fixture.
    writeText(paths.debtDashboard(root), '# stale\n');
    expect(runCheck(root).ok).toBe(false);
    expect(runCheck(root).errors.some((e) => /STALE debt dashboard/.test(e))).toBe(true);

    // `demo debt` writes the canonical file → check goes green.
    expect(debtMain([], root)).toBe(0);
    expect(readFileSync(paths.debtDashboard(root), 'utf8')).toBe(buildDebtDashboard(root));
    expect(runCheck(root).ok).toBe(true);
  });

  it('--check reports staleness without writing', () => {
    const root = repo();
    writeText(paths.debtDashboard(root), '# stale\n');
    expect(debtMain(['--check'], root)).toBe(1);
    // File not rewritten by --check.
    expect(readText(paths.debtDashboard(root))).toBe('# stale\n');
  });
});
