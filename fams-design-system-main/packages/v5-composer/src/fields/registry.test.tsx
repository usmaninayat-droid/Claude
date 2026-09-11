import { afterEach, describe, expect, it } from 'vitest'
import { render } from '@testing-library/react'
import type { FieldType } from '../types'
import type { FieldDescriptor } from './types'
import {
  defaultFieldRegistry,
  registerFieldType,
  resetFieldRegistry,
  getFieldTypeEntry,
  getReadRenderer,
  getEditWidget,
  getCellEditor,
  listRegisteredFieldTypes,
} from './registry'

/**
 * The canonical blueprint field-type enum, spelled out so this test iterates it
 * independently of the registry it's checking (the brief's "iterate the type
 * enum" requirement). `DEFAULTS` is typed `Record<FieldType, …>`, so the compiler
 * ALSO guarantees completeness — this is the runtime belt-and-braces.
 */
const ALL_FIELD_TYPES: FieldType[] = [
  'Auto',
  'SmallText',
  'BigText',
  'LongText',
  'Email',
  'Phone',
  'Numeric',
  'Number',
  'Currency',
  'Boolean',
  'SingleSelect',
  'MultiSelect',
  'SingleReference',
  'MultiReference',
  'Date',
  'DateTime',
  'tags',
  'Color',
  'Assignee',
]

function descriptorFor(type: FieldType): FieldDescriptor {
  const multiple = type === 'MultiSelect' || type === 'MultiReference' || type === 'tags'
  return {
    id: `fld_${type}`,
    col: `c_${type}`,
    label: type,
    type,
    required: false,
    multiple,
    options: type === 'SingleSelect' || type === 'MultiSelect' ? ['a', 'b'] : undefined,
  }
}

function sampleValue(type: FieldType): unknown {
  if (type === 'MultiSelect' || type === 'MultiReference' || type === 'tags') return ['a']
  if (type === 'Boolean') return true
  if (type === 'Numeric' || type === 'Number' || type === 'Currency') return 42
  return 'x'
}

afterEach(() => resetFieldRegistry())

describe('FieldRegistry — completeness', () => {
  it('the built-in registry keys exactly match the blueprint field-type enum', () => {
    expect(new Set(Object.keys(defaultFieldRegistry))).toEqual(new Set(ALL_FIELD_TYPES))
    expect(new Set(listRegisteredFieldTypes())).toEqual(new Set(ALL_FIELD_TYPES))
  })

  it('every field type resolves a read renderer + edit widget + cell editor', () => {
    for (const type of ALL_FIELD_TYPES) {
      const entry = getFieldTypeEntry(type)
      expect(typeof entry.read, type).toBe('function')
      expect(typeof entry.edit, type).toBe('function')
      expect(typeof getCellEditor(type), type).toBe('function')
    }
  })

  it('every read renderer and edit widget mounts without throwing', () => {
    for (const type of ALL_FIELD_TYPES) {
      const d = descriptorFor(type)
      // MOUNTED as components, not invoked as plain functions: a renderer is
      // a React component and may legitimately use hooks (e.g. `ReadAssignee`
      // reading the app's display-name directory via `useDisplayName`), which
      // a bare call would break with "Invalid hook call".
      const Read = getReadRenderer(type)
      const Edit = getEditWidget(type)
      const { unmount } = render(
        <div>
          <Read descriptor={d} value={sampleValue(type)} />
          <Edit descriptor={d} value={sampleValue(type)} onChange={() => {}} />
        </div>,
      )
      unmount()
    }
  })
})

describe('FieldRegistry — extension + override', () => {
  it('overrides an existing type (partial merge) and resets', () => {
    const custom = () => <span data-testid="custom-read">custom</span>
    registerFieldType('SmallText', { read: custom })
    expect(getReadRenderer('SmallText')).toBe(custom)
    // edit widget preserved by the partial merge
    expect(getEditWidget('SmallText')).toBe(defaultFieldRegistry.SmallText.edit)
    resetFieldRegistry()
    expect(getReadRenderer('SmallText')).toBe(defaultFieldRegistry.SmallText.read)
  })

  it('registers a brand-new type (e.g. `zone`) with read + edit', () => {
    const read = () => <span>zone-read</span>
    const edit = () => <span>zone-edit</span>
    registerFieldType('zone', { read, edit })
    const entry = getFieldTypeEntry('zone')
    expect(entry.read).toBe(read)
    expect(entry.edit).toBe(edit)
    // cell editor falls back to wrapping the edit widget when none is provided
    expect(typeof getCellEditor('zone')).toBe('function')
  })

  it('throws when a new type is registered without a read renderer or edit widget', () => {
    expect(() => registerFieldType('halfbaked', { read: () => <span /> })).toThrow(/read renderer and an edit widget/)
  })

  it('unknown types resolve to the fallback (never undefined)', () => {
    expect(typeof getReadRenderer('totally-unknown')).toBe('function')
    expect(typeof getEditWidget('totally-unknown')).toBe('function')
  })
})
