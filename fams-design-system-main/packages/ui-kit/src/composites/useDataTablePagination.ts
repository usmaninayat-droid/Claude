import { useCallback, useMemo, useState } from 'react'

/**
 * useDataTablePagination — DataTable's presentational pagination (see the
 * DataTable "Pagination contract" JSDoc). Never fetches: server mode renders
 * `sortedData` as-is; client-convenience mode slices it. Internal to
 * DataTable; behavior identical to the original inline implementation.
 */
export function useDataTablePagination<T>({
  sortedData,
  dataLength,
  page: pageProp,
  pageSize,
  rowCount,
  onPaginationChange,
}: {
  sortedData: T[]
  dataLength: number
  page?: number
  pageSize?: number
  rowCount?: number
  onPaginationChange?: (state: { page: number; pageSize: number }) => void
}) {
  const [internalPage, setInternalPage] = useState(1)
  const rawPage = pageProp ?? internalPage

  const isClientPaged =
    pageSize !== undefined && rowCount === undefined && dataLength > pageSize

  const pageCount = useMemo(() => {
    if (pageSize === undefined) return 1
    const total = rowCount ?? dataLength
    return Math.max(1, Math.ceil(total / pageSize))
  }, [pageSize, rowCount, dataLength])

  // Effective page for rendering: clamp to `pageCount` so a shrinking dataset
  // (rows deleted/filtered while parked on a later page) never strands the
  // table on a page past the end — empty body + "Page 3 of 2". Pure
  // derivation, not setState-in-effect: it never fires `onPaginationChange`
  // on its own, so controlled mode renders the clamped page without
  // surprising the caller. `internalPage` itself is left untouched so it
  // naturally "restores" if `pageCount` grows back (e.g. filter cleared).
  const currentPage = Math.min(rawPage, pageCount)

  const pageData = useMemo(() => {
    if (!isClientPaged || pageSize === undefined) return sortedData
    const start = (currentPage - 1) * pageSize
    return sortedData.slice(start, start + pageSize)
  }, [isClientPaged, sortedData, currentPage, pageSize])

  const goToPage = useCallback(
    (next: number) => {
      if (pageSize === undefined) return
      const clamped = Math.min(Math.max(next, 1), pageCount)
      if (pageProp === undefined) setInternalPage(clamped)
      onPaginationChange?.({ page: clamped, pageSize })
    },
    [pageProp, pageCount, pageSize, onPaginationChange],
  )

  return { currentPage, pageCount, pageData, goToPage }
}
