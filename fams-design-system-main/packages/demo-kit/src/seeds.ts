import type { EntityRecord, StoreSnapshot } from './types'
import type { RelationalStore } from './store'

/** A demo login identity. Generic — no v5 user-type / licensing vocabulary. */
export interface PersonaDef {
  id: string
  name: string
  roles: string[]
  /** Optional explicit user-type; defaults to the first role. */
  userType?: string
}

/** role → privileges the role grants. */
export type RoleMap = Record<string, string[]>

/**
 * A complete demo dataset: per-type entity arrays (the "per-module JSON
 * arrays"), the login personas ("users.json"), and the role → privilege map.
 */
export interface SeedSet {
  entities: StoreSnapshot
  users: PersonaDef[]
  roles?: RoleMap
}

/** One unresolved cross-reference found while validating a seed set. */
export interface DanglingRef {
  type: string
  recordId: string
  field: string
  missingId: string
  target: string
}

export class DanglingSeedRefError extends Error {
  constructor(public readonly refs: DanglingRef[]) {
    const lines = refs.map(
      (r) => `  ${r.type}#${r.recordId}.${r.field} → ${r.target}#${r.missingId} (missing)`,
    )
    super(`[demo-kit] ${refs.length} dangling seed reference(s):\n${lines.join('\n')}`)
    this.name = 'DanglingSeedRefError'
  }
}

/**
 * Validate that every forward reference in the seed set resolves to a seeded id
 * of the correct target type. Throws {@link DanglingSeedRefError} LOUDLY listing
 * every offender — a broken demo dataset must fail fast, not silently degrade.
 */
export function validateSeedRefs(store: RelationalStore, seedSet: SeedSet): void {
  const idsByType = new Map<string, Set<string>>()
  for (const [type, records] of Object.entries(seedSet.entities)) {
    idsByType.set(type, new Set(records.map((r) => r.id)))
  }

  const dangling: DanglingRef[] = []
  for (const [type, records] of Object.entries(seedSet.entities)) {
    const schema = store.getSchema(type)
    if (!schema) throw new Error(`[demo-kit] seed set references unregistered type "${type}"`)
    for (const rec of records) {
      for (const ref of schema.references) {
        const raw = rec[ref.name]
        const ids =
          ref.cardinality === 'one'
            ? raw
              ? [String(raw)]
              : []
            : Array.isArray(raw)
              ? (raw as unknown[]).map(String)
              : []
        for (const id of ids) {
          if (!idsByType.get(ref.target)?.has(id)) {
            dangling.push({ type, recordId: rec.id, field: ref.name, missingId: id, target: ref.target })
          }
        }
      }
    }
  }
  if (dangling.length > 0) throw new DanglingSeedRefError(dangling)
}

/**
 * Load a seed set into the store. Validates cross-references first (fails loud
 * on dangling ids), remembers the set so {@link RelationalStore.reset} can
 * re-seed, then either HYDRATES from an existing persisted session or applies
 * the seeds fresh. Deterministic: seed records keep their declared ids.
 */
export function loadSeeds(store: RelationalStore, seedSet: SeedSet): void {
  validateSeedRefs(store, seedSet)
  store.rememberSeeds(seedSet.entities)
  const persisted = store.persistedSnapshot()
  if (persisted) store.load(persisted)
  else store.applySeeds(seedSet.entities)
}

/** Convenience: pull all records of a type out of a seed set (typed helper). */
export function seedRecords(seedSet: SeedSet, type: string): EntityRecord[] {
  return seedSet.entities[type] ?? []
}
