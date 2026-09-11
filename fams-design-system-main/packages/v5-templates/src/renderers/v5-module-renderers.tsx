import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import {
  AlertTriangle,
  CheckCircle,
  CheckCircle2,
  Clock,
  FileText,
  Flag,
  Hourglass,
  LoaderCircle,
  RotateCw,
  Ticket,
  type LucideIcon,
} from '@fams/ui-kit/icons'
import { toast, initialsFrom } from '@fams/ui-kit'
import { VehicleIcon3D, type VehicleIcon3DArt } from '@fams/ui-kit/VehicleIcon3D'
import {
  WORKFORCE_AVATAR_ART,
  WORKFORCE_AVATAR_ART_H,
  WORKFORCE_AVATAR_ART_W,
  resolveWorkforceArtStatus,
  type WorkforceStatusKey,
} from '../views/live/workforce-avatar-art'
import { deriveSummaryTiles, DisplayNameProvider, LinkedRecordProvider } from '@fams/v5-composer'
import type {
  EntityConfig,
  EntityRecord,
  LinkedRecordTarget,
  ModuleRenderContext,
  ModuleRenderer,
  RendererRegistry,
  UserContext,
  ViewSpec,
} from '@fams/v5-composer'
import type { ImageGalleryImage, IconBadgeTone, UploadedFile } from '@fams/ui-kit'
import { DashboardModuleSurface } from '../views/DashboardView'
import { InboxModuleSurface, type InboxModuleSurfaceProps } from '../inbox/InboxModuleSurface'
import type { ListViewSummaryTile } from '../views/ListView'
import { ModuleView } from '../views/ModuleView'
import { TaskDetail, type TaskDetailTabRenderer } from '../views/TaskDetail'
import type {
  TaskDetailAdditionalInfoProps,
  TaskDetailAttachmentsProps,
  TaskDetailChecklistProps,
} from '../views/TaskDetailAdditionalInfo'
import { EntityProfile } from '../entity-profile/EntityProfile'
import type { EntityProfileTag, ProfileTabRenderer } from '../entity-profile/EntityProfile.types'
import { ModuleRecordsProvider } from '../entity-profile/module-records'
import { ProfileStack, type ProfileStackItem } from '../entity-profile/ProfileStack'
import { useDetailStack } from '../entity-profile/useDetailStack'
import { CreationSheet } from '../creation-sheet/CreationSheet'
import { announceDenied } from '../views/kanban/announce-denied'
import { referenceDisplayNameMap, referenceOptionsFor } from './reference-records'

/**
 * v5TemplateRenderers — the DEFAULT renderer registry that plugs the v5 template
 * components into the composer's `<ComposedModule>` low-code path. [tier-2]
 *
 * The composer core stays template-agnostic: its module-type registry names the
 * templates by CONTRACT REF only (`ListView` / `KanbanView` / …), and
 * `resolvePrimaryTemplateRef` picks the ref for a module's first view. This map
 * binds every one of those primary refs to a SINGLE module-surface renderer —
 * so the exact same `<ComposedModule blueprint={…} data={…} renderers={v5TemplateRenderers}/>`
 * call renders an entity module (ListView/Hybrid + EntityProfile + CreationSheet)
 * OR a pipeline module (Kanban + TaskDetail), chosen purely from the blueprint's
 * `type`. Switching blueprints re-renders the whole module with ZERO component
 * code differences — that's the phase-2 review gate.
 *
 * The surface reads and writes exclusively through the injected `DataAdapter`
 * (a composer `ModuleHandle` in practice), so RBAC + rule-enforced moves happen
 * on the composer's guarded path — the templates never see a rule.
 *
 * NOTE: the map-primary entity ref (`MapView`) is intentionally NOT wired here —
 * the MapPanel lives in the heavy `@fams/v5-templates/map` entry, so a
 * map-first module falls through to the composer's placeholder rather than
 * dragging the map stack into every consumer. Wire it explicitly if needed.
 */

/* ── Config resolution ──────────────────────────────────────────────────────── */

/**
 * Pull the runtime `EntityConfig` off a resolved module blueprint. In the
 * low-code path the app hands `<ComposedModule>` a blueprint whose `config` is
 * the inline module-config object (path strings are resolved by the bundle
 * loader upstream). The authored blueprint config is a structural superset of
 * the runtime `EntityConfig`, so this is a safe narrowing.
 */
function resolveConfig(module: ModuleRenderContext['module']): EntityConfig | undefined {
  const config = module.config
  if (config && typeof config === 'object') return config as unknown as EntityConfig
  return undefined
}

/**
 * Naive English-plural → singular lexical transform — "Tickets" → "Ticket",
 * "Deals" → "Deal", "Companies" → "Company". NOT a business-word lookup
 * table (root CLAUDE.md rule 10 bans hardcoded business vocabulary in shared
 * props, not a generic string transform): every blueprint's `module.label`
 * is authored as the PLURAL module name, but the header's record-type chip
 * (figma-spec-detail.md §2's `[icon] TICKET` chip) and the record-tab strip's
 * overline (figma-spec-nav §4) both want the plain singular word next to the
 * record's own id — no blueprint field carries that singular form today (no
 * `EntityConfig`/`ModuleBlueprint` field for it), so this is the pragmatic
 * generic derivation until one exists. Regular plurals only; an irregular
 * plural module label (e.g. "Geese") just renders unchanged rather than
 * guessing wrong.
 */
function singularize(label: string): string {
  if (/ies$/i.test(label)) return label.replace(/ies$/i, 'y')
  if (/s$/i.test(label) && !/ss$/i.test(label)) return label.replace(/s$/i, '')
  return label
}

/**
 * The blueprint's own singular entity-type word — for the header's id-
 * adjacent type chip (figma-spec-detail.md §3.1's `[icon] INCIDENT` chip),
 * which wants the plain entity noun ("Incident"), never the module's plural
 * DISPLAY name ("Incidents Management"). Every blueprint `code` is authored
 * as `<module-slug>/<entity-type>` (e.g. `incidents/incident`,
 * `rain-sensors/sensor`, `live-monitoring/vehicle`, `inbox/notification` —
 * confirmed across every UCCP module) — the segment after the last `/` IS
 * that singular word, so this reads it generically off the blueprint rather
 * than lexically guessing at `module.label` (root CLAUDE.md rule 10: no
 * hardcoded/guessed business vocabulary). Falls back to `singularize(name)`
 * for a `code` authored without a `/` segment, so an older/malformed
 * blueprint degrades instead of crashing.
 */
function entityTypeOf(config: Pick<EntityConfig, 'code' | 'name'>): string {
  const code = config.code ?? ''
  const slug = code.includes('/') ? code.slice(code.lastIndexOf('/') + 1) : ''
  if (slug) return slug.replace(/[-_]+/g, ' ')
  return singularize(config.name ?? '')
}

/** A single uppercase initial from a record's title — delegates to
 *  `Avatar`'s own `initialsFrom` (consolidated 2026-08-31: this used to
 *  re-derive a separate two-letter "first + last word" monogram in
 *  parallel, which drifted out of sync the moment the platform-wide
 *  single-initial fix landed on `Avatar` and not here) so the identity-panel
 *  fallback never renders an empty tenant-colored rectangle when no
 *  `image`/`avatarFallback` is wired, and always agrees with every other
 *  text/initials avatar on the platform. */
function initialsFromTitle(title: unknown): string | undefined {
  const text = typeof title === 'string' ? title.trim() : ''
  if (!text) return undefined
  return initialsFrom(text) || undefined
}

/**
 * `EntityProfile.tags` from the record's own generic `tags` key (a plain
 * string list — no systemcolumn descriptor required, same "read straight off
 * `EntityRecord`'s open index signature" pattern `additionalInfoOf` already
 * uses below) — was never read at all (finding: the Figma "colored tag
 * pills + grey +" row under the id never appeared, even for a record seeded
 * with `tags`). Returns `undefined` (no row at all) only when the record has
 * NO `tags` key — an EMPTY array still returns `[]` rather than `undefined`,
 * distinguishing "this record supports tags, there are just none yet" (add-tag
 * `+` should still show) from "this record has no tags concept" (nothing
 * renders). `EntityProfile`'s own "omit → no row" contract holds for the
 * latter case only.
 */
function tagsFromRecord(rec: EntityRecord): EntityProfileTag[] | undefined {
  const raw = (rec as Record<string, unknown>).tags
  if (!Array.isArray(raw)) return undefined
  return raw.map((tag, index) => ({ id: `${index}-${String(tag)}`, label: String(tag) }))
}

/** The valid `VehicleIcon3D` illustration keys — kept here (not imported)
 *  since this is the one place that validates an arbitrary record value
 *  against them before trusting it as a prop. */

const VEHICLE_ICON_3D_ARTS: readonly VehicleIcon3DArt[] = ['car', 'tanker']

/**
 * `EntityProfile.art` from the record's own generic `icon3dArt` key — the
 * same "read straight off `EntityRecord`'s open index signature, no
 * systemcolumn descriptor required" pattern `tagsFromRecord` above uses for
 * `tags`. Renders the existing `VehicleIcon3D` illustration (already
 * entity-agnostic — `'car'` for passenger vehicles, `'tanker'` for tank
 * trucks) scaled up to fill the identity rail's ~200px art tile. Returns
 * `undefined` for a missing/unrecognized key so `EntityProfile`'s own
 * "omit → fall through to `placeholderIcon`/`avatarFallback`" contract still
 * holds for modules that never seed the field.
 */
function heroArtFromRecord(rec: EntityRecord): ReactNode | undefined {
  const raw = (rec as Record<string, unknown>).icon3dArt
  if (typeof raw !== 'string') return undefined
  // `"workforce"` — a PERSON record's rail art: the same vendored
  // avatar/status-coin illustration the Live map popup and the mixed list's
  // NAME cell already render (`views/live/workforce-avatar-art.ts`, the
  // light-barrel copy — this module renders unconditionally and may not
  // reach the lazy `../map/` entry). The coin colour is picked by the SAME
  // `resolveWorkforceArtStatus` classifier those surfaces use, so a Field
  // Inspector's rail art and their map pin can never disagree.
  if (raw === 'workforce') {
    const status = String((rec as Record<string, unknown>).workforceArtStatus ?? '') as WorkforceStatusKey
    const designation = (rec as Record<string, unknown>).designation
    const key = resolveWorkforceArtStatus(
      status in WORKFORCE_AVATAR_ART ? status : 'not-clocked-in',
      typeof designation === 'string' ? designation : undefined,
    )
    return (
      <img
        src={WORKFORCE_AVATAR_ART[key]}
        width={WORKFORCE_AVATAR_ART_W * 3.4}
        height={WORKFORCE_AVATAR_ART_H * 3.4}
        alt=""
        aria-hidden="true"
        draggable={false}
        className="block"
      />
    )
  }
  if (!VEHICLE_ICON_3D_ARTS.includes(raw as VehicleIcon3DArt)) return undefined
  return <VehicleIcon3D art={raw as VehicleIcon3DArt} size={168} />
}

/**
 * A raw seed shape for one checklist item — `done` maps to the default
 * checked/unchecked `ChecklistItemState` pair `TaskDetailAdditionalInfo`
 * falls back to when the caller passes no `states`.
 */
interface AdditionalInfoChecklistItemSeed {
  id: string
  label: string
  description?: string
  done?: boolean
}

/**
 * Derives `TaskDetail`'s `additionalInfo` prop from GENERIC extra keys on the
 * record — `description` / `checklist` / `attachments` / `images` — the same
 * "read straight off `EntityRecord`'s open index signature, no systemcolumn
 * descriptor required" pattern the app-layer's `timelineEvents`/`comments`
 * tab renderers already use (`profile-tabs.tsx`). No pipeline module needs a
 * new field TYPE or schema change to get a populated Additional Info section —
 * it only needs to seed these plain keys on its records. Every sub-block is
 * independently optional; a module/record with none of these keys renders no
 * Additional Info section at all (rule 8: state-agnostic, no fetch, derived
 * purely from the `EntityRecord` already in hand).
 */
function additionalInfoOf(
  rec: EntityRecord,
  checklistOverride?: Record<string, string>,
  onChecklistToggle?: (itemId: string, stateId: string) => void,
): TaskDetailAdditionalInfoProps | undefined {
  const r = rec as Record<string, unknown>

  const description = typeof r.description === 'string' && r.description.length ? r.description : undefined

  const checklistSeed = Array.isArray(r.checklist) ? (r.checklist as AdditionalInfoChecklistItemSeed[]) : undefined
  const checklist: TaskDetailChecklistProps | undefined = checklistSeed?.length
    ? {
        items: checklistSeed.map((item) => ({ id: item.id, label: item.label, description: item.description })),
        // Seed defaults, overridden by any locally-toggled state (see
        // `checklistOverrides` below) — a toggled item stays toggled across
        // re-renders of this record without needing store persistence
        // (finding B1: checklist items must be interactive; the demo has no
        // write-back seam for this yet, so state lives in this component).
        value: {
          ...Object.fromEntries(checklistSeed.map((item) => [item.id, item.done ? 'checked' : 'unchecked'])),
          ...checklistOverride,
        },
        onToggle: onChecklistToggle,
      }
    : undefined

  const attachmentFiles = Array.isArray(r.attachments) ? (r.attachments as UploadedFile[]) : undefined
  const attachments: TaskDetailAttachmentsProps | undefined = attachmentFiles?.length
    ? { files: attachmentFiles }
    : undefined

  const images = Array.isArray(r.images) ? (r.images as ImageGalleryImage[]) : undefined

  if (!description && !checklist && !attachments && !images?.length) return undefined
  return { description, checklist, attachments, images: images?.length ? images : undefined }
}

/**
 * Small, generic named-icon vocabulary for `uiConfig.listSummary` tiles
 * (figma-spec-list.md §2) — the same "opt in by name, degrade gracefully on
 * a miss" contract `creation-sheet/widgets.tsx`'s `NAMED_ICON` already uses
 * for field icons. Never business-specific: the NAMES are generic glyph
 * concepts, what a blueprint attaches them to is the blueprint's business.
 */
const SUMMARY_TILE_ICON: Record<string, LucideIcon> = {
  'check-done-01': CheckCircle2,
  'hourglass-03': Hourglass,
  'check-circle': CheckCircle,
  'alert-triangle': AlertTriangle,
  clock: Clock,
  // An in-progress / spinner glyph. Static by design: the tile shows a
  // COUNT, so animating it would signal work in flight that is not
  // happening.
  loading: LoaderCircle,
  // Added for incidents' Critical / Reopened KPI tiles (2026-08-31 P0): both
  // rendered with NO icon because the blueprint's names weren't in this map
  // (a miss here degrades silently — `t.icon ? SUMMARY_TILE_ICON[t.icon] :
  // undefined` — by design, so a typo never crashes the tile, but it also
  // means nobody saw an error). Registry names (`registry.ts`): `flag-01`.
  'flag-01': Flag,
  'refresh-cw-01': RotateCw,
}

/**
 * Blueprint-driven list-view stat tiles (figma-spec-list.md §2) — the React
 * half of `uiConfig.listSummary`'s derivation. `deriveSummaryTiles`
 * (`@fams/v5-composer`, pure TS) computes each tile's `value` from
 * `records`; this maps its plain-string `icon`/`tone` onto the real
 * `LucideIcon`/`IconBadgeTone` `ListView.summaryTiles` needs. Returns `[]`
 * (no stat-card row) when the config carries no `listSummary`.
 */
function useSummaryTiles(config: EntityConfig, records: EntityRecord[]): ListViewSummaryTile[] {
  return useMemo(
    () =>
      deriveSummaryTiles(config, records).map((t) => ({
        id: t.id,
        label: t.label,
        value: t.value,
        icon: t.icon ? SUMMARY_TILE_ICON[t.icon] : undefined,
        tone: t.tone as IconBadgeTone | undefined,
        iconColor: t.iconColor,
        iconBg: t.iconBg,
      })),
    [config, records],
  )
}

function ConfigError({ label }: { label: string }): ReactNode {
  return (
    <div
      data-composer-placeholder=""
      role="note"
      className="rounded-sm border border-dashed border-border p-section text-muted-foreground"
    >
      <strong>{label}</strong>
      <span> — the module blueprint has no inline config object to render from.</span>
    </div>
  )
}

/* ── The module surface ─────────────────────────────────────────────────────── */

export interface V5ModuleSurfaceProps {
  ctx: ModuleRenderContext
  /**
   * The current user — threaded from the app so profile/task tab visibility and
   * status tones can react to it. RBAC on data itself is enforced inside the
   * `DataAdapter` (the composer `ModuleHandle`), not here.
   */
  userContext?: UserContext
  /** Right-panel tab bodies for the entity profile (by blueprint component name). */
  profileTabRenderers?: Record<string, ProfileTabRenderer>
  /** Right-panel tab bodies for the pipeline TaskDetail (by blueprint component name). */
  taskTabRenderers?: Record<string, TaskDetailTabRenderer>
  /**
   * Resolves an Assignee-field raw value (a user id) to a display name —
   * threaded straight through to `ModuleView`'s toolbar Assignee dropdown.
   * Omit to show raw ids (finding: dropdown showed raw ids like `u_admin`).
   */
  resolveAssigneeName?: (id: string) => string | undefined
  /**
   * The same id→display resolvers for the Assignee panel's secondary line (an
   * email) and photo, threaded through to `ModuleView`. Both optional — a host
   * that only knows names keeps today's single-line rows.
   */
  resolveAssigneeDetail?: (id: string) => string | undefined
  resolveAssigneeAvatarUrl?: (id: string) => string | undefined
  /**
   * Resolves a `PersonView`-named identity detail row's raw reference id
   * (e.g. a Contractor field's `SingleReference` to `workforce/driver`) to a
   * display name — threaded straight through to `EntityProfile`'s prop of
   * the same name. Omit to show the raw id (finding: the Contractor row
   * showed a driver's id like `WCR-01` instead of their name).
   */
  resolvePersonName?: (id: string) => string | undefined
  /**
   * Entry deep-link seam: called once on mount with the module's `code` —
   * return a record id to auto-open that record's detail surface (the
   * inverse of the inbox's `onOpenInboxRecord`: the app navigates to the
   * module carrying a record id, this surface opens it). Return `undefined`
   * for the normal list-first render. The app typically reads its router's
   * search param here (rule 8: the surface never touches routing itself).
   */
  getEntryRecordId?: (moduleCode: string) => string | undefined
  /**
   * Resolves a LINKED record — the seam that makes cross-module navigation
   * work. Given a reference's `entityType` + id (both authored on the field,
   * see `LinkedRecordTarget`), the app returns everything this surface needs
   * to render that record's OWN detail sheet on top of the current one:
   * its module's resolved config, the record, and which detail flavor it
   * opens in (`'pipeline'` → Task Detail, `'entity'` → Entity Detail).
   *
   * Rule 8: the surface owns the STACK, the app owns the DIRECTORY. Only the
   * app knows which module a `crm/company` code belongs to, whether that
   * module is a pipeline, and how to read one of its records — this surface
   * knows none of that and must not guess it.
   *
   * Omit and every reference cell stays inert, exactly as before this seam
   * existed.
   */
  resolveLinkedRecord?: (target: LinkedRecordTarget) => LinkedRecordResolution | undefined
  /**
   * Resolves ANOTHER module's full config + record set by its `code` — the
   * bulk counterpart to `resolveLinkedRecord` (which fetches one record).
   * Currently used for the Live Monitoring map's Incidents overlay
   * (`uiConfig.map.incidentsModule` names the incidents module's `code`;
   * this surface fetches its config/records and hands them to `ModuleView`
   * as the overlay's pins + panel cards) — a generic seam, not an
   * incidents-specific one, so a later cross-module map overlay reuses it
   * rather than growing a second bespoke prop. Rule 8: the surface owns the
   * STACK/rendering, the app owns the DIRECTORY (which code maps to which
   * module's records) — this surface never guesses it. Omit and no module
   * declares/renders a cross-module overlay, exactly as before this seam
   * existed.
   */
  resolveModuleRecords?: (code: string) => { config: EntityConfig; records: EntityRecord[] } | undefined
  /**
   * Wraps a pipeline `TaskDetail` field's rendered value — the seam a host
   * uses for a ClickUp-style inline-edit affordance (hover reveals a pencil
   * at the end of the value, click opens a field-anchored quick-edit popup)
   * instead of a separate action button. A generic injection point, like
   * `tabRenderers`: this surface has no opinion on which fields are
   * editable or what a quick-edit control looks like (e.g. "Assigned
   * Inspector" is Requests & Complaints vocabulary, not something this
   * cross-tenant renderer should know about) — it only hands the host the
   * rendered value plus the same guarded write seams (`data.update`/
   * `data.move`) every other mutation on this surface already goes
   * through, so a host's quick-edit commits through the SAME optimistic-
   * buffer + rule-gated path as a Kanban drag or the "Change Status"
   * dropdown, not a side channel. Applies to BOTH the top field grid and
   * every section's default FieldGrid (`TaskDetail`'s own `toFields`, one
   * derivation path for both). Omit → every value renders unchanged,
   * exactly as before this seam existed.
   */
  wrapFieldValue?: (ctx: {
    config: EntityConfig
    record: EntityRecord
    col: string
    value: ReactNode
    /** Patches fields on THIS record (never `status` — use `onTransition`). */
    onSave: (patch: Record<string, unknown>) => void
    /** Moves THIS record to another stage through the rule-gated adapter. */
    onTransition: (to: string) => void
  }) => ReactNode
  /**
   * Overrides the pipeline `TaskDetail` header's id-adjacent type chip (the
   * `entityTypeOf`-derived static entity noun, e.g. "INCIDENT") with a
   * RECORD-derived label + icon — e.g. a module whose records carry their
   * own type taxonomy on a field (Request vs Complaint) wants the chip to
   * reflect the record's actual value, not the module's fixed entity word.
   * Return `undefined` for a record this host has no opinion on — the chip
   * falls back to the existing static `entityTypeOf(config)` behavior,
   * exactly as before this seam existed.
   */
  recordTypeOf?: (record: EntityRecord, config: EntityConfig) => { label: ReactNode; icon?: ReactNode } | undefined
}

/** What a host returns for a `resolveLinkedRecord` hit — see that prop. */
export interface LinkedRecordResolution {
  /** The target module's resolved config (drives fields, tabs, layout). */
  config: EntityConfig
  /** The target record. */
  record: EntityRecord
  /**
   * The target module's TYPE — the ONLY thing that picks the detail flavor,
   * exactly as it does for the module's own records (`module.type`). A
   * pipeline record must open as Task Detail even when it was reached from
   * an entity module, and vice versa.
   */
  moduleType?: string
  /** The target module's label, for the record tab's overline. */
  moduleLabel?: string
}

/**
 * The one component behind every template ref in `v5TemplateRenderers`. It hosts
 * a `ModuleView` (which itself picks List/Kanban/Hybrid from the blueprint view
 * kinds) plus the record detail surface (`EntityProfile` for entities,
 * `TaskDetail` for pipelines) opened through `useDetailStack`, plus a
 * `CreationSheet` behind the toolbar's "New" action.
 */
/**
 * A stack entry, plus the LINKED target it was opened from (absent for the
 * module's own records). One stack holds both kinds, which is what makes
 * minimize/close-all/close-returns-beneath identical across modules.
 */
type StackItem = ProfileStackItem & { linked?: LinkedRecordTarget }

export function V5ModuleSurface({
  ctx,
  userContext,
  profileTabRenderers,
  taskTabRenderers,
  resolveAssigneeName,
  resolveAssigneeDetail,
  resolveAssigneeAvatarUrl,
  resolvePersonName,
  getEntryRecordId,
  resolveLinkedRecord,
  resolveModuleRecords,
  wrapFieldValue,
  recordTypeOf,
}: V5ModuleSurfaceProps): ReactNode {
  const { module, data } = ctx
  const config = resolveConfig(module)
  const isPipeline = module.type === 'pipeline'
  const views = (module.views && module.views.length ? module.views : ['list']) as ViewSpec[]

  // The in-memory store mutates in place; bump `rev` after a write to re-list.
  const [rev, setRev] = useState(0)
  const bump = useCallback(() => setRev((r) => r + 1), [])
  // Clone `list()`'s result: the in-memory adapter returns the SAME array
  // identity across writes (mutated in place), so downstream `useMemo`s
  // keyed on `records` (e.g. the cockpit queue derivation) never saw a
  // created record even though `rev` re-ran this memo (round-1 finding:
  // created job appeared in KPI sheets — rendered live — but never as a
  // queue card). A fresh array identity per `rev` makes every derived memo
  // recompute.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const records = useMemo(() => (config ? [...data.list()] : []), [data, config, rev])

  /**
   * `id -> display label` for every record any reference column on THIS
   * module's config might point to (`referenceDisplayNameMap`,
   * `./reference-records`) — the generic fallback `resolveDisplayName` below
   * reaches for once neither people directory resolves an id. Recomputed on
   * `rev` (this surface's own write counter) so a record created THIS
   * SESSION — via this surface's own create, or via another module's
   * automation writing a reference back onto one of this module's records —
   * is found the moment the write that introduced the reference lands,
   * exactly like `records`/`creationReferenceOptions` above already
   * recompute on the same signal.
   */
  const referenceDisplayNames = useMemo(
    () => referenceDisplayNameMap(config, resolveModuleRecords),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [config, resolveModuleRecords, rev],
  )

  /**
   * The app's ONE identity directory for this surface: an `Assignee` field
   * stores a user id, a `SingleReference` identity field stores a record id,
   * and both land in the same `PersonView`/`ReadAssignee` renderers. Try the
   * user directory first, then the person one, then this module's own
   * reference map (any non-person target module, e.g. a preventive-
   * maintenance rule's automation writing back a `linkedJobOrder`
   * reference) — whichever resolves wins; `undefined` leaves the raw id,
   * the pre-existing behaviour for an id none of the three seams recognize.
   */
  const resolveDisplayName = useCallback(
    (id: string) => resolveAssigneeName?.(id) ?? resolvePersonName?.(id) ?? referenceDisplayNames.get(id),
    [resolveAssigneeName, resolvePersonName, referenceDisplayNames],
  )

  const summaryTiles = useSummaryTiles(config ?? ({ uiConfig: {} } as EntityConfig), records)
  const groupedColumnOrder = config?.uiConfig.listGroupedColumns
  const creationConfig = config?.uiConfig.creation
  const createLabel = creationConfig?.label ?? 'Create New'

  const stack = useDetailStack<StackItem>()
  const [creating, setCreating] = useState(false)
  // Prefill for the NEXT create (e.g. the date a calendar day cell reported,
  // SPEC row 33). Keyed onto the sheet below so a reopen actually adopts it —
  // `CreationSheet` captures its defaults once per mount.
  const [createPrefill, setCreatePrefill] = useState<Record<string, unknown> | undefined>(undefined)
  const startCreate = useCallback((prefill?: Record<string, unknown>) => {
    setCreatePrefill(prefill)
    setCreating(true)
  }, [])
  // Recomputed on every open (`creating` in the deps): a referenced module's
  // records can change between opens (e.g. a vehicle created in its own
  // module since the last time this sheet was opened) and `resolveModuleRecords`
  // always reads the live store, so staying fresh costs nothing here.
  const creationReferenceOptions = useMemo(
    () => referenceOptionsFor(config, resolveModuleRecords),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [config, resolveModuleRecords, creating],
  )
  // Local, ephemeral checklist toggle state per record (finding B1) — no
  // persistence seam exists in this demo yet, so a toggle only survives for
  // the lifetime of this component (rule 8: local UI state, not a store).
  const [checklistOverrides, setChecklistOverrides] = useState<Record<string, Record<string, string>>>({})
  const onChecklistToggle = useCallback(
    (recordId: string) => (itemId: string, stateId: string) => {
      setChecklistOverrides((prev) => ({
        ...prev,
        [recordId]: { ...prev[recordId], [itemId]: stateId },
      }))
    },
    [],
  )
  // Same shape as `checklistOverrides` above, for the entity-profile identity
  // rail's add-tag popover (`EntityProfile.onAddTag`/`onRemoveTag`) — a tag
  // added/removed only survives for the lifetime of this component, no
  // persistence seam exists in this demo. Keyed by record id, seeded lazily
  // off `tagsFromRecord` the first time a record is touched (below).
  const [tagOverrides, setTagOverrides] = useState<Record<string, EntityProfileTag[]>>({})
  const addTag = useCallback((recordId: string, base: EntityProfileTag[] | undefined, label: string) => {
    setTagOverrides((prev) => {
      const current = prev[recordId] ?? base ?? []
      return { ...prev, [recordId]: [...current, { id: `local-${recordId}-${current.length}-${Date.now()}`, label }] }
    })
  }, [])
  const removeTag = useCallback((recordId: string, base: EntityProfileTag[] | undefined, tagId: string) => {
    setTagOverrides((prev) => {
      const current = prev[recordId] ?? base ?? []
      return { ...prev, [recordId]: current.filter((tag) => tag.id !== tagId) }
    })
  }, [])
  // `EntityProfile.onRecordChange` (the Details tab's `RecordSectionsGrid`
  // Save) — the changed field VALUES for a record, merged over its seed on
  // render (below) so the rail's own key/value rows (driven by the SAME field
  // keys via `uiConfig.profile.details`) pick up an edit too, not just the
  // Details tab that made it.
  //
  // It ALSO writes through `data.update` — the same guarded seam this
  // surface's every other mutation already uses (`onTaskTransition`, the
  // task-detail field edits at `data.update?.(rec.id, patch)` below, `move`,
  // `remove`, `create`). Until 2026-09-05 this handler wrote ONLY the local
  // override map, so the profile's Edit form looked like it saved — the new
  // value rendered immediately — while nothing reached the adapter: the edit
  // vanished on reload, never appeared in any other surface reading the same
  // record, and never triggered anything downstream of a write (it is what
  // made a blueprint-declared `uiConfig.recordAutomation` on an entity module
  // silently never fire, since the automation hangs off `adapter.update`).
  // A control that appears to persist and does not is exactly the failure the
  // interaction-QA contract calls a P0, so the write-through is not optional.
  //
  // The local override is KEPT rather than replaced: it is what re-renders the
  // identity rail immediately, and it is the graceful degradation for a
  // persona whose adapter exposes no `update` at all (privilege-gated), where
  // the form would otherwise silently discard its own input.
  const [detailOverrides, setDetailOverrides] = useState<Record<string, Record<string, unknown>>>({})
  const applyRecordChange = useCallback(
    (recordId: string, values: Record<string, unknown>) => {
      setDetailOverrides((prev) => ({ ...prev, [recordId]: { ...prev[recordId], ...values } }))
      data.update?.(recordId, values)
      bump()
    },
    [data, bump],
  )

  const openRecord = useCallback(
    (rec: EntityRecord) => {
      // The record-tab strip's overline (figma-spec-nav §4; figma-spec-
      // detail.md §1's "Tickets Reporting" caption) — was hardcoded to the
      // literal `'Deal'` for EVERY pipeline module (finding: a ticketing
      // record's tab showed "Deal" instead of the module's own name) — now
      // the module's own (plural/full) label, so it reads correctly
      // regardless of which pipeline blueprint is open.
      const category = isPipeline ? module.label : (config?.name ?? 'Record')
      stack.pushDetail({
        id: rec.id,
        // Record id/uid first (figma-spec-detail.md §2 window-chrome tab:
        // the compact tab label is the record id, e.g. `IN#123456`, not the
        // full title) — falls back to the title for a record with no uid.
        title: rec.uniqueidentifier ?? rec.title ?? rec.id,
        category,
        // A generic module glyph, not a person avatar (finding: tab strip
        // showed an avatar circle + broken icon for a non-person record) —
        // varies only by module TYPE (pipeline vs entity), never business
        // vocabulary.
        icon: isPipeline ? <Ticket aria-hidden className="size-4" /> : <FileText aria-hidden className="size-4" />,
      })
    },
    [stack, isPipeline, config, module.label],
  )

  /**
   * Open a LINKED record — the doctrine's "opening a linked record from
   * inside a sheet stacks a new sheet on top".
   *
   * It is the SAME `stack.pushDetail` the module's own row click uses, so
   * minimize, close-all, the tab strip and close-returns-to-the-one-beneath
   * are identical whichever module or flavor the record came from — there is
   * one stack, not a foreign-record special case. The only difference is that
   * the item carries its `linked` target, which `renderProfile` resolves back
   * to the target module's own config/record/flavor.
   *
   * The id is namespaced by entity type: two modules may legitimately use the
   * same record id, and `useDetailStack` dedupes by id alone.
   */
  const openLinkedRecord = useCallback(
    (target: LinkedRecordTarget) => {
      const resolved = resolveLinkedRecord?.(target)
      if (!resolved) return
      const targetIsPipeline = resolved.moduleType === 'pipeline'
      stack.pushDetail({
        id: `${target.entityType}:${target.recordId}`,
        title: resolved.record.uniqueidentifier ?? resolved.record.title ?? target.recordId,
        category: resolved.moduleLabel ?? resolved.config.name,
        icon: targetIsPipeline ? <Ticket aria-hidden className="size-4" /> : <FileText aria-hidden className="size-4" />,
        linked: target,
      })
    },
    [resolveLinkedRecord, stack],
  )

  /**
   * The Live Monitoring map's Incidents overlay (`uiConfig.map.incidentsModule`
   * — the vehicles blueprint naming the incidents module's `code`). Resolved
   * once per module switch, exactly like every other metadata-driven switch
   * on this surface: absent the key (or the host's `resolveModuleRecords`),
   * `ModuleView` gets no incidents props and renders exactly as before this
   * feature existed.
   */
  const incidentsModuleCode = (config?.uiConfig as { map?: { incidentsModule?: string } } | undefined)?.map
    ?.incidentsModule
  const incidentsOverlay = useMemo(
    () => (incidentsModuleCode && resolveModuleRecords ? resolveModuleRecords(incidentsModuleCode) : undefined),
    // `rev` isn't read directly, but the overlay's records come from the SAME
    // in-memory store `records` above re-lists from on every write — this
    // recomputes on the identical cadence so an incident create/edit doesn't
    // go stale on the map until an unrelated re-render happens to occur.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [incidentsModuleCode, resolveModuleRecords, rev],
  )
  // Card click → the incident's OWN detail sheet, stacked the same way any
  // other linked record opens (`openLinkedRecord`) — never a bespoke opener.
  const openIncident = useCallback(
    (record: EntityRecord) => {
      if (!incidentsOverlay) return
      openLinkedRecord({ entityType: incidentsOverlay.config.code, recordId: record.id })
    },
    [incidentsOverlay, openLinkedRecord],
  )

  // Entry deep-link (`getEntryRecordId` seam): open the record the app's
  // navigation carried in (e.g. an inbox card's referenced ticket) ONCE, on
  // mount — never again on later re-renders, so closing the detail stays
  // closed.
  const entryHandledRef = useRef(false)
  useEffect(() => {
    if (entryHandledRef.current || !getEntryRecordId || !config) return
    entryHandledRef.current = true
    const entryId = getEntryRecordId((config as { code?: string }).code ?? '')
    if (!entryId) return
    const rec = records.find((r) => r.id === entryId || r.uniqueidentifier === entryId)
    if (rec) openRecord(rec)
    // eslint-disable-next-line react-hooks/exhaustive-deps -- once on mount
  }, [])

  // Kanban guard + commit, both routed through the DataAdapter's guarded path.
  const canMove = useCallback(
    (recordId: string, _from: string, to: string): boolean =>
      (data.transitions?.(recordId) ?? []).includes(to),
    [data],
  )
  const onMove = useCallback(
    (recordId: string, _from: string, to: string) => {
      try {
        data.move?.(recordId, to)
        bump()
      } catch {
        // KanbanView's own `canMove` guard already blocks most illegal moves
        // client-side before `onMove` ever fires; a throw here means the
        // composer's rule-enforced write denied it anyway (e.g. a rule the
        // optimistic client-side check couldn't see). Wire the same
        // denied-move feedback path KanbanView defaults to — a polite
        // (`role="status"`, not assertive) live-region announce, via the
        // SHARED `announceDenied` helper (never a raw `announce()` call, so
        // every denial in this package speaks with one voice — see
        // `views/kanban/announce-denied.ts`) — instead of staying silent
        // (see `views/KanbanView.tsx`'s file header for the
        // chosen-UX-default rationale).
        announceDenied('Move not allowed: this stage change was rejected.')
      }
    },
    [data, bump],
  )

  /**
   * The DELETE seam for the shared `…` row menu and the bulk bar (UX notes
   * G.42/G.43). `ModuleView` renders no Delete affordance at all without this
   * — which is exactly what happened in round 1: the pipelines blueprint asked
   * for `rowActions.delete` + `bulkActions.delete`, nothing supplied this
   * callback, and Delete was silently absent from every lens. Rule 8 still
   * holds: the template owns the confirmation dialog, the app (here) owns the
   * mutation, and `DataAdapter.remove` is the adapter's own privilege-gated
   * write — an adapter that omits it (no delete privilege) correctly renders no
   * Delete, and `module-actions-config.ts` now warns loudly in dev when the
   * blueprint asked for one anyway.
   */
  const onDeleteRecords = useCallback(
    (recordIds: string[]) => {
      if (!data.remove) return
      let removed = 0
      for (const id of recordIds) if (data.remove(id)) removed += 1
      bump()
      if (removed > 0) {
        toast.success(
          removed === 1
            ? `${singularize(module.label)} deleted`
            : `${removed} ${module.label.toLowerCase()} deleted`,
        )
      }
    },
    [data, bump, module.label],
  )

  const onCreate = useCallback(
    (record: Record<string, unknown>) => {
      const created = data.create?.(record as Partial<EntityRecord>)
      setCreating(false)
      bump()
      // Perceivable success (UX MUST K.55/56) — sonner toasts are aria-live
      // polite; the app root's single `<Toaster/>` (`V5AppShell`) renders it
      // for EVERY module, not just the cockpit.
      toast.success(`${singularize(module.label)} created`, {
        description:
          created && typeof created === 'object' && 'uniqueidentifier' in created
            ? String((created as EntityRecord).uniqueidentifier)
            : undefined,
      })
    },
    [data, bump, module.label],
  )

  const onTaskTransition = useCallback(
    (id: string, to: string) => {
      try {
        data.move?.(id, to)
        bump()
      } catch {
        // Same rationale as `onMove` above — `TaskDetail` only offers
        // `allowedTransitions` as options, but a stale list or a rule change
        // between render and click can still get a denial back from the
        // guarded write. Announce (via the shared `announceDenied`, not a
        // raw `announce()` call) rather than a silent no-op.
        announceDenied('Move not allowed: this transition was rejected.')
      }
    },
    [data, bump],
  )

  if (!config) return <ConfigError label={module.label} />

  const renderProfile = (item: ProfileStackItem): ReactNode => {
    // A linked record belongs to ANOTHER module: its fields, tabs and detail
    // flavor come from that module's config, resolved live (never a snapshot
    // taken at push time, so an edit elsewhere is reflected).
    const linked = stack.items.find((i) => i.id === item.id)?.linked
    if (linked) {
      const resolved = resolveLinkedRecord?.(linked)
      if (!resolved) return null
      return renderDetail(resolved.config, resolved.record, resolved.moduleType === 'pipeline', undefined)
    }
    const rec = data.get(item.id)
    if (!rec) return null
    return renderDetail(config, rec, isPipeline, data.transitions?.(rec.id))
  }

  /**
   * ONE detail body for BOTH the module's own records and linked records from
   * any other module — flavor chosen purely by the target's module type, per
   * PLATFORM-MODEL's flavor table. Extracted from the old inline body so a
   * cross-module record cannot drift into a different layout than the same
   * record opened from its own module.
   */
  function renderDetail(
    detailConfig: EntityConfig,
    rec: EntityRecord,
    pipelineFlavor: boolean,
    allowedTransitions: string[] | undefined,
  ): ReactNode {
    if (pipelineFlavor) {
      const isOwnRecord = detailConfig.code === config?.code
      return (
        <TaskDetail
          config={detailConfig}
          record={rec}
          allowedTransitions={allowedTransitions}
          onTransition={(to) => onTaskTransition(rec.id, to)}
          wrapFieldValue={
            // Inline-edit only makes sense for a module's OWN record — a
            // linked record opened from elsewhere renders through ITS OWN
            // module surface in its own tab, which supplies its own
            // `wrapFieldValue` there; this stack entry is a read-mostly
            // cross-reference view (finding, same rationale `isOwnRecord`
            // already existed for: wiring `data.update`/`onTaskTransition`
            // here would silently write through THIS surface's adapter,
            // which is bound to the WRONG module's code for a linked
            // record).
            //
            // Also gated on the HOST actually supplying `wrapFieldValue`
            // (bug fix): only checking `isOwnRecord` unconditionally handed
            // `TaskDetail` a truthy wrapper function even when no host
            // callback was wired, and that wrapper's `wrapFieldValue?.(...)`
            // then resolved to `undefined` — which `TaskDetail` took as the
            // wrapped value, blanking every field. Omitting the prop
            // entirely when the host wires nothing keeps `TaskDetail` on
            // its own `wrapFieldValue ? … : rendered` fallback, so a
            // consumer with no edit affordance renders exactly the plain
            // read-only value, unchanged, as before this seam existed.
            isOwnRecord && wrapFieldValue
              ? ({ col, value }) =>
                  wrapFieldValue({
                    config: detailConfig,
                    record: rec,
                    col,
                    value,
                    onSave: (patch) => {
                      data.update?.(rec.id, patch)
                      bump()
                    },
                    onTransition: (to) => onTaskTransition(rec.id, to),
                  })
              : undefined
          }
          onRecordSave={
            // Same own-record gate as `wrapFieldValue` above: a linked
            // record's writes belong to ITS module surface, not this one.
            isOwnRecord
              ? (patch) => {
                  data.update?.(rec.id, patch)
                  bump()
                }
              : undefined
          }
          tabRenderers={taskTabRenderers}
          additionalInfo={additionalInfoOf(rec, checklistOverrides[rec.id], onChecklistToggle(rec.id))}
          userContext={userContext}
          // The header's id-adjacent type chip (figma-spec-detail.md §2's
          // `[icon] TICKET` chip) — was never passed at all (finding: only
          // the id chip rendered), then regressed to the module's PLURAL
          // display name ("Incidents Management" instead of "Incident") once
          // it was wired off `label` (QA round 2, P2-2) — the blueprint's own
          // singular entity-type word, read off `code`'s `<module>/<entity>`
          // convention, not a lexical guess off the display label. For a
          // LINKED record it is the TARGET module's entity type, not the
          // host's.
          recordType={recordTypeOf?.(rec, detailConfig)?.label ?? entityTypeOf(detailConfig)}
          recordTypeIcon={recordTypeOf?.(rec, detailConfig)?.icon}
        />
      )
    }
    // Local edits (Details-tab Save + identity-rail add/remove tag) merge
    // OVER the seed record here — a single merge point so every consumer
    // downstream (rail fields, tab bodies, the title itself) sees the same
    // edited value, not just whichever tab made the change.
    const baseTags = tagsFromRecord(rec)
    const effectiveRecord = detailOverrides[rec.id] ? { ...rec, ...detailOverrides[rec.id] } : rec
    return (
      <EntityProfile
        config={detailConfig}
        record={effectiveRecord}
        avatarFallback={initialsFromTitle(rec.title)}
        art={heroArtFromRecord(rec)}
        tags={tagOverrides[rec.id] ?? baseTags}
        onAddTag={baseTags !== undefined ? (label) => addTag(rec.id, baseTags, label) : undefined}
        onRemoveTag={baseTags !== undefined ? (tagId) => removeTag(rec.id, baseTags, tagId) : undefined}
        onRecordChange={(values) => applyRecordChange(rec.id, values)}
        tabRenderers={profileTabRenderers}
        userContext={userContext}
        resolvePersonName={resolvePersonName}
      />
    )
  }

  return (
    // Cross-module bulk-records seam for a registry-resolved tab body (e.g.
    // `ScopedLinkedRecords`) — mounted from the SAME already-injected
    // `resolveModuleRecords` prop this surface's own internal uses (creation-
    // sheet reference options, the Live Monitoring incidents overlay) already
    // read directly. No provider work happens here beyond threading the prop
    // into context: absent a resolver, `useModuleRecords()` returns
    // `undefined` and every consumer degrades to its own empty state, exactly
    // as before this seam existed.
    <ModuleRecordsProvider resolveModuleRecords={resolveModuleRecords}>
    {/* ONE provider around the whole surface is what makes every Assignee /
        PersonView cell — list column, detail row, kanban card footer — resolve
        its stored user id to a display name. Before this, only the toolbar
        Assignee dropdown got the resolver, so every other surface printed raw
        ids like `u_dispatcher` (finding A7b-1). */}
    <DisplayNameProvider resolve={resolveDisplayName}>
    {/* The activation seam for every `LinkView` reference cell on this
        surface — list columns, kanban cards, and (because it wraps the
        `ProfileStack` too) rows INSIDE an already-open sheet, which is what
        makes a linked record stack on top rather than replace. */}
    <LinkedRecordProvider onOpenLinkedRecord={resolveLinkedRecord ? openLinkedRecord : undefined}>
      <ModuleView
        config={config}
        records={records}
        views={views}
        context={{ userId: userContext?.id ?? 'composer', moduleId: module.id }}
        // No `title` here: `V5AppShell`'s `TopNav` already surfaces the
        // active module's label as the page brand (figma-spec-kanban.md §3
        // is ONE navbar row, module title + view tabs together) — passing
        // it again here rendered a second, redundant "Tickets" heading via
        // `ModuleViewShell`'s `PageHeader` (finding M2).
        // NOT an opaque `actions` node: `ModuleView`'s own create affordance is
        // the one that implements UX I.54's collapse order item 3 (glyph-only
        // below 1300px, keeping its accessible name and tooltip), and passing
        // `actions` outranks it — which is why round 1 measured the full
        // "Create New Task" label still at 1280. Going through
        // `onCreateRecord` also gives every LENS a create hook: the calendar's
        // day cells (SPEC row 33) and each empty state's create action were all
        // dead for want of this one prop.
        onCreateRecord={data.create ? startCreate : undefined}
        createLabel={createLabel}
        onOpenRecord={openRecord}
        incidentsConfig={incidentsOverlay?.config}
        incidentsRecords={incidentsOverlay?.records}
        onOpenIncident={incidentsOverlay ? openIncident : undefined}
        canMove={isPipeline ? canMove : undefined}
        onMove={isPipeline ? onMove : undefined}
        userContext={userContext}
        resolveAssigneeName={resolveAssigneeName}
        resolveAssigneeDetail={resolveAssigneeDetail}
        resolveAssigneeAvatarUrl={resolveAssigneeAvatarUrl}
        summaryTiles={summaryTiles}
        groupedColumnOrder={groupedColumnOrder}
        onDeleteRecords={data.remove ? onDeleteRecords : undefined}
      />

      <ProfileStack
        open={stack.items.length > 0 && !stack.minimized}
        // Esc/overlay dismiss is handled INSIDE `ProfileStack` as a one-record
        // pop; this only fires for a non-dismiss open change.
        onOpenChange={() => {}}
        items={stack.items}
        activeId={stack.activeId}
        onActivate={stack.activate}
        onClose={stack.closeDetail}
        onCloseAll={stack.closeAll}
        onMinimize={stack.minimize}
        // Pairing these two is what renders the docked restore affordance, so
        // an amber-minimized stack can be brought back instead of silently
        // reappearing under the next record the user opens.
        minimized={stack.minimized}
        onRestore={stack.restore}
        width="xl"
        renderProfile={renderProfile}
      />

      {data.create ? (
        <CreationSheet
          // Remounted per prefill: the sheet reads its defaults once at mount
          // and `form.reset()` restores THOSE, so a new prefill has to be a new
          // instance or the date the user clicked would be silently dropped.
          key={createPrefill ? JSON.stringify(createPrefill) : 'blank'}
          open={creating}
          onOpenChange={setCreating}
          config={config}
          // Was never passed at all — every `SingleReference`/`MultiReference`
          // (Assignee/Tags too, once populated the same way) field's picker
          // read `context?.referenceOptions ?? []`, permanently empty, so it
          // reported "No results" for every query regardless of what the
          // referenced module's own list held (see `referenceOptionsFor`
          // above this component).
          context={{ referenceOptions: creationReferenceOptions }}
          defaultValues={createPrefill}
          onSubmit={onCreate}
          // Was never passed — the sheet's own heading defaulted to `Create
          // ${config.name}` (e.g. "Create Tickets", the module's plural
          // name) even though `uiConfig.creation.label` already exists and
          // drives the TOOLBAR BUTTON'S text correctly (`createLabel`
          // above). Figma's create sheet uses the exact same string
          // ("Create New Ticket") for both the button and the sheet's own
          // heading, so an EXPLICIT label now drives both (finding, item 5)
          // — deliberately the raw optional, not `createLabel`'s defaulted
          // `'Create New'`, so a module with no custom label still falls
          // through to `CreationSheet`'s own module-name-derived default
          // rather than a generic string.
          title={creationConfig?.label}
          layout={creationConfig?.layout}
          fieldChrome={creationConfig?.fieldChrome}
          // The wizard's three authored knobs (`UiConfig.creation`), threaded
          // so a BLUEPRINT can reach them — the component has accepted all
          // three since wp3a/wp3d/wp3e, but nothing passed them here, so they
          // were reachable only from a React caller and not from metadata,
          // which is the platform's actual consumption model. `stepIcons`
          // carries icon NAMES (resolved by `CreationSheet` through
          // `FIELD_ICON_VOCABULARY`), because JSON cannot express a ReactNode.
          showSummaryStep={creationConfig?.showSummaryStep}
          stepperVariant={creationConfig?.stepperVariant}
          stepIcons={creationConfig?.stepIcons}
        />
      ) : null}
    </LinkedRecordProvider>
    </DisplayNameProvider>
    </ModuleRecordsProvider>
  )
}

V5ModuleSurface.displayName = 'V5ModuleSurface'

/* ── The renderer registry ──────────────────────────────────────────────────── */

/** `createV5TemplateRenderers` options — the per-surface props minus `ctx`. */
export interface V5TemplateRendererOptions extends Omit<V5ModuleSurfaceProps, 'ctx'> {
  /**
   * Notified after any inbox read/clear write — the app's cue to refresh
   * cross-module unread state (e.g. the nav rail's unread-dot indicator,
   * which must decrement in the same frame as a clear — UX-NOTES §4).
   */
  onInboxChanged?: () => void
  /**
   * Inbox card deep-link (SPEC §Interaction "item click opens the underlying
   * record"): fired with the referenced record's `entityType` (module code
   * from blueprint metadata) + `recordId`. The app navigates to that module
   * — pair with `getEntryRecordId` so the destination surface opens the
   * record on arrival. Omit → cards only mark read.
   */
  onOpenInboxRecord?: InboxModuleSurfaceProps['onOpenRecord']
}

/**
 * Build a renderer registry, optionally threading a `userContext` + tab-body
 * renderers into every module surface. `v5TemplateRenderers` (below) is the
 * zero-config default.
 */
export function createV5TemplateRenderers(
  options: V5TemplateRendererOptions = {},
): RendererRegistry {
  const { onInboxChanged, onOpenInboxRecord, ...surfaceOptions } = options
  const render: ModuleRenderer = (ctx) => <V5ModuleSurface ctx={ctx} {...surfaceOptions} />
  return {
    // Entity primary refs (first-view templates the composer resolves to).
    ListView: render,
    GroupedListView: render,
    HybridView: render,
    // Operations-cockpit primary ref: same module surface — `ModuleView`
    // resolves the hybrid kind to `CockpitView` via `hasCockpit(config)`
    // (metadata switch), so a module-type override naming this ref still
    // renders through the standard surface (detail stack + creation sheet).
    CockpitView: render,
    // Operations-console primary refs (`module-registry.ts` binds the
    // `dispatcher-cockpit`/`triage-console`/`fleet-console` view kinds to
    // these names for BOTH the entity and pipeline module types). Same
    // module surface as every other view ref — `ModuleViewBody` resolves the
    // kind to its console body, so the detail stack and creation sheet keep
    // working unchanged. Registered as EXPLICIT entries for the tree-shaking
    // reason the calendar refs above document.
    DispatcherCockpitView: render,
    TriageConsoleView: render,
    FleetConsoleView: render,
    WorkforcePulseView: render,
    // Pipeline primary refs.
    KanbanView: render,
    PipelineListView: render,
    PipelineHybridView: render,
    // Calendar refs — BOTH the `calendar` module type's own primary ref and
    // the `pipeline` type's calendar-view ref (`module-registry.ts` names them
    // separately). Registered as EXPLICIT top-level entries in this object,
    // like every ref above: a named-export-only registration is tree-shaken
    // out of the barrel and the composer then falls through to its
    // placeholder, which is exactly how the calendar view stayed invisible
    // while both refs were already declared.
    CalendarView: render,
    PipelineCalendarView: render,
    // Dashboard primary ref. Deliberately NOT `render`: `V5ModuleSurface` is
    // entity/pipeline-shaped (view tabs, detail stack, creation sheet) and a
    // dashboard has none of that — see `views/DashboardView.tsx`'s header.
    DashboardGrid: (ctx) => <DashboardModuleSurface ctx={ctx} />,
    // Inbox primary ref. Like the dashboard, deliberately NOT `render`:
    // an inbox is one date-grouped feed — no view tabs, no detail stack,
    // no creation sheet (see `inbox/InboxModuleSurface.tsx`'s header).
    InboxView: (ctx) => (
      <InboxModuleSurface ctx={ctx} onNotificationsChanged={onInboxChanged} onOpenRecord={onOpenInboxRecord} />
    ),
  }
}

/** The default v5 renderer registry — plug straight into `<ComposedModule renderers={…}/>`. */
export const v5TemplateRenderers: RendererRegistry = createV5TemplateRenderers()
