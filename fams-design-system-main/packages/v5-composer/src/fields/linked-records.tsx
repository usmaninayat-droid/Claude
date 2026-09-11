import { createContext, useContext, type ReactNode } from 'react'

/**
 * The generic "open a linked record" seam. [tier-1, Rule 8]
 *
 * A reference field stores an id (`crm/company` → `CO-04`). NOTHING in this
 * package can turn that pair into an open record — which module owns that
 * entity code, which detail flavor it opens in, and what the record's data is
 * are all app/host concerns. So, exactly like `DisplayNameProvider` for
 * id→name, this is the ONE context a host injects an activation handler
 * through, and every reference renderer below it becomes activatable at once.
 *
 * Why a context and not a prop: field renderers are resolved from a registry
 * BY NAME, so there is no prop chain that reaches them (the same reasoning
 * `display-names.tsx` records). A reference cell can surface on any surface —
 * a list column, a kanban card, a detail row, a row inside an already-open
 * side sheet — and all of them must be able to open the target.
 *
 * Without a provider the renderers stay exactly as inert as they are today:
 * `useLinkedRecordOpener()` returns `undefined` and `LinkView` falls through
 * to the field type's plain read renderer, byte-for-byte.
 */
export interface LinkedRecordTarget {
  /** The referenced entity code — a field's `entityType` (`crm/company`). */
  entityType: string
  /** The stored reference id. */
  recordId: string
  /** The field the reference was activated from (context for the host). */
  col?: string
}

export type LinkedRecordOpener = (target: LinkedRecordTarget) => void

const LinkedRecordContext = createContext<LinkedRecordOpener | undefined>(undefined)

export interface LinkedRecordProviderProps {
  /**
   * Opens the referenced record. Omit (or pass `undefined`) to keep every
   * reference cell below inert — the pre-provider behaviour.
   */
  onOpenLinkedRecord?: LinkedRecordOpener
  children: ReactNode
}

export function LinkedRecordProvider({ onOpenLinkedRecord, children }: LinkedRecordProviderProps) {
  return <LinkedRecordContext.Provider value={onOpenLinkedRecord}>{children}</LinkedRecordContext.Provider>
}

LinkedRecordProvider.displayName = 'LinkedRecordProvider'

/**
 * The opener a reference renderer should use — `undefined` when no host has
 * injected one, which is the renderer's cue to render a plain, inert value.
 */
export function useLinkedRecordOpener(): LinkedRecordOpener | undefined {
  return useContext(LinkedRecordContext)
}
