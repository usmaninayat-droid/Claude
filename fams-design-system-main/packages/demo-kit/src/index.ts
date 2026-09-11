/**
 * @fams/demo-kit — generic, product-agnostic demo machinery (CORE tier).
 *
 * Provides: a relational in-browser store with referential integrity, session
 * persistence, a seed loader, a persona auth shim, and an MSW mock-API
 * generator. It contains NO v5 vocabulary and imports NO `@fams/v5-*` package
 * (boundary lint enforces this). The v5 wiring — adapting these contracts to
 * v5-kit's ModulesSource / BlueprintSource / composer stores — lives in the
 * demo app (phase 3.3), never here.
 *
 * The React hook lives in a separate entry, `@fams/demo-kit/react`, so consumers
 * that never use it pay no React import.
 */

export { RelationalStore, computeSchemaFingerprint } from './store'
export type {
  FieldType,
  FieldDef,
  Cardinality,
  RefDef,
  EntitySchema,
  EntityRecord,
  StoreSnapshot,
  WhereClause,
  Query,
  QueryResult,
  Referrer,
} from './types'

export { MemoryPersistence, SessionStoragePersistence } from './persistence'
export type { Persistence, PersistedState, SessionStorageOptions } from './persistence'

export { loadSeeds, validateSeedRefs, seedRecords, DanglingSeedRefError } from './seeds'
export type { SeedSet, PersonaDef, RoleMap, DanglingRef } from './seeds'

export { createPersonaAuth } from './persona'
export type { PersonaAuth, Persona } from './persona'

export { buildHandlers, setupDemoWorker } from './handlers'
export type {
  HttpMethod,
  BuildHandlersOptions,
  EndpointContract,
  EndpointOp,
  ListOp,
  GetOp,
  CreateOp,
  UpdateOp,
  RemoveOp,
  CustomOp,
} from './handlers'
