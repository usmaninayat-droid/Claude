import * as React from 'react';
import * as Icons from '../../icons';
import { cn } from '../utils/cn';
import { FloatingLabelInput, Input, Textarea, Switch, Badge, Popover, PopoverTrigger, PopoverContent } from '../primitives';
import { StepWizardSheet } from './step-wizard-sheet';
import type { WizardStep } from './step-wizard-sheet';
import type { EntityIcon } from './entity-configuration';

/**
 * EntityConfigSheet — configure a new/existing entity or sub-entity (FAMS Settings,
 * Figma 398-7343 / 398-7398 / 398-8521 / 398-8604 / 398-8606). A WIDE 4-step wizard
 * on the shared StepWizardSheet:
 *   1 Entity Details — parent, icon, title/singular/plural, preview template, description
 *   2 Entity Fields  — grouped typed field builder (text/select/calendar/tags/reference),
 *                      value chips for selects, target entity + role/fields for references
 *   3 Features       — toggle optional capabilities (Documents/Activity/Timesheet/…)
 *   4 Preview Fields — map fields into card slots (Top/Body/Bottom) → the kanban/preview
 *                      card + profile/detail layout the entity renders with
 * Config-driven (every vocabulary is an optional prop with a DEFAULT_* export, Law 4),
 * token-only. The consumer persists the whole draft (wholesale) — no drop-on-save.
 */

export type EntityFieldType =
  | 'Large Text' | 'Small Text' | 'Number' | 'Single Select' | 'Multi Select'
  | 'Calendar' | 'Date' | 'Image' | 'Tags' | 'Single Reference' | 'Multi Reference' | 'Text';

export interface EntityField {
  id: string;
  name: string;
  type: EntityFieldType;
  /** Options for Single/Multi Select. */
  values?: string[];
  /** Tag category for Tags. */
  tagCategory?: string;
  /** Target entity for Single/Multi Reference. */
  refEntity?: string;
  /** Role for Single Reference. */
  refRole?: string;
  /** Display fields for a reference. */
  refFields?: string[];
}
export interface EntityFieldGroup { id: string; name: string; fields: EntityField[] }
export interface PreviewSlot { id: string; fieldId?: string; fieldName: string; type: string; refFields?: string[] }
export interface EntityFeatureOption { id: string; label: string; description: string; icon: EntityIcon; recommended?: boolean }
export interface EntityIconOption { key: string; label: string; icon: EntityIcon }

export interface EntityDraft {
  parentId?: string;
  parentName?: string;
  icon: string;
  title: string;
  singular: string;
  plural: string;
  previewTemplate: string;
  description: string;
  groups: EntityFieldGroup[];
  features: Record<string, boolean>;
  preview: { top: PreviewSlot[]; body: PreviewSlot[]; bottom: PreviewSlot[] };
}

// Default vocab — a non-fleet recipe overrides any of these via props (Law 4).
export const DEFAULT_FIELD_TYPES: EntityFieldType[] = ['Large Text', 'Small Text', 'Number', 'Single Select', 'Multi Select', 'Calendar', 'Date', 'Image', 'Tags', 'Single Reference', 'Multi Reference', 'Text'];
export const DEFAULT_TAG_CATEGORIES = ['Priority Tags', 'Status Tags', 'General', 'Truck Type'];
export const DEFAULT_PREVIEW_TEMPLATES = ['Task Details', 'Asset Details', 'Record Details', 'Compact Card'];
export const DEFAULT_REFERENCE_ROLES = ['Salesperson', 'Owner', 'Manager', 'Member', 'Watcher'];
export const DEFAULT_ENTITY_ICONS: EntityIconOption[] = [
  { key: 'Cube01', label: 'Asset', icon: Icons.Cube01 },
  { key: 'Signal01', label: 'Device', icon: Icons.Signal01 },
  { key: 'Users01', label: 'Workforce', icon: Icons.Users01 },
  { key: 'Simcard', label: 'Sim', icon: Icons.Simcard },
  { key: 'CheckDone01', label: 'Task', icon: Icons.CheckDone01 },
  { key: 'Car01', label: 'Vehicle', icon: Icons.Car01 },
  { key: 'Truck01', label: 'Truck', icon: Icons.Truck01 },
  { key: 'Database01', label: 'Data', icon: Icons.Database01 },
  { key: 'Server01', label: 'Server', icon: Icons.Server01 },
  { key: 'Tag01', label: 'Tag', icon: Icons.Tag01 },
];
export const DEFAULT_FEATURES: EntityFeatureOption[] = [
  { id: 'documents', label: 'Documents', description: 'Attach and manage files against each record.', icon: Icons.File04, recommended: true },
  { id: 'activity', label: 'Activity', description: 'Track every change and comment as an audit trail.', icon: Icons.Activity, recommended: true },
  { id: 'timesheet', label: 'Timesheet', description: 'Log time spent against each record.', icon: Icons.Clock },
  { id: 'timeline', label: 'Timeline', description: 'Visualise the record’s lifecycle over time.', icon: Icons.BarChartSquare02 },
  { id: 'linked-tasks', label: 'Linked Tasks', description: 'Relate tasks and dependencies to this entity.', icon: Icons.Link01 },
];

const ICON_BY_KEY = (icons: EntityIconOption[], key: string) => icons.find((i) => i.key === key)?.icon;
/** Field-type → glyph for the field row and preview card. */
const TYPE_ICON: Record<string, EntityIcon> = {
  'Large Text': Icons.Type01, 'Small Text': Icons.TextInput, 'Text': Icons.Type01, 'Number': Icons.Hash02,
  'Single Select': Icons.Rows01, 'Multi Select': Icons.Rows01, 'Calendar': Icons.Calendar, 'Date': Icons.Calendar,
  'Image': Icons.Image01, 'Tags': Icons.Tag01, 'Single Reference': Icons.SwitchHorizontal01, 'Multi Reference': Icons.SwitchHorizontal01,
};
const isReference = (t: string) => t === 'Single Reference' || t === 'Multi Reference';
const isSelect = (t: string) => t === 'Single Select' || t === 'Multi Select';

export interface EntityConfigSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initial?: Partial<EntityDraft> & { id?: string };
  onSubmit: (draft: EntityDraft) => void;
  onSaveDraft?: (draft: EntityDraft) => void;
  fieldTypes?: EntityFieldType[];
  tagCategories?: string[];
  previewTemplates?: string[];
  referenceRoles?: string[];
  /** Entity names available to reference. */
  referenceEntities?: string[];
  features?: EntityFeatureOption[];
  icons?: EntityIconOption[];
}

export function EntityConfigSheet({
  open, onOpenChange, initial, onSubmit, onSaveDraft,
  fieldTypes = DEFAULT_FIELD_TYPES, tagCategories = DEFAULT_TAG_CATEGORIES, previewTemplates = DEFAULT_PREVIEW_TEMPLATES,
  referenceRoles = DEFAULT_REFERENCE_ROLES, referenceEntities = [], features = DEFAULT_FEATURES, icons = DEFAULT_ENTITY_ICONS,
}: EntityConfigSheetProps) {
  const isEdit = !!initial?.id;
  const [d, setD] = React.useState<EntityDraft>(() => blank(features, previewTemplates, icons));
  React.useEffect(() => { if (open) setD({ ...blank(features, previewTemplates, icons), ...initial }); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [open]);
  const set = (patch: Partial<EntityDraft>) => setD((cur) => ({ ...cur, ...patch }));
  const seq = React.useRef(1);
  const nextId = (p: string) => `${p}${(seq.current += 1)}`;

  const allFields = React.useMemo(() => d.groups.flatMap((g) => g.fields).filter((f) => f.name.trim()), [d.groups]);
  const fieldNames = allFields.map((f) => f.name);

  // ---- Step 2 field-builder mutations — functional updates that read off `cur`, so a
  // fast sequence of calls (e.g. add-then-rename) never operates on a stale `d` snapshot. ----
  const setGroup = (gid: string, patch: Partial<EntityFieldGroup>) =>
    setD((cur) => ({ ...cur, groups: cur.groups.map((g) => (g.id === gid ? { ...g, ...patch } : g)) }));
  const removeGroup = (gid: string) => setD((cur) => ({ ...cur, groups: cur.groups.filter((g) => g.id !== gid) }));
  const addGroup = () => setD((cur) => ({ ...cur, groups: [...cur.groups, { id: nextId('grp'), name: 'New Group', fields: [] }] }));
  const addField = (gid: string, type: EntityFieldType = 'Small Text') =>
    setD((cur) => ({ ...cur, groups: cur.groups.map((g) => (g.id === gid ? { ...g, fields: [...g.fields, newField(nextId('f'), type)] } : g)) }));
  const addReferenceField = () =>
    setD((cur) => {
      if (cur.groups.length) {
        const last = cur.groups.length - 1;
        return { ...cur, groups: cur.groups.map((g, i) => (i === last ? { ...g, fields: [...g.fields, newField(nextId('f'), 'Single Reference')] } : g)) };
      }
      // No groups yet — create one and add the reference field into it, in one update.
      return { ...cur, groups: [{ id: nextId('grp'), name: 'New Group', fields: [newField(nextId('f'), 'Single Reference')] }] };
    });
  const setField = (gid: string, fid: string, patch: Partial<EntityField>) =>
    setD((cur) => ({ ...cur, groups: cur.groups.map((g) => (g.id === gid ? { ...g, fields: g.fields.map((f) => (f.id === fid ? { ...f, ...patch } : f)) } : g)) }));
  const removeField = (gid: string, fid: string) =>
    setD((cur) => ({ ...cur, groups: cur.groups.map((g) => (g.id === gid ? { ...g, fields: g.fields.filter((f) => f.id !== fid) } : g)) }));

  // running field index across all groups
  let runningIdx = 0;

  const steps: WizardStep[] = [
    {
      id: 'details', label: 'Entity Details', canProceed: d.title.trim().length > 0,
      render: () => (
        <div className="flex flex-col gap-5">
          <h3 className="text-body-md font-semibold text-foreground">Entity Details</h3>
          {d.parentName && (
            <div className="flex items-center gap-2 rounded-lg border border-border bg-muted/30 px-3.5 py-2.5">
              <span className="text-caption font-medium uppercase tracking-wide text-muted-foreground">Parent Entity Type</span>
              <span className="text-body-sm font-semibold text-foreground">{d.parentName}</span>
            </div>
          )}
          <div className="flex items-start gap-3">
            <IconCombobox value={d.icon} onChange={(v) => set({ icon: v })} icons={icons} />
            <div className="flex-1"><FloatingLabelInput label="Entity Title *" placeholder="e.g. Leads" value={d.title} onChange={(e) => set({ title: e.target.value })} /></div>
          </div>
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            <FloatingLabelInput label="Entity Singular Name" placeholder="e.g. Lead" value={d.singular} onChange={(e) => set({ singular: e.target.value })} />
            <FloatingLabelInput label="Entity Plural Name" placeholder="e.g. Leads" value={d.plural} onChange={(e) => set({ plural: e.target.value })} />
          </div>
          <Select label="Preview Template" value={d.previewTemplate} options={previewTemplates} onChange={(v) => set({ previewTemplate: v })} />
          <label className="flex flex-col gap-1.5">
            <span className="text-caption font-medium text-muted-foreground">Description</span>
            <Textarea rows={4} placeholder="Describe what this entity represents…" value={d.description} onChange={(e) => set({ description: e.target.value })} />
          </label>
        </div>
      ),
    },
    {
      id: 'fields', label: 'Entity Fields', canProceed: allFields.length > 0,
      render: () => (
        <div className="flex flex-col gap-4">
          <h3 className="text-body-md font-semibold text-foreground">Entity Fields</h3>
          {d.groups.map((g) => (
            <div key={g.id} className="rounded-xl border border-border p-3">
              <div className="mb-3 flex items-center justify-between gap-2">
                <input
                  aria-label="Group name"
                  value={g.name}
                  onChange={(e) => setGroup(g.id, { name: e.target.value })}
                  className="min-w-0 rounded-md border border-transparent bg-transparent px-2 py-1 text-body-sm font-semibold text-foreground outline-none transition-colors hover:border-border focus-visible:border-border focus-visible:ring-2 focus-visible:ring-ring"
                />
                {d.groups.length > 1 && (
                  <button type="button" aria-label={`Remove group ${g.name}`} onClick={() => removeGroup(g.id)} className="grid size-7 place-items-center rounded-md text-muted-foreground transition-colors hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring"><Icons.Trash01 size={15} /></button>
                )}
              </div>
              <div className="flex flex-col gap-2.5">
                {g.fields.map((f) => {
                  runningIdx += 1;
                  return (
                    <FieldRow
                      key={f.id}
                      index={runningIdx}
                      field={f}
                      fieldTypes={fieldTypes}
                      tagCategories={tagCategories}
                      referenceEntities={referenceEntities}
                      referenceRoles={referenceRoles}
                      onChange={(patch) => setField(g.id, f.id, patch)}
                      onRemove={() => removeField(g.id, f.id)}
                    />
                  );
                })}
                {!g.fields.length && <div className="rounded-lg border border-dashed border-border px-3 py-4 text-center text-body-sm text-muted-foreground">No fields yet — add one below.</div>}
              </div>
              <button type="button" onClick={() => addField(g.id)} className="mt-2.5 rounded-sm text-body-sm font-semibold text-primary hover:underline focus-visible:ring-2 focus-visible:ring-ring">+ Add New Field</button>
            </div>
          ))}
          <div className="flex items-center gap-5">
            <button type="button" onClick={addReferenceField} className="rounded-sm text-body-sm font-semibold text-primary hover:underline focus-visible:ring-2 focus-visible:ring-ring">+ Add New Reference Field</button>
            <button type="button" onClick={addGroup} className="rounded-sm text-body-sm font-semibold text-foreground hover:underline focus-visible:ring-2 focus-visible:ring-ring">+ Add New Group</button>
          </div>
        </div>
      ),
    },
    {
      id: 'features', label: 'Features', canProceed: true,
      render: () => (
        <div className="flex flex-col gap-4">
          <h3 className="text-body-md font-semibold text-foreground">Features</h3>
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            {features.map((f) => {
              const on = !!d.features[f.id];
              const Icon = f.icon;
              return (
                <div key={f.id} className={cn('flex items-start gap-3 rounded-xl border p-4 transition-colors', on ? 'border-primary/40 bg-primary/5' : 'border-border')}>
                  <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-secondary text-primary"><Icon size={20} /></span>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-body-sm font-semibold text-foreground">{f.label}</span>
                      {f.recommended && <Badge variant="success" size="xs">Recommended</Badge>}
                    </div>
                    <p className="mt-0.5 text-body-xs text-muted-foreground">{f.description}</p>
                  </div>
                  <Switch checked={on} onCheckedChange={(v) => set({ features: { ...d.features, [f.id]: v } })} aria-label={`${on ? 'Disable' : 'Enable'} ${f.label}`} />
                </div>
              );
            })}
          </div>
        </div>
      ),
    },
    {
      id: 'preview', label: 'Preview Fields', canProceed: true,
      render: () => (
        <div className="flex flex-col gap-5">
          <h3 className="text-body-md font-semibold text-foreground">Preview Fields</h3>
          <div className="grid place-items-center rounded-xl bg-muted/40 px-6 py-8">
            <PreviewCard preview={d.preview} fields={allFields} />
          </div>
          <p className="text-body-sm font-medium text-foreground">Link the following fields to the preview.</p>
          {(['top', 'body', 'bottom'] as const).map((slot) => (
            <SlotGroup
              key={slot}
              title={slot === 'top' ? 'Top Fields' : slot === 'body' ? 'Body Fields' : 'Bottom Fields'}
              rows={d.preview[slot]}
              allFields={allFields}
              fieldNames={fieldNames}
              onChange={(rows) => set({ preview: { ...d.preview, [slot]: rows } })}
              nextId={() => nextId('slot')}
            />
          ))}
        </div>
      ),
    },
  ];

  return (
    <StepWizardSheet
      open={open}
      onOpenChange={onOpenChange}
      title={isEdit ? 'Configure Entity' : 'Configure New Entity'}
      description="Set the entity’s details, define its fields, choose its features, then map how it previews as a card."
      steps={steps}
      width="min(1040px, 96vw)"
      submitLabel={isEdit ? 'Save Entity' : 'Create Entity'}
      onCancel={() => onOpenChange(false)}
      secondaryAction={onSaveDraft ? { label: 'Save as draft', onClick: () => onSaveDraft(d), disabled: !d.title.trim() } : undefined}
      onComplete={() => { if (d.title.trim()) onSubmit(d); }}
    />
  );
}

function newField(id: string, type: EntityFieldType): EntityField {
  return { id, name: '', type, values: isSelect(type) ? [] : undefined, refFields: type === 'Multi Reference' ? [] : undefined };
}
function blank(features: EntityFeatureOption[], previewTemplates: string[], icons: EntityIconOption[]): EntityDraft {
  return {
    icon: icons[0]?.key ?? '', title: '', singular: '', plural: '', previewTemplate: previewTemplates[0] ?? '', description: '',
    groups: [{ id: 'grp1', name: 'Pinned Fields', fields: [newField('f1', 'Large Text')] }],
    features: Object.fromEntries(features.map((f) => [f.id, !!f.recommended])),
    preview: { top: [], body: [], bottom: [] },
  };
}

/** A single field-definition row: index · name · type · type-specific extras · remove. */
function FieldRow({ index, field, fieldTypes, tagCategories, referenceEntities, referenceRoles, onChange, onRemove }: {
  index: number; field: EntityField; fieldTypes: EntityFieldType[]; tagCategories: string[]; referenceEntities: string[]; referenceRoles: string[];
  onChange: (patch: Partial<EntityField>) => void; onRemove: () => void;
}) {
  const changeType = (type: string) => onChange({
    type: type as EntityFieldType,
    values: isSelect(type) ? (field.values ?? []) : undefined,
    refFields: type === 'Multi Reference' ? (field.refFields ?? []) : undefined,
    // Clear dead type-specific data (not just `values`/`refFields`) when the new type
    // no longer uses it, so switching away from Reference/Tags doesn't persist it silently.
    refEntity: isReference(type) ? field.refEntity : undefined,
    refRole: type === 'Single Reference' ? field.refRole : undefined,
    tagCategory: type === 'Tags' ? field.tagCategory : undefined,
  });
  return (
    <div className="flex flex-wrap items-start gap-2 rounded-lg border border-border p-2.5">
      <span className="mt-3 grid size-6 shrink-0 place-items-center rounded-md bg-muted text-caption font-semibold text-muted-foreground">#{index}</span>
      <div className="min-w-[160px] flex-1">
        <label className="flex h-14 flex-col justify-center rounded-md border border-border bg-input-background px-3">
          <span className="text-caption font-medium text-muted-foreground">Field Name</span>
          <input value={field.name} onChange={(e) => onChange({ name: e.target.value })} placeholder="e.g. Title" className="bg-transparent text-body-sm text-foreground outline-none" />
        </label>
      </div>
      <div className="w-44"><Select label="Field Type" value={field.type} options={fieldTypes} onChange={changeType} leading={TYPE_ICON[field.type]} /></div>

      {isSelect(field.type) && (
        <div className="min-w-[220px] flex-1"><ChipsEditor label="Values" items={field.values ?? []} onChange={(values) => onChange({ values })} placeholder="Add value" /></div>
      )}
      {field.type === 'Tags' && (
        <div className="w-48"><Select label="Tags Category" value={field.tagCategory ?? ''} options={tagCategories} onChange={(v) => onChange({ tagCategory: v })} /></div>
      )}
      {isReference(field.type) && (
        <>
          <div className="w-48"><Select label="Entity" value={field.refEntity ?? ''} options={referenceEntities} onChange={(v) => onChange({ refEntity: v })} placeholder="Select entity" /></div>
          {field.type === 'Single Reference'
            ? <div className="w-40"><Select label="Role" value={field.refRole ?? ''} options={referenceRoles} onChange={(v) => onChange({ refRole: v })} placeholder="Select role" /></div>
            : <div className="min-w-[200px] flex-1"><ChipsEditor label="Fields" items={field.refFields ?? []} onChange={(refFields) => onChange({ refFields })} placeholder="Add field" /></div>}
        </>
      )}

      <button type="button" aria-label={`Remove field ${field.name || index}`} onClick={onRemove} className="mt-3 grid size-8 shrink-0 place-items-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-[var(--status-error)] focus-visible:ring-2 focus-visible:ring-ring"><Icons.XClose size={16} /></button>
    </div>
  );
}

/** A Top/Body/Bottom slot group in the Preview Fields step. */
function SlotGroup({ title, rows, allFields, fieldNames, onChange, nextId }: {
  title: string; rows: PreviewSlot[]; allFields: EntityField[]; fieldNames: string[];
  onChange: (rows: PreviewSlot[]) => void; nextId: () => string;
}) {
  const addRow = () => onChange([...rows, { id: nextId(), fieldName: '', type: '' }]);
  const setRow = (id: string, patch: Partial<PreviewSlot>) => onChange(rows.map((r) => (r.id === id ? { ...r, ...patch } : r)));
  const removeRow = (id: string) => onChange(rows.filter((r) => r.id !== id));
  const pick = (id: string, name: string) => {
    const f = allFields.find((x) => x.name === name);
    setRow(id, { fieldId: f?.id, fieldName: name, type: f?.type ?? 'Text', refFields: f?.refFields });
  };
  // Resolve the row's display name from its live field by id (falls back to the stored
  // name) so a slot doesn't orphan/show a stale label after the source field is renamed.
  const displayName = (r: PreviewSlot) => (r.fieldId && allFields.find((f) => f.id === r.fieldId)?.name) || r.fieldName;
  return (
    <div className="rounded-xl border border-border p-3">
      <div className="mb-2 inline-block rounded-md border border-border px-3 py-1 text-body-sm font-semibold text-foreground">{title}</div>
      <div className="flex flex-col gap-2.5">
        {rows.map((r, i) => (
          <div key={r.id} className="flex flex-wrap items-start gap-2">
            <span className="mt-3 grid size-6 shrink-0 place-items-center rounded-md bg-muted text-caption font-semibold text-muted-foreground">#{i + 1}</span>
            <div className="min-w-[180px] flex-1"><Select label="Select Field" value={displayName(r)} options={fieldNames} onChange={(v) => pick(r.id, v)} placeholder="Select field" /></div>
            <div className="w-40"><Select label="Field Type" value={r.type} options={r.type ? [r.type] : ['Text']} onChange={() => {}} disabled leading={TYPE_ICON[r.type]} /></div>
            {r.refFields && r.refFields.length > 0 && (
              <div className="flex min-w-[180px] flex-1 flex-wrap items-center gap-1.5 self-center">
                {r.refFields.map((rf) => <span key={rf} className="max-w-[12rem] truncate rounded-md bg-primary/10 px-2 py-0.5 text-caption font-medium text-primary" title={rf}>{rf}</span>)}
              </div>
            )}
            <button type="button" aria-label="Remove preview field" onClick={() => removeRow(r.id)} className="mt-3 grid size-8 shrink-0 place-items-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-[var(--status-error)] focus-visible:ring-2 focus-visible:ring-ring"><Icons.XClose size={16} /></button>
          </div>
        ))}
      </div>
      <button type="button" onClick={addRow} className="mt-2.5 rounded-sm text-body-sm font-semibold text-primary hover:underline focus-visible:ring-2 focus-visible:ring-ring">+ Add New Field</button>
    </div>
  );
}

/** Live card preview echoing the kanban/detail card the entity renders with. Resolves each
 *  slot's display name from the live field by id (fallback to the stored name) so a rename
 *  doesn't orphan the preview. */
function PreviewCard({ preview, fields }: { preview: EntityDraft['preview']; fields: EntityField[] }) {
  const empty = !preview.top.length && !preview.body.length && !preview.bottom.length;
  if (empty) return <div className="w-72 rounded-xl border border-dashed border-border bg-card px-4 py-8 text-center text-body-xs text-muted-foreground">Map fields below to build the card preview.</div>;
  const name = (r: PreviewSlot) => (r.fieldId && fields.find((f) => f.id === r.fieldId)?.name) || r.fieldName;
  const cell = (r: PreviewSlot) => <span className="truncate text-body-xs text-foreground" title={name(r)}>{name(r) || '—'}</span>;
  return (
    <div className="flex w-72 flex-col gap-2 rounded-xl border border-border bg-card p-3 shadow-sm">
      {preview.top.length > 0 && (
        <div className="flex items-center justify-between gap-2">
          <span className="truncate text-body-sm font-semibold text-foreground">{preview.top[0] ? name(preview.top[0]) || '—' : '—'}</span>
          {preview.top[1] && <span className="rounded-md bg-primary/10 px-2 py-0.5 text-caption font-medium text-primary">{name(preview.top[1])}</span>}
        </div>
      )}
      {preview.body.length > 0 && <div className="flex flex-col gap-1 border-t border-border pt-2">{preview.body.map((r) => <div key={r.id} className="flex">{cell(r)}</div>)}</div>}
      {preview.bottom.length > 0 && (
        <div className="flex items-center justify-between gap-2 border-t border-border pt-2">
          {preview.bottom.map((r) => <span key={r.id} className="truncate text-body-xs text-muted-foreground">{name(r) || '—'}</span>)}
        </div>
      )}
    </div>
  );
}

/** A labelled dropdown select (floating-label style) — local to the entity wizard.
 *  (2nd occurrence of this pattern; extracting a shared LabeledSelect is tracked as a refactor.) */
function Select({ label, value, options, onChange, placeholder = 'Select', leading: Leading, disabled }: {
  label: string; value: string; options: string[]; onChange: (v: string) => void; placeholder?: string; leading?: EntityIcon; disabled?: boolean;
}) {
  const [open, setOpen] = React.useState(false);
  return (
    <Popover open={open} onOpenChange={(o) => !disabled && setOpen(o)}>
      <PopoverTrigger asChild>
        <button type="button" disabled={disabled} aria-haspopup="listbox" aria-expanded={open} className={cn('flex h-14 w-full flex-col justify-center rounded-md border border-border bg-input-background px-3 text-left outline-none transition-colors focus-visible:ring-2 focus-visible:ring-ring', disabled ? 'cursor-default opacity-90' : 'hover:bg-muted/40')}>
          <span className="text-caption font-medium text-muted-foreground">{label}</span>
          <span className="flex items-center justify-between gap-2 text-body-sm text-foreground">
            <span className="flex min-w-0 items-center gap-2">{Leading ? <Leading size={16} className="shrink-0 text-muted-foreground" /> : null}<span className={cn('truncate', !value && 'text-muted-foreground')}>{value || placeholder}</span></span>
            {!disabled && <Icons.ChevronDown size={16} className="shrink-0 text-muted-foreground" />}
          </span>
        </button>
      </PopoverTrigger>
      <PopoverContent align="start" className="max-h-64 w-[--radix-popover-trigger-width] overflow-auto p-1">
        {options.length ? options.map((o) => (
          <button key={o} type="button" onClick={() => { onChange(o); setOpen(false); }} className="flex w-full rounded-md px-2.5 py-2 text-left text-body-sm text-foreground transition-colors hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring">{o}</button>
        )) : <div className="px-2.5 py-3 text-body-sm text-muted-foreground">No options.</div>}
      </PopoverContent>
    </Popover>
  );
}

/** Removable value/field chips with an inline add input (Enter to commit). */
function ChipsEditor({ label, items, onChange, placeholder }: { label: string; items: string[]; onChange: (items: string[]) => void; placeholder?: string }) {
  const [q, setQ] = React.useState('');
  const add = () => { const v = q.trim(); if (v && !items.includes(v)) onChange([...items, v]); setQ(''); };
  return (
    <div className="flex min-h-14 flex-col justify-center gap-1 rounded-md border border-border bg-input-background px-3 py-2">
      <span className="text-caption font-medium text-muted-foreground">{label}</span>
      <div className="flex flex-wrap items-center gap-1.5">
        {items.map((it) => (
          <span key={it} className="inline-flex max-w-[12rem] items-center gap-1 rounded-md bg-primary/10 px-2 py-0.5 text-caption font-medium text-primary">
            <span className="truncate" title={it}>{it}</span>
            <button type="button" aria-label={`Remove ${it}`} onClick={() => onChange(items.filter((x) => x !== it))} className="shrink-0 rounded-sm hover:opacity-70 focus-visible:ring-2 focus-visible:ring-ring"><Icons.XClose size={12} /></button>
          </span>
        ))}
        <input
          aria-label={label}
          value={q}
          onChange={(e) => setQ(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); add(); } }}
          onBlur={add}
          placeholder={placeholder}
          className="min-w-16 flex-1 bg-transparent text-body-sm text-foreground outline-none placeholder:text-muted-foreground"
        />
      </div>
    </div>
  );
}

/** Searchable entity-icon picker over the supplied `icons` catalogue. */
function IconCombobox({ value, onChange, icons }: { value: string; onChange: (v: string) => void; icons: EntityIconOption[] }) {
  const [open, setOpen] = React.useState(false);
  const [q, setQ] = React.useState('');
  const results = React.useMemo(() => {
    const s = q.trim().toLowerCase();
    return icons.filter((i) => !s || i.label.toLowerCase().includes(s) || i.key.toLowerCase().includes(s));
  }, [icons, q]);
  const Current = ICON_BY_KEY(icons, value);
  return (
    <Popover open={open} onOpenChange={(o) => { setOpen(o); if (!o) setQ(''); }}>
      <PopoverTrigger asChild>
        <button type="button" aria-label="Select entity icon" aria-haspopup="listbox" aria-expanded={open} className="grid h-14 w-16 place-items-center rounded-md border border-border bg-input-background text-muted-foreground outline-none transition-colors hover:bg-muted/40 focus-visible:ring-2 focus-visible:ring-ring">
          <span className="flex items-center gap-1">{Current ? <Current size={20} className="text-primary" /> : <Icons.Cube01 size={20} />}<Icons.ChevronDown size={14} /></span>
        </button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-64 p-2">
        <div className="relative mb-1">
          <Icons.SearchSm size={15} className="pointer-events-none absolute left-2.5 top-1/2 z-10 -translate-y-1/2 text-muted-foreground" />
          <Input autoFocus placeholder="Find an icon" value={q} onChange={(e) => setQ(e.target.value)} className="pl-8" />
        </div>
        <div className="grid max-h-56 grid-cols-5 gap-1 overflow-auto">
          {results.map((i) => {
            const Icon = i.icon;
            return (
              <button key={i.key} type="button" title={i.label} aria-label={i.label} onClick={() => { onChange(i.key); setOpen(false); setQ(''); }} className={cn('grid aspect-square place-items-center rounded-md transition-colors hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring', value === i.key ? 'bg-primary/10 text-primary' : 'text-foreground')}>
                <Icon size={18} />
              </button>
            );
          })}
          {!results.length && <div className="col-span-5 px-2 py-3 text-center text-body-sm text-muted-foreground">No icons match.</div>}
        </div>
      </PopoverContent>
    </Popover>
  );
}
