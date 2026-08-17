import * as React from 'react';
import * as Icons from '../../icons';
import { cn } from '../utils/cn';
import { FloatingLabelInput, Input, Textarea, Popover, PopoverTrigger, PopoverContent } from '../primitives';
import { StepWizardSheet } from './step-wizard-sheet';
import type { WizardStep } from './step-wizard-sheet';
import { SelectableCard } from './selectable-card';
import type { PipelineIcon } from './pipeline-configuration';

/**
 * PipelineConfigSheet — create/edit a pipeline (FAMS Settings, Figma 189-19137 /
 * 199-500 / 189-19721 / 189-20023; conceptual enrichments from Tadweer 1877-32352).
 * A 3-step wizard on the shared StepWizardSheet:
 *   1 Basic Info  — icon · name · description · Features (Activities/Subtasks) · Permissions
 *   2 Task Types  — SelectableCard checklist of the record types this pipeline runs
 *   3 Stages      — ordered, colour-coded, drag-reorderable stage rows
 * Config-driven (every vocabulary is an optional prop with a DEFAULT_* export, Law 4),
 * token-only. The consumer persists the whole draft (wholesale) — no drop-on-save.
 */

export type PipelineAccess = 'all' | 'restricted';
export interface PipelineStage { id: string; name: string; color: string }
export interface PipelineTaskTypeOption { id: string; name: string; description?: string; icon?: PipelineIcon }
export interface PipelineFeatureOption { id: string; label: string; description?: string; icon?: PipelineIcon }
export interface PipelineIconOption { key: string; label: string; icon: PipelineIcon }
export interface PipelineAccessOption { id: PipelineAccess; label: string; desc: string }

export interface PipelineDraft {
  icon: string;
  name: string;
  description: string;
  features: Record<string, boolean>;
  access: PipelineAccess;
  taskTypeIds: string[];
  stages: PipelineStage[];
}

// Default vocab — a non-fleet recipe overrides any of these via props (Law 4).
export const DEFAULT_PIPELINE_ICONS: PipelineIconOption[] = [
  { key: 'Columns03', label: 'Board', icon: Icons.Columns03 },
  { key: 'FilterFunnel01', label: 'Funnel', icon: Icons.FilterFunnel01 },
  { key: 'Target04', label: 'Target', icon: Icons.Target04 },
  { key: 'LayersThree01', label: 'Layers', icon: Icons.LayersThree01 },
  { key: 'Dataflow02', label: 'Flow', icon: Icons.Dataflow02 },
  { key: 'CheckDone01', label: 'Tasks', icon: Icons.CheckDone01 },
  { key: 'Users01', label: 'People', icon: Icons.Users01 },
  { key: 'BarChartSquare02', label: 'Chart', icon: Icons.BarChartSquare02 },
  { key: 'Briefcase01', label: 'Work', icon: Icons.Briefcase01 },
  { key: 'Tag01', label: 'Tag', icon: Icons.Tag01 },
  { key: 'Building02', label: 'Org', icon: Icons.Building02 },
  { key: 'Grid01', label: 'Grid', icon: Icons.Grid01 },
];
export const DEFAULT_TASK_TYPES: PipelineTaskTypeOption[] = [
  { id: 'leads', name: 'Leads', description: 'Prospects moving toward a first commitment.', icon: Icons.Tag01 },
  { id: 'deals', name: 'Deals', description: 'Opportunities tracked to close.', icon: Icons.CurrencyDollar },
  { id: 'contracts', name: 'Contracts', description: 'Agreements through their approval lifecycle.', icon: Icons.File02 },
  { id: 'reimbursements', name: 'Reimbursements', description: 'Expense claims routed for payout.', icon: Icons.CoinsStacked01 },
  { id: 'leaves', name: 'Leaves', description: 'Time-off requests and approvals.', icon: Icons.Calendar },
  { id: 'requests', name: 'Requests', description: 'General service or work requests.', icon: Icons.ClipboardCheck },
];
export const DEFAULT_PIPELINE_FEATURES: PipelineFeatureOption[] = [
  { id: 'activities', label: 'Activities', description: 'Log calls, notes and events on each record.', icon: Icons.Activity },
  { id: 'subtasks', label: 'Subtasks', description: 'Break a record into checkable subtasks.', icon: Icons.CheckSquare },
];
/** Stage colour palette — chart tokens (colour is per-stage DATA). */
export const STAGE_COLORS = ['var(--chart-1)', 'var(--chart-2)', 'var(--chart-3)', 'var(--chart-4)', 'var(--chart-5)', 'var(--chart-6)', 'var(--chart-7)', 'var(--chart-8)'];
export const DEFAULT_ACCESS_OPTIONS: PipelineAccessOption[] = [
  { id: 'all', label: 'Enable Access to All', desc: 'Gives access to all of your team members.' },
  { id: 'restricted', label: 'Restricted Access', desc: 'Gives access to specific persons / roles / tags.' },
];

const ICON_BY_KEY = (icons: PipelineIconOption[], key: string) => icons.find((i) => i.key === key)?.icon;

export interface PipelineConfigSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initial?: Partial<PipelineDraft> & { id?: string };
  onSubmit: (draft: PipelineDraft) => void;
  onSaveDraft?: (draft: PipelineDraft) => void;
  taskTypes?: PipelineTaskTypeOption[];
  features?: PipelineFeatureOption[];
  icons?: PipelineIconOption[];
  stageColors?: string[];
  accessOptions?: PipelineAccessOption[];
}

function blank(icons: PipelineIconOption[]): PipelineDraft {
  return { icon: icons[0]?.key ?? 'Columns03', name: '', description: '', features: {}, access: 'all', taskTypeIds: [], stages: [] };
}

export function PipelineConfigSheet({
  open, onOpenChange, initial, onSubmit, onSaveDraft,
  taskTypes = DEFAULT_TASK_TYPES, features = DEFAULT_PIPELINE_FEATURES, icons = DEFAULT_PIPELINE_ICONS, stageColors = STAGE_COLORS,
  accessOptions = DEFAULT_ACCESS_OPTIONS,
}: PipelineConfigSheetProps) {
  const isEdit = !!initial?.id;
  const [d, setD] = React.useState<PipelineDraft>(() => blank(icons));
  React.useEffect(() => { if (open) { const { id: _id, ...rest } = initial ?? {}; setD({ ...blank(icons), ...rest }); } /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [open]);
  const set = (patch: Partial<PipelineDraft>) => setD((cur) => ({ ...cur, ...patch }));
  const seq = React.useRef(1);
  const nextId = (p: string) => `${p}${(seq.current += 1)}`;

  const addStage = () => setD((cur) => ({ ...cur, stages: [...cur.stages, { id: nextId('st'), name: '', color: stageColors[cur.stages.length % stageColors.length] }] }));
  const setStage = (id: string, patch: Partial<PipelineStage>) => setD((cur) => ({ ...cur, stages: cur.stages.map((s) => (s.id === id ? { ...s, ...patch } : s)) }));
  const removeStage = (id: string) => setD((cur) => ({ ...cur, stages: cur.stages.filter((s) => s.id !== id) }));
  const moveStage = (from: number, to: number) => setD((cur) => {
    if (to < 0 || to >= cur.stages.length) return cur;
    const next = [...cur.stages];
    const [m] = next.splice(from, 1);
    next.splice(to, 0, m);
    return { ...cur, stages: next };
  });

  const steps: WizardStep[] = [
    {
      id: 'basic', label: 'Basic Info', canProceed: d.name.trim().length > 0,
      render: () => (
        <div className="flex flex-col gap-5">
          <h3 className="text-body-md font-semibold text-foreground">Basic Info</h3>
          <div className="flex items-start gap-3">
            <IconCombobox value={d.icon} onChange={(v) => set({ icon: v })} icons={icons} />
            <div className="flex-1"><FloatingLabelInput label="Pipeline Name *" placeholder="e.g. Simple Pipeline" value={d.name} onChange={(e) => set({ name: e.target.value })} /></div>
          </div>
          <label className="flex flex-col gap-1.5">
            <span className="text-caption font-medium text-muted-foreground">Description</span>
            <Textarea rows={3} placeholder="Describe what this pipeline is for…" value={d.description} onChange={(e) => set({ description: e.target.value })} />
          </label>

          <section className="flex flex-col gap-2">
            <h4 id="pipeline-features-label" className="text-body-sm font-semibold text-foreground">Features</h4>
            <div role="group" aria-labelledby="pipeline-features-label" className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              {features.map((f) => (
                <SelectableCard key={f.id} selected={!!d.features[f.id]} onToggle={() => set({ features: { ...d.features, [f.id]: !d.features[f.id] } })} title={f.label} icon={f.icon} description={f.description} />
              ))}
            </div>
          </section>

          <section className="flex flex-col gap-2">
            <h4 id="pipeline-perms-label" className="text-body-sm font-semibold text-foreground">Permissions</h4>
            <div
              role="radiogroup"
              aria-labelledby="pipeline-perms-label"
              className="flex flex-col gap-3"
              onKeyDown={(e) => {
                if (!['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.key)) return;
                e.preventDefault();
                const i = accessOptions.findIndex((o) => o.id === d.access);
                const dir = e.key === 'ArrowUp' || e.key === 'ArrowLeft' ? -1 : 1;
                const next = accessOptions[(i + dir + accessOptions.length) % accessOptions.length];
                if (next) set({ access: next.id });
              }}
            >
              {accessOptions.map((o) => {
                const on = d.access === o.id;
                return (
                  <button key={o.id} type="button" role="radio" aria-checked={on} onClick={() => set({ access: o.id })}
                    className={cn('flex items-center gap-3 rounded-lg border p-3 text-left transition-colors focus-visible:ring-2 focus-visible:ring-ring', on ? 'border-primary bg-primary/5' : 'border-border hover:bg-muted/40')}>
                    <span className={cn('grid size-4 shrink-0 place-items-center rounded-full border', on ? 'border-primary text-primary' : 'border-muted-foreground/40')}>{on && <span className="size-2 rounded-full bg-primary" />}</span>
                    <span className="flex flex-col"><span className={cn('text-body-sm font-semibold', on ? 'text-primary' : 'text-foreground')}>{o.label}</span><span className="text-body-xs text-muted-foreground">{o.desc}</span></span>
                  </button>
                );
              })}
            </div>
          </section>
        </div>
      ),
    },
    {
      id: 'task-types', label: 'Task Types', canProceed: d.taskTypeIds.length > 0,
      render: () => (
        <div className="flex flex-col gap-4">
          <h3 id="pipeline-task-types-label" className="text-body-md font-semibold text-foreground">Task Types</h3>
          <div role="group" aria-labelledby="pipeline-task-types-label" className="flex flex-col gap-3">
            {taskTypes.map((t) => (
              <SelectableCard key={t.id} selected={d.taskTypeIds.includes(t.id)} onToggle={() => set({ taskTypeIds: d.taskTypeIds.includes(t.id) ? d.taskTypeIds.filter((x) => x !== t.id) : [...d.taskTypeIds, t.id] })} title={t.name} icon={t.icon} description={t.description} />
            ))}
          </div>
        </div>
      ),
    },
    {
      id: 'stages', label: 'Stages', canProceed: isEdit || d.stages.some((s) => s.name.trim().length > 0),
      render: () => (
        <div className="flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <h3 className="text-body-md font-semibold text-foreground">Stages</h3>
            <button type="button" onClick={addStage} className="rounded-sm text-body-sm font-semibold text-primary hover:underline focus-visible:ring-2 focus-visible:ring-ring">+ Add Stage</button>
          </div>
          <div className="flex flex-col gap-2.5">
            {d.stages.map((s, i) => (
              <StageRow key={s.id} stage={s} index={i} total={d.stages.length} colors={stageColors} onChange={(patch) => setStage(s.id, patch)} onRemove={() => removeStage(s.id)} onReorder={moveStage} />
            ))}
            {!d.stages.length && <div className="rounded-lg border border-dashed border-border px-3 py-6 text-center text-body-sm text-muted-foreground">No stages yet — add the steps a record moves through.</div>}
          </div>
        </div>
      ),
    },
  ];

  return (
    <StepWizardSheet
      open={open}
      onOpenChange={onOpenChange}
      title={isEdit ? 'Configure Pipeline' : 'Configure New Pipeline'}
      description="Configure a new pipeline to streamline your workflow."
      steps={steps}
      width="min(760px, 96vw)"
      submitLabel={isEdit ? 'Save Pipeline' : 'Create Pipeline'}
      onCancel={() => onOpenChange(false)}
      secondaryAction={onSaveDraft ? { label: 'Save as draft', onClick: () => onSaveDraft(d), disabled: !d.name.trim() } : undefined}
      onComplete={() => { if (d.name.trim()) onSubmit(d); }}
    />
  );
}

/** A single stage row: drag handle (reorder) · colour swatch · name · remove. */
function StageRow({ stage, index, total, colors, onChange, onRemove, onReorder }: {
  stage: PipelineStage; index: number; total: number; colors: string[];
  onChange: (patch: Partial<PipelineStage>) => void; onRemove: () => void; onReorder: (from: number, to: number) => void;
}) {
  const [colorOpen, setColorOpen] = React.useState(false);
  return (
    <div
      className="flex items-center gap-2 rounded-lg border border-border bg-card p-2"
      draggable={false}
      aria-label={`Stage ${index + 1}${stage.name ? `: ${stage.name}` : ''}`}
    >
      <span className="flex shrink-0 flex-col">
        <button type="button" aria-label="Move stage up" disabled={index === 0} onClick={() => onReorder(index, index - 1)} className="grid size-4 place-items-center rounded text-muted-foreground transition-colors hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-30"><Icons.ChevronUp size={13} /></button>
        <button type="button" aria-label="Move stage down" disabled={index === total - 1} onClick={() => onReorder(index, index + 1)} className="grid size-4 place-items-center rounded text-muted-foreground transition-colors hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-30"><Icons.ChevronDown size={13} /></button>
      </span>
      <span
        className="grid size-6 shrink-0 cursor-grab place-items-center text-muted-foreground"
        draggable
        aria-label="Reorder stage"
        onDragStart={(e) => { e.dataTransfer.setData('text/plain', String(index)); e.dataTransfer.effectAllowed = 'move'; }}
        onDragOver={(e) => e.preventDefault()}
        onDrop={(e) => {
          e.preventDefault();
          const raw = e.dataTransfer.getData('text/plain');
          if (!raw) return;
          const from = Number(raw);
          if (!Number.isNaN(from) && from !== index) onReorder(from, index);
        }}
      >
        <Icons.DotsGrid size={16} />
      </span>

      <Popover open={colorOpen} onOpenChange={setColorOpen}>
        <PopoverTrigger asChild>
          <button type="button" aria-label="Stage colour" className="flex shrink-0 items-center gap-1 rounded-md border border-border p-1.5 focus-visible:ring-2 focus-visible:ring-ring">
            <span className="size-4 rounded" style={{ background: stage.color }} />
            <Icons.ChevronDown size={13} className="text-muted-foreground" />
          </button>
        </PopoverTrigger>
        <PopoverContent align="start" className="w-auto p-2">
          <div className="grid grid-cols-4 gap-1.5">
            {colors.map((c, i) => (
              <button key={c} type="button" aria-label={`Colour ${i + 1}`} onClick={() => { onChange({ color: c }); setColorOpen(false); }} className={cn('size-6 rounded-md ring-offset-2 ring-offset-popover focus-visible:ring-2 focus-visible:ring-ring', stage.color === c && 'ring-2 ring-ring')} style={{ background: c }} />
            ))}
          </div>
        </PopoverContent>
      </Popover>

      <label className="flex flex-1 flex-col justify-center">
        <span className="text-caption font-medium text-muted-foreground">Stage Name</span>
        <input value={stage.name} onChange={(e) => onChange({ name: e.target.value })} placeholder="e.g. Discovery" className="bg-transparent text-body-sm font-medium text-foreground outline-none" />
      </label>

      <button type="button" aria-label="Remove stage" onClick={onRemove} className="grid size-8 shrink-0 place-items-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-[var(--status-error)] focus-visible:ring-2 focus-visible:ring-ring"><Icons.XClose size={16} /></button>
    </div>
  );
}

/** Searchable pipeline-icon picker over the supplied catalogue. */
function IconCombobox({ value, onChange, icons }: { value: string; onChange: (v: string) => void; icons: PipelineIconOption[] }) {
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
        <button type="button" aria-label="Select pipeline icon" aria-haspopup="listbox" aria-expanded={open} className="grid h-14 w-16 place-items-center rounded-md border border-border bg-input-background text-primary outline-none transition-colors hover:bg-muted/40 focus-visible:ring-2 focus-visible:ring-ring">
          <span className="flex items-center gap-1">{Current ? <Current size={20} /> : <Icons.Columns03 size={20} />}<Icons.ChevronDown size={14} className="text-muted-foreground" /></span>
        </button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-64 p-2">
        <h4 className="mb-1.5 px-0.5 text-body-sm font-semibold text-foreground">Select Icon</h4>
        <div className="relative mb-1">
          <Icons.SearchSm size={15} className="pointer-events-none absolute left-2.5 top-1/2 z-10 -translate-y-1/2 text-muted-foreground" />
          <Input autoFocus placeholder="Search Icons" value={q} onChange={(e) => setQ(e.target.value)} className="pl-8" />
        </div>
        <div className="grid max-h-56 grid-cols-5 gap-1 overflow-auto">
          {results.map((i) => {
            const Icon = i.icon;
            return (
              <button key={i.key} type="button" title={i.label} aria-label={i.label} onClick={() => { onChange(i.key); setOpen(false); setQ(''); }} className={cn('grid aspect-square place-items-center rounded-md transition-colors hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring', value === i.key ? 'bg-primary/10 text-primary' : 'text-foreground')}><Icon size={18} /></button>
            );
          })}
          {!results.length && <div className="col-span-5 px-2 py-3 text-center text-body-sm text-muted-foreground">No icons match.</div>}
        </div>
      </PopoverContent>
    </Popover>
  );
}
