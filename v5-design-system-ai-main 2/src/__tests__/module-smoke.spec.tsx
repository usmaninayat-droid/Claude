import { describe, it, expect } from 'vitest';
import { EntityStore } from '../sim/engine/entity-store';
import { MemoryPersistence } from '../sim/persistence/local-storage';
import { seedCrm, crmConfigs } from '../sim/seed/crm';
import { seedSales, salesConfigs } from '../sim/seed/sales';
import type { EntityConfig } from '../sim/engine/types';
import {
  buildEntityModuleData,
  buildPipelineModuleData,
  deriveDetail,
} from '../runtime/config-render';
import {
  bindEntityModuleData,
  bindPipelineModuleData,
} from '../components/app-shell/config-bridge';
import { listModuleTypes, getModuleType } from '../components/app-shell/module-registry';
import type { ModuleType } from '../components/app-shell/types';

/**
 * G-SMOKE — the keystone gate (SI-1). Deterministic "mount-and-assert" for every
 * config-driven module WITHOUT a browser or WebGL: it exercises the real
 * derivation path a module renders through (config → config-render view-model →
 * config-bridge shell data) and asserts the three guarantees the flaky live
 * preview could never give us reliably:
 *   1. renderer resolves  — every module TYPE in the fixed menu has a renderer;
 *   2. data binds         — seeded records flow into rows/cards;
 *   3. no thrown error + key surface present — columns/rows OR stages/cards,
 *      facets, sort fields, and a buildable detail, all derived without throwing.
 *
 * Pure node env (matches vitest.config `environment: 'node'`); no jsdom, no
 * canvas, no map engine — so it never flakes on the browser/WebGL that blocked
 * live verification in ticks 1-3. Add render-level DOM smoke as SI-1b only once
 * jsdom is wired; this layer is the deterministic keystone.
 */

/* The 11 fixed module types every coherent product composes from. */
const FIXED_TYPES: ModuleType[] = [
  'entity', 'pipeline', 'dashboard', 'live-monitoring',
  'reports', 'inbox', 'settings', 'calendar', 'forms',
  'zones', 'pois',
];

/** Seed groups = the golden config-driven surfaces (CRM template + Sales). */
const GROUPS: { name: string; seed: (s: EntityStore) => void; configs: EntityConfig[] }[] = [
  { name: 'crm', seed: seedCrm, configs: crmConfigs },
  { name: 'sales', seed: seedSales, configs: salesConfigs },
];

function freshStore(seed: (s: EntityStore) => void): EntityStore {
  const store = new EntityStore(new MemoryPersistence());
  seed(store);
  return store;
}

const isPipeline = (c: EntityConfig): boolean => (c.uiConfig.statusList?.length ?? 0) > 0;

/* ── 1 · renderer resolves ──────────────────────────────────────────────── */
describe('G-SMOKE · module-type registry coverage', () => {
  it('exposes exactly the fixed module-type menu', () => {
    const types = listModuleTypes().map((t) => t.type).sort();
    expect(types).toEqual([...FIXED_TYPES].sort());
  });

  it.each(FIXED_TYPES)('type "%s" resolves a renderer + tab metadata', (type) => {
    const def = getModuleType(type);
    expect(def, `no registry entry for "${type}"`).toBeTruthy();
    expect(typeof def.render, `"${type}" has no renderer`).toBe('function');
    expect(['view', 'instance']).toContain(def.tabKind);
    expect(Array.isArray(def.defaultViews)).toBe(true);
    expect(typeof def.label).toBe('string');
  });
});

/* ── 2 · data binds  &  3 · view-model surface derives without throwing ──── */
describe('G-SMOKE · config-driven modules derive + bind', () => {
  for (const group of GROUPS) {
    for (const config of group.configs) {
      const code = config.code;

      it(`[${group.name}] ${code}: seeds records (data source binds)`, () => {
        const store = freshStore(group.seed);
        const { records } = store.list(code);
        expect(records.length, `${code} seeded no records`).toBeGreaterThan(0);
      });

      it(`[${group.name}] ${code}: entity view-model derives + binds`, () => {
        const store = freshStore(group.seed);
        const records = store.list(code).records;

        // pure config-render layer (columns / rows / filters / detail)
        const vm = buildEntityModuleData(config, records);
        expect(vm.columns.length, `${code}: no columns`).toBeGreaterThan(0);
        expect(Array.isArray(vm.filters)).toBe(true);
        expect(vm.searchColumns.length, `${code}: no search columns`).toBeGreaterThan(0);

        // detail builds for a real row without throwing
        const detail = deriveDetail(config, records[0]);
        expect(detail).toBeTruthy();
        expect(Array.isArray(detail.sections)).toBe(true);
        expect(Array.isArray(detail.rightPanelTabs)).toBe(true);

        // shell-bound layer (facets / sortFields / live rows)
        const shell = bindEntityModuleData({
          config,
          list: () => store.list(code).records,
          version: () => store.version,
        });
        const facets = shell.facets ?? [];
        const sortFields = shell.sortFields ?? [];
        expect(shell.columns.length).toBe(vm.columns.length);
        expect(shell.rows.length).toBe(records.length);
        expect(facets.length).toBe(vm.filters.length);
        expect(sortFields.length).toBeGreaterThan(0);
        // every facet resolves options without throwing
        for (const f of facets) {
          expect(typeof f.col).toBe('string');
          expect(Array.isArray(f.options)).toBe(true);
        }
      });

      if (isPipeline(config)) {
        it(`[${group.name}] ${code}: pipeline view-model derives (stages + cards)`, () => {
          const store = freshStore(group.seed);
          const records = store.list(code).records;
          const stageCount = config.uiConfig.statusList!.length;

          const vm = buildPipelineModuleData(config, records);
          expect(vm.stages.length, `${code}: stage count ≠ statusList`).toBe(stageCount);
          expect(vm.cards.length, `${code}: card count ≠ record count`).toBe(records.length);

          const shell = bindPipelineModuleData({
            config,
            list: () => store.list(code).records,
            get: (id) => store.read(code, id),
            version: () => store.version,
          });
          expect(shell.stages.length).toBe(stageCount);
          expect(shell.cards.length).toBe(records.length);
          expect(Array.isArray(shell.facets ?? [])).toBe(true);
          expect((shell.columns ?? []).length).toBeGreaterThan(0);
        });
      }
    }
  }
});
