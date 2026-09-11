import * as React from 'react';
import { cn } from '../utils/cn';
import { Popover, PopoverTrigger, PopoverContent, Checkbox } from '../primitives';
import {
  LayersThree01, LayersThree02, Signal01, MarkerPin04, Hexagon02, Home01, Route, Ruler,
} from '../../icons';

/**
 * MapLayersControl — the top-right vertical stack of map controls from the
 * FAMS V5 Launch Pad standard (Figma W2z46FvC6aOdzOHDc3rqD5 · 495-32282):
 *
 *   ┌───┐  Layers   — popover with per-layer toggles (checkboxes)
 *   ├───┤  Traffic  — toggle live traffic overlay (optional)
 *   ├───┤  POI      — toggle POI pins (optional)
 *   ├───┤  Geofence — toggle geofence polygons (optional)
 *   └───┘
 *
 * Also supports optional Route / Measure / Recenter footer slots. Purely
 * config-driven; the CONSUMER wires each toggle's callback + count.
 */

export interface MapLayerToggle {
  id: string;
  label: React.ReactNode;
  icon?: React.ReactNode;
  count?: number;
  enabled: boolean;
  onToggle: () => void;
}

export interface MapLayersControlProps {
  /** Per-layer toggles listed inside the Layers popover (Assembly Points,
   *  Vehicles, Black Spots, Nearby Incidents, Nearby Inspectors, …). */
  layers: MapLayerToggle[];
  /** Toggle the standard secondary controls in the Figma stack. Passing an
   *  `enabled` state + `onToggle` renders the button; omit to hide it. */
  traffic?: { enabled: boolean; onToggle: () => void };
  poi?: { enabled: boolean; onToggle: () => void };
  geofence?: { enabled: boolean; onToggle: () => void };
  /** Optional footer buttons — omit any to hide. */
  onRoute?: () => void;
  onMeasure?: () => void;
  onRecenter?: () => void;
  className?: string;
}

interface CtrlButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  label: string;
  active?: boolean;
  badge?: number;
}
const CtrlButton = React.forwardRef<HTMLButtonElement, CtrlButtonProps>(function CtrlButton(
  { label, active, badge, children, className, ...rest }, ref,
) {
  return (
    <button
      ref={ref}
      type="button"
      aria-label={label}
      title={label}
      aria-pressed={active}
      className={cn(
        'relative grid size-9 place-items-center transition-colors',
        active ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:bg-muted hover:text-foreground',
        className,
      )}
      {...rest}
    >
      {children}
      {typeof badge === 'number' && badge > 0 && (
        <span className={cn(
          'absolute -right-1 -top-1 grid size-4 place-items-center rounded-full text-caption font-bold leading-none',
          active ? 'bg-primary-foreground text-primary' : 'bg-primary text-primary-foreground',
        )}>
          {badge}
        </span>
      )}
    </button>
  );
});

const Divider = () => <span className="h-px shrink-0 bg-border" aria-hidden />;

export function MapLayersControl({
  layers, traffic, poi, geofence, onRoute, onMeasure, onRecenter, className,
}: MapLayersControlProps) {
  const [open, setOpen] = React.useState(false);
  const layersOffCount = layers.filter((l) => !l.enabled).length;
  const allOff = layers.every((l) => !l.enabled);
  const setAll = (on: boolean) => { layers.forEach((l) => { if (l.enabled !== on) l.onToggle(); }); };

  return (
    <div className={cn('flex flex-col overflow-hidden rounded-lg border border-border bg-card shadow-sm', className)}>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <CtrlButton label="Map layers" active={open} badge={layersOffCount > 0 ? layersOffCount : undefined}>
            {open || layersOffCount > 0 ? <LayersThree02 size={16} /> : <LayersThree01 size={16} />}
          </CtrlButton>
        </PopoverTrigger>
        <PopoverContent align="start" side="left" sideOffset={8} className="w-64 p-0">
          <div className="flex items-center justify-between border-b border-border px-3 py-2">
            <span className="text-body-sm font-semibold text-foreground">Map layers</span>
            <button
              type="button"
              onClick={() => setAll(allOff)}
              className="text-caption font-medium text-primary transition-opacity hover:opacity-80 focus-visible:ring-2 focus-visible:ring-ring"
            >
              {allOff ? 'Show all' : 'Hide all'}
            </button>
          </div>
          <ul className="flex flex-col gap-0.5 p-2">
            {layers.map((l) => (
              <li key={l.id}>
                <label className="flex cursor-pointer items-center gap-2.5 rounded-md px-2 py-1.5 transition-colors hover:bg-muted">
                  <Checkbox checked={l.enabled} onCheckedChange={() => l.onToggle()} aria-label={String(l.label)} />
                  {l.icon && <span className="text-muted-foreground">{l.icon}</span>}
                  <span className="flex-1 truncate text-body-sm text-foreground">{l.label}</span>
                  {typeof l.count === 'number' && (
                    <span className="text-caption font-medium text-muted-foreground tabular-nums">{l.count}</span>
                  )}
                </label>
              </li>
            ))}
          </ul>
        </PopoverContent>
      </Popover>

      {traffic && (<><Divider /><CtrlButton label="Traffic layer" active={traffic.enabled} onClick={traffic.onToggle}><Signal01 size={16} /></CtrlButton></>)}
      {poi && (<><Divider /><CtrlButton label="POI layer" active={poi.enabled} onClick={poi.onToggle}><MarkerPin04 size={16} /></CtrlButton></>)}
      {geofence && (<><Divider /><CtrlButton label="Geofence layer" active={geofence.enabled} onClick={geofence.onToggle}><Hexagon02 size={16} /></CtrlButton></>)}

      {onRoute && (<><Divider /><CtrlButton label="Route" onClick={onRoute}><Route size={16} /></CtrlButton></>)}
      {onMeasure && (<><Divider /><CtrlButton label="Measure" onClick={onMeasure}><Ruler size={16} /></CtrlButton></>)}
      {onRecenter && (<><Divider /><CtrlButton label="Recenter" onClick={onRecenter}><Home01 size={16} /></CtrlButton></>)}
    </div>
  );
}

/* ── MapToolsControl — the LEFT-SIDE tools column ─────────────────────────
 * Figma FAMS V5 · 495-32282 (left stack, right-hand screenshot in the user
 * brief). Search-on-map, Pin/Attach, Refresh — with an optional Eye toggle
 * at the bottom of the map for hiding all overlays.
 */

export interface MapToolsControlProps {
  onSearch?: () => void;
  onPin?: () => void;
  onRefresh?: () => void;
  className?: string;
}

export function MapToolsControl({ onSearch, onPin, onRefresh, className }: MapToolsControlProps) {
  return (
    <div className={cn('flex flex-col overflow-hidden rounded-lg border border-border bg-card shadow-sm', className)}>
      {onSearch && <CtrlButton label="Search on map" onClick={onSearch}>
        {/* dedicated Search glyph — imported at file scope below */}
        <SearchIcon />
      </CtrlButton>}
      {onSearch && (onPin || onRefresh) && <Divider />}
      {onPin && <CtrlButton label="Pin location" onClick={onPin}><PinIcon /></CtrlButton>}
      {onPin && onRefresh && <Divider />}
      {onRefresh && <CtrlButton label="Refresh" onClick={onRefresh}><RefreshIcon /></CtrlButton>}
    </div>
  );
}

/* ── MapVisibilityToggle — the LEFT-BOTTOM eye toggle ────────────────────
 * Show / hide ALL overlay content (analytics, layers) — a single-tap
 * "declutter the map" button anchored at the map's bottom-left.
 */
export interface MapVisibilityToggleProps {
  hidden: boolean;
  onToggle: () => void;
  className?: string;
}
export function MapVisibilityToggle({ hidden, onToggle, className }: MapVisibilityToggleProps) {
  return (
    <button
      type="button"
      aria-label={hidden ? 'Show map overlays' : 'Hide map overlays'}
      aria-pressed={!hidden}
      title={hidden ? 'Show overlays' : 'Hide overlays'}
      onClick={onToggle}
      className={cn(
        'grid size-9 place-items-center overflow-hidden rounded-lg border border-border bg-card shadow-sm transition-colors hover:bg-muted',
        hidden ? 'text-primary' : 'text-muted-foreground hover:text-foreground',
        className,
      )}
    >
      {hidden ? <EyeIcon /> : <EyeOffIcon />}
    </button>
  );
}

/* Local mini glyphs — kept in file so this control has no external icon deps
 * beyond the DS icon set already imported above. */
function SearchIcon() { return <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden><circle cx="11" cy="11" r="7" /><path d="m21 21-4.3-4.3" /></svg>; }
function PinIcon()    { return <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden><path d="M12 17v5" /><path d="M9 10.76A2 2 0 0 1 10.24 9h3.52A2 2 0 0 1 15 10.76l1.5 3.75a1 1 0 0 1-.93 1.36H8.43a1 1 0 0 1-.93-1.36z" /><path d="M12 2v6" /></svg>; }
function RefreshIcon(){ return <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden><path d="M21 12a9 9 0 1 1-3-6.7L21 8" /><path d="M21 3v5h-5" /></svg>; }
function EyeIcon()    { return <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden><path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7S2 12 2 12z" /><circle cx="12" cy="12" r="3" /></svg>; }
function EyeOffIcon() { return <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden><path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 10 7 10 7a13.16 13.16 0 0 1-1.67 2.68" /><path d="M6.61 6.61A13.4 13.4 0 0 0 2 12s3 7 10 7a9.7 9.7 0 0 0 5.39-1.61" /><path d="M14.12 14.12A3 3 0 1 1 9.88 9.88" /><path d="m2 2 20 20" /></svg>; }
