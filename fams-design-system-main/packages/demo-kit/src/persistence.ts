import type { StoreSnapshot } from './types'

/**
 * A persisted snapshot tagged with the schema fingerprint that was in effect
 * when it was saved (see `RelationalStore.schemaFingerprint`). The fingerprint
 * travels WITH the data so the store can tell a snapshot from a matching
 * schema apart from a stale one saved before a schema-adding/changing merge —
 * without it, a stale snapshot missing a newly-added entity type would
 * silently hydrate with that type backfilled as an empty array forever.
 */
export interface PersistedState {
  fingerprint: string
  snapshot: StoreSnapshot
}

/**
 * Persistence for the demo store, per browser session. This is demo-kit's OWN
 * interface — deliberately NOT `@fams/v5-composer`'s persistence type (the tier
 * boundary forbids importing it; duplication is the accepted price).
 *
 * The store injects an implementation and snapshots itself on every mutation.
 */
export interface Persistence {
  load(): PersistedState | null
  save(state: PersistedState): void
  clear(): void
}

/** In-memory default — survives nothing beyond the process; the store's fallback. */
export class MemoryPersistence implements Persistence {
  private state: PersistedState | null = null

  load(): PersistedState | null {
    return this.state
  }

  save(state: PersistedState): void {
    // Deep clone so later in-place store mutations can't retroactively mutate
    // the "persisted" copy — matches how a real serializing backend behaves.
    this.state = structuredClone(state)
  }

  clear(): void {
    this.state = null
  }
}

export interface SessionStorageOptions {
  /** Namespace segment so multiple demos on one origin don't collide. */
  namespace?: string
}

/**
 * `sessionStorage`-backed persistence: data survives reloads within a browser
 * session and is dropped when the tab closes. Guards `typeof window`, so it is
 * safe to construct under SSR / Node (every method no-ops there).
 */
export class SessionStoragePersistence implements Persistence {
  private readonly key: string

  constructor(opts: SessionStorageOptions = {}) {
    this.key = `${opts.namespace ?? 'fams-demo-kit'}:store:v1`
  }

  private get storage(): Storage | null {
    if (typeof window === 'undefined') return null
    try {
      return window.sessionStorage
    } catch {
      return null
    }
  }

  load(): PersistedState | null {
    const s = this.storage
    if (!s) return null
    try {
      const raw = s.getItem(this.key)
      if (!raw) return null
      return normalizePersisted(JSON.parse(raw))
    } catch {
      return null
    }
  }

  save(state: PersistedState): void {
    const s = this.storage
    if (!s) return
    try {
      s.setItem(this.key, JSON.stringify(state))
    } catch {
      /* quota / serialization — non-fatal for a demo front-end */
    }
  }

  clear(): void {
    const s = this.storage
    if (!s) return
    try {
      s.removeItem(this.key)
    } catch {
      /* non-fatal */
    }
  }
}

/**
 * A snapshot written before schema-fingerprinting existed is a BARE
 * `StoreSnapshot` (`{ [entityType]: EntityRecord[] }`) — the whole parsed
 * value IS the per-type record map, with no `fingerprint` envelope around it.
 * Recognize that legacy shape and hand it back tagged with an empty
 * fingerprint, which can never equal a real (non-empty) computed fingerprint
 * — so `RelationalStore.persistedSnapshot` always treats it as stale and
 * discards it, instead of hydrating a shell that may be missing entity types
 * a later merge added.
 */
function normalizePersisted(parsed: unknown): PersistedState | null {
  if (!parsed || typeof parsed !== 'object') return null
  const obj = parsed as Record<string, unknown>
  if (typeof obj.fingerprint === 'string' && obj.snapshot && typeof obj.snapshot === 'object') {
    return { fingerprint: obj.fingerprint, snapshot: obj.snapshot as StoreSnapshot }
  }
  return { fingerprint: '', snapshot: obj as StoreSnapshot }
}
