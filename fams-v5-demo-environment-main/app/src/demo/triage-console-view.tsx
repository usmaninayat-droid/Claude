import { useMemo, useState, type ReactNode } from 'react'
import { Avatar, Badge, Button, PickerList, Popover, PopoverContent, PopoverTrigger, Separator, StatusPill, toast } from '@fams/ui-kit'
import { PriorityChip, type PriorityChipVariant } from '@fams/ui-kit'
import { Icon } from '@fams/ui-kit/icons'
import type { DataAdapter, EntityConfig, EntityRecord } from '@fams/v5-composer'

/**
 * Triage Console — Operations Center's SECOND view (2026-08-31 task brief,
 * user's own words: "different than Dispatcher Cockpit, a new type of view
 * for this module"). NATIVE in the host app (React 19, no iframe) — unlike
 * the ported Dispatcher Cockpit, this is FAMS vocabulary end to end, so it
 * composes straight from the app's own record-update paths instead of an
 * isolated bundle.
 *
 * DESIGN (Design-Lead judgment, propose-and-build, logged per
 * autonomous-joint-decisions): a triage QUEUE of untriaged incidents (dense
 * rows, not cards — a triage operator scans many rows fast, the kanban
 * board already owns the card-browsing job) + a SELECTED-ITEM work panel
 * with the actions that matter at this stage, + a compact KPI strip. Not a
 * copy of the kanban or the list view — a distinct, narrower surface for
 * one job: clear the intake backlog.
 *
 * "Untriaged" = `status` in `INTAKE`/`TRIAGE` (the two pre-dispatch stages
 * in `incidents/incident`'s `statusList`) — the backlog this console exists
 * to burn down. Once a ticket reaches ACKNOWLEDGED it graduates out of the
 * queue and the operator follows it in the Incidents module from there.
 *
 * WRITE PATH: every mutation below goes through the SAME `DataAdapter`
 * (`data.update`/`data.move`/`data.transitions`) the Incidents module's own
 * `V5ModuleSurface` uses for its kanban drag/`TaskDetail` transition button
 * (see `@fams/v5-templates`'s `v5-module-renderers.tsx` `onMove`/
 * `onTaskTransition`) — built once in `boot.ts` via `toModuleNode` +
 * `createComposerDataFactory`, so a triage action here mutates the exact
 * same in-memory buffer the Incidents kanban re-lists from. No parallel
 * store, no bespoke fetch.
 *
 * ENTITY-AGNOSTIC WHERE REASONABLE: the queue/KPI mechanics (grouping,
 * aging, severity tally) don't assume anything incident-specific — only the
 * COLUMN IDS below are `incidents/incident` vocabulary (its `systemcolumns`
 * are not a generic "first N columns" shape, so some binding is
 * unavoidable — same posture `incidents-assignment.tsx` documents for its
 * own `wrapFieldValue`).
 */

const COLS = {
  title: 'title',
  status: 'status',
  severity: 'systemcol2', // Priority: Critical/High/Medium/Low
  reportedAt: 'systemcol3', // DateTime
  source: 'systemcol8',
  municipality: 'municipality',
  area: 'addr_area',
  inspector: 'systemcol10', // "Assigned Inspector" — the response-team assignment for this pipeline
  tanker: 'systemcol7',
  driver: 'veh_driver',
  type: 'systemcol14', // Request / Complaint
} as const

const UNTRIAGED_STAGES = new Set(['intake', 'triage'])
const TANKER_STAGES = new Set(['assessed', 'reopened'])

const SEVERITY_ORDER = ['Critical', 'High', 'Medium', 'Low'] as const
const SEVERITY_VARIANT: Record<string, PriorityChipVariant> = {
  Critical: 'critical',
  High: 'high',
  Medium: 'medium',
  Low: 'minor',
}

function severityOf(rec: EntityRecord): string {
  return String(rec[COLS.severity] ?? 'Medium')
}

function ageMinutes(rec: EntityRecord): number {
  const t = Date.parse(String(rec[COLS.reportedAt] ?? ''))
  if (!Number.isFinite(t)) return 0
  return Math.max(0, Math.round((Date.now() - t) / 60000))
}

function formatAge(mins: number): string {
  if (mins < 60) return `${mins}m`
  const h = Math.floor(mins / 60)
  const m = mins % 60
  return h < 24 ? `${h}h ${m}m` : `${Math.floor(h / 24)}d ${h % 24}h`
}

function statusDef(config: EntityConfig, key: string) {
  return (config.uiConfig?.statusList ?? []).find((s) => s.key === key)
}

/** Compact anchored picker — same contract as `incidents-assignment.tsx`'s
 *  `InlineEditField`, reused here (not re-imported: that module wires a
 *  `wrapFieldValue` factory scoped to the detail sheet, a different seam
 *  than this console's row/panel controls) so the console's pickers look and
 *  behave identically to the ones an operator already knows from the ticket
 *  detail sheet. */
function FieldPicker({
  label,
  trigger,
  children,
}: {
  label: string
  trigger: ReactNode
  children: (close: () => void) => ReactNode
}) {
  const [open, setOpen] = useState(false)
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>{trigger}</PopoverTrigger>
      <PopoverContent align="start" className="w-64">
        <div className="flex flex-col gap-2">
          <span className="text-body-xs font-semibold text-muted-foreground">{label}</span>
          {children(() => setOpen(false))}
        </div>
      </PopoverContent>
    </Popover>
  )
}

export interface TriageConsoleViewProps {
  config: EntityConfig
  data: DataAdapter
  /** Live tanker roster, same shape `incidents-assignment.tsx` reads. Optional — the tanker action degrades to "not available in this demo" without it. */
  listVehicles?: () => EntityRecord[]
}

export function TriageConsoleView({ config, data, listVehicles }: TriageConsoleViewProps) {
  const [rev, setRev] = useState(0)
  const bump = () => setRev((r) => r + 1)
  // Fresh array identity per `rev` — the in-memory adapter mutates records in
  // place (same rationale `V5ModuleSurface` documents for its own `records`
  // memo), so a plain `data.list()` cached on `data` alone would never
  // re-render after a local mutation.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const allRecords = useMemo(() => data.list(), [data, rev])

  const queue = useMemo(
    () =>
      allRecords
        .filter((r) => UNTRIAGED_STAGES.has(String(r[COLS.status] ?? '')))
        .sort((a, b) => ageMinutes(b) - ageMinutes(a)),
    [allRecords],
  )

  const [selectedId, setSelectedId] = useState<string | undefined>(undefined)
  const selected = queue.find((r) => r.id === selectedId) ?? queue[0]

  const kpis = useMemo(() => {
    const count = queue.length
    const avgAge = count ? Math.round(queue.reduce((sum, r) => sum + ageMinutes(r), 0) / count) : 0
    const bySeverity = SEVERITY_ORDER.map((sev) => ({
      severity: sev,
      count: queue.filter((r) => severityOf(r) === sev).length,
    })).filter((s) => s.count > 0)
    return { count, avgAge, bySeverity }
  }, [queue])

  const move = (id: string, to: string, successMsg: string) => {
    try {
      data.move?.(id, to)
      bump()
      toast.success(successMsg)
    } catch {
      toast.error('Move not allowed', { description: 'This stage change was rejected for the current persona.' })
    }
  }

  const update = (id: string, patch: Record<string, unknown>, successMsg: string) => {
    data.update?.(id, patch)
    bump()
    toast.success(successMsg)
  }

  if (queue.length === 0) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-2 p-section text-center">
        <Icon name="alert-triangle" className="size-8 text-muted-foreground" />
        <p className="text-body-sm font-semibold text-foreground">Triage queue is clear</p>
        <p className="text-body-xs text-muted-foreground">No incidents in Intake or Triage right now.</p>
      </div>
    )
  }

  return (
    <div className="flex h-full flex-col overflow-hidden">
      {/* KPI strip */}
      <div className="flex shrink-0 items-center gap-6 border-b border-border bg-card px-section py-3">
        <div className="flex flex-col">
          <span className="text-caption font-semibold uppercase tracking-wide text-muted-foreground">Untriaged</span>
          <span className="text-heading-sm font-semibold text-foreground">{kpis.count}</span>
        </div>
        <div className="flex flex-col">
          <span className="text-caption font-semibold uppercase tracking-wide text-muted-foreground">Avg. age</span>
          <span className="text-heading-sm font-semibold text-foreground">{formatAge(kpis.avgAge)}</span>
        </div>
        <div className="flex flex-1 items-center gap-2">
          <span className="text-caption font-semibold uppercase tracking-wide text-muted-foreground">By severity</span>
          <div className="flex items-center gap-1.5">
            {kpis.bySeverity.map((s) => (
              <PriorityChip key={s.severity} variant={SEVERITY_VARIANT[s.severity] ?? 'medium'}>
                {s.severity} · {s.count}
              </PriorityChip>
            ))}
          </div>
        </div>
      </div>

      <div className="flex min-h-0 flex-1">
        {/* Queue */}
        <div className="flex w-[380px] shrink-0 flex-col overflow-y-auto border-e border-border">
          {queue.map((rec) => {
            const isSelected = rec.id === selected?.id
            const stage = statusDef(config, String(rec[COLS.status] ?? ''))
            return (
              <button
                key={rec.id}
                type="button"
                onClick={() => setSelectedId(rec.id)}
                data-state={isSelected ? 'selected' : undefined}
                className="flex flex-col gap-1 border-b border-border px-4 py-3 text-start hover:bg-muted data-[state=selected]:bg-muted data-[state=selected]:border-s-2 data-[state=selected]:border-s-primary"
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="truncate text-body-sm font-semibold text-foreground">
                    {rec.uniqueidentifier ?? rec.id}
                  </span>
                  <PriorityChip variant={SEVERITY_VARIANT[severityOf(rec)] ?? 'medium'} className="shrink-0">
                    {severityOf(rec)}
                  </PriorityChip>
                </div>
                <span className="truncate text-body-sm text-foreground">{String(rec[COLS.title] ?? '—')}</span>
                <div className="flex items-center justify-between gap-2 text-body-xs text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <Icon name="marker-pin-02" className="size-3.5" />
                    {String(rec[COLS.area] ?? rec[COLS.municipality] ?? '—')}
                  </span>
                  <span className="flex items-center gap-1">
                    <Icon name="monitor-02" className="size-3.5" />
                    {String(rec[COLS.source] ?? '—')}
                  </span>
                  <span>{formatAge(ageMinutes(rec))} ago</span>
                </div>
                {stage && (
                  <StatusPill color={stage.color} textColor={stage.textColor} className="w-fit">
                    {stage.label}
                  </StatusPill>
                )}
              </button>
            )
          })}
        </div>

        {/* Work panel */}
        {selected && (
          <TriagePanel
            key={selected.id}
            config={config}
            record={selected}
            listVehicles={listVehicles}
            onSetSeverity={(sev) => update(selected.id, { [COLS.severity]: sev }, `Priority set · ${sev}`)}
            onAssignInspector={(name) =>
              update(selected.id, { [COLS.inspector]: name }, `Response team assigned · ${name}`)
            }
            onAssignTanker={(vehicleId, driver) =>
              update(selected.id, { [COLS.tanker]: vehicleId, [COLS.driver]: driver }, 'Tanker allocated')
            }
            onAdvance={(to, label) => move(selected.id, to, `Advanced to ${label}`)}
            allowedTransitions={data.transitions?.(selected.id) ?? []}
          />
        )}
      </div>
    </div>
  )
}

function TriagePanel({
  config,
  record,
  listVehicles,
  onSetSeverity,
  onAssignInspector,
  onAssignTanker,
  onAdvance,
  allowedTransitions,
}: {
  config: EntityConfig
  record: EntityRecord
  listVehicles?: () => EntityRecord[]
  onSetSeverity: (sev: string) => void
  onAssignInspector: (name: string) => void
  onAssignTanker: (vehicleId: string, driver: string | undefined) => void
  onAdvance: (to: string, label: string) => void
  allowedTransitions: string[]
}) {
  const roster =
    (config.systemcolumns?.find((c) => c.id === 'fld_inc_inspector') as { listValues?: string[] } | undefined)
      ?.listValues ?? []
  const status = String(record[COLS.status] ?? '')
  const canAssignTanker = TANKER_STAGES.has(status)
  const nextStages = allowedTransitions
    .map((key) => statusDef(config, key))
    .filter((s): s is NonNullable<typeof s> => s != null)
    .filter((s) => s.key === 'triage' || s.key === 'acknowledged')

  return (
    <div className="flex min-w-0 flex-1 flex-col gap-5 overflow-y-auto p-section">
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 flex-col gap-1">
          <span className="text-body-xs font-semibold text-muted-foreground">
            {record.uniqueidentifier ?? record.id} · {String(record[COLS.type] ?? 'Complaint')}
          </span>
          <h2 className="truncate text-heading-sm font-semibold text-foreground">
            {String(record[COLS.title] ?? '—')}
          </h2>
        </div>
        <FieldPicker
          label="Priority"
          trigger={
            <button type="button">
              <PriorityChip variant={SEVERITY_VARIANT[severityOf(record)] ?? 'medium'}>
                {severityOf(record)}
              </PriorityChip>
            </button>
          }
        >
          {(close) => (
            <PickerList
              options={SEVERITY_ORDER.map((sev) => ({ value: sev, label: sev }))}
              onPick={(sev) => {
                onSetSeverity(sev)
                close()
              }}
            />
          )}
        </FieldPicker>
      </div>

      {/* Summary */}
      <dl className="grid grid-cols-2 gap-x-4 gap-y-3 text-body-sm">
        <div>
          <dt className="text-body-xs text-muted-foreground">Zone / Municipality</dt>
          <dd className="text-foreground">
            {String(record[COLS.area] ?? '—')} · {String(record[COLS.municipality] ?? '—')}
          </dd>
        </div>
        <div>
          <dt className="text-body-xs text-muted-foreground">Source</dt>
          <dd className="text-foreground">{String(record[COLS.source] ?? '—')}</dd>
        </div>
        <div>
          <dt className="text-body-xs text-muted-foreground">Reported</dt>
          <dd className="text-foreground">{formatAge(ageMinutes(record))} ago</dd>
        </div>
        <div>
          <dt className="text-body-xs text-muted-foreground">Assigned Inspector</dt>
          <dd className="text-foreground">{String(record[COLS.inspector] ?? '—')}</dd>
        </div>
      </dl>

      <Separator />

      {/* Triage actions */}
      <div className="flex flex-col gap-3">
        <span className="text-body-xs font-semibold uppercase tracking-wide text-muted-foreground">
          Triage actions
        </span>

        <FieldPicker
          label="Assign response team"
          trigger={
            <Button variant="tertiary" size="sm" className="w-fit justify-start gap-2">
              <Icon name="users-01" className="size-4" />
              Assign response team
            </Button>
          }
        >
          {(close) => (
            <PickerList
              options={roster.map((name) => ({
                value: name,
                label: (
                  <span className="flex items-center gap-2">
                    <Avatar name={name} size="xs" />
                    {name}
                  </span>
                ),
              }))}
              onPick={(name) => {
                onAssignInspector(name)
                close()
              }}
            />
          )}
        </FieldPicker>

        <FieldPicker
          label="Assign tanker"
          trigger={
            <Button
              variant="tertiary"
              size="sm"
              className="w-fit justify-start gap-2"
              disabled={!canAssignTanker || !listVehicles}
              title={canAssignTanker ? undefined : 'Tanker assignment opens at Assessed / Reopened'}
            >
              <Icon name="car-01" className="size-4" />
              Assign tanker
            </Button>
          }
        >
          {(close) => {
            const vehicles = (listVehicles?.() ?? []) as (EntityRecord & { plate?: string; driver?: string })[]
            return (
              <PickerList
                options={vehicles.map((v) => ({
                  value: v.id,
                  label: `${v.title ?? v.id} · ${v.plate ?? v.id}`,
                }))}
                onPick={(vehicleId) => {
                  const v = vehicles.find((x) => x.id === vehicleId)
                  onAssignTanker(vehicleId, v?.driver)
                  close()
                }}
              />
            )
          }}
        </FieldPicker>

        <div className="flex items-center gap-2 pt-1">
          {nextStages.length === 0 && (
            <Badge variant="muted" className="text-body-xs">
              No further advance available for this persona
            </Badge>
          )}
          {nextStages.map((s) => (
            <Button key={s.key} size="sm" onClick={() => onAdvance(s.key, s.label)}>
              Advance to {s.label}
            </Button>
          ))}
        </div>
      </div>
    </div>
  )
}
