import type { ReactNode } from 'react'
import type { EntityConfig, EntityRecord, UserContext } from '@fams/v5-composer'

/**
 * TAB-level named-component registry. [tier-2 internal]
 *
 * A FOURTH registry alongside `@fams/v5-composer`'s two field-level ones
 * (`registerFieldType` by `FieldType`, `registerComponent` by
 * `FieldDescriptor.component.name`) and `@fams/v5-templates`' own
 * SECTION-level one (`registerSectionComponent`, `lib/section-components.ts`)
 * — this one resolves a blueprint right-panel TAB's `component.name`
 * (`ProfileTab.component`, `@fams/v5-composer`'s `types.ts` — already typed
 * with an optional `component.props` bag) to a full tab-body renderer, the
 * same "named override resolved before any caller-supplied fallback" shape
 * `views/field-cell.tsx`'s `resolveReadRenderer` established for cells.
 *
 * Lives HERE, not in `@fams/v5-composer`, for the exact reason
 * `section-components.ts` gives for its own registry: a tab body needs to
 * render `@fams/ui-kit` JSX (and, for widgets that embed a map, reach the
 * `./map` build entry) — both downstream of `@fams/v5-composer` in the
 * dependency direction (root `CLAUDE.md` rule 7 / decision #13).
 *
 * `EntityProfile` checks this registry FIRST for a tab that carries a
 * `component` name, falling back to the caller-injected `tabRenderers` map
 * only when no name is registered here — this is what lets a generic,
 * metadata-driven tab component (e.g. `OverviewWidgets`/`RecordTable`) work
 * for ANY module the moment a blueprint names it, with zero app-layer
 * `tabRenderers` wiring. A bespoke per-module tab body still works exactly
 * as before via `tabRenderers`.
 */
export interface TabComponentProps {
  /** The module config (blueprint mode only). */
  config?: EntityConfig
  /** The record being profiled. */
  record?: EntityRecord
  /** The current user — tab bodies that need privilege-aware content read it directly. */
  userContext?: UserContext
  /** The tab's authored `component.props` — opaque field-key indirection the renderer itself defines; never a hardcoded business shape. */
  props?: Record<string, unknown>
  /**
   * Generic write-back channel for an editable tab body — the same
   * `EntityProfile.onRecordChange` prop, forwarded unchanged (see its doc
   * comment). A renderer that has no editable state simply ignores it.
   */
  onRecordChange?: (values: Record<string, unknown>) => void
}

export type TabComponentRenderer = (props: TabComponentProps) => ReactNode

const registry = new Map<string, TabComponentRenderer>()

/** Register (or override) a named tab-body renderer, resolved via `ProfileTab.component.name`. */
export function registerTabComponent(name: string, render: TabComponentRenderer): void {
  registry.set(name, render)
}

/** Looks up a named tab-body renderer; `undefined` if `name` isn't registered (caller falls back to `tabRenderers`). */
export function getTabComponentRenderer(name: string): TabComponentRenderer | undefined {
  return registry.get(name)
}

/** Every tab-component name currently registered (tests / introspection). */
export function listRegisteredTabComponents(): string[] {
  return [...registry.keys()]
}

/** Test-only reset — undoes every `registerTabComponent` call. */
export function resetTabComponentRegistry(): void {
  registry.clear()
}
