import type { EntityProfileTab } from './EntityProfile.types'

/**
 * `ProfileTabRegistry` — the cross-module tab-contribution contract.
 *
 * Other modules can add a tab to an entity's profile without that entity's
 * blueprint knowing about them: the trips module contributes a "Trips" tab to
 * the vehicle profile, the maintenance module a "Service history" tab, etc.
 * `EntityProfile` merges these AFTER the blueprint's own tabs, ordered by
 * `order` (stable: blueprint tabs first, then contributions by `order`, then
 * insertion order for ties).
 *
 * Deliberately tiny and side-effect-free at module scope — a single shared
 * instance (`profileTabRegistry`) plus `contributeTab` / `getContributions`.
 * State-agnostic: it stores tab DEFINITIONS (data), never fetches or renders.
 */
export class ProfileTabRegistry {
  private readonly byModule = new Map<string, EntityProfileTab[]>()

  /** Register a tab for a module code. Re-contributing the same tab id replaces it. */
  contributeTab(moduleCode: string, tab: EntityProfileTab): void {
    const current = this.byModule.get(moduleCode) ?? []
    const next = current.filter((t) => t.id !== tab.id)
    next.push(tab)
    this.byModule.set(moduleCode, next)
  }

  /** Contributions for a module code, ordered by `order` (undefined sorts last), stable. */
  getContributions(moduleCode: string): EntityProfileTab[] {
    const tabs = this.byModule.get(moduleCode) ?? []
    return [...tabs].sort((a, b) => (a.order ?? Number.POSITIVE_INFINITY) - (b.order ?? Number.POSITIVE_INFINITY))
  }

  /** Remove one module's contributions, or all of them (test cleanup). */
  clear(moduleCode?: string): void {
    if (moduleCode) this.byModule.delete(moduleCode)
    else this.byModule.clear()
  }
}

/** The shared registry every `EntityProfile` reads contributions from. */
export const profileTabRegistry = new ProfileTabRegistry()
