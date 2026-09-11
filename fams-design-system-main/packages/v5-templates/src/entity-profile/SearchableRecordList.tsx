import { useMemo, useState } from 'react'
import { Search } from '@fams/ui-kit/icons'
import { Input, StatusPill } from '@fams/ui-kit'
import { cn } from '../lib/cn'
import { readRows, resolveOptionalIcon } from './overview-widget-parts'
import type { SearchableRecordListProps, SearchableRecordMeta } from './SearchableRecordList.types'

/**
 * SearchableRecordList — a "search box over a scrolling list of compact rows"
 * detail-sheet tab. [tier-2 pattern] See `SearchableRecordList.types.ts` for
 * the full config contract.
 *
 * Composes the SAME dense row anatomy the demo env's Related Requests/
 * Complaints tab established (bordered row, muted lead id + bold title,
 * muted meta line, trailing solid `StatusPill`) — lifted here so a blueprint
 * can name it for any module's "related records of one kind" tab instead of
 * each app forking a private copy.
 *
 * Layout mirrors that precedent exactly: the search input stays put
 * (`shrink-0`) while only the list scrolls (`min-h-0 flex-1 overflow-y-auto`)
 * inside the host tab panel's own gutter.
 */
export function SearchableRecordList({
  record,
  itemsField,
  idKey,
  leadKey,
  titleKey,
  statusKey,
  statusColors,
  meta,
  strings,
  className,
}: SearchableRecordListProps) {
  const [query, setQuery] = useState('')
  const s = {
    searchPlaceholder: 'Search',
    emptyText: 'Nothing to show yet.',
    noMatchText: 'No results match “{query}”.',
    ...strings,
  }

  const rows = readRows(record, itemsField)
  const q = query.trim().toLowerCase()
  const visible = useMemo(() => {
    if (!q) return rows
    const keys = [leadKey, titleKey, ...(meta ?? []).map((m) => m.key)].filter(Boolean) as string[]
    return rows.filter((row) => keys.some((k) => String(row[k] ?? '').toLowerCase().includes(q)))
    // `rows` is a fresh array identity per render (readRows reads off the
    // record) — depending on it would defeat the memo, so the memo is keyed
    // on the record + field + query that actually determine the result.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [record, itemsField, q, leadKey, titleKey, meta])

  const renderMeta = (row: Record<string, unknown>, item: SearchableRecordMeta) => {
    const value = row[item.key]
    if (value == null || value === '') return null
    const Glyph = resolveOptionalIcon(item.icon)
    return (
      <span key={item.key} className="flex min-w-0 shrink-0 items-center gap-1">
        {Glyph ? <Glyph aria-hidden="true" className="size-3 shrink-0" /> : null}
        <span className="truncate">
          {item.prefix}
          {String(value)}
        </span>
      </span>
    )
  }

  return (
    <div data-slot="searchable-record-list" className={cn('flex h-full min-h-0 flex-col gap-3', className)}>
      <Input
        type="search"
        value={query}
        onChange={(event) => setQuery(event.target.value)}
        placeholder={s.searchPlaceholder}
        aria-label={s.searchPlaceholder}
        leadingIcon={<Search aria-hidden="true" className="size-4" />}
        className="h-9 shrink-0"
      />
      {rows.length === 0 ? (
        <p className="text-body-sm text-muted-foreground">{s.emptyText}</p>
      ) : visible.length === 0 ? (
        <p className="text-body-sm text-muted-foreground">{s.noMatchText.replace('{query}', query.trim())}</p>
      ) : (
        <ul data-slot="searchable-record-list-items" className="flex min-h-0 flex-1 flex-col gap-2 overflow-y-auto">
          {visible.map((row, index) => {
            const status = statusKey ? row[statusKey] : undefined
            const statusText = status == null || status === '' ? undefined : String(status)
            return (
              <li key={String(idKey ? (row[idKey] ?? index) : index)}>
                <div
                  data-slot="searchable-record-row"
                  className="flex w-full flex-col gap-1 rounded-sm border border-border bg-card px-3 py-2"
                >
                  <span className="flex w-full min-w-0 items-center gap-2">
                    {leadKey && row[leadKey] != null && row[leadKey] !== '' ? (
                      <span className="shrink-0 text-caption font-medium text-muted-foreground">
                        {String(row[leadKey])}
                      </span>
                    ) : null}
                    <span className="min-w-0 flex-1 truncate text-body-sm font-medium text-foreground">
                      {String(row[titleKey] ?? '')}
                    </span>
                    {statusText ? (
                      <StatusPill color={statusColors?.[statusText]}>{statusText}</StatusPill>
                    ) : null}
                  </span>
                  {meta?.length ? (
                    <span className="flex w-full min-w-0 flex-wrap items-center gap-x-3 gap-y-1 text-caption text-muted-foreground">
                      {meta.map((item) => renderMeta(row, item))}
                    </span>
                  ) : null}
                </div>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}

SearchableRecordList.displayName = 'SearchableRecordList'
