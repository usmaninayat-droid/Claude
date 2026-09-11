import * as React from 'react';
import * as Icons from '../../icons';
import { cn } from '../utils/cn';
import { Button, Input, Badge, Popover, PopoverTrigger, PopoverContent } from '../primitives';
import { EmptyState } from '../data-display';
import { MapView, WeatherForecastWidget } from '../map';
import type { LatLng, MapMarker, MapViewHandle } from '../map';
import { PoiCreate, circlePolygon } from './poi-create';
import { poiPinDataUri } from './poi-pin';
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
  /** Coverage radius in metres — drawn as a ring on the map when set. */
  radiusM?: number;
  /** Extra key/value rows shown in the on-map Mini preview (e.g. status,
   *  staged vehicles). Optional — omit for the plain name/description card. */
  preview?: { label: React.ReactNode; value: React.ReactNode }[];
  /** Pin color — renders the canonical Figma POI pin (233-181658) in this
   *  color on the map + list, overriding the type-keyed `icons` artwork.
   *  User-selectable at creation time (Figma 233-181312). */
  color?: string;
  /** Exact pin artwork (data URI) for this POI — highest precedence, used on
   *  BOTH the map marker and the list ICON so a product can supply a type-
   *  specific glyph pin (e.g. the DS assembly-point / rain-tower pins). */
  iconUrl?: string;
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
  /** Opens the full Entity preview (detail sheet) — fired from the Mini
   *  preview's "View details" action, NOT on every row click (so both the
   *  Mini and Entity previews stay reachable). */
  onPoiClick?: (p: PoiNode) => void;
  className?: string;
}

function iconUrlFor(p: PoiNode, icons: Record<string, string>, resolveIcon?: (type: string) => string | undefined): string | undefined {
  // Exact per-POI artwork wins (type-specific glyph pins); then a per-POI
  // color (generic Figma pin 233-181658); then the type-keyed artwork map.
  if (p.iconUrl) return p.iconUrl;
  if (p.color) return poiPinDataUri(p.color);
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
  const [mapTick, setMapTick] = React.useState(0); // bumps on camera move to reposition the Mini preview
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

  // Mini-preview anchor — recomputed on selection change AND every camera move
  // (via `mapTick`, bumped by a STABLE onViewportChange, so no stale closure).
  const popupPos = React.useMemo(() => {
    if (!selected || !mapRef.current) return null;
    void mapTick;
    return mapRef.current.project(selected.position);
  }, [selected, mapTick]);

  // Sized generously (T-040 item i — "POI markers are too small on the map").
  const markers: MapMarker[] = React.useMemo(
    () => filtered.map((p): MapMarker => ({
      id: p.id, position: p.position, iconUrl: iconUrlFor(p, icons, resolveIcon),
      // Type-glyph pins (iconUrl) render at their 36:54 aspect with the anchor
      // dot on the coordinate; the generic colour pin keeps 47.5:68.4; legacy
      // artwork keeps its old geometry.
      ...(p.iconUrl
        ? { iconSize: [36, 54] as [number, number], iconAnchor: [18, 49] as [number, number] }
        : p.color
        ? { iconSize: [42, 60] as [number, number], iconAnchor: [20, 48] as [number, number] }
        : { iconSize: [38, 46] as [number, number], iconAnchor: [19, 46] as [number, number] }),
      selected: p.id === selected?.id,
    })),
    [filtered, icons, resolveIcon, selected?.id],
  );

  // Row/marker click selects + opens the on-map Mini preview (does NOT open
  // the full Entity sheet — that's the Mini preview's "View details" action).
  const selectRow = (p: PoiNode) => {
    setSelectedId(p.id);
    mapRef.current?.flyTo(p.position, 15);
  };

  // Coverage rings for POIs that define a radius (also highlights selection).
  const radiusZones = React.useMemo(
    () => filtered.filter((p) => p.radiusM && p.radiusM > 0).map((p) => ({
      id: `r-${p.id}`,
      points: circlePolygon(p.position, p.radiusM!),
      color: '#15B79E', // coherence-allow — coverage-ring accent (== --chart-accent-teal)
      fillOpacity: p.id === selectedId ? 0.22 : 0.1,
    })),
    [filtered, selectedId],
  );

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
          setCreated((cur) => [...cur, { id, name: p.name, type: p.type, tags: p.tags, position: p.position, description: p.description, radiusM: p.radiusM, color: p.color }]);
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
                aria-label={tagFilter.size ? `Filters (${tagFilter.size} active)` : 'Filters'}
                className={cn(
                  'relative grid size-10 shrink-0 place-items-center rounded-lg border border-border bg-card transition-colors hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring',
                  tagFilter.size > 0 ? 'border-primary text-primary' : 'text-foreground',
                )}
              >
                <Icons.FilterFunnel02 size={16} />
                {tagFilter.size > 0 && (
                  <span className="absolute -right-1 -top-1 grid size-4 place-items-center rounded-full bg-primary text-caption font-bold leading-none text-primary-foreground">{tagFilter.size}</span>
                )}
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
          zones={radiusZones}
          onMarkerClick={(id) => { const p = filtered.find((x) => x.id === id); if (p) selectRow(p); }}
          onViewportChange={() => setMapTick((t) => t + 1)}
          fitToContent={!selected}
          className="h-full w-full"
        />

        {/* Weather forecast overlay (Figma Qatar MME · 13866-8220) */}
        <div className="pointer-events-none absolute left-4 right-16 bottom-3 z-[450] flex flex-col items-end">
          <WeatherForecastWidget />
        </div>

        {/* Floated map controls (Figma 233-181655): brand "Create New POI"
            top-left; a layers toggle top-right. */}
        <div className="pointer-events-none absolute left-4 top-4 z-[400] flex items-center gap-2">
          <Button
            variant="primary"
            className="pointer-events-auto shrink-0"
            onClick={() => { onCreate?.(); setCreating(true); }}
          >
            <Icons.Plus size={16} className="mr-1.5" />Create New POI
          </Button>
        </div>
        <div className="pointer-events-none absolute right-4 top-4 z-[400]">
          <button type="button" aria-label="Layers" className="pointer-events-auto grid size-10 place-items-center rounded-lg border border-border bg-card text-muted-foreground shadow-sm transition-colors hover:bg-muted hover:text-foreground">
            <Icons.LayersThree01 size={16} />
          </button>
        </div>

        {/* Mini preview — on-map card for the selected POI: name · type · tags ·
            radius + a "View details" action that opens the Entity preview. */}
        {selected && popupPos && (
          <div
            role="tooltip"
            className="absolute z-[450] w-64 -translate-x-1/2 rounded-lg border border-border bg-card p-3 text-left shadow-lg"
            style={{ left: popupPos.x, top: popupPos.y - 52 }}
          >
            <div className="flex items-start gap-2">
              {/* eslint-disable-next-line jsx-a11y/alt-text */}
              <img src={iconUrlFor(selected, icons, resolveIcon)} alt="" className="mt-0.5 h-[24px] w-[20px] shrink-0 object-contain" />
              <div className="min-w-0 flex-1">
                <div className="truncate text-body-sm font-semibold text-foreground">{selected.name}</div>
                <div className="truncate text-body-xs capitalize text-muted-foreground">{selected.type.replace(/-/g, ' ')}</div>
              </div>
            </div>
            {selected.description && <div className="mt-1.5 text-body-xs text-muted-foreground">{selected.description}</div>}
            {(selected.preview?.length || selected.radiusM) ? (
              <div className="mt-2 flex flex-col gap-1 border-t border-border pt-2">
                {selected.preview?.map((r, i) => (
                  <div key={i} className="flex items-center justify-between gap-2 text-body-xs">
                    <span className="text-muted-foreground">{r.label}</span>
                    <span className="truncate font-medium text-foreground">{r.value}</span>
                  </div>
                ))}
                {selected.radiusM ? (
                  <div className="flex items-center justify-between gap-2 text-body-xs">
                    <span className="text-muted-foreground">Coverage radius</span>
                    <span className="font-medium text-foreground">{selected.radiusM} m</span>
                  </div>
                ) : null}
              </div>
            ) : null}
            {(selected.tags?.length ?? 0) > 0 && (
              <div className="mt-2 flex flex-wrap gap-1">
                {selected.tags!.map((t) => <Badge key={t} size="xs" color={tagColor(t)}>{t}</Badge>)}
              </div>
            )}
            {onPoiClick && (
              <button
                type="button"
                onClick={() => onPoiClick(selected)}
                className="mt-2.5 flex w-full items-center justify-center gap-1.5 rounded-md bg-primary px-3 py-1.5 text-body-xs font-semibold text-primary-foreground outline-none transition-opacity hover:opacity-90"
              >
                View details <Icons.ArrowRight size={13} />
              </button>
            )}
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
