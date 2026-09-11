import { describe, expect, it } from 'vitest'
import { compileFieldSet, deriveDetail, getReadRenderer } from '@fams/v5-composer'
import type { EntityConfig, EntityRecord } from '@fams/v5-composer'
// The delta engine that Task 4.D-prep §1 extended. Importing it here ties the
// tool that PRODUCES a detail placement to the surface derivation that RENDERS
// it, proving the whole chain end-to-end (op → placement → detail cell). The
// tool is a JSDoc-typed `.mjs` outside the app's tsconfig rootDir, so type the
// one function this test uses.
// @ts-expect-error — JS tool module, no emitted .d.ts
import { applyOp as applyOpJs } from '../../tools/lib/ops.mjs'
import { getResolvedConfig } from './demo/content'

const applyOp = applyOpJs as (bp: Record<string, unknown>, op: Record<string, unknown>) => void

/**
 * Render-path verification (Task 4.D-prep §3).
 *
 * GOAL: prove a field placed into `uiConfig.profile.details` actually becomes
 * VISIBLE on the app's TaskDetail surface — closing the "addField is
 * schema-only, fields never enter placements" gap Task 4.D targets.
 *
 * WHY NO DOM MOUNT: the linked `@fams/*` packages resolve to real paths under
 * `fams-design-system/node_modules` and drag their own transitive React copy
 * (Radix); Vitest's `resolve.alias` does not rewrite those deep imports,
 * so mounting any DS component throws "Invalid hook call" from the duplicate
 * React (documented in vitest.config.ts — the same reason every other app test
 * avoids mounting linked libs). The React mount itself is proven by `vite build`
 * and the DS's own `@fams/v5-templates` TaskDetail.test.tsx.
 *
 * WHAT THIS PROVES INSTEAD: the EXACT render-path derivation TaskDetail runs.
 * TaskDetail builds its detail column as
 *   detail = deriveDetail(config, record)
 *   compiled = compileFieldSet(config)
 *   fields = [...detail.details, ...].map(cell => ({
 *     label: cell.label,
 *     value: renderReadCell(compiled, record, cell.col, cell.label),  // → getReadRenderer(type)
 *   }))
 * so asserting deriveDetail surfaces the placed field (label + value) and that
 * compileFieldSet + getReadRenderer resolve its read renderer proves the field
 * reaches the FieldGrid with its label and value — i.e. it renders.
 */

/** A synthetic field placed on details to test the op's effect in isolation. */
const ADD_TEST_PLACED = {
  opId: 'test_add_placed',
  op: 'addField',
  after: 'fld_tk_due',
  field: {
    id: 'fld_test_placed',
    col: 'systemcol10',
    name: 'Test Placed Field',
    type: 'SingleSelect',
    listValues: ['Option A', 'Option B', 'Option C'],
  },
  placements: { details: { after: 'fld_tk_due' } },
} as const

const ticketing = (): EntityConfig =>
  structuredClone(getResolvedConfig('iwmp', 'ticketing')) as unknown as EntityConfig

describe('render path — a details-placed field surfaces in the TaskDetail derivation', () => {
  it('deriveDetail yields a detail cell with the field label + value', () => {
    const config = ticketing()
    applyOp(config as unknown as Record<string, unknown>, structuredClone(ADD_TEST_PLACED))

    // Sanity: the op placed the field on the detail surface.
    expect(config.uiConfig.profile!.details.some((d) => d.id === 'fld_test_placed')).toBe(true)

    const record: EntityRecord = {
      id: 'TKT-1',
      uniqueidentifier: 'TKT-001',
      title: 'Overflowing bin at Zone 4',
      status: 'triaged',
      systemcol10: 'Option B',
    }

    // The exact derivation TaskDetail renders from.
    const detail = deriveDetail(config, record)
    const cell = detail.details.find((c) => c.col === 'systemcol10')
    expect(cell).toBeDefined()
    expect(cell!.label).toBe('Test Placed Field') // the FieldGrid label
    expect(cell!.value).toBe('Option B') // the value renderReadCell receives

    // The leaf read renderer TaskDetail resolves for this field type exists —
    // SingleSelect → ReadEnum (renders the value as a Badge). renderReadCell
    // uses exactly this registry lookup.
    const compiled = compileFieldSet(config)
    expect(compiled.byCol.systemcol10).toBeDefined()
    expect(compiled.byCol.systemcol10.type).toBe('SingleSelect')
    expect(typeof getReadRenderer('SingleSelect')).toBe('function')
  })

  it('a field DEFINED but not placed does NOT appear on the detail surface', () => {
    // Proves it is the placement — not merely the field definition — that makes
    // the field visible (the exact gap Task 4.D closes). Uses a distinct
    // synthetic col/id (systemcol9) rather than ADD_SEVERITY's systemcol7 —
    // the phase-4 drill's own real fields now occupy systemcol7/8 in the base
    // `ticketing()` config, so reusing systemcol7 here would collide with an
    // already-placed field instead of exercising the unplaced case.
    const config = ticketing()
    applyOp(config as unknown as Record<string, unknown>, {
      opId: 'test_define_only',
      op: 'addField',
      after: 'fld_tk_due',
      field: { id: 'fld_test_unplaced', col: 'systemcol9', name: 'Test Unplaced Field', type: 'SmallText' },
    })

    const record: EntityRecord = { id: 'TKT-2', title: 'No severity shown', status: 'new', systemcol9: 'High' }
    const detail = deriveDetail(config, record)

    // Defined in the schema…
    expect(compileFieldSet(config).byCol.systemcol9).toBeDefined()
    // …but NOT on the detail surface.
    expect(detail.details.some((c) => c.col === 'systemcol9')).toBe(false)
  })
})
