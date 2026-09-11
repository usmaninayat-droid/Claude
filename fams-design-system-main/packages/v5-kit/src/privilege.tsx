import { createContext, useContext, useMemo, type ReactNode } from 'react'
import type { PrivilegeUser } from './types'

/**
 * The privilege context — the React rewrite of v5's `v-privilege` directive
 * (`v5/src/frontend/directives/privilege.js`).
 *
 * v5 semantics, preserved EXACTLY:
 *   - `required` is an array of permission strings, ANDed (`every`);
 *   - a non-`'user'` `userType` (e.g. superadmin/support) BYPASSES all checks;
 *   - the check is otherwise `required.every(p => privileges.includes(p))`.
 *
 * The ONE deliberate change from v5: v5's directive ran ONCE at mount and never
 * updated when privileges changed. This context version is REACTIVE — consumers
 * re-evaluate whenever the provided value changes.
 *
 * SECURITY NOTE (decision #23): this gating is UX ONLY — it decides what UI to
 * show, never what a user is allowed to do. Real authorization is enforced
 * server-side; a client that forges privileges only changes what its own screen
 * renders, not what the API will accept.
 */
export type PrivilegeContextValue = PrivilegeUser

const DEFAULT_CONTEXT: PrivilegeContextValue = { privileges: [], userType: 'user' }

const PrivilegeContext = createContext<PrivilegeContextValue>(DEFAULT_CONTEXT)

export interface PrivilegeProviderProps {
  /** The current user's privilege facts (typically resolved from a `UserSource`). */
  value: PrivilegeContextValue
  children: ReactNode
}

/** Provides the privilege context. `bootstrapTenant` wraps the app in this, fed by `UserSource`. */
export function PrivilegeProvider({ value, children }: PrivilegeProviderProps) {
  return <PrivilegeContext.Provider value={value}>{children}</PrivilegeContext.Provider>
}

/**
 * Returns whether the current user satisfies `required` (v5 semantics: ANDed,
 * bypassed for non-`'user'` user types). Reactive: recomputes when the context
 * value changes.
 */
export function usePrivilege(required: string[] = []): boolean {
  const { privileges, userType } = useContext(PrivilegeContext)
  // JSON.stringify (not a naive .join()) for a stable, collision-free memo
  // dependency: arrays are fresh identities each render, and a plain
  // .join(' ') (or any single-char join) collides whenever a privilege code
  // itself contains that separator (e.g. ['a b', 'c'] vs ['a', 'b c']).
  const requiredKey = JSON.stringify(required)
  const privilegesKey = JSON.stringify(privileges)
  return useMemo(() => {
    if (userType !== 'user') return true
    return required.every((p) => privileges.includes(p))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [requiredKey, privilegesKey, userType])
}

export interface PrivilegedProps {
  /** Permission strings the user must ALL hold to see `children`. */
  required: string[]
  /** Rendered when the check fails. Defaults to nothing (`null`). */
  fallback?: ReactNode
  children: ReactNode
}

/**
 * Renders `children` only when the current user satisfies `required`.
 *
 * Unlike v5's `display:none` hide (element stays in the DOM), this renders
 * `null` by default — the gated subtree is never mounted. Pass `fallback` to
 * render something in its place.
 */
export function Privileged({ required, fallback = null, children }: PrivilegedProps) {
  const allowed = usePrivilege(required)
  return <>{allowed ? children : fallback}</>
}
