/**
 * FieldRegistry — ONE `FieldType → { read, edit, cell }` mapping.
 *
 * This is the unification task 2.2 exists for: Shaheer's four parallel field-
 * type vocabularies collapse here into a single, data-driven registry. Every
 * blueprint `FieldType` resolves deterministically to a read renderer, an edit
 * widget, and an inline cell editor — all built from `@fams/ui-kit`. Because
 * the registry is DATA (components referenced, not hardcoded in switches), a
 * tenant/app can swap any renderer via `registerFieldType`, and new types
 * (e.g. a future `zone` → map picker) plug in without touching the core.
 */
import { Tag as TagIcon } from '@fams/ui-kit/icons'
import { TagChipList } from '@fams/ui-kit'
import type { FieldType } from '../types'
import type { CellEditor, EditWidget, FieldTypeEntry, FieldTypeKey, ReadRenderer } from './types'
export type { FieldChrome } from './types'
import {
  ReadText,
  ReadNumber,
  ReadDate,
  ReadBoolean,
  ReadEnum,
  ReadTags,
  ReadReference,
  ReadAssignee,
  ReadColor,
  ReadAuto,
  ReadIdChip,
  ReadIconText,
  ReadIconNumber,
  ReadFlagToneDate,
  ReadTagBadge,
  ReadActivityOverview,
  ReadVehicle3D,
  ReadPersonView,
  ReadPriorityFlag,
  ReadTimeRemaining,
  ReadAddAffordance,
  ReadStatusPill,
  ReadSignedNumber,
  ReadProgressMeter,
  ReadDispatchAction,
  ReadFallback,
  resolveFieldIcon,
} from './renderers'
import { useDisplayName } from './display-names'
import { useLinkedRecordOpener } from './linked-records'
import { widgets } from './widgets'
import { makeCellEditor } from './cell-editors'

const textCell = (w: EditWidget): CellEditor => makeCellEditor(w, false)
const nowCell = (w: EditWidget): CellEditor => makeCellEditor(w, true)

/** The built-in mapping — one entry for EVERY blueprint `FieldType`. */
const DEFAULTS: Record<FieldType, FieldTypeEntry> = {
  Auto: { read: ReadAuto, edit: widgets.AutoWidget, cell: makeCellEditor(widgets.AutoWidget, false) },
  SmallText: { read: ReadText, edit: widgets.TextWidget, cell: textCell(widgets.TextWidget) },
  BigText: { read: ReadText, edit: widgets.TextareaWidget, cell: textCell(widgets.TextareaWidget) },
  LongText: { read: ReadText, edit: widgets.TextareaWidget, cell: textCell(widgets.TextareaWidget) },
  Email: { read: ReadText, edit: widgets.EmailWidget, cell: textCell(widgets.EmailWidget) },
  Phone: { read: ReadText, edit: widgets.PhoneWidget, cell: textCell(widgets.PhoneWidget) },
  Numeric: { read: ReadNumber, edit: widgets.NumberWidget, cell: textCell(widgets.NumberWidget) },
  Number: { read: ReadNumber, edit: widgets.NumberWidget, cell: textCell(widgets.NumberWidget) },
  Currency: { read: ReadNumber, edit: widgets.NumberWidget, cell: textCell(widgets.NumberWidget) },
  Boolean: { read: ReadBoolean, edit: widgets.BooleanWidget, cell: nowCell(widgets.BooleanWidget) },
  SingleSelect: { read: ReadEnum, edit: widgets.SingleSelectWidget, cell: nowCell(widgets.SingleSelectWidget) },
  MultiSelect: { read: ReadTags, edit: widgets.MultiSelectWidget, cell: nowCell(widgets.MultiSelectWidget) },
  SingleReference: { read: ReadReference, edit: widgets.ReferenceWidget, cell: nowCell(widgets.ReferenceWidget) },
  MultiReference: { read: ReadReference, edit: widgets.ReferenceWidget, cell: nowCell(widgets.ReferenceWidget) },
  Date: { read: ReadDate, edit: widgets.DateWidget, cell: textCell(widgets.DateWidget) },
  DateTime: { read: ReadDate, edit: widgets.DateWidget, cell: textCell(widgets.DateWidget) },
  tags: { read: ReadTags, edit: widgets.TagsWidget, cell: nowCell(widgets.TagsWidget) },
  Color: { read: ReadColor, edit: widgets.ColorWidget, cell: nowCell(widgets.ColorWidget) },
  Assignee: { read: ReadAssignee, edit: widgets.AssigneeWidget, cell: nowCell(widgets.AssigneeWidget) },
}

/** Immutable snapshot of the built-in registry (for tests / re-derivation). */
export const defaultFieldRegistry: Readonly<Record<FieldType, FieldTypeEntry>> = Object.freeze({ ...DEFAULTS })

/** The live, mutable registry (keyed by field type; extensions add new keys). */
const registry = new Map<FieldTypeKey, FieldTypeEntry>(Object.entries(DEFAULTS) as [FieldTypeKey, FieldTypeEntry][])

const fallbackEntry: FieldTypeEntry = {
  read: ReadFallback,
  edit: widgets.TextWidget,
  cell: textCell(widgets.TextWidget),
}

/**
 * Register or override a field type. Pass a full entry for a new type, or a
 * PARTIAL to override just the read renderer / edit widget / cell editor of an
 * existing one (merged onto the current entry). Throws if the resolved entry
 * lacks a read renderer or edit widget.
 */
export function registerFieldType(type: FieldTypeKey, entry: Partial<FieldTypeEntry>): FieldTypeEntry {
  const current = registry.get(type)
  const merged: Partial<FieldTypeEntry> = { ...current, ...entry }
  if (!merged.read || !merged.edit) {
    throw new Error(`registerFieldType("${type}"): a new type needs both a read renderer and an edit widget`)
  }
  const resolved: FieldTypeEntry = { read: merged.read, edit: merged.edit, cell: merged.cell }
  registry.set(type, resolved)
  return resolved
}

/** Restore the built-in registry — undoes every `registerFieldType` (tests). */
export function resetFieldRegistry(): void {
  registry.clear()
  for (const [k, v] of Object.entries(DEFAULTS)) registry.set(k as FieldTypeKey, v)
}

export function getFieldTypeEntry(type: FieldTypeKey): FieldTypeEntry {
  return registry.get(type) ?? fallbackEntry
}

export function getReadRenderer(type: FieldTypeKey): ReadRenderer {
  return getFieldTypeEntry(type).read
}

export function getEditWidget(type: FieldTypeKey): EditWidget {
  return getFieldTypeEntry(type).edit
}

/** The inline single-cell editor for a field type (ListView, task 2.4). */
export function getCellEditor(type: FieldTypeKey): CellEditor {
  return getFieldTypeEntry(type).cell ?? textCell(getEditWidget(type))
}

/** Every field type currently registered (built-ins + extensions). */
export function listRegisteredFieldTypes(): FieldTypeKey[] {
  return [...registry.keys()]
}

/* ── Named component overrides ────────────────────────────────────────────── */

/**
 * A SECOND, orthogonal lookup keyed by `FieldDescriptor.component.name` (the
 * authored per-field placement override — `FieldPlacement.component` in
 * `blueprint-schema.ts`/`types.ts`) rather than by `FieldType`. This is what
 * lets one blueprint field placement opt a specific cell into a named reader
 * (e.g. `IconTextView`) that no other field of the same underlying
 * `SmallText`/`SingleSelect` type gets — the plumbing figma-spec-kanban.md
 * §5.3's lot/location meta rows need (`renderCellValue` in `@fams/v5-
 * templates` checks this FIRST, falling back to the type-keyed registry
 * above when the field carries no `component` override, or names one this
 * map doesn't recognize).
 */
/**
 * `LinkView` — the GENERIC reference renderer: a linked record's display name,
 * activatable to open that record.
 *
 * Blueprints across every module family already author
 * `component: { name: "LinkView" }` on their reference placements (a work
 * order's Vehicle, a contact's Company, a pipeline record's owner). Until now
 * nothing was registered under that name, so `getComponentRenderer('LinkView')`
 * returned `undefined` and every one of those cells silently degraded to the
 * field type's plain read renderer — inert text. This registration is what
 * makes the name mean something.
 *
 * Three deliberate properties:
 *  1. **The authored name IS the opt-in.** Only placements that already say
 *     `LinkView` become activatable; a reference field with no component
 *     override keeps `ReadReference` exactly as before.
 *  2. **It degrades to the previous rendering, byte-for-byte.** With no
 *     `LinkedRecordProvider` above it, no `entityType`, a non-Entity
 *     `refModule`, or an empty value, it renders `getReadRenderer(type)` —
 *     the very renderer that was resolved before this entry existed. That is
 *     what keeps a host that has not wired the seam (and every unit test of
 *     one) unchanged.
 *  3. **It knows nothing about any module.** `entityType` + id go to the
 *     host's opener; which module owns that code and which detail flavor it
 *     opens in are the host's to decide (Rule 8).
 */
const ReadLinkView: ReadRenderer = (props) => {
  const { descriptor, value } = props
  const open = useLinkedRecordOpener()
  const displayName = useDisplayName()
  const Fallback = getReadRenderer(descriptor.type)
  const recordId =
    Array.isArray(value) ? (value.length === 1 && value[0] != null ? String(value[0]) : '') : value == null ? '' : String(value)
  const entityType = descriptor.entityType
  if (!open || !entityType || descriptor.refModule !== 'Entity' || !recordId) {
    return <Fallback {...props} />
  }
  // Leading glyph is the generic reference `TagIcon` by default; a field
  // wanting a more specific mark (task-detail-29-42895 SPEC §1.4's Assigned
  // Vehicle row — `truck-02`, not a bare tag) opts in via `component:
  // {name: "LinkView", props: {icon: "<name>"}}`, resolved through the SAME
  // `FIELD_ICON_VOCABULARY` `IconTextView` reads from, so field placements
  // stay consistent (QA round 2, P2-4).
  const iconName = typeof descriptor.component?.props?.icon === 'string' ? descriptor.component.props.icon : undefined
  const Icon = resolveFieldIcon(iconName) ?? TagIcon
  return (
    <button
      type="button"
      data-slot="link-view"
      data-entity-type={entityType}
      data-record-id={recordId}
      onClick={(event) => {
        // A reference cell often sits inside a row/card that opens its OWN
        // record on click — activating the link must not also open the host
        // record behind the new sheet.
        event.stopPropagation()
        open({ entityType, recordId, col: descriptor.col })
      }}
      className="inline-flex max-w-full items-center gap-1 text-left text-body-sm text-muted-foreground hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
    >
      <Icon className="size-3.5 shrink-0" aria-hidden="true" />
      <span className="truncate">{displayName(recordId)}</span>
    </button>
  )
}

/**
 * `EntityRefMeta` — a card meta-row cell for a `SingleReference` placement:
 * `"{typeLabel} · {linked record's display name}"` (e.g. "Weather Station ·
 * RSN-07", "Tanker · LMV-QA04"). Entity-agnostic — `typeLabel` is always
 * authored on the PLACEMENT (`component: { name: "EntityRefMeta", props:
 * { typeLabel: "Tanker" } }`), never inferred from `entityType`, so any
 * blueprint's related-entity reference field can opt a card meta row into
 * this format without a code change. Reuses `ReadLinkView`'s exact id→display-
 * name + open-on-click resolution (same `useLinkedRecordOpener`/
 * `useDisplayName` seam) — this is a presentation variant of that renderer,
 * not a second reference-resolution mechanism. Degrades to `ReadReference`
 * (via `getReadRenderer(descriptor.type)`) under the same conditions
 * `ReadLinkView` does: no opener wired, no `entityType`, a non-Entity
 * `refModule`, or an empty value.
 */
const ReadEntityRefMeta: ReadRenderer = (props) => {
  const { descriptor, value } = props
  const open = useLinkedRecordOpener()
  const displayName = useDisplayName()
  const Fallback = getReadRenderer(descriptor.type)
  const recordId =
    Array.isArray(value) ? (value.length === 1 && value[0] != null ? String(value[0]) : '') : value == null ? '' : String(value)
  const entityType = descriptor.entityType
  if (!open || !entityType || descriptor.refModule !== 'Entity' || !recordId) {
    return <Fallback {...props} />
  }
  const typeLabel = typeof descriptor.component?.props?.typeLabel === 'string' ? descriptor.component.props.typeLabel : undefined
  const iconName = typeof descriptor.component?.props?.icon === 'string' ? descriptor.component.props.icon : undefined
  const Icon = resolveFieldIcon(iconName) ?? TagIcon
  return (
    <button
      type="button"
      data-slot="entity-ref-meta"
      data-entity-type={entityType}
      data-record-id={recordId}
      onClick={(event) => {
        event.stopPropagation()
        open({ entityType, recordId, col: descriptor.col })
      }}
      className="inline-flex max-w-full items-center gap-1 text-left text-body-sm text-muted-foreground hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
    >
      <Icon className="size-3.5 shrink-0" aria-hidden="true" />
      <span className="truncate">
        {typeLabel ? `${typeLabel} · ${displayName(recordId)}` : displayName(recordId)}
      </span>
    </button>
  )
}

/**
 * `PrefixedIconTextView` — `IconTextView`'s icon + value row, with an
 * optional static label PREFIXED before the value ("Reported by
 * {SCADA/Ali Al-Kuwari}" — the incidents hybrid/kanban card body's "Reported
 * by <Source>" row, SPEC §2). A placement opts in via `component: {
 * name: "PrefixedIconTextView", props: { prefix: "Reported by", icon:
 * "monitor-02" } }` — `icon` resolves through the SAME `FIELD_ICON_VOCABULARY`
 * `IconTextView` reads from (this row's `monitor-02`→`Radio`/broadcast glyph
 * documented in that map), so no second icon vocabulary exists. Entity-
 * agnostic: `prefix` is always author data, never inferred from the column
 * name, so any field wanting a labeled icon row (not just "Reported by") can
 * use it. Empty value renders nothing but the em dash, same empty rule every
 * other read renderer here follows.
 */
const ReadPrefixedIconText: ReadRenderer = ({ descriptor, value }) => {
  if (value == null || value === '') return <span className="text-body-xs text-muted-foreground">—</span>
  const compProps = descriptor.component?.props
  const iconName = typeof compProps?.icon === 'string' ? compProps.icon : undefined
  const prefix = typeof compProps?.prefix === 'string' ? compProps.prefix : undefined
  const Icon = resolveFieldIcon(iconName)
  const text = Array.isArray(value) ? value.map(String).join(', ') : String(value)
  return (
    <span className="inline-flex items-center gap-1 text-body-xs text-muted-foreground">
      {Icon ? <Icon className="size-3.5 shrink-0" aria-hidden="true" /> : null}
      <span className="truncate">{prefix ? `${prefix} ${text}` : text}</span>
    </span>
  )
}

/**
 * `AddressRefView` — the incidents card footer's Qatar address reference
 * (SPEC §3: "Zone N · St N · Bldg N", building icon, right side). Reads
 * THREE sibling columns off the record — not a single stored value — so it
 * lives here rather than as a `Cell.value`-only renderer: `component: {
 * name: "AddressRefView", props: { areaCol: "addr_area", streetCol:
 * "addr_street", buildingCol: "addr_building" } }`. Defaults to the UCCP
 * incidents blueprint's own column names when a prop is omitted, but every
 * name is placement-authored (a config seam, not a hardcoded UCCP special
 * case) so another entity's differently-named address columns can reuse it.
 * Segments with no value are dropped rather than rendered as "Zone ·"; when
 * NONE of the three resolve, the row shows the seeded "address pending"
 * fallback state (SPEC §3) instead of an empty row.
 */
const ReadAddressRef: ReadRenderer = ({ descriptor, record }) => {
  const compProps = descriptor.component?.props
  const areaCol = typeof compProps?.areaCol === 'string' ? compProps.areaCol : 'addr_area'
  const streetCol = typeof compProps?.streetCol === 'string' ? compProps.streetCol : 'addr_street'
  const buildingCol = typeof compProps?.buildingCol === 'string' ? compProps.buildingCol : 'addr_building'
  const read = (col: string): string => {
    const raw = record?.[col]
    return raw == null || raw === '' ? '' : String(raw)
  }
  const zone = read(areaCol)
  const street = read(streetCol)
  const building = read(buildingCol)
  const segments = [
    zone ? `Zone ${zone}` : '',
    street ? `St ${street}` : '',
    building ? `Bldg ${building}` : '',
  ].filter(Boolean)
  const Icon = resolveFieldIcon('building-06')
  return (
    <span data-slot="address-ref" className="inline-flex items-center gap-1 text-body-xs text-muted-foreground">
      {Icon ? <Icon className="size-3.5 shrink-0" aria-hidden="true" /> : null}
      <span className="truncate">{segments.length ? segments.join(' · ') : 'address pending'}</span>
    </span>
  )
}

/**
 * `TagChipsView` — the card body's semantically-tinted tag chips row
 * (SPEC §2: "red/orange critical/sensitive-class, blue/purple status-class",
 * render only when tags exist). Reads a comma/pipe-delimited `SmallText`
 * value (the UCCP incidents blueprint's `tags` column) rather than requiring
 * a retype to `tags`/`MultiSelect` — a config seam on the placement, same as
 * every other named-component override in this file. Classification is a
 * closed keyword table, not per-tenant color data: a tag whose text matches
 * a critical/sensitive keyword tints red or orange, a status-lifecycle
 * keyword tints blue or purple, anything else renders `TagChipList`'s
 * default untinted soft chip.
 */
const TAG_TINT_CRITICAL = /critical|sensitive|hazard|restricted|classified|urgent|breach/i
const TAG_TINT_STATUS = /open|closed|resolved|pending|progress|review|verified|escalated|assigned/i
const ReadSemanticTagChips: ReadRenderer = ({ value }) => {
  const raw = Array.isArray(value) ? value.map(String) : value ? String(value).split(/[,|]/) : []
  const values = raw.map((v) => v.trim()).filter(Boolean)
  if (!values.length) return null
  const tags = values.map((v, i) => {
    let color: string | undefined
    if (TAG_TINT_CRITICAL.test(v)) {
      color = i % 2 === 0 ? 'var(--color-error-500)' : 'var(--color-warning-500)'
    } else if (TAG_TINT_STATUS.test(v)) {
      color = i % 2 === 0 ? 'var(--color-info-500)' : 'var(--color-chart-accent-purple)'
    }
    return { value: v, label: v, color }
  })
  return <TagChipList tags={tags} size="sm" />
}

/**
 * `StatusList` — the placement name UCCP/CRM/fleet list-column blueprints
 * actually author on their own `status` column (e.g.
 * `plan-monitoring/daily-plan`'s and `crm/deals`' `status` placement:
 * `component: { name: "StatusList" }`). Until this entry existed,
 * `getComponentRenderer('StatusList')` returned `undefined` — silently
 * degrading every such column to the type-keyed default — which is exactly
 * why simply resolving it *at all* matters: `LiveListOnlyView`'s own
 * per-column dispatch fix (see that file) only lets a coordinate-bound
 * module's `status` column reach `ListView`'s own colored, per-key
 * `uiConfig.statusList` pill (`isStatusCol` in `use-list-columns.tsx`) when
 * its placement's named component resolves to SOMETHING here.
 *
 * Degrades to `getReadRenderer(descriptor.type)` — same as an unregistered
 * name — whenever the placement carries neither `props.color` nor
 * `props.variant` of its own, rather than rendering `ReadStatusPill` with no
 * color at all (an unstyled, backgroundless pill). This is what keeps a bare
 * `{ name: "StatusList" }` placement byte-identical to its PRE-existing
 * rendering everywhere `isStatusCol`'s own hardcoded path doesn't already
 * win first (e.g. `crm/deals`' own status column when the list makes it
 * EDITABLE — `ListView.test.tsx`'s "falls back to the field registry"
 * case — `isStatusCol` requires `!editable`, so an editable status column
 * has always resolved through here, never through the special pill). A
 * placement that DOES author `props.color`/`props.variant` still gets the
 * real, styled `StatusPill`.
 */
const ReadStatusList: ReadRenderer = (props) => {
  const { descriptor } = props
  const compProps = descriptor.component?.props
  const hasOwnStyle = typeof compProps?.color === 'string' || typeof compProps?.variant === 'string'
  if (!hasOwnStyle) {
    const Fallback = getReadRenderer(descriptor.type)
    return <Fallback {...props} />
  }
  return <ReadStatusPill {...props} />
}

const componentRegistry = new Map<string, ReadRenderer>([
  ['IconTextView', ReadIconText],
  /** Icon + NUMBER row that keeps the number's own locale/unit formatting (e.g. a speedometer icon + "45,210 km") — see `ReadIconNumber`. */
  ['IconNumberView', ReadIconNumber],
  /** A Date/DateTime field toned by a SIBLING flag column's value (e.g. the kanban card due date that must read red exactly when the record's own overdue flag says so) — see `ReadFlagToneDate`. */
  ['FlagToneDateView', ReadFlagToneDate],
  /** Explicit opt-in to the gray `#`-prefixed `IdChip` visual for a column that a host template otherwise overrides (e.g. `ListView`'s ID column) — see `ReadIdChip`. */
  ['IdChip', ReadIdChip],
  /** Avatar + name inline, optionally role-toned (figma-spec-detail.md §3's Supervisor/Reported By/Area Manager rows) — see `ReadPersonView`. */
  ['PersonView', ReadPersonView],
  /** Bare colored flag icon + plain Title-Case text (figma-spec-detail.md §3's Priority Level row, distinct from the Kanban/List `PriorityChip` pill) — see `ReadPriorityFlag`. */
  ['PriorityFlagView', ReadPriorityFlag],
  /** Clock icon + countdown text (figma-spec-detail.md §3's Time Remaining row) — see `ReadTimeRemaining`. */
  ['TimeRemainingView', ReadTimeRemaining],
  /** Dashed "+" empty-state affordance in place of an em dash (figma-spec-detail.md §8's Assigned Driver row) — see `ReadAddAffordance`. */
  ['AddAffordanceView', ReadAddAffordance],
  /** Solid-fill card-level status flag (figma-spec-kanban.md §6's "Reopened" badge) — see `ReadStatusPill`. */
  ['StatusPill', ReadStatusPill],
  /** The `status` column's own authored placement name — see `ReadStatusList`'s doc above. */
  ['StatusList', ReadStatusList],
  /** Conditional per-row action button (attendance's "Dispatch Reliever" on Absent rows, ATT-03) — see `ReadDispatchAction`. */
  ['DispatchAction', ReadDispatchAction],
  /** Compact icon+count event pairs (live-monitoring's "Activity Overview" column) — see `ReadActivityOverview`. */
  ['ActivityOverviewView', ReadActivityOverview],
  /** Number presented by its own SIGN — per-band unit word, suffix and semantic tone (a bare `-10` vs `172` is otherwise typographically identical) — see `ReadSignedNumber`. */
  ['SignedNumberView', ReadSignedNumber],
  /** Reference rendered as its target record's display name, activatable to open that record — see `ReadLinkView`. */
  ['LinkView', ReadLinkView],
  /** Reference rendered as `"{typeLabel} · {display name}"`, activatable — a card meta row's Entity Type + Entity ID line — see `ReadEntityRefMeta`. */
  ['EntityRefMeta', ReadEntityRefMeta],
  /** 3D isometric vehicle thumb + status-dot badge + text value (live-monitoring list rows, SPEC v2 P0-1.1) — see `ReadVehicle3D` for the `props` contract (`statusCol`/`badge`/`size`). */
  ['Vehicle3DView', ReadVehicle3D],
  /** Single stored value as a small colored `Badge` pill (task-detail-29-42895 SPEC §1.3's "VIP chip" Tags treatment) — see `ReadTagBadge` for the `props.variant` contract. */
  ['TagBadgeView', ReadTagBadge],
  /** Icon + value row with an optional static label prefix ("Reported by <Source>") — see `ReadPrefixedIconText`. */
  ['PrefixedIconTextView', ReadPrefixedIconText],
  /** Sibling-column Qatar address reference ("Zone N · St N · Bldg N"), building icon, "address pending" fallback — see `ReadAddressRef`. */
  ['AddressRefView', ReadAddressRef],
  /** Semantically-tinted tag chips row (critical/sensitive red-orange, status blue-purple) — see `ReadSemanticTagChips`. */
  ['TagChipsView', ReadSemanticTagChips],
  /** Sibling-column-aware progress/meter cell, composing `TableCell kind="progress"` verbatim — see `ReadProgressMeter` for the `targetCol`/`unit`/`tone` prop contract. */
  ['ProgressMeterView', ReadProgressMeter],
])

/** Register (or override) a named per-field component reader, resolved via `FieldDescriptor.component.name`. */
export function registerComponent(name: string, read: ReadRenderer): void {
  componentRegistry.set(name, read)
}

/** Looks up a named component reader; `undefined` if `name` isn't registered (caller falls back to the type-keyed renderer). */
export function getComponentRenderer(name: string): ReadRenderer | undefined {
  return componentRegistry.get(name)
}

/**
 * The EDIT-side sibling of `componentRegistry` above — same shape, same
 * resolution rule (`FieldDescriptor.component.name`, checked first, falling
 * back to the type-keyed `EditWidget` when the field carries no override or
 * names one nothing registered), but for the write path (`SchemaForm`'s
 * `FieldControl`) instead of the read path (`renderCellValue`).
 *
 * Starts EMPTY by design: this package stays free of any concrete named
 * widget (no business/product vocabulary here — root CLAUDE.md rule 10).
 * `@fams/v5-templates` (the tier-2, product-aware patterns package) is
 * where concrete overrides like `"IconSelect"`/`"PhoneInput"`/
 * `"LocationPicker"` get registered, as a side effect of importing
 * `CreationSheet` — see `v5-templates/src/creation-sheet/register-widgets.ts`.
 * A field authors `component: { name: "IconSelect", props: {...} }` in its
 * blueprint placement to opt in; no change to this package is needed to add
 * a new named widget.
 */
const editComponentRegistry = new Map<string, EditWidget>()

/** Register (or override) a named per-field edit widget, resolved via `FieldDescriptor.component.name`. */
export function registerEditWidget(name: string, widget: EditWidget): void {
  editComponentRegistry.set(name, widget)
}

/** Looks up a named edit widget; `undefined` if `name` isn't registered (caller falls back to the type-keyed widget). */
export function getEditWidgetOverride(name: string): EditWidget | undefined {
  return editComponentRegistry.get(name)
}

/** Test-only: clears every `registerEditWidget` registration. */
export function resetEditWidgetRegistry(): void {
  editComponentRegistry.clear()
}
