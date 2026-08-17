import { describe, it, expect, beforeEach } from 'vitest';
import { EntityStore } from '../sim/engine/entity-store';
import { MemoryPersistence, LocalStoragePersistence } from '../sim/persistence/local-storage';
import {
  evalCondition,
  isTaskVisible,
  allowedTransitions,
  resolvePermissions,
} from '../sim/engine/rules';
import { seedSales, salesConfigs, salesRules, salesUsers, dealsConfig } from '../sim/seed/sales';
import { createAppRuntime } from '../runtime/composition';
import type { Recipe } from '../runtime/composition';
import type { Condition } from '../sim/engine/types';
import { bindPipelineModuleData } from '../components/app-shell/config-bridge';

/**
 * Sim spine — the sandbox checks that verified src/sim + src/runtime, ported
 * to vitest (START-HERE §4). Covers the rules evaluator, RBAC visibility,
 * rule-gated transitions, store filtering/search/sort, persistence round-trips,
 * and the EntityStore version counter that backs config-bridge's derived-data
 * cache.
 */

const DEALS = 'crm/deals';
const dealsRules = salesRules[DEALS];
const { rep, manager } = salesUsers;

function freshStore(): EntityStore {
  const store = new EntityStore(new MemoryPersistence());
  seedSales(store);
  return store;
}

/* ── rules evaluator ──────────────────────────────────────────────────── */

describe('rules evaluator (evalCondition)', () => {
  const scope = { user: manager, task: { id: 't1', status: 'proposal', systemcol6: 'u_mgr' } };

  it('treats a missing condition as allow', () => {
    expect(evalCondition(undefined, scope)).toBe(true);
  });

  it('resolves $.user paths with $in against array values', () => {
    expect(evalCondition({ '$.user.roles': { $in: ['SalesManager'] } }, scope)).toBe(true);
    expect(evalCondition({ '$.user.roles': { $in: ['SalesRep'] } }, scope)).toBe(false);
  });

  it('resolves $.task paths with $eq / $ne', () => {
    expect(evalCondition({ '$.task.systemcol6': { $eq: 'u_mgr' } }, scope)).toBe(true);
    expect(evalCondition({ '$.task.systemcol6': { $ne: 'u_mgr' } }, scope)).toBe(false);
  });

  it('combines with $and / $or', () => {
    const and: Condition = { $and: [{ '$.user.roles': { $in: ['SalesManager'] } }, { '$.task.status': { $eq: 'proposal' } }] };
    const or: Condition = { $or: [{ '$.user.roles': { $in: ['SalesRep'] } }, { '$.task.status': { $eq: 'proposal' } }] };
    expect(evalCondition(and, scope)).toBe(true);
    expect(evalCondition(or, scope)).toBe(true);
    expect(evalCondition({ $and: [{ '$.user.roles': { $in: ['SalesRep'] } }] }, scope)).toBe(false);
  });

  it('returns false for unknown paths matched with $eq', () => {
    expect(evalCondition({ '$.task.nope': { $eq: 'x' } }, scope)).toBe(false);
  });
});

/* ── RBAC row visibility ──────────────────────────────────────────────── */

describe('RBAC visibility (task_rules.view)', () => {
  const store = freshStore();
  const all = store.list(DEALS).records;

  it('manager sees every deal', () => {
    expect(all.filter((r) => isTaskVisible(dealsRules, manager, r))).toHaveLength(all.length);
  });

  it('rep sees only deals they own (systemcol6)', () => {
    const visible = all.filter((r) => isTaskVisible(dealsRules, rep, r));
    expect(visible.map((r) => r.id).sort()).toEqual(['D-101', 'D-103', 'D-105']);
    expect(visible.every((r) => r.systemcol6 === 'u_rep')).toBe(true);
  });

  it('rules without task_rules leave everything visible', () => {
    expect(isTaskVisible({ statuses: [], transitions: {} }, rep, all[0])).toBe(true);
  });
});

/* ── transitions ──────────────────────────────────────────────────────── */

describe('rule-gated transitions', () => {
  const store = freshStore();
  const proposalDeal = store.read(DEALS, 'D-104')!; // status: proposal
  const leadDeal = store.read(DEALS, 'D-101')!; // status: lead

  it('manager can close or discard from proposal', () => {
    expect(allowedTransitions(dealsRules, manager, proposalDeal).sort()).toEqual(['lost', 'won']);
  });

  it('rep gets NO transitions from proposal (won/lost are manager-gated)', () => {
    expect(allowedTransitions(dealsRules, rep, proposalDeal)).toEqual([]);
  });

  it('rep can still work the funnel (lead → qualified, not lost)', () => {
    expect(allowedTransitions(dealsRules, rep, leadDeal)).toEqual(['qualified']);
  });

  it('won is terminal for everyone', () => {
    const won = store.read(DEALS, 'D-106')!;
    expect(allowedTransitions(dealsRules, manager, won)).toEqual([]);
  });

  it('resolvePermissions exposes the full transition map', () => {
    const perms = resolvePermissions(dealsRules, rep, proposalDeal);
    expect(perms.transitionRules['proposal->won']).toBe(false);
    expect(perms.transitionRules['lead->qualified']).toBe(true);
  });
});

/* ── runtime: rule-enforced moves + RBAC lists ────────────────────────── */

function dealsRecipe(user: typeof rep): Recipe {
  return {
    id: 'test',
    tenant: 'test',
    brand: { name: 'Test' },
    user,
    modules: [
      { id: 'deals', type: 'pipeline', label: 'Deals', dataSource: { code: DEALS, rulesRef: 'deals' } },
    ],
  };
}

describe('createAppRuntime (composition)', () => {
  let store: EntityStore;
  beforeEach(() => {
    store = freshStore();
  });

  it('module.list applies RBAC for the current user', () => {
    const rt = createAppRuntime({ recipe: dealsRecipe(rep), store, rules: { deals: dealsRules } });
    expect(rt.module('deals').list()).toHaveLength(3);
  });

  it('move persists a permitted transition', () => {
    const rt = createAppRuntime({ recipe: dealsRecipe(manager), store, rules: { deals: dealsRules } });
    rt.module('deals').move('D-104', 'won');
    expect(store.read(DEALS, 'D-104')!.status).toBe('won');
  });

  it('move throws on a role-gated transition and leaves the store untouched', () => {
    const rt = createAppRuntime({ recipe: dealsRecipe(rep), store, rules: { deals: dealsRules } });
    expect(() => rt.module('deals').move('D-105', 'won')).toThrowError(/not permitted for \[SalesRep\]/);
    expect(store.read(DEALS, 'D-105')!.status).toBe('proposal');
  });

  it('getUser is resolved live (role switch changes permissions)', () => {
    let current = rep;
    const rt = createAppRuntime({
      recipe: dealsRecipe(rep),
      store,
      rules: { deals: dealsRules },
      getUser: () => current,
    });
    expect(rt.module('deals').transitions('D-105')).toEqual([]);
    current = manager;
    expect(rt.module('deals').transitions('D-105').sort()).toEqual(['lost', 'won']);
  });

  it('create assigns id + uniqueidentifier from the uidPrefix sequence', () => {
    const rt = createAppRuntime({ recipe: dealsRecipe(manager), store, rules: { deals: dealsRules } });
    const rec = rt.module('deals').create({ title: 'New deal', status: 'lead' });
    expect(rec.id).toBeTruthy();
    expect(rec.uniqueidentifier).toMatch(/^D-\d+$/);
    expect(store.read(DEALS, rec.id)).toBeDefined();
  });
});

/* ── store filtering / search / sort ──────────────────────────────────── */

describe('EntityStore queries', () => {
  const store = freshStore();

  it('searches across the config search columns', () => {
    const { records } = store.list(DEALS, { search: 'northwind' });
    expect(records.map((r) => r.id).sort()).toEqual(['D-105', 'D-106']);
  });

  it('filters by array membership', () => {
    const { records } = store.list(DEALS, { filters: { status: ['proposal'] } });
    expect(records.map((r) => r.id).sort()).toEqual(['D-104', 'D-105']);
  });

  it('boolean filter means has-a-value', () => {
    const { records } = store.list(DEALS, { filters: { systemcol8: true } });
    expect(records.map((r) => r.id)).toEqual(['D-102']); // the only unassigned deal
  });

  it('sorts and paginates', () => {
    const { records, total } = store.list(DEALS, {
      sort: { col: 'uniqueidentifier', dir: 'desc' },
      limit: 2,
    });
    expect(total).toBe(6);
    expect(records.map((r) => r.id)).toEqual(['D-106', 'D-105']);
  });

  it('soft delete hides from list but keeps the row', () => {
    const s = freshStore();
    s.remove(DEALS, 'D-101');
    expect(s.list(DEALS).records.find((r) => r.id === 'D-101')).toBeUndefined();
    expect(s.snapshot()[DEALS].find((r) => r.id === 'D-101')?.deleted).toBe(true);
  });
});

/* ── persistence ──────────────────────────────────────────────────────── */

describe('persistence', () => {
  it('a new store over the same persistence sees prior writes (reload survival)', () => {
    const persistence = new MemoryPersistence();
    const a = new EntityStore(persistence);
    seedSales(a);
    a.create(DEALS, { title: 'Persisted deal', status: 'lead' });

    const b = new EntityStore(persistence); // simulated reload
    for (const cfg of salesConfigs) b.registerConfig(cfg);
    expect(b.list(DEALS).records.some((r) => r.title === 'Persisted deal')).toBe(true);
  });

  it('LocalStoragePersistence degrades to a no-op outside the browser', () => {
    const p = new LocalStoragePersistence({ tenant: 'spec' });
    expect(p.load()).toBeNull();
    expect(() => p.save({})).not.toThrow();
  });
});

/* ── version counter + derived-data cache ─────────────────────────────── */

describe('EntityStore.version + config-bridge cache', () => {
  it('increments on every mutation, not on reads', () => {
    const store = freshStore();
    const v0 = store.version;
    store.list(DEALS);
    store.read(DEALS, 'D-101');
    expect(store.version).toBe(v0);
    store.create(DEALS, { title: 'x', status: 'lead' });
    expect(store.version).toBe(v0 + 1);
    store.update(DEALS, 'D-101', { title: 'renamed' });
    expect(store.version).toBe(v0 + 2);
    store.remove(DEALS, 'D-102');
    expect(store.version).toBe(v0 + 3);
  });

  it('cards keep a stable identity between mutations and refresh after one', () => {
    const store = freshStore();
    const data = bindPipelineModuleData({
      config: dealsConfig,
      list: () => store.list(DEALS).records,
      get: (id) => store.read(DEALS, id),
      version: () => store.version,
    });

    const first = data.cards;
    expect(data.cards).toBe(first); // stable identity → no render-effect loops

    store.update(DEALS, 'D-104', { status: 'won' });
    const second = data.cards;
    expect(second).not.toBe(first); // mutation invalidates the cache
    expect(second.find((c) => c.id === 'D-104')!.stageId).toBe('won');
  });

  it('derives stages, ticket ids and metadata from config alone', () => {
    const store = freshStore();
    const data = bindPipelineModuleData({
      config: dealsConfig,
      list: () => store.list(DEALS).records,
      get: (id) => store.read(DEALS, id),
      version: () => store.version,
    });
    expect(data.stages.map((s) => s.id)).toEqual(['lead', 'qualified', 'proposal', 'won', 'lost']);
    const d101 = data.cards.find((c) => c.id === 'D-101')!;
    expect(d101.ticketId).toBe('D-101');
    expect(d101.stageId).toBe('lead');
  });
});
