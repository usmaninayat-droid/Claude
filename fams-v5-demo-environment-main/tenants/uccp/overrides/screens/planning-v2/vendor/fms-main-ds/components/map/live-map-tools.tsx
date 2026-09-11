import * as React from 'react';
import * as Icons from '../../icons';
import { cn } from '../utils/cn';
import { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider } from '../primitives';
import { LIVE_BASEMAP_THUMBNAILS } from './basemap-thumbnails';

/**
 * Live Monitoring's floating map chrome, vendored from the FAMS design
 * system (`@fams/ui-kit` MapIconButton / MapLayersSwitcher +
 * `@fams/v5-templates` LiveMapTools, Figma 19:23006):
 *
 *   · `MapToolButton`   — the 40×40 white tile on a real 44×44 hit target,
 *                          Figma `Shadow/Map`, primary fill when active.
 *   · `BasemapSwitcher` — the hover-row basemap style switcher: the collapsed
 *                          tile shows the active style's thumbnail under the
 *                          white Layers glyph; hovering/focusing fans out one
 *                          card per style (selected = primary border).
 *   · `LIVE_BASEMAP_STYLES` — the reference's six styles (Grayscale · OSM ·
 *                          Roadmap · Satellite · Terrain · Hybrid) with real,
 *                          free tile styles behind each (Carto GL / OpenFreeMap
 *                          vector styles, Esri World Imagery raster).
 *
 * Icons are the design system's own glyphs (`layers-three-02`,
 * `traffic-lights`, `marker-pin-06`, `zones`, `cloud-raining-06`,
 * `alert-octagon`) from the vendored icon set.
 */

/* Figma `Shadow/Map` — 6px 10px 12px rgba(0,0,0,0.05). */
const TILE_BASE = cn(
  'relative grid size-11 -m-0.5 shrink-0 place-items-center outline-none',
  'before:absolute before:inset-0.5 before:rounded-md before:transition-colors before:content-[""]',
  'before:shadow-[6px_10px_12px_0_rgba(0,0,0,0.05)]',
  'focus-visible:before:ring-2 focus-visible:before:ring-ring',
  '[&_svg]:relative [&_svg]:size-5',
);

export interface MapToolButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  /** Accessible label — the button is icon-only. */
  label: string;
  /** Figma ACTIVE treatment: primary tile, white glyph. */
  active?: boolean;
  /** Toggle semantics — omit for plain action buttons. */
  pressed?: boolean;
  /** Basemap thumbnail painted behind the glyph (layers tile). */
  preview?: React.ReactNode;
}

/** A single 40×40 white map control tile (≥44×44 hit area). */
export const MapToolButton = React.forwardRef<HTMLButtonElement, MapToolButtonProps>(function MapToolButton(
  { label, active = false, pressed, preview, className, children, ...props }, ref,
) {
  return (
    <button
      ref={ref}
      type="button"
      aria-label={label}
      aria-pressed={pressed}
      title={label}
      data-slot="map-icon-button"
      className={cn(
        TILE_BASE,
        preview ? 'before:bg-card text-white' : active ? 'before:bg-primary text-primary-foreground hover:before:bg-primary/90' : 'before:bg-card text-gray-700 hover:before:bg-muted',
        className,
      )}
      {...props}
    >
      {preview ? (
        <span aria-hidden="true" className="absolute inset-1 overflow-hidden rounded-sm">
          {preview}
          <span className="absolute inset-0 bg-gray-900/50" />
        </span>
      ) : null}
      <span className="relative grid place-items-center [&_svg]:size-5">{children}</span>
    </button>
  );
});

/* ── basemap styles ─────────────────────────────────────────────────────── */

export interface BasemapStyle {
  id: string;
  label: string;
  /** MapLibre style — a URL or an inline style object (raster imagery). */
  style: string | Record<string, unknown>;
  /** 88×88 capture of the real rendered style (from the design system). */
  thumbnail?: string;
}

const CARTO_GLYPHS = 'https://tiles.basemaps.cartocdn.com/fonts/{fontstack}/{range}.pbf';
const ESRI_IMAGERY = 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}';
const ESRI_REFERENCE = 'https://server.arcgisonline.com/ArcGIS/rest/services/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}';

const rasterStyle = (layers: { id: string; tiles: string; attribution?: string }[]): Record<string, unknown> => ({
  version: 8,
  glyphs: CARTO_GLYPHS,
  sources: Object.fromEntries(layers.map((l) => [l.id, { type: 'raster', tiles: [l.tiles], tileSize: 256, maxzoom: 19, attribution: l.attribution }])),
  layers: layers.map((l) => ({ id: l.id, type: 'raster', source: l.id })),
});

/** Live Monitoring's six basemaps, in the designer's fixed order. */
export const LIVE_BASEMAP_STYLES: BasemapStyle[] = [
  { id: 'grayscale', label: 'Grayscale', style: 'https://basemaps.cartocdn.com/gl/positron-gl-style/style.json', thumbnail: LIVE_BASEMAP_THUMBNAILS.grayscale },
  { id: 'osm', label: 'OSM', style: 'https://tiles.openfreemap.org/styles/liberty', thumbnail: LIVE_BASEMAP_THUMBNAILS.osm },
  { id: 'roadmap', label: 'Roadmap', style: 'https://basemaps.cartocdn.com/gl/voyager-gl-style/style.json', thumbnail: LIVE_BASEMAP_THUMBNAILS.roadmap },
  { id: 'satellite', label: 'Satellite', style: rasterStyle([{ id: 'sat', tiles: ESRI_IMAGERY, attribution: 'Esri, Maxar, Earthstar Geographics' }]), thumbnail: LIVE_BASEMAP_THUMBNAILS.satellite },
  { id: 'terrain', label: 'Terrain', style: 'https://tiles.openfreemap.org/styles/bright', thumbnail: LIVE_BASEMAP_THUMBNAILS.terrain },
  { id: 'hybrid', label: 'Hybrid', style: rasterStyle([{ id: 'sat', tiles: ESRI_IMAGERY, attribution: 'Esri, Maxar, Earthstar Geographics' }, { id: 'ref', tiles: ESRI_REFERENCE }]), thumbnail: LIVE_BASEMAP_THUMBNAILS.hybrid },
];
export const LIVE_BASEMAP_DEFAULT_ID = LIVE_BASEMAP_STYLES[0].id;

function BasemapPreview({ style }: { style: BasemapStyle }) {
  return style.thumbnail
    ? <img src={style.thumbnail} alt="" aria-hidden draggable={false} decoding="async" className="block size-full object-cover" />
    : <span aria-hidden className="block size-full bg-gray-200" />;
}

export interface BasemapSwitcherProps {
  styles?: BasemapStyle[];
  activeStyleId?: string;
  onStyleChange?: (id: string) => void;
  label?: string;
  className?: string;
}

/** Hover-row basemap style switcher (map-layer-switcher spec). */
export function BasemapSwitcher({ styles = LIVE_BASEMAP_STYLES, activeStyleId, onStyleChange, label = 'Switch basemap style', className }: BasemapSwitcherProps) {
  const [open, setOpen] = React.useState(false);
  const dismissed = React.useRef(false);
  const active = styles.find((s) => s.id === activeStyleId) ?? styles[0];
  // other styles fan out start-ward; the selected one stays in the trigger slot
  const ordered = [...styles.filter((s) => s.id !== active.id), active];

  const expand = () => { if (!dismissed.current) setOpen(true); };
  const leave = () => { dismissed.current = false; setOpen(false); };
  React.useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') { dismissed.current = true; setOpen(false); } };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open]);

  return (
    <div className={cn('relative size-11 -m-0.5 shrink-0', className)} onMouseEnter={expand} onMouseLeave={leave} data-slot="map-layers-switcher">
      {!open && (
        <MapToolButton label={label} preview={<BasemapPreview style={active} />} onFocus={expand} aria-expanded={false}>
          <Icons.LayersThree02 />
        </MapToolButton>
      )}
      {open && (
        <TooltipProvider delayDuration={150}>
          <div role="listbox" aria-label={label} className="absolute z-20 flex items-stretch overflow-hidden rounded-lg" style={{ insetInlineEnd: 0, insetBlockStart: 0 }}>
            {ordered.map((s) => {
              const selected = s.id === active.id;
              return (
                <Tooltip key={s.id}>
                  <TooltipTrigger asChild>
                    <button
                      type="button"
                      role="option"
                      aria-selected={selected}
                      onClick={() => { onStyleChange?.(s.id); setOpen(false); }}
                      className={cn('relative -ms-1 grid size-11 shrink-0 place-items-center overflow-hidden rounded-lg outline-none first:ms-0 focus-visible:ring-2 focus-visible:ring-ring', selected ? 'border-2 border-primary' : 'border border-border')}
                    >
                      <span aria-hidden className="absolute inset-0 overflow-hidden rounded-md"><BasemapPreview style={s} /></span>
                      <span className="sr-only">{s.label}</span>
                    </button>
                  </TooltipTrigger>
                  <TooltipContent side="bottom">{s.label}</TooltipContent>
                </Tooltip>
              );
            })}
          </div>
        </TooltipProvider>
      )}
    </div>
  );
}

/* ── the top-end stack ──────────────────────────────────────────────────── */

export type LiveMapToolId = 'layers' | 'traffic' | 'weather' | 'incidents' | 'poi' | 'zones';

export interface LiveMapToolsProps {
  /** Which tiles render, in this order. */
  tools?: LiveMapToolId[];
  activeBasemapId?: string;
  onBasemapChange?: (id: string) => void;
  trafficActive?: boolean;
  onTrafficToggle?: () => void;
  weatherActive?: boolean;
  onWeatherToggle?: () => void;
  incidentsActive?: boolean;
  onIncidentsToggle?: () => void;
  poiOpen?: boolean;
  onPoiToggle?: () => void;
  zonesOpen?: boolean;
  onZonesToggle?: () => void;
  className?: string;
}

/** Live Monitoring's top-end control column: layers · traffic · weather · incidents · POI · zones. */
export function LiveMapTools({
  tools = ['layers', 'traffic', 'poi', 'zones', 'weather', 'incidents'],
  activeBasemapId, onBasemapChange,
  trafficActive = false, onTrafficToggle,
  weatherActive = false, onWeatherToggle,
  incidentsActive = false, onIncidentsToggle,
  poiOpen = false, onPoiToggle,
  zonesOpen = false, onZonesToggle,
  className,
}: LiveMapToolsProps) {
  return (
    <div data-slot="live-map-end-tools" className={cn('flex flex-col gap-3', className)}>
      {tools.map((t) => {
        switch (t) {
          case 'layers':
            return <BasemapSwitcher key={t} activeStyleId={activeBasemapId} onStyleChange={onBasemapChange} />;
          case 'traffic':
            return <MapToolButton key={t} label={trafficActive ? 'Hide traffic overlay' : 'Traffic overlay'} pressed={trafficActive} active={trafficActive} onClick={onTrafficToggle}><Icons.TrafficLights /></MapToolButton>;
          case 'weather':
            return <MapToolButton key={t} label={weatherActive ? 'Hide weather layer' : 'Weather layer'} pressed={weatherActive} active={weatherActive} onClick={onWeatherToggle}><Icons.CloudRaining06 /></MapToolButton>;
          case 'incidents':
            return <MapToolButton key={t} label={incidentsActive ? 'Hide incidents layer' : 'Incidents'} pressed={incidentsActive} active={incidentsActive} onClick={onIncidentsToggle}><Icons.AlertOctagon /></MapToolButton>;
          case 'poi':
            return <MapToolButton key={t} label="Points of interest" pressed={poiOpen} active={poiOpen} onClick={onPoiToggle}><Icons.MarkerPin06 /></MapToolButton>;
          case 'zones':
            return <MapToolButton key={t} label="Zones" pressed={zonesOpen} active={zonesOpen} onClick={onZonesToggle}><Icons.Zones /></MapToolButton>;
          default:
            return null;
        }
      })}
    </div>
  );
}
