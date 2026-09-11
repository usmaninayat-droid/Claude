import * as React from 'react';
import * as Icons from '../../icons';
import { cn } from '../utils/cn';
import { Button, Input, Popover, PopoverTrigger, PopoverContent } from '../primitives';
import { MapView } from '../map';
import type { LatLng } from '../map';
import { poiPinDataUri, POI_PIN_COLORS } from './poi-pin';

/**
 * PoiCreate — the POIs "Create a new POI" mode (Flood Management, Figma
 * 233-181312): a full-bleed map with a compact FLOATING form card over the
 * top-left — NOT a side-sheet. Click the map to drop the pin; the card shows
 * the selected location + latitude/longitude, a name (with a type swatch),
 * tags, and a "Define Radius" slider that draws a live coverage circle on the
 * map. Config-driven; brand FAMS.
 */

export interface NewPoi {
  name: string;
  type: string;
  tags: string[];
  description?: string;
  position: LatLng;
  /** Coverage radius in metres (the "Define Radius" slider). */
  radiusM?: number;
  /** Pin color picked in the swatch next to Name (Figma 233-181312) —
   *  renders the canonical POI pin (233-181658) in this color. */
  color?: string;
}
export interface PoiCreateProps {
  /** Pin artwork, keyed by type slug (same map the consumer passes to `PoisView`). */
  icons: Record<string, string>;
  tagOptions?: string[];
  center?: LatLng;
  zoom?: number;
  onCancel: () => void;
  onCreate: (poi: NewPoi) => void;
}

const DEFAULT_TAGS = ['Client Site', 'Staff Transport', 'Welfare', 'Office', 'Accommodation'];

/** ~48-point circle polygon (metres → lat/lng offsets) for the radius ring. */
export function circlePolygon(center: LatLng, radiusM: number, steps = 48): LatLng[] {
  const [lat, lng] = center;
  const dLat = radiusM / 111320;
  const dLng = radiusM / (111320 * Math.cos((lat * Math.PI) / 180));
  return Array.from({ length: steps }, (_, i) => {
    const a = (i / steps) * 2 * Math.PI;
    return [lat + dLat * Math.sin(a), lng + dLng * Math.cos(a)] as LatLng;
  });
}

/** Mock "reverse-geocoded" address line for a dropped pin (no geocoder here). */
function addressFor(p: LatLng): string {
  return `Dropped pin · ${p[0].toFixed(4)}, ${p[1].toFixed(4)} — Qatar`;
}

const RADIUS_TEAL = '#15B79E'; // coherence-allow — coverage-circle accent (== --chart-accent-teal)

export function PoiCreate({
  icons, tagOptions = DEFAULT_TAGS, center = [25.18, 55.28], zoom = 11, onCancel, onCreate,
}: PoiCreateProps) {
  const typeOptions = React.useMemo(() => Object.keys(icons).filter((k) => k !== 'default'), [icons]);
  const [point, setPoint] = React.useState<LatLng | null>(null);
  const [name, setName] = React.useState('');
  const [type, setType] = React.useState<string>(typeOptions[0] ?? 'default');
  const [tags, setTags] = React.useState<string[]>([]);
  const [radiusM, setRadiusM] = React.useState(43);
  const [tagsOpen, setTagsOpen] = React.useState(false);
  const [colorOpen, setColorOpen] = React.useState(false);
  const [color, setColor] = React.useState<string>(POI_PIN_COLORS[0].color);

  const valid = !!(name.trim() && point);
  const previewMarkers = point ? [{ id: 'draft', position: point, iconUrl: poiPinDataUri(color), iconSize: [42, 60] as [number, number], iconAnchor: [20, 48] as [number, number] }] : [];
  const radiusZones = point && radiusM > 0 ? [{ id: 'radius', points: circlePolygon(point, radiusM), color: RADIUS_TEAL, fillOpacity: 0.18 }] : [];

  return (
    <div className="relative flex h-full min-h-0">
      {/* full-bleed map + single-click placement + live radius ring */}
      <MapView
        center={point ?? center}
        zoom={point ? 15 : zoom}
        markers={previewMarkers}
        zones={radiusZones}
        draw={{ mode: point ? null : 'point', onComplete: (pts) => setPoint(pts[0]) }}
        className="h-full w-full"
      />

      {/* floating "Create a new POI" card */}
      <div className="absolute left-4 top-4 z-[400] w-[380px] max-w-[calc(100%-2rem)] rounded-xl border border-border bg-card p-5 shadow-[0_12px_32px_0_rgba(16,24,40,0.16)]">
        <div className="mb-4 flex items-center justify-between gap-2">
          <h2 className="text-h6 font-semibold text-foreground">Create a new POI</h2>
          <button type="button" aria-label="Close" onClick={onCancel} className="grid size-6 place-items-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground">
            <Icons.XClose size={18} />
          </button>
        </div>

        <div className="flex flex-col gap-3">
          {/* Selected Location */}
          <label className="flex flex-col gap-1">
            <span className="text-body-xs font-medium text-muted-foreground">Selected Location</span>
            <div className="flex items-center gap-2 rounded-lg border border-border bg-muted/30 px-3 py-2.5 text-body-sm">
              <Icons.MarkerPin01 size={16} className="shrink-0 text-muted-foreground" />
              <span className={cn('truncate', point ? 'text-foreground' : 'text-muted-foreground')}>
                {point ? addressFor(point) : 'Click the map to drop a pin'}
              </span>
            </div>
          </label>

          {/* Latitude / Longitude */}
          <div className="grid grid-cols-2 gap-2.5">
            <label className="flex flex-col gap-1">
              <span className="text-body-xs font-medium text-muted-foreground">Latitude</span>
              <Input readOnly value={point ? point[0].toFixed(7) : ''} placeholder="—" />
            </label>
            <label className="flex flex-col gap-1">
              <span className="text-body-xs font-medium text-muted-foreground">Longitude</span>
              <Input readOnly value={point ? point[1].toFixed(7) : ''} placeholder="—" />
            </label>
          </div>

          {/* Name + type swatch */}
          <div className="flex items-end gap-2.5">
            <label className="flex min-w-0 flex-1 flex-col gap-1">
              <span className="text-body-xs font-medium text-muted-foreground">Name <span className="text-[var(--status-error)]">*</span></span>
              <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Enter name" />
            </label>
            <Popover open={colorOpen} onOpenChange={setColorOpen}>
              <PopoverTrigger asChild>
                <button type="button" aria-label="POI pin color" aria-expanded={colorOpen} className="grid size-[42px] shrink-0 place-items-center rounded-lg border border-border bg-card transition-colors hover:bg-muted/40 focus-visible:ring-2 focus-visible:ring-ring">
                  <img src={poiPinDataUri(color)} alt="" className="h-[30px] w-[21px] object-contain" />
                </button>
              </PopoverTrigger>
              <PopoverContent align="end" className="w-56 p-2">
                <div className="mb-1.5 text-caption font-semibold text-foreground">Pin color</div>
                <div className="grid grid-cols-3 gap-1">
                  {POI_PIN_COLORS.map((c) => (
                    <button
                      key={c.id}
                      type="button"
                      aria-label={`${c.label} pin`}
                      aria-pressed={color === c.color}
                      onClick={() => { setColor(c.color); setColorOpen(false); }}
                      className={cn(
                        'flex flex-col items-center gap-1 rounded-md border px-1.5 py-1.5 transition-colors hover:bg-muted',
                        color === c.color ? 'border-primary bg-secondary' : 'border-transparent',
                      )}
                    >
                      <img src={poiPinDataUri(c.color)} alt="" className="h-[26px] w-[18px] object-contain" />
                      <span className="text-caption text-muted-foreground">{c.label}</span>
                    </button>
                  ))}
                </div>
              </PopoverContent>
            </Popover>
          </div>

          {/* Tags */}
          <Popover open={tagsOpen} onOpenChange={setTagsOpen}>
            <PopoverTrigger asChild>
              <button type="button" className="flex items-center gap-2 rounded-lg border border-border bg-card px-3 py-2.5 text-left text-body-sm outline-none transition-colors hover:bg-muted/40">
                <Icons.Tag01 size={16} className="shrink-0 text-muted-foreground" />
                <span className={cn('flex flex-1 flex-wrap gap-1', !tags.length && 'text-muted-foreground')}>
                  {tags.length ? tags.map((t) => <span key={t} className="rounded bg-primary/10 px-1.5 py-0.5 text-caption font-medium text-primary">{t}</span>) : 'Tags'}
                </span>
              </button>
            </PopoverTrigger>
            <PopoverContent align="start" className="w-[--radix-popover-trigger-width] p-1">
              {tagOptions.map((t) => {
                const on = tags.includes(t);
                return (
                  <button key={t} type="button" onClick={() => setTags((cur) => (on ? cur.filter((x) => x !== t) : [...cur, t]))} className="flex w-full items-center gap-2 rounded-md px-2.5 py-2 text-left text-body-sm text-foreground transition-colors hover:bg-muted">
                    <span className={cn('grid size-4 place-items-center rounded border', on ? 'border-primary bg-primary text-white' : 'border-border')}>{on && <Icons.Check size={11} />}</span>{t}
                  </button>
                );
              })}
            </PopoverContent>
          </Popover>

          {/* Define Radius */}
          <div className="flex flex-col gap-2">
            <span className="text-body-xs font-medium text-muted-foreground">Define Radius</span>
            <div className="flex items-center gap-3">
              <input
                type="range"
                min={0}
                max={100}
                value={radiusM}
                onChange={(e) => setRadiusM(Number(e.target.value))}
                aria-label="Radius in metres"
                className="h-1.5 flex-1 cursor-pointer appearance-none rounded-full bg-muted accent-[var(--primary)]"
              />
              <div className="flex shrink-0 items-center gap-1 rounded-lg border border-border px-2 py-1.5">
                <span className="text-caption text-muted-foreground">Within</span>
                <input
                  type="number"
                  min={0}
                  max={100}
                  value={radiusM}
                  onChange={(e) => setRadiusM(Math.max(0, Math.min(100, Number(e.target.value))))}
                  aria-label="Radius metres"
                  className="w-9 bg-transparent text-right text-body-sm font-medium text-foreground outline-none [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none"
                />
                <span className="text-caption text-muted-foreground">m</span>
              </div>
            </div>
            <span className="text-body-xs text-muted-foreground">Within {radiusM} meters</span>
          </div>

          <div className="mt-1 flex items-center gap-3">
            <Button variant="secondary" onClick={onCancel} className="flex-1 justify-center">Cancel</Button>
            <Button
              variant="primary"
              disabled={!valid}
              onClick={() => onCreate({ name: name.trim(), type, tags, position: point!, radiusM, color })}
              className="flex-1 justify-center"
            >
              Create POI
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
