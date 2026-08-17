import * as React from 'react';
import { CheckCircle, Inbox01, Bell01, Activity, Clock, SearchMd, FilterLines, Flag06, LayersThree01, BarChartSquare02, AlertTriangle } from '../../icons';
import { Hash, Check, ArrowRight, Home, FileText, X, Plus, Bookmark, MoreHorizontal, Trash2, ChevronLeft, ChevronRight, ChevronDown, Eye, EyeOff, MapPin, Shapes } from 'lucide-react';
import { cn } from '../utils/cn';
import {
  Button, Switch, Avatar, Dialog, DialogContent, DialogHeader, DialogFooter, DialogTitle, DialogDescription,
  Popover, PopoverTrigger, PopoverContent,
  AlertDialog, AlertDialogContent, AlertDialogHeader, AlertDialogFooter, AlertDialogTitle, AlertDialogDescription, AlertDialogAction, AlertDialogCancel,
} from '../primitives';
import { DataTable, KanbanBoard, KanbanColumn, KanbanCard, ListRow } from '../data-display';
import { NotificationCard } from '../widgets';
import { MapWidget, LeafletMap } from '../map';
import { CalendarCell } from '../basics';
import { SchemaForm } from './side-sheet';
import type {
  EntityModuleData,
  PipelineModuleData,
  PipelineCardModel,
  InboxModuleData,
  InboxNotification,
  ModuleTab,
  IconType,
  MonitoringModuleData,
  CalendarModuleData,
  SettingsModuleData,
  SettingsItem,
  FormsModuleData,
  ShellActions,
  DetailDescriptor,
  Facet,
  SortField,
  ViewSort,
} from './types';

/**
 * Built-in View renderers, keyed by ViewKind. Each is a thin adapter over an
 * existing design-system component, driven by a module-type data contract.
 * A ModuleConfig uses these by default, or overrides via `render`.
 */

/** Shared filtering inputs threaded from the toolbar. */
export interface ViewFilterProps {
  query?: string;
  filters?: string[];
  /** Per-facet selected values (facet col → values). */
  facetFilters?: Record<string, string[]>;
  /** Active sort. */
  sort?: ViewSort | null;
}

const includesQuery = (text: string, q?: string) =>
  !q || text.toLowerCase().includes(q.toLowerCase());

/** Keep only rows whose value is in the selected set for every active facet (AND). */
function applyFacets<T>(
  rows: T[],
  facets?: Facet<T>[],
  facetFilters?: Record<string, string[]>,
): T[] {
  if (!facets || !facetFilters) return rows;
  let out = rows;
  for (const f of facets) {
    const sel = facetFilters[f.col];
    if (sel && sel.length) {
      out = out.filter((r) => {
        const v = f.get(r);
        const vals = Array.isArray(v) ? v : [v];
        return vals.some((x) => sel.includes(x));
      });
    }
  }
  return out;
}

/** Order rows by the active sort field (numbers numerically, else by label). */
function applySort<T>(rows: T[], sortFields?: SortField<T>[], sort?: ViewSort | null): T[] {
  if (!sort || !sortFields) return rows;
  const sf = sortFields.find((s) => s.key === sort.key);
  if (!sf) return rows;
  const dir = sort.dir === 'desc' ? -1 : 1;
  return [...rows].sort((a, b) => {
    const av = sf.get(a);
    const bv = sf.get(b);
    if (typeof av === 'number' && typeof bv === 'number') return (av - bv) * dir;
    return String(av).localeCompare(String(bv)) * dir;
  });
}

/** Color at the given alpha: hex (#rrggbb) → rgba fast-path; any other color
 *  (var(--token), named, oklch…) → color-mix, so token stage colors get the
 *  same faint wash instead of passing through fully saturated (T-015). */
function rgba(color: string | undefined, alpha: number): string | undefined {
  if (!color) return undefined;
  const m = /^#?([0-9a-f]{6})$/i.exec(color.trim());
  if (!m) return `color-mix(in srgb, ${color} ${alpha * 100}%, transparent)`;
  const n = parseInt(m[1], 16);
  return `rgba(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}, ${alpha})`;
}

function filterEntityRows(
  data: EntityModuleData,
  query?: string,
  filters?: string[],
  facetFilters?: Record<string, string[]>,
  sort?: ViewSort | null,
): any[] {
  let rows = data.rows;
  if (query) {
    rows = rows.filter((r) =>
      includesQuery(
        data.searchText ? data.searchText(r) : data.columns.map((c) => String(c.accessor?.(r) ?? '')).join(' '),
        query
      )
    );
  }
  if (filters && filters.length && data.filterField) {
    rows = rows.filter((r) => filters.includes(data.filterField!.get(r)));
  }
  rows = applyFacets(rows, data.facets, facetFilters);
  rows = applySort(rows, data.sortFields, sort);
  return rows;
}

function pipelineSearchText(card: PipelineCardModel): string {
  const meta = (card.metadataFields ?? []).map((f) => String(f.value)).join(' ');
  return `${card.title ?? ''} ${card.ticketId ?? ''} ${card.type ?? ''} ${meta}`;
}

/** Shared empty state for filtered-to-nothing views. */
function EmptyState({ query }: { query?: string }) {
  return (
    <div className="flex flex-col items-center justify-center gap-1 py-16 text-center">
      <div className="text-body-md font-semibold text-foreground">No matching records</div>
      <div className="max-w-sm text-body-sm text-muted-foreground">
        {query ? <>Nothing matches “{query}”. Try a different search or clear filters.</> : 'Try adjusting your filters.'}
      </div>
    </div>
  );
}

function filterPipelineCards(
  data: PipelineModuleData,
  query?: string,
  filters?: string[],
  facetFilters?: Record<string, string[]>,
  sort?: ViewSort | null,
): PipelineCardModel[] {
  let cards = data.cards;
  if (query) {
    cards = cards.filter((c) => includesQuery(data.searchText ? data.searchText(c) : pipelineSearchText(c), query));
  }
  if (filters && filters.length) {
    const get = data.filterField?.get ?? ((c: PipelineCardModel) => String(c.priority ?? ''));
    cards = cards.filter((c) => filters.includes(get(c)));
  }
  cards = applyFacets(cards, data.facets, facetFilters);
  cards = applySort(cards, data.sortFields, sort);
  return cards;
}

/* ── list (entity table) ─────────────────────────────────────────────── */
export function ListView({
  data,
  onOpenDetail,
  query,
  filters,
  facetFilters,
  sort,
}: {
  data: EntityModuleData;
  onOpenDetail?: (d: DetailDescriptor) => void;
} & ViewFilterProps) {
  const rows = filterEntityRows(data, query, filters, facetFilters, sort);
  const lazy = data.listScrollMode === 'lazy';
  return (
    <div className={cn('p-4', lazy && 'flex h-full min-h-0 flex-col')}>
      <DataTable
        className={lazy ? 'h-full' : undefined}
        columns={data.columns}
        data={rows}
        getRowId={data.getRowId}
        stickyHeader
        manageColumns
        scrollMode={data.listScrollMode}
        emptyState={<EmptyState query={query} />}
        onRowClick={
          data.toDetail && onOpenDetail
            ? (row) => onOpenDetail(data.toDetail!(row))
            : undefined
        }
      />
    </div>
  );
}

/* ── grouped-list (ListRow stack) ────────────────────────────────────── */
export function GroupedListView({
  data,
  onOpenDetail,
  query,
  filters,
  facetFilters,
  sort,
}: {
  data: EntityModuleData;
  onOpenDetail?: (d: DetailDescriptor) => void;
} & ViewFilterProps) {
  const rows = filterEntityRows(data, query, filters, facetFilters, sort);
  const items = data.toListItem
    ? rows.map((r) => data.toListItem!(r))
    : [];
  if (!items.length) return <EmptyState query={query} />;
  return (
    <div className="flex flex-col gap-2 p-4">
      {items.map((it, i) => {
        const { id, ...rowProps } = it;
        const row = rows[i];
        return (
          <ListRow
            key={id}
            {...rowProps}
            onClick={
              data.toDetail && onOpenDetail
                ? () => onOpenDetail(data.toDetail!(row))
                : undefined
            }
            className={data.toDetail ? 'cursor-pointer' : undefined}
          />
        );
      })}
    </div>
  );
}

/* ── kanban (pipeline) ───────────────────────────────────────────────── */
export function KanbanView({
  data,
  onOpenDetail,
  query,
  filters,
  facetFilters,
  sort,
}: {
  data: PipelineModuleData;
  onOpenDetail?: (d: DetailDescriptor) => void;
} & ViewFilterProps) {
  const [cards, setCards] = React.useState<PipelineCardModel[]>(data.cards);
  React.useEffect(() => setCards(data.cards), [data.cards]);

  // Card display toggle — "Image & data" vs "Data only" (Pipeline V5). Only
  // surfaced when at least one card actually has a cover image.
  const [display, setDisplay] = React.useState<'image' | 'data'>('image');
  const hasImages = cards.some((c) => Boolean(c.imageUrl));

  const move = (cardId: string, _from: string, to: string) => {
    // Local state for instant feedback…
    setCards((prev) =>
      prev.map((c) => (c.id === cardId ? { ...c, stageId: to } : c))
    );
    // …and propagate so the config persists the move (list/calendar views,
    // detail sheets, and dashboards all read the same data).
    data.onCardMove?.(cardId, to);
  };

  const visible = filterPipelineCards({ ...data, cards }, query, filters, facetFilters, sort);
  // "Every column empty" — most commonly a zero-result search/filter combo.
  // A per-column empty column (siblings have cards) stays a quiet column, so
  // only gate on the ALL-empty case per the platform empty-state law.
  const allEmpty = visible.length === 0;

  return (
    <div className="flex h-full min-h-0 flex-col">
      {hasImages ? (
        <div className="flex shrink-0 items-center justify-end px-4 pt-3">
          <div className="inline-flex items-center rounded-lg border border-border bg-card p-0.5 text-body-sm">
            {(['image', 'data'] as const).map((mode) => (
              <button
                key={mode}
                type="button"
                onClick={() => setDisplay(mode)}
                className={cn(
                  'rounded-md px-3 py-1 font-medium transition-colors',
                  display === mode
                    ? 'bg-primary text-primary-foreground'
                    : 'text-muted-foreground hover:text-foreground',
                )}
              >
                {mode === 'image' ? 'Image & data view' : 'Data only view'}
              </button>
            ))}
          </div>
        </div>
      ) : null}
      <KanbanBoard
        className={cn(
          'flex min-h-0 flex-1 gap-2 p-4',
          allEmpty ? 'items-center justify-center overflow-hidden' : 'overflow-x-auto',
        )}
        onCardMove={move}
        onDropToColumn={(columnId, cardId) => move(cardId, '', columnId)}
        getAllowedStages={data.allowedStages}
      >
      {allEmpty ? (
        data.emptyState ?? <EmptyState query={query} />
      ) : (
        data.stages.map((stage) => {
          const stageCards = visible.filter((c) => c.stageId === stage.id);
          return (
            <KanbanColumn
              key={stage.id}
              id={stage.id}
              label={stage.label}
              variant="board"
              color={stage.color}
              tint={stage.tint ?? rgba(stage.color, 0.03)}
              counterBg={stage.counterBg ?? rgba(stage.color, 0.1)}
              counterText={stage.counterText ?? stage.color}
              count={stageCards.length}
              cardIds={stageCards.map((c) => c.id)}
            >
              {stageCards.map((card) => {
                const { id, stageId, ...cardProps } = card;
                return (
                  <KanbanCard
                    key={id}
                    id={id}
                    stageId={stageId}
                    {...cardProps}
                    showImage={display === 'image'}
                    onClick={
                      data.toDetail && onOpenDetail
                        ? () => onOpenDetail(data.toDetail!(card))
                        : undefined
                    }
                  />
                );
              })}
            </KanbanColumn>
          );
        })
      )}
      </KanbanBoard>
    </div>
  );
}

/* ── pipeline calendar (cards bucketed onto a month grid) ────────────── */
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

function parseDayMonth(label: string): { day: number; month: number; year: number } | null {
  const m = /(\d{1,2})\s+(\w{3}),?\s+(\d{4})/.exec(label);
  if (!m) return null;
  const month = MONTHS.indexOf(m[2]);
  if (month < 0) return null;
  return { day: parseInt(m[1], 10), month, year: parseInt(m[3], 10) };
}

export function PipelineCalendarView({
  data,
  query,
  filters,
  facetFilters,
  sort,
}: {
  data: PipelineModuleData;
} & ViewFilterProps) {
  const cards = filterPipelineCards(data, query, filters, facetFilters, sort);
  const parsed = cards
    .map((c) => ({ c, d: parseDayMonth(String(c.dateLabel ?? '')) }))
    .filter((x): x is { c: PipelineCardModel; d: NonNullable<ReturnType<typeof parseDayMonth>> } => !!x.d);

  if (!parsed.length) {
    return <PlaceholderView title="Calendar" hint="No dated items to place on the calendar." />;
  }
  return <PipelineCalendarBody data={data} parsed={parsed} />;
}

/** Calendar body — Month/Week views, prev/next + Today navigation, a date-picker
 *  popup, and "View by" colouring. Driven by a single date anchor so week mode can
 *  cross month boundaries. Hooks live here so the empty-state early return in
 *  PipelineCalendarView never makes them conditional. `CalendarView` (shared with
 *  the calendar module type) is reused untouched for the month grid. */
function PipelineCalendarBody({
  data,
  parsed,
}: {
  data: PipelineModuleData;
  parsed: { c: PipelineCardModel; d: { day: number; month: number; year: number } }[];
}) {
  const [anchor, setAnchor] = React.useState<{ y: number; m: number; d: number }>({
    y: parsed[0].d.year,
    m: parsed[0].d.month,
    d: parsed[0].d.day,
  });
  const [mode, setMode] = React.useState<'month' | 'week'>('month');
  const [pickerOpen, setPickerOpen] = React.useState(false);

  // "View by" — which field colors the events (default: Stage). Any list column.
  const cols = data.columns ?? [];
  const [viewByCol, setViewByCol] = React.useState<string>(
    () => cols.find((c) => c.id === 'status')?.id ?? cols[0]?.id ?? '',
  );
  const viewCol = cols.find((c) => c.id === viewByCol);
  const byStage = viewByCol === 'status';
  const CAL_PALETTE = ['var(--chart-1)', 'var(--chart-2)', 'var(--chart-3)', 'var(--chart-4)', 'var(--chart-5)'];
  const stageColor = (id?: string) => data.stages.find((s) => s.id === id)?.color;
  const valueOf = (c: PipelineCardModel) =>
    byStage
      ? data.stages.find((s) => s.id === c.stageId)?.label ?? String(c.stageId)
      : (() => { const v = viewCol?.accessor?.(c); return v == null || v === '' ? '—' : String(v); })();
  // Assign palette colors by distinct-value INDEX (stable across the dataset) so each
  // value gets its own color — no hash collisions in the legend.
  const colorMap = new Map<string, string | undefined>();
  parsed.forEach((x) => {
    const v = valueOf(x.c);
    if (!colorMap.has(v)) colorMap.set(v, byStage ? stageColor(x.c.stageId) : CAL_PALETTE[colorMap.size % CAL_PALETTE.length]);
  });
  const colorOf = (c: PipelineCardModel) => colorMap.get(valueOf(c));

  const today = new Date();
  const isSameDay = (x: { d: { day: number; month: number; year: number } }, dt: Date) =>
    x.d.year === dt.getFullYear() && x.d.month === dt.getMonth() && x.d.day === dt.getDate();

  // Week mode: the 7 days of the week containing the anchor (Sunday-first).
  const weekStart = new Date(anchor.y, anchor.m, anchor.d - new Date(anchor.y, anchor.m, anchor.d).getDay());
  const weekDays = Array.from({ length: 7 }, (_, i) => {
    const dt = new Date(weekStart);
    dt.setDate(weekStart.getDate() + i);
    return dt;
  });
  const weekEnd = weekDays[6];

  // Items visible in the current view (for the legend + grid).
  const visibleParsed = mode === 'month'
    ? parsed.filter((x) => x.d.month === anchor.m && x.d.year === anchor.y)
    : parsed.filter((x) => weekDays.some((dt) => isSameDay(x, dt)));

  // Legend: distinct view-by values present in the current view.
  const legend: { value: string; color?: string }[] = [];
  const seenLegend = new Set<string>();
  visibleParsed.forEach((x) => {
    const v = valueOf(x.c);
    if (!seenLegend.has(v)) { seenLegend.add(v); legend.push({ value: v, color: colorOf(x.c) }); }
  });

  const eventLabel = (c: PipelineCardModel) => String(c.title ?? c.ticketId ?? '');
  const first = new Date(anchor.y, anchor.m, 1);
  const monthLabel = first.toLocaleString('en-US', { month: 'long', year: 'numeric' });
  const weekLabel = weekStart.getMonth() === weekEnd.getMonth()
    ? `${weekStart.toLocaleString('en-US', { month: 'short' })} ${weekStart.getDate()} – ${weekEnd.getDate()}, ${weekEnd.getFullYear()}`
    : `${weekStart.toLocaleString('en-US', { month: 'short' })} ${weekStart.getDate()} – ${weekEnd.toLocaleString('en-US', { month: 'short' })} ${weekEnd.getDate()}, ${weekEnd.getFullYear()}`;
  const headerLabel = mode === 'month' ? monthLabel : weekLabel;

  // prev/next steps a month (month mode) or a week (week mode).
  const shift = (delta: number) => {
    if (mode === 'month') {
      const d = new Date(anchor.y, anchor.m + delta, 1);
      setAnchor({ y: d.getFullYear(), m: d.getMonth(), d: 1 });
    } else {
      const d = new Date(anchor.y, anchor.m, anchor.d + delta * 7);
      setAnchor({ y: d.getFullYear(), m: d.getMonth(), d: d.getDate() });
    }
  };
  const navBtn = 'inline-flex size-8 items-center justify-center rounded-lg border border-border text-muted-foreground hover:text-foreground';

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="relative flex shrink-0 flex-wrap items-center gap-1 px-4 pt-3">
        <button type="button" onClick={() => shift(-1)} aria-label={mode === 'month' ? 'Previous month' : 'Previous week'} className={navBtn}>
          <ChevronLeft className="size-4" />
        </button>
        <button
          type="button"
          onClick={() => setPickerOpen((o) => !o)}
          className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-body font-semibold text-foreground hover:bg-muted/60"
          aria-haspopup="dialog"
          aria-expanded={pickerOpen}
        >
          {headerLabel}
          <ChevronDown className="size-4 text-muted-foreground" />
        </button>
        <button type="button" onClick={() => shift(1)} aria-label={mode === 'month' ? 'Next month' : 'Next week'} className={navBtn}>
          <ChevronRight className="size-4" />
        </button>
        <button
          type="button"
          onClick={() => setAnchor({ y: today.getFullYear(), m: today.getMonth(), d: today.getDate() })}
          className="ml-1 rounded-lg border border-border px-2.5 py-1.5 text-body-sm font-medium text-foreground hover:bg-muted/60"
        >
          Today
        </button>

        <div className="ml-auto flex items-center gap-3">
          {/* Month / Week switch */}
          <div className="inline-flex items-center rounded-lg border border-border bg-card p-0.5 text-body-sm">
            {(['month', 'week'] as const).map((m) => (
              <button
                key={m}
                type="button"
                onClick={() => setMode(m)}
                className={cn(
                  'rounded-md px-3 py-1 font-medium capitalize transition-colors',
                  mode === m ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground',
                )}
              >
                {m}
              </button>
            ))}
          </div>
          {cols.length ? (
            <div className="flex items-center gap-2">
              <label className="text-body-sm text-muted-foreground" htmlFor="pipeline-calendar-viewby">View by</label>
              <select
                id="pipeline-calendar-viewby"
                value={viewByCol}
                onChange={(e) => setViewByCol(e.target.value)}
                className="h-8 rounded-lg border border-border bg-card px-2 text-body-sm text-foreground outline-none focus:ring-2 focus:ring-primary/30"
              >
                {cols.map((c) => (
                  <option key={c.id} value={c.id}>{typeof c.header === 'string' ? c.header : c.id}</option>
                ))}
              </select>
            </div>
          ) : null}
        </div>

        {pickerOpen ? (
          <div className="absolute left-12 top-12 z-20 w-60 rounded-xl border border-border bg-card p-3 shadow-elevation" role="dialog" aria-label="Pick month">
            <div className="mb-2 flex items-center justify-between">
              <button type="button" aria-label="Previous year" onClick={() => setAnchor((a) => ({ ...a, y: a.y - 1 }))} className="inline-flex size-7 items-center justify-center rounded-md hover:bg-muted/60"><ChevronLeft className="size-4" /></button>
              <span className="text-body-sm font-semibold text-foreground">{anchor.y}</span>
              <button type="button" aria-label="Next year" onClick={() => setAnchor((a) => ({ ...a, y: a.y + 1 }))} className="inline-flex size-7 items-center justify-center rounded-md hover:bg-muted/60"><ChevronRight className="size-4" /></button>
            </div>
            <div className="grid grid-cols-3 gap-1">
              {MONTHS.map((m, i) => (
                <button
                  key={m}
                  type="button"
                  onClick={() => { setAnchor((a) => ({ ...a, m: i, d: 1 })); setPickerOpen(false); }}
                  className={cn(
                    'rounded-md px-2 py-1.5 text-body-sm font-medium',
                    i === anchor.m ? 'bg-primary text-primary-foreground' : 'text-foreground hover:bg-muted/60',
                  )}
                >
                  {m}
                </button>
              ))}
            </div>
          </div>
        ) : null}
      </div>
      {legend.length ? (
        <div className="flex shrink-0 flex-wrap items-center gap-x-4 gap-y-1 px-4 pt-2">
          {legend.map((l) => (
            <span key={l.value} className="inline-flex items-center gap-1.5 text-caption text-muted-foreground">
              <span aria-hidden className="size-2.5 rounded-full" style={{ background: l.color ?? 'var(--primary)' }} />
              {l.value}
            </span>
          ))}
        </div>
      ) : null}
      <div className="min-h-0 flex-1 overflow-auto">
        {mode === 'month' ? (
          <CalendarView
            hideHeader
            data={{
              monthLabel,
              startWeekday: first.getDay(),
              daysInMonth: new Date(anchor.y, anchor.m + 1, 0).getDate(),
              events: visibleParsed.map((x) => ({ day: x.d.day, label: eventLabel(x.c), color: colorOf(x.c) })),
              today: today.getFullYear() === anchor.y && today.getMonth() === anchor.m ? today.getDate() : undefined,
            }}
          />
        ) : (
          <div className="grid grid-cols-7 gap-1 p-4">
            {weekDays.map((dt, i) => {
              const dayItems = parsed.filter((x) => isSameDay(x, dt));
              const isToday = isSameDay({ d: { day: today.getDate(), month: today.getMonth(), year: today.getFullYear() } }, dt);
              return (
                <div
                  key={i}
                  className={cn(
                    'flex min-h-[240px] flex-col gap-1 rounded-md border p-1.5',
                    isToday ? 'border-primary bg-secondary/40' : 'border-border bg-card',
                  )}
                >
                  <div className={cn('pb-1 text-caption font-semibold uppercase tracking-wide', isToday ? 'text-primary' : 'text-muted-foreground')}>
                    {WEEKDAYS[i]} {dt.getDate()}
                  </div>
                  {dayItems.map((x, j) => (
                    <div
                      key={j}
                      className="truncate rounded px-1 py-0.5 text-caption font-medium text-white"
                      style={{ background: colorOf(x.c) ?? 'var(--primary)' }}
                      title={eventLabel(x.c)}
                    >
                      {eventLabel(x.c)}
                    </div>
                  ))}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

/* ── pipeline list (same data, table form) ───────────────────────────── */
export function PipelineListView({
  data,
  onOpenDetail,
  query,
  filters,
  facetFilters,
  sort,
  groupByCol,
}: {
  data: PipelineModuleData;
  onOpenDetail?: (d: DetailDescriptor) => void;
  /**
   * Selected Group-by column id, owned by the SHELL (AppShell's toolbar row —
   * see `GroupByFacetField`), not this view (T-094 F2 — a native `<select>`
   * in its own row below the toolbar read as a broken, inconsistent control
   * next to Workforce's in-toolbar facet-dropdown pill). '' / undefined =
   * no grouping. When this prop is omitted entirely (e.g. a standalone
   * showcase/story render with no shell around it), grouping is simply
   * unavailable — the control only exists inside the one shared toolbar row.
   */
  groupByCol?: string;
} & ViewFilterProps) {
  if (!data.columns) {
    return (
      <div className="p-8 text-body-sm text-muted-foreground">
        No list columns configured for this pipeline.
      </div>
    );
  }
  const cards = filterPipelineCards(data, query, filters, facetFilters, sort);
  const cols = data.columns;
  const groupColumn = groupByCol ? cols.find((c) => c.id === groupByCol) : undefined;
  const groupBy = groupColumn
    ? {
        get: (row: PipelineCardModel) => {
          const v = groupColumn.accessor?.(row);
          return v == null || v === '' ? '—' : String(v);
        },
        // Map a status/stage key to its readable stage label; otherwise show the value.
        label: (k: string) => data.stages.find((s) => s.id === k)?.label ?? k,
      }
    : undefined;

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className={cn('min-h-0 flex-1 p-4', data.listScrollMode === 'lazy' && !groupBy ? 'flex flex-col' : 'overflow-auto')}>
        <DataTable
          className={data.listScrollMode === 'lazy' && !groupBy ? 'h-full' : undefined}
          columns={cols}
          data={cards}
          emptyState={<EmptyState query={query} />}
          getRowId={(c) => (c as PipelineCardModel).id}
          stickyHeader
          groupBy={groupBy}
          scrollMode={data.listScrollMode}
          onRowClick={
            data.toDetail && onOpenDetail
              ? (row) => onOpenDetail(data.toDetail!(row as PipelineCardModel))
              : undefined
          }
        />
      </div>
    </div>
  );
}

/* ── map / live-monitoring ───────────────────────────────────────────── */
export function MapView({
  data,
  onOpenDetail,
}: {
  data: MonitoringModuleData | NonNullable<EntityModuleData['map']>;
  onOpenDetail?: (d: DetailDescriptor) => void;
}) {
  const monitoring = data as MonitoringModuleData;
  return (
    <div className="p-4">
      <MapWidget
        height={560}
        statusBadge={'statusBadge' in data ? monitoring.statusBadge : undefined}
        showZoomControls={false}
        showFullscreen={false}
      >
        <LeafletMap
          center={data.center}
          zoom={11}
          markers={data.markers}
          onMarkerClick={(id) => {
            if ('onMarkerDetail' in data && monitoring.onMarkerDetail && onOpenDetail) {
              const d = monitoring.onMarkerDetail(id);
              if (d) onOpenDetail(d);
            }
          }}
        />
      </MapWidget>
    </div>
  );
}

/* ── hybrid (list + map) ─────────────────────────────────────────────── */
export function HybridView({
  data,
  onOpenDetail,
  query,
  filters,
  facetFilters,
  sort,
}: {
  data: EntityModuleData;
  onOpenDetail?: (d: DetailDescriptor) => void;
} & ViewFilterProps) {
  const rows = filterEntityRows(data, query, filters, facetFilters, sort);
  const lazy = data.listScrollMode === 'lazy';
  return (
    <div className="grid h-full grid-cols-1 gap-4 p-4 lg:grid-cols-2">
      <div className={cn('min-h-0 rounded-lg border border-border', lazy ? 'flex flex-col' : 'overflow-auto')}>
        <DataTable
          className={lazy ? 'h-full' : undefined}
          columns={data.columns}
          data={rows}
          getRowId={data.getRowId}
          stickyHeader
          scrollMode={data.listScrollMode}
          onRowClick={
            data.toDetail && onOpenDetail
              ? (row) => onOpenDetail(data.toDetail!(row))
              : undefined
          }
        />
      </div>
      <div className="min-h-0">
        {data.map ? (
          <MapWidget height="100%" showZoomControls={false} showFullscreen={false}>
            <LeafletMap center={data.map.center} zoom={11} markers={data.map.markers} />
          </MapWidget>
        ) : (
          <div className="flex h-full items-center justify-center rounded-lg border border-dashed border-border text-body-sm text-muted-foreground">
            No geo data configured
          </div>
        )}
      </div>
    </div>
  );
}

/* ── pipeline hybrid (cards + map) ───────────────────────────────────────
   Left: the pipeline's mappable cards, each with an eye toggle. Right: a map
   showing a PIN for every location-linked card and a highlighted ZONE for every
   zone-linked card. The eye toggle removes a card's pin/zone from the map. */
export function PipelineHybridView({
  data,
  onOpenDetail,
  query,
  filters,
  facetFilters,
  sort,
}: {
  data: PipelineModuleData;
  onOpenDetail?: (d: DetailDescriptor) => void;
} & ViewFilterProps) {
  const all = filterPipelineCards(data, query, filters, facetFilters, sort);
  const geoCards = all.filter((c) => c.location || c.zoneId);
  const [hidden, setHidden] = React.useState<Set<string>>(() => new Set());
  const toggle = (id: string) =>
    setHidden((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });

  const stageColor = (id?: string) => data.stages.find((s) => s.id === id)?.color;
  const stageLabel = (id?: string) => data.stages.find((s) => s.id === id)?.label ?? id;
  const label = (c: PipelineCardModel) => String(c.title ?? c.ticketId ?? '');

  const visible = geoCards.filter((c) => !hidden.has(c.id));
  const markers = visible
    .filter((c) => c.location)
    .map((c) => ({ id: c.id, position: c.location!, kind: 'dot' as const, status: 'default' as const, label: label(c), tooltip: label(c) }));
  const activeZoneIds = new Set(visible.filter((c) => c.zoneId).map((c) => c.zoneId));
  const zones = (data.mapZones ?? []).filter((z) => activeZoneIds.has(z.id));
  const center = data.mapCenter ?? markers[0]?.position ?? data.mapZones?.[0]?.points[0] ?? [25.2, 55.27];
  const zoneById = (id?: string) => data.mapZones?.find((z) => z.id === id);

  if (!geoCards.length) {
    return <PlaceholderView title="Map" hint="No location- or zone-linked items to place on the map." />;
  }

  return (
    <div className="grid h-full grid-cols-1 gap-4 p-4 lg:grid-cols-2">
      <div className="flex min-h-0 flex-col overflow-auto rounded-lg border border-border">
        {geoCards.map((c) => {
          const isHidden = hidden.has(c.id);
          const zone = zoneById(c.zoneId);
          return (
            <div
              key={c.id}
              className={cn(
                'flex items-center gap-3 border-b border-border px-3 py-2.5 last:border-0 transition-colors',
                onOpenDetail && data.toDetail ? 'cursor-pointer hover:bg-muted/40' : '',
                isHidden && 'opacity-50',
              )}
              onClick={onOpenDetail && data.toDetail ? () => onOpenDetail(data.toDetail!(c)) : undefined}
            >
              <span aria-hidden className="size-2.5 shrink-0 rounded-full" style={{ background: stageColor(c.stageId) ?? 'var(--muted-foreground)' }} />
              <div className="min-w-0 flex-1">
                <div className="truncate text-body-sm font-medium text-foreground">{label(c)}</div>
                <div className="flex items-center gap-1.5 text-caption text-muted-foreground">
                  {c.location ? <MapPin className="size-3" /> : <Shapes className="size-3" />}
                  <span className="truncate">{c.location ? stageLabel(c.stageId) : (zone?.label ?? 'Zone')}</span>
                </div>
              </div>
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); toggle(c.id); }}
                className="shrink-0 rounded-md p-1.5 text-muted-foreground hover:bg-muted/60 hover:text-foreground"
                aria-label={isHidden ? 'Show on map' : 'Hide from map'}
                aria-pressed={!isHidden}
              >
                {isHidden ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
              </button>
            </div>
          );
        })}
      </div>
      <div className="min-h-0">
        <MapWidget height="100%" showZoomControls={false} showFullscreen={false}>
          <LeafletMap
            center={center}
            zoom={12}
            markers={markers}
            zones={zones}
            onMarkerClick={(id) => {
              const card = visible.find((c) => c.id === id);
              if (card && data.toDetail && onOpenDetail) onOpenDetail(data.toDetail(card));
            }}
          />
        </MapWidget>
      </div>
    </div>
  );
}

/* ── inbox (cross-app notification surface) ──────────────────────────────
   The app-rail Inbox (NOT a module). Header (title · search · filter · Clear
   All), filter tabs with counts, date-grouped rich rows, empty state. Driven
   by InboxModuleData — covers notifications from every app. */
type InboxTabId = 'unread' | 'all' | 'reminder' | 'assigned' | 'mention' | 'critical';

const INBOX_TABS: { id: InboxTabId; label: string }[] = [
  { id: 'unread', label: 'Unread' },
  { id: 'all', label: 'All' },
  { id: 'reminder', label: 'Reminders' },
  { id: 'assigned', label: 'Assigned to me' },
  { id: 'mention', label: '@Mentions' },
  { id: 'critical', label: 'Critical' },
];

const nodeText = (n: React.ReactNode): string => (typeof n === 'string' || typeof n === 'number' ? String(n) : '');

function matchInboxTab(n: InboxNotification, tab: InboxTabId): boolean {
  switch (tab) {
    case 'unread': return !!n.unread;
    case 'all': return true;
    case 'reminder': return !!n.categories?.includes('reminder');
    case 'assigned': return !!n.categories?.includes('assigned');
    case 'mention': return n.kind === 'mention' || !!n.categories?.includes('mention');
    case 'critical': return n.priority === 'Critical' || !!n.categories?.includes('critical');
  }
}

/** A small grey meta chip (source tag / module). */
function InboxChip({ icon, children }: { icon?: React.ReactNode; children: React.ReactNode }) {
  return (
    <span className="inline-flex items-center gap-1 rounded-md bg-muted px-1.5 py-0.5 text-caption font-medium text-muted-foreground">
      {icon}
      {children}
    </span>
  );
}

function InboxRow({
  n,
  onClear,
  onClick,
}: {
  n: InboxNotification;
  onClear: (id: string) => void;
  /** T-047 #8 — additive row click hook (the row previously had NO click
   *  affordance at all besides "Clear"); undefined preserves prior behaviour. */
  onClick?: (n: InboxNotification) => void;
}) {
  const unread = !!n.unread;
  const lead =
    n.kind === 'mention' || n.avatarSrc || n.avatarFallback ? (
      <Avatar size="sm" src={n.avatarSrc} fallback={n.avatarFallback ?? 'U'} />
    ) : (
      <span
        className={cn(
          'flex size-8 shrink-0 items-center justify-center rounded-full',
          n.kind === 'system' ? 'bg-muted text-muted-foreground' : 'bg-secondary text-primary'
        )}
      >
        {n.kind === 'system' ? <Activity size={16} /> : <Bell01 size={16} />}
      </span>
    );
  return (
    <div
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
      onClick={onClick ? () => onClick(n) : undefined}
      onKeyDown={onClick ? (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onClick(n); } } : undefined}
      className={cn(
        'group relative flex gap-3 rounded-lg border px-4 py-3 transition-colors',
        unread ? 'border-border bg-card' : 'border-transparent bg-muted/30',
        onClick ? 'cursor-pointer hover:bg-muted/40' : ''
      )}
    >
      {lead}
      <div className="min-w-0 flex-1">
        <div className={cn('truncate text-body-sm', unread ? 'font-semibold text-foreground' : 'font-medium text-foreground/80')}>
          {n.title}
        </div>
        {n.description ? (
          <div className="mt-0.5 line-clamp-2 text-caption text-muted-foreground">{n.description}</div>
        ) : null}
        <div className="mt-2 flex flex-wrap items-center gap-2">
          {n.sourceTag ? <InboxChip icon={<Hash size={11} />}>{n.sourceTag}</InboxChip> : null}
          {n.priority ? (
            <span
              className={cn(
                'inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-caption font-semibold',
                n.priority === 'Critical' ? 'bg-[var(--status-error)]/10 text-[var(--status-error)]' : 'bg-[var(--status-success)]/10 text-[var(--status-success)]'
              )}
            >
              <Flag06 size={11} />
              {n.priority}
            </span>
          ) : null}
          {n.dueLabel ? (
            <span className="inline-flex items-center gap-1 rounded-md bg-[var(--status-warning)]/10 px-1.5 py-0.5 text-caption font-semibold text-[var(--status-warning)]">
              <Clock size={11} />
              {n.dueLabel}
            </span>
          ) : null}
          {n.module ? <InboxChip icon={n.moduleIcon ?? <LayersThree01 size={11} />}>{n.module}</InboxChip> : null}
        </div>
      </div>
      <div className="flex shrink-0 flex-col items-end gap-1">
        <div className="flex items-center gap-1.5">
          {unread ? <span aria-hidden className="size-2 rounded-full bg-primary" /> : null}
          {n.timestamp ? <span className="text-caption tabular-nums text-muted-foreground">{n.timestamp}</span> : null}
        </div>
        <button
          type="button"
          onClick={(e) => { e.stopPropagation(); onClear(n.id); }}
          className="hidden items-center gap-1 text-caption font-medium text-primary outline-none hover:underline group-hover:flex"
        >
          <Check size={12} />
          Clear
        </button>
      </div>
    </div>
  );
}

export function InboxView({
  data,
  className,
  onNotificationClick,
}: {
  data: InboxModuleData;
  className?: string;
  /** T-047 #8 — forwarded from `AppShell`'s `collectiveInbox.onNotificationClick`. */
  onNotificationClick?: (n: InboxNotification) => void;
}) {
  const [tab, setTab] = React.useState<InboxTabId>('unread');
  const [query, setQuery] = React.useState('');
  const [cleared, setCleared] = React.useState<Set<string>>(() => new Set());
  const clearOne = (id: string) => setCleared((prev) => new Set(prev).add(id));

  const q = query.trim().toLowerCase();
  const live = data.notifications.filter((n) => !cleared.has(n.id));
  const searched = q
    ? live.filter((n) => `${nodeText(n.title)} ${nodeText(n.description)} ${n.sourceTag ?? ''} ${n.module ?? ''}`.toLowerCase().includes(q))
    : live;

  const counts = Object.fromEntries(
    INBOX_TABS.map((t) => [t.id, searched.filter((n) => matchInboxTab(n, t.id)).length])
  ) as Record<InboxTabId, number>;

  const visible = searched.filter((n) => matchInboxTab(n, tab));

  // Group by dateGroup, preserving first-seen order.
  const order: string[] = [];
  const byGroup = new Map<string, InboxNotification[]>();
  for (const n of visible) {
    const g = n.dateGroup ?? 'Earlier';
    if (!byGroup.has(g)) { byGroup.set(g, []); order.push(g); }
    byGroup.get(g)!.push(n);
  }

  const clearAll = () => setCleared((prev) => { const next = new Set(prev); visible.forEach((n) => next.add(n.id)); return next; });

  // One-time "enable desktop notifications" prompt (Figma frame). Shows only
  // when the browser permission is undecided and the user hasn't dismissed it.
  const [promptOpen, setPromptOpen] = React.useState(false);
  React.useEffect(() => {
    if (data.desktopPrompt === false) return;
    try {
      if (localStorage.getItem('fams-inbox-notify') === 'dismissed') return;
      if ('Notification' in window && Notification.permission === 'default') setPromptOpen(true);
    } catch { /* no-op */ }
  }, [data.desktopPrompt]);
  const dismissPrompt = () => {
    try { localStorage.setItem('fams-inbox-notify', 'dismissed'); } catch { /* no-op */ }
    setPromptOpen(false);
  };
  const allowNotifications = () => {
    try {
      if ('Notification' in window) Notification.requestPermission().finally(dismissPrompt);
      else dismissPrompt();
    } catch { dismissPrompt(); }
  };

  return (
    <div className={cn('flex h-full min-h-0 flex-col bg-background', className)}>
      {/* Header */}
      <div className="flex items-center justify-between gap-4 border-b border-border px-7 py-4">
        <div className="flex items-center gap-2">
          <Inbox01 size={20} className="text-primary" />
          <h1 className="text-h6 font-semibold text-foreground">{data.title ?? 'Inbox'}</h1>
        </div>
        <div className="flex items-center gap-2">
          <div className="relative w-[280px] max-w-[40vw]">
            <SearchMd size={16} className="pointer-events-none absolute left-3 top-1/2 z-10 -translate-y-1/2 text-muted-foreground" />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search inbox"
              className="h-10 w-full rounded-lg border border-border bg-card pl-9 pr-3 text-body-sm text-foreground outline-none placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:ring-ring"
            />
          </div>
          <button type="button" title="Filter" className="flex size-10 items-center justify-center rounded-lg border border-border bg-card text-foreground outline-none transition-colors hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring">
            <FilterLines size={16} />
          </button>
          <button
            type="button"
            onClick={clearAll}
            disabled={!visible.length}
            className={cn(
              'flex h-10 items-center gap-1.5 rounded-lg border px-3.5 text-body-sm font-semibold outline-none transition-colors focus-visible:ring-2 focus-visible:ring-ring',
              visible.length ? 'border-primary text-primary hover:bg-secondary' : 'cursor-not-allowed border-border text-muted-foreground'
            )}
          >
            <Check size={16} />
            Clear All
          </button>
        </div>
      </div>

      {/* Filter tabs */}
      <div className="flex items-center gap-6 border-b border-border px-7">
        {INBOX_TABS.map((t) => {
          const active = t.id === tab;
          return (
            <button
              key={t.id}
              type="button"
              onClick={() => setTab(t.id)}
              className={cn(
                'flex items-center gap-1.5 border-b-2 py-3 text-body-sm font-medium outline-none transition-colors',
                active ? 'border-primary text-primary' : 'border-transparent text-muted-foreground hover:text-foreground'
              )}
            >
              {t.label}
              <span className={cn('rounded px-1.5 py-0.5 text-caption font-semibold tabular-nums', active ? 'bg-secondary text-primary' : 'bg-muted text-muted-foreground')}>
                {String(counts[t.id]).padStart(2, '0')}
              </span>
            </button>
          );
        })}
      </div>

      {/* Body */}
      <div className="min-h-0 flex-1 overflow-auto px-7 py-5">
        {visible.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center gap-2 text-center">
            <div className="mb-2 flex size-20 items-center justify-center rounded-full bg-muted">
              <Inbox01 size={38} className="text-muted-foreground" />
            </div>
            <div className="text-h6 font-semibold text-foreground">You&apos;re all caught up</div>
            <p className="max-w-xs text-body-sm text-muted-foreground">
              No {tab === 'all' ? '' : `${INBOX_TABS.find((t) => t.id === tab)?.label.toLowerCase()} `}notifications. View read items to revisit anything from earlier.
            </p>
          </div>
        ) : (
          <div className="mx-auto w-full max-w-4xl">
            {order.map((g) => (
              <div key={g} className="mb-5">
                <div className="mb-2 text-caption font-semibold text-foreground">{g}</div>
                <div className="flex flex-col gap-2">
                  {byGroup.get(g)!.map((n) => (
                    <InboxRow key={n.id} n={n} onClear={clearOne} onClick={onNotificationClick} />
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* One-time desktop-notification opt-in */}
      <Dialog open={promptOpen} onOpenChange={(o) => { if (!o) dismissPrompt(); }}>
        <DialogContent className="max-w-sm">
          <div className="mx-auto -mt-1 mb-1 flex size-12 items-center justify-center rounded-full bg-secondary text-primary">
            <Bell01 size={24} />
          </div>
          <DialogHeader>
            <DialogTitle className="text-center">Never miss an important update</DialogTitle>
            <DialogDescription className="text-center">
              Enable desktop notifications to stay on top of the information that matters most.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="sm:justify-center">
            <Button variant="secondary" onClick={dismissPrompt}>Not Now</Button>
            <Button onClick={allowNotifications}>Allow Notifications</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

/* ── reports home (the report catalog / landing) ─────────────────────────
   The reports module opens on this catalog. Each report tab becomes a card;
   opening one shows the Report Runner (the tab's render) with a Home-back icon
   in the top nav. Figma DS V2 reports top-bar (7134:2199). */
export interface SavedReport {
  id: string;
  label: React.ReactNode;
  category?: string;
  description?: React.ReactNode;
}

/** One report card (system or saved). Saved cards get a ⋯ menu with Delete. */
function ReportCard({
  icon,
  label,
  category,
  description,
  system,
  onOpen,
  onDelete,
}: {
  icon?: IconType;
  label: React.ReactNode;
  category?: string;
  description?: React.ReactNode;
  system?: boolean;
  onOpen: () => void;
  onDelete?: () => void;
}) {
  const Icon = icon ?? BarChartSquare02;
  return (
    <div className="group relative flex h-full flex-col items-start gap-3 rounded-xl border border-border bg-card p-5 transition-all hover:border-primary hover:shadow-sm">
      <div className="flex w-full items-start justify-between">
        <span className="flex size-10 items-center justify-center rounded-lg bg-secondary text-primary">
          <Icon size={20} />
        </span>
        {onDelete ? (
          <Popover>
            <PopoverTrigger asChild>
              <button type="button" aria-label="Report actions" className="flex size-7 items-center justify-center rounded-md text-muted-foreground opacity-0 outline-none transition-opacity hover:bg-muted group-hover:opacity-100 focus-visible:opacity-100">
                <MoreHorizontal size={16} />
              </button>
            </PopoverTrigger>
            <PopoverContent align="end" className="w-40 p-1">
              <button type="button" onClick={onDelete} className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-body-sm text-[var(--status-error)] outline-none transition-colors hover:bg-muted">
                <Trash2 size={14} />
                Delete
              </button>
            </PopoverContent>
          </Popover>
        ) : null}
      </div>
      <button type="button" onClick={onOpen} className="flex min-w-0 flex-1 flex-col items-start gap-1 text-left outline-none">
        <div className="flex items-center gap-2">
          <span className="text-body font-semibold text-foreground">{label}</span>
          {system ? (
            <span className="rounded-full bg-muted px-2 py-0.5 text-caption font-semibold uppercase tracking-wide text-muted-foreground">System</span>
          ) : null}
        </div>
        {description ? <p className="text-caption text-muted-foreground">{description}</p> : null}
      </button>
      <button type="button" onClick={onOpen} className="mt-auto inline-flex items-center gap-1 text-caption font-semibold text-primary outline-none hover:underline">
        View report
        <ArrowRight size={13} />
      </button>
    </div>
  );
}

export function ReportsHome({
  systemReports,
  savedReports = [],
  onOpen,
  onOpenSaved,
  onNewReport,
  onDelete,
  title = 'Reports',
  showSaved = true,
}: {
  systemReports: ModuleTab[];
  savedReports?: SavedReport[];
  onOpen: (id: string) => void;
  onOpenSaved?: (id: string) => void;
  onNewReport?: () => void;
  onDelete?: (id: string) => void;
  title?: React.ReactNode;
  /** Show the "Saved" reports nav. Hidden when the product disallows new reports. */
  showSaved?: boolean;
}) {
  // Distinct system categories (in first-seen order) → the SYSTEM sub-nav.
  const categories: string[] = [];
  for (const r of systemReports) {
    const c = r.category ?? 'Reports';
    if (!categories.includes(c)) categories.push(c);
  }
  // Land on the full system catalog — categories are filters, not silos (T-016).
  const [active, setActive] = React.useState<string>('all');
  const [query, setQuery] = React.useState('');
  const [deleteTarget, setDeleteTarget] = React.useState<SavedReport | null>(null);

  const q = query.trim().toLowerCase();
  const matches = (label: React.ReactNode, description?: React.ReactNode) =>
    !q || `${nodeText(label)} ${nodeText(description)}`.toLowerCase().includes(q);

  const navItem = (id: string, label: React.ReactNode, icon?: React.ReactNode) => (
    <button
      key={id}
      type="button"
      onClick={() => setActive(id)}
      className={cn(
        'flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-body-sm outline-none transition-colors',
        active === id ? 'bg-secondary font-semibold text-primary' : 'text-foreground/80 hover:bg-muted'
      )}
    >
      {icon}
      {label}
    </button>
  );

  const visibleSaved = savedReports.filter((s) => matches(s.label, s.description));
  const visibleSystem = systemReports.filter(
    (r) => (active === 'all' || (r.category ?? 'Reports') === active) && matches(r.label, r.description),
  );

  return (
    <div className="flex h-full min-h-0">
      {/* Reports category sub-nav (the reports' own nav — not the app/module rail) */}
      <aside className="flex w-[220px] shrink-0 flex-col gap-1 border-r border-border bg-card p-3">
        {showSaved ? (
          <>
            {navItem('saved', 'Saved', <Bookmark size={15} />)}
            <div className="px-3 pb-1 pt-3 text-caption font-semibold uppercase tracking-wide text-muted-foreground">System</div>
          </>
        ) : null}
        {navItem('all', 'All Reports', <BarChartSquare02 size={15} />)}
        {categories.map((c) => navItem(c, c, <FileText size={15} />))}
      </aside>

      {/* Catalog */}
      <div className="flex min-h-0 flex-1 flex-col">
        <div className="flex items-center gap-3 border-b border-border px-7 py-4">
          <div className="relative max-w-[420px] flex-1">
            <SearchMd size={16} className="pointer-events-none absolute left-3 top-1/2 z-10 -translate-y-1/2 text-muted-foreground" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search anything here"
              className="h-10 w-full rounded-lg border border-border bg-card pl-9 pr-3 text-body-sm outline-none placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:ring-ring"
            />
          </div>
          {onNewReport ? (
            <button type="button" onClick={onNewReport} className="ml-auto flex h-10 shrink-0 items-center gap-1.5 rounded-lg bg-primary px-3.5 text-body-sm font-semibold text-primary-foreground outline-none transition-colors hover:opacity-90 focus-visible:ring-2 focus-visible:ring-ring">
              <Plus size={15} />
              New Report
            </button>
          ) : null}
        </div>

        <div className="min-h-0 flex-1 overflow-auto px-7 py-5">
          <div className="mb-3 flex items-center gap-2">
            <span className="text-body font-semibold uppercase tracking-wide text-foreground">{active === 'saved' ? 'Saved' : active === 'all' ? 'All Reports' : active}</span>
            {active !== 'saved' ? (
              <span className="rounded-full bg-muted px-2 py-0.5 text-caption font-semibold uppercase tracking-wide text-muted-foreground">System</span>
            ) : null}
          </div>

          {active === 'saved' ? (
            visibleSaved.length ? (
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {visibleSaved.map((s) => (
                  <ReportCard
                    key={s.id}
                    label={s.label}
                    category={s.category}
                    description={s.description}
                    onOpen={() => onOpenSaved?.(s.id)}
                    onDelete={onDelete ? () => setDeleteTarget(s) : undefined}
                  />
                ))}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center gap-2 py-16 text-center">
                <div className="mb-1 flex size-16 items-center justify-center rounded-full bg-muted"><Bookmark size={28} className="text-muted-foreground" /></div>
                <div className="text-body font-semibold text-foreground">No saved reports yet</div>
                <p className="max-w-xs text-caption text-muted-foreground">Build a report with “New Report” and save it to find it here.</p>
              </div>
            )
          ) : (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {visibleSystem.map((r) => (
                <ReportCard
                  key={r.id}
                  icon={r.icon}
                  label={r.label ?? r.id}
                  category={active === 'all' ? r.category : undefined}
                  description={r.description}
                  system
                  onOpen={() => onOpen(r.id)}
                />
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Delete confirmation — only custom (saved) reports can be deleted */}
      <AlertDialog open={!!deleteTarget} onOpenChange={(o) => { if (!o) setDeleteTarget(null); }}>
        <AlertDialogContent>
          <div className="mx-auto mb-1 flex size-12 items-center justify-center rounded-full bg-[var(--status-error)]/10 text-[var(--status-error)]">
            <AlertTriangle size={22} />
          </div>
          <AlertDialogHeader>
            <AlertDialogTitle className="text-center">Delete Report!</AlertDialogTitle>
            <AlertDialogDescription className="text-center">
              Are you sure you want to delete {nodeText(deleteTarget?.label) || 'this report'}?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="sm:justify-center">
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => { if (deleteTarget) onDelete?.(deleteTarget.id); setDeleteTarget(null); }}
              className="bg-[var(--status-error)] text-white hover:opacity-90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

/* ── reports top-nav (Home tab + opened-report tabs) ─────────────────────
   Reports open as tabs (like opened records): the Home tab returns to the
   catalog; each opened report is its own closeable tab. Figma DS V2 reports
   top-bar (the "🏠 Reports | 📄 …Report" tab strip). */
export interface ReportsTopNavTab {
  id: string;
  label: React.ReactNode;
  active: boolean;
  onSelect: () => void;
  onClose: () => void;
}

export function ReportsTopNav({
  homeLabel = 'Reports',
  homeActive,
  onHome,
  tabs,
}: {
  homeLabel?: React.ReactNode;
  homeActive: boolean;
  onHome: () => void;
  tabs: ReportsTopNavTab[];
}) {
  const base = 'inline-flex h-full items-center border-b-2 text-body-sm outline-none transition-colors';
  return (
    // Browser-style tabs: no scroll. Inactive tabs flex-shrink + truncate as more
    // open (hover shows the full name via title tooltip); the active tab keeps its
    // full width. The Home (module) tab is fixed and never shrinks.
    <div className="flex h-11 shrink-0 items-stretch overflow-hidden border-b border-border bg-card">
      <button
        type="button"
        onClick={onHome}
        className={cn(base, 'shrink-0 gap-2 px-4', homeActive ? 'border-primary font-semibold text-primary' : 'border-transparent text-muted-foreground hover:text-foreground')}
      >
        <Home size={15} />
        {homeLabel}
      </button>
      {tabs.map((t) => {
        const titleText = typeof t.label === 'string' ? t.label : undefined;
        return (
          <div
            key={t.id}
            title={titleText}
            className={cn(
              base,
              'gap-1.5 pl-3 pr-2',
              t.active
                ? 'max-w-[280px] shrink-0 border-primary font-medium text-foreground'
                : 'min-w-0 flex-1 basis-0 border-transparent text-muted-foreground hover:text-foreground',
            )}
          >
            <button type="button" onClick={t.onSelect} className="inline-flex min-w-0 flex-1 items-center gap-2 outline-none">
              <FileText size={14} className="shrink-0" />
              <span className="truncate">{t.label}</span>
            </button>
            <button
              type="button"
              onClick={t.onClose}
              aria-label="Close report"
              className="flex size-4 shrink-0 items-center justify-center rounded text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            >
              <X size={12} />
            </button>
          </div>
        );
      })}
    </div>
  );
}

/* ── calendar (month grid) ───────────────────────────────────────────── */
const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export function CalendarView({ data, hideHeader }: { data: CalendarModuleData; hideHeader?: boolean }) {
  const start = data.startWeekday ?? 0;
  const eventsByDay = new Map<number, { label: string; color?: string }[]>();
  for (const e of data.events) {
    const list = eventsByDay.get(e.day) ?? [];
    list.push({ label: e.label, color: e.color });
    eventsByDay.set(e.day, list);
  }
  const cells: (number | null)[] = [
    ...Array.from({ length: start }, () => null),
    ...Array.from({ length: data.daysInMonth }, (_, i) => i + 1),
  ];

  return (
    <div className="p-4">
      {hideHeader ? null : (
        <div className="mb-3 text-h6 font-semibold text-foreground">{data.monthLabel}</div>
      )}
      <div className="grid grid-cols-7 gap-1">
        {WEEKDAYS.map((w) => (
          <div key={w} className="pb-1 text-center text-caption font-semibold uppercase tracking-wide text-muted-foreground">
            {w}
          </div>
        ))}
        {cells.map((day, i) => {
          if (day == null) return <div key={`blank-${i}`} />;
          const events = eventsByDay.get(day) ?? [];
          const isToday = data.today === day;
          return (
            <div
              key={day}
              className={cn(
                'flex min-h-[84px] flex-col gap-1 rounded-md border border-border p-1.5',
                isToday ? 'border-primary bg-secondary/40' : 'bg-card'
              )}
            >
              <div className={cn('text-caption font-semibold', isToday ? 'text-primary' : 'text-muted-foreground')}>
                {day}
              </div>
              {events.slice(0, 3).map((e, j) => (
                <div
                  key={j}
                  className="truncate rounded px-1 py-0.5 text-caption font-medium text-white"
                  style={{ background: e.color ?? 'var(--primary)' }}
                  title={e.label}
                >
                  {e.label}
                </div>
              ))}
              {events.length > 3 ? (
                <div className="text-caption text-muted-foreground">+{events.length - 3} more</div>
              ) : null}
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ── settings (config-driven admin sections) ─────────────────────────── */
function SettingsRow({ item }: { item: SettingsItem }) {
  const [on, setOn] = React.useState(item.kind === 'toggle' ? item.defaultOn ?? false : false);
  return (
    <div className="flex items-center justify-between gap-4 px-4 py-3">
      <div className="min-w-0">
        <div className="text-body-sm font-medium text-foreground">{item.label}</div>
        {'description' in item && item.description ? (
          <div className="text-caption text-muted-foreground">{item.description}</div>
        ) : null}
      </div>
      {item.kind === 'field' ? (
        <div className="shrink-0 text-body-sm text-muted-foreground">{item.value}</div>
      ) : item.kind === 'toggle' ? (
        <Switch checked={on} onCheckedChange={setOn} aria-label={item.label} />
      ) : (
        <Button size="sm" variant={item.destructive ? 'destructive' : 'secondary'} onClick={item.onAction}>
          {item.actionLabel}
        </Button>
      )}
    </div>
  );
}

export function SettingsView({ data }: { data: SettingsModuleData }) {
  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-5 p-6">
      {data.sections.map((s) => (
        <section key={s.id} className="overflow-hidden rounded-lg border border-border bg-card">
          <div className="border-b border-border px-4 py-3">
            <h3 className="text-body-sm font-semibold text-foreground">{s.title}</h3>
            {s.description ? <p className="text-caption text-muted-foreground">{s.description}</p> : null}
          </div>
          <div className="divide-y divide-border">
            {s.items.map((it, i) => (
              <SettingsRow key={i} item={it} />
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}

/* ── forms (full-page SchemaForm) ────────────────────────────────────── */
export function FormsView({ data, actions }: { data: FormsModuleData; actions: ShellActions }) {
  const [submitted, setSubmitted] = React.useState(false);
  if (submitted) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-3 p-8 text-center">
        <CheckCircle size={40} className="text-primary" />
        <div className="text-h6 font-semibold text-foreground">{data.successTitle ?? 'Submitted'}</div>
        <div className="max-w-md text-body-sm text-muted-foreground">
          {data.successHint ?? 'Your entry has been recorded.'}
        </div>
        <Button size="sm" variant="secondary" onClick={() => setSubmitted(false)}>
          Submit another
        </Button>
      </div>
    );
  }
  return (
    <div className="mx-auto w-full max-w-2xl p-6">
      {data.title ? <h2 className="text-h6 font-semibold text-foreground">{data.title}</h2> : null}
      {data.description ? <p className="mb-4 text-body-sm text-muted-foreground">{data.description}</p> : null}
      <div className="rounded-lg border border-border bg-card p-5">
        <SchemaForm
          schema={data.schema}
          onSubmit={(v) => {
            data.onSubmit?.(v, actions);
            setSubmitted(true);
          }}
        />
      </div>
    </div>
  );
}

/* ── generic placeholder ─────────────────────────────────────────────── */
export function PlaceholderView({ title, hint }: { title: string; hint?: string }) {
  return (
    <div className="flex h-full flex-col items-center justify-center gap-2 p-8 text-center">
      <div className="text-h6 font-semibold text-foreground">{title}</div>
      {hint ? <div className="max-w-md text-body-sm text-muted-foreground">{hint}</div> : null}
    </div>
  );
}
