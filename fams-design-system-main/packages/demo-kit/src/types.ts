/**
 * @fams/demo-kit — generic, product-agnostic demo machinery contracts.
 *
 * CORE TIER (decision #13): these shapes carry NO v5 vocabulary. There is no
 * `entityconfig`, no `systemcolumns`, no `pipeline_rules`, no tenant-as-license.
 * They describe a plain relational store, seeds, personas, and a mock-API
 * contract. The demo app (phase 3.3) writes a thin adapter that bridges these
 * generic contracts onto v5-kit's ModulesSource / BlueprintSource / composer
 * stores — that adaptation is the accepted duplication price of the tier
 * boundary and lives OUTSIDE this package.
 */

/** Scalar field kinds a demo entity can hold. Deliberately minimal + generic. */
export type FieldType = 'string' | 'number' | 'boolean' | 'date' | 'json'

export interface FieldDef {
  name: string
  type: FieldType
  required?: boolean
  /** Applied on create when the input omits the field. */
  default?: unknown
}

/** How many targets the FORWARD reference points at. */
export type Cardinality = 'one' | 'many'

/**
 * A typed relationship from this entity to another. Declares the target type,
 * the forward cardinality, and the INVERSE accessor name materialized on the
 * target record (always an id array — the set of referrers).
 */
export interface RefDef {
  /** Field on this entity holding the forward reference id(s). */
  name: string
  /** Target entity type this reference points at. */
  target: string
  /** 'one' → stores `string | null`; 'many' → stores `string[]`. */
  cardinality: Cardinality
  /** Inverse field name materialized on the target record (a `string[]`). */
  inverse: string
}

export interface EntitySchema {
  type: string
  fields: FieldDef[]
  references: RefDef[]
}

/** A stored record. `id` is always present; other keys are fields / refs. */
export interface EntityRecord {
  id: string
  [field: string]: unknown
}

/** Serializable dump of the whole store — forward refs only (inverses derived). */
export type StoreSnapshot = Record<string, EntityRecord[]>

/** A single equality / set / substring match on one field. */
export type WhereClause =
  | string
  | number
  | boolean
  | null
  | { in: unknown[] }
  | { contains: unknown }

export interface Query {
  /** AND across fields; a `{ in }` clause is OR within that field. */
  where?: Record<string, WhereClause>
  sort?: { field: string; dir?: 'asc' | 'desc' }
  offset?: number
  limit?: number
}

export interface QueryResult {
  records: EntityRecord[]
  /** Total matching `where` BEFORE offset/limit — for list-endpoint paging. */
  total: number
}

/** A record that references `id`, found by {@link RelationalStore.getReferrers}. */
export interface Referrer {
  type: string
  id: string
  /** The forward-reference field on the referring record. */
  field: string
}
