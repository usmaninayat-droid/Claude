import { ArrowRight, Loader2, MapPin } from '@fams/ui-kit/icons'
import {
  Button,
  Checkbox,
  Label,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  StatusPill,
  Textarea,
} from '@fams/ui-kit'
import type { EntityConfig, EntityRecord } from '@fams/v5-composer'
import { cn } from '../../lib/cn'
import { cockpitStatusOf, type CockpitConfig } from './cockpit-model'

/**
 * CockpitFlowParts — the BODIES of the cockpit's flow sheets, split out of
 * `CockpitFlows` (rule 12). Each part is presentational: it takes its config
 * block plus values and callbacks, and owns no state. `CockpitFlows` keeps the
 * sheet chrome, the form state and the hand-off orchestration.
 */

type CockpitFlowsConfig = NonNullable<CockpitConfig['flows']>

/** Read a record column as display text, or undefined when it is empty. */
export function fieldText(
  record: EntityRecord | undefined,
  col: string | undefined,
): string | undefined {
  if (!record || !col) return undefined
  const value = record[col]
  return value == null || value === '' ? undefined : String(value)
}

/** A record's display title, falling back to its id. */
function recordTitle(record: EntityRecord): string {
  return typeof record.title === 'string' ? record.title : record.id
}

/* ── Report form body ─────────────────────────────────────────────────────── */

export interface CockpitReportFormProps {
  report: NonNullable<CockpitFlowsConfig['report']>
  /** Whether a replacement flow exists — gates the dispatch checkbox. */
  replaceAvailable: boolean
  type: string
  onTypeChange: (value: string) => void
  note: string
  onNoteChange: (value: string) => void
  dispatchReplacement: boolean
  onDispatchReplacementChange: (value: boolean) => void
}

export function CockpitReportForm({
  report,
  replaceAvailable,
  type,
  onTypeChange,
  note,
  onNoteChange,
  dispatchReplacement,
  onDispatchReplacementChange,
}: CockpitReportFormProps) {
  const typeLabel = report.typeLabel ?? 'Type'
  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="cockpit-report-type">{typeLabel} *</Label>
        <Select value={type} onValueChange={onTypeChange}>
          <SelectTrigger id="cockpit-report-type" aria-label={typeLabel}>
            <SelectValue placeholder="Select…" />
          </SelectTrigger>
          <SelectContent>
            {report.typeOptions.map((option) => (
              <SelectItem key={option} value={option}>
                {option}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {/* Only the type select is required (UX J.52). */}
        {!type ? <p className="text-caption text-muted-foreground">Required to submit.</p> : null}
      </div>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="cockpit-report-note">{report.noteLabel ?? 'Notes'}</Label>
        <Textarea
          id="cockpit-report-note"
          value={note}
          onChange={(e) => onNoteChange(e.target.value)}
          rows={4}
        />
      </div>
      {report.dispatchLabel && replaceAvailable ? (
        <label className="flex items-center gap-2 text-body-sm text-foreground">
          <Checkbox
            checked={dispatchReplacement}
            onCheckedChange={(next) => onDispatchReplacementChange(next === true)}
          />
          {report.dispatchLabel}
        </label>
      ) : null}
    </div>
  )
}

/* ── Attention-items list ─────────────────────────────────────────────────── */

export interface CockpitIssueListProps {
  config: EntityConfig
  issues: NonNullable<CockpitFlowsConfig['issues']>
  records: EntityRecord[]
  onSuggest: (recordId: string) => void
}

export function CockpitIssueList({ config, issues, records, onSuggest }: CockpitIssueListProps) {
  if (records.length === 0) {
    return <p className="text-body-sm text-muted-foreground">Nothing needs attention right now.</p>
  }
  return (
    <ul className="flex list-none flex-col gap-2 p-0">
      {records.map((record) => {
        const status = cockpitStatusOf(config, record)
        const reason = fieldText(record, issues.reasonCol)
        return (
          <li
            key={record.id}
            data-slot="cockpit-issue-card"
            className="flex flex-col gap-2 rounded-md border border-destructive/20 bg-destructive/6 p-3.5"
          >
            <div className="flex items-center gap-2">
              <MapPin className="size-4 flex-none text-destructive" aria-hidden="true" />
              <span className="min-w-0 flex-1 truncate text-body-sm font-semibold text-foreground">
                {recordTitle(record)}
              </span>
              {status ? (
                <StatusPill appearance="tint" color={status.color}>
                  {status.label}
                </StatusPill>
              ) : null}
            </div>
            {reason ? <p className="text-body-xs text-muted-foreground">{reason}</p> : null}
            <div className="flex justify-end">
              <Button size="sm" variant="secondary" onClick={() => onSuggest(record.id)}>
                {issues.suggestLabel ?? 'Suggest options'}
                <ArrowRight className="size-4" aria-hidden="true" />
              </Button>
            </div>
          </li>
        )
      })}
    </ul>
  )
}

/* ── Candidate picker ─────────────────────────────────────────────────────── */

export interface CockpitCandidateListProps {
  config: EntityConfig
  records: EntityRecord[]
  label: string
  selectedId: string | null
  onSelect: (id: string | null) => void
}

export function CockpitCandidateList({
  config,
  records,
  label,
  selectedId,
  onSelect,
}: CockpitCandidateListProps) {
  return (
    <ul className="flex list-none flex-col gap-2 p-0" aria-label={label}>
      {records.map((record) => {
        const status = cockpitStatusOf(config, record)
        const selected = selectedId === record.id
        return (
          <li key={record.id}>
            <button
              type="button"
              aria-pressed={selected}
              onClick={() => onSelect(selected ? null : record.id)}
              className={cn(
                'flex w-full items-center gap-2 rounded-md border p-3 text-start outline-none transition-colors duration-fast focus-visible:ring-2 focus-visible:ring-ring',
                selected ? 'border-primary bg-primary/5' : 'border-border bg-card hover:bg-muted/50',
              )}
            >
              <span className="min-w-0 flex-1 truncate text-body-sm font-medium text-foreground">
                {recordTitle(record)}
              </span>
              {status ? (
                <StatusPill appearance="tint" color={status.color}>
                  {status.label}
                </StatusPill>
              ) : null}
            </button>
          </li>
        )
      })}
    </ul>
  )
}

/* ── Replacement summary (current struck vs standby) ──────────────────────── */

export interface CockpitReplaceSummaryProps {
  replace: NonNullable<CockpitFlowsConfig['replace']>
  target: EntityRecord | undefined
}

export function CockpitReplaceSummary({ replace, target }: CockpitReplaceSummaryProps) {
  const hasDetails = Boolean(replace.currentCols?.length || replace.standbyCols?.length)
  return (
    <div className="flex flex-col gap-3">
      {(replace.currentCols ?? []).map((col) => {
        const value = fieldText(target, col)
        return value ? (
          <p key={col} className="text-body-sm text-muted-foreground line-through">
            {value}
          </p>
        ) : null
      })}
      {(replace.standbyCols ?? []).map((col) => {
        const value = fieldText(target, col)
        return value ? (
          <p key={col} className="text-body-sm font-medium text-foreground">
            {value}
          </p>
        ) : null
      })}
      {!hasDetails ? (
        <p className="text-body-sm text-muted-foreground">No replacement details configured.</p>
      ) : null}
    </div>
  )
}

/* ── Between-sheets "finding…" overlay ────────────────────────────────────── */

export interface CockpitFindingOverlayProps {
  label: string
}

export function CockpitFindingOverlay({ label }: CockpitFindingOverlayProps) {
  return (
    <div
      role="status"
      aria-live="polite"
      className="fixed inset-0 z-overlay flex flex-col items-center justify-center gap-3 bg-overlay-black-60"
    >
      {/* `data-motion="essential"` keeps this spinning under
          `prefers-reduced-motion: reduce` — it is a status indicator, not
          decoration, and a frozen glyph is no progress signal at all. */}
      <Loader2
        className="size-8 animate-spin text-primary-foreground"
        data-motion="essential"
        aria-hidden="true"
      />
      <p className="text-body-sm font-medium text-primary-foreground">{label}</p>
    </div>
  )
}
