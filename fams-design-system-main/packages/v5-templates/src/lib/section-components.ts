import type { ReactNode } from 'react'
import type { EntityConfig, EntityRecord } from '@fams/v5-composer'

/**
 * SECTION-level named-component registry. [tier-2 internal]
 *
 * A THIRD registry alongside `@fams/v5-composer`'s two field-level ones
 * (`registerFieldType` by `FieldType`, `registerComponent` by
 * `FieldDescriptor.component.name`) — this one resolves a blueprint PROFILE
 * SECTION's own `component.name` (`ProfileSection.component`,
 * `@fams/v5-composer`'s `types.ts`) to a full section-body renderer that
 * replaces the section's default `FieldGrid` of `fields` entirely (e.g.
 * `LocationMapSection` renders a map, not a label/value grid).
 *
 * Lives HERE (in `@fams/v5-templates`, not `@fams/v5-composer`) because a
 * section renderer needs to render `@fams/ui-kit` JSX and, for
 * `LocationMapSection` specifically, reach the `./map` build entry — both
 * are downstream of `@fams/v5-composer` in the dependency direction
 * (`v5-templates → ui-kit`/`v5-composer`; the reverse never happens,
 * root CLAUDE.md rule 7 / decision #13). `TaskDetail` checks this registry
 * FIRST for a section that carries a `component` name, falling back to a
 * `ViewEmptyState` placeholder for an unregistered/mistyped name — the same
 * "degrade, never crash" contract `tabRenderers`/the field component
 * registry already use.
 */
/** One already-resolved label/value pair (`DetailModel`'s `section.fields`,
 *  `@fams/v5-composer`'s `resolveCell` shape) — TaskDetail resolves every
 *  section's fields through the FieldRegistry regardless of whether the
 *  section ALSO carries a `component` override, so a section renderer that
 *  wants the standard label/value presentation (just with different layout,
 *  e.g. `FieldColumnsSection`'s single-column KPI rows) can reuse them
 *  instead of re-deriving values off `record` itself. */
export interface SectionComponentField {
  id: string
  label: ReactNode
  value: ReactNode
}

export interface SectionComponentProps {
  config: EntityConfig
  record: EntityRecord
  /** The section's authored `component.props` — opaque field-key indirection the renderer itself defines; never a hardcoded business shape. */
  props?: Record<string, unknown>
  /** This section's fields, already resolved to label/value pairs (see `SectionComponentField`) — undefined for a caller that hasn't threaded them through. */
  fields?: SectionComponentField[]
  /**
   * Host write-through for a section that edits the record in place
   * (`TaskDetailProps.onRecordSave`, the section-level sibling of the
   * field-level `wrapFieldValue` seam). Undefined when the host wired no
   * save path — a renderer with edit affordances must degrade to read-only
   * then. The DS has no opinion on WHO may edit (that stays business logic,
   * rule 8/10) — a blueprint opts a section's UI into edit mode via its own
   * `component.props`, and the host decides whether to supply this at all.
   */
  onSave?: (patch: Record<string, unknown>) => void
}

export type SectionComponentRenderer = (props: SectionComponentProps) => ReactNode

const registry = new Map<string, SectionComponentRenderer>()

/** Register (or override) a named section renderer, resolved via `ProfileSection.component.name`. */
export function registerSectionComponent(name: string, render: SectionComponentRenderer): void {
  registry.set(name, render)
}

/** Looks up a named section renderer; `undefined` if `name` isn't registered. */
export function getSectionComponentRenderer(name: string): SectionComponentRenderer | undefined {
  return registry.get(name)
}

/** Every section-component name currently registered (tests / introspection). */
export function listRegisteredSectionComponents(): string[] {
  return [...registry.keys()]
}
