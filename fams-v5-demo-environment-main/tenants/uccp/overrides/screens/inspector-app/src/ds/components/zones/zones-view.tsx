import * as React from 'react';
import * as Icons from '../../icons';
import { cn } from '../utils/cn';
import { Button, Input, Popover, PopoverTrigger, PopoverContent } from '../primitives';
import { ColumnConfig } from '../data-display';
import { MapView } from '../map';
import type { LatLng, MapViewHandle } from '../map';
import { ZoneCreate } from './zone-create';
import type { NewZone } from './zone-create';

/**
 * ZonesView — the Zones module Hybrid View (FAMS V5 Launch Pad, Figma
 * W2z46FvC6aOdzOHDc3rqD5 · 2746-12870). A hierarchical zone tree (zones contain
 * sub-zones) beside a map of coloured zone polygons. Each row: eye map-visibility
 * toggle · colour dot + name (indented by depth, expand/collapse) · tags ·
 * location · description. Standard DS `ColumnConfig` pencil in the header; map is
 * the DS `MapView`. Config-driven `zones: ZoneNode[]` (recursive) + callbacks.
 *
 * Interactions: the eye toggle shows/hides that zone's polygon on the map; a
 * row click flies/fits the map to that zone's real geometry and highlights it
 * (fill boost + row tint) — the list colour dot is always the same value fed
 * to the map layer, so they can never drift (5265-107046 "tags only" filter,
 * now wired as a Popover of the union of zone tags, AND-filtering list + map).
 */

export interface ZoneNode {
  id: string;
  name: string;
  color: string;
  tags?: string[];
  location?: string;
  description?: string;
  points?: LatLng[];
  visible?: boolean;
  children?: ZoneNode[];
}

export interface ZonesViewProps {
  zones: ZoneNode[];
  center?: LatLng;
  zoom?: number;
  labels?: { zone?: string; tags?: string; location?: string; description?: string };
  onCreateZone?: () => void;
  onExport?: () => void;
  onZoneClick?: (z: ZoneNode) => void;
  className?: string;
}

const ICON_BTN = 'grid size-10 shrink-0 place-items-center rounded-lg border border-border text-muted-foreground transition-colors hover:bg-muted hover:text-foreground';

/** flatten the tree (respecting expanded state) into visible rows with depth. */
function flatten(nodes: ZoneNode[], expanded: Set<string>, depth = 0): { node: ZoneNode; depth: number }[] {
  return nodes.flatMap((node) => {
    const row = { node, depth };
    const kids = node.children?.length && expanded.has(node.id) ? flatten(node.children, expanded, depth + 1) : [];
    return [row, ...kids];
  });
}
/** all nodes flattened (ignoring expand state) — for search + map. */
function allNodes(nodes: ZoneNode[]): ZoneNode[] {
  return nodes.flatMap((n) => [n, ...(n.children ? allNodes(n.children) : [])]);
}
/** polygon centroid — a stable fallback camera target when `fitTo` isn't available. */
function centroid(points: LatLng[]): LatLng {
  const [sLat, sLng] = points.reduce(([alat, alng], [lat, lng]) => [alat + lat, alng + lng], [0, 0]);
  return [sLat / points.length, sLng / points.length];
}

export function ZonesView({
  zones, center = [25.18, 55.30], zoom = 12, labels, onCreateZone, onExport, onZoneClick, className,
}: ZonesViewProps) {
  const L = { zone: 'Zone', tags: 'Tags', location: 'Location', description: 'Description', ...labels };
  const mapRef = React.useRef<MapViewHandle>(null);
  const [query, setQuery] = React.useState('');
  const [expanded, setExpanded] = React.useState<Set<string>>(() => new Set(allNodes(zones).filter((n) => n.children?.length).map((n) => n.id)));
  const [hidden, setHidden] = React.useState<Set<string>>(new Set()); // hidden on map
  const [hiddenCols, setHiddenCols] = React.useState<string[]>([]);
  const [creating, setCreating] = React.useState(false);
  const [created, setCreated] = React.useState<ZoneNode[]>([]);
  const [selectedId, setSelectedId] = React.useState<string | null>(null);
  const [tagFilter, setTagFilter] = React.useState<Set<string>>(new Set());
  const [filterOpen, setFilterOpen] = React.useState(false);
  const [tagSearch, setTagSearch] = React.useState('');
  // Screen-space "fly the camera to the just-created zone" — the normal (non-
  // creating) MapView is a FRESH mount when `creating` flips back to false, so
  // `mapRef.current` isn't attached yet at the moment `onCreate` fires; poll
  // via rAF until the new instance's ref is live, then fit its camera to the
  // zone's own geometry (not `fitToContent`'s whole-dataset bounds, which can
  // zoom out so far the brand-new shape is imperceptible — T-040 item e).
  const pendingFocusRef = React.useRef<LatLng[] | null>(null);

  const treeZones = React.useMemo(() => [...zones, ...created], [zones, created]);
  const all = React.useMemo(() => allNodes(treeZones), [treeZones]);
  const q = query.trim().toLowerCase();

  const allTags = React.useMemo(() => [...new Set(all.flatMap((n) => n.tags ?? []))].sort(), [all]);
  const tagCounts = React.useMemo(() => {
    const m = new Map<string, number>();
    all.forEach((n) => (n.tags ?? []).forEach((t) => m.set(t, (m.get(t) ?? 0) + 1)));
    return m;
  }, [all]);
  const matchesTags = React.useCallback(
    (n: ZoneNode) => tagFilter.size === 0 || [...tagFilter].every((t) => (n.tags ?? []).includes(t)),
    [tagFilter],
  );

  // Hierarchical (expand-state respecting) rows; search/tag-filtered matches flatten instead.
  const flatFiltered = React.useMemo(
    () => all.filter((n) => matchesTags(n) && (!q || `${n.name} ${(n.tags ?? []).join(' ')} ${n.location ?? ''}`.toLowerCase().includes(q))),
    [all, q, matchesTags],
  );
  const rows = React.useMemo(() => {
    if (q || tagFilter.size) return flatFiltered.map((node) => ({ node, depth: 0 }));
    return flatten(treeZones, expanded);
  }, [q, tagFilter.size, flatFiltered, treeZones, expanded]);

  const toggleExpand = (id: string) => setExpanded((s) => { const n = new Set(s); n.has(id) ? n.delete(id) : n.add(id); return n; });
  const toggleVisible = (id: string) => setHidden((s) => { const n = new Set(s); n.has(id) ? n.delete(id) : n.add(id); return n; });
  const toggleTag = (t: string) => setTagFilter((s) => { const n = new Set(s); n.has(t) ? n.delete(t) : n.add(t); return n; });
  const showCol = (id: string) => !hiddenCols.includes(id);

  const mapZones = React.useMemo(
    () => flatFiltered.filter((n) => n.points && !hidden.has(n.id)).map((n) => ({
      id: n.id, points: n.points!, color: n.color, label: n.name,
      fillOpacity: n.id === selectedId ? 0.34 : 0.14,
    })),
    [flatFiltered, hidden, selectedId],
  );

  const selectZone = (node: ZoneNode) => {
    setSelectedId(node.id);
    onZoneClick?.(node);
    if (node.points?.length) {
      if (mapRef.current?.fitTo) mapRef.current.fitTo(node.points, { maxZoom: 15 });
      else mapRef.current?.flyTo(centroid(node.points), 15);
    }
  };

  const visibleTagOptions = allTags.filter((t) => !tagSearch.trim() || t.toLowerCase().includes(tagSearch.trim().toLowerCase()));

  // Once we're back on the normal (list + map) view, fly/fit the camera to
  // whatever zone was just drawn — see `pendingFocusRef` above.
  React.useEffect(() => {
    if (creating || !pendingFocusRef.current) return;
    const pts = pendingFocusRef.current;
    pendingFocusRef.current = null;
    let raf = 0;
    const tryFit = () => {
      if (mapRef.current?.fitTo) { mapRef.current.fitTo(pts, { maxZoom: 15 }); return; }
      raf = requestAnimationFrame(tryFit);
    };
    raf = requestAnimationFrame(tryFit);
    return () => cancelAnimationFrame(raf);
  }, [creating]);

  if (creating) {
    return (
      <ZoneCreate
        center={center}
        zoom={zoom}
        parentOptions={all.map((n) => ({ id: n.id, name: n.name }))}
        onCancel={() => setCreating(false)}
        onCreate={(z: NewZone) => {
          const id = `zone-${created.length + 1}-${z.name}`;
          setCreated((cur) => [...cur, { id, name: z.name, color: z.color, tags: z.tags, location: 'Custom', description: 'User-drawn zone', points: z.points }]);
          setSelectedId(id);
          pendingFocusRef.current = z.points;
          setCreating(false);
        }}
      />
    );
  }

  return (
    <div className={cn('flex h-full min-h-0', className)}>
      {/* left: tree list */}
      <div className="flex w-[620px] max-w-[54%] min-w-[440px] flex-col border-r border-border">
        {/* ONE toolbar row — search · filter field · secondary + primary actions
            (never a primary action floated separately over the map). */}
        <div className="flex w-full flex-wrap items-center gap-2 p-4">
          <div className="relative min-w-[160px] flex-1">
            <Icons.SearchMd size={15} className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground z-10" />
            <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search anything here" className="pl-8" />
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
                {/* filter value TEXT lives inside the field itself — no external floated label */}
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
          <button type="button" aria-label="Export zones" onClick={onExport} className={ICON_BTN}><Icons.Download01 size={16} /></button>
          <Button variant="primary" onClick={() => { onCreateZone?.(); setCreating(true); }} className="shrink-0">
            <Icons.Plus size={16} className="mr-1.5" />Create New Zone
          </Button>
        </div>

        <div className="px-4 pb-2 text-body-xs text-muted-foreground">Showing {rows.length} items</div>

        <div className="min-h-0 flex-1 overflow-auto">
          <table className="w-full border-collapse">
            <thead className="sticky top-0 z-[1] bg-card">
              <tr className="border-y border-border text-caption font-bold uppercase tracking-wide text-muted-foreground">
                <th className="w-9 px-2 py-2" />
                <th className="px-2 py-2 text-left">{L.zone}</th>
                {showCol('tags') && <th className="px-2 py-2 text-left">{L.tags}</th>}
                {showCol('location') && <th className="px-2 py-2 text-left">{L.location}</th>}
                {showCol('description') && <th className="px-2 py-2 text-left">{L.description}</th>}
                <th className="w-9 px-2 py-2 text-right">
                  <ColumnConfig
                    columns={[
                      { id: 'zone', label: L.zone, locked: true },
                      { id: 'tags', label: L.tags },
                      { id: 'location', label: L.location },
                      { id: 'description', label: L.description },
                    ]}
                    hidden={hiddenCols}
                    onChange={setHiddenCols}
                    triggerClassName="ml-auto"
                  />
                </th>
              </tr>
            </thead>
            <tbody>
              {rows.map(({ node, depth }) => {
                const hasKids = !!node.children?.length;
                const isHidden = hidden.has(node.id);
                const isSelected = node.id === selectedId;
                // LAW: every row — hover state + cursor-pointer + full-row click
                // target (T-040 item a); the eye-toggle and expand chevron stop
                // propagation so they keep their own single-purpose click.
                return (
                  <tr
                    key={node.id}
                    onClick={() => selectZone(node)}
                    className={cn('cursor-pointer border-b border-border/70 transition-colors hover:bg-muted/30', isSelected && 'bg-primary/5')}
                  >
                    <td className="px-2 py-2">
                      <button
                        type="button"
                        aria-label={isHidden ? 'Show on map' : 'Hide on map'}
                        aria-pressed={!isHidden}
                        onClick={(e) => { e.stopPropagation(); toggleVisible(node.id); }}
                        className={cn('grid size-7 place-items-center rounded-md transition-colors', isHidden ? 'border border-border text-muted-foreground hover:bg-muted' : 'text-primary hover:bg-muted')}
                      >
                        {isHidden ? <Icons.EyeOff size={15} /> : <Icons.Eye size={15} />}
                      </button>
                    </td>
                    <td className="px-2 py-2">
                      <span className="flex items-center gap-1.5" style={{ paddingLeft: !q && !tagFilter.size ? depth * 18 : 0 }}>
                        {!q && !tagFilter.size && hasKids ? (
                          <button type="button" aria-label="Expand" onClick={(e) => { e.stopPropagation(); toggleExpand(node.id); }} className="text-muted-foreground hover:text-foreground">
                            {expanded.has(node.id) ? <Icons.ChevronDown size={15} /> : <Icons.ChevronRight size={15} />}
                          </button>
                        ) : <span className="w-[15px]" />}
                        <span className="inline-block size-2.5 shrink-0 rounded-full" style={{ background: node.color }} />
                        <span className={cn('text-body-sm font-medium', isSelected ? 'text-primary' : 'text-foreground')}>{node.name}</span>
                      </span>
                    </td>
                    {showCol('tags') && (
                      <td className="px-2 py-2">
                        <span className="flex flex-wrap items-center gap-1">
                          {(node.tags ?? []).slice(0, 2).map((t) => <span key={t} className="rounded bg-[color-mix(in_srgb,var(--status-success)_14%,transparent)] px-1.5 py-0.5 text-caption font-semibold text-[color:var(--status-success)]">{t}</span>)}
                          {(node.tags?.length ?? 0) > 2 && <span className="rounded bg-muted px-1.5 py-0.5 text-caption font-semibold text-muted-foreground">+{node.tags!.length - 2}</span>}
                        </span>
                      </td>
                    )}
                    {showCol('location') && <td className="px-2 py-2 text-body-sm text-muted-foreground">{node.location ?? '—'}</td>}
                    {showCol('description') && <td className="px-2 py-2 text-body-sm text-muted-foreground">{node.description ?? '—'}</td>}
                    <td className="w-9" />
                  </tr>
                );
              })}
              {!rows.length && <tr><td colSpan={6} className="py-10 text-center text-body-sm text-muted-foreground">No zones match your search.</td></tr>}
            </tbody>
          </table>
        </div>
      </div>

      {/* right: map — actions live in the list toolbar row above, not floated here. */}
      <div className="relative min-h-0 flex-1">
        <MapView ref={mapRef} center={center} zoom={zoom} zones={mapZones} fitToContent className="h-full w-full" />
      </div>
    </div>
  );
}
