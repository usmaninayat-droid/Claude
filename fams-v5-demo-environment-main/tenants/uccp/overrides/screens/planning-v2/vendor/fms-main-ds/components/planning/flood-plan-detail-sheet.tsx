import * as React from 'react';
import * as Icons from '../../icons';
import { cn } from '../utils/cn';
import {
  Button, Sheet, SheetContent, SheetTitle, Popover, PopoverTrigger, PopoverContent,
  Input, Switch, Badge, RadioGroup, RadioGroupItem,
  Select, SelectTrigger, SelectValue, SelectContent, SelectItem, Textarea,
} from '../primitives';
import { SearchableSelect } from '../basics';
import { DataTable } from '../data-display';
import type { DataTableColumn } from '../data-display';
import { MapView } from '../map';
import type { MapMarker, MapZone, MapRoute } from '../map';
import { optimizeDepotAssemblyRoute } from './flood-route';
import depotPinUrl from '../map/poi-pins/depot.svg';
import assemblyPinUrl from '../map/poi-pins/assembly.svg';
import dischargePinUrl from '../map/poi-pins/discharge.svg';
import {
  FLOOD_STATUS_LABEL, FLOOD_STATUS_TONE, fmtForecastDate, forecastDays,
  FLOOD_SHIFT_CONFIG, FLOOD_SHIFTS, findRosterConflicts, conflictMessage, shiftEnded, shiftUnderway, todayIso,
  type FloodPlanCatalog, type FloodPlanRecord, type FloodPlanStatus, type FloodRosterEntry, type FloodShift, type FloodPlanHistoryEvent,
  type FloodVehicleUnit, type FloodCrewMember, type RosterConflict,
  generateRosterDates, dayNameOf, isoPlusDays, DAY_SHORT, ROSTER_PREVIEW_CAP,
  type RosterFrequency, type RosterRecurrence,
} from './flood-plan-types';

/**
 * FloodPlanDetailSheet — the ONE plan detail drawer Smart Planning opens from
 * its List, Hybrid and Calendar views (FM-6365), laid out like Tadweer's
 * "Edit Plan" sheet: window controls (close · minimise) top-left, a status
 * dropdown top-right, an "Edit Plan <name>" stepper rail (Basic Setup ·
 * Interactive Planning · Shift Rostering), the step's form in the middle
 * and a collapsible Timeline + comments panel on the right.
 *
 *   · Draft / Rejected  → "Edit" makes the step's fields editable in place.
 *   · In Review         → read-only; the status dropdown offers Approve / Reject.
 *   · Approved          → read-only; "Edit as new version" saves a NEW Draft
 *                         version (this one becomes Superseded); rostering
 *                         lives in step 3 and the status dropdown.
 * No Route step — a flood plan holds locations only.
 */

export interface FloodPlanDetailSheetProps {
  /** Step the sheet opens on (0 Basic Setup · 1 Interactive Planning · 2 Shift Rostering). @default 0 */
  initialStep?: Step;
  plan: FloodPlanRecord | null;
  catalog: FloodPlanCatalog;
  /** other plans' names (for the unique-name rule while editing). */
  existingNames: string[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** in-place save (Draft / Rejected) or new-version save (Approved). */
  onSave: (updated: FloodPlanRecord, mode: 'in-place' | 'new-version') => void;
  onTransition: (plan: FloodPlanRecord, to: FloodPlanStatus, note?: string) => void;
  /** open the roster assignment sheet — for a new entry, or an existing one. */
  onRoster: (plan: FloodPlanRecord, entry?: FloodRosterEntry) => void;
  /** post a comment to the plan's timeline. */
  onComment?: (plan: FloodPlanRecord, text: string) => void;
}

const SHIFT_ICON: Record<FloodShift, React.ReactNode> = {
  Morning: <Icons.Sun size={14} />, Afternoon: <Icons.SunSetting02 size={14} />, Night: <Icons.CloudMoon size={14} />,
};

type Step = 0 | 1 | 2;
const STEPS = [
  { tag: 'STEP 1', name: 'Basic Setup', icon: <Icons.List size={18} /> },
  { tag: 'STEP 2', name: 'Interactive Planning', icon: <Icons.RegionPin size={18} /> },
  { tag: 'STEP 3', name: 'Shift Rostering', icon: <Icons.Clock size={18} /> },
];

/* ── Tadweer-style 80px outlined field (label · value · optional sub-line) ── */
function Fld({ label, required, value, sub, icon, chevron, children, error, className }: {
  label: string; required?: boolean; value?: React.ReactNode; sub?: React.ReactNode; icon?: React.ReactNode; chevron?: boolean; children?: React.ReactNode; error?: string; className?: string;
}) {
  return (
    <div className={cn('flex flex-col gap-1', className)}>
      <div className={cn('flex min-h-[80px] items-center gap-3 rounded-[6px] border bg-white px-4 py-3 focus-within:border-primary', error ? 'border-[var(--status-error)]' : 'border-[var(--gray-300)]')}>
        {icon && <span className="shrink-0 text-[var(--gray-500)]">{icon}</span>}
        <div className="flex min-w-0 flex-1 flex-col gap-1">
          <span className="text-[14px] font-medium text-[var(--gray-500)]">{label}{required && <span className="text-[var(--gray-500)]"> *</span>}</span>
          {children ?? <span className={cn('truncate text-[18px] font-medium', value ? 'text-[var(--gray-900)]' : 'text-[var(--gray-400)]')}>{value || '—'}</span>}
          {sub && <span className="text-[14px] font-medium text-[var(--gray-500)]">{sub}</span>}
        </div>
        {chevron && <Icons.ChevronDown size={18} className="shrink-0 text-[var(--gray-500)]" />}
      </div>
      {error && <span className="text-[12px] font-medium text-[var(--status-error)]">{error}</span>}
    </div>
  );
}
/** Legacy compact field kept for the roster sheet below. */
function Field({ label, children, error }: { label: string; children: React.ReactNode; error?: string }) {
  return (
    <label className="flex flex-col gap-1">
      <span className={cn('flex min-h-14 w-full flex-col justify-center gap-1 rounded-[4px] border bg-white px-2 py-2 focus-within:border-primary', error ? 'border-[var(--status-error)]' : 'border-[var(--gray-300)]')}>
        <span className="text-[12px] font-semibold text-[var(--gray-500)]">{label}</span>
        {children}
      </span>
      {error && <span className="text-[12px] font-medium text-[var(--status-error)]">{error}</span>}
    </label>
  );
}
const INPUT = 'w-full bg-transparent text-[18px] font-medium text-[var(--gray-900)] outline-none placeholder:text-[var(--gray-400)] focus-visible:ring-2 focus-visible:ring-[var(--primary)] focus-visible:ring-offset-1';
const SELECT = 'w-full bg-transparent text-[14px] font-semibold text-black outline-none focus-visible:ring-2 focus-visible:ring-[var(--primary)] focus-visible:ring-offset-1';
const BIG_SELECT = 'w-full appearance-none bg-transparent text-[18px] font-medium text-[var(--gray-900)] outline-none focus-visible:ring-2 focus-visible:ring-[var(--primary)] focus-visible:ring-offset-1';

function MapCard({ title, catalog, form }: { title: string; catalog: FloodPlanCatalog; form: FloodPlanRecord }) {
  const site = (id?: string) => catalog.sites.find((s) => s.id === id);
  const zones: MapZone[] = catalog.zones.filter((z) => form.zoneIds.includes(z.id)).map((z) => ({ id: z.id, points: z.points, label: z.name, color: 'var(--status-success)', fillOpacity: 0.1 }));
  const markers: MapMarker[] = ([['depot', form.depotId, depotPinUrl, 'Depot'], ['assembly', form.assemblyId, assemblyPinUrl, 'Assembly Point'], ['discharge', form.dischargeId, dischargePinUrl, 'Discharge Point']] as const)
    .flatMap(([id, sid, url, label]) => { const s = site(sid); return s ? [{ id, position: s.position, label, tooltip: s.name, iconUrl: url, iconSize: [34, 40] as [number, number] }] : []; });
  // FM-6353 AC: route optimisation runs for depot → assembly ONLY — no route
  // inside the zone or to the discharge station (driver nav is Google Maps).
  const optimized = optimizeDepotAssemblyRoute(site(form.depotId), site(form.assemblyId));
  const routes: MapRoute[] = optimized ? [{ id: 'depot-assembly', points: optimized.points, color: 'var(--status-info)', weight: 4 }] : [];
  return (
    <div className="overflow-hidden rounded-[6px] border border-[var(--gray-300)]">
      <div className="flex items-center gap-2 border-b border-[var(--gray-200)] px-4 py-3 text-[16px] font-medium text-[var(--gray-900)]">
        <Icons.RegionPin size={20} className="text-[var(--status-success)]" />{title}
        {optimized && <span className="ml-auto flex items-center gap-1.5 text-[13px] font-medium text-[var(--gray-700)]"><Icons.Route size={16} className="text-[var(--status-info)]" />Depot → Assembly · {optimized.km.toFixed(1)} km · ~{optimized.mins} min</span>}
      </div>
      <div className="h-[280px]"><MapView center={catalog.center} zoom={catalog.zoom ?? 10} zones={zones} markers={markers} routes={routes} fitToContent showReset={false} className="h-full w-full" /></div>
    </div>
  );
}

function fmtTime(iso: string): string {
  const d = new Date(iso);
  let h = d.getHours(); const m = String(d.getMinutes()).padStart(2, '0'); const ap = h >= 12 ? 'pm' : 'am'; h = h % 12 || 12;
  return `${h}:${m} ${ap}`;
}
function fmtDay(iso: string): string { return fmtForecastDate(iso.slice(0, 10)); }

/* ── Timeline (right panel) ──────────────────────────────────────────────── */
function TimelinePanel({ plan, onComment }: { plan: FloodPlanRecord; onComment?: (text: string) => void }) {
  const [text, setText] = React.useState('');
  const groups = React.useMemo(() => {
    const sorted = [...plan.history].sort((a, b) => a.at.localeCompare(b.at));
    const map = new Map<string, FloodPlanHistoryEvent[]>();
    for (const h of sorted) { const k = fmtDay(h.at); map.set(k, [...(map.get(k) ?? []), h]); }
    return [...map.entries()];
  }, [plan.history]);
  const iconFor = (h: FloodPlanHistoryEvent) => h.action.startsWith('Comment') ? <Icons.MessageTextSquare02 size={18} /> : h.status === 'APPROVED' ? <Icons.CheckCircle size={18} /> : h.status === 'REJECTED' ? <Icons.XCircle size={18} /> : h.status === 'IN_REVIEW' ? <Icons.Eye size={18} /> : h.action.startsWith('Rostered') || h.action.startsWith('Updated roster') ? <Icons.CalendarDate size={18} /> : <Icons.PlusCircle size={18} />;
  const sentence = (h: FloodPlanHistoryEvent) => {
    if (h.action.startsWith('Comment')) return h.detail ?? '';
    if (h.action === 'Created plan') return 'created a new plan.';
    if (h.action.startsWith('Created v')) return `${h.action.replace('Created', 'created')}.`;
    if (h.action === 'Submitted for review') return 'submitted the plan for review.';
    if (h.action === 'Approved') return `approved the plan${h.detail ? ` — ${h.detail}` : ''}.`;
    if (h.action === 'Rejected') return `rejected the plan${h.detail ? ` — ${h.detail}` : ''}.`;
    if (h.action === 'Edited plan') return `edited the plan${h.detail ? ` (${h.detail.toLowerCase()})` : ''}.`;
    if (h.action.startsWith('Superseded')) return `${h.action.toLowerCase()}.`;
    return `${h.action.charAt(0).toLowerCase()}${h.action.slice(1)}${h.detail ? ` — ${h.detail}` : ''}.`;
  };
  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="flex shrink-0 border-b border-[var(--gray-200)] px-6">
        <span className="border-b-2 border-primary px-3 py-4 text-[18px] font-medium text-primary">Timeline</span>
      </div>
      <div className="flex min-h-0 flex-1 flex-col gap-6 overflow-auto px-6 py-6">
        {groups.map(([day, items]) => (
          <div key={day} className="flex flex-col gap-5">
            <div className="flex justify-center"><span className="rounded-full bg-[var(--gray-100)] px-5 py-2 text-[16px] font-medium text-[var(--gray-700)]">{day}</span></div>
            {items.map((h) => (
              <div key={h.id} className="flex items-start gap-4">
                <span className={cn('grid size-10 shrink-0 place-items-center rounded-full border border-[var(--gray-300)] bg-white', h.status ? '' : 'text-[var(--gray-500)]')} style={h.status ? { color: FLOOD_STATUS_TONE[h.status], borderColor: `color-mix(in srgb, ${FLOOD_STATUS_TONE[h.status]} 40%, transparent)` } : undefined}>{iconFor(h)}</span>
                <div className="flex min-w-0 flex-1 items-start justify-between gap-3">
                  <p className="text-[16px] leading-6 text-[var(--gray-900)]"><span className="font-semibold">{h.by}</span> {sentence(h)}</p>
                  <span className="shrink-0 pt-0.5 text-[14px] text-[var(--gray-500)]">{fmtTime(h.at)}</span>
                </div>
              </div>
            ))}
          </div>
        ))}
      </div>
      <div className="shrink-0 border-t border-[var(--gray-200)] p-6">
        <div className="flex items-end gap-3">
          <div className="flex min-w-0 flex-1 flex-col gap-1.5">
            <textarea value={text} maxLength={500} onChange={(e) => setText(e.target.value)} rows={2} placeholder="Write a comment here ..." className="w-full resize-none rounded-[6px] border border-[var(--gray-300)] bg-white px-4 py-3 text-[16px] text-[var(--gray-900)] outline-none placeholder:text-[var(--gray-400)] focus:border-primary focus-visible:ring-2 focus-visible:ring-[var(--primary)] focus-visible:ring-offset-1" />
            <span className="self-end text-[14px] text-[var(--gray-500)]">{text.length} / 500</span>
          </div>
          <button type="button" aria-label="Send comment" disabled={!text.trim() || !onComment} onClick={() => { onComment?.(text.trim()); setText(''); }} className="mb-7 grid size-14 shrink-0 place-items-center rounded-[6px] bg-primary text-white transition-opacity hover:opacity-90 disabled:opacity-40"><Icons.Send01 size={22} /></button>
        </div>
      </div>
    </div>
  );
}

export function FloodPlanDetailSheet({ plan, catalog, existingNames, open, onOpenChange, onSave, onTransition, onRoster, onComment, initialStep = 0 }: FloodPlanDetailSheetProps) {
  const [step, setStep] = React.useState<Step>(0);
  const [editing, setEditing] = React.useState(false);
  const [form, setForm] = React.useState<FloodPlanRecord | null>(plan);
  // Timeline is open only where it fits beside the rail + form (≥1280px); it
  // follows the viewport so a resize or the host's emulated width never leaves
  // the panel overlapping the form. The chevron handle still toggles it manually.
  const [timelineOpen, setTimelineOpen] = React.useState(() => typeof window === 'undefined' || window.innerWidth >= 1280);
  const [statusOpen, setStatusOpen] = React.useState(false);
  React.useEffect(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return;
    const mq = window.matchMedia('(min-width: 1280px)');
    const sync = () => setTimelineOpen(mq.matches);
    sync();
    mq.addEventListener('change', sync);
    return () => mq.removeEventListener('change', sync);
  }, [open]);
  React.useEffect(() => { setForm(plan); setEditing(false); }, [plan?.id, plan?.updatedAt, open]); // eslint-disable-line react-hooks/exhaustive-deps
  // opens on `initialStep` — the list's Roster action (and a row whose plan
  // still needs rostering) lands straight on step 3, Shift Rostering
  React.useEffect(() => { if (open) setStep(initialStep); }, [open, plan?.id, initialStep]);

  if (!plan || !form) return null;
  const set = <K extends keyof FloodPlanRecord>(k: K, v: FloodPlanRecord[K]) => setForm((f) => (f ? { ...f, [k]: v } : f));

  const zone = (id: string) => catalog.zones.find((z) => z.id === id);
  const site = (id?: string) => catalog.sites.find((s) => s.id === id);
  const vehicle = catalog.vehicleTypes.find((v) => v.id === form.vehicleTypeId);
  const workforce = catalog.workforceTypes.find((w) => w.id === form.workforceTypeId);
  const inspector = catalog.inspectors.find((i) => i.id === form.inspectorId);
  const sitesOf = (kind: 'depot' | 'assembly' | 'discharge') => catalog.sites.filter((s) => s.kind === kind && form.zoneIds.includes(s.zoneId));

  const editableInPlace = plan.status === 'DRAFT' || plan.status === 'REJECTED';
  const canEdit = editableInPlace || plan.status === 'APPROVED';
  const mode: 'in-place' | 'new-version' = plan.status === 'APPROVED' ? 'new-version' : 'in-place';
  const nameTaken = existingNames.some((n) => n.trim().toLowerCase() === form.name.trim().toLowerCase() && n.trim().toLowerCase() !== plan.name.trim().toLowerCase());
  const valid = !!form.name.trim() && !nameTaken && form.zoneIds.length > 0 && !!form.depotId && !!form.assemblyId && !!form.dischargeId && !!form.vehicleTypeId && !!form.workforceTypeId;

  const toggleZone = (id: string) => setForm((f) => {
    if (!f) return f;
    const ids = f.zoneIds.includes(id) ? f.zoneIds.filter((z) => z !== id) : [...f.zoneIds, id];
    const keep = (sid?: string) => (sid && ids.includes(site(sid)?.zoneId ?? '') ? sid : undefined);
    return { ...f, zoneIds: ids, depotId: keep(f.depotId), assemblyId: keep(f.assemblyId), dischargeId: keep(f.dischargeId) };
  });

  const statusTone = FLOOD_STATUS_TONE[plan.status];
  // Allowed status moves (FM-6365): Draft → In Review; In Review → Approved /
  // Rejected (or back to Draft to withdraw); Rejected → In Review / Draft;
  // Approved never changes here (edits create a new version); Superseded is
  // system-set. Every status is listed like the reference, disallowed ones muted.
  const ALLOWED: Record<FloodPlanStatus, FloodPlanStatus[]> = {
    DRAFT: ['IN_REVIEW'], IN_REVIEW: ['APPROVED', 'REJECTED', 'DRAFT'], APPROVED: [], REJECTED: ['IN_REVIEW', 'DRAFT'], SUPERSEDED: [],
  };
  const STATUS_ORDER: FloodPlanStatus[] = ['DRAFT', 'IN_REVIEW', 'APPROVED', 'REJECTED', 'SUPERSEDED'];
  const heading = step === 0
    ? { title: 'Basic Setup', sub: 'Configure plan name, service and zone locations.' }
    : step === 1
    ? { title: 'Interactive Planning', sub: 'Resource types and the depot, assembly and discharge points chosen on the planning map.' }
    : { title: 'Shift Rostering', sub: plan.status === 'APPROVED' ? 'Dates this approved plan is rostered for, with the shift and named resources on each.' : 'Rostering opens once the plan is approved.' };

  const selectBox = (key: 'depotId' | 'assemblyId' | 'dischargeId' | 'vehicleTypeId' | 'workforceTypeId' | 'inspectorId', options: { id: string; name: string }[], placeholder: string) => (
    <select className={BIG_SELECT} value={form[key] ?? ''} onChange={(e) => set(key, e.target.value || undefined)}>
      <option value="">{placeholder}</option>
      {options.map((o) => <option key={o.id} value={o.id}>{o.name}</option>)}
    </select>
  );

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" hideClose width="min(1500px, 96vw)" className="gap-0 p-0 sm:max-w-none" aria-describedby={undefined}>
        {/* ── window bar ─────────────────────────────────────────────── */}
        <div className="flex h-[72px] shrink-0 items-center justify-between px-5">
          <div className="flex items-center gap-2.5">
            <button type="button" onClick={() => onOpenChange(false)} aria-label="Close" className="grid size-7 place-items-center rounded-full bg-[var(--status-error)] text-white hover:opacity-90"><Icons.XClose size={14} /></button>
            <button type="button" onClick={() => onOpenChange(false)} aria-label="Minimise" className="grid size-7 place-items-center rounded-full bg-[var(--status-warning)] text-white hover:opacity-90"><span className="block h-0.5 w-3 rounded bg-white" /></button>
            <SheetTitle className="sr-only">{plan.name}</SheetTitle>
          </div>
          <div className="flex items-center gap-3">
            {plan.version > 1 && <span className="text-[14px] font-medium text-[var(--gray-500)]">Version {plan.version}{plan.supersedes ? ` · replaces ${plan.supersedes}` : ''}</span>}
            <Popover open={statusOpen} onOpenChange={setStatusOpen}>
              <PopoverTrigger asChild>
                <button type="button" className="flex h-10 items-center gap-4 rounded-[4px] px-5 text-[15px] font-semibold uppercase tracking-wide text-white transition-opacity hover:opacity-90" style={{ background: statusTone }} aria-label={`Status: ${FLOOD_STATUS_LABEL[plan.status]}`}>
                  {FLOOD_STATUS_LABEL[plan.status]}<Icons.ChevronDown size={18} className={cn('transition-transform', statusOpen && 'rotate-180')} />
                </button>
              </PopoverTrigger>
              <PopoverContent align="end" sideOffset={8} className="w-[280px] rounded-[8px] p-2 shadow-[0_12px_32px_rgba(16,24,40,0.12)]">
                <div className="px-4 pb-2 pt-3 text-[16px] font-medium text-[var(--gray-500)]">Select Status</div>
                {STATUS_ORDER.map((st) => {
                  const current = st === plan.status;
                  const allowed = ALLOWED[plan.status].includes(st);
                  return (
                    <button
                      key={st}
                      type="button"
                      role="menuitemradio"
                      aria-checked={current}
                      disabled={!current && !allowed}
                      onClick={() => { if (allowed) { onTransition(plan, st); } setStatusOpen(false); }}
                      className={cn('flex w-full items-center gap-4 rounded-md px-4 py-3 text-left text-[18px] font-medium transition-colors', current ? 'text-[var(--gray-900)]' : allowed ? 'text-[var(--gray-900)] hover:bg-muted' : 'cursor-not-allowed text-[var(--gray-400)]')}
                      title={!current && !allowed ? (plan.status === 'APPROVED' ? 'An approved plan changes only through a new version' : `Not available from ${FLOOD_STATUS_LABEL[plan.status]}`) : undefined}
                    >
                      <span className="size-5 shrink-0 rounded-full" style={{ background: FLOOD_STATUS_TONE[st], opacity: current || allowed ? 1 : 0.45 }} />
                      <span className="flex-1">{FLOOD_STATUS_LABEL[st]}</span>
                      {current && <Icons.Check size={20} className="text-[var(--status-success)]" />}
                    </button>
                  );
                })}
              </PopoverContent>
            </Popover>
          </div>
        </div>

        <div className="flex min-h-0 flex-1 border-t border-[var(--gray-200)]">
          {/* ── stepper rail ───────────────────────────────────────── */}
          <aside className="flex w-[240px] shrink-0 flex-col gap-8 border-r border-[var(--gray-200)] px-5 py-6 lg:w-[300px] xl:w-[360px] xl:gap-10 xl:px-7 xl:py-8">
            <h2 className="text-[22px] leading-7 text-[var(--gray-900)] xl:text-[26px] xl:leading-8"><span className="font-bold">Edit Plan</span> <span className="font-normal">{plan.name}</span></h2>
            <ol className="flex flex-col gap-2">
              {STEPS.map((s, i) => {
                const active = i === step;
                return (
                  <React.Fragment key={s.tag}>
                    {i > 0 && <li aria-hidden className="grid size-11 place-items-center"><span className="h-full w-0.5 rounded bg-[var(--gray-300)]" /></li>}
                    <li>
                      <button type="button" onClick={() => setStep(i as Step)} aria-current={active ? 'step' : undefined} className="flex items-center gap-4 text-left">
                        {active
                          ? <span className="grid size-11 shrink-0 place-items-center rounded-full border border-primary/40 p-0.5"><span className="grid size-9 place-items-center rounded-full bg-primary text-white">{s.icon}</span></span>
                          : <span className="grid size-11 shrink-0 place-items-center rounded-full border border-[var(--gray-300)] text-[var(--gray-500)]">{s.icon}</span>}
                        <span className="flex flex-col">
                          <span className={cn('text-[12px] font-bold tracking-[0.5px]', active ? 'text-primary' : 'text-[var(--gray-500)]')}>{s.tag}</span>
                          <span className={cn('text-[16px] xl:text-[18px]', active ? 'font-semibold text-[var(--gray-900)]' : 'font-medium text-[var(--gray-500)]')}>{s.name}</span>
                        </span>
                      </button>
                    </li>
                  </React.Fragment>
                );
              })}
            </ol>
          </aside>

          {/* ── step body ─────────────────────────────────────────── */}
          <div className="relative flex min-w-0 flex-1 flex-col overflow-hidden">
            <div className="flex min-h-0 flex-1 flex-col gap-6 overflow-auto px-5 py-6 xl:px-8 xl:py-7">
              <div className="flex flex-col gap-1">
                <h3 className="text-[22px] font-bold text-[var(--gray-900)] xl:text-[26px]">{heading.title}</h3>
                <p className="text-[16px] text-[var(--gray-500)]">{heading.sub}</p>
              </div>

              {step === 0 && (
                <div className="flex flex-col gap-5">
                  <Fld label="Plan Name" required value={form.name} error={nameTaken ? 'A plan with this name already exists.' : undefined}>{editing ? <input className={INPUT} value={form.name} onChange={(e) => set('name', e.target.value)} /> : undefined}</Fld>
                  <Fld label="Plan Description" value={form.description}>{editing ? <textarea rows={2} className={cn(INPUT, 'resize-none leading-6')} value={form.description} onChange={(e) => set('description', e.target.value)} /> : undefined}</Fld>
                  <Fld label="Service" required value={form.service} sub="MM Flood & Rain Water Management" chevron />
                  <Fld label="Zones / Areas" required value={form.zoneIds.map((z) => zone(z)?.name ?? z).join(', ')} sub={`${form.zoneIds.length} zone${form.zoneIds.length === 1 ? '' : 's'} · ${[...new Set(form.zoneIds.map((z) => zone(z)?.municipality).filter(Boolean))].join(', ')}`} chevron={!editing}>
                    {editing ? (
                      <div className="flex flex-wrap gap-2 py-1">
                        {catalog.zones.map((z) => { const on = form.zoneIds.includes(z.id); return <button key={z.id} type="button" aria-pressed={on} onClick={() => toggleZone(z.id)} className={cn('relative flex items-center gap-1.5 rounded-[4px] border px-2.5 py-1.5 text-[14px] font-medium before:absolute before:-inset-3 before:content-[\'\']', on ? 'border-primary bg-primary/[0.06] text-[var(--gray-900)]' : 'border-[var(--gray-300)] text-[var(--gray-500)]')}><span className="size-2 rounded-full" style={{ background: z.color }} />{z.name}</button>; })}
                      </div>
                    ) : undefined}
                  </Fld>
                  <MapCard title="Plan Operational Zones" catalog={catalog} form={form} />
                </div>
              )}

              {step === 1 && (
                <div className="flex flex-col gap-5">
                  <div className="grid gap-5 md:grid-cols-2">
                    <Fld label="Vehicle Type" required icon={<Icons.Truck02 size={22} />} value={vehicle?.name} sub={vehicle ? `${vehicle.capacity} · ${vehicle.category}` : undefined} chevron>{editing ? selectBox('vehicleTypeId', catalog.vehicleTypes.filter((v) => v.available > 0 || v.id === form.vehicleTypeId), 'Select vehicle type') : undefined}</Fld>
                    <Fld label="Workforce Type" required icon={<Icons.Users02 size={22} />} value={workforce?.name} sub={workforce?.crewSize} chevron>{editing ? selectBox('workforceTypeId', catalog.workforceTypes.filter((w) => w.available > 0 || w.id === form.workforceTypeId), 'Select workforce type') : undefined}</Fld>
                    <Fld label="Inspector" icon={<Icons.UserCheck01 size={22} />} value={inspector?.name ?? (editing ? undefined : 'Not assigned')} sub={inspector?.badge} chevron>{editing ? selectBox('inspectorId', catalog.inspectors.filter((i) => i.available || i.id === form.inspectorId), 'Not assigned') : undefined}</Fld>
                    <Fld label="Forecast Date" icon={<Icons.CalendarDate size={22} />} value={fmtForecastDate(form.forecastDate)} sub="Picked on the planning map" />
                    <Fld label="Start Depot" required icon={<img src={depotPinUrl} alt="" className="h-6 w-5 object-contain" />} value={site(form.depotId)?.name} chevron>{editing ? selectBox('depotId', sitesOf('depot'), 'Select start depot') : undefined}</Fld>
                    <Fld label="Assembly Point" required icon={<img src={assemblyPinUrl} alt="" className="h-6 w-5 object-contain" />} value={site(form.assemblyId)?.name} chevron>{editing ? selectBox('assemblyId', sitesOf('assembly'), 'Select assembly point') : undefined}</Fld>
                    <Fld label="Discharge Point" required icon={<img src={dischargePinUrl} alt="" className="h-6 w-5 object-contain" />} value={site(form.dischargeId)?.name} chevron className="md:col-span-2">{editing ? selectBox('dischargeId', sitesOf('discharge'), 'Select discharge point') : undefined}</Fld>
                  </div>
                  <MapCard title="Plan Locations" catalog={catalog} form={form} />
                </div>
              )}

              {step === 2 && (
                <div className="flex flex-col gap-4">
                  {plan.roster.length ? (
                    <div className="overflow-hidden rounded-[6px] border border-[var(--gray-300)]">
                      <table className="w-full text-left text-[16px]">
                        <thead className="bg-[var(--gray-50)] text-[12px] font-bold uppercase tracking-wide text-[var(--gray-500)]">
                          <tr><th className="px-4 py-3">Date</th><th className="px-4 py-3">Shift</th><th className="px-4 py-3">Vehicles</th><th className="px-4 py-3">Crew</th><th className="px-4 py-3">Inspector</th><th className="px-4 py-3" /></tr>
                        </thead>
                        <tbody>
                          {[...plan.roster].sort((a, b) => a.date.localeCompare(b.date)).map((r) => (
                            <tr
                              key={r.id}
                              role="button"
                              tabIndex={0}
                              className="cursor-pointer border-t border-[var(--gray-200)] hover:bg-muted/40 focus-visible:outline-2 focus-visible:outline-[var(--primary)]"
                              onClick={() => onRoster(plan, r)}
                              onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onRoster(plan, r); } }}
                            >
                              <td className="px-4 py-3 font-medium text-[var(--gray-900)]">{fmtForecastDate(r.date)}</td>
                              <td className="px-4 py-3"><span className="inline-flex items-center gap-1.5 text-[var(--gray-900)]"><span className="text-[var(--status-warning)]">{SHIFT_ICON[r.shift]}</span>{r.shift}{r.startTime && <span className="text-[12px] font-normal text-[var(--gray-500)]"> · {r.startTime}{r.endTime ? `–${r.endTime}` : ''}</span>}</span></td>
                              <td className="px-4 py-3 text-[var(--gray-900)]">{r.vehicles.join(', ') || '—'}</td>
                              <td className="px-4 py-3 text-[var(--gray-900)]">{r.crew.join(', ') || '—'}</td>
                              <td className="px-4 py-3 text-[var(--gray-900)]">{r.inspector ?? '—'}</td>
                              <td className="px-4 py-3 text-right text-[var(--gray-500)]"><Icons.ChevronRight size={16} /></td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <p className="rounded-[6px] border border-dashed border-[var(--gray-300)] px-4 py-8 text-center text-[16px] text-[var(--gray-500)]">{plan.status === 'APPROVED' ? 'Not rostered for any date yet.' : 'This plan is not approved, so it cannot be rostered yet.'}</p>
                  )}
                  {plan.status === 'APPROVED' && <div><Button variant="secondary" onClick={() => onRoster(plan)}><Icons.CalendarPlus01 size={16} className="mr-1.5" />Add rostered date</Button></div>}
                </div>
              )}
            </div>

            {/* footer — Edit / Cancel / Save (Tadweer bottom-right "Edit" link) */}
            {step < 2 && (
              <div className="flex shrink-0 items-center justify-end gap-6 whitespace-nowrap border-t border-[var(--gray-200)] px-5 py-4 xl:px-8">
                {!editing && canEdit && (
                  <button type="button" onClick={() => setEditing(true)} className="text-[18px] font-medium text-primary hover:underline">{mode === 'new-version' ? 'Edit as new version' : 'Edit'}</button>
                )}
                {!editing && !canEdit && <span className="text-[14px] text-[var(--gray-500)]">Read-only while {FLOOD_STATUS_LABEL[plan.status].toLowerCase()}</span>}
                {editing && (
                  <>
                    <button type="button" onClick={() => { setForm(plan); setEditing(false); }} className="text-[18px] font-medium text-[var(--gray-500)] hover:underline">Cancel</button>
                    <Button variant="primary" disabled={!valid} onClick={() => { onSave(form, mode); setEditing(false); }}>{mode === 'new-version' ? `Save as v${plan.version + 1} (Draft)` : 'Save changes'}</Button>
                  </>
                )}
              </div>
            )}

            {/* timeline collapse handle */}
            <button type="button" onClick={() => setTimelineOpen((o) => !o)} aria-label={timelineOpen ? 'Hide timeline' : 'Show timeline'} aria-expanded={timelineOpen} className="absolute -right-3 top-1/2 z-10 grid size-7 -translate-y-1/2 place-items-center rounded-full border border-[var(--gray-300)] bg-white text-[var(--gray-500)] shadow-sm hover:text-foreground">
              {timelineOpen ? <Icons.ChevronRight size={14} /> : <Icons.ChevronLeft size={14} />}
            </button>
          </div>

          {/* ── timeline ─────────────────────────────────────────── */}
          {timelineOpen && (
            <aside className="w-[320px] shrink-0 border-l border-[var(--gray-200)] xl:w-[380px]">
              <TimelinePanel plan={plan} onComment={onComment ? (t) => onComment(plan, t) : undefined} />
            </aside>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}

/* ── Roster assignment side sheet (Creation Form variant) ─────────────────────
 *  Chassis: `primitives/SIDE-SHEET-PATTERN.md` §2 "Creation Form" — Sheet
 *  wrapper, 48px top navbar (close X + title), a 24px-padded main content pane
 *  with gap 16, and a sticky footer holding Cancel + the primary save action.
 *  Body = three sections: Schedule (dates · shift · recurrence), Preview (the
 *  generated dates with their conflict status) and Resources (the NAMED units,
 *  drivers, workforce and inspector). Every control is an existing primitive. */

/** Section heading — a bold title (+ optional icon/meta) sitting directly in
 *  the sheet's white body, matching the Creation Sheet's per-step
 *  `text-body-lg font-bold` heading instead of a gray card wrapper. */
function RosterSection({ title, icon, meta, children }: { title: string; icon?: React.ReactNode; meta?: React.ReactNode; children: React.ReactNode }) {
  return (
    <section className="flex flex-col gap-4">
      <header className="flex items-center gap-2">
        {icon && <span className="text-[var(--gray-500)]">{icon}</span>}
        <h3 className="text-body-lg font-bold text-foreground">{title}</h3>
        {meta && <span className="ml-auto flex items-center gap-2 text-body-xs text-muted-foreground">{meta}</span>}
      </header>
      {children}
    </section>
  );
}

/** Caption + control stack used for every field inside a section. */
function RosterField({ label, hint, children, className }: { label: string; hint?: string; children: React.ReactNode; className?: string }) {
  return (
    <label className={cn('flex flex-col gap-1.5', className)}>
      <span className="text-caption font-semibold uppercase tracking-wide text-[var(--gray-500)]">{label}{hint && <span className="ml-1 normal-case tracking-normal text-[var(--gray-500)]">{hint}</span>}</span>
      {children}
    </label>
  );
}

/** Inset-label field box — the "Create New Request" sheet's `InsetField`
 *  anatomy hand-replicated for native controls (date inputs, the Shift
 *  `Select`): one rounded bordered box holding a leading icon, a small
 *  muted caption line and the value/control below it, with an optional
 *  trailing chevron for select-like triggers. */
function RosterFieldBox({ label, required, icon, chevron, error, controlId, className, children }: {
  label: string; required?: boolean; icon?: React.ReactNode; chevron?: boolean; error?: string; controlId?: string; children: React.ReactNode; className?: string;
}) {
  return (
    <div className={cn('flex flex-col gap-1.5', className)}>
      <div className={cn('flex min-h-14 items-center gap-2.5 rounded-xl border bg-white px-3 py-2 focus-within:border-primary', error ? 'border-[var(--status-error)]' : 'border-[var(--gray-300)]')}>
        {icon && <span className="shrink-0 text-[var(--gray-500)]" aria-hidden>{icon}</span>}
        <div className="flex min-w-0 flex-1 flex-col">
          <label htmlFor={controlId} className="text-[12px] font-medium uppercase tracking-wide text-[var(--gray-500)]">
            {label}{required && <span aria-hidden className="text-[var(--status-error)]"> *</span>}
          </label>
          {children}
        </div>
        {chevron && <Icons.ChevronDown size={16} className="shrink-0 text-[var(--gray-500)]" aria-hidden />}
      </div>
      {error && <span className="text-[12px] font-medium text-[var(--status-error)]">{error}</span>}
    </div>
  );
}

/** Leading-icon overlay for a `SearchableSelect` `field`-mode trigger — that
 *  component already supplies the inset-label box/chevron/height, this just
 *  adds the persistent field-appropriate icon at its start, matching the
 *  `RosterFieldBox` anatomy above. */
function withFieldIcon(icon: React.ReactNode, node: React.ReactNode) {
  return (
    <div className="relative">
      <span aria-hidden className="pointer-events-none absolute left-3 top-1/2 z-10 -translate-y-1/2 text-[var(--gray-500)]">{icon}</span>
      {node}
    </div>
  );
}

/** A 1..31 / weekday toggle pill (same anatomy as the resource chips). */
function TogglePill({ label, selected, onClick, title }: { label: React.ReactNode; selected: boolean; onClick: () => void; title?: string }) {
  return (
    <button type="button" aria-pressed={selected} title={title} onClick={onClick}
      className={cn('min-w-[38px] rounded-[4px] border px-2 py-1 text-[12px] font-semibold',
        selected ? 'border-primary bg-primary/[0.06] text-foreground' : 'border-[var(--gray-300)] text-[var(--gray-500)] hover:bg-muted')}>
      {label}
    </button>
  );
}

/** Shift-timing input — same icon+floating-label+native-time idiom as
 *  `scheduling/shift-planner.tsx`'s `TimeField`, replicated locally so it can
 *  carry the roster sheet's own error treatment (red border + caption). */
function RosterTimeField({ label, value, onChange, error, required }: { label: string; value: string; onChange: (v: string) => void; error?: string; required?: boolean }) {
  return (
    <div className="flex flex-col gap-1.5">
      <div className={cn('flex min-h-14 items-center gap-2.5 rounded-xl border bg-white px-3 py-2 focus-within:border-primary', error ? 'border-[var(--status-error)]' : 'border-[var(--gray-300)]')}>
        <Icons.Clock size={18} className="shrink-0 text-[var(--gray-500)]" />
        <span className="flex min-w-0 flex-1 flex-col">
          <span className="text-[12px] font-medium uppercase tracking-wide text-[var(--gray-500)]">{label}{required && <span aria-hidden className="text-[var(--status-error)]"> *</span>}</span>
          <input type="time" value={value} onChange={(e) => onChange(e.target.value)} aria-required={required || undefined} className="w-full bg-transparent text-body-sm font-medium text-foreground outline-none [&::-webkit-calendar-picker-indicator]:hidden" />
        </span>
        {value && <button type="button" aria-label="Clear" onClick={() => onChange('')} className="shrink-0 text-[var(--gray-500)] hover:text-foreground"><Icons.XClose size={15} /></button>}
      </div>
      {error && <span className="text-[12px] font-medium text-[var(--status-error)]">{error}</span>}
    </div>
  );
}

/** Tab labels the roster names can index by, in fixed order. */
const ROSTER_TABS = ['Schedule', 'Resources', 'Inspector'] as const;
type RosterTab = 0 | 1 | 2;

/** Text-tab header — same anatomy as `@ds/ui-kit`'s `Stepper` `variant="tabs"`
 *  (a row of labels, the active one bold in primary with its own short
 *  underline sitting on a full-width divider) hand-replicated here since the
 *  ui-kit package isn't importable from this isolated vendor tree. Click
 *  navigation is BACKWARD-ONLY: a tab is clickable only once `maxReached`
 *  has passed it — the caller advances `maxReached` as each tab validates,
 *  so a click can never skip ahead of validated fields. */
function RosterTabs({ current, maxReached, onSelect }: { current: RosterTab; maxReached: RosterTab; onSelect: (i: RosterTab) => void }) {
  return (
    <nav aria-label="Progress" className="w-full shrink-0 border-b border-[var(--gray-200)] bg-white">
      <ol className="flex items-end gap-10 px-8">
        {ROSTER_TABS.map((label, i) => {
          const idx = i as RosterTab;
          const active = idx === current;
          const clickable = idx <= maxReached;
          return (
            <li key={label} className="flex flex-col items-start">
              {clickable ? (
                <button type="button" onClick={() => onSelect(idx)} className="rounded-sm pb-2 outline-none focus-visible:ring-2 focus-visible:ring-ring">
                  <span className={cn('whitespace-nowrap text-[16px]', active ? 'font-semibold text-primary' : 'font-medium text-[var(--gray-500)]')}>{label}</span>
                </button>
              ) : (
                <span className="cursor-not-allowed pb-2">
                  <span className="whitespace-nowrap text-[16px] font-medium text-[var(--gray-500)]">{label}</span>
                </span>
              )}
              <span aria-hidden className={cn('-mb-px h-0.5 w-full rounded-full', active ? 'bg-primary' : 'bg-transparent')} />
            </li>
          );
        })}
      </ol>
    </nav>
  );
}

export interface FloodRosterSheetProps {
  plan: FloodPlanRecord | null;
  /** existing entry to edit; omit for a new date. */
  entry?: FloodRosterEntry | null;
  catalog: FloodPlanCatalog;
  /** the full named fleet — the sheet filters to the plan's vehicle type + active. */
  vehicleUnits: FloodVehicleUnit[];
  /** the full named workforce — drivers and non-driver members are split apart. */
  crewMembers: FloodCrewMember[];
  /** every plan record — cross-plan double-booking is surfaced per date. */
  allPlans: FloodPlanRecord[];
  /** who is saving (recorded as the assigning user). */
  currentUser: string;
  /** preselected date (a grid cell opened the sheet). */
  initialDate?: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** one entry per conflict-free preview date (a single-element array in edit mode). */
  onSave: (plan: FloodPlanRecord, entries: FloodRosterEntry[]) => void;
  onRemove?: (plan: FloodPlanRecord, entryId: string) => void;
}

interface PreviewRow {
  id: string;
  n: number;
  date: string;
  dateLabel: string;
  day: string;
  time: string;
  /** non-empty → this date is NOT saved. */
  reason?: string;
}

export function FloodRosterSheet({ plan, entry, catalog, vehicleUnits, crewMembers, allPlans, currentUser, initialDate, open, onOpenChange, onSave, onRemove }: FloodRosterSheetProps) {
  const today = React.useMemo(() => todayIso(), []);
  const firstDate = entry?.date ?? initialDate ?? today;

  /* ── wizard tabs ── the sheet always opens on Schedule; editing an existing
   * entry marks every tab "reached" up front (nothing here needs forward
   * gating since every field is already filled in), while a new entry starts
   * with only Schedule reachable — `goNext` advances `maxReached` as each
   * tab's own fields validate. */
  const [tab, setTab] = React.useState<RosterTab>(0);
  const [maxReached, setMaxReached] = React.useState<RosterTab>(entry ? 2 : 0);
  const goToTab = (idx: RosterTab) => { if (idx <= maxReached) setTab(idx); };

  /* ── schedule ── */
  const [startDate, setStartDate] = React.useState(firstDate);
  const [endDate, setEndDate] = React.useState(firstDate);
  const [shift, setShift] = React.useState<FloodShift>(entry?.shift ?? 'Morning');
  const [recurring, setRecurring] = React.useState(false);
  const [frequency, setFrequency] = React.useState<RosterFrequency>('Weekly');
  const [interval, setInterval] = React.useState(1);
  const [weekdays, setWeekdays] = React.useState<number[]>([]);
  const [monthDays, setMonthDays] = React.useState<number[]>([]);
  const [endsMode, setEndsMode] = React.useState<'on' | 'after'>('after');
  const [endsOn, setEndsOn] = React.useState(isoPlusDays(firstDate, 28));
  const [occurrences, setOccurrences] = React.useState(8);
  const [startTime, setStartTime] = React.useState(entry?.startTime ?? '');
  const [endTime, setEndTime] = React.useState(entry?.endTime ?? '');

  /* ── resources ── */
  const [vehicles, setVehicles] = React.useState<string[]>([]);
  const [drivers, setDrivers] = React.useState<string[]>([]);
  const [workforce, setWorkforce] = React.useState<string[]>([]);
  const [inspector, setInspector] = React.useState('');
  const [notes, setNotes] = React.useState(entry?.notes ?? '');

  React.useEffect(() => {
    if (!open) return;
    setTab(0); setMaxReached(entry ? 2 : 0);
    const d = entry?.date ?? initialDate ?? todayIso();
    setStartDate(d); setEndDate(d); setShift(entry?.shift ?? 'Morning');
    // Edit mode is always a single date — recurrence is a creation-only rule.
    setRecurring(false); setFrequency('Weekly'); setInterval(1); setWeekdays([]); setMonthDays([]);
    setEndsMode('after'); setEndsOn(isoPlusDays(d, 28)); setOccurrences(8);
    setStartTime(entry?.startTime ?? ''); setEndTime(entry?.endTime ?? '');
    setVehicles(entry?.vehicles ?? []);
    const known = new Set(crewMembers.filter((c) => c.driver).map((c) => c.id));
    const crew = entry?.crew ?? [];
    setDrivers(entry?.drivers ?? crew.filter((n) => known.has(n)));
    setWorkforce(entry?.workforce ?? crew.filter((n) => !known.has(n)));
    setInspector(entry?.inspector ?? catalog.inspectors.find((i) => i.id === plan?.inspectorId)?.name ?? '');
    setNotes(entry?.notes ?? '');
  }, [open, entry, plan, initialDate, catalog.inspectors, crewMembers]);

  const recurrence: RosterRecurrence | null = React.useMemo(() => (recurring ? {
    frequency, interval,
    weekdays: frequency === 'Weekly' ? weekdays : undefined,
    monthDays: frequency === 'Monthly' ? monthDays : undefined,
    ends: endsMode === 'on' ? { mode: 'on', date: endsOn } : { mode: 'after', count: occurrences },
  } : null), [recurring, frequency, interval, weekdays, monthDays, endsMode, endsOn, occurrences]);

  const dates = React.useMemo(
    () => (entry ? [startDate] : generateRosterDates({ startDate, endDate: recurring ? undefined : endDate, recurrence, cap: ROSTER_PREVIEW_CAP })),
    [entry, startDate, endDate, recurring, recurrence],
  );

  const crew = React.useMemo(() => [...drivers, ...workforce], [drivers, workforce]);

  if (!plan) return null;

  const toggleNum = (v: number, setter: React.Dispatch<React.SetStateAction<number[]>>) =>
    setter((list) => (list.includes(v) ? list.filter((x) => x !== v) : [...list, v]));

  /* options: the plan's TYPE only, active only (inactive are never selectable).
   * A driving licence is not a workforce designation, so the driver pool is the
   * whole active licensed pool; the non-driver workforce stays type-scoped. */
  const typedVehicles = vehicleUnits.filter((v) => v.active && v.typeId === plan.vehicleTypeId);
  const driverPool = crewMembers.filter((c) => c.active && c.driver);
  const workforcePool = crewMembers.filter((c) => c.active && !c.driver && c.typeId === plan.workforceTypeId);

  /* conflicts — evaluated on actual shift windows, for EVERY generated date */
  const conflictsOn = (date: string) =>
    findRosterConflicts({ plans: allPlans, date, shift, vehicles, crew, excludeEntryId: entry?.id });
  const conflictOf = (resource: string, kind: 'vehicle' | 'crew'): RosterConflict | undefined => {
    for (const date of dates) {
      const hit = findRosterConflicts({ plans: allPlans, date, shift, vehicles: kind === 'vehicle' ? [resource] : [], crew: kind === 'crew' ? [resource] : [], excludeEntryId: entry?.id })[0];
      if (hit) return hit;
    }
    return undefined;
  };

  const cfg = FLOOD_SHIFT_CONFIG[shift];
  const timeLabel = startTime ? (endTime ? `${startTime}–${endTime}` : startTime) : '–';
  const rows: PreviewRow[] = dates.map((date, i) => {
    const clash = plan.roster.some((r) => r.id !== entry?.id && r.date === date && r.shift === shift);
    const ended = shiftEnded(date, shift);
    const res = conflictsOn(date);
    const reason = ended ? `${shift} (${cfg.start}–${cfg.end}) has already ended on this date.`
      : clash ? 'This plan is already rostered for this date and shift.'
      : res.length ? conflictMessage(res[0])
      : undefined;
    return { id: `${date}-${shift}`, n: i + 1, date, dateLabel: fmtForecastDate(date), day: dayNameOf(date), time: timeLabel, reason };
  });
  const clean = rows.filter((r) => !r.reason);
  const clashing = rows.length - clean.length;

  const startTimeError = !startTime ? 'Start time is required' : undefined;
  const endTimeError = endTime && endTime === startTime ? 'End time must be different from start time' : undefined;
  const driverOk = !driverPool.length || drivers.length > 0;

  const vehicleType = catalog.vehicleTypes.find((v) => v.id === plan.vehicleTypeId)?.name ?? 'Vehicle';
  const workforceType = catalog.workforceTypes.find((w) => w.id === plan.workforceTypeId)?.name ?? 'Crew';
  const unit = frequency === 'Daily' ? 'day' : frequency === 'Weekly' ? 'week' : 'month';

  const previewColumns: DataTableColumn<PreviewRow>[] = [
    { id: 'n', header: '#', width: '48px', cell: (r) => <span className="text-body-xs font-semibold text-muted-foreground">{r.n}</span> },
    { id: 'date', header: 'Date', cell: (r) => <span className="text-body-sm font-medium text-foreground">{r.dateLabel}</span> },
    { id: 'day', header: 'Day', cell: (r) => <span className="text-body-sm text-muted-foreground">{r.day}</span> },
    { id: 'time', header: 'Time', cell: (r) => <span className="text-body-sm text-muted-foreground">{r.time}</span> },
    {
      id: 'status', header: 'Status', width: '150px',
      cell: (r) => (r.reason
        ? <Badge variant="warning" title={r.reason}><Icons.AlertTriangle size={12} />Conflict</Badge>
        : <Badge variant="success"><Icons.CheckCircle size={12} />No Conflict</Badge>),
    },
  ];

  /** Selected ids (of `kind`) that clash with something already rostered —
   *  surfaced as a small warning list under the dropdown that replaced the
   *  old resource chips (conflict-detection logic itself is untouched). */
  const conflictsIn = (ids: string[], kind: 'vehicle' | 'crew'): { id: string; message: string }[] =>
    ids.flatMap((id) => { const c = conflictOf(id, kind); return c ? [{ id, message: conflictMessage(c) }] : []; });

  const tab0Valid = clean.length > 0 && !startTimeError && !endTimeError;
  const tab1Valid = vehicles.length > 0 && crew.length > 0 && driverOk;
  const tabValid: Record<RosterTab, boolean> = { 0: tab0Valid, 1: tab1Valid, 2: true };

  const goNext = () => {
    if (!tabValid[tab]) return;
    if (tab === 2) { save(); return; }
    const next = (tab + 1) as RosterTab;
    setTab(next);
    setMaxReached((m) => (next > m ? next : m));
  };

  const save = () => {
    const at = new Date().toISOString();
    const entries: FloodRosterEntry[] = clean.map((r, i) => ({
      id: entry?.id ?? `${plan.id}-r${Date.now()}-${i}`,
      date: r.date,
      shift,
      vehicles: [...vehicles],
      // `crew` stays drivers + workforce so every existing roster cell keeps working.
      crew: [...crew],
      drivers: [...drivers],
      workforce: [...workforce],
      inspector: inspector || undefined,
      startTime: startTime || undefined,
      endTime: endTime || undefined,
      notes: notes.trim() || undefined,
      assignedBy: currentUser,
      assignedAt: at,
      planVersion: plan.version,
      scheduleId: entry?.scheduleId,
    }));
    onSave(plan, entries);
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" hideClose width="min(880px, 96vw)" className="gap-0 bg-white p-0" aria-describedby={undefined}>
        {/* floating close — overlaps the sheet's left edge, same anatomy as
            the Creation Sheet's `SheetFloatingClose` */}
        <button
          type="button"
          onClick={() => onOpenChange(false)}
          aria-label="Close"
          className="absolute -left-5 top-1/2 z-10 grid size-10 -translate-y-1/2 place-items-center rounded-full border border-[var(--gray-200)] bg-white text-[var(--gray-500)] shadow-md outline-none transition-colors hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring"
        >
          <Icons.XClose size={16} />
        </button>

        {/* header — generous padding, large bold title + plan-name subline,
            replacing the old 48px navbar (figma "Create New Request" chrome) */}
        <div className="flex shrink-0 flex-col gap-6 p-8 pb-0">
          <div className="min-w-0">
            <SheetTitle className="text-[22px] font-bold leading-tight text-[var(--gray-900)]">{entry ? 'Edit Roster Assignment' : 'Assign Roster'}</SheetTitle>
            <p className="mt-1 truncate text-body-sm text-[var(--gray-500)]">{plan.name}</p>
          </div>
        </div>

        {/* tab row — Schedule · Resources · Inspector, backward-only click nav */}
        <RosterTabs current={tab} maxReached={maxReached} onSelect={goToTab} />

        {/* main content pane */}
        <div className="flex min-h-0 flex-1 flex-col gap-6 overflow-auto p-8">
          {tab === 0 && (
            <>
              <p className="text-body-sm text-muted-foreground">
                {entry ? 'Adjust the date, shift and recurrence for this assignment.'
                  : 'Pick the schedule this plan will be rostered on. The preview lists every date the rule generates, with conflicts flagged.'}
              </p>

              {/* ── Schedule ─────────────────────────────────────────── */}
              <RosterSection title="Schedule" icon={<Icons.CalendarDate size={18} />} meta={`${cfg.start} – ${cfg.end}`}>
                <div className="grid gap-4 md:grid-cols-3">
                  <RosterFieldBox label="Start date" icon={<Icons.CalendarDate size={18} />} controlId="roster-start-date">
                    <input id="roster-start-date" type="date" value={startDate} onChange={(e) => { const v = e.target.value; setStartDate(v); if (v > endDate) setEndDate(v); }} className="w-full bg-transparent text-body-sm font-medium text-foreground outline-none" />
                  </RosterFieldBox>
                  <RosterFieldBox label={`End date${entry ? ' (single date)' : recurring ? ' (set by the rule)' : ''}`} icon={<Icons.CalendarDate size={18} />} controlId="roster-end-date">
                    <input id="roster-end-date" type="date" min={startDate} value={recurring ? (dates[dates.length - 1] ?? startDate) : endDate} disabled={!!entry || recurring} onChange={(e) => setEndDate(e.target.value)} className="w-full bg-transparent text-body-sm font-medium text-foreground outline-none disabled:cursor-not-allowed disabled:opacity-60" />
                  </RosterFieldBox>
                  <RosterFieldBox label="Shift (times come from configuration)" icon={<Icons.Clock size={18} />} controlId="roster-shift">
                    <Select value={shift} onValueChange={(v) => setShift(v as FloodShift)}>
                      <SelectTrigger id="roster-shift" className="h-auto w-full justify-between border-0 bg-transparent p-0 text-body-sm font-medium text-foreground shadow-none focus:ring-0"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {FLOOD_SHIFTS.map((s) => (
                          <SelectItem key={s} value={s}>{s} · {FLOOD_SHIFT_CONFIG[s].start}–{FLOOD_SHIFT_CONFIG[s].end}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </RosterFieldBox>
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  <RosterTimeField label="Start time" required value={startTime} onChange={setStartTime} error={startTimeError} />
                  <RosterTimeField label="End time" value={endTime} onChange={setEndTime} error={endTimeError} />
                </div>

                {!entry && (
                  <>
                    <div className="flex items-center gap-3 rounded-xl border border-[var(--gray-300)] bg-white px-3 py-2.5">
                      <Switch id="roster-recurring" checked={recurring} onCheckedChange={setRecurring} />
                      <label htmlFor="roster-recurring" className="flex cursor-pointer flex-col">
                        <span className="text-body-sm font-semibold text-foreground">Recurring</span>
                        <span className="text-body-xs text-muted-foreground">Repeat this assignment on a rule instead of every day in the range.</span>
                      </label>
                    </div>

                    {recurring && (
                      <div className="flex flex-col gap-4 rounded-xl border border-[var(--gray-300)] bg-white p-3">
                        <div className="grid gap-4 md:grid-cols-2">
                          <RosterField label="Frequency">
                            <Select value={frequency} onValueChange={(v) => { setFrequency(v as RosterFrequency); setWeekdays([]); setMonthDays([]); }}>
                              <SelectTrigger><SelectValue /></SelectTrigger>
                              <SelectContent>
                                {(['Daily', 'Weekly', 'Monthly'] as RosterFrequency[]).map((f) => <SelectItem key={f} value={f}>{f}</SelectItem>)}
                              </SelectContent>
                            </Select>
                          </RosterField>
                          <RosterField label="Repeat every">
                            <div className="flex items-center gap-2">
                              <Input type="number" min={1} max={30} value={interval} onChange={(e) => setInterval(Math.max(1, Math.min(30, Number(e.target.value) || 1)))} className="w-24" />
                              <span className="text-body-sm text-muted-foreground">{interval === 1 ? unit : `${unit}s`}</span>
                            </div>
                          </RosterField>
                        </div>

                        {frequency === 'Weekly' && (
                          <RosterField label="Repeat on" hint={weekdays.length ? undefined : `(defaults to ${dayNameOf(startDate)})`}>
                            <div className="flex flex-wrap gap-1.5">
                              {DAY_SHORT.map((d, i) => <TogglePill key={d} label={d} selected={weekdays.includes(i)} onClick={() => toggleNum(i, setWeekdays)} />)}
                            </div>
                          </RosterField>
                        )}

                        {frequency === 'Monthly' && (
                          <RosterField label="Repeat on" hint={monthDays.length ? '(day of month)' : `(defaults to day ${Number(startDate.slice(8, 10)) || 1})`}>
                            <div className="flex flex-wrap gap-1.5">
                              {Array.from({ length: 31 }, (_, i) => i + 1).map((d) => (
                                <TogglePill key={d} label={d} selected={monthDays.includes(d)} onClick={() => toggleNum(d, setMonthDays)} title={d > 28 ? 'Skipped in months without this day' : undefined} />
                              ))}
                            </div>
                          </RosterField>
                        )}

                        <RosterField label="Ends on">
                          <RadioGroup value={endsMode} onValueChange={(v) => setEndsMode(v as 'on' | 'after')} className="gap-3">
                            <div className="flex items-center gap-3">
                              <RadioGroupItem value="on" id="roster-ends-on" />
                              <label htmlFor="roster-ends-on" className="text-body-sm text-foreground">On</label>
                              <Input type="date" min={startDate} value={endsOn} disabled={endsMode !== 'on'} onChange={(e) => setEndsOn(e.target.value)} className="w-[180px]" />
                            </div>
                            <div className="flex items-center gap-3">
                              <RadioGroupItem value="after" id="roster-ends-after" />
                              <label htmlFor="roster-ends-after" className="text-body-sm text-foreground">After</label>
                              <Input type="number" min={1} max={ROSTER_PREVIEW_CAP} value={occurrences} disabled={endsMode !== 'after'} onChange={(e) => setOccurrences(Math.max(1, Math.min(ROSTER_PREVIEW_CAP, Number(e.target.value) || 1)))} className="w-24" />
                              <span className="text-body-sm text-muted-foreground">occurrences</span>
                            </div>
                          </RadioGroup>
                        </RosterField>
                      </div>
                    )}
                  </>
                )}
              </RosterSection>

              {/* ── Preview ──────────────────────────────────────────── */}
              <RosterSection
                title="Preview"
                icon={<Icons.List size={18} />}
                meta={<>
                  <Badge variant="muted">{rows.length} date{rows.length === 1 ? '' : 's'}</Badge>
                  {clashing > 0 && <Badge variant="warning"><Icons.AlertTriangle size={12} />{clashing} conflict{clashing === 1 ? '' : 's'}</Badge>}
                </>}
              >
                {rows.length ? (
                  <>
                    <div className="max-h-[320px] overflow-auto">
                      <DataTable<PreviewRow> columns={previewColumns} data={rows} getRowId={(r) => r.id} stickyHeader />
                    </div>
                    {clashing > 0 && <p className="text-body-xs text-[var(--status-warning)]">Conflicting dates are skipped — {clean.length} of {rows.length} will be rostered. Hover a Conflict badge for the reason.</p>}
                    {rows.length === ROSTER_PREVIEW_CAP && <p className="text-body-xs text-muted-foreground">Capped at {ROSTER_PREVIEW_CAP} dates — narrow the rule to see the rest.</p>}
                  </>
                ) : (
                  <p className="rounded-[6px] border border-dashed border-[var(--gray-300)] px-4 py-6 text-center text-body-sm text-muted-foreground">The rule generates no dates — check the start date and the end condition.</p>
                )}
              </RosterSection>
            </>
          )}

          {tab === 1 && (
            <>
              <p className="text-body-sm text-muted-foreground">
                Assign the named {vehicleType.toLowerCase()} units, drivers and {workforceType.toLowerCase()} members that will run this plan.
              </p>

              {/* ── Resources ────────────────────────────────────────── */}
              <RosterSection title="Resources" icon={<Icons.Truck02 size={18} />} meta={`${vehicles.length} vehicle${vehicles.length === 1 ? '' : 's'} · ${drivers.length} driver${drivers.length === 1 ? '' : 's'} · ${workforce.length} workforce`}>
                <div className="flex flex-col gap-1.5">
                  {withFieldIcon(<Icons.Truck02 size={18} />, (
                    <SearchableSelect
                      multiple
                      values={vehicles}
                      onValuesChange={setVehicles}
                      options={typedVehicles.map((v) => ({ value: v.id, label: v.id, icon: Icons.Truck02 }))}
                      field={{ label: <>{`${vehicleType} units`}<span aria-hidden className="text-[var(--status-error)]"> *</span></> }}
                      placeholder={typedVehicles.length ? 'Select vehicles' : 'No active vehicles'}
                      disabled={!typedVehicles.length}
                      aria-label={`${vehicleType} units`}
                      triggerClassName={cn('rounded-xl pl-9', typedVehicles.length > 0 && !vehicles.length && 'border-[var(--status-error)]')}
                    />
                  ))}
                  <span className="text-[12px] text-[var(--gray-500)]">{`(${vehicles.length} of ${typedVehicles.length} selected)`}</span>
                  {!typedVehicles.length && <span className="text-body-xs text-muted-foreground">No active {vehicleType.toLowerCase()} units.</span>}
                  {typedVehicles.length > 0 && !vehicles.length && <span className="text-body-xs font-medium text-[var(--status-error)]">Assign at least one vehicle.</span>}
                  {conflictsIn(vehicles, 'vehicle').map((c) => (
                    <span key={c.id} className="flex items-center gap-1.5 text-body-xs font-medium text-[var(--status-warning)]"><Icons.AlertTriangle size={12} />{c.id}: {c.message}</span>
                  ))}
                </div>

                <div className="flex flex-col gap-1.5">
                  {withFieldIcon(<Icons.User01 size={18} />, (
                    <SearchableSelect
                      multiple
                      values={drivers}
                      onValuesChange={setDrivers}
                      options={driverPool.map((c) => ({ value: c.id, label: c.id, icon: Icons.User01 }))}
                      field={{ label: <>Drivers<span aria-hidden className="text-[var(--status-error)]"> *</span></> }}
                      placeholder={driverPool.length ? 'Select drivers' : 'No licensed drivers'}
                      disabled={!driverPool.length}
                      aria-label="Drivers"
                      triggerClassName={cn('rounded-xl pl-9', driverPool.length > 0 && !drivers.length && 'border-[var(--status-error)]')}
                    />
                  ))}
                  <span className="text-[12px] text-[var(--gray-500)]">{`(${drivers.length} of ${driverPool.length} selected)`}</span>
                  {!driverPool.length && <span className="text-body-xs text-muted-foreground">No licensed drivers are active.</span>}
                  {driverPool.length > 0 && !drivers.length && <span className="text-body-xs font-medium text-[var(--status-error)]">Assign at least one driver.</span>}
                  {conflictsIn(drivers, 'crew').map((c) => (
                    <span key={c.id} className="flex items-center gap-1.5 text-body-xs font-medium text-[var(--status-warning)]"><Icons.AlertTriangle size={12} />{c.id}: {c.message}</span>
                  ))}
                </div>

                <div className="flex flex-col gap-1.5">
                  {withFieldIcon(<Icons.Users02 size={18} />, (
                    <SearchableSelect
                      multiple
                      values={workforce}
                      onValuesChange={setWorkforce}
                      options={workforcePool.map((c) => ({ value: c.id, label: c.id, icon: Icons.Users02 }))}
                      field={{ label: 'Additional workforce' }}
                      placeholder={workforcePool.length ? 'Select workforce' : `No active ${workforceType.toLowerCase()} members`}
                      disabled={!workforcePool.length}
                      aria-label="Additional workforce"
                      triggerClassName="rounded-xl pl-9"
                    />
                  ))}
                  <span className="text-[12px] text-[var(--gray-500)]">{`(${workforce.length} of ${workforcePool.length} selected · ${workforceType})`}</span>
                  {!workforcePool.length && <span className="text-body-xs text-muted-foreground">No active {workforceType.toLowerCase()} members.</span>}
                  {conflictsIn(workforce, 'crew').map((c) => (
                    <span key={c.id} className="flex items-center gap-1.5 text-body-xs font-medium text-[var(--status-warning)]"><Icons.AlertTriangle size={12} />{c.id}: {c.message}</span>
                  ))}
                </div>
              </RosterSection>
            </>
          )}

          {tab === 2 && (
            <>
              <p className="text-body-sm text-muted-foreground">Optionally name an inspector for this assignment, and add any notes.</p>

              {/* ── Inspector ────────────────────────────────────────── */}
              <RosterSection title="Inspector" icon={<Icons.UserCheck01 size={18} />}>
                <div className="flex max-w-[320px] flex-col gap-1.5">
                  {withFieldIcon(<Icons.UserCheck01 size={18} />, (
                    <SearchableSelect
                      options={catalog.inspectors.filter((i) => i.available || i.name === inspector).map((i) => ({ value: i.name, label: `${i.name} · ${i.badge}` }))}
                      allOption={{ value: '', label: 'Not assigned' }}
                      value={inspector}
                      onChange={setInspector}
                      field={{ label: 'Inspector (optional)' }}
                      placeholder="Not assigned"
                      aria-label="Inspector"
                      triggerClassName="rounded-xl pl-9"
                    />
                  ))}
                </div>

                <RosterField label="Notes" hint="(optional)">
                  <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Description ..." />
                </RosterField>
              </RosterSection>
            </>
          )}
        </div>

        {/* sticky footer — single full-width primary action + Remove (editing
            only), with a white gradient fade over the content that scrolls
            beneath it (Creation Sheet anatomy). */}
        <div className="relative flex shrink-0 flex-col gap-2 bg-white p-8 pt-0">
          <div aria-hidden className="pointer-events-none absolute inset-x-0 bottom-full h-10 bg-gradient-to-t from-white via-white/80 to-transparent" />
          <div className="flex items-center justify-between gap-2 pt-4">
            {entry && onRemove ? (
              <button type="button" className="text-body-xs font-semibold text-[var(--status-error)] hover:underline" onClick={() => onRemove(plan, entry.id)}>Remove date</button>
            ) : <span />}
            {tab === 0 && clean.length > 1 && <span className="text-body-xs text-muted-foreground">{clean.length} dates will be rostered</span>}
          </div>
          <Button variant="primary" size="lg" className="w-full disabled:pointer-events-none disabled:opacity-50" disabled={!tabValid[tab]} onClick={goNext}>
            {tab === 2 ? 'Save roster' : 'Save and Continue'}
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}


export { FLOOD_STATUS_LABEL };
