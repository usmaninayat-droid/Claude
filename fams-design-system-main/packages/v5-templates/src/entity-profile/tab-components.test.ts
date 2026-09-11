import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  getTabComponentRenderer,
  listRegisteredTabComponents,
  registerTabComponent,
  resetTabComponentRegistry,
} from './tab-components'

describe('tab-components registry', () => {
  afterEach(() => {
    resetTabComponentRegistry()
  })

  it(
    'registers the generic tab components on module load (EntityProfile.tsx side effect)',
    async () => {
      // Importing EntityProfile.tsx (the file that owns the registration
      // calls, per its own module doc — a genuinely-imported module, never a
      // bare side-effect import this package's `"sideEffects": false` build
      // would elide) is enough for `OverviewWidgets`/`RecordTable` to already
      // be registered — no explicit app-layer wiring required. Generous
      // timeout: first-time transitive module evaluation (pulling in
      // `@fams/ui-kit`'s chart/table composites) under full-suite concurrency
      // can outrun the 5s default.
      await import('./EntityProfile')
      expect(listRegisteredTabComponents()).toEqual(
        expect.arrayContaining([
          'OverviewWidgets',
          'RecordTable',
          'ScopedLinkedRecords',
          'RecordSectionsGrid',
          'InteractiveReplay',
        ]),
      )
    },
    // Raised from 15s: the registration module now also pulls
    // `RecordSectionsGrid` (and through it `@fams/v5-composer`'s edit-widget
    // registry) and `InteractiveReplay` (and through it the chart composites
    // + the lazy map slot's type-only imports), and first-time transitive
    // evaluation of that whole chain under full-suite concurrency was
    // overrunning the previous ceiling.
    45000,
  )

  it('returns undefined for an unregistered name', () => {
    expect(getTabComponentRenderer('DoesNotExist')).toBeUndefined()
  })

  it('registers and resolves a custom renderer, later overridable', () => {
    registerTabComponent('Custom', () => 'first')
    expect(getTabComponentRenderer('Custom')?.({})).toBe('first')
    registerTabComponent('Custom', () => 'second')
    expect(getTabComponentRenderer('Custom')?.({})).toBe('second')
  })

  it('resetTabComponentRegistry clears every registration', () => {
    registerTabComponent('Temp', () => 'x')
    expect(getTabComponentRenderer('Temp')).toBeDefined()
    resetTabComponentRegistry()
    expect(getTabComponentRenderer('Temp')).toBeUndefined()
  })

  it(
    "the registered 'RecordSectionsGrid' renderer only wires onSave from onRecordChange when the blueprint's own `editable` is true",
    async () => {
      // `resetTabComponentRegistry` (this file's own `afterEach`, and the
      // first test above) clears every registration, but a plain
      // `import('./EntityProfile')` is a no-op on a module Node/Vitest has
      // already evaluated once — its top-level `registerTabComponent(...)`
      // calls do NOT re-run just because this test asks for the module
      // again. `vi.resetModules()` forces a fresh evaluation so the
      // registrations actually happen again.
      vi.resetModules()
      const { getTabComponentRenderer: freshGetTabComponentRenderer } = await import('./tab-components')
      await import('./EntityProfile')
      const renderer = freshGetTabComponentRenderer('RecordSectionsGrid')
      expect(renderer).toBeDefined()

      const onRecordChange = () => {}
      const groups = [{ title: 'Group', fields: [{ field: 'plate', label: 'Plate' }] }]

      // `editable: false` (or omitted) — onSave must NOT reach RecordSectionsGrid
      // even though a generic write-back channel (`onRecordChange`) is available,
      // matching RecordSectionsGrid's own "editable && Boolean(onSave)" contract.
      // No JSX here (this is a plain `.ts` test file) — inspect the returned
      // React element's own `props` instead of rendering it.
      const readOnlyElement = renderer?.({ props: { groups }, onRecordChange }) as { props: Record<string, unknown> }
      expect(readOnlyElement.props.editable).toBeUndefined()
      expect(readOnlyElement.props.onSave).toBeUndefined()
      expect(readOnlyElement.props.groups).toBe(groups)

      // `editable: true` — the SAME onRecordChange now IS forwarded as onSave.
      const editableElement = renderer?.({ props: { groups, editable: true }, onRecordChange }) as {
        props: Record<string, unknown>
      }
      expect(editableElement.props.editable).toBe(true)
      expect(editableElement.props.onSave).toBe(onRecordChange)
    },
    45000,
  )
})
