import * as React from 'react';
import * as Icons from '../../icons';
import { cn } from '../utils/cn';
import { Button, Input } from '../primitives';
import { ColumnConfig } from '../data-display';
import { LeafletMap } from '../map';
import type { LatLng } from '../map';
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
export interface PlanZone { id: string; name?: string; points: LatLng[]; color?: string; }
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
  /** open the Create New Plan wizard in the right pane (default true). */
  createWizard?: boolean;
  onCreatePlan?: () => void;
  onPlanCreated?: (draft: PlanDraft) => void;
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
  plans, zones = [], bins = [], center = [24.4539, 54.3773], zoom = 11,
  statusStyles, wasteStyles, labels, createWizard = true,
  onCreatePlan, onPlanCreated, onToggleVisible, className,
}: InteractivePlanningProps) {
  const [query, setQuery] = React.useState('');
  const [collapsed, setCollapsed] = React.useState(false);
  const [creating, setCreating] = React.useState(false);
  const [showPlanned, setShowPlanned] = React.useState(true);
  const [showUnplanned, setShowUnplanned] = React.useState(true);
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

  // Bins render as small clustered dots (green planned / red unplanned) so they
  // aggregate into tidy count badges at city zoom instead of carpeting the map —
  // the zones stay the focus, matching the frame.
  const binMarkers = React.useMemo(
    () => bins
      .filter((b) => (b.planned ? showPlanned : showUnplanned))
      .map((b) => ({ id: b.id, position: b.position, kind: 'dot' as const, status: (b.planned ? 'reporting' : 'critical') as 'reporting' | 'critical' })),
    [bins, showPlanned, showUnplanned],
  );
  const zoneShapes = React.useMemo(
    () => zones.map((z) => ({ id: z.id, points: z.points, color: z.color ?? PLANNED, label: z.name, fillOpacity: 0.12 })),
    [zones],
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
              <Icons.FilterLines size={16} />
            </button>
            <Button variant="primary" onClick={() => { onCreatePlan?.(); if (createWizard) setCreating(true); }}><Icons.Plus size={16} className="mr-1.5" />Create New Plan</Button>
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
                    <tr key={p.id} className="border-b border-border/70 hover:bg-muted/30">
                      <td className="px-3 py-2.5"><EyeToggle on={isVisible(p)} onClick={() => toggle(p)} /></td>
                      <td className="px-2 py-2.5">
                        <span className="inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-body-sm font-medium" style={{ background: `color-mix(in srgb, ${VIOLET} 12%, transparent)`, color: VIOLET }}>
                          <Icons.BinCollection size={14} />{p.serviceType}
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
      <div className="relative min-h-0 flex-1">
        <LeafletMap center={center} zoom={zoom} zones={zoneShapes} markers={binMarkers} cluster zoomControl className="h-full w-full" />
        {/* legend (top-left) */}
        <div className="absolute left-4 top-4 z-[400] flex items-center gap-4 rounded-lg border border-border bg-card/95 px-3 py-2 shadow-sm backdrop-blur">
          <LegendCheck label="Planned Bins" color={PLANNED} checked={showPlanned} onChange={setShowPlanned} />
          <LegendCheck label="Unplanned Bins" color={UNPLANNED} checked={showUnplanned} onChange={setShowUnplanned} />
        </div>
      </div>

      {/* Create New Plan — right side-sheet overlay */}
      {createWizard && (
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
