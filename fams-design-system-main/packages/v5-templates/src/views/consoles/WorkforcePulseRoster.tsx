import { useMemo } from 'react'
import { Button, DataTable, TableCell, type DataTableColumn } from '@fams/ui-kit'
import { Icon } from '@fams/ui-kit/icons'
import type { EntityConfig, EntityRecord } from '@fams/v5-composer'
import { cellText, columnLabel, identityCol } from './console-model'
import { presenceCol, type PulsePerson } from './workforce-model'

export interface WorkforcePulseRosterProps {
  config: EntityConfig
  roster: PulsePerson[]
  /** Header label for the person column (the blueprint's own field name). */
  personLabel: string
  /** The active `{ col, value }` scope, if the pulse is narrowed. */
  scope: { col: string; value: string } | null
  onScopeChange: (scope: { col: string; value: string } | null) => void
  onOpenRecord?: (record: EntityRecord) => void
  loading?: boolean
}

/**
 * WorkforcePulseRoster — the pulse's people table. [tier-2 internal]
 *
 * One row per person: an `entity` identity cell, their assignment count, the
 * presence state they last reported, and the assignment they are on. Split
 * out of `WorkforcePulseView` under root rule 12 — the pulse's five bands
 * plus this table's column derivation do not belong in one file.
 *
 * A presence cell is CLICKABLE: it scopes the whole pulse to that state, so
 * the KPI row, the panels, the chart and the feed all narrow together. The
 * active scope surfaces as a clear affordance in the toolbar above.
 */
export function WorkforcePulseRoster({
  config,
  roster,
  personLabel,
  scope,
  onScopeChange,
  onOpenRecord,
  loading,
}: WorkforcePulseRosterProps) {
  const presence = presenceCol(config)
  const identity = identityCol(config)

  const columns = useMemo<DataTableColumn<PulsePerson>[]>(() => {
    const cols: DataTableColumn<PulsePerson>[] = [
      {
        key: 'name',
        label: personLabel,
        contentType: 'variable-id',
        isSortable: true,
        sortAccessor: (row) => row.name,
        minWidth: '14rem',
        render: (row) => (
          <TableCell
            kind="entity"
            media={<Icon name="user-01" size={16} />}
            label={row.name}
            secondary={row.records.length > 1 ? `${row.records.length} assignments` : undefined}
          />
        ),
      },
      {
        key: 'assignment',
        label: columnLabel(config, identity),
        contentType: 'descriptive',
        minWidth: '14rem',
        render: (row) => <TableCell kind="text" value={cellText(row.records[0], identity)} />,
      },
    ]
    if (presence) {
      cols.push({
        key: presence,
        label: columnLabel(config, presence),
        contentType: 'fixed-content',
        isSortable: true,
        sortAccessor: (row) => cellText(row.records[0], presence),
        minWidth: '10rem',
        render: (row) => {
          const value = cellText(row.records[0], presence)
          if (value === '—') return <TableCell kind="empty" />
          const active = scope?.col === presence && scope.value === value
          return (
            <Button
              variant="ghost"
              size="sm"
              aria-pressed={active}
              onClick={(event) => {
                // The row itself opens the record — a cell-level scope
                // control must not also trigger that.
                event.stopPropagation()
                onScopeChange(active ? null : { col: presence, value })
              }}
            >
              {value}
            </Button>
          )
        },
      })
    }
    return cols
  }, [config, personLabel, identity, presence, scope, onScopeChange])

  return (
    <div data-slot="pulse-roster" className="flex flex-col gap-field">
      <div className="flex items-center justify-between gap-inline">
        <h3 className="text-body-lg font-semibold text-foreground">{personLabel}</h3>
        {scope && (
          <Button variant="ghost" size="sm" onClick={() => onScopeChange(null)}>
            Clear {columnLabel(config, scope.col).toLowerCase()}: {scope.value}
          </Button>
        )}
      </div>
      <DataTable
        data={roster}
        columns={columns}
        density="compact"
        hasStickyHeader
        hasRowHoverAffordance
        loading={loading}
        getRowId={(row) => row.id}
        ariaLabel={`${config.name} ${personLabel.toLowerCase()}`}
        onRowClick={onOpenRecord ? (row) => onOpenRecord(row.records[0]) : undefined}
      />
    </div>
  )
}

WorkforcePulseRoster.displayName = 'WorkforcePulseRoster'
