import * as React from 'react';
import { ArrowUpDown, ArrowUp, ArrowDown, ChevronRight, ChevronDown } from 'lucide-react';
import { cn } from '../utils/cn';
import { Checkbox } from '../primitives/checkbox';
import { TableCell, type TableCellKind } from './table-cell';
import { ColumnConfig } from './column-config';

export interface DataTableColumn<T = any> {
  id: string;
  header: React.ReactNode;
  /** Either accessor returns the rendered ReactNode, or kind+accessor for cell typing. */
  accessor?: (row: T) => unknown;
  kind?: TableCellKind;
  sortable?: boolean;
  width?: string;
  align?: 'left' | 'center' | 'right';
  /** When provided, this overrides cell rendering entirely. */
  cell?: (row: T) => React.ReactNode;
}

export interface DataTableProps<T = any> extends React.HTMLAttributes<HTMLDivElement> {
  columns: DataTableColumn<T>[];
  data: T[];
  getRowId?: (row: T, index: number) => string;
  selectable?: boolean;
  selectedIds?: string[];
  onSelectionChange?: (ids: string[]) => void;
  onRowClick?: (row: T) => void;
  /** Per-row class hook — e.g. subtle status background tints (RAG bands). */
  rowClassName?: (row: T) => string | undefined;
  emptyState?: React.ReactNode;
  loading?: boolean;
  stickyHeader?: boolean;
  /**
   * Show a "Columns" control (a config popover with a show/hide toggle per
   * column + search) above the table. Off → no toolbar, all columns shown
   * (unchanged behaviour). The "manage columns" capability for list/table views.
   */
  manageColumns?: boolean;
  /**
   * Optional grouping. When set, rows are partitioned by `get(row)` into
   * collapsible sections, each introduced by a group-header row (label + count).
   * Omit for a flat table (unchanged behavior).
   */
  groupBy?: {
    get: (row: T) => string;
    /** Render the group header label (defaults to the raw key). */
    label?: (key: string) => React.ReactNode;
  };
  /**
   * T-087 — windowed lazy scroll, replacing Prev/Next page controls for large
   * datasets. `'lazy'` makes the table's own scroll region (the wrapper div,
   * already `overflow-auto`) reveal rows in `chunkSize` batches as a bottom
   * sentinel nears it, while only a bounded WINDOW of rows around the current
   * scroll position stay mounted — top/bottom spacer rows preserve true
   * scrollbar geometry against the FULL row count. Ignored when `groupBy` is
   * set (unsupported combination — group each row set with its own bounded
   * page instead, see `data-table.spec.md`). Omit (default) for unchanged,
   * fully-rendered behavior.
   */
  scrollMode?: 'lazy';
  /**
   * Row height in px used for the lazy-mode spacer math. Defaults to 44 and
   * self-corrects once the first rendered row is measured (uniform-row-height
   * assumption — pass this explicitly if rows are a very different height).
   */
  rowHeightPx?: number;
  /** Rows revealed per chunk as the bottom sentinel nears the viewport (lazy mode only). Default 100. */
  chunkSize?: number;
  /**
   * Rows kept mounted around the current scroll position, in ADDITION to one
   * viewport+overscan's worth (lazy mode only) — hard-bounds the DOM
   * regardless of how far the user has scrolled. Default 300.
   */
  windowSize?: number;
  /**
   * Lazy mode only — fired whenever the revealed-so-far count or total
   * changes, so a consumer can render an honest "Showing 1–{loadedCount} of
   * {total}" footer instead of the simpler "{total} · scroll for more".
   */
  onLazyProgress?: (info: { loadedCount: number; total: number }) => void;
}

const DEFAULT_ROW_HEIGHT_PX = 44;
const DEFAULT_CHUNK_SIZE = 100;
const DEFAULT_WINDOW_SIZE = 300;
const EMPTY_ARRAY: never[] = [];

/** T-087 — drives `scrollMode="lazy"`: a monotonic "revealed so far" frontier
 *  (`loadedCount`, grows in `chunkSize` batches once a bottom sentinel nears
 *  the scroll container) combined with a bounded, scroll-position-based
 *  mount WINDOW inside it (`range`) — so scrolling back UP to an already-
 *  revealed row re-mounts it (no data loss for a row that holds live
 *  controlled inputs upstream) while the DOM never holds more than
 *  ~`windowSize` rows regardless of how deep the user has scrolled. */
function useLazyScroll(
  enabled: boolean,
  scrollRef: React.RefObject<HTMLDivElement>,
  data: unknown[],
  rowHeightPx: number,
  chunkSize: number,
  windowSize: number,
) {
  const total = data.length;
  const [loadedCount, setLoadedCount] = React.useState(() => Math.min(total, chunkSize));
  const [range, setRange] = React.useState({ start: 0, end: Math.min(total, chunkSize) });
  const sentinelRef = React.useRef<HTMLTableRowElement>(null);

  // Reset to the top whenever the underlying row SET changes (a new search /
  // filter / sort produced a different `data` array) — T-087 req (e).
  const prevDataRef = React.useRef(data);
  React.useEffect(() => {
    if (!enabled) return;
    if (prevDataRef.current !== data) {
      prevDataRef.current = data;
      const next = Math.min(total, chunkSize);
      setLoadedCount(next);
      setRange({ start: 0, end: next });
      if (scrollRef.current) scrollRef.current.scrollTop = 0;
    }
  }, [enabled, data, total, chunkSize, scrollRef]);

  const recompute = React.useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    const viewportRows = Math.max(1, Math.ceil(el.clientHeight / rowHeightPx));
    const overscan = viewportRows;
    const firstVisible = Math.floor(el.scrollTop / rowHeightPx);
    const desiredEnd = firstVisible + viewportRows + overscan;

    // A single big jump (scrollbar drag, or a huge instant scrollTop set)
    // can land past the "revealed so far" frontier BEFORE the bottom
    // sentinel ever gets a chance to intersect and grow it — without this,
    // `end` clamps to the stale (smaller) `loadedCount` while `start` (pure
    // scrollTop math) keeps climbing, producing an INVERTED start>end slice
    // (zero rows, ever-growing spacer, no way to recover). Catch the jump up
    // to at least the current viewport's needs immediately, in whole
    // `chunkSize` increments.
    let effectiveLoaded = loadedCount;
    if (desiredEnd > effectiveLoaded) {
      effectiveLoaded = Math.min(total, Math.max(effectiveLoaded + chunkSize, Math.ceil(desiredEnd / chunkSize) * chunkSize));
      setLoadedCount(effectiveLoaded);
    }

    const start = Math.max(0, firstVisible - overscan);
    let end = Math.min(effectiveLoaded, desiredEnd);
    if (end - start > windowSize) end = start + windowSize;
    setRange((prev) => (prev.start === start && prev.end === end ? prev : { start, end }));
  }, [scrollRef, rowHeightPx, windowSize, loadedCount, chunkSize, total]);

  React.useEffect(() => {
    if (!enabled) return;
    const el = scrollRef.current;
    if (!el) return;
    let raf = 0;
    const onScroll = () => {
      if (raf) return;
      raf = requestAnimationFrame(() => { raf = 0; recompute(); });
    };
    recompute();
    el.addEventListener('scroll', onScroll, { passive: true });
    const ro = new ResizeObserver(() => recompute());
    ro.observe(el);
    return () => {
      el.removeEventListener('scroll', onScroll);
      ro.disconnect();
      if (raf) cancelAnimationFrame(raf);
    };
  }, [enabled, recompute, scrollRef]);

  // Re-run the window math whenever the reveal frontier itself grows (either
  // from the catch-up above or the sentinel below) — `recompute` closes over
  // `loadedCount`, so its identity changes and this re-fires.
  React.useEffect(() => {
    if (!enabled) return;
    recompute();
  }, [enabled, loadedCount, recompute]);

  React.useEffect(() => {
    if (!enabled) return;
    const root = scrollRef.current;
    const target = sentinelRef.current;
    if (!root || !target || loadedCount >= total) return;
    const io = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) setLoadedCount((c) => Math.min(total, c + chunkSize));
      },
      { root, rootMargin: '600px 0px' },
    );
    io.observe(target);
    return () => io.disconnect();
  }, [enabled, scrollRef, loadedCount, total, chunkSize]);

  return { range, loadedCount, sentinelRef };
}

/**
 * DataTable — generic sortable / selectable table built on TableCell.
 * Uses native <table> semantics; ScrollArea omitted to keep things simple.
 * Pattern #16 chassis — column visibility, sort, multi-select, grouping headers.
 */
export function DataTable<T = any>({
  columns,
  data,
  getRowId,
  selectable,
  selectedIds = [],
  onSelectionChange,
  onRowClick,
  rowClassName,
  emptyState,
  loading,
  stickyHeader = true,
  manageColumns,
  groupBy,
  scrollMode,
  rowHeightPx: rowHeightProp,
  chunkSize = DEFAULT_CHUNK_SIZE,
  windowSize = DEFAULT_WINDOW_SIZE,
  onLazyProgress,
  className,
  ...rest
}: DataTableProps<T>) {
  const [sort, setSort] = React.useState<{ id: string; dir: 'asc' | 'desc' } | null>(null);
  const [collapsedGroups, setCollapsedGroups] = React.useState<Record<string, boolean>>({});
  const [hiddenCols, setHiddenCols] = React.useState<Set<string>>(new Set());
  // Columns actually rendered — all of them unless `manageColumns` is hiding some.
  const visibleColumns = manageColumns ? columns.filter((c) => !hiddenCols.has(c.id)) : columns;

  // T-087 — lazy windowed scroll (unsupported combined with `groupBy`, see prop doc).
  const scrollRef = React.useRef<HTMLDivElement>(null);
  const firstRowRef = React.useRef<HTMLTableRowElement>(null);
  const [measuredRowHeight, setMeasuredRowHeight] = React.useState<number | undefined>(undefined);
  const rowHeightPx = rowHeightProp ?? measuredRowHeight ?? DEFAULT_ROW_HEIGHT_PX;
  const lazy = scrollMode === 'lazy' && !groupBy;

  const sortedData = React.useMemo(() => {
    if (!sort) return data;
    const col = columns.find((c) => c.id === sort.id);
    if (!col?.accessor) return data;
    const sorted = [...data].sort((a, b) => {
      const av = col.accessor!(a);
      const bv = col.accessor!(b);
      if (av == null) return 1;
      if (bv == null) return -1;
      if (av < bv) return sort.dir === 'asc' ? -1 : 1;
      if (av > bv) return sort.dir === 'asc' ? 1 : -1;
      return 0;
    });
    return sorted;
  }, [data, sort, columns]);

  const { range, loadedCount, sentinelRef } = useLazyScroll(
    lazy,
    scrollRef,
    lazy ? sortedData : EMPTY_ARRAY,
    rowHeightPx,
    chunkSize,
    windowSize,
  );

  // Self-correct the row-height estimate from the first actually-rendered row
  // (converges after one measurement; the epsilon check stops it from
  // looping once accurate).
  React.useEffect(() => {
    if (!lazy || rowHeightProp != null) return;
    const h = firstRowRef.current?.getBoundingClientRect().height;
    if (h && Math.abs(h - rowHeightPx) > 1) setMeasuredRowHeight(h);
  });

  React.useEffect(() => {
    if (lazy) onLazyProgress?.({ loadedCount, total: sortedData.length });
  }, [lazy, loadedCount, sortedData.length, onLazyProgress]);

  const allSelected = data.length > 0 && selectedIds.length === data.length;
  const someSelected = selectedIds.length > 0 && !allSelected;
  const colCount = visibleColumns.length + (selectable ? 1 : 0) + (manageColumns ? 1 : 0);

  const renderRow = (row: T, i: number, measureRef?: React.Ref<HTMLTableRowElement>) => {
    const id = getRowId ? getRowId(row, i) : String(i);
    const isSelected = selectedIds.includes(id);
    return (
      <tr
        key={id}
        ref={measureRef}
        className={cn(
          'border-b border-border last:border-0 transition-colors',
          onRowClick ? 'cursor-pointer hover:bg-muted/40' : '',
          rowClassName?.(row),
          isSelected && 'bg-[color:var(--secondary)]/40'
        )}
        onClick={onRowClick ? () => onRowClick(row) : undefined}
        data-row-id={id}
      >
        {selectable ? (
          <td className="w-10 px-3 py-2" onClick={(e) => e.stopPropagation()}>
            <Checkbox
              checked={isSelected}
              onCheckedChange={(c) => {
                if (!onSelectionChange) return;
                onSelectionChange(c ? [...selectedIds, id] : selectedIds.filter((s) => s !== id));
              }}
              aria-label="Select row"
            />
          </td>
        ) : null}
        {visibleColumns.map((col) => {
          if (col.cell) {
            return (
              <td key={col.id} className={cn(
                'px-3 py-2',
                col.align === 'center' && 'text-center',
                col.align === 'right' && 'text-right'
              )}>
                {col.cell(row)}
              </td>
            );
          }
          const value = col.accessor ? col.accessor(row) : undefined;
          return (
            <TableCell key={col.id} kind={col.kind ?? 'default'} value={value} align={col.align} />
          );
        })}
        {manageColumns ? <td className="w-10" /> : null}
      </tr>
    );
  };

  // Partition into groups (preserving first-seen order) when groupBy is set.
  const groups = React.useMemo(() => {
    if (!groupBy) return null;
    const out: { key: string; rows: { row: T; i: number }[] }[] = [];
    const idx: Record<string, number> = {};
    sortedData.forEach((row, i) => {
      const k = groupBy.get(row) || '—';
      if (idx[k] == null) { idx[k] = out.length; out.push({ key: k, rows: [] }); }
      out[idx[k]].rows.push({ row, i });
    });
    return out;
  }, [groupBy, sortedData]);

  return (
    <div className={cn('flex w-full flex-col rounded-lg border border-border bg-card', className)} {...rest}>
      <div ref={scrollRef} className={cn('w-full overflow-auto', lazy && 'min-h-0 flex-1')}>
      <table className="w-full caption-bottom text-body-sm">
        {/* Opaque header bg (T-087 client fix) — `bg-muted/40` (40% alpha) let
            scrolled rows bleed through a sticky header; `bg-muted` (no alpha
            modifier, `--muted` is a solid token) fully occludes them while
            keeping the same muted-band look. Matters even more once every
            table is its own scroll region (`scrollMode="lazy"`). */}
        <thead className={cn('border-b border-border bg-muted', stickyHeader && 'sticky top-0 z-10')}>
          <tr className="text-left">
            {selectable ? (
              <th className="w-10 px-3 py-2.5">
                <Checkbox
                  checked={allSelected ? true : someSelected ? 'indeterminate' : false}
                  onCheckedChange={(c) => {
                    if (!onSelectionChange) return;
                    if (c) onSelectionChange(data.map((row, i) => (getRowId ? getRowId(row, i) : String(i))));
                    else onSelectionChange([]);
                  }}
                  aria-label="Select all"
                />
              </th>
            ) : null}
            {visibleColumns.map((col) => {
              const isSorted = sort?.id === col.id;
              return (
                <th
                  key={col.id}
                  scope="col"
                  style={col.width ? { width: col.width } : undefined}
                  className={cn(
                    'px-3 py-2.5 text-caption font-semibold uppercase tracking-wide text-muted-foreground',
                    col.align === 'center' && 'text-center',
                    col.align === 'right' && 'text-right'
                  )}
                >
                  {col.sortable ? (
                    <button
                      type="button"
                      onClick={() =>
                        setSort((s) =>
                          s?.id === col.id
                            ? s.dir === 'asc'
                              ? { id: col.id, dir: 'desc' }
                              : null
                            : { id: col.id, dir: 'asc' }
                        )
                      }
                      className="inline-flex items-center gap-1 hover:text-foreground"
                    >
                      {col.header}
                      {isSorted ? (
                        sort.dir === 'asc' ? <ArrowUp className="size-3" /> : <ArrowDown className="size-3" />
                      ) : (
                        <ArrowUpDown className="size-3 opacity-50" />
                      )}
                    </button>
                  ) : (
                    col.header
                  )}
                </th>
              );
            })}
            {manageColumns ? (
              <th scope="col" className="w-10 px-2 py-2.5 text-right">
                <ColumnConfig
                  columns={columns.map((c) => ({ id: c.id, label: typeof c.header === 'string' ? c.header : c.id }))}
                  hidden={[...hiddenCols]}
                  onChange={(h) => setHiddenCols(new Set(h))}
                  triggerClassName="ml-auto"
                />
              </th>
            ) : null}
          </tr>
        </thead>
        <tbody>
          {loading ? (
            <tr>
              <td colSpan={colCount} className="py-8 text-center text-muted-foreground">
                Loading…
              </td>
            </tr>
          ) : sortedData.length === 0 ? (
            <tr>
              <td colSpan={colCount} className="py-8 text-center text-muted-foreground">
                {emptyState ?? 'No rows'}
              </td>
            </tr>
          ) : groups ? (
            groups.map((g) => {
              const isCollapsed = !!collapsedGroups[g.key];
              return (
                <React.Fragment key={`grp-${g.key}`}>
                  <tr className="border-b border-border bg-muted/30">
                    <td colSpan={colCount} className="px-3 py-2">
                      <button
                        type="button"
                        onClick={() => setCollapsedGroups((s) => ({ ...s, [g.key]: !s[g.key] }))}
                        className="inline-flex items-center gap-2 text-body-sm font-semibold text-foreground"
                      >
                        {isCollapsed ? <ChevronRight className="size-4 text-muted-foreground" /> : <ChevronDown className="size-4 text-muted-foreground" />}
                        <span>{groupBy?.label ? groupBy.label(g.key) : g.key}</span>
                        <span className="inline-flex min-w-[20px] items-center justify-center rounded-full bg-muted px-1.5 py-0.5 text-caption font-semibold text-muted-foreground">
                          {g.rows.length}
                        </span>
                      </button>
                    </td>
                  </tr>
                  {!isCollapsed && g.rows.map(({ row, i }) => renderRow(row, i))}
                </React.Fragment>
              );
            })
          ) : lazy ? (() => {
            const showSentinel = range.end >= loadedCount && loadedCount < sortedData.length;
            const bottomSpacerRows = Math.max(0, sortedData.length - range.end - (showSentinel ? 1 : 0));
            return (
              <>
                {range.start > 0 ? (
                  <tr aria-hidden style={{ height: range.start * rowHeightPx }}>
                    <td colSpan={colCount} className="p-0" />
                  </tr>
                ) : null}
                {sortedData.slice(range.start, range.end).map((row, localIdx) => {
                  const i = range.start + localIdx;
                  return renderRow(row, i, i === 0 ? firstRowRef : undefined);
                })}
                {showSentinel ? (
                  <tr ref={sentinelRef}>
                    <td colSpan={colCount} className="py-3 text-center text-caption text-muted-foreground">
                      Loading more…
                    </td>
                  </tr>
                ) : null}
                {bottomSpacerRows > 0 ? (
                  <tr aria-hidden style={{ height: bottomSpacerRows * rowHeightPx }}>
                    <td colSpan={colCount} className="p-0" />
                  </tr>
                ) : null}
              </>
            );
          })() : (
            sortedData.map((row, i) => renderRow(row, i))
          )}
        </tbody>
      </table>
      </div>
    </div>
  );
}
