import { Button, StatusPill } from '@fams/ui-kit'
import { ArrowRight } from '@fams/ui-kit/icons'
import type { EntityConfig, EntityRecord } from '@fams/v5-composer'
import { cn } from '../../lib/cn'
import { cellText, columnLabel, listColumnKeys, stageDef, stageOf } from './console-model'

export interface ConsoleRecordSummaryProps {
  config: EntityConfig
  record: EntityRecord
  /** Stage-advance controls (the host's guarded transitions), if any. */
  actions?: React.ReactNode
  /** "Open full record" — omitted renders no link. */
  onOpenRecord?: (record: EntityRecord) => void
  className?: string
}

/** How many fields the derived summary lists before it stops. */
const FIELD_BUDGET = 10

/**
 * ConsoleRecordSummary — the default body of a console's side panel.
 * [tier-2 internal]
 *
 * The blueprint's own list fields as a label/value stack, its stage as the
 * module's coloured pill, and a link out to the record's real detail surface.
 * Deliberately modest: a console panel exists to support ONE decision, and
 * the full profile already lives one click away — a host with real assignment
 * controls passes them as `actions`, or replaces this body entirely
 * (`renderAssignment`).
 */
export function ConsoleRecordSummary({
  config,
  record,
  actions,
  onOpenRecord,
  className,
}: ConsoleRecordSummaryProps) {
  const stage = stageDef(config, stageOf(record))
  const fields = listColumnKeys(config)
    .filter((col) => col !== 'status')
    .slice(0, FIELD_BUDGET)

  return (
    <div data-slot="console-record-summary" className={cn('flex flex-col gap-section', className)}>
      {stage && (
        <StatusPill color={stage.color} textColor={stage.textColor} className="w-fit">
          {stage.label}
        </StatusPill>
      )}
      <dl className="grid grid-cols-1 gap-field sm:grid-cols-2">
        {fields.map((col) => (
          <div key={col} className="flex min-w-0 flex-col">
            <dt className="text-caption font-semibold uppercase tracking-wide text-muted-foreground">
              {columnLabel(config, col)}
            </dt>
            <dd className="truncate text-body-sm text-foreground">{cellText(record, col)}</dd>
          </div>
        ))}
      </dl>
      {actions}
      {onOpenRecord && (
        <Button variant="secondary" size="sm" className="w-fit" onClick={() => onOpenRecord(record)}>
          <ArrowRight className="size-4" aria-hidden="true" />
          Open full record
        </Button>
      )}
    </div>
  )
}

ConsoleRecordSummary.displayName = 'ConsoleRecordSummary'
