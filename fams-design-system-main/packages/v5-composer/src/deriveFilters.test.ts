import { describe, it, expect } from 'vitest'
import { deriveFilters } from './config-render'
import { toEntityConfig } from './blueprint-loader'
import type { ModuleConfigJson } from './blueprint-loader'
import type { EntityConfig, FilterDef, UiConfig } from './types'
import dealsJson from '../blueprints/crm/deals.module.json'
import companiesJson from '../blueprints/crm/companies.module.json'
import contactsJson from '../blueprints/crm/contacts.module.json'
import vehiclesJson from '../blueprints/fleet/vehicles.module.json'

const fixtures: [string, EntityConfig][] = [
  ['crm/deals', toEntityConfig(dealsJson as unknown as ModuleConfigJson)],
  ['crm/companies', toEntityConfig(companiesJson as unknown as ModuleConfigJson)],
  ['crm/contacts', toEntityConfig(contactsJson as unknown as ModuleConfigJson)],
  ['fleet/vehicles', toEntityConfig(vehiclesJson as unknown as ModuleConfigJson)],
]

/**
 * The resolver EXACTLY as it stood before `FilterDef` v2 — the oracle the
 * parity test below compares against. Do not "improve" it.
 */
function deriveFiltersLegacy(config: EntityConfig) {
  const statusKeys = config.uiConfig.statusList.map((s) => s.key)
  return (config.uiConfig.filters ?? []).map((f) => {
    const def = config.systemcolumns.find((c) => c.col === f.col)
    const type = f.boolean ? 'boolean' : f.col === 'status' ? 'select' : (def?.type ?? 'text')
    const options = f.col === 'status' ? statusKeys : (def?.listValues ?? undefined)
    return { col: f.col, label: f.name ?? def?.name ?? f.col, type, options }
  })
}

describe('deriveFilters — legacy shape stays valid', () => {
  it.each(fixtures)(
    'resolves %s to byte-identical legacy facet fields (col/label/type/options)',
    (_name, config) => {
      const legacy = deriveFiltersLegacy(config)
      const v2 = deriveFilters(config)
      expect(v2).toHaveLength(legacy.length)
      expect(
        v2.map((f) => ({ col: f.col, label: f.label, type: f.type, options: f.options })),
      ).toEqual(legacy)
    },
  )

  it('adds only additive keys — no legacy key is removed or repurposed', () => {
    const facet = deriveFilters(fixtures[0][1])[0]
    for (const key of ['col', 'label', 'type'] as const) {
      expect(facet[key]).toBeDefined()
    }
    // `options` is still a flat string[] (or undefined), never widened.
    for (const facet of fixtures.flatMap(([, c]) => deriveFilters(c))) {
      if (facet.options !== undefined) {
        expect(Array.isArray(facet.options)).toBe(true)
        facet.options.forEach((o) => expect(typeof o).toBe('string'))
      }
    }
  })
})

/** Build a throwaway config around one filter def, for derivation tests. */
function cfg(filter: FilterDef, extra: Partial<UiConfig> = {}): EntityConfig {
  return {
    code: 't',
    name: 'T',
    systemcolumns: [
      { col: 'title', name: 'Title', type: 'SmallText' },
      { col: 'status', name: 'Status', type: 'SingleSelect' },
      { col: 'systemcol1', name: 'Priority', type: 'SingleSelect', listValues: ['A', 'B'] },
      {
        col: 'systemcol2',
        name: 'Region',
        type: 'SingleSelect',
        listValues: Array.from({ length: 9 }, (_, i) => `R${i}`),
      },
      { col: 'systemcol3', name: 'Due', type: 'Date' },
      { col: 'systemcol4', name: 'Owner', type: 'SingleReference', refModule: 'Users' },
      { col: 'tags', name: 'Tags', type: 'tags' },
    ],
    uiConfig: {
      statusList: [
        { key: 'open', label: 'Open', color: '#111111', chipColor: '#222222' },
        { key: 'done', label: 'Done', color: '#333333' },
      ],
      filters: [filter],
      ...extra,
    },
  } as unknown as EntityConfig
}

const one = (f: FilterDef, extra?: Partial<UiConfig>) => deriveFilters(cfg(f, extra))[0]

describe('deriveFilters — v2 kind derivation', () => {
  it('derives status / date / entity / checkbox-group / multi-select from column metadata', () => {
    expect(one({ col: 'status' }).kind).toBe('status')
    expect(one({ col: 'systemcol3' }).kind).toBe('date')
    expect(one({ col: 'systemcol4' }).kind).toBe('entity')
    expect(one({ col: 'tags' }).kind).toBe('entity')
    expect(one({ col: 'systemcol1' }).kind).toBe('checkbox-group') // 2 listValues ≤ 8
    expect(one({ col: 'systemcol2' }).kind).toBe('multi-select') // 9 listValues > 8
    expect(one({ col: 'title' }).kind).toBe('multi-select')
  })

  it('an explicit kind always wins over derivation', () => {
    expect(one({ col: 'systemcol1', kind: 'tags' }).kind).toBe('tags')
  })

  it('multiple defaults true except for date and single-select', () => {
    expect(one({ col: 'systemcol1' }).multiple).toBe(true)
    expect(one({ col: 'systemcol3' }).multiple).toBe(false)
    expect(one({ col: 'systemcol1', kind: 'single-select' }).multiple).toBe(false)
    expect(one({ col: 'systemcol3', multiple: true }).multiple).toBe(true)
  })
})

describe('deriveFilters — v2 options resolution', () => {
  it('resolves statusList options carrying chipColor ?? color (D-4)', () => {
    const f = one({ col: 'status' })
    expect(f.optionsFrom).toBe('statusList')
    expect(f.optionDefs).toEqual([
      { value: 'open', label: 'Open', color: '#222222' },
      { value: 'done', label: 'Done', color: '#333333' },
    ])
    expect(f.optionDot).toBe('status')
  })

  it('resolves listValues into {value,label} pairs', () => {
    const f = one({ col: 'systemcol1' })
    expect(f.optionsFrom).toBe('listValues')
    expect(f.optionDefs).toEqual([
      { value: 'A', label: 'A' },
      { value: 'B', label: 'B' },
    ])
    expect(f.optionDot).toBe(false)
  })

  it('leaves optionDefs undefined for record-backed entity filters', () => {
    const f = one({ col: 'systemcol4' })
    expect(f.optionsFrom).toBe('records')
    expect(f.optionDefs).toBeUndefined()
  })

  it('passes inline options through, including category and count', () => {
    const f = one({
      col: 'systemcol1',
      kind: 'tags',
      categoryCol: 'systemcol2',
      showCounts: true,
      options: [
        { value: 'a', label: 'A', category: 'c1', count: 102 },
        { value: 'b', label: 'B', category: 'c2' },
      ],
    })
    expect(f.optionsFrom).toBe('inline')
    expect(f.categoryCol).toBe('systemcol2')
    expect(f.showCounts).toBe(true)
    expect(f.optionDefs).toEqual([
      { value: 'a', label: 'A', category: 'c1', count: 102 },
      { value: 'b', label: 'B', category: 'c2' },
    ])
  })

  it('synthesises boolean options from booleanOptions', () => {
    const f = one({
      col: 'systemcol1',
      boolean: true,
      booleanOptions: { trueLabel: 'Active', falseLabel: 'Inactive' },
    })
    expect(f.type).toBe('boolean') // legacy field unchanged
    expect(f.options).toEqual(['A', 'B']) // legacy field unchanged
    expect(f.kind).toBe('checkbox-group')
    expect(f.optionDefs).toEqual([
      { value: 'true', label: 'Active' },
      { value: 'false', label: 'Inactive' },
    ])
  })
})

describe('deriveFilters — v2 entity selector + chrome', () => {
  it('expandable is only honoured for kind entity, and carries expandView', () => {
    const columns = [{ col: 'title', label: 'Name', sortable: true, minWidth: 96 }]
    const f = one({
      col: 'systemcol4',
      expandable: true,
      expandView: { columns, searchable: true, rowTemplate: 'avatar-id-status' },
      createFromSearch: { enabled: true, entity: 'core/workforce', requirePrivilege: 'wf.create' },
    })
    expect(f.expandable).toBe(true)
    expect(f.expandView?.columns).toEqual(columns)
    expect(f.createFromSearch?.requirePrivilege).toBe('wf.create')

    // same flag on a non-entity field is ignored
    expect(one({ col: 'systemcol1', expandable: true }).expandable).toBe(false)
  })

  it('always resolves an icon, falling back to `filter`', () => {
    expect(one({ col: 'systemcol1' }).icon).toBe('filter')
    expect(one({ col: 'systemcol1', icon: 'flag' }).icon).toBe('flag')
  })
})
