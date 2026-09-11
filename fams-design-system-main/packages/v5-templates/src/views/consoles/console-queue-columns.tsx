import { StatusPill, TableCell, type DataTableColumn } from '@fams/ui-kit'
import { Icon } from '@fams/ui-kit/icons'
import type { EntityConfig, EntityRecord } from '@fams/v5-composer'
import {
  ageCol,
  ageMinutes,
  cellText,
  classificationCol,
  columnLabel,
  formatAge,
  identityCol,
  listColumnKeys,
  stageDef,
  stageOf,
} from './console-model'

/**
 * console-queue-columns — the dense operational row the consoles share.
 * [tier-2 internal]
 *
 * One row = one record, read at a glance: an `entity` cell for identity (the
 * blueprint's own identity column over its uid as the secondary line), the
 * STAGE as the module's own coloured `StatusPill`, an `icon-value` cell per
 * supporting field, and a `metrics` cell for age. Every binding comes from
 * the blueprint (`listcolumns` order, `systemcolumns` labels,
 * `uiConfig.statusList` colours) — nothing here names a domain field.
 */

/** How many supporting fields a compact queue row carries beyond identity. */
const SUPPORTING_COLS = 3

export interface ConsoleQueueColumnOptions {
  config: EntityConfig
  /** Glyph name for the identity cell's leading media. */
  identityIcon?: string
  /** Supporting-field budget (default 3 — a compact row, not a full table). */
  supportingCols?: number
}

/**
 * The supporting field keys a console row shows: the blueprint's list-column
 * order, minus identity / uid / stage (each already has its own cell) and
 * minus the age column (rendered as the metrics cell).
 */
export function supportingCols(config: EntityConfig, budget = SUPPORTING_COLS): string[] {
  const identity = identityCol(config)
  const age = ageCol(config)
  return listColumnKeys(config)
    .filter((col) => col !== identity && col !== 'status' && col !== 'uniqueidentifier' && col !== age)
    .slice(0, budget)
}

/** The dense console row's DataTable columns, derived from the blueprint. */
export function consoleQueueColumns({
  config,
  identityIcon,
  supportingCols: budget,
}: ConsoleQueueColumnOptions): DataTableColumn<EntityRecord>[] {
  const identity = identityCol(config)
  const age = ageCol(config)
  const priority = classificationCol(config)
  const supporting = supportingCols(config, budget)

  const cols: DataTableColumn<EntityRecord>[] = [
    {
      key: identity,
      label: columnLabel(config, identity),
      contentType: 'variable-id',
      isSortable: true,
      sortAccessor: (row) => cellText(row, identity),
      minWidth: '14rem',
      render: (row) => (
        <TableCell
          kind="entity"
          media={identityIcon ? <Icon name={identityIcon} size={16} /> : undefined}
          label={cellText(row, identity)}
          secondary={row.uniqueidentifier ? String(row.uniqueidentifier) : undefined}
        />
      ),
    },
  ]

  if ((config.uiConfig.statusList ?? []).length) {
    cols.push({
      key: 'status',
      label: columnLabel(config, 'status'),
      contentType: 'fixed-content',
      isSortable: true,
      sortAccessor: (row) => stageOf(row),
      minWidth: '9rem',
      render: (row) => {
        const stage = stageDef(config, stageOf(row))
        if (!stage) return <TableCell kind="empty" />
        return (
          <StatusPill color={stage.color} textColor={stage.textColor} appearance="tint">
            {stage.label}
          </StatusPill>
        )
      },
    })
  }

  for (const col of supporting) {
    cols.push({
      key: col,
      label: columnLabel(config, col),
      contentType: 'descriptive',
      isSortable: true,
      sortAccessor: (row) => cellText(row, col),
      minWidth: '9rem',
      render: (row) => (
        <TableCell
          kind="icon-value"
          icon={col === priority ? <Icon name="flag-01" size={14} /> : undefined}
          value={cellText(row, col)}
          iconLabel={col === priority ? columnLabel(config, col) : undefined}
        />
      ),
    })
  }

  if (age) {
    cols.push({
      key: age,
      label: columnLabel(config, age),
      contentType: 'fixed-content',
      align: 'end',
      isSortable: true,
      sortAccessor: (row) => ageMinutes(row, age) ?? -1,
      minWidth: '8rem',
      render: (row) => {
        const mins = ageMinutes(row, age)
        if (mins === undefined) return <TableCell kind="empty" />
        return (
          <TableCell
            kind="metrics"
            metrics={[
              {
                id: 'age',
                icon: <Icon name="clock" size={14} />,
                value: formatAge(mins),
                label: columnLabel(config, age),
                tone: mins > 24 * 60 ? 'danger' : mins > 4 * 60 ? 'warning' : 'neutral',
              },
            ]}
          />
        )
      },
    })
  }

  return cols
}
