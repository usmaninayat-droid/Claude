import { useMemo, useState, type ReactNode } from 'react'
import type { RelationalStore } from '@fams/demo-kit'
import type { EntityConfig, EntityRecord } from '@fams/v5-composer'
import { RecordMapCard, type EntityProfileTabContext, type ProfileTabRenderer, type TaskDetailTabRenderer } from '@fams/v5-templates'
import { ActivityFeed, Input, type ActivityFeedActor, type ActivityFeedEntry, type ActivityFeedTone } from '@fams/ui-kit'
import { Search } from '@fams/ui-kit/icons'
type ActivityFeedBadge = NonNullable<ActivityFeedEntry['badge']>
import { compileFieldSet, getReadRenderer, useLinkedRecordOpener } from '@fams/v5-composer'
import { linkedRecords } from './referrers'

/** The app's `entityType` + id → module/record/flavor lookup (see `boot.ts`). */
export type LinkedRecordResolver = (target: { entityType: string; recordId: string }) => {
  record: EntityRecord
  moduleLabel: string
} | undefined

/**
 * App-layer profile/task tab renderers — the "linked records" tab lives in the
 * APP, not the design system (the brief's rule). They are keyed by the blueprint
 * tab `component` name and threaded into `createV5TemplateRenderers`.
 *
 * The Assignments tab is the coherence surface: it reads the demo-kit store's
 * inverse references (`linkedRecords`) for the profiled vehicle, so a workforce
 * row linked to it appears here with zero bespoke plumbing.
 */

const empty = (msg: string): ReactNode => (
  <p className="p-section text-body text-muted-foreground">{msg}</p>
)

/** Assignments: workforce linked to THIS vehicle via the store's inverse refs. */
function AssignmentsTab(store: RelationalStore, workforceCode: string): ProfileTabRenderer {
  return (ctx: EntityProfileTabContext): ReactNode => {
    const id = ctx.record?.id
    if (!id) return empty('No record.')
    const crew = linkedRecords(store, id, workforceCode)
    if (crew.length === 0) return empty('No workforce assigned to this vehicle yet.')
    return (
      <ul className="flex flex-col gap-2 p-section" data-slot="assignments">
        {crew.map((w) => (
          <li key={String(w.id)} className="flex items-center justify-between rounded-md border border-border px-3 py-2">
            <span className="text-body font-medium text-foreground">{String(w.title ?? w.id)}</span>
            <span className="text-caption text-muted-foreground">
              {String(w.systemcol1 ?? 'Crew')} · {String(w.status ?? '—')}
            </span>
          </li>
        ))}
      </ul>
    )
  }
}


/* ── The generic "Linked" tab ─────────────────────────────────────────────── */

/**
 * One row of the Linked tab: a record in ANOTHER module, reachable from this
 * one. `direction` records which way the reference points, which is the only
 * honest way to present a two-way graph without inventing relationship names.
 */
interface LinkedRow {
  entityType: string
  recordId: string
  label: string
  moduleLabel: string
  fieldLabel: string
  direction: 'out' | 'in'
}

/**
 * The Linked tab, built from the REFERENCE GRAPH rather than a literal
 * `linked` array (nothing populates one, which is why this tab was empty for
 * every module).
 *
 * Both directions are collected:
 *  - OUTBOUND — this record's own `SingleReference`/`MultiReference` columns,
 *    read off the config's `systemcolumns` (never a hardcoded field list).
 *  - INBOUND — the demo-kit store's bidirectional integrity index
 *    (`getReferrers`, the same primitive the vehicle Assignments tab uses),
 *    so a Company also lists the Deals and Contacts that point AT it.
 *
 * Rows activate through the SAME `useLinkedRecordOpener()` seam a `LinkView`
 * cell uses, so a row click stacks a new sheet exactly like a field link —
 * one navigation contract, two surfaces.
 */
export function collectLinkedRows(
  store: RelationalStore,
  resolve: LinkedRecordResolver,
  config: { code?: string; systemcolumns?: { col: string; name?: string; type?: string; entityType?: string }[] } | undefined,
  record: EntityRecord,
): LinkedRow[] {
  const rows: LinkedRow[] = []
  const seen = new Set<string>()
  const push = (entityType: string, recordId: string, fieldLabel: string, direction: 'out' | 'in') => {
    const key = `${direction}:${entityType}:${recordId}`
    if (seen.has(key) || !recordId) return
    const hit = resolve({ entityType, recordId })
    if (!hit) return
    seen.add(key)
    rows.push({
      entityType,
      recordId,
      label: String(hit.record.title ?? hit.record.uniqueidentifier ?? recordId),
      moduleLabel: hit.moduleLabel,
      fieldLabel,
      direction,
    })
  }

  for (const col of config?.systemcolumns ?? []) {
    if (col.type !== 'SingleReference' && col.type !== 'MultiReference') continue
    if (!col.entityType) continue
    const raw = record[col.col]
    const ids = Array.isArray(raw) ? raw.map(String) : raw == null || raw === '' ? [] : [String(raw)]
    for (const id of ids) push(col.entityType, id, col.name ?? col.col, 'out')
  }

  for (const ref of store.getReferrers(String(record.id))) {
    push(ref.type, String(ref.id), 'Referenced by', 'in')
  }
  return rows
}

function LinkedRecordsBody({
  store,
  resolve,
  config,
  record,
}: {
  store: RelationalStore
  resolve: LinkedRecordResolver
  config: Parameters<typeof collectLinkedRows>[2]
  record: EntityRecord | undefined
}) {
  const open = useLinkedRecordOpener()
  if (!record) return empty('No record.')
  const rows = collectLinkedRows(store, resolve, config, record)
  if (rows.length === 0) return empty('No linked records yet.')
  return (
    <ul className="flex flex-col gap-2 p-section" data-slot="linked-records">
      {rows.map((row) => (
        <li key={`${row.direction}-${row.entityType}-${row.recordId}`}>
          <button
            type="button"
            data-slot="linked-record-row"
            data-entity-type={row.entityType}
            data-record-id={row.recordId}
            disabled={!open}
            onClick={() => open?.({ entityType: row.entityType, recordId: row.recordId })}
            className="flex w-full items-center justify-between rounded-md border border-border px-3 py-2 text-left transition-colors hover:bg-muted/60 disabled:cursor-default"
          >
            <span className="text-body font-medium text-foreground">{row.label}</span>
            <span className="text-caption text-muted-foreground">
              {row.moduleLabel} · {row.fieldLabel}
            </span>
          </button>
        </li>
      ))}
    </ul>
  )
}

/* ── Related Incidents (area-based) ───────────────────────────────────────── */

/**
 * Other incidents that share this one's area (`addr_area`) — the seeded
 * relatedness for the incident detail sheet's Related Incidents tab. Reads
 * straight off the store (`RelationalStore.list`), never a buffer, so a newly
 * created incident in the same area shows up with zero bespoke plumbing —
 * the same "read off the store" discipline `linkedRecords`/`getReferrers`
 * already use elsewhere in this file. "Pending" (address not yet assigned)
 * never counts as a shared area.
 */
export function relatedIncidentsByArea(
  store: RelationalStore,
  config: EntityConfig,
  record: EntityRecord,
): EntityRecord[] {
  const area = record.addr_area
  if (area == null || area === '' || area === 'Pending') return []
  return store
    .list(config.code, { where: { addr_area: String(area) } })
    .records.filter((r) => r.id !== record.id)
}

/**
 * Boot-time pass: writes each incident's related-by-area siblings onto the
 * record as `related_pins` (`LocationMapPin[]` shape — id/position/label), the
 * field the profile Location map's "Related incidents" checkbox overlay reads
 * (`LocationMapSection.relatedPinsField`). Relatedness is the SAME rule as
 * `relatedIncidentsByArea` above (shared `addr_area`, never "Pending").
 * Demo-grade approximation: computed once after seeds load — an incident
 * created or re-zoned later won't refresh siblings' pins until reload.
 */
export function seedRelatedIncidentPins(store: RelationalStore, code = 'incidents/incident'): void {
  const { records } = store.list(code)
  for (const record of records) {
    const area = record.addr_area
    if (area == null || area === '' || area === 'Pending') continue
    const pins = records
      .filter(
        (other) =>
          other.id !== record.id && String(other.addr_area) === String(area) && Array.isArray(other.lnglat),
      )
      .map((other) => ({
        id: String(other.id),
        position: other.lnglat as [number, number],
        label: String(other.uniqueidentifier ?? other.id),
      }))
    if (pins.length) store.update(code, record.id, { related_pins: pins })
  }
}

/**
 * The Related Requests/Complaints tab body — a searchable list of the SAME
 * card the Kanban/Hybrid lenses render (product direction 2026-09-02):
 * `RecordMapCard` with no map-only leading controls, exactly the reuse that
 * component's own docstring reserves for this tab. Each card derives from the
 * blueprint (`deriveCard` inside), carries the stage pill from the
 * blueprint's own `statusList` colors, and a click opens/stacks that
 * incident's detail sheet via the same `useLinkedRecordOpener` seam every
 * other linked-record surface uses.
 *
 * Layout: the search input stays put while the cards scroll within the tab
 * (`h-full` column, `overflow-y-auto` list). `-mx-2` nets the host
 * `TabsContent`'s 24px `p-section` gutter down to exactly 16px per side.
 */
function RelatedIncidentsBody({
  store,
  config,
  record,
}: {
  store: RelationalStore
  config: EntityConfig | undefined
  record: EntityRecord | undefined
}) {
  const open = useLinkedRecordOpener()
  const [query, setQuery] = useState('')
  const statusByKey = useMemo(
    () => new Map((config?.uiConfig?.statusList ?? []).map((s) => [s.key, s] as const)),
    [config],
  )
  const compiled = useMemo(() => (config ? compileFieldSet(config) : null), [config])
  if (!config || !record) return empty('No record.')
  const related = relatedIncidentsByArea(store, config, record)
  if (related.length === 0) return empty('No related incidents in this area yet.')
  const q = query.trim().toLowerCase()
  const visible = q
    ? related.filter((r) =>
        `${r.title ?? ''} ${r.uniqueidentifier ?? r.id ?? ''} ${r.systemcol1 ?? ''}`
          .toLowerCase()
          .includes(q),
      )
    : related
  return (
    <div className="-mx-2 flex h-full min-h-0 flex-col gap-3" data-slot="related-incidents">
      <Input
        type="search"
        value={query}
        onChange={(event) => setQuery(event.target.value)}
        placeholder="Search related requests"
        aria-label="Search related requests"
        leadingIcon={<Search aria-hidden className="size-4" />}
        className="h-9 shrink-0"
      />
      {visible.length === 0 ? (
        <p className="text-body-sm text-muted-foreground">No related requests match “{query.trim()}”.</p>
      ) : (
        <ul className="flex min-h-0 flex-1 flex-col gap-2 overflow-y-auto" data-slot="related-incidents-list">
          {visible.map((rel, index) => {
            const stage = statusByKey.get(String(rel.status ?? ''))
            return (
              <li key={String(rel.id)} data-slot="related-incident-row" data-record-id={String(rel.id)}>
                <RecordMapCard
                  config={config}
                  compiled={compiled}
                  record={rel}
                  id={String(rel.id)}
                  label={String(rel.title ?? rel.id)}
                  index={index}
                  onSelect={(id) => open?.({ entityType: config.code, recordId: id })}
                  stageChip={stage ? { label: stage.label, color: stage.color } : undefined}
                />
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}

/**
 * A compact recap of the identity details (Overview tab body).
 *
 * Values go through v5-composer's own read renderers (`getReadRenderer`), the
 * SAME presentation the detail panel, the list cells and the creation sheet's
 * Summary step use — never a bare `String(...)`.
 *
 * Why this matters (round 5, run 2026-09-05-preventive-maintenance): this body
 * used to stringify the raw stored value, so on one PM rule the Overview tab
 * printed `Vehicle: VEH-01` and a lowercase `scheduled`, while the Details
 * panel and the Linked tab of the SAME record — which do go through the
 * registry — printed `Tanker 01` and a status pill. One record, three
 * renderings, two of them right. A hand-rolled `String()` cannot resolve a
 * reference id, cannot render a status pill and cannot honour a column's
 * renderer override, and it silently drifts from the engine every time the
 * engine improves. Delegating removes bespoke presentation from the demo app
 * rather than adding it.
 */
const OverviewSummaryBody = ({ ctx }: { ctx: EntityProfileTabContext }) => {
  const rec = ctx.record
  const config = ctx.config
  // `compileFieldSet` memoises internally on the config identity, so this is a
  // cache hit on every render after the first.
  const compiled = config ? compileFieldSet(config) : null
  if (!rec) return empty('No record.')
  const rows = (config?.uiConfig?.profile?.details ?? []).slice(0, 6)
  return (
    <dl className="grid grid-cols-2 gap-3 p-section" data-slot="overview-summary">
      {rows.map((d) => {
        const col = (d as { col: string }).col
        const descriptor = compiled?.byCol[col]
        const label = descriptor?.label ?? config?.systemcolumns.find((c) => c.col === col)?.name ?? col
        const Read = descriptor ? getReadRenderer(descriptor.type) : null
        return (
          <div key={col}>
            <dt className="text-caption text-muted-foreground">{label}</dt>
            <dd className="text-body text-foreground">
              {Read && descriptor ? (
                <Read descriptor={descriptor} value={rec[col]} />
              ) : (
                String(rec[col] ?? '—')
              )}
            </dd>
          </div>
        )
      })}
    </dl>
  )
}

const OverviewSummary: ProfileTabRenderer = (ctx) => <OverviewSummaryBody ctx={ctx} />

const DocumentsPlaceholder: ProfileTabRenderer = () =>
  empty('Documents are not wired in this demo (placeholder tab).')

/**
 * Ticketing's TaskDetail right panel (figma-spec-detail.md §5) — Activity /
 * Timeline / Messaging, all reading off the record itself (no store join).
 *
 * **WP8 seed contract** (not yet on any ticketing seed row — every tab below
 * degrades gracefully to `ActivityFeed`'s built-in empty state until it is):
 * - `record.timelineEvents?: TicketTimelineEventSeed[]` — system/audit rows
 *   (`{ id, actor, action, tone?, badge?, timestamp, dateGroup }`). `action` is
 *   the plain-text tail of the sentence, e.g. `"reported an incident"` or
 *   `"changed severity to Critical"` — `actor` renders bold ahead of it, and
 *   is the human display name OR (fix7) a declared `{ kind: 'system', label }`
 *   for an automation-authored row — see `TicketTimelineEventSeed.actor`'s own
 *   comment. `composer-data.ts`'s `appendTimelineEntry` is what writes a LIVE
 *   entry into this same field at runtime, for both a human session edit and
 *   a rule automation's `patchSource` — this is the ONE audit path this
 *   demo's ticketing modules render (its sibling `record.activity` mechanism
 *   is a separate, seed-authored-elsewhere field consumed by
 *   `ActivityCommentFeed`, e.g. the asset profile's Activity tab — not this
 *   Timeline tab).
 *   `badge` (figma-spec-detail.md §9) is the solid, uppercase action chip
 *   rendered after the actor name — e.g. `{ label: 'VALIDATED', tone:
 *   'warning' }` (orange, `--color-warning` = `#F79009`) or `{ label:
 *   'SCHEDULED', tone: 'success' }` (solid green) — passed straight through
 *   to `ActivityFeed`'s own `badge` prop, which already resolves it to a
 *   solid `Badge`; this renderer does no styling of its own.
 * - `record.comments?: TicketCommentSeed[]` — user comments
 *   (`{ id, author, avatar?, text, timestamp, dateGroup }`). A `text` leading
 *   with `@Name` renders that token in brand blue/bold (figma-spec-detail.md
 *   §5.3); the rest renders as the comment body.
 * Both arrays are plain JS on the seeded record (not JSON-stringified) —
 * `EntityRecord`'s `[systemcol: string]: unknown` index signature already
 * allows this without a matching `systemcolumns` descriptor, since these
 * tabs read the record directly rather than through the field registry.
 */
interface TicketTimelineEventSeed {
  id: string
  /**
   * The human display name, OR a declared non-human actor — `{ kind:
   * 'system', label: 'Automation' }` — for an entry a rule automation wrote
   * rather than a person (fix7: `composer-data.ts`'s `appendTimelineEntry`
   * seam writes this shape for an automation-driven `patchSource`/status
   * change). `ActivityFeed` renders a system actor with a distinguishing
   * glyph instead of a person's tone dot/avatar.
   */
  actor: ActivityFeedActor
  action: string
  tone?: ActivityFeedTone
  /** Solid, uppercase action chip after the actor name (figma-spec-detail.md §9) — e.g. `{ label: 'VALIDATED', tone: 'warning' }`. */
  badge?: ActivityFeedBadge
  timestamp: string
  dateGroup: string
}

interface TicketCommentSeed {
  id: string
  author: string
  avatar?: string
  text: string
  timestamp: string
  dateGroup: string
}

function timelineEventsOf(record: EntityRecord): TicketTimelineEventSeed[] {
  const raw = (record as { timelineEvents?: unknown }).timelineEvents
  return Array.isArray(raw) ? (raw as TicketTimelineEventSeed[]) : []
}

function commentsOf(record: EntityRecord): TicketCommentSeed[] {
  const raw = (record as { comments?: unknown }).comments
  return Array.isArray(raw) ? (raw as TicketCommentSeed[]) : []
}

/** A leading `@Name` token renders in brand blue/bold; the rest is the plain body. */
function renderCommentText(text: string): ReactNode {
  const match = /^(@\S+)(\s*)([\s\S]*)$/.exec(text)
  if (!match) return text
  const [, mention, , rest] = match
  return (
    <>
      <span className="font-semibold text-primary">{mention}</span>
      {rest ? ` ${rest}` : null}
    </>
  )
}

function toTimelineEntries(events: TicketTimelineEventSeed[]): ActivityFeedEntry[] {
  return events.map((event) => ({
    id: event.id,
    kind: 'system',
    author: event.actor,
    text: event.action,
    tone: event.tone,
    badge: event.badge,
    timestamp: event.timestamp,
    dateGroup: event.dateGroup,
  }))
}

function toCommentEntries(comments: TicketCommentSeed[]): ActivityFeedEntry[] {
  return comments.map((comment) => ({
    id: comment.id,
    kind: 'comment',
    author: comment.author,
    avatar: comment.avatar,
    text: renderCommentText(comment.text),
    timestamp: comment.timestamp,
    dateGroup: comment.dateGroup,
  }))
}

/**
 * Timeline tab: the blueprint's SINGLE right-panel tab (figma-spec-detail.md
 * §9 — "just a heading, no tab-switcher node", `TaskDetail.tsx`'s single-tab
 * path) combines system/audit events + comments + a WORKING composer, all in
 * one feed — not three separate tabs. Chronological order is a plain
 * concatenation (events, then comments, then any freshly-drafted comment):
 * every seeded ticket's `timelineEvents` predate its `comments` (the events'
 * `dateGroup`s are historical dates, the comments' is `"Today"`), so this
 * matches actual chronological order without needing a timestamp-parsing
 * sort — see `ActivityFeed`'s `dateGroup`-separator contract in `@fams/ui-
 * kit`, which assumes pre-sorted entries.
 *
 * Reuses the SAME ephemeral-draft-state composer pattern `TicketMessagingBody`
 * already established below (Rule 8: drafted comments are local component
 * state only, no persistence seam in this demo) — the ONLY difference is the
 * combined entry list this tab starts from.
 */
function TicketTimelineBody({ record }: { record: EntityRecord }) {
  const [drafted, setDrafted] = useState<TicketCommentSeed[]>([])
  const entries = [
    ...toTimelineEntries(timelineEventsOf(record)),
    ...toCommentEntries(commentsOf(record)),
    ...toCommentEntries(drafted),
  ]
  return (
    <ActivityFeed
      entries={entries}
      emptyLabel="No activity yet."
      placeholder="@ Mention someone or write a comment…"
      onAttach={() => {}}
      onSubmit={(text) =>
        setDrafted((current) => [
          ...current,
          {
            id: `draft-${current.length}`,
            author: 'You',
            text,
            timestamp: 'Just now',
            dateGroup: 'Today',
          },
        ])
      }
    />
  )
}
const TicketTimeline: TaskDetailTabRenderer = (ctx) => <TicketTimelineBody record={ctx.record} />

/** Activity tab: the union of timeline events + comments, read-only — an
 * at-a-glance feed (the ActivityFeed composite's "mixed kind" shape is
 * exactly this). Kept available for a module that wants a read-only
 * combined feed with no composer; ticketing's own "Timeline" tab uses
 * `TicketTimeline` above instead (composer included). */
const TicketActivity: TaskDetailTabRenderer = (ctx) => {
  const entries = [...toTimelineEntries(timelineEventsOf(ctx.record)), ...toCommentEntries(commentsOf(ctx.record))]
  return <ActivityFeed entries={entries} emptyLabel="Activity timeline is not wired in this demo (no seed data yet)." />
}

/** Messaging tab: comments + a working composer — drafted comments are
 * ephemeral component state (this demo has no comment-persistence seam). */
function TicketMessagingBody({ record }: { record: EntityRecord }) {
  const [drafted, setDrafted] = useState<TicketCommentSeed[]>([])
  const entries = [...toCommentEntries(commentsOf(record)), ...toCommentEntries(drafted)]
  return (
    <ActivityFeed
      entries={entries}
      emptyLabel="No comments yet."
      placeholder="@ Mention someone or write a comment…"
      // No attachment-upload seam exists in this demo yet (finding: composer
      // missing the paperclip affordance) — presence alone renders the icon
      // per figma-spec-detail.md §5.4; wiring a real picker is a future seam.
      onAttach={() => {}}
      onSubmit={(text) =>
        setDrafted((current) => [
          ...current,
          {
            id: `draft-${current.length}`,
            author: 'You',
            text,
            timestamp: 'Just now',
            dateGroup: 'Today',
          },
        ])
      }
    />
  )
}
const TicketMessaging: TaskDetailTabRenderer = (ctx) => <TicketMessagingBody record={ctx.record} />

/** Profile tab renderers keyed by blueprint `component` name. */
export function makeProfileTabRenderers(
  store: RelationalStore,
  workforceCode: string,
  resolve: LinkedRecordResolver,
): Record<string, ProfileTabRenderer> {
  return {
    LinkedWorkforce: AssignmentsTab(store, workforceCode),
    OverviewSummary,
    DocumentsPlaceholder,
    LinkedRecords: (ctx) => (
      <LinkedRecordsBody store={store} resolve={resolve} config={ctx.config} record={ctx.record} />
    ),
    RelatedIncidentsCards: (ctx) => (
      <RelatedIncidentsBody store={store} config={ctx.config} record={ctx.record} />
    ),
  }
}

/** TaskDetail (pipeline) tab renderers keyed by blueprint `component` name. */
export function makeTaskTabRenderers(
  store: RelationalStore,
  resolve: LinkedRecordResolver,
): Record<string, TaskDetailTabRenderer> {
  return {
    TicketActivity,
    TicketTimeline,
    TicketMessaging,
    LinkedRecords: (ctx) => (
      <LinkedRecordsBody store={store} resolve={resolve} config={ctx.config} record={ctx.record} />
    ),
    RelatedIncidentsCards: (ctx) => (
      <RelatedIncidentsBody store={store} config={ctx.config} record={ctx.record} />
    ),
  }
}
