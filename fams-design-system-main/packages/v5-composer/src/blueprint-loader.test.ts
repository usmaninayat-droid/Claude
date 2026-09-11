import { describe, it, expect } from 'vitest'
import { instantiateBlueprint } from './blueprint-loader'
import type { BlueprintBundle, BlueprintJson, ModuleConfigJson } from './blueprint-loader'
import type { PipelineRules, EntityRecord, UserContext } from './types'
import crmBlueprint from '../blueprints/crm/crm.blueprint.json'
import dealsJson from '../blueprints/crm/deals.module.json'
import companiesJson from '../blueprints/crm/companies.module.json'
import contactsJson from '../blueprints/crm/contacts.module.json'
import dealsRules from '../blueprints/crm/deals.rules.json'
import dealsSeed from '../blueprints/crm/deals.seed.json'
import companiesSeed from '../blueprints/crm/companies.seed.json'
import contactsSeed from '../blueprints/crm/contacts.seed.json'

function makeBundle(): BlueprintBundle {
  return {
    blueprint: crmBlueprint as unknown as BlueprintJson,
    configs: {
      'crm/deals': dealsJson as unknown as ModuleConfigJson,
      'crm/companies': companiesJson as unknown as ModuleConfigJson,
      'crm/contacts': contactsJson as unknown as ModuleConfigJson,
    },
    rules: { deals: dealsRules as unknown as PipelineRules },
    seeds: {
      'crm/deals': dealsSeed as unknown as EntityRecord[],
      'crm/companies': companiesSeed as unknown as EntityRecord[],
      'crm/contacts': contactsSeed as unknown as EntityRecord[],
    },
  }
}

describe('blueprint-loader — instantiateBlueprint (in-memory, no persistence)', () => {
  it('registers configs, seeds the store, and binds a runtime', () => {
    const { runtime, store, blueprint } = instantiateBlueprint(makeBundle())
    expect(blueprint.id).toBe('crm')
    expect(store.getConfig('crm/deals')?.name).toBe('Deals')
    // Manager (blueprint.user) sees every seeded deal.
    expect(runtime.module('deals').list()).toHaveLength(6)
    expect(runtime.module('companies').list()).toHaveLength(6)
  })

  it('NEVER touches browser storage when no persistence is injected', () => {
    // The original loader defaulted to a LocalStoragePersistence; this port
    // must not. Instantiating + mutating with no adapter completes purely
    // in-memory (the created record lands in the store snapshot), and never
    // references window.localStorage — proven here because this environment
    // has no localStorage at all, yet nothing throws.
    const { runtime, store } = instantiateBlueprint(makeBundle())
    const created = runtime.module('deals').create({ title: 'Fresh deal', status: 'lead' })
    expect(created.id).toBeTruthy()
    expect(store.snapshot()['crm/deals'].some((r) => r.id === created.id)).toBe(true)
    if (typeof globalThis.localStorage !== 'undefined') {
      expect(globalThis.localStorage.length).toBe(0)
    }
  })

  it('enforces rule-gated moves through the runtime handle', () => {
    const { runtime } = instantiateBlueprint(makeBundle())
    const deals = runtime.module('deals')
    // Manager may move a proposal to won.
    const moved = deals.move('D-104', 'won')
    expect(moved.status).toBe('won')
  })

  it('throws when a SalesRep attempts a manager-gated move', () => {
    const rep: UserContext = { id: 'u_rep', roles: ['SalesRep'] }
    const { runtime } = instantiateBlueprint(makeBundle(), { getUser: () => rep })
    expect(() => runtime.module('deals').move('D-104', 'won')).toThrow(/not permitted/)
  })

  it('applies RBAC row filtering per user via getUser', () => {
    const rep: UserContext = { id: 'u_rep', roles: ['SalesRep'] }
    const { runtime } = instantiateBlueprint(makeBundle(), { getUser: () => rep })
    // The rep sees only deals they own (systemcol6 === 'u_rep').
    const visible = runtime.module('deals').list()
    expect(visible.every((r) => r.systemcol6 === 'u_rep')).toBe(true)
    expect(visible.length).toBeGreaterThan(0)
    expect(visible.length).toBeLessThan(6)
  })
})
