import { createContext, useContext, type ReactNode } from 'react'
import type { EntityConfig, EntityRecord } from '@fams/v5-composer'

/**
 * The generic "read another module's records" seam. [tier-2, mirrors
 * `@fams/v5-composer`'s `LinkedRecordProvider` reasoning verbatim]
 *
 * A tab body resolved by NAME off the tab-component registry
 * (`tab-components.ts`) has no prop chain reaching it — `EntityProfile`
 * calls `getTabComponentRenderer(tab.component)({ config, record, props,
 * … })` with a fixed `TabComponentProps` shape, so a generic renderer like
 * `ScopedLinkedRecords` cannot be handed an extra prop just for itself
 * without special-casing one tab component over every other (exactly the
 * problem `LinkedRecordProvider`'s docblock describes for reference-cell
 * activation). The app's `V5ModuleSurfaceProps.resolveModuleRecords` already
 * exists and is already threaded as a plain PROP into `V5ModuleSurface`
 * (`v5-module-renderers.tsx`) for its own internal uses (creation-sheet
 * reference options, the Live Monitoring incidents overlay) — this context is
 * the missing link that makes the SAME resolver reachable from a
 * registry-resolved tab body, with zero new app-layer wiring.
 *
 * Value type is `V5ModuleSurfaceProps['resolveModuleRecords']` verbatim, not
 * redeclared here — same "one seam, one shape" discipline `LinkedRecordTarget`
 * follows for reference activation.
 *
 * Without a provider (or with one mounted but handed no resolver)
 * `useModuleRecords()` returns `undefined` and a consumer degrades to its own
 * empty state — never a crash, never a guess at another module's records.
 */
export type ModuleRecordsResolver = (code: string) => { config: EntityConfig; records: EntityRecord[] } | undefined

const ModuleRecordsContext = createContext<ModuleRecordsResolver | undefined>(undefined)

export interface ModuleRecordsProviderProps {
  /**
   * Resolves another module's full config + record set by its `code`. Omit
   * (or pass `undefined`) to keep every consumer below exactly as inert as
   * it was before this seam existed — `useModuleRecords()` returns
   * `undefined`.
   */
  resolveModuleRecords?: ModuleRecordsResolver
  children: ReactNode
}

export function ModuleRecordsProvider({ resolveModuleRecords, children }: ModuleRecordsProviderProps) {
  return <ModuleRecordsContext.Provider value={resolveModuleRecords}>{children}</ModuleRecordsContext.Provider>
}

ModuleRecordsProvider.displayName = 'ModuleRecordsProvider'

/**
 * The resolver a cross-module tab body should use — `undefined` when no host
 * has injected one (or none was supplied to the provider), which is the
 * consumer's cue to render its own empty state rather than guess at data.
 */
export function useModuleRecords(): ModuleRecordsResolver | undefined {
  return useContext(ModuleRecordsContext)
}
