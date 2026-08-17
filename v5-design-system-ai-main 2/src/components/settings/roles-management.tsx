import * as React from 'react';
import * as Icons from '../../icons';
import { cn } from '../utils/cn';
import { Button, Popover, PopoverTrigger, PopoverContent } from '../primitives';
import type { PrivilegeRow } from './role-sheet';

/**
 * RolesManagement — the Settings › Roles Management list (FAMS Settings, Figma
 * 2-2480). A table of created roles: role name (pill) · which apps/entities the
 * role can access (icon chips + "+N") · total users · created-on · status
 * (Active/Disabled) · a per-row kebab (Edit / Enable-Disable / Delete). Header
 * carries "Create New Role". Config-driven (`roles: RoleRow[]`), token-only.
 */

type IconCmp = React.ComponentType<{ size?: number; className?: string }>;

export interface RoleAccess { label: string; icon?: IconCmp }
export interface RoleRow {
  id: string;
  name: string;
  access: RoleAccess[];
  userCount: number;
  createdOn: string;
  status: 'active' | 'disabled';
  /** Round-trip slots for the create/edit wizard (`RoleSheet`) — carried so
   *  editing a role can pre-populate every step, not just the name. */
  description?: string;
  appIds?: string[];
  privileges?: Record<string, PrivilegeRow>;
}
export type RoleAction = 'edit' | 'toggle' | 'delete';

export interface RolesManagementProps {
  title?: string;
  subtitle?: string;
  roles: RoleRow[];
  maxAccessChips?: number;
  onCreateRole?: () => void;
  onRoleAction?: (role: RoleRow, action: RoleAction) => void;
  className?: string;
}

function AccessChips({ access, max = 1 }: { access: RoleAccess[]; max?: number }) {
  const shown = access.slice(0, max);
  const extra = access.length - shown.length;
  return (
    <span className="flex flex-wrap items-center gap-3">
      {shown.map((a) => (
        <span key={a.label} className="inline-flex items-center gap-1.5 text-body-sm text-muted-foreground">
          {a.icon ? <a.icon size={15} className="text-muted-foreground" /> : null}
          {a.label}
        </span>
      ))}
      {extra > 0 && <span className="text-body-sm font-medium text-muted-foreground">+{extra}</span>}
    </span>
  );
}

function RowMenu({ role, onAction }: { role: RoleRow; onAction?: (a: RoleAction) => void }) {
  const [open, setOpen] = React.useState(false);
  const [confirmDelete, setConfirmDelete] = React.useState(false);
  const item = 'flex w-full items-center gap-2 rounded-md px-2.5 py-2 text-left text-body-sm text-foreground transition-colors hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring';
  return (
    <Popover open={open} onOpenChange={(o) => { setOpen(o); if (!o) setConfirmDelete(false); }}>
      <PopoverTrigger asChild>
        <button type="button" aria-label={`Actions for ${role.name}`} className="grid size-8 place-items-center rounded-md text-muted-foreground transition-colors hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring">
          <Icons.DotsVertical size={18} />
        </button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-44 p-1">
        <button type="button" className={item} onClick={() => { onAction?.('edit'); setOpen(false); }}><Icons.Edit01 size={15} className="text-muted-foreground" />Edit role</button>
        <button type="button" className={item} onClick={() => { onAction?.('toggle'); setOpen(false); }}>
          {role.status === 'active' ? <><Icons.EyeOff size={15} className="text-muted-foreground" />Disable</> : <><Icons.Eye size={15} className="text-muted-foreground" />Enable</>}
        </button>
        <button
          type="button"
          className={cn(item, 'text-[var(--status-error)]', confirmDelete && 'bg-destructive/10')}
          onClick={() => {
            if (confirmDelete) { onAction?.('delete'); setOpen(false); } else { setConfirmDelete(true); }
          }}
          onBlur={() => setConfirmDelete(false)}
        >
          <Icons.Trash01 size={15} />{confirmDelete ? 'Confirm delete' : 'Delete'}
        </button>
      </PopoverContent>
    </Popover>
  );
}

export function RolesManagement({
  title = 'Created Roles & their Management',
  subtitle = 'Create roles, choose which applications each can reach, and set granular privileges to structure access the way your organization needs.',
  roles, maxAccessChips = 1, onCreateRole, onRoleAction, className,
}: RolesManagementProps) {
  return (
    <div className={cn('p-7', className)}>
      <div className="mb-6 flex items-start justify-between gap-4">
        <div>
          <h1 className="text-h5 font-semibold text-foreground">{title}</h1>
          <p className="mt-1 max-w-xl text-body-sm text-muted-foreground">{subtitle}</p>
        </div>
        {onCreateRole && (
          <Button variant="primary" onClick={onCreateRole}><Icons.Plus size={16} className="mr-1.5" />Create New Role</Button>
        )}
      </div>

      <div className="overflow-hidden rounded-xl border border-border">
        <table className="w-full border-collapse text-left">
          <thead>
            <tr className="border-b border-border bg-muted/40 text-caption font-semibold uppercase tracking-wide text-muted-foreground">
              <th className="px-4 py-2.5">Role</th>
              <th className="px-4 py-2.5">Role has access to</th>
              <th className="px-4 py-2.5">Total User</th>
              <th className="px-4 py-2.5">Created On</th>
              <th className="px-4 py-2.5">Status</th>
              <th className="w-12 px-4 py-2.5" aria-label="Actions" />
            </tr>
          </thead>
          <tbody>
            {roles.map((r) => (
              <tr key={r.id} className="border-b border-border/70 last:border-0 hover:bg-muted/30">
                <td className="px-4 py-3">
                  <button
                    type="button"
                    onClick={() => onRoleAction?.(r, 'edit')}
                    title={r.name}
                    className="inline-flex max-w-[220px] items-center truncate rounded-md border border-primary px-3 py-1.5 text-body-sm font-semibold text-primary transition-colors hover:bg-primary/5 focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    <span className="truncate">{r.name}</span>
                  </button>
                </td>
                <td className="px-4 py-3"><AccessChips access={r.access} max={maxAccessChips} /></td>
                <td className="px-4 py-3 text-body-sm text-foreground">{r.userCount} {r.userCount === 1 ? 'User' : 'Users'}</td>
                <td className="px-4 py-3 text-body-sm text-muted-foreground">{r.createdOn}</td>
                <td className="px-4 py-3">
                  <span className={cn('inline-flex items-center gap-1.5 text-body-sm font-semibold', r.status === 'active' ? 'text-success' : 'text-destructive')}>
                    <span className={cn('size-1.5 rounded-full', r.status === 'active' ? 'bg-success' : 'bg-destructive')} />
                    {r.status === 'active' ? 'Active' : 'Disabled'}
                  </span>
                </td>
                <td className="px-4 py-3 text-right"><RowMenu role={r} onAction={(a) => onRoleAction?.(r, a)} /></td>
              </tr>
            ))}
            {!roles.length && (
              <tr><td colSpan={6} className="px-5 py-12 text-center text-body-sm text-muted-foreground">No roles yet — create your first role.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
