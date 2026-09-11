import { describe, it, expect } from 'vitest'
import { evalRecordAutomations } from './automation'
import type { RecordAutomation, EntityRecord } from './types'

const pmToJobOrder: RecordAutomation = {
  id: 'auto_pm_job_order',
  when: { col: 'trigger', equals: 'fired' },
  create: {
    entityType: 'maintenance/job-order',
    values: {
      title: { fromCol: 'title' },
      systemcol4: { fromCol: 'systemcol1' },
      systemcol31: { fromCol: 'id' },
      status: { const: 'reported-issues' },
    },
  },
  patchSource: {
    status: { const: 'jobOrderCreated' },
    linkedJobOrder: { fromCreated: 'id' },
  },
}

function pmRecord(overrides: Partial<EntityRecord> = {}): EntityRecord {
  return {
    id: 'PMR-100',
    title: 'Oil Change',
    status: 'scheduled',
    systemcol1: 'VEH-01',
    trigger: 'armed',
    ...overrides,
  }
}

describe('evalRecordAutomations', () => {
  it('fires only on the declared transition (armed → fired)', () => {
    const effects = evalRecordAutomations([pmToJobOrder], pmRecord(), { trigger: 'fired' })
    expect(effects).toHaveLength(1)
    expect(effects[0].automationId).toBe('auto_pm_job_order')
  })

  it('does not fire when the column is patched to another value', () => {
    const effects = evalRecordAutomations([pmToJobOrder], pmRecord(), { trigger: 'armed' })
    expect(effects).toEqual([])
  })

  it('does not fire on an unrelated patch that leaves the column untouched', () => {
    const effects = evalRecordAutomations([pmToJobOrder], pmRecord(), { systemcol2: 55000 })
    expect(effects).toEqual([])
  })

  it('does not fire twice — a record already at the target value produces no effect', () => {
    // Simulates re-applying the same patch, or a later unrelated update, to a
    // record that already fired: `prev.trigger` is already 'fired'.
    const already = pmRecord({ trigger: 'fired', status: 'jobOrderCreated' })
    const effects = evalRecordAutomations([pmToJobOrder], already, { trigger: 'fired' })
    expect(effects).toEqual([])
  })

  it('maps values — const and fromCol resolve against the merged (prev + patch) record', () => {
    const prev = pmRecord({ id: 'PMR-100', title: 'Brake Inspection', systemcol1: 'VEH-07' })
    const [effect] = evalRecordAutomations([pmToJobOrder], prev, { trigger: 'fired' })
    expect(effect.create).toEqual({
      entityType: 'maintenance/job-order',
      values: {
        title: 'Brake Inspection',
        systemcol4: 'VEH-07',
        systemcol31: 'PMR-100',
        status: 'reported-issues',
      },
    })
  })

  it('produces the back-reference spec — patchSource carries fromCreated for the caller to resolve post-creation', () => {
    const [effect] = evalRecordAutomations([pmToJobOrder], pmRecord(), { trigger: 'fired' })
    expect(effect.patchSource).toEqual({
      status: { const: 'jobOrderCreated' },
      linkedJobOrder: { fromCreated: 'id' },
    })
  })

  it('is a pure function — no automations, empty patch, or empty list all resolve to no effects', () => {
    expect(evalRecordAutomations(undefined, pmRecord(), { trigger: 'fired' })).toEqual([])
    expect(evalRecordAutomations([], pmRecord(), { trigger: 'fired' })).toEqual([])
    expect(evalRecordAutomations([pmToJobOrder], pmRecord(), {})).toEqual([])
  })
})
