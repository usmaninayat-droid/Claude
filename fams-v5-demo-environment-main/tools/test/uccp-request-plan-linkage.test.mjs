// @ts-check
// 2026-08-31 Requests & Complaints ⇄ Plan Monitoring integration — verifies
// the bidirectional SingleReference linkage is coherent at the DATA layer
// (blueprint + seed), independent of which screen currently occupies the
// live `/plan-monitoring` nav route.
//
// WHY this test exists instead of only a live Playwright walkthrough: for
// the `uccp` tenant, `app/src/demo/seams.tsx`'s `makeImplementations` swaps
// the `plan-monitoring` module's COMPOSER body for a bespoke iframe-isolated
// "planning-v2" port (own mock dataset, unrelated to
// `tenants/uccp/seeds/plan-monitoring.seed.json`) — a concurrent, same-day
// port owned by another session (COORDINATION.md claim; see that file's own
// header). That means the `plan-monitoring/daily-plan` blueprint this task
// integrates against (FPL records, "dev-built earlier" per the task brief)
// is NOT reachable through today's live `/plan-monitoring` route — not a
// regression this task introduced, a pre-existing routing fact discovered
// while verifying. Logged as a deviation in Build Delegate/LOG.md. This test
// is the gate that actually exercises the integration until the two efforts
// reconcile.
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, '../..');
const readJson = (p) => JSON.parse(readFileSync(path.join(root, p), 'utf8'));

const incidents = readJson('tenants/uccp/seeds/incidents.seed.json');
const plans = readJson('tenants/uccp/seeds/plan-monitoring.seed.json');
const incidentsBlueprint = readJson('tenants/uccp/modules/incidents/blueprint.json');
const planBlueprint = readJson('tenants/uccp/modules/plan-monitoring/blueprint.json');

const TANKER_ASSIGNED_PLUS = new Set(['tanker-assigned', 'job-ongoing', 'job-completed', 'closed', 'reopened']);

function field(blueprint, id) {
  return blueprint.systemcolumns.find((c) => c.id === id);
}

describe('Requests & Complaints ⇄ Plan Monitoring cross-module linkage', () => {
  it('blueprint: plan-monitoring carries a Source Request SingleReference into incidents/incident', () => {
    const f = field(planBlueprint, 'fld_pm_sourcerequest');
    expect(f).toBeTruthy();
    expect(f.type).toBe('SingleReference');
    expect(f.refModule).toBe('Entity');
    expect(f.entityType).toBe('incidents/incident');
    expect(f.component?.name).toBe('LinkView');
  });

  it('blueprint: incidents carries the reciprocal Plan Monitoring Task SingleReference', () => {
    const f = field(incidentsBlueprint, 'fld_inc_linked_daily_plan');
    expect(f).toBeTruthy();
    expect(f.type).toBe('SingleReference');
    expect(f.refModule).toBe('Entity');
    expect(f.entityType).toBe('plan-monitoring/daily-plan');
    expect(f.component?.name).toBe('LinkView');
  });

  it('blueprint: plan-monitoring Source Plan is no longer required (ad-hoc tanker-response tasks have none)', () => {
    const f = field(planBlueprint, 'fld_pm_sourceplan');
    expect(f.required).toBeFalsy();
  });

  const tankerAssignedPlus = incidents.filter((r) => TANKER_ASSIGNED_PLUS.has(r.status));

  it('seed: every TANKER ASSIGNED+ request has a linked_daily_plan pointing at a REAL plan-monitoring record', () => {
    expect(tankerAssignedPlus.length).toBeGreaterThan(0);
    const planIds = new Set(plans.map((p) => p.id));
    for (const inc of tankerAssignedPlus) {
      expect(inc.linked_daily_plan, `${inc.id} missing linked_daily_plan`).toBeTruthy();
      expect(planIds.has(inc.linked_daily_plan), `${inc.id}.linked_daily_plan "${inc.linked_daily_plan}" has no matching FPL record`).toBe(true);
    }
  });

  it('seed: every linked FPL record points back to the SAME request (source_request), both ways consistent', () => {
    const byId = new Map(incidents.map((r) => [r.id, r]));
    for (const inc of tankerAssignedPlus) {
      const plan = plans.find((p) => p.id === inc.linked_daily_plan);
      expect(plan, `no FPL record ${inc.linked_daily_plan} for ${inc.id}`).toBeTruthy();
      expect(plan.source_request).toBe(inc.id);
      expect(byId.get(plan.source_request)).toBe(inc);
    }
  });

  it('seed: linked FPL record\'s tanker/driver/zone/inspector agree with the source request', () => {
    for (const inc of tankerAssignedPlus) {
      const plan = plans.find((p) => p.id === inc.linked_daily_plan);
      expect(plan.systemcol3, `${inc.id} zone mismatch`).toBe(inc.municipality);
      expect(plan.systemcol5, `${inc.id} driver mismatch`).toBe(inc.veh_driver);
      expect(plan.systemcol6, `${inc.id} inspector mismatch`).toBe(inc.systemcol10);
      // Tanker: the FPL's comma-joined plate list must contain the request's
      // primary tanker's plate count — `tanker_count` on the request agrees
      // with how many plates the task lists.
      const plateCount = String(plan.systemcol4 ?? '').split(',').filter(Boolean).length;
      expect(plateCount).toBe(inc.tanker_count ?? 1);
    }
  });

  it('seed: every linked FPL record is dated (plan_date present) — "a daily-plan task record appears... dated TODAY"', () => {
    for (const inc of tankerAssignedPlus) {
      const plan = plans.find((p) => p.id === inc.linked_daily_plan);
      expect(plan.plan_date, `${plan?.id} missing plan_date`).toBeTruthy();
    }
  });

  it('seed: pre-existing 8 smart-planning-sourced FPL records (FPL-3001..3008) are untouched (NOTHING BREAKS gate)', () => {
    const original = plans.filter((p) => /^FPL-3\d{3}$/.test(p.id));
    expect(original).toHaveLength(8);
    for (const p of original) {
      expect(p.systemcol1, `${p.id} lost its Source Plan reference`).toBeTruthy();
    }
  });

  it('seed: no duplicate FPL ids after the 21-record append', () => {
    const ids = plans.map((p) => p.id);
    expect(new Set(ids).size).toBe(ids.length);
  });
});
