import * as React from 'react';
import { cn } from '../utils/cn';
import { LeafletMap, type LatLng, type MapMarker, type MapZone, type HeatPoint } from './leaflet-map';

/**
 * Map-based dashboard widgets (Figma DS V2 dashboard set):
 *  - EventsHeatmap       — density heat of events + a type legend (5235:8672)
 *  - ZoneComplianceMap   — heat map + a left compliance table (5235:8632)
 *  - ServiceLocationsMap — location pins + zone polygons + legend (5235:9077)
 *
 * Thin compositions over the extended LeafletMap (heat / zones / markers) with a
 * titled card shell. Token-styled chrome; map colours come through the map props.
 */

export interface MapLegendItem {
  label: React.ReactNode;
  color: string;
}

export function WidgetShell({
  title, icon, legend, children, className,
}: {
  title?: React.ReactNode;
  icon?: React.ReactNode;
  legend?: MapLegendItem[];
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn('flex flex-col overflow-hidden rounded-xl border border-border bg-card', className)}>
      {(title || icon) && (
        <div className="flex items-center gap-2 border-b border-border px-4 py-3">
          {icon ? <span className="flex size-4 items-center justify-center text-primary">{icon}</span> : null}
          <h3 className="text-body-md font-bold text-foreground">{title}</h3>
          {legend?.length ? (
            <div className="ml-auto flex flex-wrap items-center gap-3">
              {legend.map((l, i) => (
                <span key={i} className="inline-flex items-center gap-1.5 text-caption text-muted-foreground">
                  <span className="size-2.5 rounded-full" style={{ background: l.color }} />
                  {l.label}
                </span>
              ))}
            </div>
          ) : null}
        </div>
      )}
      {children}
    </div>
  );
}

/* ── Events heatmap ─────────────────────────────────────────────────────── */
export interface EventsHeatmapProps {
  title?: React.ReactNode;
  icon?: React.ReactNode;
  center: LatLng;
  zoom?: number;
  heat: HeatPoint[];
  legend?: MapLegendItem[];
  height?: number;
  className?: string;
}

export function EventsHeatmap({ title = 'Events Map', icon, center, zoom, heat, legend, height = 300, className }: EventsHeatmapProps) {
  return (
    <WidgetShell title={title} icon={icon} legend={legend} className={className}>
      <div className="relative" style={{ height }}>
        <LeafletMap center={center} zoom={zoom} heat={heat} className="absolute inset-0" />
      </div>
    </WidgetShell>
  );
}

/* ── Zone compliance (table + heat) ─────────────────────────────────────── */
export interface ZoneComplianceRow {
  name: React.ReactNode;
  parent?: React.ReactNode;
  /** Compliance/complaints value shown as a pill (e.g. a percentage). */
  value: React.ReactNode;
}

export interface ZoneComplianceMapProps {
  title?: React.ReactNode;
  icon?: React.ReactNode;
  center: LatLng;
  zoom?: number;
  heat: HeatPoint[];
  rows: ZoneComplianceRow[];
  valueHeader?: React.ReactNode;
  height?: number;
  className?: string;
}

export function ZoneComplianceMap({
  title = 'Zone Compliance Map', icon, center, zoom, heat, rows, valueHeader = 'Complaints', height = 320, className,
}: ZoneComplianceMapProps) {
  return (
    <WidgetShell title={title} icon={icon} className={className}>
      <div className="flex flex-col md:flex-row" style={{ height }}>
        <div className="w-full shrink-0 overflow-auto border-b border-border md:w-64 md:border-b-0 md:border-r">
          <table className="w-full text-left text-body-sm">
            <thead className="sticky top-0 bg-muted text-caption uppercase tracking-wide text-muted-foreground">
              <tr>
                <th className="px-3 py-2 font-semibold">Name</th>
                <th className="px-3 py-2 font-semibold">Parent</th>
                <th className="px-3 py-2 text-right font-semibold">{valueHeader}</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r, i) => (
                <tr key={i} className="border-t border-border">
                  <td className="px-3 py-2 font-medium text-foreground">{r.name}</td>
                  <td className="px-3 py-2 text-muted-foreground">{r.parent}</td>
                  <td className="px-3 py-2 text-right">
                    <span className="inline-flex min-w-7 items-center justify-center rounded-full bg-secondary px-1.5 py-0.5 text-caption font-semibold text-secondary-foreground">
                      {r.value}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="relative min-h-0 flex-1">
          <LeafletMap center={center} zoom={zoom} heat={heat} className="absolute inset-0" />
        </div>
      </div>
    </WidgetShell>
  );
}

/* ── Service locations (pins + zones) ───────────────────────────────────── */
export interface ServiceLocationsMapProps {
  title?: React.ReactNode;
  icon?: React.ReactNode;
  center: LatLng;
  zoom?: number;
  markers?: MapMarker[];
  zones?: MapZone[];
  legend?: MapLegendItem[];
  height?: number;
  className?: string;
}

export function ServiceLocationsMap({
  title = 'Service Locations', icon, center, zoom, markers, zones, legend, height = 320, className,
}: ServiceLocationsMapProps) {
  return (
    <WidgetShell title={title} icon={icon} legend={legend} className={className}>
      <div className="relative" style={{ height }}>
        <LeafletMap center={center} zoom={zoom} markers={markers} zones={zones} className="absolute inset-0" />
      </div>
    </WidgetShell>
  );
}
