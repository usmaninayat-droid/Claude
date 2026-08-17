import * as React from 'react';
import { Pencil, Search } from 'lucide-react';
import { cn } from '../utils/cn';
import { Popover, PopoverTrigger, PopoverContent, Switch } from '../primitives';

/**
 * ColumnConfig — the DS-standard "configure columns" control for every list /
 * table view: the small pencil at the far-right of the header row. Opens a
 * popover to search + show/hide columns (keeping at least `minVisible` on).
 *
 * Controlled + engine-agnostic, so it works for the DS `DataTable` AND any
 * bespoke `<table>` (Plan Monitoring, Interactive Planning, …). This is the one
 * standard column-config affordance across the design system — never hand-roll a
 * per-view pencil again.
 */

export interface ColumnConfigItem {
  id: string;
  label: string;
  /** columns that must always stay visible (no toggle). */
  locked?: boolean;
}

export interface ColumnConfigProps {
  columns: ColumnConfigItem[];
  /** ids of currently-hidden columns. */
  hidden: string[];
  onChange: (hidden: string[]) => void;
  /** keep at least this many columns visible. Default 1. */
  minVisible?: number;
  /** trigger size in px (default 28). */
  size?: number;
  className?: string;
  triggerClassName?: string;
}

export function ColumnConfig({
  columns, hidden, onChange, minVisible = 1, size = 28, className, triggerClassName,
}: ColumnConfigProps) {
  const [query, setQuery] = React.useState('');
  const hiddenSet = React.useMemo(() => new Set(hidden), [hidden]);
  const visibleCount = columns.length - hidden.length;
  const q = query.trim().toLowerCase();
  const matches = columns.filter((c) => !q || c.label.toLowerCase().includes(q));

  const toggle = (id: string, on: boolean) => {
    if (!on && visibleCount <= minVisible) return; // keep minimum visible
    const next = new Set(hiddenSet);
    if (on) next.delete(id); else next.add(id);
    onChange([...next]);
  };

  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          type="button"
          aria-label="Configure columns"
          title="Configure columns"
          className={cn('grid shrink-0 place-items-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground', triggerClassName)}
          style={{ width: size, height: size }}
        >
          <Pencil className="size-3.5" />
        </button>
      </PopoverTrigger>
      <PopoverContent align="end" className={cn('w-72 p-0', className)}>
        <div className="border-b border-border px-3 py-2 text-body-sm font-semibold text-foreground">Columns</div>
        <div className="p-2">
          <div className="relative mb-1">
            <Search size={13} className="pointer-events-none absolute left-2 top-1/2 z-10 -translate-y-1/2 text-muted-foreground" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search columns…"
              className="h-8 w-full rounded-md border border-border bg-card pl-6 pr-2 text-caption outline-none placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:ring-ring"
            />
          </div>
          <div className="flex max-h-64 flex-col overflow-auto">
            {matches.map((c) => {
              const visible = !hiddenSet.has(c.id);
              return (
                <label key={c.id} className={cn('flex items-center justify-between gap-3 rounded-md px-2 py-1.5', c.locked ? 'opacity-60' : 'cursor-pointer hover:bg-muted')}>
                  <span className="truncate text-body-sm text-foreground">{c.label}</span>
                  <Switch checked={visible} disabled={c.locked} onCheckedChange={(on) => toggle(c.id, on)} aria-label={`Toggle ${c.label}`} />
                </label>
              );
            })}
            {!matches.length ? <div className="px-2 py-3 text-center text-caption text-muted-foreground">No columns</div> : null}
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}
