import { toEntityConfig, type EntityConfig, type EntityRecord, type ModuleConfigJson } from '@fams/v5-composer'
import companiesJson from '../../../v5-composer/blueprints/crm/companies.module.json'
import dealsJson from '../../../v5-composer/blueprints/crm/deals.module.json'

/**
 * The crm GOLDEN blueprint as EntityConfigs, for tests + demos. Imported from
 * v5-composer's shipped `blueprints/crm/` (the primary test fixture, per the
 * task brief) and normalized through the package's own `toEntityConfig`.
 */
export const companiesConfig: EntityConfig = toEntityConfig(companiesJson as unknown as ModuleConfigJson)
export const dealsConfig: EntityConfig = toEntityConfig(dealsJson as unknown as ModuleConfigJson)

export const companyRecord: EntityRecord = {
  id: 'c1',
  uniqueidentifier: 'C-1001',
  title: 'Globex Corporation',
  status: 'Customer',
  systemcol1: 'Manufacturing',
  systemcol2: 'u-amir',
  systemcol3: '1.2M QAR',
}

export const dealRecord: EntityRecord = {
  id: 'd1',
  uniqueidentifier: 'D-5001',
  title: 'Globex Expansion',
  status: 'qualified',
  systemcol1: 'EXPANSION',
  systemcol2: 'High',
  systemcol3: 'c1',
  systemcol6: 'u-amir',
  systemcol7: '2026-02-01',
}
