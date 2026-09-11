/**
 * po-modules — Project-Officer-only modules for the IIMS AppShell:
 *   • Dashboard module with 3 VIEWS (Incidents · Inspector Performance ·
 *     Contractor Monitoring) — tabs render as the module header.
 *   • Inspector Management (entity list + profile detail).
 *   • Shift Scheduling (calendar of inspector shifts).
 *   • Inspector Compliance Monitoring (shift compliance dashboard).
 *
 * All data is derived live from the shared `useIims` store + catalog. Token-only
 * styling; consumed by `iims-modules.tsx` which composes the PO AppConfig.
 */
import * as React from 'react';
import * as Icons from '@ds/icons';
import type {
  ModuleConfig, EntityModuleData, DetailDescriptor, DashboardKpi, DashboardFilterField, EntityDetailTab, EntityTag,
} from '@ds/components/app-shell';
import {
  Dashboard, EntityDetail, EntityMetricCard, EntityChartCard, EntityListItem, EntityDetailRow,
} from '@ds/components/app-shell';
import { DataTable } from '@ds/components/data-display';
import type { DataTableColumn } from '@ds/components/data-display';
import { DateRangePicker } from '@ds/components/basics';
import type { DateRangeResult } from '@ds/components/basics';
import {
  ChartCard, BarChart, DonutChart, LineChart, MiniDonutCell,
} from '@ds/components/data-viz';
import type { DonutDatum } from '@ds/components/data-viz';
import {
  Button, Input, Switch,
  Sheet, SheetContent, SheetHeader, SheetFooter, SheetTitle,
  Select, SelectTrigger, SelectValue, SelectContent, SelectItem, toast,
  Tooltip, TooltipProvider, TooltipTrigger, TooltipContent,
  Popover, PopoverTrigger, PopoverContent,
  Dialog, DialogContent, DialogTitle, DialogDescription,
} from '@ds/components/primitives';
import { useIims } from '@/store/store';
import { INSPECTORS, ESPS, ZONES } from '@/data/catalog';
import { SEED_NOW } from '@/data/seed';
import { INCIDENT_STATUS, INCIDENT_STATUS_ORDER, SEVERITY, INSPECTION_RESULT, INSPECTION_STATUS } from '@/data/status';
import type { Incident, IncidentStatus, KpiCategory } from '@/data/types';
import { AvatarChip, formatAed, formatDate, formatDateTime, initials, IncidentStatusPill, InspectionStatusPill, InspectionResultPill, SeverityPill } from '@/lib/ui';
import { IncidentMap, DOHA_CENTER } from '@/lib/IncidentMap';
import { InspectorShiftScheduleTab } from './inspector-shifts';
import { LeafletMap } from '@ds/components/map';
import type { MapMarker } from '@ds/components/map';
import inspectorIllustration from '@/assets/inspector.svg';
import pdfFileIcon from '@/assets/pdf-file.svg';

type Store = ReturnType<typeof useIims>;
type Inspector = (typeof INSPECTORS)[number];
type Esp = (typeof ESPS)[number];

/* ─────────────────────────── shared presentational ─────────────────────────── */

function Th({ children, right }: { children: React.ReactNode; right?: boolean }) {
  return <th className={`px-4 py-2.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground ${right ? 'text-right' : 'text-left'}`}>{children}</th>;
}
function Td({ children, right }: { children: React.ReactNode; right?: boolean }) {
  return <td className={`border-b border-border/60 px-4 py-2 text-body-sm text-foreground ${right ? 'text-right tabular-nums' : ''}`}>{children}</td>;
}

function CompliancePill({ pct }: { pct: number }) {
  const color = pct >= 90 ? 'var(--status-success)' : pct >= 75 ? 'var(--status-warning)' : 'var(--status-error)';
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-body-xs font-semibold" style={{ background: `color-mix(in srgb, ${color} 14%, transparent)`, color }}>
      <span className="inline-block h-1.5 w-1.5 rounded-full" style={{ background: color }} />{pct}%
    </span>
  );
}

/** Deterministic on/off duty per inspector (shared by the list + profile). */
const isOnDuty = (id: string) => seed01(`duty${id}`) > 0.35;

function DutyPill({ on }: { on: boolean }) {
  const color = on ? 'var(--status-success)' : 'var(--muted-foreground)';
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-body-xs font-semibold" style={{ background: `color-mix(in srgb, ${color} 14%, transparent)`, color }}>
      <span className="inline-block h-1.5 w-1.5 rounded-full" style={{ background: color }} />{on ? 'On Duty' : 'Off Duty'}
    </span>
  );
}

/* ─────────────────────────────── derivations ──────────────────────────────── */

interface InspectorStat extends Inspector {
  inspections: number; completed: number; incidents: number; avgScore: number;
  scheduled: number; attended: number; missed: number; compliance: number;
}
function inspectorStats(s: Store): InspectorStat[] {
  const shifts = genShifts(s);
  return INSPECTORS.map((insp) => {
    const ins = s.data.inspections.filter((i) => i.inspectorId === insp.id);
    const completed = ins.filter((i) => i.status === 'completed');
    const scores = completed.map((i) => i.scorePct ?? 0).filter((n) => n > 0);
    const incidents = s.data.incidents.filter((i) => i.reportedByInspectorId === insp.id).length;
    const sh = shifts.filter((x) => x.inspectorId === insp.id);
    const scheduledPast = sh.filter((x) => x.status !== 'scheduled');
    const attended = sh.filter((x) => x.status === 'attended').length;
    const missed = sh.filter((x) => x.status === 'missed').length;
    return {
      ...insp,
      inspections: ins.length,
      completed: completed.length,
      incidents,
      avgScore: scores.length ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : 0,
      scheduled: sh.length,
      attended,
      missed,
      compliance: scheduledPast.length ? Math.round((attended / scheduledPast.length) * 100) : 100,
    };
  });
}

interface EspStat extends Esp {
  incidents: number; open: number; closed: number; penalties: number;
}
function espStats(s: Store): EspStat[] {
  return ESPS.map((esp) => {
    const inc = s.data.incidents.filter((i) => i.espId === esp.id);
    return {
      ...esp,
      incidents: inc.length,
      open: inc.filter((i) => i.status !== 'closed' && i.status !== 'invalid').length,
      closed: inc.filter((i) => i.status === 'closed').length,
      penalties: inc.reduce((sum, i) => sum + i.penaltyAed, 0),
    };
  });
}

/* Deterministic inspector shift roster for the anchored "now" month. */
export interface Shift { id: string; inspectorId: string; day: number; type: 'Morning' | 'Evening' | 'Night'; status: 'attended' | 'missed' | 'scheduled'; }
const SHIFT_TYPES = ['Morning', 'Evening', 'Night'] as const;
export function genShifts(s: Store): Shift[] {
  const ref = new Date(s.now);
  const year = ref.getFullYear(), month = ref.getMonth();
  const days = new Date(year, month + 1, 0).getDate();
  const today = ref.getDate();
  const out: Shift[] = [];
  INSPECTORS.forEach((insp, ii) => {
    for (let d = 1; d <= days; d++) {
      if ((d + ii) % 2 === 0) {
        const type = SHIFT_TYPES[(d + ii) % 3];
        const past = d < today;
        const missed = past && ((d * 7 + ii * 13) % 9 === 0);
        out.push({ id: `sh-${insp.id}-${d}`, inspectorId: insp.id, day: d, type, status: past ? (missed ? 'missed' : 'attended') : 'scheduled' });
      }
    }
  });
  return out;
}

/* ══════════════════════════ Dashboard views ════════════════════════════════ */
/* The three PO dashboards mirror the Tadweer — November Release frames
 * (Inspector Performance · Contractor Performance · IIMS Incidents). Widgets are
 * composed from DS data-viz (KpiTile, ChartCard, Bar/Line/Donut/Gauge charts,
 * ActivityBar, MiniDonutCell) over the shared store. Totals/status/penalty
 * breakdowns are derived from real store data; time-series and the operational
 * shift metrics (clock-in/out, coverage, resolution time) are shaped
 * deterministically per entity so the charts read populated + stable across
 * reloads. Chrome stays FAMS-blue; status/category palettes stay semantic. */

/* ── deterministic shaping helpers (stable across renders) ── */
function seed01(key: string): number {
  let h = 2166136261;
  for (let i = 0; i < key.length; i++) { h ^= key.charCodeAt(i); h = Math.imul(h, 16777619); }
  return ((h >>> 0) % 100000) / 100000;
}
/** base value wiggled ±amp deterministically per (key, index), clamped ≥ 0. */
const wig = (key: string, i: number, base: number, amp: number) =>
  Math.max(0, Math.round((base + (seed01(`${key}#${i}`) - 0.5) * 2 * amp) * 10) / 10);
/** deterministic resolution time in hours for an entity id. */
const resHrs = (id: string) => Math.round((1 + seed01(`res${id}`) * 3.3) * 10) / 10;
/** same calendar day as the anchored "now". */
const sameDay = (iso: string, ref: number) => {
  const d = new Date(iso); const r = new Date(ref);
  return d.getFullYear() === r.getFullYear() && d.getMonth() === r.getMonth() && d.getDate() === r.getDate();
};

function trailingDays(nowMs: number, n: number): { key: string; label: string }[] {
  const now = new Date(nowMs);
  return Array.from({ length: n }, (_, idx) => {
    const d = new Date(now); d.setDate(now.getDate() - (n - 1 - idx));
    return { key: d.toISOString().slice(0, 10), label: d.toLocaleString('en-US', { day: 'numeric', month: 'short' }) };
  });
}

/** Standard chart-body height — every chart in a grid row uses this so cards in
 *  the same row line up exactly (legends render INSIDE this height). */
const CHART_H = 300;

/* ── KPI-category palette (categorical, matches the Figma map legend) ── */
const CATEGORY_META: { key: KpiCategory; label: string; short: string; color: string }[] = [
  { key: 'PCC', label: 'PCC', short: 'PCC', color: 'var(--chart-accent-purple)' },
  { key: 'Resource Allocation', label: 'Resource Allocation', short: 'Resource Alloc.', color: 'var(--chart-accent-teal)' },
  { key: 'Solid Waste', label: 'Solid Waste Collection & Transportation', short: 'Solid Waste', color: 'var(--chart-accent-green)' },
  { key: 'Mechanical Sweeping', label: 'Mechanical Sweeping / Sand Removal', short: 'Mech. Sweeping', color: 'var(--chart-accent-yellow)' },
  { key: 'Manual Sweeping', label: 'Manual Sweeping & Cleaning Services', short: 'Manual Sweeping', color: 'var(--chart-accent-orange)' },
  { key: 'Fleet', label: 'Vehicle / Fleet Management', short: 'Fleet', color: 'var(--chart-accent-cyan)' },
  { key: 'EHS', label: 'Environment, Health & Safety', short: 'EHS', color: 'var(--chart-accent-red)' },
];
const CATEGORY_COLOR = (c: string) => CATEGORY_META.find((m) => m.key === c)?.color ?? 'var(--muted-foreground)';

/** Status legend items (the "Closed" column reads "Closed < 3 Days" on the board). */
const STATUS_LEGEND = INCIDENT_STATUS_ORDER.map((st) => ({
  id: st, color: INCIDENT_STATUS[st].color,
  label: st === 'closed' ? 'Closed < 3 Days' : INCIDENT_STATUS[st].label,
}));

/** Status-breakdown cell — a single proportional bar with ONE hover tooltip that
 *  lists every status + count (dark DS tooltip). Replaces per-segment tooltips. */
function StatusBar({ incidents }: { incidents: Incident[] }) {
  const rows = STATUS_LEGEND.map((m) => ({ ...m, value: incidents.filter((i) => i.status === (m.id as IncidentStatus)).length }));
  const present = rows.filter((r) => r.value > 0);
  const total = present.reduce((a, r) => a + r.value, 0) || 1;
  return (
    <TooltipProvider delayDuration={80}>
      <Tooltip>
        <TooltipTrigger asChild>
          <button type="button" className="flex h-3 w-40 overflow-hidden rounded-full bg-muted outline-none focus-visible:ring-2 focus-visible:ring-ring" aria-label="Status breakdown">
            {present.map((r) => (
              <span key={r.id} className="h-full" style={{ width: `${(r.value / total) * 100}%`, background: r.color }} />
            ))}
          </button>
        </TooltipTrigger>
        <TooltipContent side="right" showArrow={false} className="w-60 bg-foreground p-2 text-background">
          <ul className="flex flex-col gap-0.5">
            {rows.map((r) => (
              <li key={r.id} className="flex items-center justify-between gap-3 rounded-md px-2 py-1.5">
                <span className="flex min-w-0 items-center gap-2">
                  <span aria-hidden className="size-2.5 shrink-0 rounded-full" style={{ background: r.color }} />
                  <span className="truncate text-body-sm font-medium">{r.label}</span>
                </span>
                <span className="shrink-0 rounded-full bg-background/15 px-2 py-0.5 text-caption font-semibold tabular-nums">{r.value}</span>
              </li>
            ))}
          </ul>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

/* ── DS Dashboard header config (date-range picker · filter dropdowns · export)
 *  The three dashboards render through the DS `<Dashboard>` layout, which owns
 *  the header chrome + KPI row; their Figma-specific body (map, chart cards,
 *  tables) is passed as children. Filter selections are demo chrome. ── */
/** Trigger label for the DS DateRangePicker (its calendar + FAMS presets drive
 *  the popup). Anchored to the demo's June-2026 review window. */
const DATE_LABEL = '1 Jun – 30 Jun, 2026';
const lotFilter: DashboardFilterField = {
  id: 'lot', label: 'Lot',
  options: ZONES.map((z, i) => ({ value: z.id, label: `Lot ${i + 1} · ${z.name}` })),
};
const inspectorFilter: DashboardFilterField = {
  id: 'inspector', label: 'Inspector',
  options: INSPECTORS.map((p) => ({ value: p.id, label: p.name, color: p.avatarColor })),
};
const contractorFilter: DashboardFilterField = {
  id: 'contractor', label: 'Contractor',
  options: ESPS.map((p) => ({ value: p.id, label: p.name, color: p.avatarColor })),
};
const notifyExport = () => toast.success('Preparing dashboard export…');

/** "Incidents Reported" map — the overlaid dropdown picks the dimension the pins
 *  are coloured/grouped by (Contractor · KPI Category · Incident Status ·
 *  Severity); the legend rows are clickable FILTERS that show/hide each group on
 *  the map. Title stays generic because the user chooses how to view + filter. */
type MapMode = 'esp' | 'category' | 'status' | 'severity';
const MAP_MODES: { id: MapMode; label: string }[] = [
  { id: 'esp', label: 'Contractor (ESP)' },
  { id: 'category', label: 'KPI Category' },
  { id: 'status', label: 'Incident Status' },
  { id: 'severity', label: 'Severity Level' },
];
const SEVERITY_ORDER = ['critical', 'high', 'medium', 'low'] as const;

function IncidentsMapPanel({ s, defaultMode = 'category', height = 440 }: { s: Store; defaultMode?: MapMode; height?: number }) {
  const [mode, setMode] = React.useState<MapMode>(defaultMode);
  // Which legend values are hidden from the map. Reset when the dimension changes.
  const [hidden, setHidden] = React.useState<Set<string>>(() => new Set());
  React.useEffect(() => { setHidden(new Set()); }, [mode]);

  // Value of the active dimension for an incident (matches legend ids).
  const keyOf = React.useCallback((i: Incident): string =>
    mode === 'esp' ? i.espId : mode === 'category' ? i.category : mode === 'status' ? i.status : i.severity, [mode]);
  // Stable so IncidentMap's pois only recompute when the dimension changes.
  const colorFor = React.useCallback((i: Incident) =>
    mode === 'esp' ? (s.esp(i.espId)?.avatarColor ?? 'var(--muted-foreground)')
      : mode === 'category' ? CATEGORY_COLOR(i.category)
        : mode === 'status' ? INCIDENT_STATUS[i.status].color
          : SEVERITY[i.severity].color, [mode, s]);
  const labelFor = React.useCallback((i: Incident) => {
    const v = mode === 'esp' ? (s.esp(i.espId)?.name ?? '—')
      : mode === 'category' ? i.category
        : mode === 'status' ? INCIDENT_STATUS[i.status].label
          : SEVERITY[i.severity].label;
    return `${i.id} · ${v}`;
  }, [mode, s]);

  const legend: { id: string; label: string; color: string }[] =
    mode === 'esp' ? ESPS.map((e) => ({ id: e.id, label: e.name, color: e.avatarColor }))
      : mode === 'category' ? CATEGORY_META.map((m) => ({ id: m.key, label: m.label, color: m.color }))
        : mode === 'status' ? STATUS_LEGEND.map((m) => ({ id: m.id, label: m.label, color: m.color }))
          : SEVERITY_ORDER.map((sv) => ({ id: sv, label: SEVERITY[sv].label, color: SEVERITY[sv].color }));

  const counts = React.useMemo(() => {
    const m: Record<string, number> = {};
    for (const i of s.data.incidents) { const k = keyOf(i); m[k] = (m[k] ?? 0) + 1; }
    return m;
  }, [s.data.incidents, keyOf]);
  const shown = React.useMemo(
    () => s.data.incidents.filter((i) => !hidden.has(keyOf(i))),
    [s.data.incidents, hidden, keyOf],
  );
  const toggle = (id: string) => setHidden((prev) => {
    const next = new Set(prev);
    next.has(id) ? next.delete(id) : next.add(id);
    return next;
  });
  const allOff = hidden.size >= legend.length;

  // Dimension picker lives in the map overlay (top-left). Built on Popover
  // (opens on a plain click) rather than Radix Select — a Select here would not
  // open on real clicks over the Leaflet map. Options are ordinary buttons.
  const [menuOpen, setMenuOpen] = React.useState(false);
  const activeLabel = MAP_MODES.find((m) => m.id === mode)?.label;

  return (
    <ChartCard title="Incidents Reported" icon={<Icons.Map01 size={16} />} iconColor="var(--primary)" bodyPadding="none">
      <div className="relative w-full overflow-hidden rounded-b-lg" style={{ height }}>
        <IncidentMap incidents={shown} colorFor={colorFor} labelFor={labelFor} />
        <div className="absolute left-3 top-3 z-[1000] flex max-h-[calc(100%-24px)] w-[248px] flex-col rounded-lg border border-border bg-card/95 shadow-[var(--elevation-md)] backdrop-blur">
          <div className="p-3 pb-2">
            <Popover open={menuOpen} onOpenChange={setMenuOpen}>
              <PopoverTrigger asChild>
                <button
                  type="button"
                  data-testid="map-view-mode"
                  className="flex h-9 w-full items-center justify-between gap-2 rounded-lg border border-border bg-card px-3 text-body-sm font-medium text-foreground outline-none transition-colors hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring"
                >
                  <span className="truncate">{activeLabel}</span>
                  <svg className="shrink-0 text-muted-foreground" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="m6 9 6 6 6-6" /></svg>
                </button>
              </PopoverTrigger>
              <PopoverContent align="start" className="z-[1200] w-[216px] p-1">
                {MAP_MODES.map((m) => {
                  const active = m.id === mode;
                  return (
                    <button
                      key={m.id}
                      type="button"
                      onClick={() => { setMode(m.id); setMenuOpen(false); }}
                      className={`flex w-full items-center justify-between rounded-md px-2.5 py-2 text-left text-body-sm transition-colors hover:bg-muted ${active ? 'font-semibold text-primary' : 'text-foreground'}`}
                    >
                      {m.label}
                      {active && <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6 9 17l-5-5" /></svg>}
                    </button>
                  );
                })}
              </PopoverContent>
            </Popover>
          </div>
          <div className="flex items-center justify-between px-3 pb-1.5">
            <span className="min-w-0 truncate text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">Filter</span>
            {hidden.size > 0 && (
              <button type="button" onClick={() => setHidden(new Set())} className="shrink-0 text-[10px] font-semibold text-primary hover:underline">Reset</button>
            )}
          </div>
          <div className="flex flex-col gap-0.5 overflow-auto px-1.5 pb-2">
            {legend.map((it) => {
              const on = !hidden.has(it.id);
              return (
                <button
                  key={it.id}
                  type="button"
                  onClick={() => toggle(it.id)}
                  className="flex items-center gap-2 rounded-md px-1.5 py-1 text-left transition-colors hover:bg-muted"
                >
                  <span className={`flex size-4 shrink-0 items-center justify-center rounded border transition-colors ${on ? 'border-primary bg-primary text-primary-foreground' : 'border-border bg-card'}`}>
                    {on && <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6 9 17l-5-5" /></svg>}
                  </span>
                  <span className="inline-block size-2.5 shrink-0 rounded-full transition-opacity" style={{ background: it.color, opacity: on ? 1 : 0.3 }} />
                  <span className={`min-w-0 flex-1 truncate text-body-xs transition-colors ${on ? 'text-foreground' : 'text-muted-foreground'}`}>{it.label}</span>
                  <span className="shrink-0 text-body-xs tabular-nums text-muted-foreground">{counts[it.id] ?? 0}</span>
                </button>
              );
            })}
          </div>
          {allOff && <p className="px-3 pb-2 text-[10px] text-muted-foreground">All groups hidden — showing none.</p>}
        </div>
      </div>
    </ChartCard>
  );
}

/** Grid cell wrapping a standard ChartCard that stretches to the row height, so
 *  every panel in a row lines up (icon-badge header + single-line title). */
function Panel({
  title, icon, iconColor = 'var(--primary)', span, legend, children,
}: {
  title: React.ReactNode; icon: React.ReactNode; iconColor?: string; span: number;
  legend?: React.ReactNode; children: React.ReactNode;
}) {
  return (
    <div className="min-w-0" style={{ gridColumn: `span ${span} / span ${span}` }}>
      <ChartCard title={title} icon={icon} iconColor={iconColor} legend={legend} className="h-full">
        {children}
      </ChartCard>
    </div>
  );
}

/** Full-width standardized panel (wide charts). */
function WidePanel({
  title, icon, iconColor = 'var(--primary)', bodyPadding, children,
}: {
  title: React.ReactNode; icon: React.ReactNode; iconColor?: string;
  bodyPadding?: 'none' | 'sm' | 'md' | 'lg'; children: React.ReactNode;
}) {
  return (
    <ChartCard title={title} icon={icon} iconColor={iconColor} bodyPadding={bodyPadding} className="w-full">
      {children}
    </ChartCard>
  );
}

/** Full-width table panel — the table renders flush (bodyPadding none) so the
 *  header band + rows span the whole card and columns align to the card edge
 *  (cells carry their own px-4). A divider separates it from the title header. */
function TablePanel({
  title, icon, iconColor = 'var(--primary)', children,
}: { title: React.ReactNode; icon: React.ReactNode; iconColor?: string; children: React.ReactNode }) {
  return (
    <ChartCard title={title} icon={icon} iconColor={iconColor} bodyPadding="none" className="w-full">
      <div className="mt-4 overflow-x-auto border-t border-border">
        <table className="w-full border-collapse">{children}</table>
      </div>
    </ChartCard>
  );
}

/** Donut + a labelled legend list beside it — vertically centered so the panel
 *  fills the row height cleanly (Penalty / Critical Distribution / Status). */
function DonutWithLegend({
  data, centerTop, centerSub, format,
}: { data: DonutDatum[]; centerTop: React.ReactNode; centerSub?: string; format?: (v: number) => string }) {
  return (
    <div className="flex h-full items-center justify-center gap-5" style={{ minHeight: CHART_H }}>
      {/* Fixed width: recharts ResponsiveContainer is width:100%, which collapses
          to 0 inside a shrink-0 flex item without an explicit width. */}
      <div className="shrink-0" style={{ width: 208, height: 220 }}>
        <DonutChart
          data={data}
          height={220}
          innerRadius={64}
          outerRadius={88}
          centerLabel={
            // Constrained to the donut hole (Ø ~128px) so long values never spill
            // over the ring; number stays exact + tabular, unit lives in the sub.
            <div className="mx-auto max-w-[116px] px-1 text-center leading-none">
              <div className="text-[22px] font-bold tabular-nums tracking-tight text-foreground">{centerTop}</div>
              {centerSub ? <div className="mt-1 text-[10px] font-medium leading-tight text-muted-foreground">{centerSub}</div> : null}
            </div>
          }
        />
      </div>
      <ul className="flex min-w-0 flex-1 flex-col gap-2">
        {data.map((d) => (
          <li key={d.name} className="flex items-center gap-2 text-body-xs">
            <span className="inline-block size-2.5 shrink-0 rounded-full" style={{ background: d.color }} />
            <span className="min-w-0 flex-1 truncate text-muted-foreground">{d.name}</span>
            <span className="shrink-0 font-semibold tabular-nums text-foreground">{format ? format(d.value) : d.value.toLocaleString()}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

/** Modern half-gauge (speedometer) — a thick red→amber→green gradient arc with a
 *  floating "kite" marker at the value. Modeled on the FAMS radial reference,
 *  replacing the flat DS needle gauge. Pure SVG; semantic status colours. */
export function ComplianceGaugeChart({ value, size = 240, label }: { value: number; size?: number; label?: string }) {
  const uid = React.useId();
  const v = Math.max(0, Math.min(100, value));
  const W = size;
  const sw = Math.round(W * 0.092);              // arc thickness
  const cx = W / 2, cy = W / 2;
  const r = W / 2 - sw / 2 - 2;
  const H = cy + Math.round(sw * 0.9);            // room for the marker at the ends
  const polar = (deg: number, rad = r) => {
    const a = (deg * Math.PI) / 180;
    return { x: cx + rad * Math.cos(a), y: cy + rad * Math.sin(a) };
  };
  const a0 = polar(180), a1 = polar(360);
  const arc = `M ${a0.x} ${a0.y} A ${r} ${r} 0 0 1 ${a1.x} ${a1.y}`;
  const ang = 180 + (v / 100) * 180;             // 180°=0, 360°=100
  const m = polar(ang);
  // outward-pointing kite marker
  const outer = polar(ang, r + sw * 0.5);
  const inner = polar(ang, r - sw * 0.42);
  const t = ((ang + 90) * Math.PI) / 180;
  const tx = Math.cos(t) * sw * 0.34, ty = Math.sin(t) * sw * 0.34;
  const kite = `${outer.x},${outer.y} ${m.x + tx},${m.y + ty} ${inner.x},${inner.y} ${m.x - tx},${m.y - ty}`;
  return (
    <div className="inline-flex flex-col items-center">
      <svg width={size} height={H} viewBox={`0 0 ${W} ${H}`} role="img" aria-label={`${v}% compliance`}>
        <defs>
          <linearGradient id={`gauge-${uid}`} x1="0" y1="0" x2="1" y2="0">
            <stop offset="0" stopColor="var(--status-error)" />
            <stop offset="0.55" stopColor="var(--status-warning)" />
            <stop offset="1" stopColor="var(--status-success)" />
          </linearGradient>
          <filter id={`mk-${uid}`} x="-60%" y="-60%" width="220%" height="220%">
            <feDropShadow dx="0" dy="1.5" stdDeviation="2.5" floodColor="var(--foreground)" floodOpacity="0.22" />
          </filter>
        </defs>
        <path d={arc} fill="none" stroke={`url(#gauge-${uid})`} strokeWidth={sw} strokeLinecap="round" />
        <polygon points={kite} fill="var(--foreground)" stroke="var(--card)" strokeWidth={sw * 0.16} strokeLinejoin="round" filter={`url(#mk-${uid})`} />
        <text x={cx} y={cy - W * 0.03} textAnchor="middle" fill="var(--foreground)" style={{ fontSize: W * 0.16, fontWeight: 800, letterSpacing: '-0.02em' }}>
          {v}<tspan style={{ fontSize: W * 0.085, fontWeight: 700 }}>%</tspan>
        </text>
      </svg>
      {label ? <p className="mt-1 text-body-sm text-muted-foreground">{label}</p> : null}
    </div>
  );
}

/* ═══════════════════════ IIMS Incidents Dashboard ══════════════════════════ */

export function IncidentsDashboard({ s }: { s: Store }) {
  const k = s.kpis();
  const counts = s.countByStatus();
  const incidents = s.data.incidents;
  const totalPenalty = incidents.reduce((sum, i) => sum + i.penaltyAed, 0);
  const closedToday = incidents.filter((i) => i.status === 'closed' && i.verification && sameDay(i.verification.at, s.now)).length;
  const awaitingEsp = counts.awaiting_rectification + counts.awaiting_esp_re_rectification;

  // Stacked bar — incidents by KPI category over the trailing 15 days.
  const barDays = trailingDays(s.now, 15);
  const catBar = barDays.map((d, idx) => {
    const row: Record<string, number | string> = { day: idx * 2 + 1 };
    CATEGORY_META.forEach((c) => {
      const base = 2 + incidents.filter((i) => i.category === c.key).length / 2;
      row[c.key] = Math.round(wig(`cat${c.key}`, idx, base, 3));
    });
    return row;
  });

  // Donut — critical incident distribution by category.
  const catDonut: DonutDatum[] = CATEGORY_META
    .map((c) => ({ name: c.label, value: incidents.filter((i) => i.category === c.key).length, color: c.color }))
    .filter((d) => d.value > 0);
  const catTotal = catDonut.reduce((a, b) => a + b.value, 0);

  // Donut — incident status overview.
  const statusDonut: DonutDatum[] = STATUS_LEGEND
    .map((m) => ({ name: m.label, value: counts[m.id as IncidentStatus], color: m.color }))
    .filter((d) => d.value > 0);

  // Line — SLA breaches (overdue open incidents) trailing 30 days.
  const slaDays = trailingDays(s.now, 30);
  const overdueTotal = incidents.filter((i) => i.status !== 'closed' && i.status !== 'invalid' && new Date(i.slaDueAt).getTime() < s.now).length;
  const slaTrend = slaDays.map((d, idx) => ({ day: idx + 1, breaches: Math.round(wig('sla', idx, Math.max(6, overdueTotal), overdueTotal * 0.6 + 4)) }));

  // Lot-wise activity rows (one per zone/lot).
  const lotRows = ZONES.map((z, i) => {
    const inc = incidents.filter((x) => x.zoneId === z.id);
    const insp = s.data.inspections.filter((x) => x.zoneId === z.id);
    const esp = ESPS.find((e) => e.zoneIds.includes(z.id)) ?? ESPS[0];
    return {
      lot: `Lot ${i + 1}`, zone: z.name, esp,
      avgDailyInc: (inc.length / 30).toFixed(1),
      avgDailyInsp: (insp.length / 30).toFixed(1),
      totalInc: inc.length,
      invalid: inc.filter((x) => x.status === 'invalid').length,
      conducted: insp.filter((x) => x.status === 'completed').length,
      res: resHrs(z.id),
      statusIncidents: inc,
    };
  });

  const kpis: DashboardKpi[] = [
    { label: 'Open Incidents', value: k.openIncidents, icon: <Icons.AlertCircle size={18} />, iconColor: 'var(--chart-accent-red)' },
    { label: 'Incidents Reported Today', value: k.reportedToday, icon: <Icons.AlertTriangle size={18} />, iconColor: 'var(--chart-accent-orange)' },
    { label: 'Awaiting ESP Action', value: awaitingEsp, icon: <Icons.ClockRefresh size={18} />, iconColor: 'var(--primary)' },
    { label: 'Escalated Incidents', value: k.escalated, icon: <Icons.AlertOctagon size={18} />, iconColor: 'var(--status-error)' },
    { label: 'Closed Today', value: closedToday, icon: <Icons.CheckCircle size={18} />, iconColor: 'var(--status-success)' },
    { label: 'Total Penalty Amount', value: totalPenalty.toLocaleString('en-AE'), unit: 'AED', icon: <Icons.CurrencyDollarCircle size={18} />, iconColor: 'var(--chart-accent-pink)' },
  ];

  return (
    <Dashboard dateLabel={DATE_LABEL} filters={[lotFilter, inspectorFilter]} onExport={notifyExport} kpis={kpis}>
      <IncidentsMapPanel s={s} />

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-12">
        <Panel title="Incidents Reported by KPI Category Over Time" icon={<Icons.BarChart10 size={16} />} span={7}>
          <BarChart data={catBar} xKey="day" stacked showLegend height={CHART_H} series={CATEGORY_META.map((c) => ({ dataKey: c.key, name: c.short, color: c.color }))} />
        </Panel>
        <Panel title="Critical Incident Distribution" icon={<Icons.PieChart01 size={16} />} span={5}>
          <DonutWithLegend data={catDonut} centerTop={catTotal.toLocaleString()} centerSub="Total Incidents" />
        </Panel>
        <Panel title="Incident Status Overview" icon={<Icons.PieChart03 size={16} />} span={5}>
          <DonutWithLegend data={statusDonut} centerTop={k.totalReported.toLocaleString()} centerSub="Total Incidents" />
        </Panel>
        <Panel title="SLA Breaches" icon={<Icons.LineChartUp03 size={16} />} iconColor="var(--chart-accent-purple)" span={7}>
          <LineChart data={slaTrend} xKey="day" height={CHART_H} series={[{ dataKey: 'breaches', name: 'SLA Breaches', color: 'var(--chart-accent-purple)' }]} />
        </Panel>
      </div>

      <TablePanel title="Lot-wise Activity" icon={<Icons.Table size={16} />}>
            <thead><tr className="bg-muted/40">
              <Th>Lot</Th><Th>Contractor</Th><Th right>Avg Daily Incidents</Th><Th right>Avg Daily Inspections</Th>
              <Th right>Total Incidents</Th><Th right>Invalid</Th><Th right>Inspections</Th><Th right>Avg Resolution</Th>
              <th className="px-4 py-2.5 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">Status Breakdown</th>
            </tr></thead>
            <tbody>
              {lotRows.map((r) => (
                <tr key={r.lot + r.zone}>
                  <Td><span className="font-semibold text-foreground">{r.lot}</span> <span className="text-muted-foreground">· {r.zone}</span></Td>
                  <Td><span className="flex items-center gap-2"><AvatarChip name={r.esp.name} color={r.esp.avatarColor} size={22} />{r.esp.name}</span></Td>
                  <Td right>{r.avgDailyInc}</Td>
                  <Td right>{r.avgDailyInsp}</Td>
                  <Td right>{r.totalInc}</Td>
                  <Td right>{r.invalid}</Td>
                  <Td right>{r.conducted}</Td>
                  <Td right>{r.res} hrs</Td>
                  <td className="border-b border-border/60 px-4 py-2"><StatusBar incidents={r.statusIncidents} /></td>
                </tr>
              ))}
            </tbody>
      </TablePanel>
    </Dashboard>
  );
}

/* ═══════════════════════ Inspector Performance Dashboard ════════════════════ */

export function InspectorPerformanceDashboard({ s }: { s: Store }) {
  const k = s.kpis();
  const stats = inspectorStats(s);
  const clockedIn = INSPECTORS.filter((i) => seed01(`duty${i.id}`) > 0.35).length;

  // Leaderboard rows sorted by total inspections.
  const board = stats
    .map((x) => {
      const inc = s.data.incidents.filter((i) => i.reportedByInspectorId === x.id);
      return {
        ...x,
        totalInspections: x.inspections,
        totalIncidents: inc.length,
        invalid: inc.filter((i) => i.status === 'invalid').length,
        avgDailyInc: (inc.length / 30).toFixed(1),
        avgDailyInsp: (x.inspections / 30).toFixed(1),
        res: resHrs(x.id),
        statusIncidents: inc,
      };
    })
    .sort((a, b) => b.totalInspections - a.totalInspections);

  // Line — avg clock-in / clock-out over the trailing 7 days (hour of day).
  const clockDays = trailingDays(s.now, 7);
  const clockTrend = clockDays.map((d, idx) => ({
    day: d.label,
    clockIn: wig('cin', idx, 8.3, 1.2),
    clockOut: wig('cout', idx, 17.1, 1.1),
  }));

  // Line — incidents reported vs inspections conducted over 30 days.
  const trendDays = trailingDays(s.now, 30);
  const incInspTrend = trendDays.map((d, idx) => ({
    day: idx + 1,
    incidents: Math.round(wig('rep', idx, 6, 3)),
    inspections: Math.round(wig('con', idx, 4, 2)),
  }));

  // Under-inspected areas (one per zone/lot).
  const areas = ZONES.map((z, i) => {
    const expected = 8 + ((i * 7) % 12);
    const actual = s.data.inspections.filter((x) => x.zoneId === z.id).length;
    return { lot: `Lot ${i + 1}`, zone: z.name, expected, actual, coverage: Math.min(100, Math.round((actual / expected) * 100)) };
  }).sort((a, b) => a.coverage - b.coverage);

  const kpis: DashboardKpi[] = [
    { label: 'Total Inspectors', value: INSPECTORS.length, icon: <Icons.Users01 size={18} />, iconColor: 'var(--primary)' },
    { label: 'Clocked-In Inspectors', value: clockedIn, icon: <Icons.UserCheck01 size={18} />, iconColor: 'var(--chart-accent-purple)' },
    { label: 'Avg Shift Duration', value: '7:45', unit: 'hrs', icon: <Icons.Hourglass02 size={18} />, iconColor: 'var(--chart-accent-orange)' },
    { label: 'Avg Clock-In Time', value: '08:05 AM', icon: <Icons.LogIn01 size={18} />, iconColor: 'var(--primary)' },
    { label: 'Avg Clock-Out Time', value: '05:12 PM', icon: <Icons.LogOut01 size={18} />, iconColor: 'var(--chart-accent-teal)' },
    { label: 'Incidents Reported', value: k.totalReported, icon: <Icons.AlertTriangle size={18} />, iconColor: 'var(--chart-accent-red)' },
    { label: 'Inspections Conducted', value: k.totalConducted, icon: <Icons.ClipboardCheck size={18} />, iconColor: 'var(--status-success)' },
    { label: 'Pending Rectification Verifications', value: k.pendingVerifications, icon: <Icons.ClockRefresh size={18} />, iconColor: 'var(--chart-accent-orange)' },
    { label: 'Pending Re-Rectification Verifications', value: k.pendingReVerifications, icon: <Icons.ClockRewind size={18} />, iconColor: 'var(--chart-accent-yellow)' },
  ];

  return (
    <Dashboard dateLabel={DATE_LABEL} filters={[lotFilter, inspectorFilter]} onExport={notifyExport} kpis={kpis}>
      <IncidentsMapPanel s={s} />

      <TablePanel title="Leaderboard" icon={<Icons.Trophy01 size={16} />} iconColor="var(--chart-accent-yellow)">
            <thead><tr className="bg-muted/40">
              <Th right>Rank</Th><Th>Inspector</Th><Th right>Avg Daily Incidents</Th><Th right>Avg Daily Inspections</Th>
              <Th right>Total Incidents</Th><Th right>Total Inspections</Th><Th right>Invalid</Th><Th right>Avg Resolution</Th>
              <th className="px-4 py-2.5 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">Activity</th>
            </tr></thead>
            <tbody>
              {board.map((x, rank) => (
                <tr key={x.id}>
                  <Td right><span className="inline-flex items-center gap-1 font-semibold">{rank < 3 ? <Icons.Trophy01 size={13} className="text-[var(--chart-accent-yellow)]" /> : null}{rank + 1}</span></Td>
                  <Td><span className="flex items-center gap-2"><AvatarChip name={x.name} color={x.avatarColor} size={24} />{x.name}</span></Td>
                  <Td right>{x.avgDailyInc}</Td>
                  <Td right>{x.avgDailyInsp}</Td>
                  <Td right>{x.totalIncidents}</Td>
                  <Td right>{x.totalInspections}</Td>
                  <Td right>{x.invalid}</Td>
                  <Td right>{x.res} hrs</Td>
                  <td className="border-b border-border/60 px-4 py-2"><StatusBar incidents={x.statusIncidents} /></td>
                </tr>
              ))}
            </tbody>
      </TablePanel>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Panel title="Avg. Clock-In & Clock-Out Trend" icon={<Icons.LineChartUp01 size={16} />} span={6}>
          <LineChart
            data={clockTrend}
            xKey="day"
            height={CHART_H}
            showLegend
            series={[
              { dataKey: 'clockIn', name: 'Clock-in', color: 'var(--primary)' },
              { dataKey: 'clockOut', name: 'Clock-out', color: 'var(--chart-accent-orange)' },
            ]}
          />
        </Panel>
        <Panel title="Incidents Reported to Inspections Conducted Trend" icon={<Icons.LineChartUp03 size={16} />} iconColor="var(--chart-accent-purple)" span={6}>
          <LineChart
            data={incInspTrend}
            xKey="day"
            height={CHART_H}
            showLegend
            series={[
              { dataKey: 'incidents', name: 'Incidents', color: 'var(--chart-3)' },
              { dataKey: 'inspections', name: 'Inspections', color: 'var(--primary)' },
            ]}
          />
        </Panel>
      </div>

      <TablePanel title="Under-Inspected Areas" icon={<Icons.Table size={16} />}>
            <thead><tr className="bg-muted/40"><Th>Area / Lot</Th><Th right>Expected Visits</Th><Th right>Actual Visits</Th><Th right>Coverage %</Th></tr></thead>
            <tbody>
              {areas.map((a) => (
                <tr key={a.lot + a.zone}>
                  <Td><span className="font-semibold text-foreground">{a.lot}</span> <span className="text-muted-foreground">· {a.zone}</span></Td>
                  <Td right>{a.expected}</Td>
                  <Td right>{a.actual}</Td>
                  <td className="border-b border-border/60 px-4 py-2 text-right"><div className="inline-flex justify-end"><MiniDonutCell value={a.coverage} size={38} /></div></td>
                </tr>
              ))}
            </tbody>
      </TablePanel>
    </Dashboard>
  );
}

/* ═══════════════════════ Contractor Performance Dashboard ═══════════════════ */

export function ContractorPerformanceDashboard({ s }: { s: Store }) {
  const stats = espStats(s);
  const counts = s.countByStatus();
  const incidents = s.data.incidents;
  // Penalty EXPOSURE per incident (the KPI-matrix amount for its violation) — a
  // populated, category-spread figure vs the sparse applied penalties.
  const pen = (i: Incident) => s.violation(i.violationTypeId)?.penaltyAed ?? i.penaltyAed;
  const totalPen = incidents.reduce((a, i) => a + pen(i), 0);
  const totalInc = stats.reduce((a, b) => a + b.incidents, 0);
  const avgSla = stats.length ? Math.round(stats.reduce((a, b) => a + b.slaCompliancePct, 0) / stats.length) : 0;
  const slaBreaches = incidents.filter((i) => i.status !== 'closed' && i.status !== 'invalid' && new Date(i.slaDueAt).getTime() < s.now).length;

  // Compliance over time — one line per contractor (trailing 30 days).
  const days = trailingDays(s.now, 30);
  const complianceTrend = days.map((d, idx) => {
    const row: Record<string, number> = { day: idx + 1 };
    ESPS.forEach((e) => { row[e.id] = Math.round(wig(`sla${e.id}`, idx, e.slaCompliancePct, 7)); });
    return row;
  });

  // Penalty breakdown by KPI category (exposure).
  const penaltyDonut: DonutDatum[] = CATEGORY_META
    .map((c) => ({ name: c.label, value: incidents.filter((i) => i.category === c.key).reduce((sum, i) => sum + pen(i), 0), color: c.color }))
    .filter((d) => d.value > 0);

  // Incidents per contractor — stacked by status.
  const incPerContractor = ESPS.map((e) => {
    const row: Record<string, number | string> = { name: e.code?.replace('ESP-', '') ?? e.name };
    const incs = incidents.filter((i) => i.espId === e.id);
    INCIDENT_STATUS_ORDER.forEach((st) => { row[st] = incs.filter((i) => i.status === st).length; });
    return row;
  });

  // Performance timeline — one line per status share (trailing 30 days).
  const perfTimeline = days.map((d, idx) => {
    const row: Record<string, number> = { day: idx + 1 };
    INCIDENT_STATUS_ORDER.forEach((st, si) => { row[st] = Math.round(wig(`pt${st}`, idx, 45 + si * 7, 12)); });
    return row;
  });

  const activity = ESPS.map((e) => {
    const incs = incidents.filter((i) => i.espId === e.id);
    return {
      esp: e,
      avgDaily: (incs.length / 30).toFixed(1),
      total: incs.length,
      escalations: incs.filter((i) => i.status === 'escalated' || i.status === 'awaiting_esp_re_rectification').length,
      res: resHrs(e.id),
      penalties: incs.reduce((sum, i) => sum + pen(i), 0),
      statusIncidents: incs,
    };
  });

  const kpis: DashboardKpi[] = [
    { label: 'Total Contractors', value: ESPS.length, icon: <Icons.Building07 size={18} />, iconColor: 'var(--primary)' },
    { label: 'Total Incidents Reported', value: totalInc, icon: <Icons.AlertTriangle size={18} />, iconColor: 'var(--chart-accent-red)' },
    { label: 'Pending Rectification', value: counts.awaiting_rectification, icon: <Icons.ClockRefresh size={18} />, iconColor: 'var(--primary)' },
    { label: 'Pending Re-Rectification', value: counts.awaiting_esp_re_rectification, icon: <Icons.ClockRewind size={18} />, iconColor: 'var(--chart-accent-orange)' },
    { label: 'SLA Breaches', value: slaBreaches, icon: <Icons.Shield01 size={18} />, iconColor: 'var(--status-error)' },
    { label: 'Avg Rectification Time', value: `${resHrs('esp-avg')}`, unit: 'hours', icon: <Icons.Hourglass02 size={18} />, iconColor: 'var(--chart-accent-purple)' },
  ];

  return (
    <Dashboard dateLabel={DATE_LABEL} filters={[lotFilter, contractorFilter]} onExport={notifyExport} kpis={kpis}>
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-12">
        <Panel title="Overall Compliance" icon={<Icons.Shield01 size={16} />} iconColor="var(--status-success)" span={4}>
          <div className="flex h-full flex-col items-center justify-center" style={{ minHeight: CHART_H }}>
            <ComplianceGaugeChart value={avgSla} size={260} label="SLA compliance" />
          </div>
        </Panel>
        <Panel title="Compliance Over Time" icon={<Icons.LineChartUp01 size={16} />} span={8}>
          <LineChart data={complianceTrend} xKey="day" height={CHART_H} showLegend series={ESPS.map((e) => ({ dataKey: e.id, name: e.name, color: e.avatarColor }))} />
        </Panel>
        <Panel title="Penalty Breakdown" icon={<Icons.PieChart01 size={16} />} iconColor="var(--chart-accent-pink)" span={5}>
          <DonutWithLegend data={penaltyDonut} centerTop={totalPen.toLocaleString('en-AE')} centerSub="AED · Total Penalties" format={(v) => formatAed(v)} />
        </Panel>
        <Panel title="Incidents Per Contractor" icon={<Icons.BarChart10 size={16} />} span={7}>
          <BarChart data={incPerContractor} xKey="name" stacked showLegend height={CHART_H} series={STATUS_LEGEND.map((m) => ({ dataKey: m.id, name: m.label, color: m.color }))} />
        </Panel>
      </div>

      <IncidentsMapPanel s={s} defaultMode="esp" />

      <TablePanel title="Contractor Activity" icon={<Icons.Table size={16} />}>
            <thead><tr className="bg-muted/40">
              <Th>Contractor</Th><Th right>Avg Daily Incidents</Th><Th right>Total Incidents</Th><Th right>Total Escalations</Th>
              <Th right>Avg Resolution</Th><Th right>Total Penalties</Th>
              <th className="px-4 py-2.5 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">Status Breakdown</th>
            </tr></thead>
            <tbody>
              {activity.map((r) => (
                <tr key={r.esp.id}>
                  <Td><span className="flex items-center gap-2"><AvatarChip name={r.esp.name} color={r.esp.avatarColor} size={24} />{r.esp.name}</span></Td>
                  <Td right>{r.avgDaily}</Td>
                  <Td right>{r.total}</Td>
                  <Td right>{r.escalations}</Td>
                  <Td right>{r.res} hrs</Td>
                  <Td right>{formatAed(r.penalties)}</Td>
                  <td className="border-b border-border/60 px-4 py-2"><StatusBar incidents={r.statusIncidents} /></td>
                </tr>
              ))}
            </tbody>
      </TablePanel>

      <WidePanel title="Performance Timeline" icon={<Icons.LineChartUp03 size={16} />} iconColor="var(--chart-accent-purple)">
        <LineChart data={perfTimeline} xKey="day" height={CHART_H} showLegend series={STATUS_LEGEND.map((m) => ({ dataKey: m.id, name: m.label, color: m.color }))} />
      </WidePanel>
    </Dashboard>
  );
}

/** Dashboard module — 3 views (tabs render as the module header). */
export function buildDashboardModule(s: Store): ModuleConfig {
  return {
    id: 'dashboard',
    type: 'dashboard',
    label: 'Dashboard',
    icon: Icons.BarChartSquare02,
    tabKind: 'instance',
    defaultTabId: 'incidents',
    tabs: [
      { id: 'incidents', label: 'IIMS Incidents', icon: Icons.AlertTriangle, render: () => <IncidentsDashboard s={s} /> },
      { id: 'inspector-perf', label: 'Inspector Performance', icon: Icons.Users01, render: () => <InspectorPerformanceDashboard s={s} /> },
      { id: 'contractor', label: 'Contractor Performance', icon: Icons.Building07, render: () => <ContractorPerformanceDashboard s={s} /> },
    ],
  };
}

/* ═══════════════════════ ESP (Contractor) Self Dashboard ════════════════════ */
/* A single-view dashboard for the ESP app — the same widgets as the PO
 * dashboards, but scoped to ONE contractor so they can monitor their own
 * performance: open work, rectification throughput, SLA compliance, and penalty
 * exposure. All figures derive from the incidents assigned to this ESP. */
export function EspDashboard({ s, espId }: { s: Store; espId: string }) {
  const esp = s.esp(espId);
  const incidents = s.data.incidents.filter((i) => i.espId === espId);
  const has = (fn: (i: Incident) => boolean) => incidents.filter(fn).length;
  const open = has((i) => i.status !== 'closed' && i.status !== 'invalid');
  const awaitingMe = has((i) => i.status === 'awaiting_rectification' || i.status === 'awaiting_esp_re_rectification');
  const submitted = has((i) => i.status === 'rectification_submitted' || i.status === 're_rectification_submitted');
  const escalated = has((i) => i.status === 'escalated');
  const closed = has((i) => i.status === 'closed');
  const pen = (i: Incident) => s.violation(i.violationTypeId)?.penaltyAed ?? i.penaltyAed;
  const totalPen = incidents.reduce((a, i) => a + pen(i), 0);
  const slaBreaches = has((i) => i.status !== 'closed' && i.status !== 'invalid' && new Date(i.slaDueAt).getTime() < s.now);
  const myZones = esp?.zoneIds ?? [];

  const statusDonut: DonutDatum[] = STATUS_LEGEND
    .map((m) => ({ name: m.label, value: incidents.filter((i) => i.status === (m.id as IncidentStatus)).length, color: m.color }))
    .filter((d) => d.value > 0);
  const penaltyDonut: DonutDatum[] = CATEGORY_META
    .map((c) => ({ name: c.label, value: incidents.filter((i) => i.category === c.key).reduce((a, i) => a + pen(i), 0), color: c.color }))
    .filter((d) => d.value > 0);

  const days = trailingDays(s.now, 30);
  const trend = days.map((d, idx) => ({
    day: idx + 1,
    submitted: Math.round(wig(`sub${espId}`, idx, Math.max(2, submitted / 3 + 1), 2)),
    closed: Math.round(wig(`cls${espId}`, idx, Math.max(2, closed / 3 + 1), 2)),
  }));

  const actionRows = incidents
    .filter((i) => i.status === 'awaiting_rectification' || i.status === 'awaiting_esp_re_rectification' || i.status === 'escalated')
    .sort((a, b) => new Date(a.slaDueAt).getTime() - new Date(b.slaDueAt).getTime());

  const espLotFilter: DashboardFilterField = { id: 'lot', label: 'Lot', options: myZones.map((zid) => ({ value: zid, label: s.zone(zid)?.name ?? zid })) };

  const kpis: DashboardKpi[] = [
    { label: 'Assigned Lots', value: myZones.length, icon: <Icons.MarkerPin01 size={18} />, iconColor: 'var(--primary)' },
    { label: 'Open Incidents', value: open, icon: <Icons.AlertCircle size={18} />, iconColor: 'var(--chart-accent-red)' },
    { label: 'Awaiting My Action', value: awaitingMe, icon: <Icons.ClockRefresh size={18} />, iconColor: 'var(--chart-accent-orange)' },
    { label: 'Rectifications Submitted', value: submitted, icon: <Icons.ClipboardCheck size={18} />, iconColor: 'var(--primary)' },
    { label: 'Escalated', value: escalated, icon: <Icons.AlertOctagon size={18} />, iconColor: 'var(--status-error)' },
    { label: 'Closed', value: closed, icon: <Icons.CheckCircle size={18} />, iconColor: 'var(--status-success)' },
    { label: 'SLA Breaches', value: slaBreaches, icon: <Icons.Shield01 size={18} />, iconColor: 'var(--status-error)' },
    { label: 'Total Penalty Exposure', value: totalPen.toLocaleString('en-AE'), unit: 'AED', icon: <Icons.CurrencyDollarCircle size={18} />, iconColor: 'var(--chart-accent-pink)' },
  ];

  return (
    <Dashboard dateLabel={DATE_LABEL} filters={[espLotFilter]} onExport={notifyExport} kpis={kpis}>
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-12">
        <Panel title="Overall SLA Compliance" icon={<Icons.Shield01 size={16} />} iconColor="var(--status-success)" span={4}>
          <div className="flex h-full flex-col items-center justify-center" style={{ minHeight: CHART_H }}>
            <ComplianceGaugeChart value={esp?.slaCompliancePct ?? 0} size={260} label="SLA compliance" />
          </div>
        </Panel>
        <Panel title="Rectification Throughput" icon={<Icons.LineChartUp01 size={16} />} span={8}>
          <LineChart data={trend} xKey="day" height={CHART_H} showLegend series={[
            { dataKey: 'submitted', name: 'Submitted', color: 'var(--primary)' },
            { dataKey: 'closed', name: 'Verified & Closed', color: 'var(--status-success)' },
          ]} />
        </Panel>
        <Panel title="My Incident Status" icon={<Icons.PieChart03 size={16} />} span={5}>
          {statusDonut.length ? <DonutWithLegend data={statusDonut} centerTop={incidents.length.toLocaleString()} centerSub="My Incidents" /> : <p className="py-8 text-center text-body-sm text-muted-foreground">No incidents assigned.</p>}
        </Panel>
        <Panel title="Penalty Exposure by Category" icon={<Icons.PieChart01 size={16} />} iconColor="var(--chart-accent-pink)" span={7}>
          {penaltyDonut.length ? <DonutWithLegend data={penaltyDonut} centerTop={totalPen.toLocaleString('en-AE')} centerSub="AED · Total Exposure" format={(v) => formatAed(v)} /> : <p className="py-8 text-center text-body-sm text-muted-foreground">No penalties.</p>}
        </Panel>
      </div>

      <WidePanel title="My Incidents Map" icon={<Icons.Map01 size={16} />} bodyPadding="none">
        <div className="relative w-full overflow-hidden rounded-b-lg" style={{ height: 440 }}>
          <IncidentMap incidents={incidents} colorFor={(i) => INCIDENT_STATUS[i.status].color} labelFor={(i) => `${i.id} · ${INCIDENT_STATUS[i.status].label}`} />
        </div>
      </WidePanel>

      <TablePanel title="Incidents Requiring My Action" icon={<Icons.AlertTriangle size={16} />} iconColor="var(--chart-accent-orange)">
        <thead><tr className="bg-muted/40">
          <Th>ID</Th><Th>Violation</Th><Th>Zone</Th><Th>Severity</Th><Th>Status</Th><Th right>Penalty</Th><Th right>SLA Due</Th>
        </tr></thead>
        <tbody>
          {actionRows.length === 0 ? (
            <tr><td colSpan={7} className="px-4 py-8 text-center text-body-sm text-muted-foreground">Nothing needs action — all caught up.</td></tr>
          ) : actionRows.map((i) => {
            const overdue = new Date(i.slaDueAt).getTime() < s.now;
            return (
              <tr key={i.id}>
                <Td><span className="font-semibold text-foreground">{i.id.replace('INC-2026-', '#')}</span></Td>
                <Td>{i.title}</Td>
                <Td>{s.zone(i.zoneId)?.name ?? '—'}</Td>
                <Td><SeverityPill severity={i.severity} size="sm" /></Td>
                <Td><IncidentStatusPill status={i.status} size="sm" /></Td>
                <Td right>{formatAed(pen(i))}</Td>
                <Td right><span style={{ color: overdue ? 'var(--status-error)' : undefined, fontWeight: overdue ? 600 : undefined }}>{formatDate(i.slaDueAt)}</span></Td>
              </tr>
            );
          })}
        </tbody>
      </TablePanel>
    </Dashboard>
  );
}

export function buildEspDashboardModule(s: Store, espId: string): ModuleConfig {
  return {
    id: 'esp-dashboard',
    type: 'dashboard',
    label: 'Dashboard',
    icon: Icons.BarChartSquare02,
    render: () => <EspDashboard s={s} espId={espId} />,
  };
}

/* ══════════════════════════ Inspector Management ═══════════════════════════ */

/** Deterministic Doha street/sector name for an inspector's "last location". */
const SECTORS = ['Al Sadd Street', 'Al Corniche Street', 'Msheireb Promenade', 'Al Rayyan Road', 'Lusail Boulevard', 'Salwa Road', 'Al Waab Street'];
/** Deterministic Project Officer roster (not in the catalog — PO app has one seat per zone group). */
const PROJECT_OFFICERS = ['Hessa Al Owais', 'Hamdan Al Marri', 'Noora Al Falasi'];

/** One synthesized duty on/off event for the Activity tab feed + map. */
interface DutyEvent { id: string; on: boolean; time: string; date: string; address: string; position: [number, number]; at: number; }

/** Time-frame options for the Activity tab's "Select Time Frame" control. */
const ACTIVITY_TIME_FRAMES = [
  { value: '7d', label: 'Last 7 Days', days: 7 },
  { value: '30d', label: 'Last 30 Days', days: 30 },
  { value: '90d', label: 'Last 90 Days', days: 90 },
  { value: 'all', label: 'All Time', days: Infinity },
];

/** Activity tab — two-pane duty feed (left) + duty-pin map (right), per the
 *  Tadweer January "Activity" frame. A real component (not an inline render fn)
 *  so its `useState` lives in its own fiber — `EntityDetail` invokes only the
 *  active tab's `render()`, so an inline hook here would break hook ordering.
 *  Green = Duty On, red = Duty Off (genuine duty-status semantics). */
function InspectorActivityTab({ dutyEvents, mapCenter, now }: { dutyEvents: DutyEvent[]; mapCenter: [number, number]; now: number }) {
  const [query, setQuery] = React.useState('');
  const [frame, setFrame] = React.useState('30d');
  const days = ACTIVITY_TIME_FRAMES.find((t) => t.value === frame)?.days ?? 30;
  const cutoff = now - days * 86400000;
  const q = query.trim().toLowerCase();
  const filtered = dutyEvents.filter((e) =>
    (days === Infinity || e.at >= cutoff) &&
    `${e.address} ${e.date} ${e.on ? 'duty on' : 'duty off'}`.toLowerCase().includes(q)
  );
  const pois = filtered.map((e) => ({ id: e.id, position: e.position, label: `${e.on ? 'Duty On' : 'Duty Off'} · ${e.time} · ${e.address}`, color: e.on ? 'var(--status-success)' : 'var(--status-error)' }));
  return (
    <div className="flex h-full min-h-[560px] flex-col gap-3">
      {/* top bar — search + filter over the list · Select Time Frame over the map */}
      <div className="flex items-center gap-3">
        <div className="flex w-[52%] shrink-0 items-center gap-2">
          <div className="relative flex-1">
            <Icons.SearchSm size={15} className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search anything here" className="pl-8" />
          </div>
          <button type="button" className="grid size-9 shrink-0 place-items-center rounded-md border border-border text-muted-foreground transition-colors hover:bg-muted hover:text-foreground" aria-label="Filter">
            <Icons.FilterLines size={15} />
          </button>
        </div>
        <div className="ml-auto">
          <Select value={frame} onValueChange={setFrame}>
            <SelectTrigger className="h-9 w-[188px]">
              <span className="flex items-center gap-2 truncate"><Icons.Calendar size={15} className="shrink-0 text-muted-foreground" /><SelectValue placeholder="Select Time Frame" /></span>
            </SelectTrigger>
            <SelectContent>
              {ACTIVITY_TIME_FRAMES.map((t) => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
      </div>
      {/* body — event feed (left) + duty-pin map (right) */}
      <div className="flex min-h-0 flex-1 gap-4">
        <div className="flex w-[52%] shrink-0 flex-col gap-2 overflow-y-auto pr-1">
          {filtered.length === 0 ? (
            <p className="py-8 text-center text-body-sm text-muted-foreground">No activity in this time frame.</p>
          ) : filtered.map((e) => {
            const col = e.on ? 'var(--status-success)' : 'var(--status-error)';
            return (
              <div key={e.id} className="flex items-center gap-3 rounded-lg border border-border p-3">
                <span className="grid size-9 shrink-0 place-items-center rounded-full" style={{ background: `color-mix(in srgb, ${col} 14%, transparent)`, color: col }}>
                  <Icons.Clock size={16} />
                </span>
                <div className="flex w-[84px] shrink-0 flex-col">
                  <span className="text-body-sm font-semibold text-foreground">{e.on ? 'Duty On' : 'Duty Off'}</span>
                  <span className="text-[11px] text-muted-foreground">{e.on ? 'Duty on' : 'Duty off'}</span>
                </div>
                <div className="flex min-w-0 flex-1 flex-col gap-1">
                  <div className="flex items-center gap-1.5 text-[12px] text-muted-foreground">
                    <Icons.Clock size={13} className="shrink-0" />
                    <span className="truncate"><span className="font-medium text-foreground">{e.time}</span>  {e.date}</span>
                  </div>
                  <div className="flex items-center gap-1.5 text-[12px] text-muted-foreground">
                    <Icons.MarkerPin01 size={13} className="shrink-0" />
                    <span className="truncate">{e.address}</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
        <div className="min-w-0 flex-1 overflow-hidden rounded-lg border border-border">
          <LeafletMap center={mapCenter} zoom={12} pois={pois} className="h-full w-full" />
        </div>
      </div>
    </div>
  );
}

const MON_SHORT = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

/** Timesheet tab — shift roster filtered by the SAME DS `DateRangePicker` the
 *  dashboards use (calendar + FAMS presets), plus worked-days / total-hours
 *  summary, then the clock-in/out table. Shifts are synthesized deterministically
 *  per inspector + day (past = attended/missed; future = scheduled) so the
 *  current month mirrors `genShifts` and agrees with the performance stats.
 *  Hoisted so its range hook is isolated. */
function InspectorTimesheetTab({ s, inspectorId }: { s: Store; inspectorId: string }) {
  const ref = new Date(s.now);
  const monthStart = (d: Date) => new Date(d.getFullYear(), d.getMonth(), 1);
  const monthEnd = (d: Date) => new Date(d.getFullYear(), d.getMonth() + 1, 0);
  const startOfDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate());
  const fmtRange = (a: Date, b: Date) =>
    startOfDay(a).getTime() === startOfDay(b).getTime()
      ? `${a.getDate()} ${MON_SHORT[a.getMonth()]}, ${a.getFullYear()}`
      : `${a.getDate()} ${MON_SHORT[a.getMonth()]} – ${b.getDate()} ${MON_SHORT[b.getMonth()]}, ${b.getFullYear()}`;

  const [range, setRange] = React.useState<[Date, Date]>([monthStart(ref), monthEnd(ref)]);
  const [label, setLabel] = React.useState<string>(fmtRange(monthStart(ref), monthEnd(ref)));

  const ii = Math.max(0, INSPECTORS.findIndex((x) => x.id === inspectorId));
  const HHMM = (min: number) => `${String(Math.floor((min % 1440) / 60)).padStart(2, '0')}:${String(min % 60).padStart(2, '0')}`;
  const nowDayT = startOfDay(ref).getTime();

  type Row = { key: string; dateLabel: string; type: Shift['type']; status: Shift['status']; cin: string; cout: string; dur: string; durMin: number };
  const shiftFor = (date: Date): Row | null => {
    const d = date.getDate();
    if ((d + ii) % 2 !== 0) return null;
    const type = SHIFT_TYPES[(d + ii) % 3];
    const past = startOfDay(date).getTime() < nowDayT;
    const missed = past && ((d * 7 + ii * 13) % 9 === 0);
    const status: Shift['status'] = past ? (missed ? 'missed' : 'attended') : 'scheduled';
    const dateLabel = `${String(d).padStart(2, '0')} ${MON_SHORT[date.getMonth()]}`;
    const key = `${date.getFullYear()}-${date.getMonth()}-${d}`;
    if (status !== 'attended') return { key, dateLabel, type, status, cin: '—', cout: '—', dur: '—', durMin: 0 };
    const rnd = (k: string, n: number) => Math.floor(seed01(`${k}${inspectorId}${date.getFullYear()}-${date.getMonth()}`) * n);
    const [h, m] = SHIFT_TIME[type].split(':').map(Number);
    const inMin = h * 60 + m + (rnd(`ci${d}`, 12) - 4);
    const durMin = 465 + rnd(`du${d}`, 40);
    return { key, dateLabel, type, status, cin: to12h(HHMM(inMin)), cout: to12h(HHMM(inMin + durMin)), dur: `${Math.floor(durMin / 60)}h ${durMin % 60}m`, durMin };
  };

  // Walk each day of the selected range (guarded), collecting the inspector's shifts.
  const rows: Row[] = [];
  const cur = startOfDay(range[0]);
  const end = startOfDay(range[1]).getTime();
  for (let guard = 0; cur.getTime() <= end && guard < 400; guard++) {
    const sh = shiftFor(new Date(cur));
    if (sh) rows.push(sh);
    cur.setDate(cur.getDate() + 1);
  }
  const attended = rows.filter((r) => r.status === 'attended');
  const totalMin = attended.reduce((a, r) => a + r.durMin, 0);
  const totalHours = `${Math.floor(totalMin / 60)}h ${totalMin % 60}m`;

  // Resolve a FAMS preset (relative to the demo's anchored "now") to a range.
  const resolvePreset = (preset?: string): [Date, Date] => {
    const day = (dt: Date) => startOfDay(dt);
    if (preset === 'Today') return [day(ref), day(ref)];
    if (preset === 'Yesterday') { const y = new Date(ref); y.setDate(ref.getDate() - 1); return [day(y), day(y)]; }
    if (preset === 'This week' || preset === 'Last week') {
      const mon = new Date(ref); mon.setDate(ref.getDate() - ((ref.getDay() + 6) % 7) - (preset === 'Last week' ? 7 : 0));
      const sun = new Date(mon); sun.setDate(mon.getDate() + 6); return [day(mon), day(sun)];
    }
    if (preset === 'Last month') { const lm = new Date(ref.getFullYear(), ref.getMonth() - 1, 1); return [monthStart(lm), monthEnd(lm)]; }
    if (preset === 'This year') return [new Date(ref.getFullYear(), 0, 1), new Date(ref.getFullYear(), 11, 31)];
    if (preset === 'Last year') return [new Date(ref.getFullYear() - 1, 0, 1), new Date(ref.getFullYear() - 1, 11, 31)];
    return [monthStart(ref), monthEnd(ref)]; // This month / default
  };
  const onApply = (res: DateRangeResult) => {
    const [start, endD] = res.start ? [res.start, res.end ?? res.start] : resolvePreset(res.preset);
    setRange([start, endD]);
    setLabel(res.label);
  };

  const StatusChip = ({ status }: { status: Shift['status'] }) => {
    const map: Record<Shift['status'], [string, string]> = {
      attended: ['Attended', 'var(--status-success)'],
      missed: ['Missed', 'var(--status-error)'],
      scheduled: ['Scheduled', 'var(--muted-foreground)'],
    };
    const [chipLabel, color] = map[status];
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-body-xs font-semibold" style={{ background: `color-mix(in srgb, ${color} 14%, transparent)`, color }}>
        <span className="inline-block size-1.5 rounded-full" style={{ background: color }} />{chipLabel}
      </span>
    );
  };

  return (
    <div className="flex flex-col gap-3">
      {/* date filter on top — the same DS DateRangePicker the dashboards use */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <DateRangePicker value={label} withTime={false} onApply={onApply} triggerClassName="h-9" />
        <div className="flex items-center gap-2">
          <span className="inline-flex items-center gap-1.5 rounded-md bg-secondary px-2.5 py-1 text-body-xs font-medium text-secondary-foreground">
            <Icons.CalendarCheck01 size={13} className="text-primary" />{attended.length} days worked
          </span>
          <span className="inline-flex items-center gap-1.5 rounded-md bg-secondary px-2.5 py-1 text-body-xs font-medium text-secondary-foreground">
            <Icons.Clock size={13} className="text-primary" />{totalHours} total
          </span>
        </div>
      </div>
      <div className="overflow-x-auto rounded-lg border border-border">
        <table className="w-full border-collapse">
          <thead><tr className="bg-muted/40"><Th>Date</Th><Th>Shift</Th><Th>Clock In</Th><Th>Clock Out</Th><Th>Status</Th><Th right>Hours</Th></tr></thead>
          <tbody>
            {rows.length === 0 ? (
              <tr><td colSpan={6} className="px-4 py-8 text-center text-body-sm text-muted-foreground">No shifts recorded for this period.</td></tr>
            ) : rows.map((r) => (
              <tr key={r.key}>
                <Td>{r.dateLabel}</Td>
                <Td>{r.type}</Td>
                <Td>{r.cin}</Td>
                <Td>{r.cout}</Td>
                <Td><StatusChip status={r.status} /></Td>
                <Td right>{r.dur}</Td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/** One entry in the inspector's Timeline (audit log of changes + notes). */
interface TimelineEntry { id: string; kind: 'note' | 'update'; actor: string; actorColor: string; action?: string; text?: string; images?: number; at: number; }

/** Timeline tab — an audit log of changes/updates to the Inspector entity, per
 *  the FAMS Web-Portal Timeline frame: search + filter, date-separator pills,
 *  two entry kinds (avatar + note card, and compact "UPDATED INFO." system
 *  events), a left connector rail, and a bottom note composer. Notes added via
 *  the composer append live. Hoisted so its composer/search hooks are isolated. */
function InspectorTimelineTab({ s, poName }: { s: Store; poName: string }) {
  const mkAt = (daysAgo: number, h: number, m: number) => { const d = new Date(s.now); d.setDate(d.getDate() - daysAgo); d.setHours(h, m, 0, 0); return d.getTime(); };
  const seed: TimelineEntry[] = [
    { id: 't1', kind: 'update', actor: poName, actorColor: 'var(--primary)', action: 'created the inspector profile.', at: mkAt(126, 9, 12) },
    { id: 't2', kind: 'update', actor: poName, actorColor: 'var(--primary)', action: 'assigned the inspector to a lot.', at: mkAt(126, 9, 20) },
    { id: 't3', kind: 'note', actor: poName, actorColor: 'var(--primary)', text: 'Completed onboarding and field orientation. Cleared for solo inspections across the assigned lot.', at: mkAt(120, 14, 5) },
    { id: 't4', kind: 'update', actor: 'Admin', actorColor: 'var(--chart-accent-purple)', action: 'updated contact information.', at: mkAt(64, 11, 8) },
    { id: 't5', kind: 'update', actor: poName, actorColor: 'var(--primary)', action: 'added tag “Field”.', at: mkAt(40, 16, 40) },
    { id: 't6', kind: 'note', actor: poName, actorColor: 'var(--primary)', text: 'Strong performance this cycle — zero missed shifts and consistently high inspection scores. Attached field evidence from the last route review.', images: 2, at: mkAt(2, 10, 30) },
    { id: 't7', kind: 'update', actor: poName, actorColor: 'var(--primary)', action: 'updated inspector info.', at: mkAt(0, 13, 7) },
  ];
  const [entries, setEntries] = React.useState<TimelineEntry[]>(seed);
  const [note, setNote] = React.useState('');
  const [query, setQuery] = React.useState('');

  const timeLabel = (ms: number) => { const d = new Date(ms); let h = d.getHours(); const ap = h < 12 ? 'am' : 'pm'; h = h % 12 || 12; return `${h}:${String(d.getMinutes()).padStart(2, '0')} ${ap}`; };
  const dayKey = (ms: number) => { const d = new Date(ms); return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`; };
  const dayLabel = (ms: number) => { const d = new Date(ms), r = new Date(s.now); return dayKey(ms) === dayKey(s.now) ? 'Today' : `${String(d.getDate()).padStart(2, '0')} ${MON_SHORT[d.getMonth()]}, ${d.getFullYear()}`; };

  const q = query.trim().toLowerCase();
  const groups: { key: string; label: string; items: TimelineEntry[] }[] = [];
  [...entries].filter((e) => !q || `${e.actor} ${e.action ?? ''} ${e.text ?? ''}`.toLowerCase().includes(q)).sort((a, b) => a.at - b.at).forEach((e) => {
    const key = dayKey(e.at);
    let g = groups.find((x) => x.key === key);
    if (!g) { g = { key, label: dayLabel(e.at), items: [] }; groups.push(g); }
    g.items.push(e);
  });

  const send = () => { const t = note.trim(); if (!t) return; setEntries((prev) => [...prev, { id: `u${prev.length}-${t.length}`, kind: 'note', actor: poName, actorColor: 'var(--primary)', text: t, at: s.now }]); setNote(''); };

  return (
    <div className="flex h-full min-h-[560px] flex-col gap-3">
      {/* search + filter */}
      <div className="flex items-center gap-2">
        <div className="relative flex-1">
          <Icons.SearchSm size={15} className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search timeline" className="pl-8" />
        </div>
        <button type="button" className="grid size-9 shrink-0 place-items-center rounded-md border border-border text-muted-foreground transition-colors hover:bg-muted hover:text-foreground" aria-label="Filter">
          <Icons.FilterLines size={15} />
        </button>
      </div>

      {/* feed with a left connector rail */}
      <div className="relative min-h-0 flex-1 overflow-y-auto pr-1">
        <div className="pointer-events-none absolute bottom-2 left-4 top-2 w-px bg-border" />
        <div className="flex flex-col gap-4">
          {groups.length === 0 ? (
            <p className="py-8 text-center text-body-sm text-muted-foreground">No timeline activity found.</p>
          ) : groups.map((g) => (
            <div key={g.key} className="flex flex-col gap-3">
              <div className="relative flex items-center justify-center py-1">
                <div className="absolute inset-x-0 top-1/2 h-px bg-border" />
                <span className="relative rounded-full border border-border bg-muted px-3 py-0.5 text-[11px] font-medium text-muted-foreground">{g.label}</span>
              </div>
              {g.items.map((e) => e.kind === 'note' ? (
                <div key={e.id} className="relative flex gap-3">
                  <span className="relative z-[1] shrink-0 rounded-full ring-2 ring-card"><AvatarChip name={e.actor} color={e.actorColor} size={32} /></span>
                  <div className="flex min-w-0 flex-1 flex-col gap-1.5">
                    <div className="flex items-center justify-between gap-2">
                      <span className="truncate text-[13px] font-bold uppercase tracking-wide text-foreground">{e.actor}</span>
                      <span className="shrink-0 text-[11px] text-muted-foreground">{timeLabel(e.at)}</span>
                    </div>
                    <div className="rounded-lg border border-border p-3">
                      <p className="text-body-sm leading-relaxed text-foreground/90">{e.text}</p>
                      {e.images ? (
                        <div className="mt-3 flex flex-wrap gap-2">
                          {Array.from({ length: e.images }).map((_, i) => (
                            <div key={i} className="grid size-24 place-items-center rounded-md bg-muted text-muted-foreground"><Icons.Image01 size={20} /></div>
                          ))}
                        </div>
                      ) : null}
                    </div>
                  </div>
                </div>
              ) : (
                <div key={e.id} className="relative flex items-center gap-3">
                  <span className="relative z-[1] grid size-8 shrink-0 place-items-center rounded-full bg-muted text-muted-foreground ring-2 ring-card"><Icons.Edit01 size={14} /></span>
                  <div className="flex min-w-0 flex-1 items-center justify-between gap-2">
                    <span className="truncate text-[13px]"><span className="font-bold uppercase tracking-wide text-foreground">{e.actor}</span> <span className="text-muted-foreground">{e.action}</span></span>
                    <span className="shrink-0 text-[11px] text-muted-foreground">{timeLabel(e.at)}</span>
                  </div>
                </div>
              ))}
            </div>
          ))}
        </div>
      </div>

      {/* composer */}
      <div className="shrink-0 rounded-xl border border-border p-3">
        <input
          value={note}
          onChange={(e) => setNote(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); } }}
          placeholder="Write a note here …"
          className="w-full bg-transparent text-body-sm text-foreground outline-none placeholder:text-muted-foreground"
        />
        <div className="mt-2 flex items-center justify-between">
          <div className="flex items-center gap-1 text-muted-foreground">
            <button type="button" aria-label="Attach file" className="grid size-7 place-items-center rounded-md transition-colors hover:bg-muted hover:text-foreground"><Icons.Attachment01 size={16} /></button>
            <button type="button" aria-label="Add tag" className="grid size-7 place-items-center rounded-md transition-colors hover:bg-muted hover:text-foreground"><Icons.Tag01 size={16} /></button>
          </div>
          <button type="button" onClick={send} disabled={!note.trim()} aria-label="Send note" className="grid size-8 place-items-center rounded-md bg-primary text-primary-foreground transition-opacity hover:opacity-90 disabled:opacity-40">
            <Icons.Send01 size={15} />
          </button>
        </div>
      </div>
    </div>
  );
}

/** A stored inspector document. */
interface DocItem { id: string; type: string; fileName: string; expiry: string | null; }
const DOC_TYPES = ['Emirates ID', 'Employment Contract', 'Inspector Certification', 'Medical Fitness Certificate', 'Visa Contract', 'Immigration Letter'];

/** Floating-label "Document Type" field — trigger + radio-row popover (per frame). */
function DocTypeField({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const [open, setOpen] = React.useState(false);
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button type="button" className="flex w-full items-center gap-2.5 rounded-lg border border-border bg-card px-3 py-2 text-left outline-none transition-colors hover:bg-muted/40 focus-visible:ring-2 focus-visible:ring-ring">
          <Icons.File02 size={18} className="shrink-0 text-muted-foreground" />
          <span className="flex min-w-0 flex-1 flex-col">
            <span className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">Document Type <span className="text-[var(--status-error)]">*</span></span>
            <span className={`truncate text-body-sm ${value ? 'font-medium text-foreground' : 'text-muted-foreground'}`}>{value || 'Select document type'}</span>
          </span>
          <Icons.ChevronDown size={16} className="shrink-0 text-muted-foreground" />
        </button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-[--radix-popover-trigger-width] p-1">
        {DOC_TYPES.map((t) => {
          const sel = t === value;
          return (
            <button key={t} type="button" onClick={() => { onChange(t); setOpen(false); }} className="flex w-full items-center gap-2.5 rounded-md px-2.5 py-2 text-left text-body-sm transition-colors hover:bg-muted">
              <span className={`grid size-4 shrink-0 place-items-center rounded-full border ${sel ? 'border-primary' : 'border-border'}`}>{sel && <span className="size-2 rounded-full bg-primary" />}</span>
              <span className="text-foreground">{t}</span>
            </button>
          );
        })}
      </PopoverContent>
    </Popover>
  );
}

/** Upload / Edit Document side sheet (dropzone → file row · type · expiry). */
function UploadDocSheet({ doc, initialFile, onSave, onClose }: { doc: DocItem | null; initialFile?: string; onSave: (p: { type: string; fileName: string; expiry: string | null }) => void; onClose: () => void }) {
  const editing = !!doc;
  const [fileName, setFileName] = React.useState(doc?.fileName ?? initialFile ?? '');
  const [type, setType] = React.useState(doc?.type ?? '');
  const [noExpiry, setNoExpiry] = React.useState(doc ? doc.expiry === null : false);
  const [expiry, setExpiry] = React.useState<string>(doc?.expiry ?? '');
  const [dragging, setDragging] = React.useState(false);
  const inputRef = React.useRef<HTMLInputElement>(null);
  const pick = (f?: File | null) => { if (f) setFileName(f.name); };
  const canSubmit = !!fileName && !!type && (noExpiry || !!expiry);

  return (
    <Sheet open onOpenChange={(o) => { if (!o) onClose(); }}>
      <SheetContent side="right" width="min(520px, 92vw)" className="flex flex-col p-0">
        <SheetHeader><SheetTitle>{editing ? 'Edit Document' : 'Upload Document'}</SheetTitle></SheetHeader>
        <div className="flex flex-1 flex-col gap-4 overflow-auto p-6">
          <input ref={inputRef} type="file" hidden onChange={(e) => pick(e.target.files?.[0])} accept=".png,.jpg,.jpeg,.pdf,.doc,.docx,.csv" />
          {!fileName ? (
            <div
              role="button"
              tabIndex={0}
              onClick={() => inputRef.current?.click()}
              onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
              onDragLeave={() => setDragging(false)}
              onDrop={(e) => { e.preventDefault(); setDragging(false); pick(e.dataTransfer.files?.[0]); }}
              className={`flex cursor-pointer flex-col items-center justify-center gap-2 rounded-lg border border-dashed py-8 text-center transition-colors ${dragging ? 'border-primary bg-primary/5' : 'border-border bg-secondary/40 hover:bg-secondary'}`}
            >
              <Icons.UploadCloud02 size={26} className="text-muted-foreground" />
              <p className="text-body-sm text-muted-foreground"><span className="font-medium text-primary">Drag &amp; drop</span> here, or <span className="font-medium text-primary underline">Choose files</span></p>
              <p className="text-[11px] text-muted-foreground">Supports PNG, JPEG, PDF, DOC, and CSV — up to 25 MB</p>
            </div>
          ) : (
            <div className="flex items-center gap-3 rounded-lg border border-border p-3">
              <img src={pdfFileIcon} alt="" className="size-8 shrink-0" />
              <span className="min-w-0 flex-1 truncate text-body-sm font-medium text-foreground">{fileName}</span>
              <button type="button" onClick={() => inputRef.current?.click()} className="shrink-0 text-body-sm font-semibold text-primary hover:underline">Re-Upload</button>
              <button type="button" onClick={() => setFileName('')} className="shrink-0 text-body-sm font-semibold text-[var(--status-error)] hover:underline">Delete</button>
            </div>
          )}

          <DocTypeField value={type} onChange={setType} />

          <div className="flex items-center justify-between gap-4">
            <span className="text-body-sm text-foreground">This document doesn&apos;t expire</span>
            <Switch checked={noExpiry} onCheckedChange={(v) => setNoExpiry(!!v)} />
          </div>

          {!noExpiry && (
            <DateRangePicker
              mode="single"
              field={{ label: <>Expiry Date <span className="text-[var(--status-error)]">*</span></> }}
              value={expiry || undefined}
              placeholder="Select expiry date"
              onApply={(r) => setExpiry(r.label)}
            />
          )}
        </div>
        <SheetFooter>
          <Button variant="primary" className="w-full" disabled={!canSubmit} onClick={() => canSubmit && onSave({ type, fileName, expiry: noExpiry ? null : expiry })}>
            {editing ? 'Save Changes' : 'Upload Document'}
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}

/** Delete-document confirmation (centered dialog). */
function DeleteDocDialog({ doc, onConfirm, onClose }: { doc: DocItem; onConfirm: () => void; onClose: () => void }) {
  return (
    <Dialog open onOpenChange={(o) => { if (!o) onClose(); }}>
      <DialogContent className="max-w-md">
        <div className="flex flex-col gap-4">
          <span className="grid size-11 place-items-center rounded-full" style={{ background: 'color-mix(in srgb, var(--status-error) 12%, transparent)' }}>
            <Icons.Trash01 size={20} className="text-[var(--status-error)]" />
          </span>
          <div className="flex flex-col gap-1">
            <DialogTitle className="text-h6 font-semibold text-foreground">Delete this document</DialogTitle>
            <DialogDescription className="text-body-sm text-muted-foreground">{doc.type} will be permanently deleted. This can&apos;t be undone.</DialogDescription>
          </div>
          <div className="mt-2 flex items-center justify-between gap-3">
            <Button variant="secondary" onClick={onClose}>Keep Document</Button>
            <button type="button" onClick={onConfirm} className="inline-flex h-10 items-center justify-center rounded-lg bg-[var(--status-error)] px-4 text-body-sm font-semibold text-white transition-opacity hover:opacity-90">Delete</button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

/** Documents tab — uploaded-document cards with hover ⋮ (Edit / Delete), an
 *  Upload side-sheet (drag & drop → file row · type · expiry toggle · date),
 *  an empty state, drop-anywhere, and a delete-confirm dialog. Per the FAMS
 *  Web-Portal document frames. Hoisted so its state is isolated. */
function InspectorDocumentsTab({ inspectorId }: { inspectorId: string }) {
  const seedRnd = (k: string, n: number) => Math.floor(seed01(`${k}${inspectorId}`) * n);
  const idRef = React.useRef(1000);
  const [docs, setDocs] = React.useState<DocItem[]>(() =>
    ['Emirates ID', 'Employment Contract', 'Inspector Certification', 'Medical Fitness Certificate'].map((t, i) => ({
      id: `doc-${i}`, type: t, fileName: `${t.toLowerCase().replace(/\s+/g, '-')}.pdf`,
      expiry: `${String(1 + seedRnd(`dxd${t}`, 27)).padStart(2, '0')} ${MON_SHORT[seedRnd(`dxm${t}`, 12)]}, 2026`,
    })),
  );
  const [sheet, setSheet] = React.useState<{ doc: DocItem | null; initialFile?: string } | null>(null);
  const [delTarget, setDelTarget] = React.useState<DocItem | null>(null);
  const [pageDragging, setPageDragging] = React.useState(false);

  const save = (p: { type: string; fileName: string; expiry: string | null }) => {
    const editId = sheet?.doc?.id;
    if (editId) setDocs((prev) => prev.map((d) => d.id === editId ? { ...d, ...p } : d));
    else setDocs((prev) => [...prev, { id: `doc-${idRef.current++}`, ...p }]);
    setSheet(null);
    toast.success(editId ? 'Document updated' : 'Document uploaded');
  };
  const remove = () => { if (!delTarget) return; setDocs((prev) => prev.filter((d) => d.id !== delTarget.id)); toast.success('Document deleted'); setDelTarget(null); };

  return (
    <div
      className="relative flex min-h-[420px] flex-col gap-4"
      onDragOver={(e) => { if (e.dataTransfer.types.includes('Files')) { e.preventDefault(); setPageDragging(true); } }}
      onDragLeave={(e) => { if (e.currentTarget === e.target) setPageDragging(false); }}
      onDrop={(e) => { e.preventDefault(); setPageDragging(false); const f = e.dataTransfer.files?.[0]; if (f) setSheet({ doc: null, initialFile: f.name }); }}
    >
      {docs.length > 0 && (
        <div className="flex items-center justify-between">
          <p className="text-body-sm font-medium text-muted-foreground">Uploaded Documents</p>
          <button type="button" onClick={() => setSheet({ doc: null })} className="inline-flex items-center gap-2 text-body-sm font-semibold text-primary transition-colors hover:opacity-80">
            <Icons.UploadCloud02 size={16} />Upload Document
          </button>
        </div>
      )}

      {docs.length === 0 ? (
        <div className="flex flex-1 flex-col items-center justify-center gap-3 py-16 text-center">
          <span className="grid size-16 place-items-center rounded-full bg-muted text-muted-foreground"><Icons.File02 size={28} /></span>
          <div className="flex flex-col gap-1">
            <p className="text-h6 font-semibold text-foreground">No documents yet</p>
            <p className="text-body-sm text-muted-foreground">Drop a file anywhere on this page, or click below to get started.</p>
          </div>
          <Button variant="primary" onClick={() => setSheet({ doc: null })} className="mt-1"><Icons.UploadCloud02 size={16} className="mr-2" />Upload Document</Button>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {docs.map((d) => (
            <div key={d.id} className="group flex items-center gap-3 rounded-lg border border-border p-3.5 transition-colors hover:bg-muted/30">
              <img src={pdfFileIcon} alt="" className="size-9 shrink-0" />
              <div className="flex min-w-0 flex-col">
                <span className="truncate text-body-sm font-semibold text-foreground">{d.type}</span>
                <span className="truncate text-[11px] text-muted-foreground">{d.expiry ? `Expiry Date: ${d.expiry}` : 'No expiry date'}</span>
              </div>
              <div className="ml-auto">
                <Popover>
                  <PopoverTrigger asChild>
                    <button type="button" aria-label="Document actions" className="grid size-8 place-items-center rounded-md text-muted-foreground opacity-0 transition-all hover:bg-muted hover:text-foreground focus-visible:opacity-100 group-hover:opacity-100 data-[state=open]:opacity-100">
                      <Icons.DotsVertical size={18} />
                    </button>
                  </PopoverTrigger>
                  <PopoverContent align="end" className="w-44 p-1">
                    <button type="button" onClick={() => setSheet({ doc: d })} className="flex w-full items-center gap-2 rounded-md px-2.5 py-2 text-left text-body-sm text-foreground transition-colors hover:bg-muted"><Icons.Edit01 size={15} className="text-muted-foreground" />Edit Document</button>
                    <button type="button" onClick={() => setDelTarget(d)} className="flex w-full items-center gap-2 rounded-md px-2.5 py-2 text-left text-body-sm text-[var(--status-error)] transition-colors hover:bg-[color-mix(in_srgb,var(--status-error)_10%,transparent)]"><Icons.Trash01 size={15} />Delete Document</button>
                  </PopoverContent>
                </Popover>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* drop-anywhere overlay */}
      {pageDragging && (
        <div className="pointer-events-none absolute inset-0 z-10 flex flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed border-primary bg-primary/5">
          <img src={pdfFileIcon} alt="" className="size-10" />
          <span className="text-body-sm font-semibold text-primary">Drop here</span>
        </div>
      )}

      {sheet && <UploadDocSheet doc={sheet.doc} initialFile={sheet.initialFile} onSave={save} onClose={() => setSheet(null)} />}
      {delTarget && <DeleteDocDialog doc={delTarget} onConfirm={remove} onClose={() => setDelTarget(null)} />}
    </div>
  );
}

/** A facet for the records-tab filter popup (checkbox groups). */
interface RecordFacet<T> { id: string; label: string; get: (r: T) => string; options: { value: string; label: string }[]; }

/** Reusable records tab — the SAME DS `DataTable` the pipeline list views use,
 *  with a search box + a filter popup on top (multi-select checkbox facets).
 *  Feeds the Reported-Incidents and Inspections-Conducted tabs, each scoped to a
 *  single inspector. A real component so its search/filter state is isolated
 *  (EntityDetail renders only the active tab). */
function InspectorRecordsTab<T>({ data, columns, getRowId, searchText, facets, emptyLabel }: {
  data: T[];
  columns: DataTableColumn<T>[];
  getRowId: (r: T) => string;
  searchText: (r: T) => string;
  facets: RecordFacet<T>[];
  emptyLabel: string;
}) {
  const [query, setQuery] = React.useState('');
  const [sel, setSel] = React.useState<Record<string, string[]>>({});
  const [open, setOpen] = React.useState(false);
  const q = query.trim().toLowerCase();
  const activeCount = Object.values(sel).reduce((a, v) => a + v.length, 0);
  const rows = data.filter((r) => {
    if (q && !searchText(r).toLowerCase().includes(q)) return false;
    return facets.every((f) => { const c = sel[f.id]; return !c || !c.length || c.includes(f.get(r)); });
  });
  const toggle = (fid: string, val: string) => setSel((p) => {
    const cur = p[fid] ?? [];
    return { ...p, [fid]: cur.includes(val) ? cur.filter((x) => x !== val) : [...cur, val] };
  });
  const shownFacets = facets.filter((f) => f.options.length > 0);
  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center gap-2">
        <div className="relative flex-1">
          <Icons.SearchSm size={15} className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search…" className="pl-8" />
        </div>
        <Popover open={open} onOpenChange={setOpen}>
          <PopoverTrigger asChild>
            <button
              type="button"
              className="inline-flex h-9 shrink-0 items-center gap-1.5 rounded-md border border-border px-3 text-body-sm font-medium text-foreground transition-colors hover:bg-muted"
            >
              <Icons.FilterLines size={15} />Filter
              {activeCount > 0 && (
                <span className="grid size-4 place-items-center rounded-full bg-primary text-[10px] font-bold text-primary-foreground">{activeCount}</span>
              )}
            </button>
          </PopoverTrigger>
          <PopoverContent align="end" className="w-64 p-0">
            <div className="flex items-center justify-between border-b border-border px-3 py-2">
              <span className="text-body-sm font-semibold text-foreground">Filters</span>
              {activeCount > 0 && (
                <button type="button" onClick={() => setSel({})} className="text-[11px] font-semibold text-primary hover:underline">Clear all</button>
              )}
            </div>
            <div className="max-h-72 overflow-auto p-2">
              {shownFacets.map((f) => (
                <div key={f.id} className="mb-3 last:mb-1">
                  <p className="mb-1 px-1 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">{f.label}</p>
                  {f.options.map((o) => {
                    const on = (sel[f.id] ?? []).includes(o.value);
                    return (
                      <button key={o.value} type="button" onClick={() => toggle(f.id, o.value)} className="flex w-full items-center gap-2 rounded-md px-1.5 py-1 text-left transition-colors hover:bg-muted">
                        <span className={`grid size-4 shrink-0 place-items-center rounded border ${on ? 'border-primary bg-primary text-primary-foreground' : 'border-border bg-card'}`}>
                          {on && <Icons.Check size={11} />}
                        </span>
                        <span className="text-body-sm text-foreground">{o.label}</span>
                      </button>
                    );
                  })}
                </div>
              ))}
            </div>
          </PopoverContent>
        </Popover>
      </div>
      <DataTable
        columns={columns}
        data={rows}
        getRowId={getRowId}
        emptyState={<div className="py-10 text-center text-body-sm text-muted-foreground">{emptyLabel}</div>}
      />
    </div>
  );
}

/** Inspector detail — the DS `EntityDetail` (identity panel + underline tabs):
 *  Overview · Details · Reported Incidents · Inspections Conducted · Timesheet ·
 *  Attendance Log · Documents (matches the Tadweer inspector-detail frame).
 *  Composed from the DS entity building blocks + our status pills, driven by the
 *  shared store. HR/profile fields not present in the data model are synthesized
 *  deterministically per inspector (seeded — stable across reloads). */
function InspectorProfile({ s, stat }: { s: Store; stat: InspectorStat }) {
  const zone = s.zone(stat.homeZoneId);
  const inspections = s.data.inspections.filter((i) => i.inspectorId === stat.id);
  const incidents = s.data.incidents.filter((i) => i.reportedByInspectorId === stat.id);
  const onDuty = isOnDuty(stat.id);

  /* ── deterministic HR/profile fields (invented for the demo — not in data model). */
  const rnd = (k: string, n: number) => Math.floor(seed01(`${k}${stat.id}`) * n);
  const NATIONALITIES = ['Qatar', 'Egypt', 'India', 'Pakistan', 'Jordan', 'Philippines'];
  const firstName = stat.name.split(' ')[0];
  const phone = `+971 800 123456`;
  const email = `${firstName.toLowerCase()}@tadweer.com`;
  const nationality = NATIONALITIES[rnd('nat', NATIONALITIES.length)];
  const joinYear = 2019 + rnd('jy', 5);
  const joinMonth = ['Jan', 'Mar', 'May', 'Aug', 'Oct'][rnd('jm', 5)];
  const joinDate = `${joinMonth} ${joinYear}`;
  const tenureMonths = Math.max(1, Math.round((SEED_NOW - new Date(`${joinMonth} 1, ${joinYear}`).getTime()) / (30.44 * 86400000)));
  const tenureLabel = `${Math.floor(tenureMonths / 12)} year${Math.floor(tenureMonths / 12) === 1 ? '' : 's'} ${tenureMonths % 12} month${tenureMonths % 12 === 1 ? '' : 's'}`;
  const experienceMonths = tenureMonths + 6 + rnd('exp', 24);
  const experienceLabel = `${Math.floor(experienceMonths / 12)} year${Math.floor(experienceMonths / 12) === 1 ? '' : 's'} ${experienceMonths % 12} month${experienceMonths % 12 === 1 ? '' : 's'}`;
  const streetNo = 100 + rnd('addr', 899);
  const address = `Street ${streetNo}, ${zone?.name ?? 'Doha'}, Doha, Qatar`;
  const projectOfficer = PROJECT_OFFICERS[rnd('po', PROJECT_OFFICERS.length)];
  const sector = SECTORS[rnd('sector', SECTORS.length)];

  /* ── tags (managed, add/remove wired to local state) ── */
  const [tags, setTags] = React.useState<EntityTag[]>([
    { id: 'zone', label: zone?.name ?? 'Doha' },
    { id: 'field', label: 'Field' },
  ]);
  const addTag = (label: string) => setTags((prev) => [...prev, { id: `t-${Date.now()}`, label }]);
  const removeTag = (id: string) => setTags((prev) => prev.filter((t) => t.id !== id));

  const employeeInfo = [
    { label: 'Designation', value: 'Inspector' },
    { label: 'Assigned Lot', value: zone?.name ?? '—' },
    { label: 'Employment Tenure', value: tenureLabel },
    { label: 'Overall Experience', value: experienceLabel },
    { label: 'Phone Number', value: phone },
    { label: 'Email', value: email },
    { label: 'Address', value: address },
    { label: 'Nationality', value: nationality },
    { label: 'Join Date', value: joinDate },
    { label: 'Assigned Project Officer', value: <span className="flex items-center gap-1.5"><AvatarChip name={projectOfficer} color="var(--primary)" size={18} />{projectOfficer}</span> },
  ];

  /* ── Overview ── metric grid + mini-map + category donut + trend line. ── */
  const pendingRectification = incidents.filter((i) => i.status === 'rectification_submitted').length;
  const invalidIncidents = incidents.filter((i) => i.status === 'invalid').length;
  const avgDailyIncidents = (stat.incidents / 30).toFixed(1);
  const avgDailyInspections = (stat.inspections / 30).toFixed(1);

  const categoryDonut: DonutDatum[] = CATEGORY_META
    .map((c) => ({ name: c.label, value: incidents.filter((i) => i.category === c.key).length, color: c.color }))
    .filter((d) => d.value > 0);
  const categoryTotal = categoryDonut.reduce((a, b) => a + b.value, 0);

  const trendDays = trailingDays(s.now, 30);
  const trend = trendDays.map((d, idx) => ({
    day: idx + 1,
    incidents: Math.round(wig(`ii${stat.id}`, idx, Math.max(1, stat.incidents / 10), 2)),
    inspections: Math.round(wig(`in${stat.id}`, idx, Math.max(1, stat.inspections / 10), 1.5)),
  }));

  const overview = () => (
    <div className="flex flex-col gap-5">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <EntityMetricCard label="Total Incidents Reported" value={stat.incidents} sub="lifetime" />
        <EntityMetricCard label="Total Inspections Conducted" value={stat.inspections} sub={`${stat.completed} completed`} />
        <EntityMetricCard label="Pending Rectification Reviews" value={pendingRectification} sub="awaiting ESP action" />
        <EntityMetricCard label="Total Invalid Incidents" value={invalidIncidents} sub="marked invalid" />
        <EntityMetricCard label="Avg Daily Incidents" value={avgDailyIncidents} sub="per day · 30d" />
        <EntityMetricCard label="Avg Resolution Time" value="2.4" sub="hours" />
        <EntityMetricCard label="Avg Daily Inspections" value={avgDailyInspections} sub="per day · 30d" />
        <EntityMetricCard label="Avg Inspection Time" value="2" sub="hours" />
        <EntityMetricCard label="Avg Working Time" value="7.6" sub="hours / shift" />
      </div>
      <div className="grid grid-cols-1 gap-4">
        <EntityChartCard title="Live Location" subtitle="Current position" icon={<Icons.MarkerPin01 size={15} className="text-primary" />}>
          <div className="relative h-[220px] w-full overflow-hidden rounded-md">
            <IncidentMap incidents={[]} single={zone?.center} />
            <div className="absolute left-2 top-2 flex items-center gap-1.5 rounded-md px-2 py-1 text-[11px] font-semibold text-white shadow-sm" style={{ background: onDuty ? 'var(--status-success)' : 'var(--muted-foreground)' }}>
              <span className="inline-block size-1.5 rounded-full bg-white/90" />{onDuty ? 'CLOCKED IN' : 'CLOCKED OUT'}
            </div>
          </div>
          <p className="mt-2 text-[11px] font-medium text-muted-foreground">Last Location · {sector}, {zone?.name ?? '—'}</p>
        </EntityChartCard>
        <EntityChartCard title="Reported Incidents Distribution" subtitle="By KPI category" icon={<Icons.PieChart01 size={15} className="text-primary" />}>
          {categoryDonut.length ? (
            <DonutWithLegend data={categoryDonut} centerTop={categoryTotal.toLocaleString()} centerSub="Total Incidents" />
          ) : <p className="py-8 text-center text-body-sm text-muted-foreground">No incidents reported.</p>}
        </EntityChartCard>
        <EntityChartCard title="Incident to Inspection Trend" subtitle="Trailing 30 days" icon={<Icons.LineChartUp03 size={15} className="text-primary" />}>
          <LineChart
            data={trend}
            xKey="day"
            height={240}
            showLegend
            series={[
              { dataKey: 'incidents', name: 'Incidents', color: 'var(--chart-3)' },
              { dataKey: 'inspections', name: 'Inspections', color: 'var(--primary)' },
            ]}
          />
        </EntityChartCard>
      </div>
    </div>
  );

  /* ── Details ── clean card repeating the full employee details, larger. ── */
  const detailsTab = () => (
    <EntityChartCard title="Employee Details" icon={<Icons.User01 size={15} className="text-primary" />}>
      <div className="grid grid-cols-1 gap-x-8 sm:grid-cols-2">
        {employeeInfo.map((row, i) => (
          <EntityDetailRow key={i} label={row.label} value={row.value} />
        ))}
      </div>
    </EntityChartCard>
  );

  const uniq = <U,>(a: U[]): U[] => Array.from(new Set(a));

  /* ── Reported Incidents ── the same DS DataTable the Incidents pipeline uses,
   *  scoped to this inspector, with search + filter popup on top. ── */
  const incidentColumns: DataTableColumn<Incident>[] = [
    { id: 'id', header: 'ID', accessor: (i) => i.id, width: '112px', sortable: true },
    { id: 'title', header: 'Violation', accessor: (i) => i.title, sortable: true },
    { id: 'category', header: 'Category', accessor: (i) => i.category, width: '150px', sortable: true },
    { id: 'severity', header: 'Severity', width: '116px', cell: (i) => <SeverityPill severity={i.severity} size="sm" /> },
    { id: 'zone', header: 'Zone', accessor: (i) => s.zone(i.zoneId)?.name ?? '—', width: '130px', sortable: true },
    { id: 'status', header: 'Status', width: '176px', cell: (i) => <IncidentStatusPill status={i.status} size="sm" /> },
    { id: 'reported', header: 'Reported', accessor: (i) => formatDate(i.reportedAt), width: '120px', sortable: true },
  ];
  const incidentsTab = () => (
    <InspectorRecordsTab
      data={incidents}
      columns={incidentColumns}
      getRowId={(i) => i.id}
      searchText={(i) => `${i.id} ${i.title} ${i.category} ${s.zone(i.zoneId)?.name ?? ''}`}
      facets={[
        { id: 'status', label: 'Status', get: (i) => i.status, options: uniq(incidents.map((i) => i.status)).map((v) => ({ value: v, label: INCIDENT_STATUS[v].label })) },
        { id: 'severity', label: 'Severity', get: (i) => i.severity, options: uniq(incidents.map((i) => i.severity)).map((v) => ({ value: v, label: SEVERITY[v].label })) },
        { id: 'category', label: 'Category', get: (i) => i.category, options: uniq(incidents.map((i) => i.category)).map((v) => ({ value: v, label: v })) },
      ]}
      emptyLabel="No incidents reported by this inspector."
    />
  );

  /* ── Inspections Conducted ── same table UI, scoped to this inspector. ── */
  const resultLabel = (r: string) => (r === 'compliant' ? 'Satisfactory' : r === 'non_compliant' ? 'Not Satisfactory' : r === 'partial' ? 'Partial' : r);
  const inspectionColumns: DataTableColumn<(typeof inspections)[number]>[] = [
    { id: 'id', header: 'ID', accessor: (i) => i.id, width: '120px', sortable: true },
    { id: 'title', header: 'Inspection', accessor: (i) => i.title, sortable: true },
    { id: 'type', header: 'Type', accessor: (i) => (i.type === 'adhoc' ? 'Ad-hoc' : 'Planned'), width: '100px', sortable: true },
    { id: 'zone', header: 'Zone', accessor: (i) => s.zone(i.zoneId)?.name ?? '—', width: '140px', sortable: true },
    { id: 'scheduled', header: 'Scheduled', accessor: (i) => formatDate(i.scheduledFor), width: '130px', sortable: true },
    { id: 'status', header: 'Status', width: '124px', cell: (i) => <InspectionStatusPill status={i.status} size="sm" /> },
    { id: 'result', header: 'Result', width: '150px', cell: (i) => (i.result ? <InspectionResultPill result={i.result} size="sm" /> : <span className="text-muted-foreground">—</span>) },
  ];
  const inspectionsTab = () => (
    <InspectorRecordsTab
      data={inspections}
      columns={inspectionColumns}
      getRowId={(i) => i.id}
      searchText={(i) => `${i.id} ${i.title} ${s.zone(i.zoneId)?.name ?? ''}`}
      facets={[
        { id: 'status', label: 'Status', get: (i) => i.status, options: uniq(inspections.map((i) => i.status)).map((v) => ({ value: v, label: INSPECTION_STATUS[v].label })) },
        { id: 'type', label: 'Type', get: (i) => i.type, options: uniq(inspections.map((i) => i.type)).map((v) => ({ value: v, label: v === 'adhoc' ? 'Ad-hoc' : 'Planned' })) },
        { id: 'result', label: 'Result', get: (i) => i.result ?? '', options: uniq(inspections.map((i) => i.result).filter(Boolean) as string[]).map((v) => ({ value: v, label: resultLabel(v) })) },
      ]}
      emptyLabel="No inspections conducted by this inspector."
    />
  );

  /* ── Timesheet ── month roster with a date (month) filter on top. ── */
  const timesheetTab = () => <InspectorTimesheetTab s={s} inspectorId={stat.id} />;

  /* ── Activity ── two-pane duty feed (left) + duty-pin map (right). Duty
   *  on/off events are synthesized deterministically (~12) around the
   *  inspector's home zone; green = Duty On, red = Duty Off (genuine duty-
   *  status semantics — allowed outside the primary-blue chrome). Rendered via
   *  the hoisted <InspectorActivityTab> so its search-state hook is isolated. ── */
  const STREET_NOS = [102, 118, 123, 140, 156, 178, 190, 205, 221, 238, 250, 267];
  const dutyEvents: DutyEvent[] = Array.from({ length: 12 }, (_, idx) => {
    const on = idx % 2 === 0;
    const dayOffset = 11 - idx;
    const hour = on ? 9 : 17;
    const minute = rnd(`dtm${idx}`, 45);
    const d = new Date(s.now); d.setDate(d.getDate() - Math.floor(dayOffset / 2)); d.setHours(hour, minute, 0, 0);
    const z = ZONES[rnd(`dz${idx}`, ZONES.length)];
    const streetNo = STREET_NOS[rnd(`dst${idx}`, STREET_NOS.length)];
    const jitter = () => (seed01(`djit${stat.id}${idx}`) - 0.5) * 0.02;
    return {
      id: `duty-${stat.id}-${idx}`,
      on,
      time: `${String(hour % 12 === 0 ? 12 : hour % 12).padStart(2, '0')}:${String(minute).padStart(2, '0')} ${hour < 12 ? 'AM' : 'PM'}`,
      date: `${String(d.getDate()).padStart(2, '0')} ${d.toLocaleString('en-US', { month: 'short' })}, ${String(d.getFullYear()).slice(-2)}`,
      address: `${streetNo} ${z.name} Avenue, Doha, Qatar`,
      position: [z.center.lat + jitter(), z.center.lng + jitter()] as [number, number],
      at: d.getTime(),
    };
  }).reverse();
  const activityMapCenter: [number, number] = zone?.center ? [zone.center.lat, zone.center.lng] : DOHA_CENTER;

  /* ── Documents ── hover ⋮ actions + upload/edit sheet + delete confirm. ── */
  const documentsTab = () => <InspectorDocumentsTab inspectorId={stat.id} />;

  const tabs: EntityDetailTab[] = [
    { id: 'overview', label: 'Overview', render: overview },
    { id: 'details', label: 'Details', render: detailsTab },
    { id: 'incidents', label: 'Reported Incidents', render: incidentsTab },
    { id: 'inspections', label: 'Inspections Conducted', render: inspectionsTab },
    { id: 'shift-schedule', label: 'Shift Schedule', render: () => <InspectorShiftScheduleTab s={s} inspectorId={stat.id} /> },
    { id: 'activity', label: 'Activity', render: () => <InspectorActivityTab dutyEvents={dutyEvents} mapCenter={activityMapCenter} now={s.now} /> },
    { id: 'timesheet', label: 'Timesheet', render: timesheetTab },
    { id: 'documents', label: 'Documents', render: documentsTab },
    { id: 'timeline', label: 'Timeline', render: () => <InspectorTimelineTab s={s} poName={projectOfficer} /> },
  ];

  const dutyBadge = (
    <span className="flex items-center gap-1.5 rounded-md px-2 py-1 text-[11px] font-semibold text-white shadow-sm" style={{ background: onDuty ? 'var(--status-success)' : 'var(--muted-foreground)' }}>
      <span className="inline-block size-1.5 rounded-full bg-white/90" />{onDuty ? 'CLOCKED IN' : 'CLOCKED OUT'}
    </span>
  );

  return (
    <EntityDetail
      image={inspectorIllustration}
      imageFit="contain"
      imageBg="color-mix(in srgb, var(--primary) 8%, var(--card))"
      avatarFallback={initials(stat.name)}
      avatarColor={stat.avatarColor}
      statusOverlay={dutyBadge}
      name={stat.name}
      entityId={stat.badge}
      tags={tags}
      tagSuggestions={['Field', 'Senior', 'Trainee', 'Night Shift', zone?.name ?? 'Doha']}
      onAddTag={addTag}
      onRemoveTag={removeTag}
      infoTitle="Employee Details"
      info={employeeInfo}
      tabs={tabs}
    />
  );
}

export function buildInspectorMgmtData(s: Store): EntityModuleData<InspectorStat> {
  const rows = inspectorStats(s);
  // Deterministic join-date label — mirrors InspectorProfile's synthesis so the
  // list and detail agree for the same inspector (both seeded off `r.id`).
  const joinLabel = (id: string) => {
    const rnd = (k: string, n: number) => Math.floor(seed01(`${k}${id}`) * n);
    return `${['Jan', 'Mar', 'May', 'Aug', 'Oct'][rnd('jm', 5)]} ${2019 + rnd('jy', 5)}`;
  };
  const columns: DataTableColumn<InspectorStat>[] = [
    {
      id: 'name', header: 'Employee', accessor: (r) => r.name, sortable: true,
      cell: (r) => (
        <span className="flex items-center gap-3">
          <AvatarChip name={r.name} color={r.avatarColor} size={32} />
          <span className="truncate font-semibold text-foreground">{r.name}</span>
        </span>
      ),
    },
    { id: 'badge', header: 'ID', accessor: (r) => r.badge, width: '110px' },
    { id: 'designation', header: 'Designation', accessor: () => 'Inspector', width: '120px' },
    { id: 'incidents', header: 'Incidents Reported', accessor: (r) => r.incidents, width: '150px', sortable: true, align: 'right' },
    { id: 'inspections', header: 'Inspections Conducted', accessor: (r) => r.inspections, width: '170px', sortable: true, align: 'right' },
    {
      id: 'contact', header: 'Contact', width: '100px',
      cell: () => (
        <span className="flex items-center gap-1.5">
          <button type="button" className="grid size-7 place-items-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-primary" aria-label="Call"><Icons.Phone size={14} /></button>
          <button type="button" className="grid size-7 place-items-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-primary" aria-label="Email"><Icons.Mail01 size={14} /></button>
        </span>
      ),
    },
    { id: 'joinDate', header: 'Join Date', accessor: (r) => joinLabel(r.id), width: '110px' },
    {
      id: 'tags', header: 'Tags', width: '160px',
      cell: (r) => (
        <span className="flex flex-wrap items-center gap-1">
          <span className="rounded-[2px] border border-primary bg-secondary px-1.5 py-0.5 text-[10px] font-semibold text-primary">{s.zone(r.homeZoneId)?.name ?? '—'}</span>
          <span className="rounded-[2px] border border-primary bg-secondary px-1.5 py-0.5 text-[10px] font-semibold text-primary">Field</span>
        </span>
      ),
    },
  ];
  const mapMarkers: MapMarker[] = rows.map((r) => {
    const z = s.zone(r.homeZoneId);
    return {
      id: r.id,
      position: [z?.center.lat ?? DOHA_CENTER[0], z?.center.lng ?? DOHA_CENTER[1]] as [number, number],
      label: r.name,
      status: isOnDuty(r.id) ? 'reporting' : 'idle',
    };
  });
  return {
    columns,
    rows,
    getRowId: (r) => r.id,
    // Card (grouped-list) view row — richer ListRow with avatar + status pills.
    toListItem: (r) => ({
      id: r.id,
      leading: <AvatarChip name={r.name} color={r.avatarColor} size={38} />,
      title: r.name,
      subtitle: `${r.badge} · ${s.zone(r.homeZoneId)?.name ?? '—'}`,
      trailing: (
        <span className="flex items-center gap-2">
          <span className="hidden text-body-xs text-muted-foreground sm:inline">{r.inspections} insp · {r.incidents} inc</span>
          <DutyPill on={isOnDuty(r.id)} />
          <CompliancePill pct={r.compliance} />
        </span>
      ),
    }),
    // Geo data for the Map / Hybrid views — inspectors at their home zone.
    map: { center: DOHA_CENTER, markers: mapMarkers },
    searchText: (r) => `${r.name} ${r.badge} ${s.zone(r.homeZoneId)?.name ?? ''}`,
    facets: [
      { col: 'duty', label: 'Duty', icon: 'Clock', get: (r) => (isOnDuty(r.id) ? 'on' : 'off'), options: [{ value: 'on', label: 'On Duty' }, { value: 'off', label: 'Off Duty' }] },
    ],
    sortFields: [
      { key: 'inspections', label: 'Inspections', get: (r) => r.inspections },
      { key: 'compliance', label: 'Compliance', get: (r) => r.compliance },
      { key: 'score', label: 'Avg Score', get: (r) => r.avgScore },
      { key: 'incidents', label: 'Incidents', get: (r) => r.incidents },
    ],
    toDetail: (r): DetailDescriptor => ({
      id: r.id, label: r.name, category: r.badge,
      render: () => <InspectorProfile s={s} stat={r} />,
    }),
  };
}

export function buildInspectorMgmtModule(s: Store): ModuleConfig {
  return {
    id: 'inspectors', type: 'entity', label: 'Inspectors', icon: Icons.Users01,
    tabKind: 'view',
    // Inspector Management is a single List View.
    tabs: [
      { id: 'list', kind: 'list', label: 'List View' },
    ],
    data: buildInspectorMgmtData(s),
  };
}

/* ══════════════════════════════ (removed) ══════════════════════════════════
 * The old month-calendar ShiftScheduler + Inspector Compliance Monitoring
 * modules were replaced by the store-backed "Inspector Shifts" module — see
 * src/app/inspector-shifts.tsx (buildInspectorShiftsModule). The deterministic
 * genShifts/Shift/SHIFT_TIME/SHIFT_TYPES roster is retained above only because
 * the Timesheet tab + inspectorStats + Tasks still derive from it.
 * ─────────────────────────────────────────────────────────────────────────── */


/* ══════════════ Tasks (INS) — planned for the inspector by the PO ═══════════ */
/* Tasks are the current inspector's shift roster turned into planned field work
 * (service + zone + planner note). Shown in IIMS · Inspector; clicking opens a
 * task detail side sheet. Status follows the shift (planned/completed/missed). */

const TASK_SERVICES = ['Bin Washing', 'Container Collection', 'Mechanical Street Sweeping', 'Manual Sweeping', 'Fleet & Vehicle', 'EHS Compliance'] as const;
const SHIFT_TIME: Record<Shift['type'], string> = { Morning: '06:00', Evening: '14:00', Night: '22:00' };
const PLANNER_NOTES = [
  'Prioritise bin-washing compliance and capture before/after evidence.',
  'Verify contractor manpower against the contract roster.',
  'Spot-check PPE and EHS signage at active work zones.',
  'Re-inspect yesterday’s flagged street segments.',
  'Confirm container collection schedule adherence.',
];

export interface Task {
  id: string; day: number; dateLabel: string; time: string; endTime?: string; shift: Shift['type'];
  zoneId: string; service: string; status: 'planned' | 'completed' | 'missed'; note: string; title: string;
  /** Lot + sectors line shown as the card headline (e.g. "Lot 1: Sector A, …"). */
  lots?: string;
  /** Domain model: a Lot is an operational Zone; its child Sectors are the
   *  inspector's unit of work; the Lot is under one ESP's contract for a job. */
  lotNo?: number;
  sectors?: string[];
  espId?: string;
  contractFrom?: string;
  contractTo?: string;
  /** Task-detail (side-sheet) fields — matches the Tadweer inspection card. */
  pid?: string;              // plan / project id, e.g. "PID-231454"
  inspectionType?: string;   // e.g. "Bin Inspection"
  ref?: string;              // asset/subject id shown as the title, e.g. "BIN-240L-0098"
  specLabel?: string;        // type-specific field label, e.g. "Bin Type"
  specValue?: string;        // its value, e.g. "360L"
  dateTime?: string;         // full inspection date+time, e.g. "13 Feb, 2026 04:24 PM"
}

export function buildTasks(s: Store): Task[] {
  const me = s.currentInspector();
  const ref = new Date(s.now);
  const monthShort = ref.toLocaleString('en-US', { month: 'short' });
  return genShifts(s)
    .filter((sh) => sh.inspectorId === me.id)
    .map((sh, idx) => {
      const zone = INSPECTORS_ZONE_ROTATION[(idx) % INSPECTORS_ZONE_ROTATION.length];
      const service = TASK_SERVICES[idx % TASK_SERVICES.length];
      const status: Task['status'] = sh.status === 'attended' ? 'completed' : sh.status === 'missed' ? 'missed' : 'planned';
      return {
        id: `task-${me.id}-${sh.day}`,
        day: sh.day,
        dateLabel: `${sh.day} ${monthShort}`,
        time: SHIFT_TIME[sh.type],
        shift: sh.type,
        zoneId: zone,
        service,
        status,
        note: PLANNER_NOTES[idx % PLANNER_NOTES.length],
        title: `${service} — ${(s.zone(zone)?.name ?? zone)}`,
      };
    });
}
/**
 * ZONE SYNC (2026-09-01 cross-module data audit): this rotation used the
 * ported prototype's UAE zone ids (`z-deira`, `z-burdubai`, …), none of which
 * exist in `@/data/catalog`'s ZONES since that catalogue was rebased onto the
 * Operations Center's 16 Qatar catchment zones — so every planner task
 * rendered its zone as "—" and its title as a raw id. These are 8 real ids
 * from that catalogue.
 */
const INSPECTORS_ZONE_ROTATION = ['z-alsadd', 'z-msheireb', 'z-industrial-area-1', 'z-westbay', 'z-lusail-marina', 'z-doha-port', 'z-althumama', 'z-doha-corniche'];

/** The current inspector's UPCOMING scheduled tasks (today → next days), all
 *  'planned'. Used by the Home "Scheduled Tasks" list so it's always populated
 *  regardless of where the anchored "now" falls in the roster month. */
export function upcomingTasks(s: Store, count = 6): Task[] {
  const me = s.currentInspector();
  const now = new Date(s.now);
  return Array.from({ length: count }, (_, i) => {
    const d = new Date(now); d.setDate(now.getDate() + i);
    const service = TASK_SERVICES[i % TASK_SERVICES.length];
    const zoneId = INSPECTORS_ZONE_ROTATION[i % INSPECTORS_ZONE_ROTATION.length];
    const shift = SHIFT_TYPES[i % SHIFT_TYPES.length];
    return {
      id: `task-up-${me.id}-${i}`,
      day: d.getDate(),
      dateLabel: i === 0 ? 'Today' : i === 1 ? 'Tomorrow' : d.toLocaleString('en-US', { day: 'numeric', month: 'short' }),
      time: SHIFT_TIME[shift],
      shift,
      zoneId,
      service,
      status: 'planned',
      note: PLANNER_NOTES[i % PLANNER_NOTES.length],
      title: `${service} — ${s.zone(zoneId)?.name ?? zoneId}`,
    };
  });
}

/* The inspector's Home day-view plan. Domain model:
 *   • A Lot IS an operational Zone (from the catalog).
 *   • Its child Sectors are what the inspector actually walks/inspects; issues
 *     found there become incidents scoped to that sector.
 *   • Each Lot is under ONE ESP's contract (a defined job for a fixed period);
 *     the contracted ESP is the one whose `zoneIds` cover the lot's zone.
 * A task = the sectors of one lot the inspector must cover in a time window.
 * Completed lots drop off Home so it only shows what's still to do today. */
const SECTOR_LETTERS = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'];
const TODAY_LOTS: {
  no: number; zoneId: string; sectors: number; job: string; range: [string, string];
  type: string; ref: string; pid: string; specLabel: string; specValue: string;
}[] = [
  { no: 1, zoneId: 'z-alsadd', sectors: 5, job: 'Bin Washing', range: ['08:00', '12:00'], type: 'Bin Inspection', ref: 'BIN-240L-0098', pid: 'PID-231454', specLabel: 'Bin Type', specValue: '360L' },
  { no: 2, zoneId: 'z-westbay', sectors: 3, job: 'Container Collection', range: ['10:00', '14:00'], type: 'Container Inspection', ref: 'CNT-1100-0042', pid: 'PID-231455', specLabel: 'Container Type', specValue: '1100L' },
  { no: 3, zoneId: 'z-industrial-area-1', sectors: 3, job: 'Mechanical Street Sweeping', range: ['14:00', '18:00'], type: 'Sweeping Inspection', ref: 'RTE-MS-014', pid: 'PID-231456', specLabel: 'Route Length', specValue: '8.2 km' },
  { no: 4, zoneId: 'z-msheireb', sectors: 2, job: 'Manual Sweeping', range: ['18:00', '22:00'], type: 'Sweeping Inspection', ref: 'SEG-MN-021', pid: 'PID-231457', specLabel: 'Segment', specValue: 'SEG-77' },
];
const shiftForHour = (hhmm: string): Shift['type'] => {
  const h = parseInt(hhmm.slice(0, 2), 10);
  return h < 12 ? 'Morning' : h < 18 ? 'Evening' : 'Night';
};
const to12h = (hhmm: string) => {
  let [h, m] = hhmm.split(':').map(Number);
  const ap = h >= 12 ? 'PM' : 'AM';
  h = h % 12 || 12;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')} ${ap}`;
};
/** The ESP contracted for a lot = the first ESP whose zoneIds cover its zone. */
const contractedEsp = (zoneId: string) => ESPS.find((e) => e.zoneIds.includes(zoneId)) ?? ESPS[0];

/** Local 'YYYY-MM-DD' for the anchored "now" (matches how PlannedShift.dateISO
 *  is stored by the PO planner — local date, not UTC). */
function isoDay(ms: number): string {
  const d = new Date(ms);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

/** PO-scheduled shifts (from Inspector Shifts → Planning, stored in
 *  `s.data.shifts`) for the current inspector whose date === the anchored today.
 *  Surfaced as Home "My Tasks" cards so a shift the PO plans reaches the
 *  inspector. Each maps 1:1 to a PlannedShift; the card's "Start Inspection"
 *  prefills the New Inspection flow from the shift (lot/zone, sector, task). */
function shiftTasksForToday(s: Store, opts?: { includeCompleted?: boolean }): Task[] {
  const me = s.currentInspector();
  const now = new Date(s.now);
  const dateFull = `${now.getDate()} ${now.toLocaleString('en-US', { month: 'short' })}, ${now.getFullYear()}`;
  const year = now.getFullYear();
  const todayISO = isoDay(s.now);
  const done = s.data.completedTaskIds ?? [];
  return (s.data.shifts ?? [])
    .filter((sh) => sh.inspectorId === me.id && sh.dateISO === todayISO)
    .sort((a, b) => a.start.localeCompare(b.start))
    .map((sh): Task => {
      // A shift's task id is the store shift id, so completing it is idempotent
      // and the Shift Schedule tab / planner stay the single source of truth.
      const id = `shift-${sh.id}`;
      const esp = contractedEsp(sh.lotId);
      const lotIndex = ZONES.findIndex((z) => z.id === sh.lotId);
      const lotNo = lotIndex >= 0 ? lotIndex + 1 : undefined;
      const headline = `Lot${lotNo ? ` ${lotNo}` : ''} · ${s.zone(sh.lotId)?.name ?? sh.lotId}: ${sh.sector}`;
      return {
        id,
        day: now.getDate(),
        dateLabel: dateFull,
        time: sh.start,
        endTime: sh.end,
        shift: shiftForHour(sh.start),
        zoneId: sh.lotId,
        service: sh.task,
        status: done.includes(id) ? 'completed' : 'planned',
        note: sh.notes || `Scheduled by Project Officer — ${sh.task} at ${s.zone(sh.lotId)?.name ?? sh.lotId}, ${sh.sector}.`,
        title: headline,
        lots: headline,
        lotNo,
        sectors: [sh.sector],
        espId: esp.id,
        contractFrom: `1 Jan ${year}`,
        contractTo: `31 Dec ${year}`,
        pid: sh.id.toUpperCase(),
        inspectionType: sh.task,
        ref: headline,
        specLabel: 'Sector',
        specValue: sh.sector,
        dateTime: `${dateFull} ${to12h(sh.start)}`,
      };
    })
    .filter((t) => (opts?.includeCompleted ? true : t.status !== 'completed'));
}

/** The current inspector's tasks for TODAY only, excluding completed ones (they
 *  drop off Home once done). Used by the Home "My Tasks" day list. Includes both
 *  the demo lot plan AND any shifts the PO scheduled for this inspector today. */
export function todayTasks(s: Store, opts?: { includeCompleted?: boolean }): Task[] {
  const me = s.currentInspector();
  const now = new Date(s.now);
  const dateFull = `${now.getDate()} ${now.toLocaleString('en-US', { month: 'short' })}, ${now.getFullYear()}`;
  const year = now.getFullYear();
  const done = s.data.completedTaskIds ?? [];
  const rows = TODAY_LOTS
    .map((p, i): Task => {
      const id = `task-today-${me.id}-${i}`;
      const sectors = SECTOR_LETTERS.slice(0, p.sectors).map((l) => `Sector ${l}`);
      const esp = contractedEsp(p.zoneId);
      const headline = `Lot ${p.no}: ${sectors.join(', ')}`;
      return {
        id,
        day: now.getDate(),
        dateLabel: dateFull,
        time: p.range[0],
        endTime: p.range[1],
        shift: shiftForHour(p.range[0]),
        zoneId: p.zoneId,
        service: p.job,
        status: done.includes(id) ? 'completed' : 'planned',
        note: PLANNER_NOTES[i % PLANNER_NOTES.length],
        title: headline,
        lots: headline,
        lotNo: p.no,
        sectors,
        espId: esp.id,
        contractFrom: `1 Jan ${year}`,
        contractTo: `31 Dec ${year}`,
        pid: p.pid,
        inspectionType: p.type,
        ref: p.ref,
        specLabel: p.specLabel,
        specValue: p.specValue,
        dateTime: `${dateFull} ${to12h(p.range[0])}`,
      };
    });
  const lotRows = opts?.includeCompleted ? rows : rows.filter((t) => t.status !== 'completed');
  // PO-scheduled shifts for today lead the list (they're the assigned plan);
  // the standing demo lot plan follows.
  return [...shiftTasksForToday(s, opts), ...lotRows];
}

const TASK_STATUS: Record<Task['status'], { label: string; color: string }> = {
  planned: { label: 'Scheduled', color: 'var(--status-warning)' },
  completed: { label: 'Completed', color: 'var(--status-success)' },
  missed: { label: 'Missed', color: 'var(--status-error)' },
};

/* Filled solid status badge — same design as the Home "My Tasks" cards. */
export function TaskStatusPill({ status }: { status: Task['status'] }) {
  const m = TASK_STATUS[status];
  return (
    <span className="inline-flex w-fit items-center rounded-lg px-3 py-1.5 text-[13px] font-bold uppercase tracking-wide text-white" style={{ background: m.color }}>
      {m.label}
    </span>
  );
}

/** My Tasks module — the same tasks as the Home "My Tasks" day view, presented
 *  as a table. Columns mirror the Home card / detail info; rows include the
 *  day's completed lots too (Home hides those). `renderDetail` reuses the exact
 *  same side sheet the Home cards open, so list + detail stay fully in sync. */
export function buildTasksModule(s: Store, renderDetail: (task: Task) => React.ReactNode): ModuleConfig {
  const tasks = todayTasks(s, { includeCompleted: true });
  const byId = new Map(tasks.map((t) => [t.id, t]));
  const t = (id: string) => byId.get(id)!;
  const columns: DataTableColumn<Task>[] = [
    { id: 'ref', header: 'Reference', accessor: (r) => r.ref ?? r.title, cell: (r) => <span className="font-semibold text-foreground">{r.ref ?? r.title}</span>, sortable: true },
    { id: 'type', header: 'Inspection', accessor: (r) => r.inspectionType ?? '—', width: '160px', sortable: true },
    { id: 'sectors', header: 'Sectors', accessor: (r) => r.lots ?? r.sectors?.join(', ') ?? '', cell: (r) => <span className="text-foreground">{r.lots ?? r.sectors?.join(', ')}</span>, sortable: true },
    { id: 'datetime', header: 'Date & Time', accessor: (r) => r.dateTime ?? r.dateLabel, width: '190px', sortable: true },
    { id: 'status', header: 'Status', accessor: (r) => r.status, cell: (r) => <TaskStatusPill status={r.status} />, width: '150px', sortable: true },
  ];
  const data: EntityModuleData<Task> = {
    columns,
    rows: tasks,
    getRowId: (r) => r.id,
    searchText: (r) => `${r.ref ?? ''} ${r.title} ${r.inspectionType ?? ''} ${r.lots ?? ''} ${s.zone(r.zoneId)?.name ?? ''}`,
    facets: [
      { col: 'status', label: 'Status', icon: 'Flag06', get: (r) => r.status, options: (['planned', 'completed', 'missed'] as const).map((v) => ({ value: v, label: TASK_STATUS[v].label })) },
      { col: 'type', label: 'Inspection', icon: 'ClipboardCheck', get: (r) => r.inspectionType ?? '', options: Array.from(new Set(tasks.map((x) => x.inspectionType).filter(Boolean))).map((v) => ({ value: v as string, label: v as string })) },
    ],
    sortFields: [{ key: 'datetime', label: 'Date & Time', get: (r) => r.day }],
    toDetail: (r): DetailDescriptor => ({ id: r.id, label: r.ref ?? r.title, category: 'My Tasks', render: () => renderDetail(t(r.id)) }),
  };
  return { id: 'tasks', type: 'entity', label: 'My Tasks', icon: Icons.Calendar, data };
}
