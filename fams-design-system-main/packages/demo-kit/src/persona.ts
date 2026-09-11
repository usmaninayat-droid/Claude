import type { PersonaDef, RoleMap } from './seeds'

export type Persona = PersonaDef

/**
 * A tiny observable auth shim. App layers (e.g. v5-kit's UserSource, wired in
 * the demo app) subscribe and re-render when the active persona switches. No
 * React dependency here — {@link subscribe} is a plain callback registry; the
 * optional `usePersona` hook (in `@fams/demo-kit/react`) adapts it to React.
 */
export interface PersonaAuth {
  login(personaId: string): Persona
  logout(): void
  current(): Persona | null
  /** Union of privileges granted by the current persona's roles. */
  privileges(): string[]
  /**
   * Current persona's user-type. Defaults to `'user'` (safe-by-default gating)
   * unless the persona explicitly sets a privileged `userType`.
   *
   * ⚠️ **Bypass convention (v5-kit):** consumers bridging to v5-kit-style
   * privilege gating get normal gating (`'user'`) by default. A persona with
   * `userType: 'admin'` or similar non-'user' value bypasses all gating —
   * this is only for intentional admin / test personas. Always name them clearly.
   */
  userType(): string
  /** Register a listener; returns an unsubscribe fn. */
  subscribe(cb: () => void): () => void
}

export function createPersonaAuth(users: PersonaDef[], roleMap: RoleMap = {}): PersonaAuth {
  const byId = new Map(users.map((u) => [u.id, u]))
  let currentId: string | null = null
  const listeners = new Set<() => void>()

  const notify = (): void => {
    for (const cb of listeners) cb()
  }

  const currentPersona = (): Persona | null => (currentId ? (byId.get(currentId) ?? null) : null)

  return {
    login(personaId: string): Persona {
      const persona = byId.get(personaId)
      if (!persona) throw new Error(`[demo-kit] unknown persona "${personaId}"`)
      currentId = personaId
      notify()
      return persona
    },
    logout(): void {
      if (currentId === null) return
      currentId = null
      notify()
    },
    current(): Persona | null {
      return currentPersona()
    },
    privileges(): string[] {
      const persona = currentPersona()
      if (!persona) return []
      const set = new Set<string>()
      for (const role of persona.roles) for (const p of roleMap[role] ?? []) set.add(p)
      return [...set]
    },
    userType(): string {
      const persona = currentPersona()
      // Logged-out is NOT a bypass: v5-kit-style gating treats anything
      // !== 'user' as a full privilege bypass, so a logged-out state must
      // resolve to the safe 'user' type, never '' (safe-by-default gating).
      if (!persona) return 'user'
      return persona.userType ?? 'user'
    },
    subscribe(cb: () => void): () => void {
      listeners.add(cb)
      return () => listeners.delete(cb)
    },
  }
}
