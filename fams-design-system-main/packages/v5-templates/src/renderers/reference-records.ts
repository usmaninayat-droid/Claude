import type { ComboOption } from '@fams/ui-kit'
import type { EntityConfig, EntityRecord } from '@fams/v5-composer'

/** The app-injected `resolveModuleRecords` seam (`V5ModuleSurfaceProps`) — a
 *  module `code` → its resolved config + live record set, or `undefined` if
 *  the app has nothing registered under that code. Re-declared here (rather
 *  than imported from `v5-module-renderers.tsx`) so this file has no
 *  dependency on that one — the sibling file `v5-module-renderers.tsx`
 *  imports FROM here, never the reverse. */
export type ResolveModuleRecords = (code: string) => { config: EntityConfig; records: EntityRecord[] } | undefined

/**
 * Walks `config.systemcolumns` for `SingleReference`/`MultiReference` columns
 * with `refModule === 'Entity'` and an `entityType`, resolving each target
 * module's live record set through the generic `resolveModuleRecords` app
 * seam (the same seam the Live Monitoring map's incidents overlay uses) —
 * driven entirely by the reference column's TARGET MODULE, never a
 * hardcoded field or module name (root CLAUDE.md rule 10). Returns one flat,
 * deduped (by record id) list of every record any reference column on this
 * config might point to.
 *
 * The ONE traversal `referenceOptionsFor` (creation-sheet combobox options)
 * and `referenceDisplayNameMap` (reference-cell label resolution, consumed
 * by `v5-module-renderers.tsx`'s `resolveDisplayName`) both build on —
 * before this they would have been two copies of the same "columns →
 * entityTypes → resolveModuleRecords" walk.
 */
export function resolveReferencedRecords(
  config: EntityConfig | undefined,
  resolveModuleRecords: ResolveModuleRecords | undefined,
): EntityRecord[] {
  if (!config || !resolveModuleRecords) return []
  const entityTypes = new Set<string>()
  for (const col of config.systemcolumns) {
    if ((col.type === 'SingleReference' || col.type === 'MultiReference') && col.refModule === 'Entity' && col.entityType) {
      entityTypes.add(col.entityType)
    }
  }
  if (entityTypes.size === 0) return []
  const seen = new Set<string>()
  const out: EntityRecord[] = []
  for (const entityType of entityTypes) {
    const resolved = resolveModuleRecords(entityType)
    if (!resolved) continue
    for (const record of resolved.records) {
      const key = String(record.id)
      if (seen.has(key)) continue
      seen.add(key)
      out.push(record)
    }
  }
  return out
}

/**
 * Builds `FieldOptionContext.referenceOptions` for a module's creation
 * fieldset — one option per record any reference column on `config` might
 * point to. See `resolveReferencedRecords` above for the traversal; this is
 * a thin `ComboOption` projection over it.
 */
export function referenceOptionsFor(
  config: EntityConfig | undefined,
  resolveModuleRecords: ResolveModuleRecords | undefined,
): ComboOption[] {
  return resolveReferencedRecords(config, resolveModuleRecords).map((record) => ({
    value: String(record.id),
    label: String(record.title ?? record.id),
  }))
}

/**
 * `id -> display label` for every record any reference column on `config`
 * might point to — keyed by BOTH the record's own `id` AND its
 * `uniqueidentifier` (when present and different from `id`), so a reference
 * value written as either form resolves to the same label.
 *
 * This is what makes reference display-name resolution generic across
 * MODULES, not just people: before this map existed, a reference cell's
 * `useDisplayName()` lookup (`@fams/v5-composer`'s `ReadReference`/
 * `LinkView`) only ever reached a host's people directories
 * (`resolveAssigneeName`/`resolvePersonName`), so any reference to a
 * NON-person record — e.g. a preventive-maintenance rule's automation
 * writing back a `linkedJobOrder` reference — rendered the raw stored id.
 * A SEEDED record whose `id` happens to equal its `uniqueidentifier`
 * ("JO-1013") coincidentally looked fine; a record created THIS SESSION
 * gets a machine id with no such coincidence, which is what exposed the bug.
 */
export function referenceDisplayNameMap(
  config: EntityConfig | undefined,
  resolveModuleRecords: ResolveModuleRecords | undefined,
): Map<string, string> {
  const map = new Map<string, string>()
  for (const record of resolveReferencedRecords(config, resolveModuleRecords)) {
    const label = String(record.title ?? record.id)
    map.set(String(record.id), label)
    if (record.uniqueidentifier && record.uniqueidentifier !== record.id) {
      map.set(String(record.uniqueidentifier), label)
    }
  }
  return map
}
