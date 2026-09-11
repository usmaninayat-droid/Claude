import * as React from 'react';
import * as Icons from '../../icons';
import { cn } from '../utils/cn';
import { Popover, PopoverTrigger, PopoverContent } from '../primitives';
import { LeafletMap } from '../map';
import type { LatLng, MapMarker } from '../map';
import type { PlanBin } from './interactive-planning';

/**
 * PlanningMode — the Interactive Planning full-screen "Planning Mode" draw
 * sub-mode (Figma AKU5PLaqjO1QBakY9pUAH1 · node 105-9350). A config rail
 * (Service Schedule · Service Coverage · Resource Allocation · Route & Stops)
 * beside a full map with draw tools, Selected/Planned/Unplanned bin layers, a
 * drawn selection zone + bin cluster, and Optimize Route. Reached from the
 * Create-Plan wizard's Interactive Mapping step.
 *
 * Brand law: the Figma's Tadweer green (active tool, checked boxes) → FAMS
 * `--primary`; green/amber/red stay only for genuine status (planned/unplanned
 * bins). Config-driven — bins, the selection zone, depot/discharge options and
 * the zone estimate are props. Live shape-drawing (leaflet-draw) is a follow-on;
 * the active tool + drawn selection match the frame's completed state.
 */

type DrawTool = 'auto' | 'circle' | 'polygon' | 'rectangle';

export interface PlanningModeProps {
  bins?: PlanBin[];
  /** the drawn selection polygon (ring of [lat,lng]). */
  selectionZone?: LatLng[];
  center?: LatLng;
  zoom?: number;
  depotOptions?: string[];
  dischargeOptions?: string[];
  zoneLabel?: string;
  estWaste?: string;
  onClose: () => void;
  onOptimize?: () => void;
  className?: string;
}

const PLANNED = 'var(--status-success)';
const UNPLANNED = 'var(--status-error)';

/** deterministic bins inside the Musaffah / MBZ City selection box. */
function defaultBins(): PlanBin[] {
  const bins: PlanBin[] = [];
  let seed = 7;
  const rnd = () => { seed = (seed * 1103515245 + 12345) & 0x7fffffff; return seed / 0x7fffffff; };
  for (let i = 0; i < 151; i++) {
    bins.push({
      id: `bin-${i}`,
      // tight cluster over Musaffah / MBZ City so they collapse into one "151" badge
      position: [24.415 + rnd() * 0.045, 54.52 + rnd() * 0.05] as LatLng,
      planned: rnd() > 0.35,
    });
  }
  return bins;
}
const DEFAULT_ZONE: LatLng[] = [[24.40, 54.505], [24.485, 54.505], [24.485, 54.605], [24.40, 54.605]];

function Section({ label, open, onToggle, children }: { label: string; open: boolean; onToggle: () => void; children?: React.ReactNode }) {
  return (
    <div className="border-b border-border">
      <button type="button" onClick={onToggle} className="flex w-full items-center gap-2 py-3 text-left">
        {open ? <Icons.ChevronDown size={16} className="text-primary" /> : <Icons.ChevronRight size={16} className="text-muted-foreground" />}
        <span className={cn('text-body-sm font-semibold', open ? 'text-primary' : 'text-foreground')}>{label}</span>
      </button>
      {open && children && <div className="flex flex-col gap-3 pb-4">{children}</div>}
    </div>
  );
}

function RailSelect({ icon, label, options }: { icon: React.ReactNode; label: string; options: string[] }) {
  const [open, setOpen] = React.useState(false);
  const [value, setValue] = React.useState('');
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button type="button" className="flex w-full items-center gap-2.5 rounded-lg border border-border bg-card px-3 py-2.5 text-left outline-none transition-colors hover:bg-muted/40">
          <span className="shrink-0">{icon}</span>
          <span className={cn('flex-1 truncate text-body-sm', value ? 'font-medium text-foreground' : 'text-muted-foreground')}>{value || label}</span>
          <Icons.ChevronDown size={16} className="shrink-0 text-muted-foreground" />
        </button>
      </PopoverTrigger>
      <PopoverContent align="start" className="max-h-60 w-[--radix-popover-trigger-width] overflow-auto p-1">
        {options.map((o) => (
          <button key={o} type="button" onClick={() => { setValue(o); setOpen(false); }} className="flex w-full items-center rounded-md px-2.5 py-2 text-left text-body-sm text-foreground transition-colors hover:bg-muted">{o}</button>
        ))}
      </PopoverContent>
    </Popover>
  );
}

export function PlanningMode({
  bins, selectionZone = DEFAULT_ZONE, center = [24.35, 54.55], zoom = 11,
  depotOptions = ['Al Wathba Depot', 'Musaffah Depot', 'ICAD Depot'],
  dischargeOptions = ['Al Dhafra Transfer', 'Central Tipping Station', 'MBZ Discharge'],
  zoneLabel = 'Collection Zone 1', estWaste = '6.2 CBM', onClose, onOptimize, className,
}: PlanningModeProps) {
  const allBins = React.useMemo(() => bins ?? defaultBins(), [bins]);
  const [open, setOpen] = React.useState<Record<string, boolean>>({ route: true });
  const toggle = (k: string) => setOpen((o) => ({ ...o, [k]: !o[k] }));
  const [tool, setTool] = React.useState<DrawTool>('rectangle');
  const [showSelected, setShowSelected] = React.useState(true);
  const [showPlanned, setShowPlanned] = React.useState(false);
  const [showUnplanned, setShowUnplanned] = React.useState(false);
  const [binsHidden, setBinsHidden] = React.useState(false);
  const [route, setRoute] = React.useState<LatLng[] | null>(null);
  const [optimizing, setOptimizing] = React.useState(false);

  // Optimize Route — order the in-zone bins into a coherent path (the DS map
  // snaps it to roads via OSRM) and draw it. Bounded, deterministic ordering.
  const optimize = () => {
    const pts = allBins.map((b) => b.position).sort((a, b) => a[0] - b[0] || a[1] - b[1]);
    const stops = pts.filter((_, i) => i % Math.ceil(pts.length / 14) === 0).slice(0, 14);
    setOptimizing(true);
    setRoute(stops);
    setOptimizing(false);
    onOptimize?.();
  };

  const markers: MapMarker[] = React.useMemo(() => {
    if (binsHidden) return [];
    return allBins
      .filter((b) => (showSelected) || (b.planned ? showPlanned : showUnplanned))
      .map((b) => ({ id: b.id, position: b.position, kind: 'dot' as const, color: b.planned ? PLANNED : UNPLANNED }));
  }, [allBins, binsHidden, showSelected, showPlanned, showUnplanned]);

  const zones = [{ id: 'selection', points: selectionZone, color: 'var(--foreground)', fillOpacity: 0.04 }];

  const ToolBtn = ({ t, children, primary }: { t: DrawTool; children: React.ReactNode; primary?: boolean }) => (
    <button
      type="button"
      onClick={() => setTool(t)}
      aria-label={`${t} tool`}
      aria-pressed={tool === t}
      className={cn(
        'grid size-9 place-items-center rounded-lg border transition-colors',
        primary
          ? 'border-primary bg-primary text-primary-foreground'
          : tool === t ? 'border-primary bg-primary/10 text-primary' : 'border-border bg-card text-foreground hover:bg-muted',
      )}
    >
      {children}
    </button>
  );

  return (
    <div className={cn('flex h-full min-h-0 bg-card', className)}>
      {/* ── left rail ─────────────────────────────────────────────────── */}
      <div className="flex w-[268px] shrink-0 flex-col border-r border-border">
        <div className="flex items-center gap-2 border-b border-border px-4 py-3.5">
          <button type="button" onClick={onClose} aria-label="Close planning mode" className="grid size-6 place-items-center rounded-full bg-[var(--status-error)] text-white transition-opacity hover:opacity-90">
            <Icons.XClose size={13} />
          </button>
          <span className="flex-1 text-body font-semibold text-foreground">Planning Mode</span>
          <button type="button" aria-label="Toggle list" className="grid size-7 place-items-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground"><Icons.List size={16} /></button>
        </div>

        <div className="min-h-0 flex-1 overflow-auto px-4">
          <Section label="Service Schedule" open={!!open.schedule} onToggle={() => toggle('schedule')} />
          <Section label="Service Coverage" open={!!open.coverage} onToggle={() => toggle('coverage')} />
          <Section label="Resource Allocation" open={!!open.resource} onToggle={() => toggle('resource')} />
          <Section label="Route & Stops" open={!!open.route} onToggle={() => toggle('route')}>
            <RailSelect icon={<Icons.MarkerPin01 size={17} className="text-[var(--status-success)]" />} label="Start Depot" options={depotOptions} />
            <div className="rounded-lg border border-primary/40 bg-primary/[0.05] px-3 py-2.5">
              <div className="flex items-center gap-2">
                <Icons.Map01 size={16} className="text-primary" />
                <span className="text-body-sm font-semibold text-foreground">{zoneLabel}</span>
              </div>
              <span className="mt-0.5 block pl-6 text-caption font-medium uppercase tracking-wide text-muted-foreground">Est. Waste: {estWaste}</span>
            </div>
            <RailSelect icon={<Icons.Truck01 size={17} className="text-muted-foreground" />} label="Discharge Station" options={dischargeOptions} />
          </Section>
        </div>

        <div className="border-t border-border p-4">
          <button
            type="button"
            onClick={optimize}
            disabled={optimizing}
            className={cn(
              'flex w-full items-center justify-center gap-1.5 rounded-lg py-2.5 text-body-sm font-semibold transition-colors',
              route ? 'bg-primary text-primary-foreground hover:opacity-90' : 'border border-border bg-card text-muted-foreground hover:border-primary hover:text-primary',
            )}
          >
            <Icons.Route size={16} />{route ? 'Route Optimized' : 'Optimize Route'}
          </button>
        </div>
      </div>

      {/* ── map ───────────────────────────────────────────────────────── */}
      <div className="relative min-h-0 flex-1">
        <LeafletMap center={center} zoom={zoom} zones={zones} markers={markers} cluster zoomControl routes={route ? [{ id: 'optimized', points: route, color: 'var(--primary)' }] : []} className="h-full w-full" />

        {/* draw toolbar (top-left) */}
        <div className="absolute left-4 top-4 z-[400] flex flex-col gap-2">
          <ToolBtn t="auto" primary><Icons.Stars01 size={16} /></ToolBtn>
          <div className="flex flex-col gap-1 rounded-lg border border-border bg-card p-1 shadow-sm">
            <ToolBtn t="circle"><span className="size-3 rounded-full bg-foreground" /></ToolBtn>
            <ToolBtn t="polygon"><Icons.MarkerPin01 size={15} /></ToolBtn>
            <ToolBtn t="rectangle"><span className="size-3 rounded-[3px] bg-foreground" /></ToolBtn>
          </div>
        </div>

        {/* legend (top, checkboxes) */}
        <div className="absolute left-20 top-4 z-[400] flex items-center gap-4 rounded-lg border border-border bg-card/95 px-3 py-2 shadow-sm backdrop-blur">
          <LegendCheck label="Selected Bins" color="var(--primary)" checked={showSelected} onChange={setShowSelected} />
          <LegendCheck label="Planned Bins" color={PLANNED} checked={showPlanned} onChange={setShowPlanned} />
          <LegendCheck label="Unplanned Bins" color={UNPLANNED} checked={showUnplanned} onChange={setShowUnplanned} />
        </div>

        {/* eye-off toggle (bottom-left) */}
        <button
          type="button"
          onClick={() => setBinsHidden((h) => !h)}
          aria-label={binsHidden ? 'Show bins' : 'Hide bins'}
          className="absolute bottom-4 left-4 z-[400] grid size-9 place-items-center rounded-full border border-border bg-card text-muted-foreground shadow-sm transition-colors hover:text-foreground"
        >
          {binsHidden ? <Icons.Eye size={16} /> : <Icons.EyeOff size={16} />}
        </button>
      </div>
    </div>
  );
}

function LegendCheck({ label, color, checked, onChange }: { label: string; color: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <label className="flex cursor-pointer items-center gap-2 text-body-sm font-medium text-foreground">
      <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} className="size-4 shrink-0 rounded border-border accent-[var(--primary)]" />
      <span className="inline-block size-2.5 rounded-full" style={{ background: color }} />
      {label}
    </label>
  );
}
