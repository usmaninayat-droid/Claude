import { describe, expect, it } from 'vitest'
import { MemoryPersistence } from '@fams/demo-kit'
import { buildDemoRuntime, makeLinkedRecordResolver } from './boot'

/**
 * The app half of linked-record navigation: `entityType` + id → the target
 * module's config, record and DETAIL FLAVOR. This is the classification the
 * design system deliberately cannot make (Rule 8), so it is pinned here.
 */
const runtime = buildDemoRuntime({
  tenant: 'fams',
  personaId: 'u_superadmin',
  baseUrl: 'http://localhost',
  persistence: new MemoryPersistence(),
})
const resolve = makeLinkedRecordResolver(runtime)

function firstRecord(code: string) {
  const cfg = runtime.entityConfigs.find((c) => c.code === code)!
  return runtime.store.list(cfg.code).records[0]
}

describe('makeLinkedRecordResolver — cross-module hops', () => {
  it('a Deal’s Company reference resolves to the ENTITY module (Entity Detail flavor)', () => {
    const deal = firstRecord('crm/deal')
    const hit = resolve({ entityType: 'crm/company', recordId: String(deal.systemcol1) })
    expect(hit).toBeDefined()
    expect(hit!.config.code).toBe('crm/company')
    expect(hit!.moduleType).toBe('entity')
    expect(hit!.record.id).toBe(String(deal.systemcol1))
  })

  it('a Deal’s Owner reference hops to a DIFFERENT entity module (Workforce)', () => {
    const deal = firstRecord('crm/deal')
    const hit = resolve({ entityType: 'workforce/driver', recordId: String(deal.systemcol4) })
    expect(hit?.config.code).toBe('workforce/driver')
    expect(hit?.moduleType).toBe('entity')
  })

  it('a Lead’s Converts-To-Deal reference resolves to the PIPELINE module (Task Detail flavor)', () => {
    const converted = runtime.store
      .list('crm/lead')
      .records.find((r) => r.systemcol8)
    expect(converted).toBeDefined()
    const hit = resolve({ entityType: 'crm/deal', recordId: String(converted!.systemcol8) })
    expect(hit?.config.code).toBe('crm/deal')
    // Wrong flavor here is a classification bug: a pipeline record must open
    // as Task Detail no matter which module it was reached from.
    expect(hit?.moduleType).toBe('pipeline')
  })

  it('an entityType no tenant licenses stays inert (the known INERT references)', () => {
    expect(resolve({ entityType: 'device/tracker', recordId: 'anything' })).toBeUndefined()
  })

  it('a licensed entityType with an unknown id stays inert', () => {
    expect(resolve({ entityType: 'crm/company', recordId: 'NOPE-999' })).toBeUndefined()
  })
})

/**
 * The Linked tab's data — built from the reference GRAPH (both directions),
 * not from a literal `linked` array (nothing ever populated one, which is why
 * that tab was empty for every module).
 */
describe('collectLinkedRows — the Linked tab reads the reference graph', () => {
  const cfgFor = (code: string) => runtime.entityConfigs.find((c) => c.code === code)!

  it('lists a Deal’s OUTBOUND references (company, contact, product, owner)', async () => {
    const { collectLinkedRows } = await import('./demo/profile-tabs')
    const deal = firstRecord('crm/deal')
    const rows = collectLinkedRows(runtime.store, resolve, cfgFor('crm/deal') as never, deal)
    const out = rows.filter((r) => r.direction === 'out').map((r) => r.entityType)
    expect(out).toEqual(expect.arrayContaining(['crm/company', 'crm/contact-person', 'crm/product-service', 'workforce/driver']))
  })

  it('lists a Company’s INBOUND referrers (the deals/contacts pointing at it)', async () => {
    const { collectLinkedRows } = await import('./demo/profile-tabs')
    const company = firstRecord('crm/company')
    const rows = collectLinkedRows(runtime.store, resolve, cfgFor('crm/company') as never, company)
    expect(rows.some((r) => r.direction === 'in')).toBe(true)
    // Every row is a REACHABLE record — resolvable, so activating it opens a sheet.
    for (const row of rows) expect(resolve({ entityType: row.entityType, recordId: row.recordId })).toBeDefined()
  })

  it('skips references to modules no tenant licenses (stays honest about what is reachable)', async () => {
    const { collectLinkedRows } = await import('./demo/profile-tabs')
    const asset = firstRecord('asset/vehicle')
    const rows = collectLinkedRows(runtime.store, resolve, cfgFor('asset/vehicle') as never, asset)
    expect(rows.some((r) => r.entityType === 'device/tracker')).toBe(false)
  })
})
