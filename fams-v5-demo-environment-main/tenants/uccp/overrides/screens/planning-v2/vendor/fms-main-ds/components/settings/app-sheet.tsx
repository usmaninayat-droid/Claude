import * as React from 'react';
import * as Icons from '../../icons';
import { cn } from '../utils/cn';
import { FloatingLabelInput, Textarea, Input, Popover, PopoverTrigger, PopoverContent } from '../primitives';
import { StepWizardSheet } from './step-wizard-sheet';
import type { WizardStep } from './step-wizard-sheet';
import { SelectableCard } from './selectable-card';

/**
 * AppSheet — create / edit an application (FAMS Settings, Figma 2-633 / 2-868 /
 * 2-107 / 2-1141 / 2-1462). A 4-step wizard on the shared StepWizardSheet:
 * Basic Details → Modules (each selected module expands to Configure: feature
 * multi-select + custom name) → Sub-Organizations → User Roles. Config-driven.
 */

type IconCmp = React.ComponentType<{ size?: number; className?: string }>;

export interface AppModuleFeature { id: string; label: string }
export interface AppModuleOption { id: string; name: string; icon?: IconCmp; description?: string; features?: AppModuleFeature[] }
export interface AppSubOrgOption { id: string; name: string; activeUsers?: number; status?: 'active' | 'inactive'; date?: string }
export interface AppRoleOption { id: string; name: string; icon?: IconCmp; entities?: string[] }
export interface AppModuleConfig { enabled: boolean; featureIds: string[]; customName: string }
export interface AppDraft {
  name: string;
  description: string;
  modules: Record<string, AppModuleConfig>;
  subOrgIds: string[];
  roleIds: string[];
}

export const DEFAULT_MODULES: AppModuleOption[] = [
  { id: 'workforce', name: 'Workforce', icon: Icons.Users01, description: 'Drivers, field staff and their profiles.', features: [{ id: 'trucks', label: 'Show Trucks only' }, { id: 'hr', label: 'Show HR Team' }, { id: 'drivers', label: 'Show Drivers' }] },
  { id: 'live-tracking', name: 'Live Tracking', icon: Icons.MarkerPin01, description: 'Live location, route history and geofencing.', features: [{ id: 'live', label: 'Live Location' }, { id: 'history', label: 'Route History' }, { id: 'geofence', label: 'Geofencing' }] },
  { id: 'assets', name: 'Assets', icon: Icons.Car01, description: 'Vehicles and equipment.', features: [{ id: 'vehicles', label: 'Vehicles' }, { id: 'equipment', label: 'Equipment' }] },
  { id: 'poi', name: 'POI', icon: Icons.Flag01, description: 'Points of interest — depots, landfills.', features: [{ id: 'landfills', label: 'Landfills' }, { id: 'depots', label: 'Depots' }] },
  { id: 'zones', name: 'Zones', icon: Icons.Grid01, description: 'Service and restricted zones.', features: [{ id: 'service', label: 'Service Zones' }, { id: 'restricted', label: 'Restricted' }] },
];
export const DEFAULT_APP_SUBORGS: AppSubOrgOption[] = [
  { id: 'fams', name: 'FAMS LLC', activeUsers: 5, status: 'active', date: '23 Aug, 2023' },
  { id: 'voltro', name: 'Voltro', activeUsers: 5, status: 'active', date: '23 Aug, 2023' },
  { id: 'jetclass', name: 'JetClass', activeUsers: 5, status: 'active', date: '23 Aug, 2023' },
  { id: 'qatar', name: 'Qatar MM', activeUsers: 5, status: 'active', date: '23 Aug, 2023' },
];
export const DEFAULT_APP_ROLES: AppRoleOption[] = [
  { id: 'ops', name: 'Operations Manager', icon: Icons.Users01, entities: ['Workforce', 'Assets', 'Live Tracking'] },
  { id: 'finance', name: 'Finance Manager', icon: Icons.Car01, entities: ['Workforce', 'Assets'] },
  { id: 'gm', name: 'General Manager', icon: Icons.Car01, entities: ['Workforce', 'Assets'] },
  { id: 'admin', name: 'Admin', icon: Icons.Users01, entities: ['Workforce', 'Assets'] },
];

const emptyModules = (mods: AppModuleOption[]): Record<string, AppModuleConfig> =>
  Object.fromEntries(mods.map((m) => [m.id, { enabled: false, featureIds: [], customName: '' }]));

export interface AppSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initial?: Partial<AppDraft> & { id?: string };
  modules?: AppModuleOption[];
  subOrgs?: AppSubOrgOption[];
  roles?: AppRoleOption[];
  onSubmit: (draft: AppDraft) => void;
}

export function AppSheet({ open, onOpenChange, initial, modules = DEFAULT_MODULES, subOrgs = DEFAULT_APP_SUBORGS, roles = DEFAULT_APP_ROLES, onSubmit }: AppSheetProps) {
  const isEdit = !!initial?.id;
  const [name, setName] = React.useState('');
  const [description, setDescription] = React.useState('');
  const [mods, setMods] = React.useState<Record<string, AppModuleConfig>>(emptyModules(modules));
  const [subOrgIds, setSubOrgIds] = React.useState<string[]>([]);
  const [roleIds, setRoleIds] = React.useState<string[]>([]);

  React.useEffect(() => {
    if (!open) return;
    setName(initial?.name ?? '');
    setDescription(initial?.description ?? '');
    setMods({ ...emptyModules(modules), ...(initial?.modules ?? {}) });
    setSubOrgIds(initial?.subOrgIds ?? []);
    setRoleIds(initial?.roleIds ?? []);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const setMod = (id: string, patch: Partial<AppModuleConfig>) => setMods((cur) => ({ ...cur, [id]: { ...cur[id], ...patch } }));
  const toggleMod = (id: string) => setMod(id, { enabled: !mods[id]?.enabled });
  const toggleIn = (list: string[], id: string) => (list.includes(id) ? list.filter((x) => x !== id) : [...list, id]);

  const steps: WizardStep[] = [
    {
      id: 'basic', label: 'Basic Details', canProceed: name.trim().length > 0,
      render: () => (
        <div className="flex flex-col gap-4">
          <div>
            <h3 className="text-body-md font-semibold text-foreground">Enter the basic details of the application.</h3>
            <p className="mt-0.5 text-body-sm text-muted-foreground">A name and short description users will recognise.</p>
          </div>
          <FloatingLabelInput label="Application Name *" placeholder="e.g. Vehicle Tracking System" value={name} onChange={(e) => setName(e.target.value)} />
          <label className="flex flex-col gap-1">
            <span className="text-body-xs font-medium text-muted-foreground">Description</span>
            <Textarea rows={4} placeholder="What does this application do?" value={description} onChange={(e) => setDescription(e.target.value)} />
          </label>
        </div>
      ),
    },
    {
      id: 'modules', label: 'Modules',
      render: () => (
        <div className="flex flex-col gap-3">
          <div>
            <h3 className="text-body-md font-semibold text-foreground">Select the modules you want to add.</h3>
            <p className="mt-0.5 text-body-sm text-muted-foreground">A selected module can be configured — pick its features and give it a custom name.</p>
          </div>
          {modules.length ? modules.map((m) => {
            const cfg = mods[m.id];
            return (
              <SelectableCard key={m.id} selected={cfg.enabled} onToggle={() => toggleMod(m.id)} icon={m.icon} title={m.name} description={m.description}>
                <div className="flex flex-col gap-3">
                  <span className="text-body-sm font-semibold text-foreground">Configure your module</span>
                  {m.features?.length ? (
                    <FeatureMultiSelect features={m.features} selected={cfg.featureIds} onChange={(ids) => setMod(m.id, { featureIds: ids })} />
                  ) : null}
                  <label className="flex flex-col gap-1">
                    <span className="text-body-xs font-medium text-muted-foreground">Custom Name</span>
                    <Input value={cfg.customName} placeholder={m.name} onChange={(e) => setMod(m.id, { customName: e.target.value })} />
                  </label>
                </div>
              </SelectableCard>
            );
          }) : <p className="rounded-lg border border-dashed border-border px-3.5 py-6 text-center text-body-sm text-muted-foreground">No modules configured.</p>}
        </div>
      ),
    },
    {
      id: 'sub-orgs', label: 'Sub-Organizations',
      render: () => (
        <div className="flex flex-col gap-3">
          <div>
            <h3 className="text-body-md font-semibold text-foreground">Select the sub-organizations you want to add.</h3>
            <p className="mt-0.5 text-body-sm text-muted-foreground">The application will be available to the checked sub-organizations.</p>
          </div>
          {subOrgs.length ? subOrgs.map((o) => {
            const on = subOrgIds.includes(o.id);
            return (
              <SelectableCard
                key={o.id}
                selected={on}
                onToggle={() => setSubOrgIds((cur) => toggleIn(cur, o.id))}
                title={o.name}
                description={o.activeUsers != null ? (
                  <span className="inline-flex items-center gap-1.5"><Icons.Users01 size={13} />{o.activeUsers} Active Users</span>
                ) : undefined}
                trailing={
                  <span className="flex flex-col items-end gap-0.5">
                    <span className={cn('text-body-xs font-semibold', o.status === 'active' ? 'text-success' : 'text-muted-foreground')}>{o.status === 'active' ? 'Active' : 'Inactive'}</span>
                    {o.date && <span className="text-caption text-muted-foreground">{o.date}</span>}
                  </span>
                }
              />
            );
          }) : <p className="rounded-lg border border-dashed border-border px-3.5 py-6 text-center text-body-sm text-muted-foreground">No sub-organizations configured.</p>}
        </div>
      ),
    },
    {
      id: 'roles', label: 'User Roles',
      render: () => (
        <div className="flex flex-col gap-3">
          <div>
            <h3 className="text-body-md font-semibold text-foreground">Select the User Roles.</h3>
            <p className="mt-0.5 text-body-sm text-muted-foreground">Which roles can use this application.</p>
          </div>
          {roles.length ? roles.map((r) => (
            <SelectableCard key={r.id} selected={roleIds.includes(r.id)} onToggle={() => setRoleIds((cur) => toggleIn(cur, r.id))} icon={r.icon} title={r.name} pills={r.entities} />
          )) : <p className="rounded-lg border border-dashed border-border px-3.5 py-6 text-center text-body-sm text-muted-foreground">No roles configured.</p>}
        </div>
      ),
    },
  ];

  return (
    <StepWizardSheet
      open={open}
      onOpenChange={onOpenChange}
      title={isEdit ? 'Edit Application' : 'Create new Application'}
      description="Name the application, add its modules, choose which sub-organizations and roles can use it."
      steps={steps}
      submitLabel={isEdit ? 'Save Application' : 'Create Application'}
      onComplete={() => { if (name.trim()) onSubmit({ name: name.trim(), description: description.trim(), modules: mods, subOrgIds, roleIds }); }}
    />
  );
}

/** Multi-select for a module's features: popover of checkboxes → chips + "N Features Selected". */
function FeatureMultiSelect({ features, selected, onChange }: { features: AppModuleFeature[]; selected: string[]; onChange: (ids: string[]) => void }) {
  const [open, setOpen] = React.useState(false);
  const toggle = (id: string) => onChange(selected.includes(id) ? selected.filter((x) => x !== id) : [...selected, id]);
  return (
    <div className="flex flex-col gap-2">
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <button type="button" className="flex items-center justify-between gap-2 rounded-lg border border-border bg-card px-3 py-2.5 text-left text-body-sm outline-none transition-colors hover:bg-muted/40 focus-visible:ring-2 focus-visible:ring-ring">
            <span className="flex flex-col">
              <span className="text-caption font-medium text-muted-foreground">Select Features</span>
              <span className={cn(selected.length ? 'text-foreground' : 'text-muted-foreground')}>{selected.length ? `${selected.length} Feature${selected.length === 1 ? '' : 's'} Selected` : 'None selected'}</span>
            </span>
            <Icons.ChevronDown size={16} className="shrink-0 text-muted-foreground" />
          </button>
        </PopoverTrigger>
        <PopoverContent align="start" className="w-[--radix-popover-trigger-width] p-1">
          {features.map((f) => {
            const on = selected.includes(f.id);
            return (
              <button key={f.id} type="button" onClick={() => toggle(f.id)} className="flex w-full items-center gap-2 rounded-md px-2.5 py-2 text-left text-body-sm text-foreground transition-colors hover:bg-muted">
                <span className={cn('grid size-4 place-items-center rounded border', on ? 'border-primary bg-primary text-primary-foreground' : 'border-muted-foreground/40')}>{on && <Icons.Check size={11} />}</span>{f.label}
              </button>
            );
          })}
        </PopoverContent>
      </Popover>
      {selected.length ? (
        <div className="flex flex-wrap gap-1.5">
          {selected.map((id) => {
            const f = features.find((x) => x.id === id);
            return (
              <span key={id} className="inline-flex items-center gap-1 rounded-md bg-primary/10 px-2 py-0.5 text-caption font-medium text-primary">
                {f?.label ?? id}
                <button type="button" aria-label={`Remove ${f?.label ?? id}`} onClick={() => toggle(id)} className="hover:opacity-70"><Icons.XClose size={11} /></button>
              </span>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}
