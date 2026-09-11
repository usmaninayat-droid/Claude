import type { EntityConfig, EntityRecord, SystemColumn } from './types'

/**
 * In-memory EAV data store — faithful to the backend's generic entity engine,
 * ported from Shaheer's `src/sim/engine/entity-store.ts` (his `EntityStore`).
 * One store serves every entity type by `code`. MultiReference stored as CSV
 * (split on read via `joinRefCsv`, the single join convention shared with
 * `SchemaForm`'s submit mapping), `tags` is a real array, deletes are soft, UID
 * sequences make human-readable ids. Filtering: OR within a filter, AND across
 * filters.
 *
 * Persistence is INJECTED and OPTIONAL — when absent the store is purely
 * in-memory (never touches `window.localStorage`; the original defaulted to a
 * browser `LocalStoragePersistence`, which is removed here). Phase 3's demo-kit
 * provides persistent adapters behind the same `Persistence` interface.
 */

export interface Persistence {
  load(): Record<string, EntityRecord[]> | null
  save(data: Record<string, EntityRecord[]>): void
}

export type FilterValue = string[] | boolean | { from?: string; to?: string }
export type AppliedFilters = Record<string, FilterValue>

export interface ListQuery {
  filters?: AppliedFilters
  search?: string
  sort?: { col: string; dir: 'asc' | 'desc' }
  offset?: number
  limit?: number
}

/**
 * The one place that knows how a MultiReference column's array of ids
 * becomes the CSV string the record stores. `writeRefs` below is the
 * store-internal caller; `SchemaForm`'s submit mapping (`src/fields/SchemaForm.tsx`)
 * imports this directly so a form's `MultiReference` output matches what
 * `store.create` expects — one join convention, not two copies of it.
 * Empty array → `''` (matches `writeRefs`'s empty-selection behavior).
 *
 * **Id contract:** entity ids must never contain a comma — the join has no
 * escaping, so a comma inside an id would silently corrupt the CSV round-trip
 * (a single id splitting into two on read). Enforced here rather than left as
 * a silent corruption: throws loudly instead of writing a bad record.
 */
export function joinRefCsv(ids: string[]): string {
  const bad = ids.find((id) => id.includes(','))
  if (bad !== undefined) {
    throw new Error(
      `[v5-composer] joinRefCsv: id "${bad}" contains a comma, which the unescaped CSV join cannot represent — entity ids must never contain a comma.`,
    )
  }
  return ids.join(',')
}

/** Merge v5's column families into a single descriptor list for lookups. */
function allDescriptors(config: EntityConfig): SystemColumn[] {
  return [
    ...config.systemcolumns,
    ...(config.streamcolumns ?? []),
    ...(config.datacolumns ?? []),
    ...(config.usercolumns ?? []),
    ...(config.validation_columns ?? []),
  ]
}

export class InMemoryDataStore {
  private data: Record<string, EntityRecord[]> = {}
  private seq: Record<string, number> = {}
  private configs: Record<string, EntityConfig> = {}
  private descriptors: Record<string, SystemColumn[]> = {}
  private rev = 0
  /** Instance-scoped id counter — was a module-level `let counter` shared
   * across every store; now each `InMemoryDataStore` owns its own sequence,
   * so independently created stores (and tests) never see each other's ids. */
  private idCounter = 1000

  constructor(private persistence?: Persistence) {
    const loaded = persistence?.load()
    if (loaded) this.data = loaded
  }

  /** Same id shape as before (`e_<time36>_<counter36>`), scoped to this instance. */
  private genId(): string {
    return `e_${Date.now().toString(36)}_${(this.idCounter++).toString(36)}`
  }

  registerConfig(config: EntityConfig): void {
    this.configs[config.code] = config
    this.descriptors[config.code] = allDescriptors(config)
    if (!this.data[config.code]) this.data[config.code] = []
  }

  getConfig(code: string): EntityConfig | undefined {
    return this.configs[code]
  }

  seed(code: string, records: EntityRecord[]): void {
    this.data[code] = records.map((r) => ({ ...r, id: r.id ?? this.genId() }))
    const maxSeq = records.reduce((m, r) => {
      const n = Number(String(r.uniqueidentifier ?? '').split('-').pop())
      return Number.isFinite(n) ? Math.max(m, n) : m
    }, 1000)
    this.seq[code] = maxSeq + 1
    this.flush()
  }

  private flush(): void {
    this.rev += 1
    this.persistence?.save(this.data)
  }

  /** Monotonic mutation counter — lets derived view-models cache per write. */
  get version(): number {
    return this.rev
  }

  private colDef(code: string, col: string): SystemColumn | undefined {
    return this.descriptors[code]?.find((c) => c.col === col)
  }

  list(code: string, query: ListQuery = {}): { records: EntityRecord[]; total: number } {
    let rows = (this.data[code] ?? []).filter((r) => !r.deleted)
    rows = rows.filter((r) => this.matches(code, r, query))
    const total = rows.length
    if (query.sort) rows = this.sortRows(rows, query.sort)
    const offset = query.offset ?? 0
    const limit = query.limit ?? rows.length
    return { records: rows.slice(offset, offset + limit), total }
  }

  read(code: string, id: string): EntityRecord | undefined {
    return (this.data[code] ?? []).find((r) => r.id === id && !r.deleted)
  }

  create(code: string, input: Partial<EntityRecord>): EntityRecord {
    const config = this.configs[code]
    const now = new Date().toISOString()
    const record: EntityRecord = {
      ...this.applyDefaults(code, input),
      id: input.id ?? this.genId(),
      createdAt: now,
      updatedAt: now,
    }
    if (!record.uniqueidentifier && config?.uidPrefix) {
      const n = this.seq[code] ?? (this.seq[code] = 1001)
      record.uniqueidentifier = `${config.uidPrefix}-${n}`
      this.seq[code] = n + 1
    }
    ;(this.data[code] ??= []).push(record)
    this.flush()
    return record
  }

  update(code: string, id: string, patch: Partial<EntityRecord>): EntityRecord | undefined {
    const rec = this.read(code, id)
    if (!rec) return undefined
    Object.assign(rec, patch, { updatedAt: new Date().toISOString() })
    this.flush()
    return rec
  }

  /** Soft delete — never removes the row (matches production). */
  remove(code: string, id: string): boolean {
    const rec = this.read(code, id)
    if (!rec) return false
    rec.deleted = true
    rec.updatedAt = new Date().toISOString()
    this.flush()
    return true
  }

  readRefs(code: string, record: EntityRecord, col: string): string[] {
    const def = this.colDef(code, col)
    const raw = record[col]
    if (def?.type === 'MultiReference') {
      if (Array.isArray(raw)) return raw as string[]
      return typeof raw === 'string' && raw ? raw.split(',') : []
    }
    return raw ? [String(raw)] : []
  }

  writeRefs(code: string, col: string, ids: string[]): string | string[] {
    const def = this.colDef(code, col)
    return def?.type === 'MultiReference' ? joinRefCsv(ids) : (ids[0] ?? '')
  }

  private matches(code: string, r: EntityRecord, query: ListQuery): boolean {
    if (query.search) {
      const cols = this.configs[code]?.uiConfig.search?.columns ?? ['title', 'uniqueidentifier']
      const hay = cols
        .map((c) => String(r[c] ?? ''))
        .join(' ')
        .toLowerCase()
      if (!hay.includes(query.search.toLowerCase())) return false
    }
    for (const [col, val] of Object.entries(query.filters ?? {})) {
      const actual = r[col]
      if (typeof val === 'boolean') {
        const hasValue =
          actual != null && actual !== '' && !(Array.isArray(actual) && actual.length === 0)
        if (hasValue !== val) return false
      } else if (Array.isArray(val)) {
        const set = new Set(val)
        const vals = Array.isArray(actual) ? actual : [actual]
        if (!vals.some((v) => set.has(v as string))) return false
      } else if (val && typeof val === 'object') {
        const t = Date.parse(String(actual))
        if (val.from && Number.isFinite(t) && t < Date.parse(val.from)) return false
        if (val.to && Number.isFinite(t) && t > Date.parse(val.to)) return false
      }
    }
    return true
  }

  private sortRows(
    rows: EntityRecord[],
    sort: { col: string; dir: 'asc' | 'desc' },
  ): EntityRecord[] {
    const mul = sort.dir === 'desc' ? -1 : 1
    return [...rows].sort((a, b) => {
      const av = a[sort.col] as string | number
      const bv = b[sort.col] as string | number
      if (av == null) return 1
      if (bv == null) return -1
      return av < bv ? -1 * mul : av > bv ? 1 * mul : 0
    })
  }

  private applyDefaults(code: string, input: Partial<EntityRecord>): Partial<EntityRecord> {
    const out: Partial<EntityRecord> = { ...input }
    for (const c of this.descriptors[code] ?? []) {
      if (out[c.col] === undefined && c.default !== undefined) out[c.col] = c.default
    }
    return out
  }

  snapshot(): Record<string, EntityRecord[]> {
    return this.data
  }
}
