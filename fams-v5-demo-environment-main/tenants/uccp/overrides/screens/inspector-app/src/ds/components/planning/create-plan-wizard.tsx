import * as React from 'react';
import * as Icons from '../../icons';
import { cn } from '../utils/cn';
import { Button, FloatingLabelInput, Popover, PopoverTrigger, PopoverContent, Sheet, SheetContent, SheetTitle } from '../primitives';
import { DateRangePicker } from '../basics';
import { MiniDonutCell } from '../data-viz';
import { LeafletMap } from '../map';
import type { LatLng } from '../map';
import { PlanningMode } from './planning-mode';

/**
 * CreatePlanWizard — the Interactive Planning "Create New Plan" flow (Figma
 * AKU5PLaqjO1QBakY9pUAH1 · nodes 105-7191 Basic Setup → 105-23083 Interactive
 * Mapping → 105-23471 Summary). Three steps in a left stepper rail with a
 * floating close-X; renders inside the home view's right pane (the plan list
 * stays visible on the left). Brand law: Figma's Tadweer green → FAMS `--primary`;
 * green/amber/red only for genuine status (the suitability ring, CBM legend).
 *
 * Config-driven: service types, clone options, the reviewed `details` (Smart
 * Insight + KPI grid) and `mapPreview` (routed coverage) are all props, with
 * frame-matching defaults so it runs out of the box.
 */

export interface PlanDraft {
  title: string;
  serviceType: string;
  startDate?: string;
  endDate?: string;
  clonePlan?: string;
}
export interface PlanKpi { label: string; value: React.ReactNode; icon: React.ReactNode }
export interface PlanDetails { suitabilityPct: number; smartInsight: string; kpis: PlanKpi[] }
export interface PlanMapPreview {
  center: LatLng; zoom?: number;
  route?: LatLng[];
  clusters?: { position: LatLng; count: number }[];
  start?: LatLng; discharge?: LatLng;
  legend?: { label: string; color: string }[];
}
export interface CreatePlanWizardProps {
  serviceTypes?: string[];
  cloneOptions?: string[];
  initial?: Partial<PlanDraft>;
  details?: PlanDetails;
  mapPreview?: PlanMapPreview;
  /** the wizard renders as a right side-sheet overlay. */
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreate: (draft: PlanDraft) => void;
}

type Step = 0 | 1 | 2;
const STEPS = [
  { tag: 'STEP 1', name: 'Basic Setup' },
  { tag: 'STEP 2', name: 'Interactive Mapping' },
  { tag: 'FINAL STEP', name: 'Summary' },
];

const PURPLE = 'var(--chart-accent-purple)';

/* frame-matching defaults (Area 123 Plan) */
const DEFAULT_DETAILS: PlanDetails = {
  suitabilityPct: 82,
  smartInsight: 'The plan is well balanced — route density and tipping intervals align with vehicle efficiency. No overload or overtime detected; fleet utilization and travel spread indicate an optimized morning cycle.',
  kpis: [
    { label: 'Shift', value: 'Morning (8h)', icon: <Icons.Sun size={16} /> },
    { label: 'Waste Type', value: 'General', icon: <Icons.RefreshCcw01 size={16} /> },
    { label: 'Driver', value: 'Arjun Patel', icon: <Icons.User01 size={16} /> },
    { label: 'Distance per Bin', value: '~0.03 km/bin', icon: <Icons.Route size={16} /> },
    { label: 'Total Distance', value: '43 km', icon: <Icons.Route size={16} /> },
    { label: 'Frequency', value: 'Daily', icon: <Icons.Clock size={16} /> },
    { label: 'Total Bins', value: '151', icon: <Icons.MarkerPin01 size={16} /> },
    { label: 'Compactor', value: 'Z1245', icon: <Icons.Truck01 size={16} /> },
    { label: 'Number of Helpers', value: '2', icon: <Icons.Users01 size={16} /> },
    { label: 'Total Time', value: '6h 53min', icon: <Icons.Clock size={16} /> },
  ],
};
const DEFAULT_MAP: PlanMapPreview = {
  center: [24.42, 54.55], zoom: 11,
  route: [[24.35, 54.50], [24.38, 54.53], [24.42, 54.56], [24.46, 54.60], [24.49, 54.62]],
  clusters: [{ position: [24.40, 54.52], count: 99 }, { position: [24.36, 54.55], count: 52 }],
  start: [24.49, 54.62], discharge: [24.44, 54.58],
  legend: [{ label: '1.1 CBM (99 Bins)', color: 'var(--status-warning)' }, { label: '2.2 CBM (52 Bins)', color: 'var(--status-error)' }],
};

/* floating-label popover select (matches the DS FloatingLabelInput chrome) */
function FieldSelect({ label, icon, value, options, onChange, placeholder }: {
  label: string; icon?: React.ReactNode; value: string; options: string[]; onChange: (v: string) => void; placeholder?: string;
}) {
  const [open, setOpen] = React.useState(false);
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button type="button" className="flex w-full items-center gap-2.5 rounded-lg border border-border bg-card px-3 py-2 text-left outline-none transition-colors hover:bg-muted/40 focus-visible:ring-2 focus-visible:ring-ring">
          {icon && <span className="shrink-0 text-muted-foreground">{icon}</span>}
          <span className="flex min-w-0 flex-1 flex-col">
            <span className="text-caption font-medium uppercase tracking-wide text-muted-foreground">{label}</span>
            <span className={cn('truncate text-body-sm', value ? 'font-medium text-foreground' : 'text-muted-foreground')}>{value || placeholder || `Select ${label.toLowerCase()}`}</span>
          </span>
          <Icons.ChevronDown size={16} className="shrink-0 text-muted-foreground" />
        </button>
      </PopoverTrigger>
      <PopoverContent align="start" className="max-h-64 w-[--radix-popover-trigger-width] overflow-auto p-1">
        {options.map((o) => (
          <button key={o} type="button" onClick={() => { onChange(o); setOpen(false); }} className="flex w-full items-center gap-2 rounded-md px-2.5 py-2 text-left text-body-sm text-foreground transition-colors hover:bg-muted">
            <span className={cn('grid size-4 shrink-0 place-items-center rounded-full border', o === value ? 'border-primary' : 'border-border')}>{o === value && <span className="size-2 rounded-full bg-primary" />}</span>
            {o}
          </button>
        ))}
      </PopoverContent>
    </Popover>
  );
}

/* Smart-Insights callout (primary-tinted info card) */
function SmartInsights({ text }: { text: string }) {
  return (
    <div className="flex gap-3 rounded-xl border border-primary/25 bg-primary/[0.06] p-4">
      <Icons.Stars01 size={18} className="mt-0.5 shrink-0 text-primary" />
      <div className="flex flex-col gap-1">
        <span className="text-body-sm font-semibold text-foreground">Smart Insights</span>
        <p className="text-body-sm text-muted-foreground">{text}</p>
      </div>
    </div>
  );
}

/* the 2-col KPI grid + suitability ring, shared by step 2 + step 3 */
function PlanDetailsPanel({ details, map }: { details: PlanDetails; map: PlanMapPreview }) {
  const suit = details.suitabilityPct;
  const half = Math.ceil(details.kpis.length / 2);
  const cols = [details.kpis.slice(0, half), details.kpis.slice(half)];
  const Row = ({ k }: { k: PlanKpi }) => (
    <div className="flex items-center justify-between gap-3 py-2">
      <span className="text-body-sm text-muted-foreground">{k.label}</span>
      <span className="flex items-center gap-1.5 text-body-sm font-semibold text-foreground"><span className="text-muted-foreground">{k.icon}</span>{k.value}</span>
    </div>
  );
  return (
    <div className="flex flex-col gap-4">
      <SmartInsights text={details.smartInsight} />
      <div className="grid grid-cols-1 gap-x-8 md:grid-cols-2">
        {/* suitability ring spans the first cell of col 1 */}
        <div className="flex items-center justify-between gap-3 py-2">
          <span className="text-body-sm text-muted-foreground">Overall Plan Suitability</span>
          <span className="flex items-center gap-2"><MiniDonutCell value={suit} size={28} /><span className="text-body-sm font-semibold text-foreground">{suit}%</span></span>
        </div>
        <div className="hidden md:block" />
        {cols.map((col, ci) => (
          <div key={ci} className="flex flex-col divide-y divide-border/60">
            {col.map((k) => <Row key={k.label} k={k} />)}
          </div>
        ))}
      </div>
      <PlanMapPreviewCard map={map} />
    </div>
  );
}

function PlanMapPreviewCard({ map }: { map: PlanMapPreview }) {
  const routes = map.route ? [{ id: 'route', points: map.route, color: PURPLE }] : [];
  const pois = [
    ...(map.clusters ?? []).map((c, i) => ({ id: `c${i}`, position: c.position, label: String(c.count), color: 'var(--primary)' })),
    ...(map.start ? [{ id: 'start', position: map.start, color: 'var(--status-success)', label: 'Start' }] : []),
    ...(map.discharge ? [{ id: 'discharge', position: map.discharge, color: 'var(--status-warning)', label: 'Discharge' }] : []),
  ];
  return (
    <div className="relative h-[280px] overflow-hidden rounded-xl border border-border">
      <LeafletMap center={map.center} zoom={map.zoom ?? 11} routes={routes} pois={pois} className="h-full w-full" />
      {map.legend && (
        <div className="absolute left-3 top-3 z-[400] flex items-center gap-4 rounded-lg border border-border bg-card/95 px-3 py-1.5 shadow-sm backdrop-blur">
          {map.legend.map((l) => (
            <span key={l.label} className="flex items-center gap-1.5 text-body-xs font-medium text-foreground">
              <span className="inline-block size-2.5 rounded-full" style={{ background: l.color }} />{l.label}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

export function CreatePlanWizard({
  serviceTypes = ['Bin Collection', 'Street Sweeping', 'Bin Washing', 'Container Collection'],
  cloneOptions = ['— None —', 'Area 101 Plan', 'Area 118 Plan', 'Downtown Daily'],
  initial, details = DEFAULT_DETAILS, mapPreview = DEFAULT_MAP, open, onOpenChange, onCreate,
}: CreatePlanWizardProps) {
  const [step, setStep] = React.useState<Step>(0);
  const [planningOpen, setPlanningOpen] = React.useState(false);
  const [draft, setDraft] = React.useState<PlanDraft>({
    title: initial?.title ?? 'Area 123 Plan',
    serviceType: initial?.serviceType ?? serviceTypes[0],
    startDate: initial?.startDate,
    endDate: initial?.endDate,
    clonePlan: initial?.clonePlan,
  });
  const set = <K extends keyof PlanDraft>(k: K, v: PlanDraft[K]) => setDraft((d) => ({ ...d, [k]: v }));

  const next = () => setStep((s) => (s < 2 ? ((s + 1) as Step) : s));
  const back = () => setStep((s) => (s > 0 ? ((s - 1) as Step) : s));

  const heading = ['Basic Setup', 'Interactive Mapping', 'Summary'][step];
  const subtitle = [
    'Name your plan and optionally clone settings from an existing one.',
    'Explore bins and assets on an interactive map, configure shift and define custom zone.',
    'Review all the core requirements for this contract.',
  ][step];

  return (
    <>
      <Sheet open={open && !planningOpen} onOpenChange={onOpenChange}>
        <SheetContent side="right" width="min(940px, 68vw)" hideClose className="p-0">
          <SheetTitle className="sr-only">Create New Plan</SheetTitle>
          <div className="relative flex h-full min-h-0 bg-card">
            {/* floating close X on the left edge */}
            <button type="button" onClick={() => onOpenChange(false)} aria-label="Close" className="absolute -left-4 top-1/2 z-[5] grid size-8 -translate-y-1/2 place-items-center rounded-full border border-border bg-card text-muted-foreground shadow-md transition-colors hover:text-foreground">
              <Icons.XClose size={16} />
            </button>

      {/* step rail */}
      <div className="flex w-[210px] shrink-0 flex-col gap-6 border-r border-border p-6">
        <h2 className="text-h6 font-semibold text-foreground">Create New Plan</h2>
        <ol className="flex flex-col">
          {STEPS.map((s, i) => {
            const done = i < step;
            const active = i === step;
            return (
              <li key={s.name} className="flex gap-3">
                <div className="flex flex-col items-center">
                  <span className={cn('grid size-7 shrink-0 place-items-center rounded-full border text-caption font-bold',
                    done ? 'border-primary bg-primary text-primary-foreground'
                      : active ? 'border-primary bg-primary text-primary-foreground'
                        : 'border-border bg-card text-muted-foreground')}>
                    {done ? <Icons.Check size={14} /> : i + 1}
                  </span>
                  {i < STEPS.length - 1 && <span className={cn('my-1 w-px flex-1', i < step ? 'bg-primary' : 'bg-border')} style={{ minHeight: 28 }} />}
                </div>
                <div className="flex flex-col pb-6">
                  <span className={cn('text-caption font-bold uppercase tracking-wide', active || done ? 'text-primary' : 'text-muted-foreground')}>{s.tag}</span>
                  <span className={cn('text-body-sm font-semibold', active || done ? 'text-foreground' : 'text-muted-foreground')}>{s.name}</span>
                </div>
              </li>
            );
          })}
        </ol>
      </div>

      {/* content */}
      <div className="flex min-h-0 flex-1 flex-col">
        <div className="min-h-0 flex-1 overflow-auto p-6">
          <h3 className="text-h6 font-semibold text-foreground">{heading}</h3>
          <p className="mt-1 text-body-sm text-muted-foreground">{subtitle}</p>

          <div className="mt-5">
            {step === 0 && (
              <div className="flex max-w-2xl flex-col gap-4">
                <FloatingLabelInput label="Title" value={draft.title} onChange={(e) => set('title', e.target.value)} />
                <FieldSelect label="Service Type" icon={<Icons.BinCollection size={18} />} value={draft.serviceType} options={serviceTypes} onChange={(v) => set('serviceType', v)} />
                <DateRangePicker mode="range" field={{ label: 'Select Time Frame' }}
                  value={draft.startDate && draft.endDate ? `${draft.startDate} – ${draft.endDate}` : undefined}
                  placeholder="Select time frame"
                  onApply={(r) => { if (r.start) set('startDate', fmtDate(r.start)); if (r.end) set('endDate', fmtDate(r.end)); }} />
                <FieldSelect label="Clone Plan" icon={<Icons.Copy01 size={18} />} value={draft.clonePlan ?? ''} options={cloneOptions} onChange={(v) => set('clonePlan', v)} placeholder="Clone Plan" />
              </div>
            )}

            {step === 1 && (
              <div className="flex flex-col gap-4">
                <div className="flex items-center justify-between gap-3">
                  <span className="text-body-sm font-semibold text-foreground">Plan Details</span>
                  <button type="button" onClick={() => setPlanningOpen(true)} className="inline-flex items-center gap-1.5 rounded-lg border border-primary px-3 py-1.5 text-body-sm font-semibold text-primary transition-colors hover:bg-primary/5">
                    <Icons.Map01 size={15} />Open interactive map
                  </button>
                </div>
                <PlanDetailsPanel details={details} map={mapPreview} />
              </div>
            )}

            {step === 2 && (
              <div className="flex flex-col gap-6">
                <section className="flex flex-col gap-3">
                  <span className="text-body-sm font-semibold text-foreground">Basic Details</span>
                  <div className="grid grid-cols-1 gap-x-8 gap-y-3 md:grid-cols-2">
                    <SummaryRow label="Title" value={draft.title} />
                    <SummaryRow label="Service Type" value={<span className="inline-flex items-center gap-1.5"><Icons.BinCollection size={14} className="text-[color:var(--chart-accent-purple)]" />{draft.serviceType}</span>} />
                    <SummaryRow label="Start Date" value={draft.startDate ?? '1 Oct, 2025'} />
                    <SummaryRow label="End Date" value={draft.endDate ?? '31 Oct, 2025'} />
                  </div>
                </section>
                <section className="flex flex-col gap-3">
                  <span className="text-body-sm font-semibold text-foreground">Plan Details</span>
                  <PlanDetailsPanel details={details} map={mapPreview} />
                </section>
              </div>
            )}
          </div>
        </div>

        {/* footer */}
        <div className="flex shrink-0 items-center justify-between gap-3 border-t border-border p-4">
          {step > 0 ? <button type="button" onClick={back} className="text-body-sm font-semibold text-muted-foreground transition-colors hover:text-foreground">Back</button> : <span />}
          {step < 2
            ? <Button variant="primary" onClick={next}>Save and Continue</Button>
            : <Button variant="primary" onClick={() => onCreate(draft)}>Create Plan</Button>}
        </div>
      </div>
          </div>
        </SheetContent>
      </Sheet>

      {/* Planning Mode = full-screen overlay, opened from the Interactive Mapping step */}
      <Sheet open={planningOpen} onOpenChange={setPlanningOpen}>
        <SheetContent side="right" width="100vw" hideClose className="p-0">
          <SheetTitle className="sr-only">Planning Mode</SheetTitle>
          <PlanningMode center={mapPreview.center} zoom={mapPreview.zoom} onClose={() => setPlanningOpen(false)} />
        </SheetContent>
      </Sheet>
    </>
  );
}

function SummaryRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-3 border-b border-border/60 py-2">
      <span className="text-body-sm text-muted-foreground">{label}</span>
      <span className="text-body-sm font-semibold text-foreground">{value}</span>
    </div>
  );
}

const MON = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
function fmtDate(d: Date) { return `${d.getDate()} ${MON[d.getMonth()]}, ${d.getFullYear()}`; }
