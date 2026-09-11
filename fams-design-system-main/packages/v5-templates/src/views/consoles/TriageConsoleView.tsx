import { useMemo, useState } from 'react'
import { Button, PriorityChip, StatusPill, type PriorityChipVariant } from '@fams/ui-kit'
import { Icon } from '@fams/ui-kit/icons'
import type { EntityConfig, EntityRecord } from '@fams/v5-composer'
import { cn } from '../../lib/cn'
import { RecordViewEmptyState } from '../RecordViewStates'
import { ConsoleRecordSummary } from './ConsoleRecordSummary'
import {
  ageCol,
  ageMinutes,
  byAgeDescending,
  cellText,
  classificationCol,
  columnLabel,
  distinctValues,
  formatAge,
  identityCol,
  stageDef,
  stageOf,
} from './console-model'

/**
 * TriageConsoleView — the `triage-console` view kind. [tier-2 pattern]
 *
 * A generic port of the native Triage Console the demo environment carried in
 * `app/src/demo/triage-console-view.tsx` until 2026-09-07 (deleted in
 * `2b5130c`, where it lived as app code in violation of that repo's rule
 * zero). The DESIGN is unchanged and deliberately so — it was the one the
 * design lead settled: a dense triage QUEUE (rows, not cards — an operator
 * scans many fast, and the kanban board already owns card browsing) beside a
 * SELECTED-ITEM work panel, under a compact KPI strip. It is not a second
 * list and not a second kanban; it is a narrower surface for one job, burning
 * down the intake backlog.
 *
 * What CHANGED in the port is every binding. The app version hardcoded a
 * `COLS` map of `incidents/incident` column keys and a literal
 * `['intake','triage']` backlog. This template derives all of it:
 *
 *  - **The backlog** is the module's own leading stages — `triageStages` (a
 *    blueprint list) when authored, else the FIRST stage of
 *    `uiConfig.statusList`, which is by construction where records enter a
 *    pipeline. So the lens works on any pipeline with zero new metadata.
 *  - **Identity / priority / age** come from `console-model`'s derivations
 *    (`identityCol`, `classificationCol`, `ageCol`) — the blueprint's list
 *    order and column types, never a named field.
 *  - **Advance actions** are the host's guarded transitions, handed in as
 *    `transitionsFor` + `onMove`. The template never mutates; Rule 8.
 */
export interface TriageConsoleViewProps {
  config: EntityConfig
  records: EntityRecord[]
  /**
   * Stage keys forming the triage backlog. Omit → the blueprint's FIRST
   * stage (where records enter the pipeline).
   */
  triageStages?: readonly string[]
  /** Allowed next stages for a record — the host's guarded transitions. */
  transitionsFor?: (record: EntityRecord) => readonly string[]
  /** Advance a record to a stage (the same contract the kanban lens uses). */
  onMove?: (recordId: string, fromStage: string, toStage: string) => void
  /** Opens the record's own detail surface. */
  onOpenRecord?: (record: EntityRecord) => void
  /** Replaces the derived work-panel body (a host's real triage controls). */
  renderPanel?: (record: EntityRecord) => React.ReactNode
  onCreateRecord?: () => void
  className?: string
}

const PRIORITY_VARIANT: Record<string, PriorityChipVariant> = {
  critical: 'critical',
  high: 'high',
  medium: 'medium',
  low: 'minor',
  minor: 'minor',
}

/** The chip variant for a classification value — by name, else by rank. */
function priorityVariant(value: string, ordered: string[]): PriorityChipVariant {
  const known = PRIORITY_VARIANT[value.toLowerCase()]
  if (known) return known
  const rank = ordered.indexOf(value)
  const scale: PriorityChipVariant[] = ['critical', 'high', 'medium', 'minor']
  return scale[Math.min(Math.max(rank, 0), scale.length - 1)]
}

export function TriageConsoleView({
  config,
  records,
  triageStages,
  transitionsFor,
  onMove,
  onOpenRecord,
  renderPanel,
  onCreateRecord,
  className,
}: TriageConsoleViewProps) {
  // `statusList` is read INSIDE the memo (not hoisted to a local first): the
  // `?? []` fallback allocates a fresh array every render, so a hoisted
  // `stages` would be a new dependency identity each time and the memo would
  // never hold.
  const backlogKeys = useMemo(() => {
    const stages = config.uiConfig.statusList ?? []
    if (triageStages?.length) return triageStages
    return stages.length ? [stages[0].key] : []
  }, [triageStages, config.uiConfig.statusList])

  const identity = identityCol(config)
  const priority = classificationCol(config)
  const age = ageCol(config)

  const queue = useMemo(() => {
    const inBacklog = backlogKeys.length
      ? records.filter((record) => backlogKeys.includes(stageOf(record)))
      : records
    return byAgeDescending(inBacklog, age)
  }, [records, backlogKeys, age])

  const priorityOrder = useMemo(
    () => (priority ? distinctValues(queue, priority) : []),
    [queue, priority],
  )

  const [selectedId, setSelectedId] = useState<string | null>(null)
  const selected = queue.find((record) => record.id === selectedId) ?? queue[0]

  const kpis = useMemo(() => {
    const ages = queue.map((record) => ageMinutes(record, age)).filter((m): m is number => m !== undefined)
    const avgAge = ages.length ? Math.round(ages.reduce((sum, m) => sum + m, 0) / ages.length) : undefined
    const breakdown = priority
      ? priorityOrder.map((value) => ({
          value,
          count: queue.filter((record) => String(record[priority] ?? '') === value).length,
        }))
      : []
    return { count: queue.length, avgAge, breakdown }
  }, [queue, age, priority, priorityOrder])

  if (!queue.length) {
    return (
      <div data-slot="triage-console" className={cn('@container flex h-full items-center justify-center', className)}>
        <RecordViewEmptyState cause="no-data" onCreateRecord={onCreateRecord} />
      </div>
    )
  }

  return (
    // `@container` is what makes the `@2xl:` queries below resolve — without
    // it they never match and the queue/panel split stays stacked at every
    // width (found at 1920 in the run-2026-09-08 QA pass).
    <div
      data-slot="triage-console"
      className={cn('@container flex h-full min-h-0 flex-col overflow-hidden', className)}
    >
      <div className="flex shrink-0 flex-wrap items-center gap-section border-b border-border bg-card px-section py-field">
        <TriageStat label="In queue" value={String(kpis.count)} />
        {kpis.avgAge !== undefined && (
          <TriageStat label={`Avg. ${columnLabel(config, age ?? '').toLowerCase()} age`} value={formatAge(kpis.avgAge)} />
        )}
        {priority && kpis.breakdown.length > 0 && (
          <div className="flex min-w-0 flex-1 items-center gap-inline">
            <span className="text-caption font-semibold uppercase tracking-wide text-muted-foreground">
              {columnLabel(config, priority)}
            </span>
            <div className="flex flex-wrap items-center gap-inline">
              {kpis.breakdown.map((entry) => (
                <PriorityChip key={entry.value} variant={priorityVariant(entry.value, priorityOrder)}>
                  {entry.value} · {entry.count}
                </PriorityChip>
              ))}
            </div>
          </div>
        )}
      </div>

      <div className="flex min-h-0 flex-1 flex-col @2xl:flex-row">
        <ul
          data-slot="triage-queue"
          aria-label={`${config.name} triage queue`}
          className="flex min-h-0 flex-col overflow-y-auto border-b border-border @2xl:w-[24rem] @2xl:shrink-0 @2xl:border-b-0 @2xl:border-e"
        >
          {queue.map((record) => {
            const isSelected = record.id === selected?.id
            const stage = stageDef(config, stageOf(record))
            const mins = ageMinutes(record, age)
            return (
              <li key={record.id}>
                <button
                  type="button"
                  aria-current={isSelected ? 'true' : undefined}
                  onClick={() => setSelectedId(record.id)}
                  className={cn(
                    'flex w-full flex-col gap-1 border-b border-border px-field py-field text-start transition-colors duration-fast',
                    'hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none',
                    isSelected && 'border-s-2 border-s-primary bg-muted',
                  )}
                >
                  <span className="flex items-center justify-between gap-inline">
                    <span className="truncate text-body-sm font-semibold text-foreground">
                      {record.uniqueidentifier ? String(record.uniqueidentifier) : cellText(record, identity)}
                    </span>
                    {priority && (
                      <PriorityChip
                        variant={priorityVariant(cellText(record, priority), priorityOrder)}
                        className="shrink-0"
                      >
                        {cellText(record, priority)}
                      </PriorityChip>
                    )}
                  </span>
                  <span className="truncate text-body-sm text-foreground">{cellText(record, identity)}</span>
                  <span className="flex items-center justify-between gap-inline text-body-xs text-muted-foreground">
                    {stage && (
                      <StatusPill color={stage.color} textColor={stage.textColor} appearance="tint">
                        {stage.label}
                      </StatusPill>
                    )}
                    {mins !== undefined && (
                      <span className="flex shrink-0 items-center gap-1">
                        <Icon name="clock" size={14} aria-hidden="true" />
                        {formatAge(mins)}
                      </span>
                    )}
                  </span>
                </button>
              </li>
            )
          })}
        </ul>

        {selected && (
          <div data-slot="triage-panel" className="min-h-0 flex-1 overflow-y-auto p-section">
            {renderPanel?.(selected) ?? (
              <ConsoleRecordSummary
                config={config}
                record={selected}
                onOpenRecord={onOpenRecord}
                actions={
                  <TriageAdvanceActions
                    config={config}
                    record={selected}
                    transitions={transitionsFor?.(selected) ?? []}
                    onMove={onMove}
                  />
                }
              />
            )}
          </div>
        )}
      </div>
    </div>
  )
}

TriageConsoleView.displayName = 'TriageConsoleView'

function TriageStat({ label, value }: { label: string; value: string }) {
  return (
    <span className="flex flex-col">
      <span className="text-caption font-semibold uppercase tracking-wide text-muted-foreground">{label}</span>
      <span className="text-heading-sm font-semibold text-foreground">{value}</span>
    </span>
  )
}

/** The host's allowed next stages as one advance-button row. */
function TriageAdvanceActions({
  config,
  record,
  transitions,
  onMove,
}: {
  config: EntityConfig
  record: EntityRecord
  transitions: readonly string[]
  onMove?: (recordId: string, fromStage: string, toStage: string) => void
}) {
  if (!onMove || !transitions.length) return null
  const from = stageOf(record)
  return (
    <div className="flex flex-wrap items-center gap-inline">
      {transitions.map((key) => {
        const stage = stageDef(config, key)
        if (!stage) return null
        return (
          <Button key={key} size="sm" variant="secondary" onClick={() => onMove(record.id, from, key)}>
            {stage.label}
          </Button>
        )
      })}
    </div>
  )
}
