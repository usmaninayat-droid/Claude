import * as React from 'react';
import { Maximize2, Plus, Minus, Layers } from 'lucide-react';
import { cn } from '../utils/cn';

/**
 * MapWidget — interactive map container with overlays.
 *
 * Spec: `map-widget.spec.md`.
 *
 * Source of truth: Web Portal Asset Profile Overview tab + Fuel Monitoring
 * Dashboard + Tadweer Inspector Performance dashboard.
 *
 * This is a PRESENTATION wrapper — the actual map engine (Leaflet, Mapbox,
 * Google Maps) is plugged in via the `children` slot. The component owns
 * the chrome: zoom controls, layer toggle, fullscreen button, KPI overlays,
 * status badges, location callouts.
 *
 * Typical integration:
 *
 *   <MapWidget
 *     statusBadge={{ label: 'Stopped', variant: 'destructive' }}
 *     locationCallout={{ label: 'Current Location', value: 'MUSAFFAH, Abu Dhabi, UAE' }}
 *     onZoomIn={...} onZoomOut={...} onFullscreen={...} onLayers={...}
 *   >
 *     <LeafletMap center={[24.45, 54.4]} zoom={12}>
 *       <Marker position={[24.45, 54.4]} icon={…} />
 *     </LeafletMap>
 *   </MapWidget>
 */

export interface MapWidgetStatusBadge {
  label: React.ReactNode;
  /** Color variant. Defaults to neutral. */
  variant?: 'neutral' | 'destructive' | 'warning' | 'success' | 'info';
}

export interface MapWidgetLocationCallout {
  /** Small uppercase label (e.g. "Current Location"). */
  label?: React.ReactNode;
  /** Main value (e.g. "MUSAFFAH, Abu Dhabi, UAE"). */
  value: React.ReactNode;
  /** Click handler — typically opens map in fullscreen / Google Maps. */
  onClick?: () => void;
}

export interface MapWidgetProps {
  /** The map engine (Leaflet/Mapbox/Google Maps). */
  children: React.ReactNode;
  /** Optional status badge — overlays top-left of the map. */
  statusBadge?: MapWidgetStatusBadge;
  /** Optional location callout — overlays bottom-left of the map. */
  locationCallout?: MapWidgetLocationCallout;
  /** Show zoom in/out controls (bottom-right). Default true. */
  showZoomControls?: boolean;
  onZoomIn?: () => void;
  onZoomOut?: () => void;
  /** Show fullscreen toggle (bottom-right above zoom). Default true. */
  showFullscreen?: boolean;
  onFullscreen?: () => void;
  /** Show layers toggle (top-right). Default false. */
  showLayers?: boolean;
  onLayers?: () => void;
  /** Optional KPI overlays — top-right stack. */
  kpiOverlays?: React.ReactNode;
  /** Map height. Default 240px. */
  height?: number | string;
  className?: string;
}

const BADGE_VARIANTS: Record<NonNullable<MapWidgetStatusBadge['variant']>, string> = {
  neutral:     'bg-card text-foreground border-border',
  destructive: 'bg-destructive text-destructive-foreground border-destructive',
  warning:     'bg-[var(--chart-accent-orange)] text-white border-[var(--chart-accent-orange)]',
  success:     'bg-[var(--chart-accent-green)]  text-white border-[var(--chart-accent-green)]',
  info:        'bg-primary text-primary-foreground border-primary',
};

export function MapWidget({
  children,
  statusBadge, locationCallout,
  showZoomControls = true, onZoomIn, onZoomOut,
  showFullscreen = true, onFullscreen,
  showLayers, onLayers,
  kpiOverlays,
  height = 240,
  className,
}: MapWidgetProps) {
  return (
    <div
      className={cn(
        'relative overflow-hidden rounded-lg border border-border bg-muted',
        className,
      )}
      style={{ height: typeof height === 'number' ? `${height}px` : height }}
    >
      {/* Map engine fills the container */}
      <div className="absolute inset-0">{children}</div>

      {/* Status badge — top-left */}
      {statusBadge ? (
        <div className="absolute left-3 top-3 z-10">
          <span
            className={cn(
              'inline-flex items-center rounded px-2 py-1 text-[10px] font-semibold uppercase tracking-wide border',
              BADGE_VARIANTS[statusBadge.variant ?? 'neutral'],
            )}
          >
            {statusBadge.label}
          </span>
        </div>
      ) : null}

      {/* KPI overlays — top-right */}
      {kpiOverlays ? (
        <div className="absolute right-3 top-3 z-10 flex flex-col gap-2">
          {kpiOverlays}
        </div>
      ) : null}

      {/* Layers toggle — top-right (above KPI overlays if both) */}
      {showLayers ? (
        <button
          type="button"
          onClick={onLayers}
          aria-label="Toggle map layers"
          className="absolute right-3 top-3 z-20 flex size-8 items-center justify-center rounded-md border border-border bg-card text-foreground shadow-sm transition-colors hover:bg-muted"
        >
          <Layers size={16} />
        </button>
      ) : null}

      {/* Location callout — bottom-left */}
      {locationCallout ? (
        <button
          type="button"
          onClick={locationCallout.onClick}
          className={cn(
            'absolute bottom-3 left-3 z-10 max-w-[280px] rounded-md border border-border bg-card px-3 py-2 text-left shadow-sm',
            locationCallout.onClick && 'cursor-pointer transition-colors hover:bg-muted/40',
          )}
        >
          {locationCallout.label ? (
            <div className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
              {locationCallout.label}
            </div>
          ) : null}
          <div className="text-sm font-medium text-foreground">
            {locationCallout.value}
            {locationCallout.onClick ? (
              <span className="ml-1 text-primary">↗</span>
            ) : null}
          </div>
        </button>
      ) : null}

      {/* Zoom + fullscreen controls — bottom-right */}
      {showZoomControls || showFullscreen ? (
        <div className="absolute bottom-3 right-3 z-10 flex flex-col gap-1.5">
          {showFullscreen ? (
            <button
              type="button"
              onClick={onFullscreen}
              aria-label="Fullscreen map"
              className="flex size-8 items-center justify-center rounded-md border border-border bg-card text-foreground shadow-sm transition-colors hover:bg-muted"
            >
              <Maximize2 size={14} />
            </button>
          ) : null}
          {showZoomControls ? (
            <div className="flex flex-col overflow-hidden rounded-md border border-border bg-card shadow-sm">
              <button
                type="button"
                onClick={onZoomIn}
                aria-label="Zoom in"
                className="flex size-8 items-center justify-center text-foreground transition-colors hover:bg-muted"
              >
                <Plus size={14} />
              </button>
              <div className="h-px bg-border" />
              <button
                type="button"
                onClick={onZoomOut}
                aria-label="Zoom out"
                className="flex size-8 items-center justify-center text-foreground transition-colors hover:bg-muted"
              >
                <Minus size={14} />
              </button>
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
