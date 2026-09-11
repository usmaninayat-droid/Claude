import { useCallback, useMemo, useState } from 'react'
import type { EntityRecord, ModuleRenderContext } from '@fams/v5-composer'
import { InboxView } from './InboxView'
import type { InboxNotification, InboxNotificationKind, InboxSeverity, InboxTabId } from './types'

/**
 * InboxModuleSurface — the composer-facing adapter behind the `InboxView`
 * template ref (the `inbox` module type). [tier-2]
 *
 * DELIBERATELY NOT `V5ModuleSurface` (same reasoning as `DashboardModuleSurface`):
 * an inbox has no view tabs, no detail stack, no creation sheet — it is one
 * date-grouped feed. It reads records through the injected `DataAdapter` and
 * maps each onto the presenter vocabulary in `./types` via WELL-KNOWN GENERIC
 * KEYS read straight off `EntityRecord`'s open index signature — the same
 * contract `additionalInfoOf` (description/checklist/attachments) already
 * uses. An inbox blueprint therefore names its columns with these keys:
 *
 *   `title` · `snippet` · `timestamp` (ISO) · `read` (boolean) ·
 *   `kind` (notification|approval|system|mention) · `avatarSrc` ·
 *   `reference` (a SingleReference id — rendered as the "# <id>" chip) ·
 *   `severity` (Critical|Minor|…) · `due` · `module` (label chip) ·
 *   `reminder` / `assignedToMe` (booleans — tab facets).
 *
 * Clearing and opening both write through the adapter's guarded `update`
 * (mark read); an adapter without `update` (read-only persona) renders a
 * feed without Clear affordances.
 */
export interface InboxModuleSurfaceProps {
  ctx: ModuleRenderContext
  /** "Now" for the Today/Yesterday grouping — injectable for tests. */
  now?: Date
  /** Notified after any clear/open write, e.g. to refresh a rail unread dot. */
  onNotificationsChanged?: () => void
  /**
   * Deep-link seam (SPEC §Interaction "item click opens the underlying
   * record"): fired on card click AFTER the mark-read write, with the
   * notification's referenced record — `entityType` from the blueprint's
   * `reference` column descriptor (e.g. `ticketing/ticket`), `recordId` from
   * the record's `reference` value. The consuming app owns the navigation
   * (v5-kit router). Omitted (or an unreferenced notification) → click only
   * marks read, exactly as before.
   */
  onOpenRecord?: (
    target: { entityType?: string; recordId: string },
    notification: InboxNotification,
  ) => void
}

const KINDS: ReadonlySet<string> = new Set(['notification', 'approval', 'system', 'mention'])

/** Severity label → chip tone. Only Critical renders the error tone (Figma). */
function severityTone(label: string): InboxSeverity {
  return label.toLowerCase() === 'critical' ? 'critical' : 'minor'
}

const str = (v: unknown): string | undefined => (typeof v === 'string' && v.length ? v : undefined)
const truthy = (v: unknown): boolean => v === true || v === 'true'

/** Map one entity record onto the inbox presenter vocabulary. */
export function toInboxNotification(rec: EntityRecord): InboxNotification {
  const r = rec as Record<string, unknown>
  const kind = str(r.kind)
  const severity = str(r.severity)
  const reference = str(r.reference)
  return {
    id: rec.id,
    title: str(r.title) ?? rec.id,
    snippet: str(r.snippet),
    timestamp: str(r.timestamp) ?? new Date(0).toISOString(),
    read: truthy(r.read),
    kind: kind && KINDS.has(kind) ? (kind as InboxNotificationKind) : undefined,
    avatarSrc: str(r.avatarSrc),
    reference: reference ? { id: reference, label: reference } : undefined,
    severity: severity ? { label: severity, tone: severityTone(severity) } : undefined,
    due: str(r.due),
    module: str(r.module) ? { label: str(r.module)! } : undefined,
    reminder: truthy(r.reminder),
    assignedToMe: truthy(r.assignedToMe),
    mention: kind === 'mention',
  }
}

/** The blueprint's `reference` column descriptor names the referenced module
 *  code via `entityType` (metadata-driven — never hardcoded per module). */
function referenceEntityType(module: ModuleRenderContext['module']): string | undefined {
  const config = module.config as { systemcolumns?: { col?: string; entityType?: string }[] } | undefined
  const descriptor = config?.systemcolumns?.find((c) => c.col === 'reference')
  return typeof descriptor?.entityType === 'string' ? descriptor.entityType : undefined
}

export function InboxModuleSurface({ ctx, now, onNotificationsChanged, onOpenRecord }: InboxModuleSurfaceProps) {
  const { data } = ctx
  // The in-memory buffer mutates in place; bump after a write to re-list.
  const [rev, setRev] = useState(0)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const notifications = useMemo(() => data.list().map(toInboxNotification), [data, rev])

  const markRead = useCallback(
    (ids: string[]) => {
      if (!data.update) return
      for (const id of ids) data.update(id, { read: true } as Partial<EntityRecord>)
      setRev((r) => r + 1)
      onNotificationsChanged?.()
    },
    [data, onNotificationsChanged],
  )

  const canWrite = Boolean(data.update)
  const entityType = referenceEntityType(ctx.module)

  // Opening a record marks it read (SPEC §Interaction "item click") AND
  // reports the referenced record through the `onOpenRecord` deep-link seam —
  // the app navigates; this surface owns only the read-state write.
  const open =
    canWrite || onOpenRecord
      ? (n: InboxNotification) => {
          if (canWrite) markRead([n.id])
          if (onOpenRecord && n.reference) onOpenRecord({ entityType, recordId: n.reference.id }, n)
        }
      : undefined

  return (
    <InboxView
      notifications={notifications}
      title={ctx.module.label}
      now={now}
      onOpen={open}
      onClear={canWrite ? (n) => markRead([n.id]) : undefined}
      onClearAll={canWrite ? (visible: InboxNotification[], _tab: InboxTabId) => markRead(visible.map((n) => n.id)) : undefined}
    />
  )
}

InboxModuleSurface.displayName = 'InboxModuleSurface'
