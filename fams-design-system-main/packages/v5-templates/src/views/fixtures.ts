import {
  allowedTransitions,
  toEntityConfig,
  type EntityConfig,
  type EntityRecord,
  type ModuleConfigJson,
  type PipelineRules,
  type UserContext,
} from '@fams/v5-composer'
import companiesJson from '../../../v5-composer/blueprints/crm/companies.module.json'
import dealsJson from '../../../v5-composer/blueprints/crm/deals.module.json'
import dealsSeed from '../../../v5-composer/blueprints/crm/deals.seed.json'
import companiesSeed from '../../../v5-composer/blueprints/crm/companies.seed.json'
import dealsRules from '../../../v5-composer/blueprints/crm/deals.rules.json'
import vehiclesJson from '../../../v5-composer/blueprints/fleet/vehicles.module.json'
import vehiclesSeed from '../../../v5-composer/blueprints/fleet/vehicles.seed.json'

/**
 * The crm GOLDEN blueprint as configs + records + rules, for the view-template
 * tests + demos. Sourced from v5-composer's shipped `blueprints/crm/` (the
 * primary test fixture per the task brief).
 */
export const dealsConfig: EntityConfig = toEntityConfig(dealsJson as unknown as ModuleConfigJson)
export const companiesConfig: EntityConfig = toEntityConfig(companiesJson as unknown as ModuleConfigJson)
export const vehiclesConfig: EntityConfig = toEntityConfig(vehiclesJson as unknown as ModuleConfigJson)

export const dealRecords: EntityRecord[] = dealsSeed as unknown as EntityRecord[]
export const companyRecords: EntityRecord[] = companiesSeed as unknown as EntityRecord[]
export const vehicleRecords: EntityRecord[] = vehiclesSeed as unknown as EntityRecord[]

/** Raw authored configs (with `kind`/`id` nodes) — for building blueprint bundles. */
export const dealsModuleJson = dealsJson
export const companiesModuleJson = companiesJson
export const vehiclesModuleJson = vehiclesJson
export const dealsRulesJson = dealsRules

export const dealsPipelineRules: PipelineRules = dealsRules as unknown as PipelineRules

/** SalesManager: may move proposal → won (per the golden rules). */
export const managerUser: UserContext = { id: 'u_mgr', roles: ['SalesManager'] }
/** SalesRep: NOT permitted to close a proposal to won. */
export const repUser: UserContext = { id: 'u_rep', roles: ['SalesRep'] }

/**
 * Build a Kanban `canMove` from the pipeline rules for a given user — the exact
 * hook-up the brief asks for (rule evaluator → move guard).
 */
export function makeCanMove(rules: PipelineRules, user: UserContext, records: EntityRecord[]) {
  return (recordId: string, _fromStage: string, toStage: string): boolean => {
    const record = records.find((r) => r.id === recordId)
    if (!record) return false
    return allowedTransitions(rules, user, record).includes(toStage)
  }
}
