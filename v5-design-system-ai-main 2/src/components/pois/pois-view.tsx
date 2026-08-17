import * as React from 'react';
import * as Icons from '../../icons';
import { cn } from '../utils/cn';
import { Button, Input, Badge, Popover, PopoverTrigger, PopoverContent } from '../primitives';
import { EmptyState } from '../data-display';
import { MapView } from '../map';
import type { LatLng, MapMarker, MapViewHandle } from '../map';
import { PoiCreate } from './poi-create';
import type { NewPoi } from './poi-create';

/**
 * PoisView — the generic Point-of-Interest surface (Berkeley Telematics Figma
 * 203-69599/67656). SAME chassis as `ZonesView` (T-040 item g): a left list
 * panel — its own toolbar row (search · tag filter · Create New) at the top,
 * table below — beside the map on the right; one surface, no List/Map-only
 * tabs (T-040 items j/k — Zones only ever offered the one hybrid view, so
 * POIs now matches it exactly). Config-driven: `pois: PoiNode[]` + an `icons`
 * map (the pin artwork itself is resolved by the CONSUMER — products glob
 * their own vendored SVGs and pass `{ [slug]: url }`; the DS never globs
 * assets).
 *
 * Interactions: row click flies the map to the POI + opens a small
 * name/description popup pinned to it (tracked live via `MapView`'s
 * `project`/`onViewportChange`, so it follows pan/zoom) and highlights the
 * row; the tag filter is a Popover of the union of POI tags (AND-filters
 * list + map markers); "Create New" opens `PoiCreate` (click-to-place pin +
 * form), adding the result to both the list and the map.
 */

export interface PoiNode {
  id: string;
  name: string;
  /** Pin type slug — looked up in `icons` (or via `resolveIcon`). */
  type: string;
  tags?: string[];
  position: LatLng;
  description?: string;
}

export interface PoisViewProps {
  pois: PoiNode[];
  /** Pin artwork, keyed by `type` slug (consumer globs its vendored SVGs). */
  icons?: Record<string, string>;
  /** Overrides `icons` lookup when provided. */
  resolveIcon?: (type: string) => string | undefined;
  center?: LatLng;
  zoom?: number;
  labels?: { poi?: string; tag?: string };
  onCreate?: () => void;
  onPoiClick?: (p: PoiNode) => void;
  className?: string;
}

function iconUrlFor(p: PoiNode, icons: Record<string, string>, resolveIcon?: (type: string) => string | undefined): string | undefined {
  if (resolveIcon) return resolveIcon(p.type) ?? Object.values(icons)[0];
  return icons[p.type] ?? icons.default ?? Object.values(icons)[0];
}

/* Deterministic per-tag colour — token-only (chart tokens, no hex; a
 * user-selectable colour-DATA palette, one of the sanctioned hex-free
 * categories). Same tag always maps to the same token across renders.
 * DELIBERATELY excludes `--chart-4` (identical hex to `--status-success`)
 * and `--chart-accent-purple` (identical hex to `--chart-3`, already in this
 * list) — a status/category set must never assign two members the same
 * rendered colour (T-035). */
const TAG_TOKENS = [
  'var(--chart-1)', 'var(--chart-2)', 'var(--chart-3)', 'var(--chart-5)',
  'var(--chart-accent-pink)', 'var(--chart-accent-teal)', 'var(--chart-accent-yellow)',
];
function tagColor(tag: string): string {
  let h = 0;
  for (let i = 0; i < tag.length; i++) h = (h * 31 + tag.charCodeAt(i)) >>> 0;
  return TAG_TOKENS[h % TAG_TOKENS.length];
}

export function PoisView({
  pois, icons = {}, resolveIcon, center = [25.2, 55.27], zoom = 10,
  labels, onCreate, onPoiClick, className,
}: PoisViewProps) {
  const L = { poi: 'Name', tag: 'Tag', ...labels };
  const mapRef = React.useRef<MapViewHandle>(null);
  const [search, setSearch] = React.useState('');
  const [tagFilter, setTagFilter] = React.useState<Set<string>>(new Set());
  const [filterOpen, setFilterOpen] = React.useState(false);
  const [tagSearch, setTagSearch] = React.useState('');
  const [selectedId, setSelectedId] = React.useState<string | null>(null);
  const [popupPos, setPopupPos] = React.useState<{ x: number; y: number } | null>(null);
  const [creating, setCreating] = React.useState(false);
  const [created, setCreated] = React.useState<PoiNode[]>([]);
  // Same "fly to the just-created pin once its fresh MapView mounts" pattern
  // as `ZonesView`'s `pendingFocusRef` (T-040 item e's POI counterpart).
  const pendingFocusRef = React.useRef<LatLng | null>(null);

  const allPois = React.useMemo(() => [...pois, ...created], [pois, created]);

  const allTags = React.useMemo(() => [...new Set(allPois.flatMap((p) => p.tags ?? []))].sort(), [allPois]);
  const tagCounts = React.useMemo(() => {
    const m = new Map<string, number>();
    allPois.forEach((p) => (p.tags ?? []).forEach((t) => m.set(t, (m.get(t) ?? 0) + 1)));
    return m;
  }, [allPois]);

  const q = search.trim().toLowerCase();
  const filtered = React.useMemo(
    () => allPois.filter((p) => {
      if (q && !`${p.name} ${(p.tags ?? []).join(' ')}`.toLowerCase().includes(q)) return false;
      if (tagFilter.size && ![...tagFilter].every((t) => (p.tags ?? []).includes(t))) return false;
      return true;
    }),
    [allPois, q, tagFilter],
  );
  const selected = filtered.find((p) => p.id === selectedId) ?? null;
  const toggleTag = (t: string) => setTagFilter((s) => { const n = new Set(s); n.has(t) ? n.delete(t) : n.add(t); return n; });
  const visibleTagOptions = allTags.filter((t) => !tagSearch.trim() || t.toLowerCase().includes(tagSearch.trim().toLowerCase()));

  const syncPopup = React.useCallback(() => {
    setPopupPos(selected ? mapRef.current?.project(selected.position) ?? null : null);
  }, [selected]);
  React.useEffect(syncPopup, [syncPopup]);

  // Sized generously (T-040 item i — "POI markers are too small on the map").
  const markers: MapMarker[] = React.useMemo(
    () => filtered.map((p): MapMarker => ({
      id: p.id, position: p.position, iconUrl: iconUrlFor(p, icons, resolveIcon), iconSize: [38, 46], iconAnchor: [19, 46],
      selected: p.id === selected?.id,
    })),
    [filtered, icons, resolveIcon, selected?.id],
  );

  const selectRow = (p: PoiNode) => {
    setSelectedId(p.id);
    onPoiClick?.(p);
    mapRef.current?.flyTo(p.position, 15);
  };

  React.useEffect(() => {
    if (creating || !pendingFocusRef.current) return;
    const pos = pendingFocusRef.current;
    pendingFocusRef.current = null;
    let raf = 0;
    const tryFly = () => {
      if (mapRef.current?.flyTo) { mapRef.current.flyTo(pos, 15); return; }
      raf = requestAnimationFrame(tryFly);
    };
    raf = requestAnimationFrame(tryFly);
    return () => cancelAnimationFrame(raf);
  }, [creating]);

  if (creating) {
    return (
      <PoiCreate
        icons={icons}
        center={center}
        zoom={zoom}
        onCancel={() => setCreating(false)}
        onCreate={(p: NewPoi) => {
          const id = `poi-${created.length + 1}-${p.name}`;
          setCreated((cur) => [...cur, { id, name: p.name, type: p.type, tags: p.tags, position: p.position, description: p.description }]);
          setSelectedId(id);
          pendingFocusRef.current = p.position;
          setCreating(false);
        }}
      />
    );
  }

  return (
    <div className={cn('flex h-full min-h-0', className)}>
      {/* left: POI list — SAME chassis as ZonesView (toolbar lives in this
          column, not floated full-width above the map — T-040 item g). */}
      <div className="flex w-[620px] max-w-[54%] min-w-[440px] flex-col border-r border-border">
        <div className="flex w-full flex-wrap items-center gap-2 p-4">
          <div className="relative min-w-[160px] flex-1">
            <Icons.SearchMd size={15} className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground z-10" />
            <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search anything here" className="pl-8" />
          </div>
          <Popover open={filterOpen} onOpenChange={setFilterOpen}>
            <PopoverTrigger asChild>
              <button
                type="button"
                aria-expanded={filterOpen}
                className={cn(
                  'flex h-10 shrink-0 items-center gap-1.5 rounded-lg border border-border bg-card px-3 text-body-sm font-medium transition-colors hover:bg-muted',
                  tagFilter.size > 0 ? 'border-primary text-primary' : 'text-foreground',
                )}
              >
                <Icons.FilterLines size={15} />
                <span>{tagFilter.size ? `${tagFilter.size} Tag${tagFilter.size > 1 ? 's' : ''}` : 'All Tags'}</span>
                <Icons.ChevronDown size={14} className="text-muted-foreground" />
              </button>
            </PopoverTrigger>
            <PopoverContent align="start" className="w-72 p-3">
              <div className="mb-2 flex items-center justify-between">
                <span className="text-body-sm font-semibold text-foreground">Filter by tags</span>
                {tagFilter.size > 0 && (
                  <button type="button" onClick={() => setTagFilter(new Set())} className="text-body-xs font-medium text-[color:var(--status-error)] hover:opacity-80">Clear all</button>
                )}
              </div>
              <div className="relative mb-2">
                <Icons.SearchSm size={14} className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground z-10" />
                <Input value={tagSearch} onChange={(e) => setTagSearch(e.target.value)} placeholder="Search tags" className="h-9 pl-8" />
              </div>
              <div className="flex max-h-64 flex-col gap-0.5 overflow-auto">
                {visibleTagOptions.map((t) => {
                  const on = tagFilter.has(t);
                  return (
                    <button key={t} type="button" aria-pressed={on} onClick={() => toggleTag(t)} className="flex w-full items-center justify-between gap-2 rounded-md px-2 py-1.5 text-left transition-colors hover:bg-muted">
                      <span className="flex items-center gap-2">
                        <span className={cn('grid size-4 place-items-center rounded border', on ? 'border-primary bg-primary text-primary-foreground' : 'border-border')}>{on && <Icons.Check size={11} />}</span>
                        <span className="text-body-sm text-foreground">{t}</span>
                      </span>
                      <span className="rounded-full bg-muted px-1.5 py-0.5 text-caption font-medium text-muted-foreground">{tagCounts.get(t) ?? 0}</span>
                    </button>
                  );
                })}
                {!visibleTagOptions.length && <div className="px-2 py-3 text-center text-body-sm text-muted-foreground">No tags found.</div>}
              </div>
            </PopoverContent>
          </Popover>
          <Button variant="primary" onClick={() => { onCreate?.(); setCreating(true); }} className="shrink-0">
            <Icons.Plus size={16} className="mr-1.5" />Create New
          </Button>
        </div>

        <PoiTable pois={filtered} icons={icons} resolveIcon={resolveIcon} labels={L} selectedId={selected?.id ?? null} onSelect={selectRow} />
      </div>

      {/* right: map */}
      {/* `isolate` — own stacking context so the map's panes never paint over the popup. */}
      <div className="relative isolate min-h-0 flex-1">
        <MapView
          ref={mapRef}
          center={selected?.position ?? center}
          zoom={selected ? 15 : zoom}
          markers={markers}
          onMarkerClick={(id) => { const p = filtered.find((x) => x.id === id); if (p) selectRow(p); }}
          onViewportChange={syncPopup}
          fitToContent={!selected}
          className="h-full w-full"
        />
        {selected && popupPos && (
          <div
            role="tooltip"
            className="pointer-events-none absolute z-[450] w-56 -translate-x-1/2 rounded-lg border border-border bg-card p-3 text-left shadow-lg"
            style={{ left: popupPos.x, top: popupPos.y - 46 }}
          >
            <div className="text-body-sm font-semibold text-foreground">{selected.name}</div>
            {selected.description && <div className="mt-0.5 text-body-xs text-muted-foreground">{selected.description}</div>}
          </div>
        )}
      </div>
    </div>
  );
}

/* ── POI table (ICON · NAME · TAG) ───────────────────────────────────────── */
function PoiTable({
  pois, icons, resolveIcon, labels, selectedId, onSelect,
}: {
  pois: PoiNode[];
  icons: Record<string, string>;
  resolveIcon?: (type: string) => string | undefined;
  labels: { poi: string; tag: string };
  selectedId: string | null;
  onSelect: (p: PoiNode) => void;
}) {
  if (!pois.length) {
    return <div className="p-6"><EmptyState variant="no-results" title="No points of interest" description="No points of interest match this filter." /></div>;
  }
  return (
    <div className="min-h-0 flex-1 overflow-auto">
      <table className="w-full border-collapse text-body-sm">
        <thead className="sticky top-0 z-[1] bg-card">
          <tr className="border-y border-border text-caption font-bold uppercase tracking-wide text-muted-foreground">
            <th className="w-12 px-2 py-2 text-left">Icon</th>
            <th className="px-2 py-2 text-left">{labels.poi}</th>
            <th className="px-2 py-2 text-left">{labels.tag}</th>
          </tr>
        </thead>
        <tbody>
          {/* LAW: every row — hover state + cursor-pointer + full-row click target. */}
          {pois.map((p) => (
            <tr
              key={p.id}
              onClick={() => onSelect(p)}
              className={cn('cursor-pointer border-b border-border/70 transition-colors hover:bg-muted/30', selectedId === p.id && 'bg-primary/5')}
            >
              <td className="px-2 py-2">
                {/* eslint-disable-next-line jsx-a11y/alt-text */}
                <img src={iconUrlFor(p, icons, resolveIcon)} alt="" className="h-[26px] w-[22px] object-contain" />
              </td>
              <td className="px-2 py-2 font-medium text-foreground">{p.name}</td>
              <td className="px-2 py-2">
                <div className="flex flex-wrap gap-1">
                  {(p.tags ?? []).map((t) => <Badge key={t} size="xs" color={tagColor(t)}>{t}</Badge>)}
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
