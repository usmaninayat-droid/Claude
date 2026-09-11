import * as React from 'react';
import { ArrowUpDown, ArrowUp, ArrowDown, ChevronRight, ChevronDown, SlidersHorizontal } from 'lucide-react';
import { cn } from '../utils/cn';
import { Checkbox } from '../primitives/checkbox';
import { Popover, PopoverTrigger, PopoverContent, Switch } from '../primitives';
import { TableCell, type TableCellKind } from './table-cell';

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
  emptyState,
  loading,
  stickyHeader = true,
  manageColumns,
  groupBy,
  className,
  ...rest
}: DataTableProps<T>) {
  const [sort, setSort] = React.useState<{ id: string; dir: 'asc' | 'desc' } | null>(null);
  const [collapsedGroups, setCollapsedGroups] = React.useState<Record<string, boolean>>({});
  const [hiddenCols, setHiddenCols] = React.useState<Set<string>>(new Set());
  const [colQuery, setColQuery] = React.useState('');
  // Columns actually rendered — all of them unless `manageColumns` is hiding some.
  const visibleColumns = manageColumns ? columns.filter((c) => !hiddenCols.has(c.id)) : columns;

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

  const allSelected = data.length > 0 && selectedIds.length === data.length;
  const someSelected = selectedIds.length > 0 && !allSelected;
  const colCount = visibleColumns.length + (selectable ? 1 : 0);

  const renderRow = (row: T, i: number) => {
    const id = getRowId ? getRowId(row, i) : String(i);
    const isSelected = selectedIds.includes(id);
    return (
      <tr
        key={id}
        className={cn(
          'border-b border-border last:border-0 transition-colors',
          onRowClick ? 'cursor-pointer hover:bg-muted/40' : '',
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
      {manageColumns ? (
        <div className="flex shrink-0 items-center justify-end border-b border-border px-2 py-1.5">
          <ColumnsControl columns={columns} hidden={hiddenCols} setHidden={setHiddenCols} query={colQuery} setQuery={setColQuery} />
        </div>
      ) : null}
      <div className="w-full overflow-auto">
      <table className="w-full caption-bottom text-sm">
        <thead className={cn('border-b border-border bg-muted/40', stickyHeader && 'sticky top-0 z-10')}>
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
                    'px-3 py-2.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground',
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
                        className="inline-flex items-center gap-2 text-sm font-semibold text-foreground"
                      >
                        {isCollapsed ? <ChevronRight className="size-4 text-muted-foreground" /> : <ChevronDown className="size-4 text-muted-foreground" />}
                        <span>{groupBy?.label ? groupBy.label(g.key) : g.key}</span>
                        <span className="inline-flex min-w-[20px] items-center justify-center rounded-full bg-muted px-1.5 py-0.5 text-[11px] font-semibold text-muted-foreground">
                          {g.rows.length}
                        </span>
                      </button>
                    </td>
                  </tr>
                  {!isCollapsed && g.rows.map(({ row, i }) => renderRow(row, i))}
                </React.Fragment>
              );
            })
          ) : (
            sortedData.map((row, i) => renderRow(row, i))
          )}
        </tbody>
      </table>
      </div>
    </div>
  );
}

/* ── Columns config — search + a show/hide toggle per column ─────────────── */
function ColumnsControl({
  columns,
  hidden,
  setHidden,
  query,
  setQuery,
}: {
  columns: DataTableColumn[];
  hidden: Set<string>;
  setHidden: React.Dispatch<React.SetStateAction<Set<string>>>;
  query: string;
  setQuery: (v: string) => void;
}) {
  const label = (c: DataTableColumn) => (typeof c.header === 'string' ? c.header : c.id);
  const matches = columns.filter((c) => !query || label(c).toLowerCase().includes(query.toLowerCase()));
  const toggle = (id: string, on: boolean) =>
    setHidden((prev) => {
      // Keep at least one column visible.
      if (!on && columns.length - prev.size <= 1) return prev;
      const next = new Set(prev);
      if (on) next.delete(id); else next.add(id);
      return next;
    });
  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          type="button"
          aria-label="Configure columns"
          className="inline-flex items-center gap-1.5 rounded-md border border-border bg-card px-2 py-1 text-xs font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
        >
          <SlidersHorizontal className="size-3.5" /> Columns
        </button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-72 p-0">
        <div className="border-b border-border px-3 py-2 text-sm font-semibold text-foreground">Columns</div>
        <div className="p-2">
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search columns…"
            className="mb-1 h-8 w-full rounded-md border border-border bg-card px-2 text-xs outline-none placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:ring-ring"
          />
          <div className="flex max-h-64 flex-col overflow-auto">
            {matches.map((c) => {
              const visible = !hidden.has(c.id);
              return (
                <label
                  key={c.id}
                  className="flex cursor-pointer items-center justify-between gap-3 rounded-md px-2 py-1.5 hover:bg-muted"
                >
                  <span className="truncate text-sm text-foreground">{label(c)}</span>
                  <Switch checked={visible} onCheckedChange={(on) => toggle(c.id, on)} aria-label={`Toggle ${label(c)}`} />
                </label>
              );
            })}
            {!matches.length ? (
              <div className="px-2 py-3 text-center text-xs text-muted-foreground">No columns</div>
            ) : null}
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}
