import { useCallback, useEffect, useMemo, useRef, useState, useTransition, type ReactNode } from 'react'
import { MapPin, Wrench, getIcon, type LucideIcon } from '@fams/ui-kit/icons'
import { StatusPill, Tabs, TabsList, TabsTrigger, TabsContent, Toolbar, Skeleton, type IconBadgeTone } from '@fams/ui-kit'
import { compileFieldSet, deriveDetail, type Cell } from '@fams/v5-composer'
import { cn } from '../lib/cn'
// TYPE-ONLY-adjacent: `MapGuardScopeProvider` itself is a tiny context
// provider with zero maplibre/deck.gl weight, so importing it directly here
// (rather than through the lazy `@fams/v5-templates/map` door) does not
// violate the lazy-weight rule (see `MapPanel.tsx`'s header) — it never
// imports `mount-guard`'s siblings, only React's `createContext`.
import { MapGuardScopeProvider } from '../map/mount-guard'
import { EntityIdentityPanel } from './EntityIdentityPanel'
import { ComplianceTable, type ComplianceTableProps } from './ComplianceTable'
import { EventsOverview } from './EventsOverview'
import type { EventsOverviewProps } from './EventsOverview.types'
import { InteractiveReplay } from './InteractiveReplay'
import type { InteractiveReplayProps } from './InteractiveReplay.types'
import { TripsOverview } from './TripsOverview'
import type { TripsOverviewProps } from './TripsOverview.types'
import { EntityCardHistory } from './EntityCardHistory'
import type { EntityCardHistoryProps } from './EntityCardHistory.types'
import { DocumentsList } from './DocumentsList'
import type { DocumentsListProps } from './DocumentsList.types'
import { SearchableRecordList } from './SearchableRecordList'
import type { SearchableRecordListProps } from './SearchableRecordList.types'
import { ActivityCommentFeed } from '../views/task-detail/ActivityCommentFeed'
import type { ActivityCommentFeedProps } from '../views/task-detail/ActivityCommentFeed'
import { OverviewWidgets, type OverviewWidget } from './OverviewWidgets'
import { ProfileSectionsPanel } from './ProfileSectionsPanel'
import { profileTabRegistry } from './ProfileTabRegistry'
import { RecordSectionsGrid, type RecordSectionsGridProps } from './RecordSectionsGrid'
import { RecordTable, type RecordTableProps } from './RecordTable'
import { ScopedLinkedRecords } from './ScopedLinkedRecords'
import type { ScopedLinkedRecordsProps } from './ScopedLinkedRecords.types'
import { renderCellValue } from './render-cell-value'
import { isProfileTabVisible } from './tab-visibility'
import { getTabComponentRenderer, registerTabComponent } from './tab-components'
import type { EntityProfileProps, EntityProfileTab, EntityProfileTabContext } from './EntityProfile.types'

/**
 * The two generic, metadata-driven tab components registered "for free" on
 * every `EntityProfile` — see `tab-components.ts`'s module doc for why the
 * registration happens HERE (a genuinely-imported module, not a bare
 * side-effect import this package's `"sideEffects": false` build would
 * elide — same fix `TaskDetail.tsx` applies for its section registrations).
 * Each adapter reads its component's props from the tab's authored
 * `component.props` bag (`TabComponentProps.props`); a tab naming either
 * component with no `props`/malformed shape simply renders nothing rather
 * than throwing (same "degrade, never crash" contract every named registry
 * in this system uses).
 */
registerTabComponent('OverviewWidgets', ({ record, props }) => {
  const widgets = props?.widgets
  if (!Array.isArray(widgets)) return null
  return <OverviewWidgets widgets={widgets as OverviewWidget[]} record={record} />
})
registerTabComponent('RecordTable', ({ record, props }) => {
  const cfg = (props ?? {}) as Omit<Partial<RecordTableProps>, 'summaryTiles'> & {
    summaryTiles?: {
      id: string
      label: string
      value?: string | number
      /** Reads `record[valueField]` when `value` is omitted — e.g. a per-record count. */
      valueField?: string
      /** String glyph name resolved through `getIcon` (a JSON tab cannot carry a component). */
      icon?: string
      tone?: IconBadgeTone
      iconColor?: string
      iconBg?: string
    }[]
  }
  if (!cfg.field || !Array.isArray(cfg.columns)) return null
  // Resolve the JSON-authored summary tiles into the DS `KpiTile` shape:
  // string icon name → LucideIcon, `valueField` → the record's own value.
  const summaryTiles = Array.isArray(cfg.summaryTiles)
    ? cfg.summaryTiles.map((t) => ({
        id: t.id,
        label: t.label,
        value: t.value ?? (t.valueField ? String(record?.[t.valueField] ?? '') : ''),
        icon: t.icon ? getIcon(t.icon) : undefined,
        tone: t.tone,
        iconColor: t.iconColor,
        iconBg: t.iconBg,
      }))
    : undefined
  return (
    <RecordTable
      field={cfg.field}
      columns={cfg.columns}
      record={record}
      search={cfg.search}
      timeframeSelect={cfg.timeframeSelect}
      action={cfg.action}
      summaryTiles={summaryTiles}
      statusColors={cfg.statusColors}
    />
  )
})
/**
 * Certification/compliance tab (`ComplianceTable`) — a `RecordTable` over an
 * embedded array with a compliance header above it (alert band, score gauge,
 * per-bucket summary + stacked bar, section label). Every module-specific
 * name is field-key indirection on `props` (`field`, `statusKey`, `buckets`,
 * …) — see `ComplianceTable.tsx`. A tab naming it without `field`/`columns`/
 * `buckets` renders nothing rather than throwing, same contract as above.
 */
registerTabComponent('ComplianceTable', ({ record, props }) => {
  const cfg = (props ?? {}) as Partial<ComplianceTableProps>
  if (!cfg.field || !Array.isArray(cfg.columns) || !cfg.buckets) return null
  return <ComplianceTable {...(cfg as ComplianceTableProps)} record={record} />
})

/**
 * The scoped cross-module tab (`ScopedLinkedRecords`), selected by a
 * blueprint tab as `component: {name: 'ScopedLinkedRecords', props:
 * {entityType, matchField, columns, ...}}` — e.g. a vehicle's "Job Orders"
 * tab naming `maintenance/job-order` scoped by its `vehicle` reference
 * column. A tab naming it with no `entityType`/`matchField`/`columns`
 * renders nothing rather than throwing, same "degrade, never crash" contract
 * as the adapters above. See `ScopedLinkedRecords.types.ts` for the full
 * config contract and `module-records.tsx` for the cross-module data seam it
 * reads through `useModuleRecords()`.
 */
registerTabComponent('ScopedLinkedRecords', ({ record, props }) => {
  const cfg = (props ?? {}) as Partial<ScopedLinkedRecordsProps>
  if (!cfg.entityType || !cfg.matchField || !Array.isArray(cfg.columns)) return null
  return (
    <ScopedLinkedRecords
      record={record}
      entityType={cfg.entityType}
      matchField={cfg.matchField}
      matchAgainst={cfg.matchAgainst}
      columns={cfg.columns}
      search={cfg.search}
      searchPlaceholder={cfg.searchPlaceholder}
      emptyLabel={cfg.emptyLabel}
      statusColors={cfg.statusColors}
      limit={cfg.limit}
    />
  )
})

/**
 * The Details-tab grid (`RecordSectionsGrid`) — a responsive 2-column grid of
 * titled key/value cards with an optional `Edit` form, selected by a blueprint
 * tab as `component: {name: 'RecordSectionsGrid', props: {groups, editable}}`.
 * A tab naming it with no `groups` array renders nothing rather than throwing,
 * same as the two adapters above.
 *
 * `onSave` is NOT reachable from JSON directly (a blueprint cannot express a
 * function) — it is wired from `EntityProfile`'s own `onRecordChange` prop
 * (forwarded here as `TabComponentProps.onRecordChange`), gated behind the
 * blueprint's own `editable` flag so an `editable: true` tab with no
 * `onRecordChange` supplied degrades to the same read-only "Edit renders but
 * Save has nowhere to go" as `RecordSectionsGrid`'s own `canEdit` contract
 * already documents (`editable && Boolean(onSave)`).
 */
registerTabComponent('RecordSectionsGrid', ({ config, record, props, onRecordChange }) => {
  const cfg = (props ?? {}) as Partial<RecordSectionsGridProps>
  if (!Array.isArray(cfg.groups)) return null
  return (
    <RecordSectionsGrid
      groups={cfg.groups}
      config={config}
      record={record}
      editable={cfg.editable}
      onSave={cfg.editable ? onRecordChange : undefined}
      editLabel={cfg.editLabel}
    />
  )
})

/**
 * The Interactive Replay tab (`InteractiveReplay`) — a played-back trip/shift
 * timeline, selected by a blueprint tab as `component: {name:
 * 'InteractiveReplay', props: {timelineField, series, ...}}`. A tab naming it
 * with no `timelineField`/`series` renders nothing rather than throwing, same
 * "degrade, never crash" contract as the adapters above.
 */
registerTabComponent('InteractiveReplay', ({ record, props }) => {
  const cfg = (props ?? {}) as Partial<InteractiveReplayProps>
  if (!cfg.timelineField || !Array.isArray(cfg.series)) return null
  return (
    <InteractiveReplay
      record={record}
      timelineField={cfg.timelineField}
      series={cfg.series}
      statsField={cfg.statsField}
      bandsField={cfg.bandsField}
      routeField={cfg.routeField}
      pinsField={cfg.pinsField}
      filters={cfg.filters}
      emptyTitle={cfg.emptyTitle}
      emptyText={cfg.emptyText}
      height={cfg.height}
    />
  )
})

/**
 * The Trips tab (`TripsOverview`) — KPI chip row + grouped trip list + route
 * map, selected by a blueprint tab as `component: {name: 'TripsOverview',
 * props: {kpiField, itemsField, ...}}`. A tab naming it with no `kpiField`/
 * `itemsField` renders nothing rather than throwing, same "degrade, never
 * crash" contract as the adapters above.
 */
registerTabComponent('TripsOverview', ({ record, props }) => {
  const cfg = (props ?? {}) as Partial<TripsOverviewProps>
  if (!cfg.kpiField || !cfg.itemsField) return null
  return (
    <TripsOverview
      record={record}
      kpiField={cfg.kpiField}
      itemsField={cfg.itemsField}
      pinsField={cfg.pinsField}
      layers={cfg.layers}
      strings={cfg.strings}
      mapAriaLabel={cfg.mapAriaLabel}
    />
  )
})

/**
 * The Events tab (`EventsOverview`) — search/filter/time-frame over an
 * icon-row event list + a pin map, selected by a blueprint tab as
 * `component: {name: 'EventsOverview', props: {itemsField, ...}}`. A tab
 * naming it with no `itemsField` renders nothing rather than throwing, same
 * "degrade, never crash" contract as the adapters above.
 */
registerTabComponent('EventsOverview', ({ record, props }) => {
  const cfg = (props ?? {}) as Partial<EventsOverviewProps>
  if (!cfg.itemsField) return null
  return (
    <EventsOverview
      record={record}
      itemsField={cfg.itemsField}
      iconMap={cfg.iconMap}
      toneMap={cfg.toneMap}
      strings={cfg.strings}
      mapAriaLabel={cfg.mapAriaLabel}
    />
  )
})

/**
 * The Devices/Workforce tab (`EntityCardHistory`) — a linked-record info card
 * + a "History" table of prior links, selected by a blueprint tab as
 * `component: {name: 'EntityCardHistory', props: {sectionTitle, fields,
 * historyField, historyColumns, ...}}`. A tab naming it with no `fields`/
 * `historyField`/`historyColumns` renders nothing rather than throwing, same
 * "degrade, never crash" contract as the adapters above.
 */
registerTabComponent('EntityCardHistory', ({ record, props }) => {
  const cfg = (props ?? {}) as Partial<EntityCardHistoryProps>
  if (!Array.isArray(cfg.fields) || !cfg.historyField || !Array.isArray(cfg.historyColumns)) return null
  return (
    <EntityCardHistory
      record={record}
      sectionTitle={cfg.sectionTitle ?? ''}
      actionLabel={cfg.actionLabel}
      imageField={cfg.imageField}
      icon={cfg.icon}
      artField={cfg.artField}
      title={cfg.title}
      titleField={cfg.titleField}
      subtitlePrefix={cfg.subtitlePrefix}
      subtitleField={cfg.subtitleField}
      fields={cfg.fields}
      historyField={cfg.historyField}
      historyColumns={cfg.historyColumns}
      strings={cfg.strings}
    />
  )
})

/**
 * A "search box over a scrolling list of compact rows" tab
 * (`SearchableRecordList`), selected by a blueprint tab as `component:
 * {name: 'SearchableRecordList', props: {itemsField, titleKey, ...}}`. A tab
 * naming it with no `itemsField`/`titleKey` renders nothing rather than
 * throwing, same "degrade, never crash" contract as the adapters above.
 */
registerTabComponent('SearchableRecordList', ({ record, props }) => {
  const cfg = (props ?? {}) as Partial<SearchableRecordListProps>
  if (!cfg.itemsField || !cfg.titleKey) return null
  return (
    <SearchableRecordList
      record={record}
      itemsField={cfg.itemsField}
      idKey={cfg.idKey}
      leadKey={cfg.leadKey}
      titleKey={cfg.titleKey}
      statusKey={cfg.statusKey}
      statusColors={cfg.statusColors}
      meta={cfg.meta}
      strings={cfg.strings}
    />
  )
})

/**
 * The Documents tab (`DocumentsList`) — a titled list of document rows + an
 * upload action, selected by a blueprint tab as `component: {name:
 * 'DocumentsList', props: {field}}`. A tab naming it with no `field` renders
 * nothing rather than throwing, same "degrade, never crash" contract as the
 * adapters above.
 */
registerTabComponent('DocumentsList', ({ record, props }) => {
  const cfg = (props ?? {}) as Partial<DocumentsListProps>
  if (!cfg.field) return null
  return <DocumentsList record={record} field={cfg.field} strings={cfg.strings} />
})

/**
 * The Timeline tab (`ActivityCommentFeed`) — a mixed system-log +
 * @mention-comment feed with a composer, selected by a blueprint tab as
 * `component: {name: 'ActivityCommentFeed', props: {field, currentUser,
 * ...}}`. A tab naming it with no `field` renders nothing rather than
 * throwing, same "degrade, never crash" contract as the adapters above.
 */
registerTabComponent('ActivityCommentFeed', ({ record, props }) => {
  const cfg = (props ?? {}) as Partial<ActivityCommentFeedProps>
  if (!cfg.field) return null
  return (
    <ActivityCommentFeed
      record={record}
      field={cfg.field}
      currentUser={cfg.currentUser}
      placeholder={cfg.placeholder}
      emptyLabel={cfg.emptyLabel}
      search={cfg.search}
      searchPlaceholder={cfg.searchPlaceholder}
      order={cfg.order}
    />
  )
})

/** Reserved blueprint tab `component` name — renders `detail.sections` as named,
 *  bordered field-grid cards (`ProfileSectionsPanel`) with no custom renderer
 *  needed. A `tabRenderers['sections']` entry still wins if the caller wants
 *  to override it (same escape hatch as every other tab component name). */
const SECTIONS_TAB_COMPONENT = 'sections'

/**
 * EntityProfile — the v5 30/70 entity-profile template. [tier-2 pattern]
 *
 * Composition: Ben's shell engineering (`FieldGrid`, `Tabs`, `Toolbar`,
 * responsive stacking) + Shaheer's identity-panel DESIGN (left 30% =
 * image/status/name/uid/tags/key-details; right 70% = underline tab content).
 * Blueprint-driven by default, bespoke by escape hatch:
 *
 *  - **Blueprint mode** (`config` + `record`): the identity panel's key details
 *    come from `deriveDetail`, each value rendered by the FieldRegistry read
 *    renderer for its field type. The right-panel tab set comes from
 *    `uiConfig.profile.rightPanel.tabs`; each tab's body is resolved from the
 *    injected `tabRenderers` map (keyed by the blueprint `component` name).
 *  - **Bespoke mode**: pass `title` + `tabs` (+ optional `identity`/`details`)
 *    directly — no config needed.
 *
 * Tabs are metadata-gated (`visibleWhen` / `requiredPrivileges`) against an
 * injected `UserContext`, and cross-module contributions merge in after the
 * blueprint's own (see `ProfileTabRegistry`). State-agnostic (Rule 8).
 */

function asNode(value: unknown): ReactNode {
  return value == null ? undefined : (String(value) as ReactNode)
}

/** A status with no configured `statusList` color (bespoke mode only — blueprint mode always has one) — a token, never a raw hex (root CLAUDE.md rule 2). */
const DEFAULT_STATUS_COLOR = 'var(--color-muted-foreground)'

/**
 * Named-icon vocabulary for `uiConfig.profile.placeholderIcon` — the SAME
 * "opt in by name, unrecognized → default" contract every other icon-string
 * config key in this package already uses (`OverviewWidgets`' planBanner
 * icon, `IconTextView`'s `props.icon`). `map-pin` is both the Figma
 * reference's own glyph (a location-flavored hero placeholder reads right
 * for entity-profile's zones/asset/collection-point subjects generally, not
 * just this one module) and the fallback for a name this map doesn't
 * recognize — mirrors `resolvePlanBannerIcon`'s "always resolves to
 * something, never `undefined`" shape once a name is present at all.
 *
 * `wrench`/`tool` added for P1-O (run-2026-09-05-job-orders, fix7): an
 * entity module with no `art`/`image` of its own (no `icon3dArt` seeded —
 * the preventive-maintenance rule case) fell through all the way to the
 * giant single-letter `avatarFallback` block, which a huge bold glyph
 * clipped by the tile's `overflow-hidden` read as "a half-cut app logo
 * mark." A record with genuinely no artwork gets a DELIBERATE placeholder
 * look (this map's existing grey-slot-plus-glyph treatment, already built
 * and already distinct from the solid-color initials block — see the
 * `PlaceholderIcon` branch in `EntityIdentityPanel.tsx`) instead of leaning
 * on initials. Generic name (rule 10): reads as "service/maintenance/tool"
 * for any module of that flavor, not `jobOrder`/`preventiveMaintenance`
 * vocabulary specifically.
 */
const PLACEHOLDER_ICON_MAP: Record<string, LucideIcon> = {
  'map-pin': MapPin,
  pin: MapPin,
  marker: MapPin,
  wrench: Wrench,
  tool: Wrench,
}

function resolvePlaceholderIcon(name: string | undefined): LucideIcon | undefined {
  if (!name) return undefined
  const mapped = PLACEHOLDER_ICON_MAP[name]
  if (mapped) return mapped
  // Any name the small vocabulary above doesn't cover falls through to the
  // full DS icon registry — so a blueprint can point `placeholderIcon` (or
  // the module's own `uiConfig.icon`, which this file falls back to next) at
  // any DS glyph without expanding this map. `getIcon` returns `undefined`
  // for an unknown name, in which case we fall through to `MapPin` for the
  // same "always resolves to something" guarantee documented above.
  const glyph = getIcon(name)
  return glyph ?? MapPin
}

/**
 * A `PersonView`-named detail cell's stored value is a raw id (e.g. a
 * `SingleReference` to `workforce/driver`) — `ReadPersonView` (`@fams/v5-
 * composer`) treats whatever value it receives as an already-resolved
 * display name (Rule 8: a pure presenter never fetches/looks up another
 * record itself), so a raw reference id renders verbatim (finding: the
 * Contractor row showed the id `WCR-01`, not the driver's name). This is the
 * SAME "id → display name" gap `resolveAssigneeName` already closes for
 * `ModuleView`'s Assignee dropdown (`v5-module-renderers.tsx`) — `EntityProfile`
 * gets an analogous optional resolver for identity detail rows: applied ONLY
 * to a cell whose resolved component name is `PersonView`, and only when the
 * caller supplies one; a cell with no resolver (or a resolver that returns
 * `undefined` for that id) falls through to the raw value unchanged, so this
 * is purely additive.
 */
/**
 * Overflow-fade tracking for the (horizontally-scrolling, see the comment
 * above `TabsList` below) tab strip — a scrollable region with no visual
 * affordance looks like "that's all the tabs" even when there are more off
 * to either side. Tracks whether there is unscrolled content to either edge
 * so the caller can render a fade/gradient hint there, purely presentational
 * (`aria-hidden`) — never a substitute for the strip's own real scroll
 * affordance (mouse wheel, touch, and the roving-focus Arrow keys already
 * scroll a focused trigger into view via Radix `Tabs`).
 */
function useEdgeOverflow<T extends HTMLElement>() {
  const ref = useRef<T | null>(null)
  const [atStart, setAtStart] = useState(true)
  const [atEnd, setAtEnd] = useState(true)

  const measure = useCallback(() => {
    const el = ref.current
    if (!el) return
    // 1px slop: sub-pixel layout can leave `scrollLeft` a fraction short of
    // its true min/max, which would otherwise flicker the fade on/off at rest.
    setAtStart(el.scrollLeft <= 1)
    setAtEnd(el.scrollLeft + el.clientWidth >= el.scrollWidth - 1)
  }, [])

  useEffect(() => {
    const el = ref.current
    if (!el) return
    measure()
    el.addEventListener('scroll', measure, { passive: true })
    const resizeObserver = new ResizeObserver(measure)
    resizeObserver.observe(el)
    return () => {
      el.removeEventListener('scroll', measure)
      resizeObserver.disconnect()
    }
  }, [measure])

  return { ref, atStart, atEnd, remeasure: measure }
}

function resolvePersonNameOnCell(cell: Cell, resolvePersonName?: (id: string) => string | undefined): Cell {
  if (!resolvePersonName || cell.component?.name !== 'PersonView' || cell.value == null || cell.value === '') {
    return cell
  }
  const resolved = resolvePersonName(String(cell.value))
  return resolved == null ? cell : { ...cell, value: resolved }
}

export function EntityProfile(props: EntityProfileProps) {
  const {
    config,
    record,
    statusTone = 'secondary',
    title,
    subtitle,
    identity,
    details,
    tabs: extraTabs,
    tabRenderers,
    moduleCode,
    contributedTabs,
    activeTabId,
    onTabChange,
    image,
    art,
    avatarFallback,
    statusOverlay,
    tags,
    onRemoveTag,
    onAddTag,
    addTagLabel,
    actions,
    infoTitle,
    placeholderIcon,
    resolvePersonName,
    onRecordChange,
    userContext,
    className,
  } = props

  const compiled = useMemo(() => (config ? compileFieldSet(config) : null), [config])
  const detail = useMemo(() => (config && record ? deriveDetail(config, record) : null), [config, record])

  // Identity: derived title/uid/status/detail-rows in blueprint mode; explicit props otherwise.
  const resolvedTitle = title ?? (detail ? asNode(detail.title) : undefined)
  const entityId = record?.uniqueidentifier
  // The record's OWN `statusList` entry (key/label/color) — looked up once so
  // both the hero-image overlay AND the under-id status pill (bespoke mode's
  // `statusTone` escape hatch aside) can share its `color` (the same
  // per-status-key-color pattern `ListView`'s STATUS column already uses,
  // `StatusPill color={stage.color}`, rather than a single fixed `statusTone`
  // for every status value — finding: the overlay rendered a generic dark
  // grey pill for every status instead of e.g. solid green for "Active").
  const statusStage = record?.status ? config?.uiConfig.statusList.find((s) => s.key === record.status) : undefined
  const statusLabel = record?.status ? (statusStage?.label ?? record.status) : undefined
  const detailRows =
    details ??
    (detail?.details ?? []).map((cell) => {
      // A field-config-driven affordance (`component.props.linkToTab`), NOT a
      // hardcoded "driver" special case: ANY identity-rail field can name a
      // sibling tab's key here (e.g. the assigned-driver row naming
      // `"workforce"`) and the row becomes a clickable navigation control —
      // entity- and field-agnostic, same "config decides, component obeys"
      // contract every other widget in this package follows.
      const linkToTab = cell.component?.props?.linkToTab
      const targetTabId = typeof linkToTab === 'string' ? linkToTab : undefined
      return {
        id: cell.col,
        label: cell.label,
        value: renderCellValue(compiled, record, resolvePersonNameOnCell(cell, resolvePersonName)),
        onClick: targetTabId ? () => handleTabChange(targetTabId) : undefined,
        interactiveLabel:
          targetTabId && typeof cell.label === 'string' ? `View ${cell.label} in the ${targetTabId} tab` : undefined,
      }
    })
  // Hero-image status overlay (Figma "Asset Details": a small solid pill inset
  // top-start of the identity photo) — derived from the same status the
  // headline chip already uses, so blueprint mode gets it for free. An
  // explicit `statusOverlay` prop still wins (bespoke escape hatch). Solid
  // fill in the record's OWN status color (`StatusPill`'s `color` escape
  // hatch, the same per-status-key-color pattern `ListView`'s STATUS column
  // already uses) — falls back to a neutral pill for a status with no
  // configured color (bespoke mode with no blueprint `statusList` at all).
  //
  // `uiConfig.profile.statusOverlayField` redirects the overlay to a
  // DIFFERENT field than the headline `status` (see its doc comment): an
  // asset rail states the lifecycle ("Active") while `status` carries live
  // motion ("Stopped"), and a module whose rows have two shapes can name
  // both candidate fields and let the first non-empty one win.
  const overlayFields = config?.uiConfig.profile?.statusOverlayField
  const overlayCandidates = overlayFields == null ? [] : Array.isArray(overlayFields) ? overlayFields : [overlayFields]
  const overlayValue = overlayCandidates
    .map((f) => record?.[f])
    .find((v) => v != null && v !== '')
  const overlayLabel = overlayValue != null ? String(overlayValue) : statusLabel
  const overlayColor =
    overlayValue != null
      ? (config?.uiConfig.profile?.statusOverlayColors?.[String(overlayValue)] ??
        config?.uiConfig.statusList.find((s) => s.key === String(overlayValue))?.color ??
        DEFAULT_STATUS_COLOR)
      : (statusStage?.color ?? DEFAULT_STATUS_COLOR)
  const defaultStatusOverlay = overlayLabel ? (
    <StatusPill color={overlayColor}>{overlayLabel}</StatusPill>
  ) : undefined

  // Tab merge: blueprint tabs, then consumer-added tabs, then contributions (by order).
  const contributions = contributedTabs ?? (moduleCode ? profileTabRegistry.getContributions(moduleCode) : [])
  // Read the RAW authored tabs off `config` directly (not the derived
  // `detail.rightPanelTabs`, which only carries `{key, title, component:
  // name}` — `deriveDetail` doesn't surface each tab's `component.props`).
  // `ProfileTab.component` is already typed with an optional `props` bag
  // (`@fams/v5-composer`'s `types.ts`) — reading it here needs no change to
  // v5-composer, just consuming a field `deriveDetail` happened to drop.
  const rawTabs = config?.uiConfig.profile?.rightPanel?.tabs ?? []
  const blueprintTabs: EntityProfileTab[] = [...rawTabs]
    .sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
    .map((t) => ({
      // The tab's public id is its `key` (matches `deriveDetail`'s prior
      // `rightPanelTabs` mapping and every existing `tabRenderers`/
      // `onTabChange` consumer) — `t.id` is the blueprint's own internal
      // identity convention (`tab_<key>`) and is never surfaced here.
      id: t.key,
      label: t.title,
      component: t.component?.name,
      componentProps: t.component?.props,
      // Blueprint-authored visibility gates, forwarded verbatim to
      // `isProfileTabVisible` — without this pass-through a `visibleWhen` /
      // `requiredPrivileges` written on a blueprint tab was silently dropped
      // here and only consumer-supplied (`extraTabs`) tabs could be gated.
      // This is what lets ONE module blueprint carry two tab sets for two
      // record shapes (e.g. `$.task.kind` = tanker vs workforce).
      visibleWhen: t.visibleWhen,
      requiredPrivileges: t.requiredPrivileges,
    }))
  // Plain concat, not useMemo: `contributions` is never referentially stable
  // (getContributions/ProfileTabRegistry returns a fresh sorted array on every
  // call, and the `moduleCode`-less fallback is a fresh `[]` literal each
  // render too), so a memo keyed on it would recompute every render anyway —
  // pure overhead for a spread that's already O(tabs).
  const allTabs: EntityProfileTab[] = [...blueprintTabs, ...(extraTabs ?? []), ...contributions]
  const visibleTabs = allTabs.filter((t) => isProfileTabVisible(t, userContext, record))

  const [internalTab, setInternalTab] = useState<string | undefined>(undefined)
  const requestedTab = activeTabId ?? internalTab ?? visibleTabs[0]?.id
  // A tab can go from visible to hidden without either the caller or this
  // component's own remembered `internalTab` finding out — e.g. `userContext`
  // loses the privilege backing a tab's `requiredPrivileges`/`visibleWhen`
  // while that tab is the active one. Re-deriving the active tab against the
  // CURRENT `visibleTabs` every render (rather than trusting whatever id was
  // last requested) avoids a `Tabs value` that matches no rendered
  // `TabsTrigger`/`TabsContent` — which would render a blank panel with
  // nothing shown as selected — by falling back to the first visible tab.
  const activeTab =
    requestedTab != null && visibleTabs.some((tab) => tab.id === requestedTab) ? requestedTab : visibleTabs[0]?.id
  // Tab-body loading skeleton: switching tabs re-mounts a potentially heavy
  // body (a map, a chart, a long list) with no async data fetch to key a
  // "real" loading state off (Rule 8 — records are handed in synchronously),
  // so `isPending` from `startTransition` stands in as the loading signal —
  // it stays true for exactly the duration React needs to commit the new
  // tab's body, which is the same window a genuinely-async tab would show a
  // spinner for. `pendingTabId` is which tab body to skeleton (the one being
  // switched TO), so an already-mounted OTHER tab's content is never masked.
  const [isTabPending, startTabTransition] = useTransition()
  const [pendingTabId, setPendingTabId] = useState<string | undefined>(undefined)
  const handleTabChange = (id: string) => {
    setPendingTabId(id)
    startTabTransition(() => {
      if (activeTabId === undefined) setInternalTab(id)
      onTabChange?.(id)
    })
  }

  // Tab-strip overflow fade — see `useEdgeOverflow`'s doc comment.
  const tabStripOverflow = useEdgeOverflow<HTMLDivElement>()

  // Controlled mode must never silently diverge from the value its owner
  // passed: when `activeTabId` no longer matches a visible tab (e.g. a
  // privilege revoked or `visibleWhen` turned false for the active tab), the
  // render above already fell back to the first visible tab so something
  // sane is always shown. This effect tells the owner about that fallback so
  // its own `activeTabId` state converges — fired post-render (never during
  // render) and only when `activeTabId`/`activeTab` actually change, so it
  // can't loop or refire for a state that hasn't moved. Uncontrolled mode
  // (`activeTabId === undefined`) is untouched; it already self-corrects via
  // `internalTab`/`handleTabChange`. If NO tab is visible at all, `activeTab`
  // is `undefined` and there is no id to notify with, so this stays silent.
  useEffect(() => {
    if (activeTabId === undefined) return
    if (activeTab === undefined) return
    if (activeTabId === activeTab) return
    onTabChange?.(activeTab)
  }, [activeTabId, activeTab, onTabChange])

  useEffect(() => {
    tabStripOverflow.remeasure()
  }, [visibleTabs.length, tabStripOverflow])

  const tabContext: EntityProfileTabContext = { config, record, userContext }
  const renderTabBody = (tab: EntityProfileTab): ReactNode => {
    // Skeleton the body being switched TO for the brief window React needs
    // to commit it (see the `isTabPending`/`pendingTabId` doc comment above)
    // — never the currently-active, already-rendered body.
    if (isTabPending && pendingTabId === tab.id) {
      return (
        <div data-slot="tab-body-skeleton" className="flex flex-col gap-3" aria-busy="true" aria-live="polite">
          <Skeleton variant="rect" className="h-32" />
          <Skeleton variant="text" className="w-3/4" />
          <Skeleton variant="text" className="w-1/2" />
          <Skeleton variant="text" className="w-2/3" />
        </div>
      )
    }
    if (tab.render) return tab.render(tabContext)
    if (tab.content != null) return tab.content
    if (tab.component) {
      // Registry-first (mirrors `views/field-cell.tsx`'s named-override
      // resolution): a component registered here wins over the caller's own
      // `tabRenderers` map, so a generic, metadata-driven tab body (e.g.
      // `OverviewWidgets`/`RecordTable`) resolves with zero app-layer wiring
      // the moment a blueprint names it.
      const registered = getTabComponentRenderer(tab.component)
      if (registered) return registered({ config, record, userContext, props: tab.componentProps, onRecordChange })
      if (tabRenderers?.[tab.component]) return tabRenderers[tab.component](tabContext)
    }
    if (tab.component === SECTIONS_TAB_COMPONENT && detail?.sections.length) {
      return <ProfileSectionsPanel sections={detail.sections} compiled={compiled} record={record} />
    }
    return <p className="text-body-sm text-muted-foreground">No content for “{tab.label}”.</p>
  }

  return (
    // Own map-guard SCOPE (see `mount-guard.tsx`'s "SCOPES" section): this
    // profile is typically rendered as a side-sheet OVERLAY on top of a live
    // map page — its own tab content's map(s) (Overview/Trips/Events/Replay)
    // must compete only against each other for the one-map-per-context slot,
    // never against the live map underneath the sheet. Two `MapPanel`s inside
    // the SAME `EntityProfile` (e.g. a tab holding a map while another tries
    // to mount one) still conflict exactly as before — only the OUTER
    // collision (sheet vs. page) is what this scope removes.
    <MapGuardScopeProvider>
      <div
        data-slot="entity-profile"
        className={cn('flex h-full min-h-0 flex-col lg:flex-row', className)}
      >
        {identity ?? (
        <EntityIdentityPanel
          image={image}
          art={art}
          avatarFallback={avatarFallback}
          // A blueprint may set `uiConfig.profile.placeholderIcon` explicitly;
          // when it doesn't, we fall back to the module's own `uiConfig.icon`
          // — the same glyph the nav rail already renders for the module —
          // so a record with no artwork gets an identity mark that matches
          // its module, rather than the generic `map-pin`/wrench fallback.
          placeholderIcon={
            placeholderIcon ??
            resolvePlaceholderIcon(
              detail?.placeholderIcon ??
                config?.uiConfig.profile?.placeholderIcon ??
                config?.uiConfig.icon,
            )
          }
          statusOverlay={statusOverlay ?? defaultStatusOverlay}
          name={resolvedTitle}
          entityId={entityId}
          status={statusLabel ? { label: statusLabel, tone: statusTone } : undefined}
          tags={tags}
          onRemoveTag={onRemoveTag}
          onAddTag={onAddTag}
          addTagLabel={addTagLabel}
          infoTitle={infoTitle ?? detail?.infoTitle ?? config?.uiConfig.profile?.infoTitle}
          details={detailRows}
        />
      )}

      <div data-slot="entity-profile-main" className="flex min-h-0 min-w-0 flex-1 flex-col bg-card">
        {subtitle ? (
          <div className="flex items-center justify-between gap-inline border-b border-border p-section text-start">
            <p className="min-w-0 truncate text-body-sm text-muted-foreground">{subtitle}</p>
          </div>
        ) : null}

        {visibleTabs.length ? (
          <Tabs value={activeTab} onValueChange={handleTabChange} className="flex min-h-0 flex-1 flex-col">
            {/* Twelve tabs do not fit the frame's content pane, so the strip
                SCROLLS horizontally rather than wrapping to a second row or
                crushing every label: `flex-nowrap` + `overflow-x-auto` on the
                list, `shrink-0 whitespace-nowrap` on each trigger. Roving
                arrow-key focus comes from the underlying Radix `Tabs` primitive
                (direction-aware Arrow keys) — never hand-rolled here. */}
            <div data-slot="entity-profile-tabstrip" className="relative shrink-0">
              <TabsList
                ref={tabStripOverflow.ref}
                className="flex-nowrap overflow-x-auto bg-card px-section"
              >
                {visibleTabs.map((tab) => (
                  <TabsTrigger key={tab.id} value={tab.id} className="shrink-0 whitespace-nowrap">
                    {tab.label}
                  </TabsTrigger>
                ))}
              </TabsList>
              {/* Overflow-fade hint (see `useEdgeOverflow`'s doc comment) — a
                  thin gradient over the strip's own background at whichever
                  edge still has unscrolled tabs, `aria-hidden` and
                  `pointer-events-none` so it never intercepts a click/touch
                  meant for the trigger beneath it. */}
              {!tabStripOverflow.atStart ? (
                <div
                  aria-hidden="true"
                  className="pointer-events-none absolute inset-y-0 start-0 w-8 bg-gradient-to-r from-card to-transparent"
                />
              ) : null}
              {!tabStripOverflow.atEnd ? (
                <div
                  aria-hidden="true"
                  className="pointer-events-none absolute inset-y-0 end-0 w-8 bg-gradient-to-l from-card to-transparent"
                />
              ) : null}
            </div>
            {actions ? (
              <div className="flex justify-end px-section py-inline">
                <Toolbar gap="inline">{actions}</Toolbar>
              </div>
            ) : null}
            {visibleTabs.map((tab) => (
              // The tab BODY sits on `Surface/Minimal` (#f9fafb = `bg-muted`) so
              // the frame's white cards read as raised against it; the strip
              // above stays white. This is the pane that scrolls (the rail has
              // its own scrollport, and `ProfileStack`'s body no longer scrolls).
              <TabsContent
                key={tab.id}
                value={tab.id}
                className="fams-scroll-region min-h-0 flex-1 overflow-y-auto bg-muted p-section"
              >
                {renderTabBody(tab)}
              </TabsContent>
            ))}
          </Tabs>
        ) : (
          <div className="p-section text-body-sm text-muted-foreground">No sections available.</div>
        )}
      </div>
      </div>
    </MapGuardScopeProvider>
  )
}

EntityProfile.displayName = 'EntityProfile'
