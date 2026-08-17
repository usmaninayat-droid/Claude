import * as React from 'react';
import * as Icons from '../../icons';
import { cn } from '../utils/cn';
import { Button, Avatar, Popover, PopoverTrigger, PopoverContent } from '../primitives';

/**
 * UserAccounts — Settings › User Accounts (FAMS Launch Pad, Figma 4479-24369).
 * Invite/manage the people in an organization: a stat-card summary row + a
 * sortable table (user · phone · status · roles · last login · last activity)
 * with a global search and per-row actions. Config-driven (`users: UserRow[]`),
 * token-only. Stats default to counts derived from `users` when not supplied.
 */

export type UserStatus = 'active' | 'invited' | 'inactive' | 'pending' | 'suspended';
export type UserAction = 'edit' | 'resend' | 'suspend' | 'activate' | 'delete';
export type UserStatIcon = React.ComponentType<{ size?: number; className?: string }>;
export type UserSortKey = 'status' | 'lastLogin' | 'lastActivity';

export interface UserRolePill { label: string; color?: string }
export interface UserRow {
  id: string;
  name: string;
  email?: string;
  username?: string;
  avatarUrl?: string;
  phone: string;
  status: UserStatus;
  roles: UserRolePill[];
  /** Round-trip slot for the sheet's role picker — kept alongside the display `roles` pills (Law 4). */
  roleIds?: string[];
  lastLogin?: string;
  lastActivity?: string;
  /** Sortable raw values — preferred over the display strings when present. */
  lastLoginAt?: number | string;
  lastActivityAt?: number | string;
}
export interface UserStat { id: string; label: string; count: number; icon?: UserStatIcon; tone?: string }

export interface UserAccountsProps {
  title?: string;
  subtitle?: string;
  users: UserRow[];
  /** Summary cards. Defaults to Total/Active/Invited/Pending/Suspended derived from `users`. */
  stats?: UserStat[];
  onCreateUser?: () => void;
  onUserAction?: (user: UserRow, action: UserAction) => void;
  searchQuery?: string;
  onSearchChange?: (q: string) => void;
  className?: string;
}

const STATUS_META: Record<UserStatus, { label: string; tone: string }> = {
  active: { label: 'Active', tone: 'var(--status-success)' },
  invited: { label: 'Invited', tone: 'var(--status-warning)' },
  inactive: { label: 'Inactive', tone: 'var(--status-error)' },
  pending: { label: 'Pending', tone: 'var(--primary)' },
  suspended: { label: 'Suspended', tone: 'var(--status-error)' },
};
const initials = (name: string) => name.split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0]?.toUpperCase()).join('');

function deriveStats(users: UserRow[]): UserStat[] {
  const by = (s: UserStatus) => users.filter((u) => u.status === s).length;
  return [
    { id: 'total', label: 'Total Users', count: users.length, icon: Icons.Users01, tone: 'var(--primary)' },
    { id: 'active', label: 'Active Users', count: by('active'), icon: Icons.CheckDone01, tone: 'var(--status-success)' },
    { id: 'invited', label: 'Invited Users', count: by('invited'), icon: Icons.Mail01, tone: 'var(--status-warning)' },
    { id: 'pending', label: 'Pending Approval', count: by('pending'), icon: Icons.Clock, tone: 'var(--primary)' },
    { id: 'suspended', label: 'Suspended Users', count: by('suspended'), icon: Icons.SlashCircle01, tone: 'var(--status-error)' },
  ];
}

export function UserAccounts({
  title = 'User Accounts',
  subtitle = 'Invite your team members to FAMS to work faster and collaborate easily together. Manage their permissions to better structure your needs.',
  users, stats, onCreateUser, onUserAction, searchQuery, onSearchChange, className,
}: UserAccountsProps) {
  const [internalQ, setInternalQ] = React.useState('');
  const q = searchQuery ?? internalQ;
  const setQ = onSearchChange ?? setInternalQ;
  const [sort, setSort] = React.useState<{ key: UserSortKey; dir: 'asc' | 'desc' } | null>(null);

  const cards = stats ?? deriveStats(users);

  const filtered = React.useMemo(() => {
    const s = q.trim().toLowerCase();
    if (!s) return users;
    return users.filter((u) =>
      [u.name, u.email, u.username, u.phone, ...u.roles.map((r) => r.label)].filter(Boolean).some((v) => v!.toLowerCase().includes(s)),
    );
  }, [users, q]);

  const sorted = React.useMemo(() => {
    if (!sort) return filtered;
    const val = (u: UserRow): string | number => {
      if (sort.key === 'status') return STATUS_META[u.status]?.label ?? u.status;
      if (sort.key === 'lastLogin') return u.lastLoginAt ?? u.lastLogin ?? '';
      return u.lastActivityAt ?? u.lastActivity ?? '';
    };
    const rows = [...filtered].sort((a, b) => {
      const av = val(a);
      const bv = val(b);
      return typeof av === 'number' && typeof bv === 'number' ? av - bv : String(av).localeCompare(String(bv));
    });
    return sort.dir === 'desc' ? rows.reverse() : rows;
  }, [filtered, sort]);

  const toggleSort = (key: UserSortKey) =>
    setSort((cur) => (cur?.key === key ? (cur.dir === 'asc' ? { key, dir: 'desc' } : null) : { key, dir: 'asc' }));

  return (
    <div className={cn('p-7', className)}>
      <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-h5 font-semibold text-foreground">{title}</h1>
          <p className="mt-1 max-w-2xl text-body-sm text-muted-foreground">{subtitle}</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="relative">
            <Icons.SearchSm size={15} className="pointer-events-none absolute left-2.5 top-1/2 z-10 -translate-y-1/2 text-muted-foreground" />
            <input
              type="search"
              aria-label="Search users"
              placeholder="Search by name, email, username, phone or role"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              className="h-9 w-80 max-w-[60vw] rounded-md border border-border bg-input-background pl-8 pr-3 text-body-sm text-foreground outline-none transition-colors placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:ring-ring"
            />
          </div>
          {onCreateUser && <Button variant="primary" onClick={onCreateUser}><Icons.Plus size={16} className="mr-1.5" />New User</Button>}
        </div>
      </div>

      <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-5">
        {cards.map((s) => {
          const Icon = s.icon;
          return (
            <div key={s.id} className="flex items-center gap-3 rounded-xl border border-border bg-card px-4 py-3.5">
              {Icon && (
                <span className="grid size-9 shrink-0 place-items-center rounded-full" style={{ background: `color-mix(in srgb, ${s.tone ?? 'var(--muted-foreground)'} 12%, transparent)`, color: s.tone ?? 'var(--muted-foreground)' }}>
                  <Icon size={18} />
                </span>
              )}
              <div className="min-w-0">
                <div className="truncate text-caption font-medium uppercase tracking-wide text-muted-foreground">{s.label}</div>
                <div className="text-h6 font-bold text-foreground">{s.count}</div>
              </div>
            </div>
          );
        })}
      </div>

      <div className="overflow-hidden rounded-xl border border-border">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[880px] text-left text-body-sm">
            <thead className="border-b border-border bg-muted/40 text-caption uppercase tracking-wide text-muted-foreground">
              <tr>
                <th className="px-4 py-2.5 font-semibold">User</th>
                <th className="px-4 py-2.5 font-semibold">Phone Number</th>
                <SortableTh label="Status" sortKey="status" sort={sort} onSort={toggleSort} />
                <th className="px-4 py-2.5 font-semibold">Roles</th>
                <SortableTh label="Last Login Time" sortKey="lastLogin" sort={sort} onSort={toggleSort} />
                <SortableTh label="Last Activity Time" sortKey="lastActivity" sort={sort} onSort={toggleSort} />
                {onUserAction && <th className="px-4 py-2.5" />}
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {sorted.map((u) => {
                const meta = STATUS_META[u.status];
                return (
                  <tr key={u.id} className="hover:bg-muted/30">
                    <td className="px-4 py-2.5">
                      <div className="flex items-center gap-2.5">
                        <Avatar size="md" src={u.avatarUrl} alt={u.name} fallback={initials(u.name)} />
                        <div className="min-w-0">
                          <div className="truncate font-medium text-foreground">{u.name}</div>
                          <div className="truncate text-caption text-muted-foreground">{u.email ?? u.username}</div>
                        </div>
                      </div>
                    </td>
                    <td className="whitespace-nowrap px-4 py-2.5 text-foreground">{u.phone}</td>
                    <td className="px-4 py-2.5">
                      <span className="inline-flex items-center rounded-full px-2.5 py-1 text-caption font-semibold" style={{ background: meta.tone, color: 'var(--primary-foreground)' }}>{meta.label}</span>
                    </td>
                    <td className="px-4 py-2.5">
                      <div className="flex flex-wrap items-center gap-1.5">
                        {u.roles.map((r, i) => (
                          <span key={i} className="inline-flex items-center rounded-md border bg-transparent px-2 py-0.5 text-caption font-semibold" style={{ color: r.color ?? 'var(--muted-foreground)', borderColor: r.color ?? 'var(--muted-foreground)' }}>{r.label}</span>
                        ))}
                        {!u.roles.length && <span className="text-caption text-muted-foreground">—</span>}
                      </div>
                    </td>
                    <td className="whitespace-nowrap px-4 py-2.5 text-muted-foreground">{u.lastLogin ?? 'Never'}</td>
                    <td className="whitespace-nowrap px-4 py-2.5 text-muted-foreground">{u.lastActivity ?? 'Never'}</td>
                    {onUserAction && <td className="px-4 py-2.5 text-right"><RowMenu user={u} onAction={(a) => onUserAction(u, a)} /></td>}
                  </tr>
                );
              })}
              {!sorted.length && (
                <tr><td colSpan={6 + (onUserAction ? 1 : 0)} className="px-4 py-12 text-center text-body-sm text-muted-foreground">{q.trim() ? 'No users match your search.' : 'No users yet — invite your first teammate.'}</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function SortableTh({ label, sortKey, sort, onSort }: { label: string; sortKey: UserSortKey; sort: { key: UserSortKey; dir: 'asc' | 'desc' } | null; onSort: (k: UserSortKey) => void }) {
  const active = sort?.key === sortKey;
  return (
    <th className="px-4 py-2.5 font-semibold" aria-sort={active ? (sort?.dir === 'asc' ? 'ascending' : 'descending') : 'none'}>
      <button type="button" onClick={() => onSort(sortKey)} className="inline-flex items-center gap-1 rounded-sm uppercase tracking-wide transition-colors hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring" aria-label={`Sort by ${label}`}>
        {label}
        <Icons.ChevronDown size={13} className={cn('transition-transform', active ? 'text-foreground' : 'opacity-40', active && sort?.dir === 'asc' && 'rotate-180')} />
      </button>
    </th>
  );
}

function RowMenu({ user, onAction }: { user: UserRow; onAction: (a: UserAction) => void }) {
  const [open, setOpen] = React.useState(false);
  const item = 'flex w-full items-center gap-2 rounded-md px-2.5 py-2 text-left text-body-sm text-foreground transition-colors hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring';
  const run = (a: UserAction) => { onAction(a); setOpen(false); };
  const canResend = user.status === 'invited' || user.status === 'pending';
  const isActive = user.status === 'active';
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button type="button" aria-label={`Actions for ${user.name}`} className="grid size-8 place-items-center rounded-md text-muted-foreground transition-colors hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring"><Icons.DotsVertical size={18} /></button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-48 p-1">
        <button type="button" className={item} onClick={() => run('edit')}><Icons.Edit01 size={15} className="text-muted-foreground" />Edit user</button>
        {canResend && <button type="button" className={item} onClick={() => run('resend')}><Icons.RefreshCw01 size={15} className="text-muted-foreground" />Resend invitation</button>}
        {isActive
          ? <button type="button" className={item} onClick={() => run('suspend')}><Icons.SlashCircle01 size={15} className="text-muted-foreground" />Deactivate</button>
          : <button type="button" className={item} onClick={() => run('activate')}><Icons.CheckDone01 size={15} className="text-muted-foreground" />Activate</button>}
        <button type="button" className={cn(item, 'text-[var(--status-error)]')} onClick={() => run('delete')}><Icons.Trash01 size={15} />Delete</button>
      </PopoverContent>
    </Popover>
  );
}
