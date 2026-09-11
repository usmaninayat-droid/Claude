import type { Persistence } from '../engine/entity-store';
import type { EntityRecord } from '../engine/types';

/**
 * localStorage-backed Persistence for the EntityStore. Snapshots the dataset on
 * every mutation and hydrates on construction, so edits survive reloads. Keys
 * are namespaced + versioned so a schema bump invalidates stale data cleanly.
 */

const VERSION = 1;

export interface LocalStorageOptions {
  tenant: string;
  namespace?: string;
}

export class LocalStoragePersistence implements Persistence {
  private key: string;

  constructor(opts: LocalStorageOptions) {
    const ns = opts.namespace ?? 'fams-ds';
    this.key = `${ns}:${opts.tenant}:data:v${VERSION}`;
  }

  load(): Record<string, EntityRecord[]> | null {
    if (typeof window === 'undefined') return null;
    try {
      const raw = window.localStorage.getItem(this.key);
      return raw ? (JSON.parse(raw) as Record<string, EntityRecord[]>) : null;
    } catch {
      return null;
    }
  }

  save(data: Record<string, EntityRecord[]>): void {
    if (typeof window === 'undefined') return;
    try {
      window.localStorage.setItem(this.key, JSON.stringify(data));
    } catch {
      /* quota/serialization — non-fatal for a demo front-end */
    }
  }

  clear(): void {
    if (typeof window === 'undefined') return;
    window.localStorage.removeItem(this.key);
  }
}

export class MemoryPersistence implements Persistence {
  private snapshot: Record<string, EntityRecord[]> | null = null;
  load() {
    return this.snapshot;
  }
  save(data: Record<string, EntityRecord[]>) {
    this.snapshot = data;
  }
  clear() {
    this.snapshot = null;
  }
}
