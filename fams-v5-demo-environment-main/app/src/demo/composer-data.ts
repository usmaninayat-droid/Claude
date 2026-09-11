import { allowedTransitions, evalRecordAutomations } from '@fams/v5-composer'
import type {
  DataAdapter,
  ModuleBlueprint,
  EntityRecord,
  PipelineRules,
  UserContext,
  RecordAutomation,
} from '@fams/v5-composer'
import type { ActivityFeedActor } from '@fams/ui-kit'
import type { ApiDataAdapter } from './ApiDataAdapter'

/**
 * The sync ⇄ async bridge (the v1 contract friction, documented in the report
 * and app/README).
 *
 * The composer's `DataAdapter` is SYNCHRONOUS (`list()/get()/create()` return
 * values, not promises) — it was designed to sit on an in-memory store. `fetch`
 * is async. We reconcile them with a per-code in-memory BUFFER that is HYDRATED
 * through the real fetch path at boot (`ApiDataAdapter.listByCode` → MSW →
 * demo-kit store), then read synchronously at render time:
 *
 *   seeds → demo-kit store → MSW → fetch (hydrate buffer) → composer reads buffer
 *
 * Writes are optimistic: the buffer is mutated synchronously (so the composer
 * re-lists immediately) AND written through to MSW via `fetch` (so the backing
 * store stays authoritative and the id/uid reconciles on resolve).
 *
 * PIPELINE modules additionally expose `transitions`/`move`: the allowed next
 * stages are computed by the composer's own rule evaluator (`allowedTransitions`)
 * against the module's `rules.json` + the current `UserContext` — so a
 * role-gated transition (e.g. in-progress→resolved, admin only) is blocked for
 * the dispatcher on the guarded path, exactly as the design-system gate demo.
 */
export type CodeBuffers = Record<string, EntityRecord[]>

export interface ComposerDataOptions {
  api: ApiDataAdapter
  buffers: CodeBuffers
  /** Privileges of the booted persona — gate `create` (the New button). */
  privileges: string[]
  /** The booted persona as a rule-evaluator subject (roles drive transition gates). */
  userContext: UserContext
  /** Pipeline transition rules, keyed by module code. */
  rulesByCode: Record<string, PipelineRules>
  /** Display name of the booted persona — authors the audit-trail entries below. */
  actorName?: string
}

/** The system actor a rule automation's writes are attributed to — never the booted persona (fix7: mis-attributing a system write to a human is worse than a missing entry, which is the defect this closes). */
const SYSTEM_ACTOR: ActivityFeedActor = { kind: 'system', label: 'Automation' }

/**
 * Audit trail: a runtime mutation that flows through this adapter — a field
 * edit, a photo upload, a status change, or (fix7) a rule automation's
 * `patchSource` — gets a log entry appended, so the record's Timeline/Activity
 * surface reflects what actually happened in the session, not just the
 * seeded history.
 *
 * TWO pre-existing consumer shapes are reconciled here into ONE write path
 * (fix7, job-orders: wave 4c found the ticketing Timeline tab reads
 * `record.timelineEvents`, a genuinely different field from the older
 * `record.activity` this function used to write exclusively — `activity` is
 * what `ActivityCommentFeed` reads, e.g. the asset profile's Activity tab,
 * and that wiring is untouched):
 *   - `Array.isArray(rec.timelineEvents)` — the ticketing pipeline shape
 *     (`TicketTimelineEventSeed`: `actor`/`action`/`tone?`/`badge?`/
 *     `timestamp`/`dateGroup`) — checked FIRST because this is the shape the
 *     defect this fix closes actually needed (job-orders' Timeline).
 *   - else `Array.isArray(rec.activity)` — the older seed shape
 *     (`ActivityCommentFeed`'s `SeedEntry`: `kind`/`actor`/`text`/`at`/`icon`)
 *     — unchanged behaviour for every module that already relied on it.
 *   - neither present → no-op (best-effort; a record that declares no
 *     timeline surface at all, e.g. Preventive Maintenance, is left alone).
 * One function, one call site per caller below — never two parallel audit
 * paths growing independently.
 */
function describePatch(
  patch: Record<string, unknown>,
  prev: Record<string, unknown>,
  labelOf: (col: string) => string,
): string | null {
  const parts: string[] = []
  for (const [col, next] of Object.entries(patch)) {
    if (col === 'activity' || col === 'timelineEvents') continue
    const label = labelOf(col)
    const before = prev[col]
    if (Array.isArray(next) && (before == null || Array.isArray(before))) {
      const delta = next.length - ((before as unknown[] | null | undefined)?.length ?? 0)
      if (delta > 0) parts.push(`uploaded ${delta} file${delta === 1 ? '' : 's'} to **${label}**`)
      else if (delta < 0) parts.push(`removed ${-delta} file${delta === -1 ? '' : 's'} from **${label}**`)
      else parts.push(`updated **${label}**`)
    } else if (typeof next === 'string' && next.length <= 40 && next) {
      parts.push(`changed **${label}** to **${next}**`)
    } else {
      parts.push(`updated **${label}**`)
    }
  }
  return parts.length ? parts.join(', ') : null
}

/** The content a patch carried, echoed into the `activity`-shaped timeline entry (note text + uploaded photo thumbnails) — `timelineEvents` rows have no equivalent `body`, so this is only consulted on that path. */
function contentOfPatch(
  patch: Record<string, unknown>,
  prev: Record<string, unknown>,
): { note?: string; images?: { src: string; alt?: string }[] } {
  let note: string | undefined
  const images: { src: string; alt?: string }[] = []
  for (const [col, next] of Object.entries(patch)) {
    if (col === 'activity' || col === 'timelineEvents') continue
    if (typeof next === 'string' && next.length > 40 && !note) note = next
    if (Array.isArray(next)) {
      const prevLen = Array.isArray(prev[col]) ? (prev[col] as unknown[]).length : 0
      for (const item of next.slice(prevLen)) {
        const img = item as { src?: string; alt?: string }
        if (img && typeof img.src === 'string') images.push({ src: img.src, alt: img.alt })
      }
    }
  }
  return { note, images: images.length ? images : undefined }
}

/** Markdown `**bold**` markers stripped — `timelineEvents.action` renders as plain text (`ActivityFeed`'s system row does no markdown parsing), unlike `activity`'s `SeedEntry.text` (`renderLogText` in `ActivityCommentFeed`). */
function stripBold(text: string): string {
  return text.replace(/\*\*/g, '')
}

function appendTimelineEntry(
  rec: EntityRecord,
  actor: ActivityFeedActor,
  text: string,
  opts?: { content?: { note?: string; images?: { src: string; alt?: string }[] }; tone?: string },
): Partial<EntityRecord> | null {
  if (Array.isArray(rec.timelineEvents)) {
    const entry = {
      id: `${rec.id}-tl-${Date.now().toString(36)}`,
      actor,
      action: stripBold(text),
      ...(opts?.tone ? { tone: opts.tone } : {}),
      timestamp: 'Just now',
      dateGroup: 'Today',
    }
    return { timelineEvents: [...(rec.timelineEvents as unknown[]), entry] }
  }
  if (Array.isArray(rec.activity)) {
    const entry = {
      id: `${rec.id}-act-${Date.now().toString(36)}`,
      kind: 'log',
      actor,
      text,
      at: new Date().toISOString(),
      icon: 'updated',
      ...(opts?.content?.note ? { note: opts.content.note } : {}),
      ...(opts?.content?.images ? { images: opts.content.images } : {}),
    }
    return { activity: [...(rec.activity as unknown[]), entry] }
  }
  return null
}

export function createComposerDataFactory(opts: ComposerDataOptions): (node: ModuleBlueprint) => DataAdapter {
  const { api, buffers, privileges, userContext, rulesByCode, actorName } = opts

  return (node: ModuleBlueprint): DataAdapter => {
    const code = node.dataSource?.code
    if (!code) return { list: () => [], get: () => undefined }
    const buf = (): EntityRecord[] => (buffers[code] ??= [])
    const actor = actorName ?? 'You'
    // col → display name, from the module's inline config when present.
    const cfg = node.config
    const fieldNames: Record<string, string> = {}
    const statusLabels: Record<string, string> = {}
    if (cfg && typeof cfg === 'object') {
      const fields = (cfg as { fields?: { col?: string; name?: string }[] }).fields
      for (const f of fields ?? []) if (f?.col && f.name) fieldNames[f.col] = f.name
      const statuses = (cfg as { uiConfig?: { statusList?: { key?: string; label?: string }[] } }).uiConfig?.statusList
      for (const s of statuses ?? []) if (s?.key && s.label) statusLabels[s.key] = s.label
    }
    // Record automation (generic vocabulary, @fams/v5-composer's evalRecordAutomations):
    // this module's own declared `uiConfig.recordAutomation`, if any (e.g. a PM
    // rule's `trigger` → job order auto-creation).
    const automations = (cfg as { uiConfig?: { recordAutomation?: RecordAutomation[] } } | undefined)?.uiConfig
      ?.recordAutomation
    const labelOf = (col: string): string => fieldNames[col] ?? col
    const canCreate = privileges.includes(`${node.id}.create`)
    const canUpdate = privileges.includes(`${node.id}.update`)
    const canDelete = privileges.includes(`${node.id}.delete`)
    const isPipeline = node.type === 'pipeline'
    const rules = rulesByCode[code]

    const adapter: DataAdapter = {
      list: () => buf(),
      get: (id) => buf().find((r) => r.id === id),
    }

    if (canCreate) {
      adapter.create = (input) => {
        const values: Partial<EntityRecord> = { ...input }
        // Pipeline-create default stage: a new card with no status lands in the
        // first stage (the parked 2.7 fix, applied app-side).
        if (isPipeline && rules && (values.status == null || values.status === '')) {
          values.status = rules.statuses[0]
        }
        const optimistic: EntityRecord = { id: input.id ?? `local_${Date.now().toString(36)}`, ...values }
        buf().unshift(optimistic)
        // Write through to MSW; reconcile the server-assigned id/uid on resolve.
        void api.create(code, values).then((saved) => Object.assign(optimistic, saved)).catch(() => {})
        return optimistic
      }
    }
    if (canUpdate) {
      adapter.update = (id, patch) => {
        const rec = buf().find((r) => r.id === id)
        if (!rec) return rec
        const prevForAutomation: EntityRecord = { ...rec }
        // Audit trail BEFORE applying, so array deltas compare against the
        // previous value. A patch that itself writes `activity`/`timelineEvents`
        // directly (a posted comment through one of those seams) is persisted
        // as-is, never double-logged.
        // Freshly-uploaded photos get the camera-style stamps the lightbox
        // shows (takenAt + location) — only items beyond the previous length,
        // and only when they don't already carry them.
        for (const [col, next] of Object.entries(patch)) {
          if (col === 'activity' || col === 'timelineEvents' || !Array.isArray(next)) continue
          const prevLen = Array.isArray(rec[col]) ? (rec[col] as unknown[]).length : 0
          for (const item of next.slice(prevLen)) {
            const img = item as { src?: string; takenAt?: string; location?: string }
            if (!img || typeof img.src !== 'string') continue
            img.takenAt ??= new Date().toISOString()
            if (typeof rec.systemcol1 === 'string') img.location ??= rec.systemcol1
          }
        }
        const text = 'activity' in patch || 'timelineEvents' in patch ? null : describePatch(patch, rec, labelOf)
        const audit = text ? appendTimelineEntry(rec, actor, text, { content: contentOfPatch(patch, rec) }) : null
        const full = audit ? { ...patch, ...audit } : patch
        Object.assign(rec, full)
        void api.update(code, id, full).catch(() => {})

        // Cross-module record automation: this update may have tripped a
        // declared automation (e.g. PM `trigger` flipping to 'fired'). Create
        // the target record in ITS module's buffer via the SAME optimistic
        // create + write-through shape `adapter.create` uses above (`buffers`/
        // `api` are shared across every module's factory closure — see the
        // `ComposerDataOptions` docblock), respecting the target's own
        // pipeline default stage, then patch this record with the back-
        // reference (resolved now that the created record is real).
        for (const effect of evalRecordAutomations(automations, prevForAutomation, patch)) {
          const targetBuf = (buffers[effect.create.entityType] ??= [])
          const targetRules = rulesByCode[effect.create.entityType]
          const values: Partial<EntityRecord> = { ...effect.create.values }
          if (targetRules && (values.status == null || values.status === '')) {
            values.status = targetRules.statuses[0]
          }
          // The id is minted HERE and sent through to the store, rather than
          // letting the store mint its own. Both halves matter:
          //   1. `patchSource` below computes the back-reference synchronously
          //      from `created.id`. If the store minted a different id, the
          //      async `Object.assign(created, saved)` would overwrite
          //      `created.id` a tick later and the source record would keep a
          //      reference no record answers to — a link that renders and
          //      resolves to nothing. `RelationalStore.create` honours
          //      `input.id`, so passing it makes the reconcile a no-op.
          //   2. A random suffix, because unlike `adapter.create` above (one
          //      user gesture at a time) an automation is code-driven and two
          //      can land inside the same millisecond; the store learned this
          //      exact lesson in `genId` earlier this cycle.
          const createdId = `local_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`
          const created: EntityRecord = { id: createdId, ...values }
          // System-attributed Timeline entry on the CREATED record (fix7):
          // an automation-driven create must leave a visible, honestly-
          // attributed entry — never silence (the pre-existing defect) and
          // never the booted persona's name (the mis-attribution phase 7
          // flagged as worse than silence). Initialising `timelineEvents`
          // here — rather than requiring the blueprint's `create.values` to
          // pre-seed an empty array — guarantees the entry regardless of
          // what the automation's own `create.values` declares; a MANUALLY
          // created record of the same module still starts with whatever
          // the wizard gives it (no timeline entry), so this is specifically
          // "this record came from an automation", not a general default.
          created.timelineEvents = Array.isArray(created.timelineEvents) ? created.timelineEvents : []
          Object.assign(
            created,
            appendTimelineEntry(created, SYSTEM_ACTOR, 'created this record via an automated rule', { tone: 'info' }),
          )
          targetBuf.unshift(created)
          // Write-through carries the injected `timelineEvents` too (same
          // discipline the field-edit audit trail above already follows:
          // the backing store never falls out of sync with the optimistic
          // buffer's audit fields).
          void api
            .create(effect.create.entityType, { ...values, id: createdId, timelineEvents: created.timelineEvents })
            .then((saved) => Object.assign(created, saved))
            .catch(() => {})

          if (effect.patchSource) {
            const sourcePatch: Record<string, unknown> = {}
            for (const [col, spec] of Object.entries(effect.patchSource)) {
              sourcePatch[col] = 'const' in spec ? spec.const : created[spec.fromCreated as string]
            }
            // System-attributed entry on the SOURCE record too, same actor —
            // a no-op today (Preventive Maintenance declares neither
            // `timelineEvents` nor `activity`, so `appendTimelineEntry`
            // returns null and nothing is merged), but wired through the
            // SAME shared function so a future module with a Timeline that
            // also carries a `patchSource` rule gets this for free rather
            // than needing its own copy of this block.
            const sourceAudit = appendTimelineEntry(rec, SYSTEM_ACTOR, 'was updated by an automated rule', { tone: 'info' })
            const sourceFull = sourceAudit ? { ...sourcePatch, ...sourceAudit } : sourcePatch
            Object.assign(rec, sourceFull)
            void api.update(code, id, sourceFull).catch(() => {})
          }
        }

        return rec
      }
    }

    if (canDelete) {
      // The delete seam the shared `…` row menu + bulk bar sit on. Same
      // optimistic write-through shape as `create`/`update` above: drop it from
      // the render buffer synchronously, then let MSW's `entity_delete` make
      // the demo-kit store agree. Privilege-gated per module, so a persona
      // without `<module>.delete` gets no Delete affordance at all rather than
      // one that fails.
      adapter.remove = (id) => {
        const rows = buf()
        const at = rows.findIndex((r) => r.id === id)
        if (at < 0) return false
        rows.splice(at, 1)
        void api.remove(code, id).catch(() => {})
        return true
      }
    }

    if (isPipeline && rules) {
      adapter.transitions = (id) => {
        const rec = buf().find((r) => r.id === id)
        return rec ? allowedTransitions(rules, userContext, rec) : []
      }
      adapter.move = (id, to) => {
        const rec = buf().find((r) => r.id === id)
        if (!rec) throw new Error(`[demo] no record "${id}" to move`)
        if (!allowedTransitions(rules, userContext, rec).includes(to)) {
          throw new Error(`[demo] transition "${rec.status}" → "${to}" not permitted for this persona`)
        }
        const statusLabel = statusLabels[to] ?? to
        const audit = appendTimelineEntry(rec, actor, `changed status to **${statusLabel}**`)
        const full: Partial<EntityRecord> = { status: to, ...(audit ?? {}) }
        Object.assign(rec, full)
        void api.update(code, id, full).catch(() => {})
        return rec
      }
    }

    return adapter
  }
}
