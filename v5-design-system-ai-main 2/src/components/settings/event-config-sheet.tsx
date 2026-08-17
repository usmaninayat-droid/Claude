import * as React from 'react';
import * as Icons from '../../icons';
import { EventIcon, EVENT_ICON_KEYS, EVENT_ICONS } from '../../icons';
import { cn } from '../utils/cn';
import { FloatingLabelInput, Input, Checkbox, Popover, PopoverTrigger, PopoverContent } from '../primitives';
import { StepWizardSheet } from './step-wizard-sheet';
import type { WizardStep } from './step-wizard-sheet';
import { TagChip } from './tags-categories';

/**
 * EventConfigSheet — configure a new/existing event (FAMS Settings, Figma 211-3718
 * / 211-3140 / 211-8156). A WIDE 3-step wizard on the shared StepWizardSheet:
 * Event Details (name · criticality · trigger · searchable Event-Icon picker · flags ·
 * 2-col Assign Entity) → Configure Conditions (recursive AND/OR rule builder) →
 * Actions (email/script/sms/pipeline + per-action config). Config-driven, token-only.
 */

export interface RuleCondition { id: string; tracker: string; operator: string; value: string }
export interface RuleGroup { op: 'and' | 'or'; conditions: RuleCondition[]; groups: RuleGroup[] }
export interface EventDraft {
  name: string;
  criticality: string;
  triggerPoint: string;
  iconKey: string;
  /** Classifies the event (e.g. attendance/geofence/document/OT) — an optional
   *  consumer-defined id resolving against `EventConfigSheetProps.eventTypes`.
   *  Empty string when the consumer doesn't pass `eventTypes` (unconstrained
   *  Trigger Point, same as before this field existed — fully back-compat). */
  eventType: string;
  flags: { zoneBased: boolean; tripLocationBased: boolean };
  entityScope: string;
  assetTypes: string[];
  tagIds: string[];
  rule: RuleGroup;
  actions: { email: boolean; script: boolean; sms: boolean; pipeline: boolean };
  emailTo: string;
}

/** One Event Type option — `triggers` is the subset of Trigger Point values
 *  valid for this type (Law 4: type→trigger linkage is a data table, not
 *  hardcoded branching). Passing `eventTypes` to `EventConfigSheet` both shows
 *  the "Event Type" select AND constrains Trigger Point to `triggers`; omit
 *  the prop entirely to keep the original unconstrained behaviour. */
export interface EventTypeOption { id: string; label: string; triggers: string[] }

// Default vocab — a non-fleet recipe overrides any of these via EventConfigSheetProps
// (trackers / assetTypes / entityScopes / tags) rather than forking this component (Law 4).
const CRITICALITIES = ['Normal', 'Critical'];
const TRIGGERS = ['Periodic Data', 'Real-time', 'On Event', 'Scheduled'];
export const DEFAULT_TRACKERS = ['Speed', 'Fuel Level', 'Engine Temp', 'Idle Time', 'Location', 'Ignition'];
const OPERATORS = ['>', '<', '=', '>=', '<=', '≠'];
export const DEFAULT_ASSET_TYPES = ['Trucks', 'Cars', 'Bins', 'Waste Trucks', 'Garbage Trucks', 'EV Cars', 'Lift (Elevator)'];
/** One "List of All Entities" radio option (T-097). `members` is that category's
 *  OWN named-instance catalogue — when provided, selecting this scope shows ONLY
 *  these members in the "Assign by Entity" grid (never every category mixed
 *  together). Omit `members` for a scope with no discrete catalogue (falls back
 *  to the shared flat `assetTypes` list — the original, pre-T-097 behaviour,
 *  fully back-compat with any consumer that doesn't pass per-category members). */
export interface EntityScopeOption {
  id: string;
  label: string;
  icon: React.ComponentType<{ size?: number; className?: string }>;
  desc: string;
  members?: string[];
}
export const DEFAULT_ENTITY_SCOPES: EntityScopeOption[] = [
  { id: 'all', label: 'All Entities', icon: Icons.Grid01, desc: 'Apply this event across every entity.' },
  { id: 'assets', label: 'All Assets', icon: Icons.Car01, desc: 'Vehicles and equipment.', members: DEFAULT_ASSET_TYPES },
  { id: 'devices', label: 'All Devices', icon: Icons.Signal01, desc: 'Telematics devices / trackers.' },
  { id: 'workforce', label: 'All Workforce', icon: Icons.Users01, desc: 'Drivers and field staff.' },
];
/** One "flags row" checkbox — `key` maps to the matching `EventDraft.flags`
 *  boolean, `label` is fleet vocabulary by default ("Zone Based"/"Trip
 *  Location Based") but is consumer-overridable per Law 4 (config, not
 *  bespoke branching) via `EventConfigSheetProps.flagOptions`. */
export interface EventFlagOption { key: keyof EventDraft['flags']; label: string }
export const DEFAULT_FLAG_OPTIONS: EventFlagOption[] = [
  { key: 'zoneBased', label: 'Zone Based' },
  { key: 'tripLocationBased', label: 'Trip Location Based' },
];
export const DEFAULT_TAGS = [{ id: 'red', label: 'Red', color: '#B94A3F' }, { id: 'waste-truck', label: 'Waste Truck', color: '#475467' }, { id: 'landrover', label: 'Landrover', color: '#4FBE6E' }]; // coherence-allow — sample tag data
const ACTION_LIST = [
  { id: 'email', label: 'Send Email' }, { id: 'script', label: 'Trigger Action Script' },
  { id: 'sms', label: 'Send SMS' }, { id: 'pipeline', label: 'Task in Pipeline' },
] as const;

const emptyRule = (tracker = ''): RuleGroup => ({ op: 'or', conditions: [{ id: 'c1', tracker, operator: '>', value: '' }], groups: [] });
/** True when the group (or any nested group) has at least one condition with a non-empty value. */
const hasCondition = (g: RuleGroup): boolean => g.conditions.some((c) => c.value.trim().length > 0) || g.groups.some(hasCondition);

export interface EventConfigSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initial?: Partial<EventDraft> & { id?: string };
  onSubmit: (draft: EventDraft) => void;
  onSaveDraft?: (draft: EventDraft) => void;
  /** Rule-condition tracker vocabulary. Defaults to `DEFAULT_TRACKERS`. */
  trackers?: string[];
  /** "Assign by Asset Type" checkbox vocabulary. Defaults to `DEFAULT_ASSET_TYPES`. */
  assetTypes?: string[];
  /** "List of All Entities" radio options — each may carry its own `members`
   *  catalogue (T-097). Defaults to `DEFAULT_ENTITY_SCOPES`. */
  entityScopes?: EntityScopeOption[];
  /** "Assign by Tags" catalogue. Defaults to `DEFAULT_TAGS`. */
  tags?: typeof DEFAULT_TAGS;
  /** Event Type vocabulary + per-type valid Trigger Point subset. Omit to keep
   *  the original unconstrained Trigger Point select (no Event Type field shown). */
  eventTypes?: EventTypeOption[];
  /** Overrides the "List of All Entities" box heading. Defaults to that string. */
  entityScopeLabel?: string;
  /** Overrides the "Assign by Asset Type" box heading. Defaults to that string. */
  assetTypeLabel?: string;
  /** Vocabulary + visibility for the flags row under General Event Detail.
   *  Defaults to the fleet pair (Zone Based / Trip Location Based); pass a
   *  relabelled set (e.g. `[{key:'zoneBased', label:'Geo-zone validated'}]`)
   *  for a non-fleet domain, or `[]` to hide the row entirely. */
  flagOptions?: EventFlagOption[];
}

export function EventConfigSheet({
  open, onOpenChange, initial, onSubmit, onSaveDraft,
  trackers = DEFAULT_TRACKERS, assetTypes = DEFAULT_ASSET_TYPES, entityScopes = DEFAULT_ENTITY_SCOPES, tags = DEFAULT_TAGS,
  eventTypes, entityScopeLabel = 'List of All Entities', assetTypeLabel = 'Assign by Asset Type',
  flagOptions = DEFAULT_FLAG_OPTIONS,
}: EventConfigSheetProps) {
  const isEdit = !!initial?.id;
  // Assign Entity (T-097): the RIGHT panel shows ONLY the selected LEFT
  // category's members — never every category's members mixed in one grid.
  const scopesWithMembers = React.useMemo(() => entityScopes.filter((s) => s.members && s.members.length > 0), [entityScopes]);
  const hasCategorizedMembers = scopesWithMembers.length > 0;
  /** The "whole category" default set for a scope — pre-checking every member
   *  is the All-X semantic (T-097 fix pt.2): unchecking some narrows it to a
   *  subset. A scope without its own catalogue (e.g. "All Entities") groups
   *  every OTHER category's members together. */
  const fullMembersFor = React.useCallback((scopeId: string): string[] => {
    if (!hasCategorizedMembers) return assetTypes;
    const s = entityScopes.find((x) => x.id === scopeId);
    if (s?.members) return s.members;
    return scopesWithMembers.flatMap((x) => x.members ?? []);
  }, [entityScopes, scopesWithMembers, hasCategorizedMembers, assetTypes]);
  const [d, setD] = React.useState<EventDraft>(() => {
    const scopeId = entityScopes[0]?.id;
    return { ...blank(trackers[0], scopeId), assetTypes: scopeId ? fullMembersFor(scopeId) : [] };
  });
  // Per-category member picks (T-097): remembers what was checked for a scope
  // the user has already visited THIS sheet session, so switching Sites →
  // Trades → back to Sites restores the earlier picks rather than resetting.
  const [scopeSelections, setScopeSelections] = React.useState<Record<string, string[]>>({});
  React.useEffect(() => {
    if (!open) return;
    // Default Event Type (when the consumer passes eventTypes) also seeds a
    // VALID default Trigger Point for it, so the two selects never open on a
    // mismatched combo before the user touches either one.
    const scopeId = entityScopes[0]?.id;
    const base = { ...blank(trackers[0], scopeId), assetTypes: scopeId ? fullMembersFor(scopeId) : [] };
    const defaultType = eventTypes?.[0];
    if (defaultType && !initial?.triggerPoint) base.triggerPoint = defaultType.triggers[0] ?? base.triggerPoint;
    setD({ ...base, eventType: defaultType?.id ?? '', ...initial });
    setScopeSelections({});
    /* eslint-disable-next-line react-hooks/exhaustive-deps */
  }, [open]);
  const set = (patch: Partial<EventDraft>) => setD((cur) => ({ ...cur, ...patch }));
  const triggerOptions = eventTypes && eventTypes.length > 0 ? (eventTypes.find((t) => t.id === d.eventType)?.triggers ?? TRIGGERS) : TRIGGERS;
  const seq = React.useRef(1);
  const nextId = () => `c${(seq.current += 1)}`;
  const [tagQuery, setTagQuery] = React.useState('');
  const visibleTags = React.useMemo(() => {
    const s = tagQuery.trim().toLowerCase();
    return s ? tags.filter((t) => t.label.toLowerCase().includes(s)) : tags;
  }, [tags, tagQuery]);

  const activeScope = entityScopes.find((s) => s.id === d.entityScope);
  const selectScope = (id: string) => {
    if (id === d.entityScope) return;
    setScopeSelections((prev) => ({ ...prev, [d.entityScope]: d.assetTypes }));
    const remembered = scopeSelections[id];
    set({ entityScope: id, assetTypes: remembered ?? fullMembersFor(id) });
  };
  /** Sections to render in the "Assign by Entity" grid: one flat legacy list
   *  (no consumer opted into per-category members), the ACTIVE category's own
   *  members only, or — for a scope with no catalogue of its own ("All
   *  Entities") — every categorized scope grouped under its own heading. */
  const memberSections: { key: string; heading?: string; members: string[] }[] = !hasCategorizedMembers
    ? [{ key: 'flat', members: assetTypes }]
    : activeScope?.members
      ? [{ key: activeScope.id, members: activeScope.members }]
      : scopesWithMembers.map((s) => ({ key: s.id, heading: s.label, members: s.members ?? [] }));
  const wholeCategoryNote = activeScope?.members && activeScope.members.length > 0 && activeScope.members.every((m) => d.assetTypes.includes(m));

  const steps: WizardStep[] = [
    {
      id: 'details', label: 'Event Details', canProceed: d.name.trim().length > 0,
      render: () => (
        <div className="flex flex-col gap-6">
          <section className="flex flex-col gap-3">
            <h3 className="text-body-md font-semibold text-foreground">General Event Detail</h3>
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
              <FloatingLabelInput label="Event Name *" placeholder="e.g. Over Speeding Event" value={d.name} onChange={(e) => set({ name: e.target.value })} />
              <Select label="Criticality Level" value={d.criticality} options={CRITICALITIES} onChange={(v) => set({ criticality: v })} />
              {eventTypes && eventTypes.length > 0 && (
                <Select
                  label="Event Type"
                  value={eventTypes.find((t) => t.id === d.eventType)?.label ?? ''}
                  options={eventTypes.map((t) => t.label)}
                  onChange={(label) => {
                    const opt = eventTypes.find((t) => t.label === label);
                    if (!opt) return;
                    set({ eventType: opt.id, triggerPoint: opt.triggers.includes(d.triggerPoint) ? d.triggerPoint : (opt.triggers[0] ?? d.triggerPoint) });
                  }}
                />
              )}
              <Select label="Trigger Point" value={d.triggerPoint} options={triggerOptions} onChange={(v) => set({ triggerPoint: v })} />
              <IconCombobox value={d.iconKey} onChange={(v) => set({ iconKey: v })} />
            </div>
            {flagOptions.length > 0 && (
              <div className="flex flex-wrap items-center gap-6 pt-1">
                {flagOptions.map((f) => (
                  <Flag key={f.key} label={f.label} checked={d.flags[f.key]} onChange={(v) => set({ flags: { ...d.flags, [f.key]: v } })} />
                ))}
              </div>
            )}
          </section>

          <section className="flex flex-col gap-3">
            <h3 className="text-body-md font-semibold text-foreground">Assign Entity</h3>
            <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
              <div className="rounded-xl border border-border p-3">
                <div className="mb-2 text-body-xs font-semibold text-muted-foreground">{entityScopeLabel}</div>
                <div className="flex flex-col gap-1">
                  {entityScopes.map((s) => {
                    const on = d.entityScope === s.id;
                    const Icon = s.icon;
                    return (
                      <button key={s.id} type="button" role="radio" aria-checked={on} onClick={() => selectScope(s.id)} className={cn('flex items-center gap-3 rounded-lg border p-3 text-left transition-colors focus-visible:ring-2 focus-visible:ring-ring', on ? 'border-primary bg-primary/5' : 'border-transparent hover:bg-muted/40')}>
                        <span className={cn('grid size-4 shrink-0 place-items-center rounded-full border', on ? 'border-primary text-primary' : 'border-muted-foreground/40')}>{on && <span className="size-2 rounded-full bg-primary" />}</span>
                        <Icon size={18} className="shrink-0 text-muted-foreground" />
                        <span className="flex flex-col"><span className={cn('text-body-sm font-semibold', on ? 'text-primary' : 'text-foreground')}>{s.label}</span><span className="text-body-xs text-muted-foreground">{s.desc}</span></span>
                      </button>
                    );
                  })}
                </div>
              </div>
              <div className="flex flex-col gap-4 rounded-xl border border-border p-3">
                <div>
                  <div className="mb-2 text-body-xs font-semibold text-muted-foreground">{assetTypeLabel}</div>
                  {memberSections.every((sec) => sec.members.length === 0) ? (
                    <div className="rounded-lg border border-dashed border-border px-3 py-4 text-center text-body-sm text-muted-foreground">No entities configured for this category.</div>
                  ) : (
                    <div className="flex max-h-56 flex-col gap-3 overflow-auto pr-1">
                      {memberSections.map((sec) => (
                        <div key={sec.key} className="flex flex-col gap-2">
                          {sec.heading && <div className="text-caption font-semibold uppercase tracking-wide text-muted-foreground">{sec.heading}</div>}
                          <div className="grid grid-cols-2 gap-x-4 gap-y-2">
                            {sec.members.map((t) => (
                              <label key={t} className="flex items-center gap-2 text-body-sm text-foreground">
                                <Checkbox checked={d.assetTypes.includes(t)} onCheckedChange={(v) => set({ assetTypes: v ? [...d.assetTypes, t] : d.assetTypes.filter((x) => x !== t) })} />{t}
                              </label>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                  {wholeCategoryNote && (
                    <div className="mt-2 text-body-xs text-muted-foreground">Applies to the whole category — uncheck any to scope to a subset.</div>
                  )}
                </div>
                <div>
                  <div className="mb-2 text-body-xs font-semibold text-muted-foreground">Assign by Tags</div>
                  <div className="relative">
                    <Icons.SearchSm size={15} className="pointer-events-none absolute left-2.5 top-1/2 z-10 -translate-y-1/2 text-muted-foreground" />
                    <Input placeholder="Search for your desired tags here" value={tagQuery} onChange={(e) => setTagQuery(e.target.value)} className="pl-8" />
                  </div>
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {visibleTags.map((t) => {
                      const on = d.tagIds.includes(t.id);
                      return on ? (
                        <TagChip key={t.id} label={t.label} color={t.color} onRemove={() => set({ tagIds: d.tagIds.filter((x) => x !== t.id) })} />
                      ) : (
                        <button
                          key={t.id}
                          type="button"
                          onClick={() => set({ tagIds: [...d.tagIds, t.id] })}
                          className="inline-flex min-h-[34px] items-center gap-1.5 rounded-md border border-border px-3.5 py-2 text-body-sm font-medium text-muted-foreground transition-colors hover:bg-muted/40 focus-visible:ring-2 focus-visible:ring-ring"
                        >
                          {t.label}
                        </button>
                      );
                    })}
                    {!visibleTags.length && <span className="px-1 py-2 text-body-sm text-muted-foreground">No tags match.</span>}
                  </div>
                </div>
              </div>
            </div>
          </section>
        </div>
      ),
    },
    {
      id: 'conditions', label: 'Configure Conditions', canProceed: hasCondition(d.rule),
      render: () => (
        <div className="flex flex-col gap-4">
          <h3 className="inline-flex items-center gap-1.5 text-body-md font-semibold text-foreground">Rule Start <Icons.HelpCircle size={15} className="text-muted-foreground" /></h3>
          <RuleGroupEditor group={d.rule} onChange={(rule) => set({ rule })} nextId={nextId} trackers={trackers} />
          <div className="flex items-center gap-3">
            <button type="button" disabled title="Coming soon" className="rounded-lg border border-border px-3.5 py-2 text-body-sm font-semibold text-foreground transition-colors hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:bg-transparent">Add Rule Delay</button>
            <button type="button" disabled title="Coming soon" className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-3.5 py-2 text-body-sm font-semibold text-primary-foreground transition-colors hover:opacity-90 focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:opacity-50"><Icons.Plus size={15} />Add Rule End</button>
          </div>
        </div>
      ),
    },
    {
      id: 'actions', label: 'Actions', canProceed: Object.values(d.actions).some(Boolean) && (!d.actions.email || d.emailTo.trim().length > 0),
      render: () => (
        <div className="flex flex-col gap-4">
          <h3 className="inline-flex items-center gap-1.5 text-body-md font-semibold text-foreground">Select Action <Icons.HelpCircle size={15} className="text-muted-foreground" /></h3>
          <div className="flex flex-wrap items-center gap-6">
            {ACTION_LIST.map((a) => (
              <label key={a.id} className="flex items-center gap-2 text-body-sm text-foreground">
                <Checkbox checked={d.actions[a.id]} onCheckedChange={(v) => set({ actions: { ...d.actions, [a.id]: !!v } })} />{a.label}
              </label>
            ))}
          </div>
          {d.actions.email && (
            <label className="flex max-w-xl flex-col gap-1">
              <span className="text-body-xs font-medium text-muted-foreground">Send Email on *</span>
              <Input type="email" placeholder="support@fams.com" value={d.emailTo} onChange={(e) => set({ emailTo: e.target.value })} />
            </label>
          )}
        </div>
      ),
    },
  ];

  return (
    <StepWizardSheet
      open={open}
      onOpenChange={onOpenChange}
      title={isEdit ? 'Configure Event' : 'Configure New Event'}
      description="Set the event's details and trigger, build its condition rules, then choose what happens when it fires."
      steps={steps}
      width="min(1040px, 96vw)"
      submitLabel={isEdit ? 'Save Event' : 'Create Event'}
      onCancel={() => onOpenChange(false)}
      secondaryAction={onSaveDraft ? { label: 'Save as draft', onClick: () => onSaveDraft(d), disabled: !d.name.trim() } : undefined}
      onComplete={() => { if (d.name.trim()) onSubmit(d); }}
    />
  );
}

function blank(tracker = '', defaultScope = 'assets'): EventDraft {
  return { name: '', criticality: 'Normal', triggerPoint: 'Periodic Data', iconKey: '', eventType: '', flags: { zoneBased: false, tripLocationBased: false }, entityScope: defaultScope, assetTypes: [], tagIds: [], rule: emptyRule(tracker), actions: { email: false, script: false, sms: false, pipeline: false }, emailTo: '' };
}

/** A labelled dropdown select (floating-label style). */
function Select({ label, value, options, onChange }: { label: string; value: string; options: string[]; onChange: (v: string) => void }) {
  const [open, setOpen] = React.useState(false);
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button type="button" className="flex h-14 flex-col justify-center rounded-md border border-border bg-input-background px-3 text-left outline-none transition-colors hover:bg-muted/40 focus-visible:ring-2 focus-visible:ring-ring">
          <span className="text-caption font-medium text-muted-foreground">{label}</span>
          <span className="flex items-center justify-between gap-2 text-body-sm text-foreground">{value || 'Select'}<Icons.ChevronDown size={16} className="text-muted-foreground" /></span>
        </button>
      </PopoverTrigger>
      <PopoverContent align="start" className="max-h-64 w-[--radix-popover-trigger-width] overflow-auto p-1">
        {options.map((o) => <button key={o} type="button" onClick={() => { onChange(o); setOpen(false); }} className="flex w-full rounded-md px-2.5 py-2 text-left text-body-sm text-foreground transition-colors hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring">{o}</button>)}
      </PopoverContent>
    </Popover>
  );
}

/** Searchable Event-Icon picker over the DS EVENT_ICONS registry. */
function IconCombobox({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const [open, setOpen] = React.useState(false);
  const [q, setQ] = React.useState('');
  const results = React.useMemo(() => {
    const s = q.trim().toLowerCase();
    return EVENT_ICON_KEYS.filter((k) => !s || (EVENT_ICONS[k]?.label ?? k).toLowerCase().includes(s));
  }, [q]);
  const label = value ? EVENT_ICONS[value]?.label ?? value : '';
  return (
    <Popover open={open} onOpenChange={(o) => { setOpen(o); if (!o) setQ(''); }}>
      <PopoverTrigger asChild>
        <button type="button" className="flex h-14 flex-col justify-center rounded-md border border-border bg-input-background px-3 text-left outline-none transition-colors hover:bg-muted/40 focus-visible:ring-2 focus-visible:ring-ring">
          <span className="text-caption font-medium text-muted-foreground">Select Event Icon</span>
          <span className="flex items-center justify-between gap-2 text-body-sm text-foreground">
            <span className="flex items-center gap-2">{value ? <EventIcon name={value} size={18} /> : null}{label || 'Select icon'}</span>
            <Icons.ChevronDown size={16} className="text-muted-foreground" />
          </span>
        </button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-[--radix-popover-trigger-width] p-2">
        <div className="relative mb-1">
          <Icons.SearchSm size={15} className="pointer-events-none absolute left-2.5 top-1/2 z-10 -translate-y-1/2 text-muted-foreground" />
          <Input autoFocus placeholder="Type to find an event icon" value={q} onChange={(e) => setQ(e.target.value)} className="pl-8" />
        </div>
        <div className="max-h-56 overflow-auto">
          {results.map((k) => (
            <button key={k} type="button" onClick={() => { onChange(k); setOpen(false); setQ(''); }} className="flex w-full items-center gap-2.5 rounded-md px-2.5 py-2 text-left text-body-sm text-foreground transition-colors hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring">
              <EventIcon name={k} size={18} />{EVENT_ICONS[k]?.label ?? k}
            </button>
          ))}
          {!results.length && <div className="px-2.5 py-3 text-body-sm text-muted-foreground">No icons match.</div>}
        </div>
      </PopoverContent>
    </Popover>
  );
}

function Flag({ label, checked, onChange }: { label: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <label className="flex items-center gap-2 text-body-sm text-foreground">
      <Checkbox checked={checked} onCheckedChange={(v) => onChange(!!v)} />{label}
      <Icons.HelpCircle size={14} className="text-muted-foreground" />
    </label>
  );
}

/** Recursive AND/OR condition group editor. `trackers` is passed down from EventConfigSheetProps (Law 4). */
function RuleGroupEditor({ group, onChange, nextId, trackers, depth = 0 }: { group: RuleGroup; onChange: (g: RuleGroup) => void; nextId: () => string; trackers: string[]; depth?: number }) {
  const setOp = (op: 'and' | 'or') => onChange({ ...group, op });
  const addCondition = () => onChange({ ...group, conditions: [...group.conditions, { id: nextId(), tracker: trackers[0] ?? '', operator: '>', value: '' }] });
  const addNested = () => onChange({ ...group, groups: [...group.groups, emptyRule(trackers[0])] });
  const setCond = (id: string, patch: Partial<RuleCondition>) => onChange({ ...group, conditions: group.conditions.map((c) => (c.id === id ? { ...c, ...patch } : c)) });
  const removeCond = (id: string) => onChange({ ...group, conditions: group.conditions.filter((c) => c.id !== id) });
  const setGroup = (i: number, g: RuleGroup) => onChange({ ...group, groups: group.groups.map((x, j) => (j === i ? g : x)) });
  const removeGroup = (i: number) => onChange({ ...group, groups: group.groups.filter((_, j) => j !== i) });

  return (
    <div className={cn('rounded-xl border border-border p-4', depth > 0 && 'bg-muted/20')}>
      <div className="mb-3 inline-flex overflow-hidden rounded-md border border-border text-body-xs font-semibold">
        {(['and', 'or'] as const).map((op) => (
          <button key={op} type="button" onClick={() => setOp(op)} className={cn('px-3 py-1 uppercase transition-colors focus-visible:ring-2 focus-visible:ring-ring', group.op === op ? 'bg-primary text-primary-foreground' : 'bg-card text-muted-foreground hover:bg-muted')}>{op}</button>
        ))}
      </div>
      <div className="flex flex-col gap-2">
        {group.conditions.map((c) => (
          <div key={c.id} className="flex flex-wrap items-center gap-2">
            <div className="min-w-[160px] flex-1"><Select label="Tracker Value" value={c.tracker} options={trackers} onChange={(v) => setCond(c.id, { tracker: v })} /></div>
            <div className="w-28"><Select label="Operator" value={c.operator} options={OPERATORS} onChange={(v) => setCond(c.id, { operator: v })} /></div>
            <label className="flex w-32 flex-col rounded-lg border border-border bg-card px-3 py-2">
              <span className="text-caption font-medium text-muted-foreground">Trigger Value</span>
              <input value={c.value} onChange={(e) => setCond(c.id, { value: e.target.value })} className="bg-transparent text-body-sm text-foreground outline-none" placeholder="0" />
            </label>
            <button type="button" aria-label="Remove condition" onClick={() => removeCond(c.id)} className="rounded-sm text-[var(--status-error)] hover:opacity-70 focus-visible:ring-2 focus-visible:ring-ring"><Icons.XClose size={16} /></button>
          </div>
        ))}
        {!group.conditions.length && !group.groups.length && (
          <div className="rounded-lg border border-dashed border-border px-3 py-4 text-center text-body-sm text-muted-foreground">No conditions yet — add one below.</div>
        )}
        {group.groups.map((g, i) => (
          <div key={i} className="flex items-start gap-2">
            <div className="flex-1"><RuleGroupEditor group={g} onChange={(ng) => setGroup(i, ng)} nextId={nextId} trackers={trackers} depth={depth + 1} /></div>
            <button type="button" aria-label="Remove group" onClick={() => removeGroup(i)} className="mt-4 rounded-sm text-[var(--status-error)] hover:opacity-70 focus-visible:ring-2 focus-visible:ring-ring"><Icons.XClose size={16} /></button>
          </div>
        ))}
      </div>
      <div className="mt-3 flex items-center gap-4">
        <button type="button" onClick={addCondition} className="rounded-sm text-body-xs font-semibold text-primary hover:underline focus-visible:ring-2 focus-visible:ring-ring">+ Add condition</button>
        {depth < 1 && <button type="button" onClick={addNested} className="rounded-sm text-body-xs font-semibold text-foreground hover:underline focus-visible:ring-2 focus-visible:ring-ring">+ Add nested condition</button>}
      </div>
    </div>
  );
}
