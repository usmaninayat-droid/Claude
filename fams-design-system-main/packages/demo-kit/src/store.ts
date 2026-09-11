import type {
  EntityRecord,
  EntitySchema,
  Query,
  QueryResult,
  Referrer,
  RefDef,
  StoreSnapshot,
  WhereClause,
} from './types'
import { MemoryPersistence, type Persistence } from './persistence'

/**
 * Deterministic fingerprint of a set of schemas' SHAPE — each entity type's
 * name plus its field names and reference names (target + cardinality),
 * order-independent (every level is sorted before hashing, so registration
 * order never changes the result). Used to tell a persisted snapshot saved
 * under the CURRENT schema shape apart from a stale one saved before a
 * schema-adding/changing merge landed.
 */
export function computeSchemaFingerprint(schemas: Iterable<EntitySchema>): string {
  const parts = [...schemas]
    .map((s) => {
      const fields = [...s.fields.map((f) => f.name)].sort().join(',')
      const refs = [...s.references.map((r) => `${r.name}>${r.target}:${r.cardinality}`)].sort().join(',')
      return `${s.type}|${fields}|${refs}`
    })
    .sort()
  return fnv1a(parts.join(';'))
}

/** Small, dependency-free, deterministic 32-bit hash (FNV-1a), hex-encoded. */
function fnv1a(input: string): string {
  let hash = 0x811c9dc5
  for (let i = 0; i < input.length; i++) {
    hash ^= input.charCodeAt(i)
    hash = Math.imul(hash, 0x01000193)
  }
  return (hash >>> 0).toString(16).padStart(8, '0')
}

/**
 * Relational in-browser store — a generic upgrade of the proven EAV engine.
 *
 * One store serves every entity type registered by name. FORWARD references are
 * the single source of truth; INVERSE accessors are recomputed from them after
 * every mutation, so both sides of a link always agree and never drift. Deletes
 * are HARD and clear dangling references pointing at the removed record.
 *
 * Pure TS — no React, no DOM. Persistence is injected so the engine stays
 * testable and product-agnostic.
 */
export class RelationalStore {
  private data: StoreSnapshot = {}
  private readonly schemas = new Map<string, EntitySchema>()
  private readonly persistence: Persistence
  private seedSet: { entities: StoreSnapshot } | null = null
  private counter = 1
  private rev = 0

  constructor(opts: { persistence?: Persistence } = {}) {
    this.persistence = opts.persistence ?? new MemoryPersistence()
  }

  /** Monotonic mutation counter — lets derived views cache per write. */
  get version(): number {
    return this.rev
  }

  register(schema: EntitySchema): void {
    this.schemas.set(schema.type, schema)
    if (!this.data[schema.type]) this.data[schema.type] = []
  }

  getSchema(type: string): EntitySchema | undefined {
    return this.schemas.get(type)
  }

  private requireSchema(type: string): EntitySchema {
    const schema = this.schemas.get(type)
    if (!schema) throw new Error(`[demo-kit] unknown entity type "${type}" — register its schema first`)
    return schema
  }

  /**
   * A generated id that is unique against what the store ACTUALLY holds, not
   * merely against this instance's counter.
   *
   * `counter` is per-instance and is deliberately NOT part of the persisted
   * snapshot, so a store rehydrated from `Persistence` (a page reload in the
   * demo app) restarts it at 1 while the restored rows still carry
   * `gen_<type>_1`. The next create then minted a duplicate id: React logged
   * "Encountered two children with the same key", and duplicate keys mean
   * rows/cards can be duplicated or omitted outright. Found by the
   * 2026-09-05 job-orders interaction gate, which creates a record, reloads,
   * and creates another.
   *
   * Skipping ids already in use fixes it without persisting more state (and
   * so without a snapshot-format change): the loop is bounded by the number
   * of existing rows of that type, and seeded ids never collide with it since
   * they are not of this shape.
   */
  private genId(type: string): string {
    const rows = this.data[type] ?? []
    const taken = new Set(rows.map((r) => String(r.id)))
    let id = `gen_${type}_${this.counter++}`
    while (taken.has(id)) id = `gen_${type}_${this.counter++}`
    return id
  }

  private touch(): void {
    this.rev += 1
    this.reindexInverses()
    this.persistence.save({ fingerprint: this.schemaFingerprint(), snapshot: this.snapshot() })
  }

  /** Fingerprint of the currently registered schemas — see {@link computeSchemaFingerprint}. */
  schemaFingerprint(): string {
    return computeSchemaFingerprint(this.schemas.values())
  }

  /* ── references ────────────────────────────────────────────────────────── */

  private normalizeForward(ref: RefDef, value: unknown): string | null | string[] {
    if (ref.cardinality === 'one') {
      if (value == null || value === '') return null
      return String(value)
    }
    if (Array.isArray(value)) return value.map((v) => String(v))
    if (value == null || value === '') return []
    return [String(value)]
  }

  private forwardIds(record: EntityRecord, ref: RefDef): string[] {
    const raw = record[ref.name]
    if (ref.cardinality === 'one') return raw ? [String(raw)] : []
    return Array.isArray(raw) ? (raw as unknown[]).map(String) : []
  }

  private findRecord(type: string, id: string): EntityRecord | undefined {
    return (this.data[type] ?? []).find((r) => r.id === id)
  }

  /** Which inverse field names are materialized on records of each target type. */
  private inverseFieldsByType(): Map<string, Set<string>> {
    const map = new Map<string, Set<string>>()
    for (const schema of this.schemas.values()) {
      for (const ref of schema.references) {
        if (!map.has(ref.target)) map.set(ref.target, new Set())
        map.get(ref.target)!.add(ref.inverse)
      }
    }
    return map
  }

  /** Rebuild every inverse array from the authoritative forward references. */
  private reindexInverses(): void {
    const invByType = this.inverseFieldsByType()
    for (const [type, records] of Object.entries(this.data)) {
      const fields = invByType.get(type)
      if (!fields) continue
      for (const r of records) for (const f of fields) r[f] = []
    }
    for (const schema of this.schemas.values()) {
      const records = this.data[schema.type] ?? []
      for (const ref of schema.references) {
        for (const r of records) {
          for (const targetId of this.forwardIds(r, ref)) {
            const target = this.findRecord(ref.target, targetId)
            if (!target) continue
            const arr = target[ref.inverse] as string[]
            if (!arr.includes(r.id)) arr.push(r.id)
          }
        }
      }
    }
  }

  /** Every record (any type) whose forward reference points at `id`. */
  getReferrers(id: string): Referrer[] {
    const out: Referrer[] = []
    for (const schema of this.schemas.values()) {
      for (const r of this.data[schema.type] ?? []) {
        for (const ref of schema.references) {
          if (this.forwardIds(r, ref).includes(id)) {
            out.push({ type: schema.type, id: r.id, field: ref.name })
          }
        }
      }
    }
    return out
  }

  /* ── CRUD ──────────────────────────────────────────────────────────────── */

  create(type: string, input: Partial<EntityRecord> = {}): EntityRecord {
    const schema = this.requireSchema(type)
    const record: EntityRecord = { id: (input.id as string) ?? this.genId(type) }

    for (const f of schema.fields) {
      if (input[f.name] !== undefined) record[f.name] = input[f.name]
      else if (f.default !== undefined) record[f.name] = f.default
    }
    for (const ref of schema.references) {
      record[ref.name] = this.normalizeForward(ref, input[ref.name])
    }
    // Preserve any extra keys the caller supplied (loose demo records).
    for (const [k, v] of Object.entries(input)) {
      if (k === 'id') continue
      if (record[k] === undefined) record[k] = v
    }

    ;(this.data[type] ??= []).push(record)
    this.touch()
    return this.read(type, record.id)!
  }

  read(type: string, id: string): EntityRecord | undefined {
    const rec = this.findRecord(type, id)
    return rec ? structuredClone(rec) : undefined
  }

  update(type: string, id: string, patch: Partial<EntityRecord>): EntityRecord | undefined {
    const schema = this.requireSchema(type)
    const rec = this.findRecord(type, id)
    if (!rec) return undefined
    for (const [k, v] of Object.entries(patch)) {
      if (k === 'id') continue
      const ref = schema.references.find((r) => r.name === k)
      rec[k] = ref ? this.normalizeForward(ref, v) : v
    }
    this.touch()
    return this.read(type, id)
  }

  /** Hard delete. Clears every dangling reference that pointed at `id`. */
  remove(type: string, id: string): boolean {
    const list = this.data[type] ?? []
    const idx = list.findIndex((r) => r.id === id)
    if (idx === -1) return false
    list.splice(idx, 1)
    for (const referrer of this.getReferrers(id)) {
      const schema = this.requireSchema(referrer.type)
      const ref = schema.references.find((r) => r.name === referrer.field)!
      const rec = this.findRecord(referrer.type, referrer.id)!
      if (ref.cardinality === 'one') rec[ref.name] = null
      else rec[ref.name] = (rec[ref.name] as string[]).filter((v) => v !== id)
    }
    this.touch()
    return true
  }

  /* ── query ─────────────────────────────────────────────────────────────── */

  list(type: string, query: Query = {}): QueryResult {
    this.requireSchema(type)
    let rows = [...(this.data[type] ?? [])]
    rows = rows.filter((r) => this.matches(r, query.where))
    const total = rows.length
    if (query.sort) rows = this.sortRows(rows, query.sort)
    const offset = query.offset ?? 0
    const limit = query.limit ?? rows.length
    return { records: rows.slice(offset, offset + limit).map((r) => structuredClone(r)), total }
  }

  private matches(record: EntityRecord, where?: Query['where']): boolean {
    if (!where) return true
    for (const [field, clause] of Object.entries(where)) {
      if (!this.matchClause(record[field], clause)) return false
    }
    return true
  }

  private matchClause(actual: unknown, clause: WhereClause): boolean {
    if (clause !== null && typeof clause === 'object') {
      if ('in' in clause) {
        const set = new Set(clause.in)
        const vals = Array.isArray(actual) ? actual : [actual]
        return vals.some((v) => set.has(v))
      }
      if ('contains' in clause) {
        if (Array.isArray(actual)) return actual.includes(clause.contains)
        return String(actual ?? '').toLowerCase().includes(String(clause.contains).toLowerCase())
      }
      return false
    }
    return actual === clause
  }

  private sortRows(rows: EntityRecord[], sort: NonNullable<Query['sort']>): EntityRecord[] {
    const mul = sort.dir === 'desc' ? -1 : 1
    return [...rows].sort((a, b) => {
      const av = a[sort.field] as string | number | undefined
      const bv = b[sort.field] as string | number | undefined
      if (av == null) return 1
      if (bv == null) return -1
      return av < bv ? -1 * mul : av > bv ? 1 * mul : 0
    })
  }

  /* ── snapshot / hydrate / seed / reset ───────────────────────────────────── */

  /** Deep clone of the dataset, forward references only (inverses are derived). */
  snapshot(): StoreSnapshot {
    const invByType = this.inverseFieldsByType()
    const out: StoreSnapshot = {}
    for (const [type, records] of Object.entries(this.data)) {
      const invFields = invByType.get(type)
      out[type] = records.map((r) => {
        const clone: EntityRecord = { ...r }
        if (invFields) for (const f of invFields) delete clone[f]
        return clone
      })
    }
    return structuredClone(out)
  }

  /** Replace all data with `snapshot`, then rebuild inverses. Does not persist. */
  load(snapshot: StoreSnapshot): void {
    this.data = structuredClone(snapshot)
    for (const type of this.schemas.keys()) this.data[type] ??= []
    this.reindexInverses()
  }

  /** True when the injected persistence already holds a saved, non-stale dataset. */
  hasPersistedData(): boolean {
    return this.persistedSnapshot() != null
  }

  /**
   * The persisted snapshot, if any AND if it was saved under the CURRENT
   * schema shape (used by the seed loader to decide hydrate vs re-seed). A
   * snapshot saved under a different schema fingerprint — including one with
   * no fingerprint at all, i.e. a legacy snapshot from before this mechanism
   * existed — is STALE: it is discarded (persistence cleared) rather than
   * silently hydrated with any schema keys it's missing backfilled as empty
   * arrays, which used to leave a full-shell/0-rows tab after any
   * schema-adding merge.
   */
  persistedSnapshot(): StoreSnapshot | null {
    const state = this.persistence.load()
    if (!state) return null
    if (state.fingerprint !== this.schemaFingerprint()) {
      this.persistence.clear()
      return null
    }
    return state.snapshot
  }

  /** Remember a seed set so {@link reset} can re-seed from it later. */
  rememberSeeds(entities: StoreSnapshot): void {
    this.seedSet = { entities: structuredClone(entities) }
  }

  /** Insert the given per-type seed records fresh (preserving their ids) + persist. */
  applySeeds(entities: StoreSnapshot): void {
    for (const type of this.schemas.keys()) this.data[type] = []
    for (const [type, records] of Object.entries(entities)) {
      this.requireSchema(type)
      for (const rec of records) this.data[type].push(this.buildSeedRecord(type, rec))
    }
    this.touch()
  }

  private buildSeedRecord(type: string, input: EntityRecord): EntityRecord {
    const schema = this.requireSchema(type)
    const record: EntityRecord = { id: input.id }
    for (const f of schema.fields) {
      if (input[f.name] !== undefined) record[f.name] = input[f.name]
      else if (f.default !== undefined) record[f.name] = f.default
    }
    for (const ref of schema.references) {
      record[ref.name] = this.normalizeForward(ref, input[ref.name])
    }
    for (const [k, v] of Object.entries(input)) {
      if (record[k] === undefined) record[k] = v
    }
    return record
  }

  /** Re-seed from the remembered seed set and clear persistence. */
  reset(): void {
    this.persistence.clear()
    this.data = {}
    for (const type of this.schemas.keys()) this.data[type] = []
    if (this.seedSet) this.applySeeds(this.seedSet.entities)
    else this.touch()
  }
}
