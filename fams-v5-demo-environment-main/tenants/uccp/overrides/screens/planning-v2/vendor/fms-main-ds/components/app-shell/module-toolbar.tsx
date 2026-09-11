import * as React from 'react';
// Shell chrome uses the REAL V5 icon set (src/icons/v5).
import {
  SearchMd as Search,
  Plus,
  FilterFunnel02 as ListFilter,
  XClose as X,
  LayersThree01 as LayersThree,
} from '../../icons';
import { ArrowDownUp, ChevronDown, Download, Folder, User, Flag, Tag, Check } from 'lucide-react';
import { cn } from '../utils/cn';
import { Popover, PopoverTrigger, PopoverContent } from '../primitives';
import { DateRangePicker } from '../basics';
import type { Facet, SortField, ViewSort } from './types';

/* Toolbar band — search + filter popover + Create New + active filter tags.
 * Extracted verbatim from AppShell.tsx (C1 List Toolbar contract, Stage 1 —
 * behavior-preserving extraction only). See docs/contracts/list-toolbar.contract.md. */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const FACET_ICONS: Record<string, React.ComponentType<any>> = {
  Folder,
  User,
  Flag,
  Tag,
};

const ICON_BTN =
  'relative flex size-10 shrink-0 items-center justify-center rounded-lg border outline-none transition-colors focus-visible:ring-2 focus-visible:ring-ring';
const ICON_BTN_IDLE = 'border-border bg-card text-foreground hover:bg-muted';
const ICON_BTN_ON = 'border-primary bg-secondary text-secondary-foreground';
const OPT_ROW =
  'flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-body-sm outline-none transition-colors hover:bg-muted';
const checkBox = (on: boolean) =>
  cn('flex size-4 shrink-0 items-center justify-center rounded border', on ? 'border-primary bg-primary text-primary-foreground' : 'border-border');

/** One named facet dropdown (icon + label + count + chevron → checkbox list). */
function FacetDropdown({
  facet,
  selected,
  onToggle,
}: {
  facet: Facet;
  selected: string[];
  onToggle: (value: string) => void;
}) {
  const Icon = FACET_ICONS[facet.icon ?? 'Tag'] ?? Tag;
  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          type="button"
          className={cn(
            'flex h-10 shrink-0 items-center gap-2 rounded-lg border px-3 text-body-sm font-medium outline-none transition-colors focus-visible:ring-2 focus-visible:ring-ring',
            selected.length ? ICON_BTN_ON : ICON_BTN_IDLE,
          )}
        >
          <Icon size={16} className="text-muted-foreground" />
          {facet.label}
          {selected.length ? (
            <span className="inline-flex size-4 items-center justify-center rounded-full bg-primary text-caption font-bold text-primary-foreground">
              {selected.length}
            </span>
          ) : null}
          <ChevronDown size={14} className="text-muted-foreground" />
        </button>
      </PopoverTrigger>
      <PopoverContent align="start" className="max-h-72 w-56 overflow-auto p-1">
        {facet.options.length ? (
          facet.options.map((o) => {
            const on = selected.includes(o.value);
            return (
              <button key={o.value} type="button" onClick={() => onToggle(o.value)} className={OPT_ROW}>
                <span className={checkBox(on)}>{on ? <Check size={10} /> : null}</span>
                <span className="truncate">{o.label}</span>
              </button>
            );
          })
        ) : (
          <div className="px-2 py-1.5 text-body-sm text-muted-foreground">No options</div>
        )}
      </PopoverContent>
    </Popover>
  );
}

/** Built-in "Group by" control for the pipeline List view (T-094 F2) — every
 *  pipeline module inherits this for free (columns come off the pipeline's
 *  own list columns), so no product config is needed. Same box anatomy as
 *  `FacetDropdown` (h-10 rounded-lg border px-3 text-body-sm font-medium +
 *  muted leading icon + trailing ChevronDown, tinted once non-default) —
 *  the previous per-view native `<select>` in its own row is now deleted;
 *  this is the ONE toolbar row. Single-select (radio), not a checkbox facet —
 *  "None" clears grouping. */
function GroupByFacetField({
  columns,
  value,
  onChange,
}: {
  columns: { id: string; header: React.ReactNode }[];
  value: string;
  onChange: (col: string) => void;
}) {
  const [open, setOpen] = React.useState(false);
  const current = columns.find((c) => c.id === value)?.header;
  const active = value !== '';
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          aria-label="Group by"
          className={cn(
            'flex h-10 shrink-0 items-center gap-2 rounded-lg border px-3 text-body-sm font-medium outline-none transition-colors focus-visible:ring-2 focus-visible:ring-ring',
            active ? ICON_BTN_ON : ICON_BTN_IDLE,
          )}
        >
          <LayersThree size={16} className="text-muted-foreground" />
          <span className="text-muted-foreground">Group by:</span>
          <span className="truncate">{current ?? 'None'}</span>
          <ChevronDown size={14} className="shrink-0 text-muted-foreground" />
        </button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-56 p-1">
        <button
          type="button"
          onClick={() => { onChange(''); setOpen(false); }}
          className={cn(OPT_ROW, 'justify-between', !active && 'font-semibold text-primary')}
        >
          <span className="truncate">None</span>
          {!active ? <Check size={14} className="text-primary" /> : null}
        </button>
        {columns.map((c) => (
          <button
            key={c.id}
            type="button"
            onClick={() => { onChange(c.id); setOpen(false); }}
            className={cn(OPT_ROW, 'justify-between', value === c.id && 'font-semibold text-primary')}
          >
            <span className="truncate">{c.header}</span>
            {value === c.id ? <Check size={14} className="text-primary" /> : null}
          </button>
        ))}
      </PopoverContent>
    </Popover>
  );
}

/**
 * Props for `ModuleToolbar` — mirrors exactly what `AppShell.tsx` passed to
 * the previously-private inline component (Stage 1 extraction, zero behavior
 * change). NOTE: `facet` / `filters` / `onToggleFilter` / `onClearFilters`
 * are accepted but currently UNUSED inside the component body — they were
 * already dead pass-through in the inline version (superseded by the
 * multi-facet `facets`/`facetFilters` system) and are kept here verbatim to
 * avoid any behavior change; see the extraction report for detail.
 */
export interface ModuleToolbarProps {
  query: string;
  onQuery: (v: string) => void;
  /** @deprecated unused — superseded by `facets`/`facetFilters`; kept for byte-identical pass-through. */
  facet: { label: string; values: string[] } | null;
  /** @deprecated unused — superseded by `facets`/`facetFilters`; kept for byte-identical pass-through. */
  filters: string[];
  /** @deprecated unused — superseded by `onToggleFacet`; kept for byte-identical pass-through. */
  onToggleFilter: (v: string) => void;
  /** @deprecated unused — superseded by `onClearAllFacets`; kept for byte-identical pass-through. */
  onClearFilters: () => void;
  facets: Facet[];
  facetFilters: Record<string, string[]>;
  onToggleFacet: (col: string, value: string) => void;
  onClearAllFacets: () => void;
  sortFields: SortField[];
  sort: ViewSort | null;
  onCycleSort: (key: string) => void;
  onExport?: () => void;
  onCreate?: () => void;
  /** Built-in Group-by control for the pipeline List view (T-094 F2) — columns
   *  come straight off the pipeline's own list columns; undefined/empty hides
   *  the control entirely (kanban/calendar tabs, non-pipeline modules). */
  groupByColumns?: { id: string; header: React.ReactNode }[];
  groupByCol?: string;
  onGroupByChange?: (col: string) => void;
  /** Product-supplied field(s) rendered in the toolbar row after the facet
   *  dropdowns (T-063) — e.g. a Group-by select, styled like the other fields. */
  slot?: React.ReactNode;
}

/** Toolbar band — search + filter/sort + facet dropdowns + export + Create New.
 *  Extracted from `AppShell.tsx` (C1 List Toolbar contract, Stage 1). Currently
 *  rendered only for `entity`/`pipeline` modules (gated in `AppShell.tsx` via
 *  `TOOLBAR_TYPES`) but exported here so later stages can adopt it elsewhere. */
export function ModuleToolbar({
  query,
  onQuery,
  facets,
  facetFilters,
  onToggleFacet,
  onClearAllFacets,
  sortFields,
  sort,
  onCycleSort,
  onExport,
  onCreate,
  groupByColumns,
  groupByCol,
  onGroupByChange,
  slot,
}: ModuleToolbarProps) {
  const totalSelected = Object.values(facetFilters).reduce((n, vs) => n + vs.length, 0);
  const chips: { col: string; value: string; label: string; facetLabel: string }[] = [];
  for (const f of facets) {
    for (const v of facetFilters[f.col] ?? []) {
      chips.push({ col: f.col, value: v, label: f.options.find((o) => o.value === v)?.label ?? v, facetLabel: f.label });
    }
  }
  return (
    <div className="flex w-full flex-col gap-3 border-b border-border bg-background px-7 py-4">
      <div className="flex w-full items-center justify-between gap-3">
        <div className="flex flex-1 flex-wrap items-center gap-2">
          <div className="relative min-w-[200px] max-w-[367px] flex-1">
            <Search size={16} className="pointer-events-none absolute left-3 top-1/2 z-10 -translate-y-1/2 text-foreground" />
            <input
              type="text"
              value={query}
              onChange={(e) => onQuery(e.target.value)}
              placeholder="Search anything here"
              className="h-10 w-full rounded-lg border border-border bg-card pl-9 pr-3 text-body-sm text-foreground outline-none placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:ring-ring"
            />
          </div>

          {/* Filter icon — popover with every facet grouped */}
          {facets.length ? (
            <Popover>
              <PopoverTrigger asChild>
                <button type="button" title="Filter" className={cn(ICON_BTN, totalSelected ? ICON_BTN_ON : ICON_BTN_IDLE)}>
                  <ListFilter size={16} />
                  {totalSelected ? (
                    <span className="absolute -right-1.5 -top-1.5 inline-flex size-4 items-center justify-center rounded-full bg-primary text-caption font-bold text-primary-foreground">
                      {totalSelected}
                    </span>
                  ) : null}
                </button>
              </PopoverTrigger>
              <PopoverContent align="start" className="max-h-[80vh] w-[420px] overflow-auto p-4">
                {/* "All Filters" panel — header · Select Date · grouped facet checkboxes */}
                <div className="mb-3 flex items-center justify-between">
                  <span className="text-body font-semibold text-foreground">All Filters</span>
                  {totalSelected ? (
                    <button type="button" onClick={onClearAllFacets} className="text-caption font-semibold text-[var(--status-error)] hover:underline">
                      Clear all filters
                    </button>
                  ) : null}
                </div>
                <div className="mb-4">
                  <DateRangePicker mode="single" field={{ label: 'Select Date' }} />
                </div>
                <div className="flex flex-col gap-4">
                  {facets.map((f) => (
                    <div key={f.col}>
                      <div className="mb-1.5 text-caption font-semibold uppercase tracking-wide text-muted-foreground">{f.label}</div>
                      <div className="grid grid-cols-2 gap-x-4 gap-y-1">
                        {f.options.map((o) => {
                          const on = (facetFilters[f.col] ?? []).includes(o.value);
                          return (
                            <button key={o.value} type="button" onClick={() => onToggleFacet(f.col, o.value)} className={OPT_ROW}>
                              <span className={checkBox(on)}>{on ? <Check size={10} /> : null}</span>
                              <span className="truncate">{o.label}</span>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              </PopoverContent>
            </Popover>
          ) : null}

          {/* Sort icon — popover listing sortable columns */}
          {sortFields.length ? (
            <Popover>
              <PopoverTrigger asChild>
                <button type="button" title="Sort" className={cn(ICON_BTN, sort ? ICON_BTN_ON : ICON_BTN_IDLE)}>
                  <ArrowDownUp size={16} />
                </button>
              </PopoverTrigger>
              <PopoverContent align="start" className="max-h-72 w-56 overflow-auto p-1">
                <div className="px-2 pb-1 text-caption font-semibold uppercase tracking-wide text-muted-foreground">Sort by</div>
                {sortFields.map((s) => {
                  const active = sort?.key === s.key;
                  return (
                    <button key={s.key} type="button" onClick={() => onCycleSort(s.key)} className={cn(OPT_ROW, 'justify-between')}>
                      <span className="truncate">{s.label}</span>
                      {active ? (
                        <span className="shrink-0 text-caption font-semibold text-primary">{sort!.dir === 'asc' ? 'A–Z ↑' : 'Z–A ↓'}</span>
                      ) : null}
                    </button>
                  );
                })}
              </PopoverContent>
            </Popover>
          ) : null}

          {/* Named facet dropdowns (Status, Assignee…) */}
          {facets.map((f) => (
            <FacetDropdown key={f.col} facet={f} selected={facetFilters[f.col] ?? []} onToggle={(v) => onToggleFacet(f.col, v)} />
          ))}
          {groupByColumns?.length && onGroupByChange ? (
            <GroupByFacetField columns={groupByColumns} value={groupByCol ?? ''} onChange={onGroupByChange} />
          ) : null}
          {slot}
        </div>

        <div className="flex shrink-0 items-center gap-2">
          {onExport ? (
            <button type="button" onClick={onExport} title="Export CSV" className={cn(ICON_BTN, ICON_BTN_IDLE)}>
              <Download size={16} />
            </button>
          ) : null}
          {onCreate ? (
            <button
              type="button"
              onClick={onCreate}
              className="flex h-10 items-center gap-1.5 rounded-[4px] bg-primary px-3.5 text-body-sm font-semibold text-primary-foreground outline-none transition-colors hover:opacity-90 focus-visible:ring-2 focus-visible:ring-ring"
            >
              <Plus size={14} />
              Create New
            </button>
          ) : null}
        </div>
      </div>

      {chips.length ? (
        <div className="flex flex-wrap items-center gap-2">
          {chips.map((c) => (
            <span
              key={`${c.col}:${c.value}`}
              className="inline-flex items-center gap-1 rounded-full bg-secondary px-2.5 py-1 text-caption font-medium text-secondary-foreground"
            >
              <span className="text-muted-foreground">{c.facetLabel}:</span>
              {c.label}
              <button type="button" aria-label={`Remove ${c.label}`} onClick={() => onToggleFacet(c.col, c.value)}>
                <X size={11} />
              </button>
            </span>
          ))}
          <button
            type="button"
            onClick={onClearAllFacets}
            className="text-caption font-medium text-muted-foreground underline-offset-2 hover:underline"
          >
            Clear all
          </button>
        </div>
      ) : null}
    </div>
  );
}
