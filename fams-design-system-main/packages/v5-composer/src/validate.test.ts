import { describe, it, expect } from 'vitest'
import {
  validateBlueprint,
  validateEntityModuleConfig,
  validatePipelineModuleConfig,
} from './validate'
import crmBlueprint from '../blueprints/crm/crm.blueprint.json'
import dealsJson from '../blueprints/crm/deals.module.json'
import companiesJson from '../blueprints/crm/companies.module.json'
import contactsJson from '../blueprints/crm/contacts.module.json'
import fleetBlueprint from '../blueprints/fleet/fleet.blueprint.json'
import vehiclesJson from '../blueprints/fleet/vehicles.module.json'

const clone = <T>(v: T): T => structuredClone(v)

describe('validateBlueprint — accepts the crm golden example', () => {
  it('accepts the app blueprint document', () => {
    const res = validateBlueprint(crmBlueprint)
    expect(res.errors).toEqual([])
    expect(res.valid).toBe(true)
  })

  it('accepts each module config document', () => {
    expect(validateBlueprint(dealsJson).valid).toBe(true)
    expect(validateBlueprint(companiesJson).valid).toBe(true)
    expect(validateBlueprint(contactsJson).valid).toBe(true)
    // and via the kind-specific entry points
    expect(validatePipelineModuleConfig(dealsJson).valid).toBe(true)
    expect(validateEntityModuleConfig(companiesJson).valid).toBe(true)
  })
})

describe('validateBlueprint — rejects a missing stable id', () => {
  it('flags a column with no id', () => {
    const bad = clone(dealsJson) as Record<string, unknown>
    delete (bad.systemcolumns as Record<string, unknown>[])[0].id
    const res = validateBlueprint(bad)
    expect(res.valid).toBe(false)
    expect(res.errors.some((e) => e.path === 'systemcolumns[0].id')).toBe(true)
  })

  it('flags a module node with no id in the app blueprint', () => {
    const bad = clone(crmBlueprint) as Record<string, unknown>
    delete (bad.modules as Record<string, unknown>[])[0].id
    const res = validateBlueprint(bad)
    expect(res.valid).toBe(false)
    expect(res.errors.some((e) => e.path === 'modules[0].id')).toBe(true)
  })
})

describe('validateBlueprint — rejects an unknown field type', () => {
  it('flags a column whose type is not in the field-type set', () => {
    const bad = clone(dealsJson) as Record<string, unknown>
    ;(bad.systemcolumns as Record<string, unknown>[])[0].type = 'Nonsense'
    const res = validateBlueprint(bad)
    expect(res.valid).toBe(false)
    expect(res.errors.some((e) => e.path === 'systemcolumns[0].type')).toBe(true)
  })
})

describe('validateBlueprint — rejects a bad reference', () => {
  it('flags a reference field with a refModule outside {Entity,Tag,Users}', () => {
    const bad = clone(contactsJson) as Record<string, unknown>
    const company = (bad.systemcolumns as Record<string, unknown>[]).find(
      (c) => c.col === 'systemcol3',
    )!
    company.refModule = 'Bogus'
    const res = validateBlueprint(bad)
    expect(res.valid).toBe(false)
    expect(res.errors.some((e) => e.path.endsWith('.refModule'))).toBe(true)
  })

  it('flags an Entity reference with no entityType', () => {
    const bad = clone(contactsJson) as Record<string, unknown>
    const company = (bad.systemcolumns as Record<string, unknown>[]).find(
      (c) => c.col === 'systemcol3',
    )!
    delete company.entityType
    const res = validateBlueprint(bad)
    expect(res.valid).toBe(false)
    expect(res.errors.some((e) => e.path.endsWith('.entityType'))).toBe(true)
  })
})

describe('validateBlueprint — pipeline-specific rules', () => {
  it('requires a kanbanCard and at least two stages', () => {
    const bad = clone(dealsJson) as { uiConfig: Record<string, unknown> }
    delete bad.uiConfig.kanbanCard
    bad.uiConfig.statusList = [(dealsJson.uiConfig.statusList as unknown[])[0]]
    const res = validatePipelineModuleConfig(bad)
    expect(res.valid).toBe(false)
    expect(res.errors.some((e) => e.path === 'uiConfig.kanbanCard')).toBe(true)
    expect(res.errors.some((e) => e.path === 'uiConfig.statusList')).toBe(true)
  })
})

describe('validateBlueprint — shape guards', () => {
  it('rejects a non-object', () => {
    expect(validateBlueprint(null).valid).toBe(false)
    expect(validateBlueprint('nope').valid).toBe(false)
  })

  it('rejects an unrecognized document', () => {
    expect(validateBlueprint({ foo: 'bar' }).valid).toBe(false)
  })
})

describe('validateBlueprint — accepts the fleet-vehicles blueprint (task 2.7)', () => {
  it('accepts the fleet app blueprint document', () => {
    const res = validateBlueprint(fleetBlueprint)
    expect(res.errors).toEqual([])
    expect(res.valid).toBe(true)
  })

  it('accepts the vehicles entity module config (both entry points)', () => {
    expect(validateBlueprint(vehiclesJson).valid).toBe(true)
    expect(validateEntityModuleConfig(vehiclesJson).valid).toBe(true)
  })
})

describe('validateBlueprint — non-entity/pipeline `kind` dispatch (§5 cleanup)', () => {
  // The parked 2.1-review bug: a standalone dashboard/reports/settings config
  // carries a `kind` but no `systemcolumns`/`uiConfig`, so routing it to the
  // ENTITY validator failed it spuriously. It must instead be accepted with a
  // "not yet implemented" warning.
  for (const kind of ['reports', 'settings'] as const) {
    it(`accepts a standalone ${kind} module config with a not-yet-implemented warning`, () => {
      const res = validateBlueprint({ kind, code: `x/${kind}`, name: kind })
      expect(res.valid).toBe(true)
      expect(res.errors).toEqual([])
      expect(res.warnings?.some((w) => w.includes(kind) && /not yet implemented/i.test(w))).toBe(true)
    })
  }

  it('still routes an entity `kind` to real entity validation (fails a broken one)', () => {
    // No systemcolumns/uiConfig → the entity validator must reject it, proving
    // the dispatch fix did NOT turn entity configs into rubber-stamps.
    const res = validateBlueprint({ kind: 'entity', code: 'x/e', name: 'E' })
    expect(res.valid).toBe(false)
    expect(res.errors.some((e) => e.path === 'systemcolumns')).toBe(true)
  })

  it('still routes a pipeline `kind` to real pipeline validation', () => {
    const res = validateBlueprint({ kind: 'pipeline', code: 'x/p', name: 'P' })
    expect(res.valid).toBe(false)
  })

  it('rejects an unknown module-type `kind` by name', () => {
    const res = validateBlueprint({ kind: 'wormhole', code: 'x/w', name: 'W' })
    expect(res.valid).toBe(false)
    expect(res.errors.some((e) => e.path === 'kind' && /unknown module type/i.test(e.message))).toBe(true)
  })
})
