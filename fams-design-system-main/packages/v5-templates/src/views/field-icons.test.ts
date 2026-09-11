import { readFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import { describe, expect, it } from 'vitest'
import { filterFieldIconNames } from './field-icons'

/**
 * Sync guard (fix-d6 finding 5): `groupByOptions[].icon` and `FilterDef.icon`
 * are constrained to an `enum` in `EntityModuleConfig.schema.json` so a
 * typo'd glyph name fails LOUDLY at authoring time (the schema is the
 * editor-facing contract), while the runtime (`lookupFieldIcon`/
 * `resolveFilterFieldIcon`) stays forgiving. The two lists are hand-kept in
 * sync; this test is the guard that catches the moment they drift — add a
 * glyph to `FIELD_ICONS` here without also adding it to the schema enum (or
 * vice versa) and this fails.
 */
describe('field-icons ↔ JSON-schema enum sync', () => {
  it('every schema `icon` enum entry is a name field-icons.tsx actually resolves', () => {
    const require = createRequire(import.meta.url)
    const schemaPath = require.resolve('@fams/v5-composer/schemas/EntityModuleConfig.schema.json')
    const schema = JSON.parse(readFileSync(schemaPath, 'utf8'))
    const filterIconEnum: string[] = schema.$defs.FilterDef.properties.icon.enum
    const groupByIconEnum: string[] = schema.$defs.UiConfig.properties.groupByOptions.items.properties.icon.enum

    expect(new Set(filterIconEnum)).toEqual(new Set(filterFieldIconNames))
    expect(new Set(groupByIconEnum)).toEqual(new Set(filterFieldIconNames))
  })
})
