import * as React from 'react';
import * as Icons from '../../icons';
import { cn } from '../utils/cn';
import { FloatingLabelInput, Textarea } from '../primitives';
import { StepWizardSheet } from './step-wizard-sheet';
import type { WizardStep } from './step-wizard-sheet';
import { SelectableCard } from './selectable-card';

/**
 * RoleSheet — create / edit a role (FAMS Settings, Figma 2-2618 / 2-3125 / 2-2818).
 * A 3-step wizard (Basic Details → Applications → Privileges) on the shared
 * StepWizardSheet shell. Config-driven — `apps` + `permissionAreas` are passed in
 * with FAMS defaults; `initial` (with an id) switches to edit mode. Token-only.
 */

type IconCmp = React.ComponentType<{ size?: number; className?: string }>;

export interface RoleAppOption { id: string; name: string; icon?: IconCmp; entities?: string[] }
export interface PermissionArea { id: string; label: string }
export interface PrivilegeRow { enabled: boolean; create: boolean; view: boolean; edit: boolean; delete: boolean }
export interface RoleDraft {
  name: string;
  description: string;
  appIds: string[];
  privileges: Record<string, PrivilegeRow>;
}

export const DEFAULT_APPS: RoleAppOption[] = [
  { id: 'hr', name: 'HR – Human Resource Management System', icon: Icons.Users01, entities: ['Workforce', 'Assets'] },
  { id: 'vts', name: 'Vehicle Tracking System', icon: Icons.MarkerPin01, entities: ['Workforce', 'Assets', 'Live Tracking'] },
  { id: 'dms', name: 'Data Management System', icon: Icons.Database01, entities: ['Workforce', 'Assets', 'Live Tracking'] },
];
export const DEFAULT_AREAS: PermissionArea[] = [
  { id: 'live-monitoring', label: 'Live Monitoring' }, { id: 'devices', label: 'Devices' },
  { id: 'assets', label: 'Assets' }, { id: 'pois', label: 'POIs' }, { id: 'zones', label: 'Zones' },
  { id: 'app-mgmt', label: 'Application Management' }, { id: 'reports', label: 'Reports' }, { id: 'dashboards', label: 'Dashboards' },
];
const ACTIONS = ['create', 'view', 'edit', 'delete'] as const;
const emptyPrivileges = (areas: PermissionArea[]): Record<string, PrivilegeRow> =>
  Object.fromEntries(areas.map((a) => [a.id, { enabled: false, create: false, view: false, edit: false, delete: false }]));

export interface RoleSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initial?: Partial<RoleDraft> & { id?: string };
  apps?: RoleAppOption[];
  permissionAreas?: PermissionArea[];
  onSubmit: (draft: RoleDraft) => void;
}

export function RoleSheet({ open, onOpenChange, initial, apps = DEFAULT_APPS, permissionAreas = DEFAULT_AREAS, onSubmit }: RoleSheetProps) {
  const isEdit = !!initial?.id;
  const [name, setName] = React.useState('');
  const [description, setDescription] = React.useState('');
  const [appIds, setAppIds] = React.useState<string[]>([]);
  const [privileges, setPrivileges] = React.useState<Record<string, PrivilegeRow>>(emptyPrivileges(permissionAreas));

  React.useEffect(() => {
    if (!open) return;
    setName(initial?.name ?? '');
    setDescription(initial?.description ?? '');
    setAppIds(initial?.appIds ?? []);
    setPrivileges({ ...emptyPrivileges(permissionAreas), ...(initial?.privileges ?? {}) });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const roleLabel = name.trim() || 'this';
  const toggleApp = (id: string) => setAppIds((cur) => (cur.includes(id) ? cur.filter((x) => x !== id) : [...cur, id]));
  const setPriv = (areaId: string, patch: Partial<PrivilegeRow>) => setPrivileges((cur) => ({ ...cur, [areaId]: { ...cur[areaId], ...patch } }));

  const steps: WizardStep[] = [
    {
      id: 'basic', label: 'Basic Details', canProceed: name.trim().length > 0,
      render: () => (
        <div className="flex flex-col gap-4">
          <div>
            <h3 className="text-body-md font-semibold text-foreground">Enter the basic details of the role.</h3>
            <p className="mt-0.5 text-body-sm text-muted-foreground">A clear name and description make the role easy to assign.</p>
          </div>
          <FloatingLabelInput label="Role Name *" placeholder="e.g. Operations Manager" value={name} onChange={(e) => setName(e.target.value)} />
          <label className="flex flex-col gap-1">
            <span className="text-body-xs font-medium text-muted-foreground">Role Description</span>
            <Textarea rows={4} placeholder="What can this role do, and who is it for?" value={description} onChange={(e) => setDescription(e.target.value)} />
          </label>
        </div>
      ),
    },
    {
      id: 'applications', label: 'Applications',
      render: () => (
        <div className="flex flex-col gap-3">
          <div>
            <h3 className="text-body-md font-semibold text-foreground">Select the applications for <span className="text-primary">{roleLabel}</span> role</h3>
            <p className="mt-0.5 text-body-sm text-muted-foreground">Only the checked applications will be reachable by this role.</p>
          </div>
          {apps.map((a) => (
            <SelectableCard key={a.id} selected={appIds.includes(a.id)} onToggle={() => toggleApp(a.id)} icon={a.icon} title={a.name} pills={a.entities} />
          ))}
          {!apps.length && <p className="rounded-lg border border-dashed border-border px-3.5 py-6 text-center text-body-sm text-muted-foreground">No applications configured.</p>}
        </div>
      ),
    },
    {
      id: 'privileges', label: 'Privileges',
      render: () => (
        <div className="flex flex-col gap-3">
          <div>
            <h3 className="text-body-md font-semibold text-foreground">Select the privileges for <span className="text-primary">{roleLabel}</span> role</h3>
            <p className="mt-0.5 text-body-sm text-muted-foreground">Enable an area, then grant create / view / edit / delete.</p>
          </div>
          {permissionAreas.length ? (
            <div className="overflow-hidden rounded-xl border border-border">
              <table className="w-full text-left">
                <thead>
                  <tr className="border-b border-border text-body-xs font-semibold text-muted-foreground">
                    <th className="px-4 py-2.5 text-primary">Permissions</th>
                    {ACTIONS.map((a) => <th key={a} className="w-16 px-2 py-2.5 text-center capitalize">{a}</th>)}
                  </tr>
                </thead>
                <tbody>
                  {permissionAreas.map((area) => {
                    const row = privileges[area.id];
                    return (
                      <tr key={area.id} className="border-b border-border/70 last:border-0">
                        <td className="px-4 py-2.5">
                          <label className="flex items-center gap-2.5">
                            <PrivBox checked={row.enabled} onChange={(v) => setPriv(area.id, v ? { enabled: true } : { enabled: false, create: false, view: false, edit: false, delete: false })} label={`Enable ${area.label}`} />
                            <span className="text-body-sm font-medium text-foreground">{area.label}</span>
                          </label>
                        </td>
                        {ACTIONS.map((a) => (
                          <td key={a} className="px-2 py-2.5 text-center">
                            <PrivBox checked={row[a]} disabled={!row.enabled} onChange={(v) => setPriv(area.id, { [a]: v })} label={`${a} ${area.label}`} />
                          </td>
                        ))}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="rounded-lg border border-dashed border-border px-3.5 py-6 text-center text-body-sm text-muted-foreground">No permission areas configured.</p>
          )}
        </div>
      ),
    },
  ];

  return (
    <StepWizardSheet
      open={open}
      onOpenChange={onOpenChange}
      title={isEdit ? 'Edit role' : 'Create new role'}
      description="Name the role, pick the applications it can reach, then set its create / view / edit / delete privileges."
      steps={steps}
      submitLabel={isEdit ? 'Save role' : 'Create Role'}
      onComplete={() => { if (name.trim()) onSubmit({ name: name.trim(), description: description.trim(), appIds, privileges }); }}
    />
  );
}

/** A single privilege checkbox (enable / action cell). */
function PrivBox({ checked, disabled, onChange, label }: { checked: boolean; disabled?: boolean; onChange: (v: boolean) => void; label: string }) {
  return (
    <button
      type="button"
      role="checkbox"
      aria-checked={checked}
      aria-label={label}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={cn(
        'grid size-4 place-items-center rounded border transition-colors focus-visible:ring-2 focus-visible:ring-ring',
        disabled ? 'cursor-not-allowed border-border bg-muted/40' : checked ? 'border-primary bg-primary text-primary-foreground' : 'border-muted-foreground/40 hover:border-primary',
      )}
    >
      {checked && <Icons.Check size={12} />}
    </button>
  );
}
