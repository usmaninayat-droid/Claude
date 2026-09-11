import { beforeEach, describe, expect, it } from 'vitest'
import { compileFieldSet, clearCompileCache, getCompileCacheStats } from './compiler'
import type { FieldSetInput } from './compiler'
import type { AuthoredSystemColumn } from '../blueprint-schema'
import dealsModule from '../../blueprints/crm/deals.module.json'

function col(partial: Partial<AuthoredSystemColumn> & { col: string; type: AuthoredSystemColumn['type'] }): AuthoredSystemColumn {
  return { id: `fld_${partial.col}`, name: partial.col, ...partial }
}

function set(fields: AuthoredSystemColumn[], code = 'test', version?: string | number): FieldSetInput {
  return { code, version, fields }
}

beforeEach(() => clearCompileCache())

describe('compileFieldSet — schema correctness per type', () => {
  it('required text rejects empty/missing, accepts a value', () => {
    const { schema } = compileFieldSet(set([col({ col: 'title', type: 'SmallText', required: true })]))
    expect(schema.safeParse({ title: '' }).success).toBe(false)
    expect(schema.safeParse({}).success).toBe(false)
    expect(schema.safeParse({ title: 'Acme' }).success).toBe(true)
  })

  it('optional text accepts empty (treated as unset)', () => {
    const { schema } = compileFieldSet(set([col({ col: 'note', type: 'SmallText' })]))
    expect(schema.safeParse({ note: '' }).success).toBe(true)
  })

  it('email enforces format; optional email accepts empty', () => {
    const req = compileFieldSet(set([col({ col: 'email', type: 'Email', required: true })])).schema
    expect(req.safeParse({ email: 'nope' }).success).toBe(false)
    expect(req.safeParse({ email: 'a@b.com' }).success).toBe(true)
    const opt = compileFieldSet(set([col({ col: 'email', type: 'Email' })], 'opt')).schema
    expect(opt.safeParse({ email: '' }).success).toBe(true)
    expect(opt.safeParse({ email: 'bad' }).success).toBe(false)
  })

  it('numeric honours min/max and coerces string input', () => {
    const { schema } = compileFieldSet(set([col({ col: 'age', type: 'Number', required: true, min: 1, max: 10 })]))
    expect(schema.safeParse({ age: 0 }).success).toBe(false)
    expect(schema.safeParse({ age: 11 }).success).toBe(false)
    const ok = schema.safeParse({ age: '5' })
    expect(ok.success).toBe(true)
    if (ok.success) expect((ok.data as { age: number }).age).toBe(5)
  })

  it('single-select restricts to listValues (enum)', () => {
    const { schema } = compileFieldSet(
      set([col({ col: 'stage', type: 'SingleSelect', required: true, listValues: ['a', 'b'] })]),
    )
    expect(schema.safeParse({ stage: 'c' }).success).toBe(false)
    expect(schema.safeParse({ stage: 'b' }).success).toBe(true)
  })

  it('multi-select compiles to an array; required needs ≥1', () => {
    const { schema } = compileFieldSet(
      set([col({ col: 'tagsx', type: 'MultiSelect', required: true, listValues: ['x', 'y'] })]),
    )
    expect(schema.safeParse({ tagsx: [] }).success).toBe(false)
    expect(schema.safeParse({ tagsx: ['x'] }).success).toBe(true)
    expect(schema.safeParse({ tagsx: ['z'] }).success).toBe(false)
  })

  it('reference compiles to an id string / id array', () => {
    const single = compileFieldSet(set([col({ col: 'company', type: 'SingleReference', required: true })], 's')).schema
    expect(single.safeParse({ company: '' }).success).toBe(false)
    expect(single.safeParse({ company: 'cmp_1' }).success).toBe(true)
    const multi = compileFieldSet(set([col({ col: 'people', type: 'MultiReference', required: true })], 'm')).schema
    expect(multi.safeParse({ people: ['u1', 'u2'] }).success).toBe(true)
  })
})

describe('compileFieldSet — descriptors', () => {
  it('derives multiple / options / refModule / entityType / required', () => {
    const { byCol } = compileFieldSet(
      set([
        col({ col: 'stage', type: 'SingleSelect', listValues: ['a', 'b'] }),
        col({ col: 'people', type: 'MultiReference', refModule: 'Users' }),
        col({ col: 'company', type: 'SingleReference', refModule: 'Entity', entityType: 'crm/companies', required: true }),
      ]),
    )
    expect(byCol.stage.options).toEqual(['a', 'b'])
    expect(byCol.stage.multiple).toBe(false)
    expect(byCol.people.multiple).toBe(true)
    expect(byCol.people.refModule).toBe('Users')
    expect(byCol.company.entityType).toBe('crm/companies')
    expect(byCol.company.required).toBe(true)
  })

  it('carries an authored `creation.hidden` flag through onto the descriptor (consumed by v5-templates grouping.ts)', () => {
    const { byCol } = compileFieldSet(
      set([
        col({ col: 'driverName', type: 'SmallText', creation: { hidden: true } }),
        col({ col: 'title', type: 'SmallText' }),
      ]),
    )
    expect(byCol.driverName.creation).toEqual({ hidden: true })
    // A field with no authored `creation` key compiles to `undefined`, not a
    // stray empty object — callers can keep using `d.creation?.hidden`.
    expect(byCol.title.creation).toBeUndefined()
  })
})

/**
 * fix7 (run-2026-09-05, P1-d): the `status` column's descriptor carries the
 * module's own `uiConfig.statusList` as a key→label map, narrowly by column
 * IDENTITY (`col === 'status'`) — not by type or label heuristic — so a read
 * renderer can resolve the authored label without ever needing the pipeline
 * config itself. See `renderers.enum-chip.test.tsx` for the renderer side.
 */
describe('compileFieldSet — status column statusLabels (fix7, P1-d)', () => {
  it('attaches a key→label map to the `status` descriptor from uiConfig.statusList', () => {
    const { byCol } = compileFieldSet(dealsModule as unknown as FieldSetInput)
    expect(byCol.status.statusLabels).toEqual({
      lead: 'Lead',
      qualified: 'Qualified',
      proposal: 'Proposal',
      won: 'Won',
      lost: 'Lost',
    })
  })

  it('never attaches statusLabels to a different column, even one also driven by the same module', () => {
    const { byCol } = compileFieldSet(dealsModule as unknown as FieldSetInput)
    expect(byCol.title?.statusLabels).toBeUndefined()
  })

  it('a bare {fields} input (no module uiConfig) leaves statusLabels undefined for a status col', () => {
    const { byCol } = compileFieldSet(set([col({ col: 'status', type: 'SingleSelect', listValues: ['scheduled'] })]))
    expect(byCol.status.statusLabels).toBeUndefined()
  })
})

describe('compileFieldSet — layout plan', () => {
  it('derives grouped rows from a blueprint profile placement', () => {
    const { layout } = compileFieldSet(dealsModule as unknown as FieldSetInput)
    const details = layout.groups.find((g) => g.id === 'details')
    expect(details).toBeDefined()
    const detailCols = details!.rows.flatMap((r) => r.cols)
    // `uniqueidentifier` IS now a real systemcolumn (type `Auto`, the Kanban
    // ticket-id-chip root-cause fix — it used to have no field descriptor at
    // all, so `has()` silently dropped its `profile.details` placement here
    // too), so it survives alongside the other placed cols.
    expect(detailCols).toContain('systemcol3')
    expect(detailCols).toContain('uniqueidentifier')
    // `title` lives in profile.title (not details) → the trailing "other" group,
    // so no field is silently dropped.
    const allCols = layout.groups.flatMap((g) => g.rows.flatMap((r) => r.cols))
    expect(allCols).toContain('title')
    expect(layout.groups.some((g) => g.id === 'other')).toBe(true)
  })

  it('flat option yields a single default group, one field per row', () => {
    const { layout } = compileFieldSet(dealsModule as unknown as FieldSetInput, { flat: true })
    expect(layout.groups).toHaveLength(1)
    expect(layout.groups[0].id).toBe('default')
    expect(layout.groups[0].rows.every((r) => r.cols.length === 1)).toBe(true)
  })
})

describe('compileFieldSet — cache semantics (perf rule 4)', () => {
  const fields = [col({ col: 'title', type: 'SmallText', required: true })]

  it('same version → same object identity (cache hit)', () => {
    const a = compileFieldSet(set(fields, 'crm/x', 1))
    const b = compileFieldSet(set(fields, 'crm/x', 1))
    expect(b).toBe(a)
    expect(getCompileCacheStats().hits).toBe(1)
  })

  it('version bump → new object (cache miss)', () => {
    const a = compileFieldSet(set(fields, 'crm/x', 1))
    const b = compileFieldSet(set(fields, 'crm/x', 2))
    expect(b).not.toBe(a)
  })

  it('no version → content-hash fallback (same content reuses, changed content recompiles)', () => {
    const a = compileFieldSet(set(fields, 'crm/y'))
    const b = compileFieldSet(set(fields, 'crm/y'))
    expect(b).toBe(a)
    const c = compileFieldSet(set([...fields, col({ col: 'note', type: 'SmallText' })], 'crm/y'))
    expect(c).not.toBe(a)
  })

  it('clearCompileCache resets identity + stats', () => {
    compileFieldSet(set(fields, 'crm/z', 1))
    clearCompileCache()
    expect(getCompileCacheStats()).toEqual({ size: 0, hits: 0, misses: 0 })
    const after = compileFieldSet(set(fields, 'crm/z', 1))
    const again = compileFieldSet(set(fields, 'crm/z', 1))
    expect(again).toBe(after)
  })

  // Cache is a bounded LRU (CACHE_CAP = 64 in compiler.ts) — these pin the
  // eviction policy itself, independent of the exact cap value.
  describe('bounded LRU eviction', () => {
    const CAP = 64 // must match CACHE_CAP in compiler.ts

    it('exceeding the cap evicts the least-recently-used entry', () => {
      // Fill the cache to capacity with distinct versions of the same module
      // code, in order — insertion order is LRU order 0 (oldest) → CAP-1 (newest).
      for (let i = 0; i < CAP; i++) compileFieldSet(set(fields, 'crm/lru', i))
      expect(getCompileCacheStats().size).toBe(CAP)

      // One more distinct entry pushes past the cap, evicting the LRU one
      // (version 0, since nothing has been re-touched yet).
      compileFieldSet(set(fields, 'crm/lru', CAP))
      expect(getCompileCacheStats().size).toBe(CAP)

      // The evicted entry (version 0) recompiles — a fresh reference, but
      // still produces a correct schema.
      const missesBefore = getCompileCacheStats().misses
      const evictedRecompiled = compileFieldSet(set(fields, 'crm/lru', 0))
      expect(getCompileCacheStats().misses).toBe(missesBefore + 1)
      expect(evictedRecompiled.schema.safeParse({ title: 'Acme' }).success).toBe(true)
      expect(evictedRecompiled.schema.safeParse({ title: '' }).success).toBe(false)
    })

    it('recently-hit entries survive eviction over untouched ones', () => {
      for (let i = 0; i < CAP; i++) compileFieldSet(set(fields, 'crm/lru2', i))

      // Touch version 0 (currently the LRU entry) so it becomes the
      // most-recently-used — version 1 is now the least-recently-used.
      const touched = compileFieldSet(set(fields, 'crm/lru2', 0))
      const hitsBefore = getCompileCacheStats().hits
      expect(hitsBefore).toBeGreaterThan(0)

      // Insert one more distinct entry — must evict version 1, not version 0.
      compileFieldSet(set(fields, 'crm/lru2', CAP))
      expect(getCompileCacheStats().size).toBe(CAP)

      // Version 0 (recently touched) is still cached and returns the same reference.
      const stillCached = compileFieldSet(set(fields, 'crm/lru2', 0))
      expect(stillCached).toBe(touched)
      expect(getCompileCacheStats().hits).toBe(hitsBefore + 1)

      // Version 1 (untouched, least-recently-used) was evicted and recompiles.
      const recompiled = compileFieldSet(set(fields, 'crm/lru2', 1))
      expect(recompiled).not.toBe(touched)
      expect(recompiled.schema.safeParse({ title: 'Acme' }).success).toBe(true)
    })
  })

  /**
   * fix8 (2026-09-06, review F5): `statusLabels` is derived from
   * `input.uiConfig.statusList` — a sibling of `columns` in `normalize()`'s
   * output, not a column itself — but the no-version fallback hash used to
   * key on `columns` alone. A blueprint that edited `statusList` without
   * bumping `version` would serve a stale cached `FieldDescriptor.statusLabels`
   * (and therefore a stale `ReadEnum` label) off the hash-fallback cache path.
   * `set()` builds the OTHER `FieldSetInput` shape (a bare `{fields}` list,
   * which never carries `uiConfig` and so never produces `statusLabels` at
   * all — see the "bare {fields} input" case above) so this needs a
   * module-shaped input directly, mirroring `dealsModule`'s real shape.
   */
  describe('cache key covers statusLabels, not just columns (fix8, review F5)', () => {
    const moduleWithStatusList = (statusList: { key: string; label: string }[]): FieldSetInput =>
      ({
        code: 'test/status-cache',
        systemcolumns: [col({ col: 'status', type: 'SingleSelect', listValues: ['scheduled'] })],
        uiConfig: { statusList },
      }) as unknown as FieldSetInput

    it('changing ONLY statusList, with no version bump, recompiles instead of serving a stale cached label', () => {
      const a = compileFieldSet(moduleWithStatusList([{ key: 'scheduled', label: 'Scheduled' }]))
      expect(a.byCol.status.statusLabels).toEqual({ scheduled: 'Scheduled' })

      const b = compileFieldSet(moduleWithStatusList([{ key: 'scheduled', label: 'Awaiting Dispatch' }]))
      expect(b).not.toBe(a)
      expect(b.byCol.status.statusLabels).toEqual({ scheduled: 'Awaiting Dispatch' })
    })

    it('identical statusList content still hits the cache (the fallback hash is content-based, not a cache-buster)', () => {
      const a = compileFieldSet(moduleWithStatusList([{ key: 'scheduled', label: 'Scheduled' }]))
      const b = compileFieldSet(moduleWithStatusList([{ key: 'scheduled', label: 'Scheduled' }]))
      expect(b).toBe(a)
      expect(getCompileCacheStats().hits).toBeGreaterThan(0)
    })
  })
})

/**
 * Column-level `unit` (`SystemColumn.unit`) — the blueprint declaring
 * `"unit": "km"` on the column itself, so every surface reading that field
 * prints the unit without each placement restating it. Fix D-4/F1: the four
 * Preventive Maintenance odometer/engine-hours columns declared their units
 * and the descriptor discarded them, rendering four adjacent columns of bare
 * undifferentiable integers.
 */
describe('compileFieldSet — column-level unit', () => {
  it("a column's own `unit` reaches the descriptor", () => {
    const { byCol } = compileFieldSet(set([col({ col: 'odo', type: 'Numeric', unit: 'km' })]))
    expect(byCol.odo.unit).toBe('km')
  })

  it('a column with no unit still resolves to undefined (the pre-fix behaviour every other field keeps)', () => {
    const { byCol } = compileFieldSet(set([col({ col: 'plain', type: 'Numeric' })], 'plain-set'))
    expect(byCol.plain.unit).toBeUndefined()
  })

  it('component props and the `units` option both still outrank the column attribute', () => {
    const fromComponent = compileFieldSet(
      set([col({ col: 'odo', type: 'Numeric', unit: 'km', component: { name: 'X', props: { unit: 'mi' } } })], 'c1'),
    )
    expect(fromComponent.byCol.odo.unit).toBe('mi')

    const fromSuffix = compileFieldSet(
      set([col({ col: 'odo', type: 'Numeric', unit: 'km', component: { name: 'X', props: { suffix: 'm' } } })], 'c2'),
    )
    expect(fromSuffix.byCol.odo.unit).toBe('m')

    const fromOption = compileFieldSet(set([col({ col: 'odo', type: 'Numeric', unit: 'km' })], 'c3'), {
      units: { odo: 'AED' },
    })
    expect(fromOption.byCol.odo.unit).toBe('AED')
  })
})
