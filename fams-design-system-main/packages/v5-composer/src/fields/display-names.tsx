import { createContext, useContext, useMemo, type ReactNode } from 'react'

/**
 * Resolves ONE stored identity id (a user id like `u_dispatcher`, or a
 * reference id like `WCR-01`) to its display name. Return `undefined` for an
 * id the app cannot resolve — the renderer then falls back to the raw value,
 * so a partial directory degrades gracefully instead of blanking a cell.
 */
export type DisplayNameResolver = (id: string) => string | undefined

const DisplayNameContext = createContext<DisplayNameResolver | undefined>(undefined)

export interface DisplayNameProviderProps {
  /**
   * The app's id → display-name lookup. Rule 8 keeps the directory itself out
   * of the DS: this is the ONE seam a consuming app injects it through, and
   * it is the same seam `ModuleView`'s toolbar Assignee dropdown already used
   * via `resolveAssigneeName`. Omit (or pass `undefined`) for the previous
   * behaviour — raw ids render verbatim.
   */
  resolve?: DisplayNameResolver
  children: ReactNode
}

/**
 * Provides the app's identity display-name lookup to every field renderer
 * below it — `ReadAssignee` and `ReadPersonView` in particular.
 *
 * Why a context rather than a prop: an identity id can surface on ANY record
 * surface (a list column cell, a kanban card footer, a detail row, a popup),
 * each of which reaches the field registry through a different template. The
 * `resolveAssigneeName` prop was threaded to exactly one of them — the
 * toolbar dropdown — so every other surface still printed `u_dispatcher`
 * (finding A7b-1). Field renderers are resolved from a registry by name, so
 * there is no prop chain to thread through them at all; a provider around the
 * module surface is the only seam that reaches all of them at once, and it
 * keeps the renderers pure presenters (they read a lookup, they never own
 * one).
 */
export function DisplayNameProvider({ resolve, children }: DisplayNameProviderProps) {
  return <DisplayNameContext.Provider value={resolve}>{children}</DisplayNameContext.Provider>
}

DisplayNameProvider.displayName = 'DisplayNameProvider'

/**
 * The resolver a field renderer should use: always returns a renderable
 * string, falling back to the id itself when there is no provider or the
 * provider cannot resolve it. Stable across renders for a given provider.
 */
export function useDisplayName(): (id: string) => string {
  const resolve = useContext(DisplayNameContext)
  return useMemo(() => (id: string) => (resolve?.(id) ?? '') || id, [resolve])
}
