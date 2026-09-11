/**
 * Faithful FAMS simulation — top-level barrel + ready-to-run factory.
 *
 * A `*.config.tsx` app opts into live, persisted, rule-governed data by:
 *   const sim = createSalesSim('sales');
 *   const dealsData = createSimPipelineData({
 *     store: sim.store, code: 'crm/deals', rules: sim.rules['crm/deals'],
 *     getUser: () => sim.users.manager,   // → users.rep to see RBAC differ
 *     stages: DEAL_STAGES, toCard: (r) => ({ ...projection }),
 *   });
 * and handing `dealsData` to the pipeline module's `data`.
 */

export * from './engine';
export { LocalStoragePersistence, MemoryPersistence } from './persistence/local-storage';
export type { LocalStorageOptions } from './persistence/local-storage';
export {
  createSimPipelineData,
  createSimEntityData,
  simCreateSubmit,
} from './bridge/module-data';
export type { SimPipelineOptions, SimEntityOptions } from './bridge/module-data';
export * as salesSeed from './seed/sales';

import { EntityStore } from './engine/entity-store';
import { LocalStoragePersistence } from './persistence/local-storage';
import { seedSales, salesConfigs, salesRules, salesUsers } from './seed/sales';

export interface SimInstance {
  store: EntityStore;
  configs: typeof salesConfigs;
  rules: typeof salesRules;
  users: typeof salesUsers;
}

/**
 * Build a ready-to-use sales CRM sim: localStorage-backed store, configs
 * registered, seeded on first load (persisted edits survive reloads after).
 */
export function createSalesSim(tenant = 'sales'): SimInstance {
  const persistence = new LocalStoragePersistence({ tenant });
  const store = new EntityStore(persistence);
  if (persistence.load() != null) {
    for (const cfg of salesConfigs) store.registerConfig(cfg);
  } else {
    seedSales(store);
  }
  return { store, configs: salesConfigs, rules: salesRules, users: salesUsers };
}
