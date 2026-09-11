import type { ReactNode } from 'react'
import type { LucideIcon } from '@fams/ui-kit/icons'
import type { BadgeVariant } from '@fams/ui-kit'
import type { Condition, EntityConfig, EntityRecord, UserContext } from '@fams/v5-composer'

/** Context handed to every tab's `render()` / provided renderer. */
export interface EntityProfileTabContext {
  /** The module config (blueprint mode only). */
  config?: EntityConfig
  /** The record being profiled (blueprint mode only). */
  record?: EntityRecord
  /** The current user, for privilege- or role-aware tab bodies. */
  userContext?: UserContext
}

/** A tab's body renderer — for blueprint tabs (`component` name → this) or bespoke ones. */
export type ProfileTabRenderer = (ctx: EntityProfileTabContext) => ReactNode

/**
 * A right-panel tab in an entity profile. Sourced from the blueprint's
 * `uiConfig.profile.rightPanel.tabs`, added by the consumer, or contributed by
 * another module via the `ProfileTabRegistry`.
 *
 * Visibility is metadata-gated (evaluated against an injected `UserContext`):
 *  - `visibleWhen` reuses v5-composer's rule-evaluator `Condition` shape.
 *  - `requiredPrivileges` must all be present in `userContext.privileges`.
 */
export interface EntityProfileTab {
  /** Stable id (blueprint tabs use their `key`). */
  id: string
  label: ReactNode
  /** Sort weight; contributions are ordered by this after blueprint tabs. */
  order?: number
  /**
   * Blueprint component name — resolved against the tab-component registry
   * FIRST (`entity-profile/tab-components.ts`), falling back to
   * `EntityProfileProps.tabRenderers` when no name is registered.
   */
  component?: string
  /** The tab's authored `component.props` (blueprint mode only) — passed to the registered tab-component renderer, if any; ignored by `tabRenderers`. */
  componentProps?: Record<string, unknown>
  /** Direct body content (bespoke tabs). */
  content?: ReactNode
  /** Body renderer, called with the profile context. Wins over `content`. */
  render?: ProfileTabRenderer
  /** Rule-evaluator condition gating visibility (against `{ user, task: record }`). */
  visibleWhen?: Condition
  /** Privileges the user must hold for the tab to appear. */
  requiredPrivileges?: string[]
}

export interface EntityProfileTag {
  id: string
  label: string
}

export interface EntityProfileProps {
  /* ── Blueprint mode (config + record) — the metadata-driven path ────────── */
  /** Module config; when provided with `record`, the profile renders from the blueprint. */
  config?: EntityConfig
  /** The record to profile. Required alongside `config`. */
  record?: EntityRecord
  /** Status chip tone (blueprint status has no DS tone of its own). Default `secondary`. */
  statusTone?: BadgeVariant

  /* ── Bespoke escape hatches (like the composer) ─────────────────────────── */
  /** Override the derived title (required in bespoke mode). */
  title?: ReactNode
  subtitle?: ReactNode
  /** Fully custom left identity panel — replaces the derived one entirely. */
  identity?: ReactNode
  /** Explicit key/value rows for the identity panel (bespoke mode). */
  details?: { id?: string; label: ReactNode; value: ReactNode }[]

  /* ── Tabs ───────────────────────────────────────────────────────────────── */
  /** Tabs added on top of the blueprint's (or the entire set in bespoke mode). */
  tabs?: EntityProfileTab[]
  /** Blueprint-tab body renderers, keyed by the tab's `component` name. */
  tabRenderers?: Record<string, ProfileTabRenderer>
  /** Module code — pulls contributed tabs from the `ProfileTabRegistry`. */
  moduleCode?: string
  /** Explicit contributed tabs (bypasses the registry; used in tests). */
  contributedTabs?: EntityProfileTab[]
  /** Controlled active tab id. Omit for uncontrolled (first visible tab). */
  activeTabId?: string
  onTabChange?: (id: string) => void

  /* ── Identity-panel presentation ────────────────────────────────────────── */
  image?: string
  /**
   * A caller-rendered illustration for the hero art tile — e.g. a 3D vehicle
   * icon — shown when there is no `image`. Threaded straight through to
   * `EntityIdentityPanel.art` (see its doc comment for precedence). Plain
   * `ReactNode`, so this package has no opinion on what the art IS.
   */
  art?: ReactNode
  avatarFallback?: string
  /**
   * Hero-image placeholder glyph shown (centered, on a light-grey slot)
   * instead of `avatarFallback`'s solid-color initials block when there is
   * no `image` — e.g. a generic map-pin glyph for a location-flavored
   * subject (Figma "Asset Details": a light-grey square with a large grey
   * map-pin icon, not a solid-color initials block). Blueprint mode derives
   * this from `uiConfig.profile.placeholderIcon` (a named icon string,
   * resolved the same "opt in by name" way every other icon config key in
   * this package resolves) — this prop is the resolved bespoke escape hatch,
   * and wins over the blueprint's own. Omit entirely (both here and in the
   * blueprint) to keep the original `avatarFallback` initials look.
   */
  placeholderIcon?: LucideIcon
  /** Status chip rendered at the top of the identity rail, above the art tile. */
  statusOverlay?: ReactNode
  tags?: EntityProfileTag[]
  onRemoveTag?: (id: string) => void
  /**
   * Presence adds the trailing `+` add-tag affordance after the tag chips
   * (tanker-detail frames: a square `+` control closing the tag row) —
   * `EntityIdentityPanel` owns the popover's own open/input UI itself and
   * calls back with the trimmed label once submitted. The consumer still
   * owns the actual tag LIST — appending/persisting it is not this
   * package's concern (Rule 8).
   */
  onAddTag?: (label: string) => void
  /** Accessible label for the add-tag control. Defaults to `'Add tag'`. */
  addTagLabel?: string
  /** Header actions rendered above the tab strip. */
  actions?: ReactNode
  /** Title above the identity detail rows. */
  infoTitle?: ReactNode
  /**
   * Generic write-back channel for an editable tab body (e.g.
   * `RecordSectionsGrid`'s Save) — receives the CHANGED field values when the
   * user saves. Threaded straight through to the registered tab-component
   * renderer as `TabComponentProps.onRecordChange` (`tab-components.ts`), so
   * any tab naming a blueprint `editable: true` component gets a working Save
   * the moment the consumer supplies this one callback — omit and that same
   * tab's Edit affordance stays inert (matches `RecordSectionsGrid`'s own
   * "editable but no onSave" degrade). Rule 8: this component neither
   * persists nor re-fetches — the caller decides what happens with the
   * values (e.g. an in-memory per-record override, same shape the app's own
   * `checklistOverrides` already uses for `TaskDetail`).
   */
  onRecordChange?: (values: Record<string, unknown>) => void
  /**
   * Resolves a `PersonView`-named detail row's stored value (a raw reference
   * id, e.g. a `SingleReference` to `workforce/driver`) to a display name —
   * the identity-panel sibling of `V5ModuleSurfaceProps.resolveAssigneeName`.
   * Omit to show the stored value verbatim (this package's field renderers
   * never fetch on their own, Rule 8). A resolver that returns `undefined`
   * for a given id also falls back to the raw value.
   */
  resolvePersonName?: (id: string) => string | undefined

  /** The current user — the subject of every tab's visibility gate. */
  userContext?: UserContext
  className?: string
}
