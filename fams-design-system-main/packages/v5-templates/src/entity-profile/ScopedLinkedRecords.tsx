import { useMemo } from 'react'
import { Link2 } from '@fams/ui-kit/icons'
import { StatusView } from '@fams/ui-kit'
import { useLinkedRecordOpener } from '@fams/v5-composer'
import { cn } from '../lib/cn'
import { RecordTable } from './RecordTable'
import { useModuleRecords } from './module-records'
import type { ScopedLinkedRecordsProps } from './ScopedLinkedRecords.types'

/**
 * ScopedLinkedRecords — a detail-sheet tab showing ANOTHER module's records,
 * scoped to the ones that reference the profiled record. [tier-2 pattern]
 * See `ScopedLinkedRecords.types.ts` for the full config contract.
 *
 * Reads the target module's full record set through `useModuleRecords()`
 * (`module-records.tsx`) — the app-injected cross-module directory, same
 * seam `V5ModuleSurfaceProps.resolveModuleRecords` already serves for the
 * creation-sheet reference picker and the Live Monitoring incidents overlay —
 * then filters to the rows whose `matchField` value (read as a scalar OR an
 * array, always compared stringified) equals the profiled record's
 * `matchAgainst` value (default its `id`). No provider mounted, or the
 * target module unresolved, degrades to the SAME empty state as zero
 * matching rows (Rule 8: never guess, never crash).
 *
 * Row activation goes through `useLinkedRecordOpener()` (`@fams/v5-composer`)
 * so opening a scoped row STACKS a new sheet on top, exactly like every other
 * reference cell on the platform — never a local navigation. Presentation
 * delegates entirely to `RecordTable` (its generic `rows` prop, `A2` of this
 * wave): this file renders no table markup of its own.
 */
function toMatchStrings(value: unknown): string[] {
  if (value == null) return []
  if (Array.isArray(value)) return value.map((entry) => String(entry))
  return [String(value)]
}

export function ScopedLinkedRecords({
  record,
  entityType,
  matchField,
  matchAgainst = 'id',
  columns,
  search = false,
  searchPlaceholder,
  emptyLabel,
  statusColors,
  limit,
  className,
}: ScopedLinkedRecordsProps) {
  const resolveModuleRecords = useModuleRecords()
  const openLinkedRecord = useLinkedRecordOpener()

  const targetValue = record ? String(record[matchAgainst] ?? '') : undefined
  const resolved = resolveModuleRecords?.(entityType)

  // The target module's own status vocabulary, so a scoped pill reads the same
  // label the owning module's list shows for the same record. Derived from the
  // resolved config the records came with — a blueprint never restates it.
  const statusLabels = useMemo(() => {
    const out: Record<string, string> = {}
    for (const s of resolved?.config?.uiConfig?.statusList ?? []) {
      if (s?.key && s.label) out[s.key] = s.label
    }
    return out
  }, [resolved])

  const rows = useMemo(() => {
    if (!resolved || !targetValue) return []
    const scoped = resolved.records.filter((candidate) => toMatchStrings(candidate[matchField]).includes(targetValue))
    return limit != null ? scoped.slice(0, limit) : scoped
  }, [resolved, matchField, targetValue, limit])

  if (rows.length === 0) {
    return (
      <div className={cn('flex min-h-40 items-center justify-center', className)}>
        <StatusView
          kind="empty"
          icon={<Link2 aria-hidden="true" className="size-8" />}
          title={emptyLabel ?? 'Nothing linked yet'}
          description="Records that reference this one will show up here."
        />
      </div>
    )
  }

  return (
    <RecordTable
      className={className}
      rows={rows}
      columns={columns}
      search={search}
      searchPlaceholder={searchPlaceholder}
      statusColors={statusColors}
      statusLabels={statusLabels}
      onRowClick={
        openLinkedRecord
          ? (row) => openLinkedRecord({ entityType, recordId: String(row.id) })
          : undefined
      }
    />
  )
}

ScopedLinkedRecords.displayName = 'ScopedLinkedRecords'
