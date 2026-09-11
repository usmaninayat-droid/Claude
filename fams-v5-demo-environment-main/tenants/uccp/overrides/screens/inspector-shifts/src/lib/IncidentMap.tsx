/**
 * Shared incident map — wraps the DS LeafletMap, plotting incidents as status-
 * coloured teardrop pins (via `pois`, which support an exact custom colour so the
 * legend matches). Centred on Doha, Qatar — the midpoint of the shared UCCP zone
 * catalogue (see data/catalog.ts ZONES, kept in sync with the Operations Center
 * zones dataset). Used by Home (full map) and detail mini-maps.
 */
import * as React from 'react';
import { LeafletMap } from '@ds/components/map';
import type { LeafletMapHandle } from '@ds/components/map';
import type { Incident, IncidentStatus, GeoPoint } from '../data/types';
import { INCIDENT_STATUS, INCIDENT_STATUS_ORDER } from '../data/status';

export const DOHA_CENTER: [number, number] = [25.2854, 51.5310];
export type { LeafletMapHandle };

interface IncidentMapProps {
  incidents: Incident[];
  center?: [number, number];
  zoom?: number;
  desaturated?: boolean;
  className?: string;
  /** render a single point (detail mini-map) */
  single?: GeoPoint;
  /** a searched location/zone pin, distinct from the incident markers */
  locationMarker?: [number, number] | null;
  /** override pin colour per incident (default: status colour) — e.g. colour by
   *  KPI category or contractor on the PO dashboards. */
  colorFor?: (i: Incident) => string;
  /** override pin tooltip per incident (default: id · status). */
  labelFor?: (i: Incident) => string;
}

export const IncidentMap = React.forwardRef<LeafletMapHandle, IncidentMapProps>(function IncidentMap({
  incidents, center = DOHA_CENTER, zoom = 11, desaturated = false, className = '',
  single, locationMarker, colorFor, labelFor,
}, ref) {
  const pois = React.useMemo(() => {
    if (single) return [{ id: 'pin', position: [single.lat, single.lng] as [number, number], color: 'var(--primary)' }];
    // Many incidents share a zone centroid in the seed, so raw pins stack into an
    // unreadable pile. Fan co-located pins out on a small deterministic spiral
    // (keyed by id) so every incident reads as its own upright teardrop.
    // Group incidents that fall in the same ~1km cell (same zone), then fan each
    // group out on an even ring so every pin stands alone instead of stacking.
    const cell = (i: Incident) => `${i.location.lat.toFixed(2)},${i.location.lng.toFixed(2)}`;
    const groups = new Map<string, Incident[]>();
    for (const i of incidents) {
      const arr = groups.get(cell(i));
      if (arr) arr.push(i); else groups.set(cell(i), [i]);
    }
    const indexOf = new Map<string, number>();
    for (const [, arr] of groups) arr.forEach((i, idx) => indexOf.set(i.id, idx));
    const markers = incidents.map((i) => {
      const group = groups.get(cell(i))!;
      const n = indexOf.get(i.id) ?? 0;
      // even ring so a cluster of K reads as K distinct pins around the centroid
      const ang = group.length > 1 ? (n / group.length) * Math.PI * 2 : 0;
      const rad = group.length > 1 ? 0.004 + (group.length > 6 ? 0.003 : 0) : 0;
      return {
        id: i.id,
        position: [i.location.lat + Math.sin(ang) * rad, i.location.lng + Math.cos(ang) * rad] as [number, number],
        color: colorFor ? colorFor(i) : INCIDENT_STATUS[i.status].color,
        label: labelFor ? labelFor(i) : `${i.id} · ${INCIDENT_STATUS[i.status].label}`,
      };
    });
    // Searched location/zone pin — a distinct violet marker above the incidents.
    if (locationMarker) {
      markers.push({ id: 'search-loc', position: locationMarker, color: '#7F56D9', label: 'Searched location' });
    }
    return markers;
  }, [incidents, single, locationMarker, colorFor, labelFor]);

  return (
    <div
      className={`isolate h-full w-full overflow-hidden ${className}`}
      style={desaturated ? { filter: 'grayscale(1)', opacity: 0.65, transition: 'filter .3s' } : { transition: 'filter .3s' }}
    >
      <LeafletMap
        ref={ref}
        center={single ? [single.lat, single.lng] : center}
        zoom={single ? 15 : zoom}
        pois={pois.map((p) => ({ id: p.id, position: p.position, color: p.color, label: (p as { label?: string }).label }))}
        className="h-full w-full"
      />
    </div>
  );
});

/** Status legend with live counts + filter checkboxes — used on Home beside the
 *  map. Each row's green checkbox toggles whether that status shows on the map. */
export function StatusLegend({
  counts, enabled, onToggle, disabled = false,
}: {
  counts: Record<IncidentStatus, number>;
  /** Set of currently-shown statuses. Omit for a read-only legend. */
  enabled?: Set<IncidentStatus>;
  onToggle?: (s: IncidentStatus) => void;
  /** Lock the filter checkboxes (e.g. inspector clocked out). */
  disabled?: boolean;
}) {
  const interactive = !!enabled && !!onToggle && !disabled;
  return (
    <div className="flex flex-col gap-2.5">
      {INCIDENT_STATUS_ORDER.map((s) => {
        const m = INCIDENT_STATUS[s];
        const on = enabled ? enabled.has(s) : true;
        const Row = interactive ? 'button' : 'div';
        return (
          <Row
            key={s}
            type={interactive ? 'button' : undefined}
            onClick={interactive ? () => onToggle!(s) : undefined}
            className={`flex items-center gap-2.5 text-left ${interactive ? 'cursor-pointer' : ''}`}
          >
            {interactive && (
              <span
                className={`flex size-5 shrink-0 items-center justify-center rounded-md border transition ${on ? 'border-transparent bg-[var(--status-success)] text-white' : 'border-border bg-card'}`}
              >
                {on && (
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6 9 17l-5-5" /></svg>
                )}
              </span>
            )}
            <span className={`inline-block size-2.5 shrink-0 rounded-full transition ${on ? '' : 'opacity-30'}`} style={{ background: m.color }} />
            <span className={`flex-1 text-body-sm font-semibold transition ${on ? 'text-foreground' : 'text-muted-foreground'}`}>{m.label}</span>
            <span className="text-body-sm font-semibold text-muted-foreground tabular-nums">{counts[s]}</span>
          </Row>
        );
      })}
    </div>
  );
}
