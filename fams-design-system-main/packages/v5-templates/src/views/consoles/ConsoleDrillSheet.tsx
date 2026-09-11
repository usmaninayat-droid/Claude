import { useMemo } from 'react'
import { DataTable, DetailSheet } from '@fams/ui-kit'
import type { EntityConfig, EntityRecord } from '@fams/v5-composer'
import { consoleQueueColumns } from './console-queue-columns'

export interface ConsoleDrill {
  /** Sheet title — the metric's own label. */
  label: string
  /** The metric's OWN population, never the whole record set. */
  records: EntityRecord[]
}

export interface ConsoleDrillSheetProps {
  config: EntityConfig
  drill: ConsoleDrill | null
  onClose: () => void
  onOpenRecord?: (record: EntityRecord) => void
}

/**
 * ConsoleDrillSheet — the shared raw-data drill-in for every operations
 * console. [tier-2 internal]
 *
 * Every KPI tile on a console is a question, and this is the answer: the
 * exact rows behind that one number, in the same dense console row every
 * console uses, with a click through to a record's real detail surface.
 *
 * Named for the tier, not for one lens: the fleet console's KPI band and the
 * workforce pulse's both open THIS sheet (the reference surfaces both
 * consoles were ported from each had their own raw-data side sheet, and
 * shipping two would have been the fork this tier forbids).
 *
 * Scoped POPULATION, not the whole set — the reference surface this lens was
 * ported from learned that the hard way (a drill sheet showing every record
 * regardless of which tile opened it makes the tile's number unverifiable),
 * and `CockpitView`'s `kpiPopulation` encodes the same rule for the authored
 * cockpit. The population is resolved by the caller and handed in whole.
 */
export function ConsoleDrillSheet({
  config,
  drill,
  onClose,
  onOpenRecord,
}: ConsoleDrillSheetProps) {
  const columns = useMemo(() => consoleQueueColumns({ config }), [config])
  return (
    <DetailSheet
      open={Boolean(drill)}
      onOpenChange={(open) => {
        if (!open) onClose()
      }}
      width="lg"
      title={drill?.label ?? ''}
      subtitle={
        drill ? `${drill.records.length} ${drill.records.length === 1 ? 'record' : 'records'}` : undefined
      }
    >
      {drill && (
        <DataTable
          data={drill.records}
          columns={columns}
          density="compact"
          hasStickyHeader
          hasRowHoverAffordance
          ariaLabel={drill.label}
          onRowClick={onOpenRecord ? (row) => onOpenRecord(row) : undefined}
        />
      )}
    </DetailSheet>
  )
}

ConsoleDrillSheet.displayName = 'ConsoleDrillSheet'
