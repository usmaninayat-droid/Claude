import * as React from 'react';
import { User, Settings, LogOut } from 'lucide-react';
import { Avatar } from '../primitives';
import { Popover, PopoverTrigger, PopoverContent } from '../primitives';
import type { UserConfig } from './types';

/**
 * UserMenu — the app-rail profile popup (Google-style). Renders a circular
 * avatar button matching the blue-rail footer items; clicking opens a card
 * with the user's identity and Profile / Settings / Logout actions.
 */
export interface UserMenuProps {
  user?: UserConfig;
  onProfile?: () => void;
  onSettings?: () => void;
  onLogout?: () => void;
}

export function UserMenu({ user, onProfile, onSettings, onLogout }: UserMenuProps) {
  const fallback =
    user?.avatarFallback ??
    (user?.name
      ? user.name
          .split(' ')
          .map((w) => w[0])
          .slice(0, 2)
          .join('')
      : 'U');

  // App-nav trigger shows a single, clean letter (first of name, else fallback).
  const oneLetter = (
    (typeof user?.name === 'string' && user.name.trim()[0]) ||
    (typeof fallback === 'string' && fallback[0]) ||
    'U'
  ).toUpperCase();

  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          type="button"
          aria-label="Account"
          className="flex size-8 items-center justify-center overflow-hidden rounded-full text-body-sm font-semibold text-white outline-none transition-colors hover:opacity-90 focus-visible:ring-2 focus-visible:ring-sidebar-ring"
          style={{ background: 'rgba(255,255,255,0.18)' }}
        >
          {user?.avatarSrc ? (
            <img src={user.avatarSrc} alt={user?.name} className="size-full rounded-full object-cover" />
          ) : (
            oneLetter
          )}
        </button>
      </PopoverTrigger>
      <PopoverContent side="right" align="end" sideOffset={12} className="w-64 p-0">
        <div className="flex items-center gap-3 border-b border-border p-3">
          <Avatar size="md" src={user?.avatarSrc} fallback={fallback} alt={user?.name} />
          <div className="min-w-0">
            <div className="truncate text-body-sm font-semibold text-foreground">
              {user?.name ?? 'Signed-in user'}
            </div>
            {user?.email ? (
              <div className="truncate text-caption text-muted-foreground">{user.email}</div>
            ) : null}
            {user?.role ? (
              <div className="truncate text-caption text-muted-foreground">{user.role}</div>
            ) : null}
          </div>
        </div>
        <div className="flex flex-col p-1">
          <MenuRow icon={<User size={16} />} label="Profile" onClick={onProfile} />
          <MenuRow icon={<Settings size={16} />} label="Settings" onClick={onSettings} />
          <MenuRow icon={<LogOut size={16} />} label="Log out" onClick={onLogout} destructive />
        </div>
      </PopoverContent>
    </Popover>
  );
}

function MenuRow({
  icon,
  label,
  onClick,
  destructive,
}: {
  icon: React.ReactNode;
  label: string;
  onClick?: () => void;
  destructive?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={[
        'flex items-center gap-2.5 rounded-md px-2.5 py-2 text-left text-body-sm outline-none transition-colors hover:bg-muted focus-visible:bg-muted',
        destructive ? 'text-destructive' : 'text-foreground',
      ].join(' ')}
    >
      <span className={destructive ? 'text-destructive' : 'text-muted-foreground'}>{icon}</span>
      {label}
    </button>
  );
}
