import * as React from 'react';
import * as Icons from '../../icons';
import { cn } from '../utils/cn';
import { Button, Input } from '../primitives';
import { ColumnConfig } from '../data-display';
import { LeafletMap } from '../map';
import type { LatLng, LeafletMapHandle } from '../map';
import { CreatePlanWizard } from './create-plan-wizard';
import type { PlanDraft } from './create-plan-wizard';

/**
 * InteractivePlanning — the "Interactive Planning" home (Hybrid View): a plan
 * table beside a live coverage map. Built to Tadweer's Interactive Planning
 * module (Figma AKU5PLaqjO1QBakY9pUAH1 · node 105-15028). Chrome is FAMS blue
 * (the Figma's Tadweer green maps to `--primary`); green/amber/red are reserved
 * for genuine status (plan status · planned/unplanned bins · waste type).
 *
 * DYNAMIC / config-driven: it holds no domain vocabulary beyond sensible waste
 * defaults — `plans`, `zones`, `bins`, `columns` labels, `statusStyles` and the
 * `wasteStyles` map are all props, so any Smart-City planning service (bins,
 * street-sweeping, tankering, grounds) adapts by config. Visibility toggles and
 * "Create New Plan" are reported through callbacks; the map is the DS `LeafletMap`.
 */

export interface PlanRow {
  id: string;
  serviceType: string;
  wasteType: string;
  vehicle: string;
  /** e.g. 'DRAFTED' | 'APPROVED' — free text; style via `statusStyles`. */
  status: string;
  /** shown on the map when true (eye toggle). */
  visible?: boolean;
}
/** `covered` toggles which legend bucket (planned/unplanned) the zone falls
 *  under — defaults to covered (true) when omitted. */
export interface PlanZone { id: string; name?: string; points: LatLng[]; color?: string; covered?: boolean; }
/** A single point marker on the hybrid map — not a generic "bin": whatever
 *  the consuming service's point-granularity concept is (e.g. a pump
 *  deployment / critical flood site), keyed off the SAME planned/unplanned
 *  legend as the zones. `planned` toggle name kept for backward-compat with
 *  the zone-level `covered` flag's legend pairing. */
export interface PlanBin { id: string; position: LatLng; planned: boolean; }

/** tone = a status/semantic token; filled = solid bg + white text vs tinted. */
export interface StatusStyle { tone: string; filled?: boolean; }

export interface InteractivePlanningProps {
  plans: PlanRow[];
  zones?: PlanZone[];
  bins?: PlanBin[];
  center?: LatLng;
  zoom?: number;
  /** per-status pill style; default DRAFTED = neutral, APPROVED = success-filled. */
  statusStyles?: Record<string, StatusStyle>;
  /** per-waste-type glyph + color; falls back to a neutral recycle glyph. */
  wasteStyles?: Record<string, { icon: React.ReactNode; color: string }>;
  labels?: { serviceType?: string; wasteType?: string; vehicle?: string; status?: string };
  /** map legend checkbox labels (default "Covered/Uncovered Zones"). */
  legendLabels?: { planned: string; unplanned: string };
  /** icon for the service-type chip (default the waste bin-collection glyph). */
  serviceIcon?: React.ReactNode;
  /** open the Create New Plan wizard in the right pane (default true). */
  createWizard?: boolean;
  /**
   * Show the toolbar's "Create New Plan" button at all (default true).
   * 2026-08-31: added so a consumer that reuses this generic list+map
   * component for a MONITORING surface — not a planning one — can suppress
   * plan creation entirely rather than show an affordance that doesn't apply
   * (Plan Monitoring's Hybrid View: it lists/maps existing runs, it doesn't
   * create new plans). `false` also implies `createWizard: false` (no
   * button, no wizard to open).
   */
  showCreateButton?: boolean;
  onCreatePlan?: () => void;
  onPlanCreated?: (draft: PlanDraft) => void;
  /**
   * FM-6364: swap the default waste-collection `CreatePlanWizard` for a
   * service-specific wizard (the MM Flood `FloodPlanWizard`). Receives the
   * open state this component already manages for its toolbar button.
   */
  renderCreateWizard?: (p: { open: boolean; onOpenChange: (open: boolean) => void }) => React.ReactNode;
  /** row click — open the plan's detail surface (consumer-owned). */
  onOpenPlan?: (id: string) => void;
  onToggleVisible?: (id: string, visible: boolean) => void;
  onEditColumns?: () => void;
  className?: string;
}

const PLANNED = 'var(--status-success)';
const UNPLANNED = 'var(--status-error)';
const VIOLET = 'var(--chart-accent-purple)';

const DEFAULT_STATUS_STYLES: Record<string, StatusStyle> = {
  DRAFTED: { tone: 'var(--muted-foreground)' },
  APPROVED: { tone: 'var(--status-success)', filled: true },
};

function wasteGlyph(name: string): { icon: React.ReactNode; color: string } {
  const n = name.toLowerCase();
  if (n.includes('non')) return { icon: <Icons.Trash01 size={14} />, color: 'var(--muted-foreground)' };
  if (n.includes('recycl')) return { icon: <Icons.RefreshCcw01 size={14} />, color: 'var(--status-success)' };
  if (n.includes('general')) return { icon: <Icons.Package size={14} />, color: 'var(--status-warning)' };
  return { icon: <Icons.Trash01 size={14} />, color: 'var(--muted-foreground)' };
}

/* status pill (DRAFTED / APPROVED …) */
function StatusPill({ status, style }: { status: string; style?: StatusStyle }) {
  const s = style ?? { tone: 'var(--muted-foreground)' };
  if (s.filled) {
    return <span className="inline-flex items-center rounded-md px-2 py-1 text-caption font-bold uppercase tracking-wide text-white" style={{ background: s.tone }}>{status}</span>;
  }
  return <span className="inline-flex items-center rounded-md px-2 py-1 text-caption font-bold uppercase tracking-wide" style={{ background: `color-mix(in srgb, ${s.tone} 14%, transparent)`, color: s.tone }}>{status}</span>;
}

/* eye visibility toggle — active = primary (brand law), inactive = neutral outline. */
function EyeToggle({ on, onClick }: { on: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={on ? 'Hide on map' : 'Show on map'}
      aria-pressed={on}
      className={cn(
        'grid size-7 place-items-center rounded-md transition-colors',
        on ? 'bg-primary text-primary-foreground' : 'border border-border text-muted-foreground hover:bg-muted',
      )}
    >
      {on ? <Icons.Eye size={15} /> : <Icons.EyeOff size={15} />}
    </button>
  );
}

export function InteractivePlanning({
  plans, zones = [], bins = [], center = [25.2854, 51.5310], zoom = 11,
  statusStyles, wasteStyles, labels, legendLabels, serviceIcon, createWizard = true,
  showCreateButton = true,
  onCreatePlan, onPlanCreated, onOpenPlan, onToggleVisible, className, renderCreateWizard,
}: InteractivePlanningProps) {
  const [query, setQuery] = React.useState('');
  const [collapsed, setCollapsed] = React.useState(false);
  const [creating, setCreating] = React.useState(false);
  const [showPlanned, setShowPlanned] = React.useState(true);
  const [showUnplanned, setShowUnplanned] = React.useState(true);
  const mapRef = React.useRef<LeafletMapHandle>(null);
  const mapWrapRef = React.useRef<HTMLDivElement>(null);
  const [hiddenCols, setHiddenCols] = React.useState<string[]>([]);
  const showCol = (id: string) => !hiddenCols.includes(id);
  // uncontrolled visibility fallback when the host doesn't own it
  const [vis, setVis] = React.useState<Record<string, boolean>>(() =>
    Object.fromEntries(plans.map((p) => [p.id, p.visible ?? false])));

  const sStyles = { ...DEFAULT_STATUS_STYLES, ...statusStyles };
  const L = { serviceType: 'Service Type', wasteType: 'Waste Type', vehicle: 'Vehicle', status: 'Status', ...labels };

  const q = query.trim().toLowerCase();
  const rows = plans.filter((p) => !q || `${p.serviceType} ${p.wasteType} ${p.vehicle} ${p.status}`.toLowerCase().includes(q));

  const isVisible = (p: PlanRow) => vis[p.id] ?? p.visible ?? false;
  const toggle = (p: PlanRow) => {
    const next = !isVisible(p);
    setVis((m) => ({ ...m, [p.id]: next }));
    onToggleVisible?.(p.id, next);
  };

  // Point markers render as small clustered dots (green covered / red
  // uncovered) so they aggregate into tidy count badges at city zoom instead
  // of carpeting the map — the ZONE polygons stay the primary planning
  // surface (coverage is a zone-level concept here, not a per-point one);
  // points are sparse, meaningful sites (e.g. pump deployment / critical
  // flood spots), sharing the same legend toggle as the zones.
  const binMarkers = React.useMemo(
    () => bins
      .filter((b) => (b.planned ? showPlanned : showUnplanned))
      .map((b) => ({ id: b.id, position: b.position, kind: 'dot' as const, status: (b.planned ? 'reporting' : 'critical') as 'reporting' | 'critical' })),
    [bins, showPlanned, showUnplanned],
  );
  const zoneShapes = React.useMemo(
    () => zones
      .filter((z) => (z.covered ?? true ? showPlanned : showUnplanned))
      .map((z) => ({ id: z.id, points: z.points, color: z.color ?? (z.covered ?? true ? PLANNED : UNPLANNED), label: z.name, fillOpacity: 0.12 })),
    [zones, showPlanned, showUnplanned],
  );

  return (
    <div className={cn('flex h-full min-h-0', className)}>
      {/* ── left: plan table ─────────────────────────────────────────── */}
      {!collapsed && (
        <div className="flex w-[590px] max-w-[52%] min-w-[420px] flex-col border-r border-border">
          {/* toolbar */}
          <div className="flex items-center gap-2.5 p-4">
            <div className="relative flex-1">
              <Icons.SearchSm size={15} className="pointer-events-none absolute left-2.5 top-1/2 z-10 -translate-y-1/2 text-muted-foreground" />
              <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search anything here" className="pl-8" />
            </div>
            <button type="button" aria-label="Filter" className="grid size-10 shrink-0 place-items-center rounded-lg border border-border text-muted-foreground transition-colors hover:bg-muted hover:text-foreground">
              <Icons.FilterFunnel02 size={16} />
            </button>
            {showCreateButton && (
              <Button variant="primary" onClick={() => { onCreatePlan?.(); if (createWizard) setCreating(true); }}><Icons.Plus size={16} className="mr-1.5" />Create New Plan</Button>
            )}
          </div>

          {/* table */}
          <div className="min-h-0 flex-1 overflow-auto">
            <table className="w-full border-collapse">
              <thead className="sticky top-0 z-[1] bg-card">
                <tr className="border-y border-border text-caption font-bold uppercase tracking-wide text-muted-foreground">
                  <th className="w-10 px-3 py-2.5" />
                  <th className="px-2 py-2.5 text-left">{L.serviceType}</th>
                  {showCol('wasteType') && <th className="px-2 py-2.5 text-left">{L.wasteType}</th>}
                  {showCol('vehicle') && <th className="px-2 py-2.5 text-left">{L.vehicle}</th>}
                  {showCol('status') && <th className="px-2 py-2.5 text-left">{L.status}</th>}
                  <th className="w-10 px-2 py-2.5 text-right">
                    <ColumnConfig
                      columns={[
                        { id: 'serviceType', label: L.serviceType, locked: true },
                        { id: 'wasteType', label: L.wasteType },
                        { id: 'vehicle', label: L.vehicle },
                        { id: 'status', label: L.status },
                      ]}
                      hidden={hiddenCols}
                      onChange={setHiddenCols}
                      triggerClassName="ml-auto"
                    />
                  </th>
                </tr>
              </thead>
              <tbody>
                {rows.map((p) => {
                  const w = wasteStyles?.[p.wasteType] ?? wasteGlyph(p.wasteType);
                  return (
                    <tr
                      key={p.id}
                      className={cn('border-b border-border/70 hover:bg-muted/30', onOpenPlan && 'cursor-pointer')}
                      onClick={onOpenPlan ? () => onOpenPlan(p.id) : undefined}
                    >
                      <td className="px-3 py-2.5" onClick={(e) => e.stopPropagation()}><EyeToggle on={isVisible(p)} onClick={() => toggle(p)} /></td>
                      <td className="px-2 py-2.5">
                        <span className="inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-body-sm font-medium" style={{ background: `color-mix(in srgb, ${VIOLET} 12%, transparent)`, color: VIOLET }}>
                          {serviceIcon ?? <Icons.BinCollection size={14} />}{p.serviceType}
                        </span>
                      </td>
                      {showCol('wasteType') && (
                        <td className="px-2 py-2.5">
                          <span className="inline-flex items-center gap-1.5 text-body-sm text-foreground">
                            <span style={{ color: w.color }}>{w.icon}</span>{p.wasteType}
                          </span>
                        </td>
                      )}
                      {showCol('vehicle') && (
                        <td className="px-2 py-2.5">
                          <span className="inline-flex items-center gap-1.5 text-body-sm text-foreground">
                            <Icons.Truck01 size={16} className="text-muted-foreground" />{p.vehicle}
                          </span>
                        </td>
                      )}
                      {showCol('status') && <td className="px-2 py-2.5"><StatusPill status={p.status} style={sStyles[p.status]} /></td>}
                      <td className="w-10" />
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* collapse handle */}
      <button
        type="button"
        onClick={() => setCollapsed((c) => !c)}
        aria-label={collapsed ? 'Show list' : 'Hide list'}
        className="grid w-4 shrink-0 place-items-center border-r border-border bg-card text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
      >
        {collapsed ? <Icons.ChevronRight size={14} /> : <Icons.ChevronLeft size={14} />}
      </button>

      {/* ── right: map — or the Create New Plan wizard ───────────────── */}
      <div ref={mapWrapRef} className="relative min-h-0 flex-1">
        {/* Native MapView control stack (bottom-right): zoom in/out, locate/fit,
            fullscreen — same tile anatomy as the Live Monitoring map's own
            controls (FleetMap.tsx). `showReset={false}` drops the 3D
            bearing-reset/compass control — a byproduct of MapView's default
            camera tilt that has no equivalent on Live Monitoring's flat map,
            so planning's hybrid maps don't carry it. */}
        <LeafletMap ref={mapRef} center={center} zoom={zoom} zones={zoneShapes} markers={binMarkers} cluster showReset={false} showLocate className="h-full w-full" />
        {/* legend (top-left) */}
        <div className="absolute left-4 top-4 z-[400] flex items-center gap-4 rounded-lg border border-border bg-card/95 px-3 py-2 shadow-sm backdrop-blur">
          <LegendCheck label={legendLabels?.planned ?? 'Covered Zones'} color={PLANNED} checked={showPlanned} onChange={setShowPlanned} />
          <LegendCheck label={legendLabels?.unplanned ?? 'Uncovered Zones'} color={UNPLANNED} checked={showUnplanned} onChange={setShowUnplanned} />
        </div>
      </div>

      {/* Create New Plan — right side-sheet overlay */}
      {showCreateButton && createWizard && renderCreateWizard && renderCreateWizard({ open: creating, onOpenChange: setCreating })}
      {showCreateButton && createWizard && !renderCreateWizard && (
        <CreatePlanWizard
          initial={{ serviceType: plans[0]?.serviceType }}
          open={creating}
          onOpenChange={setCreating}
          onCreate={(d) => { setCreating(false); onPlanCreated?.(d); }}
        />
      )}
    </div>
  );
}

function LegendCheck({ label, color, checked, onChange }: { label: string; color: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <label className="flex cursor-pointer items-center gap-2 text-body-sm font-medium text-foreground">
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="size-4 shrink-0 rounded border-border accent-[var(--primary)]"
      />
      <span className="inline-block size-2.5 rounded-full" style={{ background: color }} />
      {label}
    </label>
  );
}
