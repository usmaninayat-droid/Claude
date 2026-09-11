import { describe, expect, it, vi } from 'vitest'
import type { ModuleBlueprint, UserContext, PipelineRules } from '@fams/v5-composer'
import { createComposerDataFactory } from './composer-data'
import type { ApiDataAdapter } from './ApiDataAdapter'
import type { CodeBuffers } from './composer-data'

/**
 * The composer data bridge gates `create` (the New button) on the persona's
 * `<module>.create` privilege, reads the synchronous buffer, and writes through
 * to the fetch adapter optimistically.
 */
const node = { id: 'asset', type: 'entity', label: 'Vehicles', dataSource: { code: 'asset/vehicle' } } as ModuleBlueprint
const user: UserContext = { id: 'u_admin', roles: ['admin'], privileges: [] }

function fakeApi() {
  return {
    create: vi.fn().mockResolvedValue({ id: 'srv', title: 'X' }),
    update: vi.fn().mockResolvedValue({}),
    remove: vi.fn().mockResolvedValue(true),
  } as unknown as ApiDataAdapter
}

describe('createComposerDataFactory', () => {
  it('exposes create only with the create privilege (New button gating)', () => {
    const buffers = { 'asset/vehicle': [] }
    const dispatcher = createComposerDataFactory({ api: fakeApi(), buffers, privileges: ['asset.view'], userContext: user, rulesByCode: {} })(node)
    expect(dispatcher.create).toBeUndefined()

    const admin = createComposerDataFactory({ api: fakeApi(), buffers, privileges: ['asset.view', 'asset.create'], userContext: user, rulesByCode: {} })(node)
    expect(admin.create).toBeTypeOf('function')
  })

  it('reads the buffer synchronously and optimistically appends on create', () => {
    const api = fakeApi()
    const buffers = { 'asset/vehicle': [{ id: 'VEH-01', title: 'Seed' }] }
    const data = createComposerDataFactory({ api, buffers, privileges: ['asset.view', 'asset.create'], userContext: user, rulesByCode: {} })(node)

    expect(data.list().map((r) => r.id)).toEqual(['VEH-01'])
    const created = data.create!({ title: 'New' })
    expect(created.id).toBeTruthy()
    expect(data.list()).toHaveLength(2)
    expect(api.create).toHaveBeenCalledWith('asset/vehicle', { title: 'New' })
  })

  /*
   * The delete seam behind the shared `…` row menu + bulk bar. Round 1's P0 was
   * that NOTHING supplied it, so `Delete` silently never rendered on any lens.
   * It is privilege-gated per module like `create`/`update`, so a persona
   * without `<module>.delete` correctly gets no Delete affordance at all.
   */
  it('exposes remove only with the delete privilege (Delete affordance gating)', () => {
    const buffers = { 'asset/vehicle': [] }
    const factory = (privileges: string[]) =>
      createComposerDataFactory({ api: fakeApi(), buffers, privileges, userContext: user, rulesByCode: {} })(node)
    expect(factory(['asset.view']).remove).toBeUndefined()
    expect(factory(['asset.view', 'asset.delete']).remove).toBeTypeOf('function')
  })

  it('drops the record from the render buffer and writes through to the API', () => {
    const api = fakeApi()
    const buffers = { 'asset/vehicle': [{ id: 'VEH-01', title: 'Seed' }, { id: 'VEH-02', title: 'Other' }] }
    const data = createComposerDataFactory({ api, buffers, privileges: ['asset.view', 'asset.delete'], userContext: user, rulesByCode: {} })(node)

    expect(data.remove!('VEH-01')).toBe(true)
    expect(data.list().map((r) => r.id)).toEqual(['VEH-02'])
    expect(api.remove).toHaveBeenCalledWith('asset/vehicle', 'VEH-01')
    // An unknown id is a no-op, not a throw and not a phantom write.
    expect(data.remove!('nope')).toBe(false)
    expect(api.remove).toHaveBeenCalledTimes(1)
  })

  /*
   * Wave C: a module's declared `uiConfig.recordAutomation` (the generic
   * cross-module vocabulary, `@fams/v5-composer`'s `evalRecordAutomations`)
   * fires from `adapter.update`, creates the target record via the SAME
   * optimistic-create + write-through shape `create` uses above (respecting
   * the target module's own pipeline default stage), and patches the source
   * record back with the resolved back-reference.
   */
  it('record automation: a declared trigger creates the target record and patches the source back', () => {
    const api = fakeApi()
    const buffers: CodeBuffers = {
      'maintenance/preventive-rule': [
        { id: 'PMR-100', title: 'Oil Change', status: 'scheduled', systemcol1: 'VEH-09', trigger: 'armed' },
      ],
      'maintenance/job-order': [],
    }
    const pmNode = {
      id: 'preventive-maintenance',
      type: 'entity',
      label: 'Preventive Maintenance',
      dataSource: { code: 'maintenance/preventive-rule' },
      config: {
        uiConfig: {
          recordAutomation: [
            {
              id: 'auto_pm_job_order',
              when: { col: 'trigger', equals: 'fired' },
              create: {
                entityType: 'maintenance/job-order',
                values: {
                  title: { fromCol: 'title' },
                  systemcol4: { fromCol: 'systemcol1' },
                  systemcol31: { fromCol: 'id' },
                },
              },
              patchSource: {
                status: { const: 'jobOrderCreated' },
                linkedJobOrder: { fromCreated: 'id' },
              },
            },
          ],
        },
      },
    } as unknown as ModuleBlueprint
    const rulesByCode: Record<string, PipelineRules> = {
      'maintenance/job-order': { statuses: ['reported-issues', 'scheduled'], transitions: {} },
    }
    const data = createComposerDataFactory({
      api,
      buffers,
      privileges: ['preventive-maintenance.update'],
      userContext: user,
      rulesByCode,
    })(pmNode)

    data.update!('PMR-100', { trigger: 'fired' })

    expect(buffers['maintenance/job-order']).toHaveLength(1)
    const created = buffers['maintenance/job-order'][0]
    expect(created.title).toBe('Oil Change')
    expect(created.systemcol4).toBe('VEH-09')
    expect(created.systemcol31).toBe('PMR-100')
    expect(created.status).toBe('reported-issues') // target module's pipeline default stage
    expect(api.create).toHaveBeenCalledWith('maintenance/job-order', expect.objectContaining({ title: 'Oil Change' }))

    const source = buffers['maintenance/preventive-rule'][0]
    expect(source.status).toBe('jobOrderCreated')
    expect(source.linkedJobOrder).toBe(created.id)

    // Re-applying an unrelated patch never re-fires it (evalRecordAutomations'
    // enter-transition guard) — the buffer stays at exactly one created record.
    data.update!('PMR-100', { title: 'Oil Change (updated)' })
    expect(buffers['maintenance/job-order']).toHaveLength(1)
  })

  /*
   * Fix7: the automation's create must leave a Timeline entry the user can
   * see on the CREATED record, attributed to the system — never silence
   * (the pre-existing defect), never the booted persona's name (the
   * mis-attribution phase 7 flagged as worse than silence).
   */
  it('record automation: the created record gets a system-attributed timelineEvents entry, not the booted persona', () => {
    const api = fakeApi()
    const buffers: CodeBuffers = {
      'maintenance/preventive-rule': [
        { id: 'PMR-100', title: 'Oil Change', status: 'scheduled', systemcol1: 'VEH-09', trigger: 'armed' },
      ],
      'maintenance/job-order': [],
    }
    const pmNode = {
      id: 'preventive-maintenance',
      type: 'entity',
      label: 'Preventive Maintenance',
      dataSource: { code: 'maintenance/preventive-rule' },
      config: {
        uiConfig: {
          recordAutomation: [
            {
              id: 'auto_pm_job_order',
              when: { col: 'trigger', equals: 'fired' },
              create: { entityType: 'maintenance/job-order', values: { title: { fromCol: 'title' } } },
              patchSource: { status: { const: 'jobOrderCreated' } },
            },
          ],
        },
      },
    } as unknown as ModuleBlueprint
    const rulesByCode: Record<string, PipelineRules> = {
      'maintenance/job-order': { statuses: ['reported-issues'], transitions: {} },
    }
    const data = createComposerDataFactory({
      api,
      buffers,
      // The booted persona — must NOT end up as the created record's timeline actor.
      actorName: 'Sarah Chen',
      privileges: ['preventive-maintenance.update'],
      userContext: user,
      rulesByCode,
    })(pmNode)

    data.update!('PMR-100', { trigger: 'fired' })

    const created = buffers['maintenance/job-order'][0]
    expect(created.timelineEvents).toHaveLength(1)
    const entry = (created.timelineEvents as Array<Record<string, unknown>>)[0]
    expect(entry.actor).toEqual({ kind: 'system', label: 'Automation' })
    expect(entry.actor).not.toBe('Sarah Chen')
    expect(typeof entry.action).toBe('string')
    // The API write-through carries the same audit field — the backing
    // store never falls out of sync with the optimistic buffer.
    expect(api.create).toHaveBeenCalledWith(
      'maintenance/job-order',
      expect.objectContaining({ timelineEvents: created.timelineEvents }),
    )
  })

  /*
   * Fix7 (wave 4c gap): a LIVE session edit on a record whose Timeline reads
   * `timelineEvents` (the ticketing shape) must also produce a visible entry
   * — before this fix, the generic audit trail only ever wrote `activity`,
   * a field job-orders' own Timeline tab never reads.
   */
  it('a live field edit on a `timelineEvents`-shaped record appends a human-attributed entry', () => {
    const api = fakeApi()
    const buffers: CodeBuffers = {
      'ticketing/job-order': [{ id: 'JO-1', title: 'Brake check', timelineEvents: [] }],
    }
    const joNode = {
      id: 'job-orders',
      type: 'pipeline',
      label: 'Job Orders',
      dataSource: { code: 'ticketing/job-order' },
      config: { fields: [{ col: 'title', name: 'Title' }] },
    } as unknown as ModuleBlueprint
    const data = createComposerDataFactory({
      api,
      buffers,
      actorName: 'Sarah Chen',
      privileges: ['job-orders.update'],
      userContext: user,
      rulesByCode: {},
    })(joNode)

    data.update!('JO-1', { title: 'Brake check (urgent)' })

    const rec = buffers['ticketing/job-order'][0]
    expect(rec.timelineEvents).toHaveLength(1)
    const entry = (rec.timelineEvents as Array<Record<string, unknown>>)[0]
    expect(entry.actor).toBe('Sarah Chen')
    expect(entry.action).toContain('Title')
    // No stray `activity` array was invented on a record that never had one.
    expect(rec.activity).toBeUndefined()
  })
})
