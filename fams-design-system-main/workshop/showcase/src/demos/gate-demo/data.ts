import {
  InMemoryDataStore,
  createAppRuntime,
  toEntityConfig,
  type AppRuntime,
  type Blueprint,
  type EntityConfig,
  type EntityRecord,
  type ModuleBlueprint,
  type ModuleConfigJson,
  type PipelineRules,
  type UserContext,
} from '@fams/v5-composer'

// The REAL golden blueprints shipped in the composer package — same JSON the
// composer's own tests validate against. Imported by relative path (the
// composer package does not export `./blueprints/*`), mirroring how
// @fams/v5-templates' own fixtures source them.
import companiesJson from '../../../../../packages/v5-composer/blueprints/crm/companies.module.json'
import dealsJson from '../../../../../packages/v5-composer/blueprints/crm/deals.module.json'
import dealsRulesJson from '../../../../../packages/v5-composer/blueprints/crm/deals.rules.json'
import dealsSeed from '../../../../../packages/v5-composer/blueprints/crm/deals.seed.json'
import companiesSeed from '../../../../../packages/v5-composer/blueprints/crm/companies.seed.json'
import vehiclesJson from '../../../../../packages/v5-composer/blueprints/fleet/vehicles.module.json'
import vehiclesSeed from '../../../../../packages/v5-composer/blueprints/fleet/vehicles.seed.json'

const dealsConfig = toEntityConfig(dealsJson as unknown as ModuleConfigJson)
const companiesConfig = toEntityConfig(companiesJson as unknown as ModuleConfigJson)
const vehiclesConfig = toEntityConfig(vehiclesJson as unknown as ModuleConfigJson)
const dealsRules = dealsRulesJson as unknown as PipelineRules

type ConfigVal = ModuleBlueprint['config']

/** The three switchable blueprints — one pipeline, two entities. */
export const gateModules: ModuleBlueprint[] = [
  {
    id: 'companies',
    type: 'entity',
    label: 'CRM · Companies',
    views: ['list'],
    dataSource: { code: 'crm/companies' },
    config: companiesConfig as unknown as ConfigVal,
  },
  {
    id: 'deals',
    type: 'pipeline',
    label: 'CRM · Deals (pipeline)',
    views: ['kanban', 'list'],
    dataSource: { code: 'crm/deals', rulesRef: 'deals' },
    config: dealsConfig as unknown as ConfigVal,
  },
  {
    id: 'vehicles',
    type: 'entity',
    label: 'Fleet · Vehicles',
    views: ['list'],
    dataSource: { code: 'fleet/vehicles' },
    config: vehiclesConfig as unknown as ConfigVal,
  },
]

export const gateRoles: Record<string, UserContext> = {
  manager: { id: 'u_mgr', roles: ['SalesManager'] },
  rep: { id: 'u_rep', roles: ['SalesRep'] },
}

export interface GateApp {
  runtime: AppRuntime
  store: InMemoryDataStore
  modules: ModuleBlueprint[]
}

/**
 * Build a fresh in-memory app for the demo: seed the store from the golden
 * seeds, bind the runtime (RBAC + rule-enforced moves) for the given user. A
 * new instance is a full reset — persistence is deliberately absent (in-memory
 * only, per the composer's no-browser-default rule).
 */
export function createGateApp(user: UserContext): GateApp {
  const store = new InMemoryDataStore()
  store.registerConfig(dealsConfig)
  store.registerConfig(companiesConfig)
  store.registerConfig(vehiclesConfig)
  store.seed('crm/deals', structuredClone(dealsSeed) as unknown as EntityRecord[])
  store.seed('crm/companies', structuredClone(companiesSeed) as unknown as EntityRecord[])
  store.seed('fleet/vehicles', structuredClone(vehiclesSeed) as unknown as EntityRecord[])

  const blueprint: Blueprint = {
    id: 'gate-demo',
    tenant: 'fams',
    brand: { name: 'FAMS Composer' },
    user,
    modules: gateModules,
  }
  const runtime = createAppRuntime({ blueprint, store, rules: { deals: dealsRules }, getUser: () => user })
  return { runtime, store, modules: gateModules }
}

export type { EntityConfig }
