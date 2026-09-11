import * as React from 'react';
import * as Icons from '../../icons';
import { cn } from '../utils/cn';
import { Popover, PopoverTrigger, PopoverContent, Sheet, SheetContent, SheetTitle } from '../primitives';
import { MapView } from '../map';
import type { MapMarker, MapZone } from '../map';
import depotPinUrl from '../map/poi-pins/depot.svg';
import assemblyPinUrl from '../map/poi-pins/assembly.svg';
import dischargePinUrl from '../map/poi-pins/discharge.svg';
import globeUrl from './flood-planning-globe.svg';
import { FloodPlanningMode } from './flood-planning-mode';
import { EMPTY_FLOOD_DRAFT, fmtForecastDate, type FloodPlanCatalog, type FloodPlanDraft } from './flood-plan-types';

/**
 * FloodPlanWizard — the MM Flood "Create New Plan" 3-step side-sheet
 * (FM-6364). Figma qLpsvk0JRDQ7CBoV96s0eU · 2007-87015 (Step 1 Basic Setup)
 * → 2007-87696 (Step 2 empty state) → 2007-91096 (Step 2 mapped summary) →
 * 2007-91833 (Final Step Summary). Layout, type ramp and spacing follow the
 * frames 1:1 (220px stepper rail · 682px content pane · floating 58px close);
 * the CONTENT is the flood service's:
 *   · Step 1 captures ONLY plan name/description, service and zones.
 *   · Step 2 picks depot / assembly / discharge (from the zones catalogue,
 *     filtered to the chosen zones), the vehicle + workforce TYPE, the
 *     and a forecast date — all on the planning map.
 *   · No dates, recurrence, shift, route or duration are ever captured.
 *
 * Step 2 is unreachable until Step 1 validates (unique name, ≥1 zone).
 * Step 3 is unreachable until Planning Mode confirms the sites and types.
 * "Create Plan" hands the draft to the consumer, which holds it as DRAFT.
 */

export interface FloodPlanWizardProps {
  catalog: FloodPlanCatalog;
  /** Names already in use — a duplicate blocks Save and Continue. */
  existingNames: string[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreate: (draft: FloodPlanDraft) => void;
}

type Step = 0 | 1 | 2;
const STEPS = [
  { tag: 'STEP 1', name: 'Basic Setup', icon: <Icons.List size={16} /> },
  { tag: 'STEP 2', name: 'Interactive Mapping', icon: <Icons.RegionPin size={16} /> },
  { tag: 'FINAL STEP', name: 'Summary', icon: <Icons.File06 size={16} /> },
];

/* ── stepper rail (Figma 2007-87621) ────────────────────────────────────── */

function StepperRail({ step }: { step: Step }) {
  return (
    <div className="flex h-full w-[220px] shrink-0 flex-col gap-6 bg-[var(--gray-100)] p-5">
      <SheetTitle className="py-1.5 text-[22px] font-bold leading-[33px] text-black">Create New Plan</SheetTitle>
      <ol className="flex flex-col gap-1.5">
        {STEPS.map((s, i) => {
          const state = i < step ? 'done' : i === step ? 'active' : 'todo';
          return (
            <React.Fragment key={s.tag}>
              {i > 0 && (
                <li aria-hidden className="grid size-8 place-items-center">
                  <span className={cn('h-full w-0.5 rounded-[2px]', i <= step ? 'bg-[var(--status-success)]/25' : 'bg-[var(--gray-300)]')} />
                </li>
              )}
              <li className="flex items-center gap-[9px]" aria-current={state === 'active' ? 'step' : undefined}>
                {state === 'done' ? (
                  <span className="grid size-8 shrink-0 place-items-center rounded-full bg-[var(--status-success)]/25 text-[var(--status-success)]"><Icons.Check size={18} /></span>
                ) : state === 'active' ? (
                  <span className="grid size-8 shrink-0 place-items-center rounded-full border border-primary/40 p-0.5"><span className="grid size-[26px] place-items-center rounded-full bg-primary text-white">{s.icon}</span></span>
                ) : (
                  <span className="grid size-8 shrink-0 place-items-center rounded-full border border-[var(--gray-300)] text-[var(--gray-500)]">{s.icon}</span>
                )}
                <span className="flex min-w-0 flex-col">
                  <span className={cn('text-[10px] font-bold tracking-[0.5px]', state === 'active' ? 'text-primary' : 'text-[var(--gray-500)]')}>{s.tag}</span>
                  <span className={cn('text-[14px]', state === 'active' ? 'font-semibold text-black' : 'font-medium text-[var(--gray-500)]')}>{s.name}</span>
                </span>
              </li>
            </React.Fragment>
          );
        })}
      </ol>
    </div>
  );
}

/* ── step-1 field chrome (Figma 2007-87659 / 87664) ─────────────────────── */

const FIELD = 'flex min-h-14 w-full items-center gap-2 rounded-[4px] border bg-white px-2 text-left outline-none transition-colors focus-within:border-primary';

function TextField({ label, value, onChange, error, placeholder, textarea }: { label: string; value: string; onChange: (v: string) => void; error?: string; placeholder?: string; textarea?: boolean }) {
  const id = React.useId();
  return (
    <div className="flex w-full flex-col gap-1">
      <label htmlFor={id} className={cn(FIELD, 'flex-col items-start justify-center gap-1 py-2', error ? 'border-[var(--status-error)]' : 'border-[var(--gray-300)]')}>
        <span className="text-[12px] font-semibold text-[var(--gray-500)]">{label}</span>
        {textarea ? (
          <textarea id={id} rows={3} value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} className="w-full resize-none bg-transparent text-[14px] font-semibold leading-5 text-black outline-none placeholder:font-medium placeholder:text-[var(--gray-400)]" />
        ) : (
          <input id={id} value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} className="w-full bg-transparent text-[16px] font-semibold text-black outline-none placeholder:font-medium placeholder:text-[var(--gray-400)]" />
        )}
      </label>
      {error && <p role="alert" className="flex items-center gap-1 text-[12px] font-medium text-[var(--status-error)]"><Icons.AlertCircle size={12} />{error}</p>}
    </div>
  );
}

function SelectField<T extends { id: string; name: string }>({ label, icon, options, value, onChange, placeholder, multi, disabled, hint, renderOption }: {
  label: string; icon: React.ReactNode; options: T[]; value: string[]; onChange: (ids: string[]) => void; placeholder: string; multi?: boolean; disabled?: boolean; hint?: string; renderOption?: (o: T) => React.ReactNode;
}) {
  const [open, setOpen] = React.useState(false);
  const picked = options.filter((o) => value.includes(o.id));
  const display = picked.length ? (picked.length > 2 ? `${picked.slice(0, 2).map((p) => p.name).join(', ')} +${picked.length - 2}` : picked.map((p) => p.name).join(', ')) : '';
  return (
    <div className="flex w-full flex-col gap-1">
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <button type="button" disabled={disabled} className={cn(FIELD, 'h-14 justify-between border-[var(--gray-300)] py-[3px] disabled:opacity-60')}>
            <span className="flex min-w-0 flex-1 items-center gap-2">
              <span className="shrink-0 text-[var(--gray-500)]">{icon}</span>
              <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                {display ? (
                  <>
                    <span className="truncate text-[10px] font-semibold text-[var(--gray-500)]">{label}</span>
                    <span className="truncate text-[14px] font-semibold text-black">{display}</span>
                  </>
                ) : (
                  <span className="truncate text-[14px] font-semibold text-[var(--gray-400)]">{placeholder}</span>
                )}
              </span>
            </span>
            <Icons.ChevronDown size={12} className="shrink-0 text-[var(--gray-500)]" />
          </button>
        </PopoverTrigger>
        <PopoverContent align="start" className="max-h-72 w-[--radix-popover-trigger-width] overflow-auto p-1">
          {options.length === 0 && <p className="px-2.5 py-3 text-[12px] font-medium text-[var(--gray-500)]">{hint ?? 'No options'}</p>}
          {options.map((o) => {
            const on = value.includes(o.id);
            return (
              <button
                key={o.id}
                type="button"
                onClick={() => { onChange(multi ? (on ? value.filter((v) => v !== o.id) : [...value, o.id]) : [o.id]); if (!multi) setOpen(false); }}
                className="flex w-full items-center gap-2 rounded-md px-2.5 py-2 text-left text-[14px] text-foreground transition-colors hover:bg-muted"
              >
                {multi ? (
                  <span className={cn('grid size-4 shrink-0 place-items-center rounded-[3px] border', on ? 'border-primary bg-primary text-white' : 'border-[var(--gray-300)]')}>{on && <Icons.Check size={12} />}</span>
                ) : (
                  <span className={cn('grid size-4 shrink-0 place-items-center rounded-full border', on ? 'border-primary' : 'border-[var(--gray-300)]')}>{on && <span className="size-2 rounded-full bg-primary" />}</span>
                )}
                <span className="min-w-0 flex-1">{renderOption ? renderOption(o) : o.name}</span>
              </button>
            );
          })}
        </PopoverContent>
      </Popover>
      {hint && options.length > 0 && <p className="text-[12px] font-medium text-[var(--gray-500)]">{hint}</p>}
    </div>
  );
}

/* ── detail rows (Figma 2007-91743: label w-116 · icon chip · value) ────── */

function DetailRow({ label, icon, value, tone }: { label: string; icon?: React.ReactNode; value: React.ReactNode; tone?: 'warning' }) {
  return (
    <div className="flex min-h-6 items-center gap-4">
      <span className="w-[116px] shrink-0 text-[12px] font-semibold leading-[14px] text-[var(--gray-500)]">{label}</span>
      <span className="flex min-w-0 items-center gap-2">
        {icon && <span className={cn('grid size-6 shrink-0 place-items-center rounded-[18px] text-[var(--gray-700)]', tone === 'warning' ? 'bg-[var(--status-warning)]/10 text-[var(--status-warning)]' : 'bg-[var(--gray-200)]')}>{icon}</span>}
        <span className="min-w-0 text-[14px] font-semibold text-black">{value}</span>
      </span>
    </div>
  );
}

function PreviewMap({ catalog, draft, height, withSiteCard }: { catalog: FloodPlanCatalog; draft: FloodPlanDraft; height: number; withSiteCard?: boolean }) {
  const zones: MapZone[] = catalog.zones.filter((z) => draft.zoneIds.includes(z.id)).map((z) => ({ id: z.id, points: z.points, label: z.name, color: '#279aff', fillOpacity: 0.07 }));
  const site = (id?: string) => catalog.sites.find((s) => s.id === id);
  const depot = site(draft.depotId); const assembly = site(draft.assemblyId); const discharge = site(draft.dischargeId);
  const markers: MapMarker[] = [
    ...(depot ? [{ id: 'depot', position: depot.position, label: 'Start Depot', tooltip: depot.name, iconUrl: depotPinUrl, iconSize: [34, 40] as [number, number] }] : []),
    ...(assembly ? [{ id: 'assembly', position: assembly.position, label: 'Assembly Point', tooltip: assembly.name, iconUrl: assemblyPinUrl, iconSize: [34, 40] as [number, number] }] : []),
    ...(discharge ? [{ id: 'discharge', position: discharge.position, label: 'Discharge Point', tooltip: discharge.name, iconUrl: dischargePinUrl, iconSize: [34, 40] as [number, number] }] : []),
  ];
  return (
    <div className="relative w-full shrink-0 overflow-hidden rounded-[4px]" style={{ height }}>
      <MapView center={catalog.center} zoom={catalog.zoom ?? 10} zones={zones} markers={markers} fitToContent showReset={false} className="h-full w-full" />
      {withSiteCard && (
        <div className="absolute bottom-4 left-4 z-[400] flex w-[192px] flex-col gap-3 rounded-[4px] bg-white px-3 py-2.5 shadow-[6px_10px_12px_rgba(0,0,0,0.08)]">
          {[{ k: 'Start Depot', s: depot, pin: depotPinUrl }, { k: 'Assembly Point', s: assembly, pin: assemblyPinUrl }, { k: 'Discharge Station', s: discharge, pin: dischargePinUrl }].map(({ k, s, pin }) => (
            <div key={k} className="flex items-start gap-2">
              <img src={pin} alt="" className="mt-0.5 h-5 w-[18px] shrink-0 object-contain" />
              <span className="flex min-w-0 flex-col">
                <span className="text-[10px] font-semibold text-[var(--gray-500)]">{k}</span>
                <span className="truncate text-[14px] font-semibold text-black">{s?.name ?? '—'}</span>
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/* ── wizard ─────────────────────────────────────────────────────────────── */

export function FloodPlanWizard({ catalog, existingNames, open, onOpenChange, onCreate }: FloodPlanWizardProps) {
  const [step, setStep] = React.useState<Step>(0);
  const [draft, setDraft] = React.useState<FloodPlanDraft>({ ...EMPTY_FLOOD_DRAFT, service: catalog.service });
  const [mapped, setMapped] = React.useState(false);
  const [planning, setPlanning] = React.useState(false);
  const [touched, setTouched] = React.useState(false);
  const set = <K extends keyof FloodPlanDraft>(k: K, v: FloodPlanDraft[K]) => setDraft((d) => ({ ...d, [k]: v }));

  // fresh draft every time the sheet opens
  React.useEffect(() => { if (open) { setStep(0); setDraft({ ...EMPTY_FLOOD_DRAFT, service: catalog.service }); setMapped(false); setTouched(false); } }, [open, catalog.service]);

  const name = draft.name.trim();
  const duplicate = !!name && existingNames.some((n) => n.trim().toLowerCase() === name.toLowerCase());
  const nameError = touched && !name ? 'Plan name is required.' : duplicate ? 'A plan with this name already exists — choose a unique name.' : undefined;
  const step1Valid = !!name && !duplicate && draft.zoneIds.length > 0;
  const step2Valid = mapped && !!draft.vehicleTypeId && !!draft.workforceTypeId;

  const onZonesChange = (ids: string[]) => setDraft((d) => {
    const keep = (sid?: string) => (sid && ids.includes(catalog.sites.find((s) => s.id === sid)?.zoneId ?? '') ? sid : undefined);
    return { ...d, zoneIds: ids, depotId: keep(d.depotId), assemblyId: keep(d.assemblyId), dischargeId: keep(d.dischargeId) };
  });
  const clone = (id: string) => {
    const p = catalog.existingPlans.find((x) => x.id === id);
    if (!p) return;
    onZonesChange(p.zoneIds);
    setDraft((d) => ({ ...d, clonePlanId: id, description: d.description || `Cloned from ${p.name}.` }));
  };

  const zone = (id: string) => catalog.zones.find((z) => z.id === id);
  const site = (id?: string) => catalog.sites.find((s) => s.id === id)?.name ?? '—';
  const vehicle = catalog.vehicleTypes.find((v) => v.id === draft.vehicleTypeId)?.name ?? '—';
  const workforce = catalog.workforceTypes.find((w) => w.id === draft.workforceTypeId)?.name ?? '—';
  const zonesText = draft.zoneIds.map((id) => zone(id)?.name).filter(Boolean).join(', ');

  const header = step === 0
    ? { title: 'Basic Setup', sub: 'Name your plan and choose its zones — depot, assembly and discharge points are selected in Interactive Mapping. Optionally clone an existing plan.' }
    : step === 1
    ? { title: 'Interactive Mapping', sub: 'Select the plan zone, then its start depot, assembly point and discharge station on the map, and confirm the vehicle and workforce types.' }
    : { title: 'Summary', sub: 'Review the plan before it is saved as a draft.' };

  const planDetails = (
    <div className="flex w-full items-start justify-between gap-6">
      <div className="flex min-w-0 flex-1 flex-col gap-5">
        <DetailRow label="Vehicle Type" icon={<Icons.Truck02 size={16} />} value={vehicle} />
        <DetailRow label="Forecast Date" icon={<Icons.CalendarDate size={16} />} value={fmtForecastDate(draft.forecastDate)} tone="warning" />
      </div>
      <div className="flex min-w-0 flex-1 flex-col gap-5">
        <DetailRow label="Workforce Type" icon={<Icons.Users02 size={16} />} value={workforce} />
        <DetailRow label="Plan Zones" icon={<Icons.Map01 size={16} />} value={`${draft.zoneIds.length} zone${draft.zoneIds.length === 1 ? '' : 's'}`} />
      </div>
    </div>
  );

  return (
    <>
      <Sheet open={open && !planning} onOpenChange={onOpenChange}>
        <SheetContent side="right" hideClose width="902px" className="gap-0 overflow-visible border-l-0 p-0 sm:max-w-none" aria-describedby={undefined}>
          {/* floating close — Figma 2007-87617 (58px circle, 40px gap) */}
          <button type="button" onClick={() => onOpenChange(false)} aria-label="Close" className="absolute left-[-98px] top-1/2 grid size-[58px] -translate-y-1/2 place-items-center rounded-full bg-white text-black shadow-[0_4px_16px_rgba(0,0,0,0.12)] transition-opacity hover:opacity-90">
            <Icons.XClose size={24} />
          </button>

          <div className="flex h-full min-h-0 bg-[var(--gray-50)]">
            <StepperRail step={step} />

            <div className="flex h-full min-w-0 flex-1 flex-col gap-7 border-l border-[#ededed] bg-white p-5">
              <div className="flex min-h-0 flex-1 flex-col gap-5 overflow-auto">
                <div className="flex flex-col gap-1">
                  <h2 className="text-[18px] font-bold text-black">{header.title}</h2>
                  <p className="text-[14px] font-medium text-[var(--gray-500)]">{header.sub}</p>
                </div>

                {/* ── STEP 1 ───────────────────────────────────────────── */}
                {step === 0 && (
                  <div className="flex flex-col gap-6">
                    <TextField label="Plan Name" value={draft.name} onChange={(v) => { set('name', v); setTouched(true); }} placeholder="e.g. Al Wakrah Corniche Pre-position" error={nameError} />
                    <TextField label="Plan Description" value={draft.description} onChange={(v) => set('description', v)} placeholder="What this plan covers and when it should be activated." textarea />
                    <SelectField label="Service" icon={<Icons.Droplets02 size={16} />} options={[{ id: 'svc', name: catalog.service }]} value={['svc']} onChange={() => {}} placeholder={catalog.service} disabled />
                    <SelectField
                      label="Zones / Areas" icon={<Icons.Map01 size={16} />} multi
                      options={catalog.zones} value={draft.zoneIds} onChange={onZonesChange} placeholder="Select one or more zones"
                      renderOption={(z) => (
                        <span className="flex items-center justify-between gap-2">
                          <span className="flex items-center gap-2"><span className="size-2.5 rounded-full" style={{ background: z.color }} />{z.name}</span>
                          <span className="text-[12px] text-[var(--gray-500)]">{z.municipality}{z.coveredBy ? ' · in an existing plan' : ''}</span>
                        </span>
                      )}
                    />
                    <SelectField label="Clone Plan" icon={<Icons.Copy03 size={16} />} options={catalog.existingPlans} value={draft.clonePlanId ? [draft.clonePlanId] : []} onChange={([id]) => clone(id)} placeholder="Clone Plan" hint="Optional — copies the zones and sites of an existing plan into this new draft." />
                  </div>
                )}

                {/* ── STEP 2 ───────────────────────────────────────────── */}
                {step === 1 && !mapped && (
                  <div className="flex min-h-[560px] flex-1 flex-col items-center justify-center gap-6 rounded-[8px] bg-[var(--gray-50)]">
                    <img src={globeUrl} alt="" className="h-[193px] w-[175px]" />
                    <p className="w-[284px] text-center text-[18px] font-semibold leading-[21px] text-black">Define your operational zones on the map.</p>
                    <button type="button" onClick={() => setPlanning(true)} className="flex h-9 items-center justify-center rounded-[4px] bg-primary px-5 text-[16px] font-semibold text-white hover:opacity-90">Go into Planning Mode</button>
                  </div>
                )}
                {step === 1 && mapped && (
                  <div className="flex flex-col gap-4">
                    <div className="flex items-center justify-between">
                      <span className="text-[14px] font-semibold capitalize leading-[14px] text-[var(--gray-500)]">Plan Details</span>
                      <button type="button" onClick={() => setPlanning(true)} className="flex items-center gap-1 text-[12px] font-semibold text-primary hover:underline"><Icons.RegionPin size={14} />Edit in Planning Mode</button>
                    </div>
                    <div className="flex flex-col gap-5">
                      {planDetails}
                      <PreviewMap catalog={catalog} draft={draft} height={480} />
                    </div>
                  </div>
                )}

                {/* ── STEP 3 ───────────────────────────────────────────── */}
                {step === 2 && (
                  <div className="flex flex-col">
                    <div className="flex flex-col gap-4 border-b border-[var(--gray-300)] pb-5">
                      <span className="text-[14px] font-semibold leading-[14px] text-[var(--gray-500)]">Basic Details</span>
                      <div className="flex w-full items-start justify-between gap-6">
                        <div className="flex min-w-0 flex-1 flex-col gap-5">
                          <DetailRow label="Plan Name" value={draft.name} />
                          <DetailRow label="Zones / Areas" icon={<Icons.Map01 size={16} />} value={zonesText} />
                          <DetailRow label="Assembly Point" icon={<img src={assemblyPinUrl} alt="" className="h-4 w-[14px] object-contain" />} value={site(draft.assemblyId)} />
                        </div>
                        <div className="flex min-w-0 flex-1 flex-col gap-5">
                          <DetailRow label="Service" icon={<Icons.Droplets02 size={16} />} value={draft.service} />
                          <DetailRow label="Start Depot" icon={<img src={depotPinUrl} alt="" className="h-4 w-[14px] object-contain" />} value={site(draft.depotId)} />
                          <DetailRow label="Discharge Point" icon={<img src={dischargePinUrl} alt="" className="h-4 w-[14px] object-contain" />} value={site(draft.dischargeId)} />
                        </div>
                      </div>
                      {draft.description && <DetailRow label="Description" value={<span className="font-medium text-[var(--gray-700)]">{draft.description}</span>} />}
                    </div>
                    <div className="flex flex-col gap-4 pt-5">
                      <span className="text-[14px] font-semibold leading-[14px] text-[var(--gray-500)]">Plan Details</span>
                      {planDetails}
                      <PreviewMap catalog={catalog} draft={draft} height={440} withSiteCard />
                    </div>
                  </div>
                )}
              </div>

              {/* footer — Figma 2007-87692 */}
              <div className="flex items-center justify-between">
                <button type="button" onClick={() => setStep((s) => (s > 0 ? ((s - 1) as Step) : s))} className={cn('text-[18px] font-semibold text-black', step === 0 && 'pointer-events-none opacity-0')}>Back</button>
                {step < 2 ? (
                  <button
                    type="button"
                    disabled={step === 0 ? !step1Valid : !step2Valid}
                    onClick={() => { if (step === 0) setTouched(true); setStep((s) => ((s + 1) as Step)); }}
                    className={cn('flex h-10 w-[192px] items-center justify-center rounded-[4px] text-[16px] font-semibold text-white transition-colors', (step === 0 ? step1Valid : step2Valid) ? 'bg-primary hover:opacity-90' : 'bg-[var(--gray-400)]')}
                  >
                    Save and Continue
                  </button>
                ) : (
                  <button type="button" onClick={() => onCreate(draft)} className="flex h-10 w-[192px] items-center justify-center rounded-[4px] bg-primary text-[16px] font-semibold text-white hover:opacity-90">Create Plan</button>
                )}
              </div>
            </div>
          </div>
        </SheetContent>
      </Sheet>

      {/* full-screen Planning Mode (own sheet, same z-layer) */}
      <Sheet open={open && planning} onOpenChange={(o) => { if (!o) setPlanning(false); }}>
        <SheetContent side="right" hideClose width="100vw" className="gap-0 border-l-0 p-0 sm:max-w-none" aria-describedby={undefined}>
          <SheetTitle className="sr-only">Planning Mode</SheetTitle>
          <FloodPlanningMode
            catalog={catalog}
            draft={draft}
            onClose={() => setPlanning(false)}
            onConfirm={(d) => { setDraft(d); setMapped(true); setPlanning(false); }}
            className="h-full"
          />
        </SheetContent>
      </Sheet>
    </>
  );
}
