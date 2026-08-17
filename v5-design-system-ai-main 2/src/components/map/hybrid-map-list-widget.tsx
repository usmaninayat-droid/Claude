import * as React from 'react';
import { AlertOctagon, AlertTriangle, Info } from 'lucide-react';
import { cn } from '../utils/cn';
import { MapView } from './map-view';
import type { MapViewHandle, LatLng, MapMarker, MarkerStatus } from './types';
import { WidgetShell } from './map-widgets';
import { usePrefersReducedMotion } from './map-live-widget';

/**
 * HybridMapListWidget — the two-pane events widget (`type: "hybrid-map-list"`
 * in `DashboardModuleConfig.schema.json`).
 *
 * Spec: `hybrid-map-list-widget.spec.md`.
 *
 * The dashboard-embedded cousin of the Live Monitoring hybrid pattern
 * (spec 10): an event LIST on the left and a MAP plotting the same events on
 * the right, with **bi-directional selection sync** — clicking a row flies to
 * and highlights its pin; clicking a pin selects and scrolls to its row.
 * Shared **filter chips** scope both panes at once. Stacks vertically on
 * narrow viewports. Composes the existing CriticalEventsList row anatomy +
 * MapView; token-only styling.
 */

export type HybridEventSeverity = 'info' | 'warning' | 'critical';

export interface HybridMapListEvent {
  id: string;
  /** Chip/filter key (e.g. "overspeed", "harsh", "fuel-theft"). */
  type: string;
  severity?: HybridEventSeverity;
  title: React.ReactNode;
  /** Secondary line — driver · vehicle · address. */
  description?: React.ReactNode;
  timestamp?: React.ReactNode;
  position: LatLng;
}

export interface HybridChip {
  id: string;
  label: React.ReactNode;
}

export interface HybridMapListWidgetProps {
  title?: React.ReactNode;
  icon?: React.ReactNode;
  events: HybridMapListEvent[];
  /** Filter chips. Defaults to the distinct `event.type`s (prettified). */
  chips?: HybridChip[];
  /** Controlled active chip ids. Empty/omitted = all types shown. */
  activeChips?: string[];
  onChipsChange?: (active: string[]) => void;
  /** Controlled selection. */
  selectedId?: string | null;
  onSelect?: (id: string | null) => void;
  /** Map camera. Defaults to fitting the plotted events. */
  center?: LatLng;
  zoom?: number;
  /** Body height. Default 420. */
  height?: number;
  emptyState?: React.ReactNode;
  className?: string;
}

const SEVERITY_META: Record<HybridEventSeverity, { Icon: typeof Info; color: string; marker: MarkerStatus }> = {
  info:     { Icon: Info,          color: 'var(--status-info)',    marker: 'default' },
  warning:  { Icon: AlertTriangle, color: 'var(--status-warning)', marker: 'warning' },
  critical: { Icon: AlertOctagon,  color: 'var(--status-error)',   marker: 'critical' },
};

const prettify = (id: string) =>
  id.replace(/[-_]/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());

export function HybridMapListWidget({
  title = 'Critical Events',
  icon,
  events,
  chips,
  activeChips,
  onChipsChange,
  selectedId,
  onSelect,
  center,
  zoom = 10,
  height = 420,
  emptyState,
  className,
}: HybridMapListWidgetProps) {
  const mapRef = React.useRef<MapViewHandle>(null);
  const rowRefs = React.useRef<Record<string, HTMLButtonElement | null>>({});
  const reducedMotion = usePrefersReducedMotion();

  /* chips — controlled or internal; empty selection = show all */
  const chipDefs = React.useMemo<HybridChip[]>(() => {
    if (chips?.length) return chips;
    return [...new Set(events.map((e) => e.type))].map((t) => ({ id: t, label: prettify(t) }));
  }, [chips, events]);
  const [internalChips, setInternalChips] = React.useState<string[]>([]);
  const active = activeChips ?? internalChips;
  const setActive = (next: string[]) => {
    if (activeChips === undefined) setInternalChips(next);
    onChipsChange?.(next);
  };
  const toggleChip = (id: string) =>
    setActive(active.includes(id) ? active.filter((c) => c !== id) : [...active, id]);

  /* selection — controlled or internal */
  const [internalSel, setInternalSel] = React.useState<string | null>(null);
  const selected = selectedId !== undefined ? selectedId : internalSel;
  const select = (id: string | null, source: 'list' | 'map') => {
    if (selectedId === undefined) setInternalSel(id);
    onSelect?.(id);
    if (!id) return;
    const ev = events.find((e) => e.id === id);
    if (!ev) return;
    if (source === 'list') mapRef.current?.flyTo(ev.position, 13);
    if (source === 'map') {
      rowRefs.current[id]?.scrollIntoView({ block: 'nearest', behavior: reducedMotion ? 'auto' : 'smooth' });
      rowRefs.current[id]?.focus({ preventScroll: true });
    }
  };

  const visible = React.useMemo(
    () => (active.length ? events.filter((e) => active.includes(e.type)) : events),
    [events, active],
  );

  const fallbackCenter = React.useMemo<LatLng>(() => {
    if (center) return center;
    if (!visible.length) return [25.2048, 55.2708];
    return [
      visible.reduce((s, e) => s + e.position[0], 0) / visible.length,
      visible.reduce((s, e) => s + e.position[1], 0) / visible.length,
    ];
  }, [center, visible]);

  const markers = React.useMemo<MapMarker[]>(
    () => visible.map((e) => {
      const meta = SEVERITY_META[e.severity ?? 'info'];
      return {
        id: e.id,
        position: e.position,
        kind: 'dot' as const,
        status: meta.marker,
        selected: e.id === selected,
        tooltip: typeof e.title === 'string' ? e.title : undefined,
      };
    }),
    [visible, selected],
  );

  return (
    <WidgetShell title={title} icon={icon} className={className}>
      {/* Filter chips — shared scope for both panes */}
      {chipDefs.length ? (
        <div className="flex flex-wrap items-center gap-1.5 border-b border-border px-4 py-2.5" role="group" aria-label="Filter events by type">
          {chipDefs.map((c) => {
            const on = !active.length || active.includes(c.id);
            const explicit = active.includes(c.id);
            return (
              <button
                key={c.id}
                type="button"
                aria-pressed={explicit}
                onClick={() => toggleChip(c.id)}
                className={cn(
                  'rounded-full border px-2.5 py-1 text-caption font-semibold transition-colors outline-none focus-visible:ring-2 focus-visible:ring-ring',
                  explicit
                    ? 'border-primary bg-primary text-primary-foreground'
                    : on
                      ? 'border-border bg-card text-foreground hover:bg-muted'
                      : 'border-border bg-muted text-muted-foreground',
                )}
              >
                {c.label}
              </button>
            );
          })}
          {active.length ? (
            <button
              type="button"
              onClick={() => setActive([])}
              className="ml-1 text-caption font-medium text-muted-foreground underline-offset-2 hover:text-foreground hover:underline"
            >
              Clear
            </button>
          ) : null}
        </div>
      ) : null}

      {/* Two panes — list ⇄ map; stacks on narrow viewports */}
      <div className="flex flex-col md:flex-row" style={{ height }}>
        <div className="min-h-0 w-full shrink-0 overflow-y-auto border-b border-border md:h-full md:w-[340px] md:border-b-0 md:border-r" role="list" aria-label="Event list">
          {visible.length === 0 ? (
            <div className="flex h-full items-center justify-center p-6 text-center text-body-sm text-muted-foreground">
              {emptyState ?? 'No events for this filter.'}
            </div>
          ) : (
            visible.map((e) => {
              const meta = SEVERITY_META[e.severity ?? 'info'];
              const Icon = meta.Icon;
              const isSel = e.id === selected;
              return (
                <button
                  key={e.id}
                  ref={(el) => { rowRefs.current[e.id] = el; }}
                  type="button"
                  role="listitem"
                  aria-current={isSel || undefined}
                  onClick={() => select(isSel ? null : e.id, 'list')}
                  className={cn(
                    'relative flex w-full items-start gap-3 border-b border-border px-4 py-3 text-left transition-colors outline-none last:border-b-0 hover:bg-muted/40 focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring',
                    isSel && 'bg-secondary/60',
                  )}
                >
                  {isSel ? <span aria-hidden className="absolute inset-y-0 left-0 w-0.5 bg-primary" /> : null}
                  <Icon className="mt-0.5 size-4 shrink-0" style={{ color: meta.color }} />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="truncate text-body-sm font-medium text-foreground">{e.title}</span>
                      {e.severity === 'critical' ? (
                        <span className="shrink-0 rounded bg-destructive px-1.5 py-0.5 text-caption font-bold uppercase tracking-wide text-destructive-foreground">
                          Critical
                        </span>
                      ) : null}
                    </div>
                    {e.description ? (
                      <div className="mt-0.5 truncate text-caption text-muted-foreground">{e.description}</div>
                    ) : null}
                  </div>
                  {e.timestamp ? (
                    <span className="shrink-0 text-caption tabular-nums text-muted-foreground">{e.timestamp}</span>
                  ) : null}
                </button>
              );
            })
          )}
        </div>
        <div className="relative min-h-[240px] min-w-0 flex-1">
          <MapView
            ref={mapRef}
            center={fallbackCenter}
            zoom={zoom}
            markers={markers}
            fitToContent={!center}
            onMarkerClick={(id) => select(id, 'map')}
            controls={false}
            className="absolute inset-0"
          />
        </div>
      </div>
    </WidgetShell>
  );
}
