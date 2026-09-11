import * as React from 'react';
import { cn } from '../utils/cn';
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from '../primitives/tooltip';
import type { LucideIcon } from 'lucide-react';

/**
 * SideNav — aligned to the Figma "Design System V2 → Side Navigation" spec
 * (Primary Nav `7134:2063` + Secondary/Module Nav `7134:2086`).
 *
 * Primary (app) rail — `bg-[var(--sidebar)]` (FAMS blue), 8px horizontal /
 * 16px vertical padding, items centered:
 *   - Logo (28×28) at top, then 14px gap to the nav items (16px gap between).
 *   - **Inbox sits at the TOP** of the nav items, bracketed by a 40px hairline
 *     divider above and below (`white/20`), with a red notification indicator.
 *   - App items: `rounded-[4px]` p-[5px] + 16px icon, with a `border-l-2` accent:
 *     - Active:   `bg-white` + brand icon + `border-l brand/60` (rgba(0,114,214,0.6))
 *     - Inactive: `bg-white/20`  + white icon + `border-l brand/40` (rgba(0,114,214,0.4))
 *   - Footer (Settings/Help/User): 28×28 CIRCULAR, permanent `bg-white/20`, 16px icon.
 *
 * Secondary (module) rail — `bg-card` (white), 1px right border (`border/lightest`),
 * 16px padding, 16px gap; items `rounded-[4px]` p-[6px] + 16px icon (≈28×28):
 *   - Active: `bg-primary` (brand blue) + WHITE icon · Inactive: transparent + muted icon.
 */

export interface SideNavItem {
  id: string;
  label: string;
  icon: LucideIcon | React.ComponentType<{ className?: string; size?: number }>;
  badge?: number | string;
  notificationDot?: boolean;
  active?: boolean;
  onClick?: () => void;
}

export interface SideNavProps {
  /** Brand logo at top of the blue rail (28×28). Pass an <img> or inline SVG. */
  logo?: React.ReactNode;
  /**
   * Collective Inbox item rendered first in the footer group. Pass `null` to
   * hide (some tenants like Ducon have no Inbox).
   */
  inboxItem?: SideNavItem | null;
  /** App-switch icons — one is active at a time. */
  apps: SideNavItem[];
  /** System items at the bottom — typically Settings, Help. */
  footerItems?: SideNavItem[];
  /**
   * Extra footer node rendered below the footer items (e.g. a UserMenu popover
   * that needs to anchor to its own trigger rather than a plain icon button).
   */
  footerExtra?: React.ReactNode;
  /** Second-rail content (module list) — typically <ModuleRail items={…}/>. */
  moduleRail?: React.ReactNode;
  className?: string;
}

export function SideNav({
  logo,
  inboxItem,
  apps,
  footerItems,
  footerExtra,
  moduleRail,
  className,
}: SideNavProps) {
  return (
    <TooltipProvider delayDuration={120}>
      <nav aria-label="Primary" className={cn('flex h-full', className)}>
        {/* App rail (blue, 52px wide = 12px padding + 28px content + 12px padding) */}
        <aside
          className="flex w-11 shrink-0 flex-col items-center justify-between overflow-hidden px-2 py-4"
          // Solid sidebar colour as the base; a tenant gradient (when set to a
          // value other than `none`) layers on top. Setting them separately
          // avoids `background: none` blanking the rail when no gradient exists.
          style={{ backgroundColor: 'var(--sidebar)', backgroundImage: 'var(--sidebar-gradient, none)' }}
        >
          {/* Top group: logo + (Inbox, then app icons) — Figma 7134:2063 */}
          <div className="flex flex-col items-center gap-3.5">
            {logo ? (
              <div className="relative size-7 shrink-0" aria-label="Tenant logo">
                {logo}
              </div>
            ) : null}

            {(inboxItem || apps.length > 0) ? (
              <div className="flex flex-col items-center gap-4">
                {inboxItem ? <InboxRailButton item={inboxItem} /> : null}
                {apps.map((app) => (
                  <AppRailButton key={app.id} item={app} />
                ))}
              </div>
            ) : null}
          </div>

          {/* Bottom group: Settings + Help + User (all circular) */}
          <div className="flex flex-col items-center gap-2">
            {(footerItems ?? []).map((item) => (
              <FooterRailButton key={item.id} item={item} />
            ))}
            {footerExtra}
          </div>
        </aside>

        {/* Module rail (white) */}
        {moduleRail ? (
          <aside className="relative flex h-full shrink-0 flex-col bg-card">
            {moduleRail}
            <div
              aria-hidden
              className="pointer-events-none absolute inset-0 border-r border-border"
            />
          </aside>
        ) : null}
      </nav>
    </TooltipProvider>
  );
}

/* App rail icon — rounded-[4px] p-[5px] (≈26px) with a left-border accent.
   Active: white bg + brand icon + brand/60 accent · Inactive: white/20 + white icon + brand/40 accent. */
function AppRailButton({ item }: { item: SideNavItem }) {
  const Icon = item.icon;
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button
          type="button"
          onClick={item.onClick}
          aria-label={item.label}
          aria-current={item.active ? 'page' : undefined}
          className="relative flex items-center justify-center rounded-[4px] border-l-2 border-solid p-[5px] outline-none transition-colors focus-visible:ring-2 focus-visible:ring-sidebar-ring"
          style={{
            background: item.active ? '#FFFFFF' : 'rgba(255,255,255,0.2)',
            borderLeftColor: item.active ? 'rgba(0,114,214,0.6)' : 'rgba(0,114,214,0.4)',
          }}
        >
          <Icon size={16} style={{ color: item.active ? 'var(--primary)' : '#FFFFFF' }} />
          {item.notificationDot ? (
            <span
              aria-hidden
              className="absolute right-0 top-0 inline-flex h-2 w-2 -translate-y-0.5 translate-x-0.5 rounded-full"
              style={{ background: 'var(--status-error)' }}
            />
          ) : null}
        </button>
      </TooltipTrigger>
      <TooltipContent side="right">{item.label}</TooltipContent>
    </Tooltip>
  );
}

/* Inbox — top of the app group, bracketed by 40px hairline dividers + a red
   indicator dot (Figma 7134:2068). Square rounded-[4px], white/20 (active → white). */
function InboxRailButton({ item }: { item: SideNavItem }) {
  const Icon = item.icon;
  const divider = <span aria-hidden className="h-px w-10 shrink-0" style={{ background: 'rgba(255,255,255,0.2)' }} />;
  return (
    <div className="flex flex-col items-center gap-2.5">
      {divider}
      <Tooltip>
        <TooltipTrigger asChild>
          <button
            type="button"
            onClick={item.onClick}
            aria-label={item.label}
            aria-current={item.active ? 'page' : undefined}
            className="relative flex items-center justify-center rounded-[4px] p-[5px] outline-none transition-colors focus-visible:ring-2 focus-visible:ring-sidebar-ring"
            style={{ background: item.active ? '#FFFFFF' : 'rgba(255,255,255,0.2)' }}
          >
            <Icon size={16} style={{ color: item.active ? 'var(--primary)' : '#FFFFFF' }} />
            {item.notificationDot ? (
              <span
                aria-hidden
                className="absolute right-0 top-0 inline-flex h-2 w-2 -translate-y-0.5 translate-x-0.5 rounded-full"
                style={{ background: 'var(--status-error)' }}
              />
            ) : null}
          </button>
        </TooltipTrigger>
        <TooltipContent side="right">{item.label}</TooltipContent>
      </Tooltip>
      {divider}
    </div>
  );
}

/* Footer rail item — 28×28 CIRCULAR with permanent translucent bg */
function FooterRailButton({ item }: { item: SideNavItem }) {
  const Icon = item.icon;
  const baseBg = item.active ? '#FFFFFF' : 'rgba(255,255,255,0.2)';
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button
          type="button"
          onClick={item.onClick}
          aria-label={item.label}
          aria-current={item.active ? 'page' : undefined}
          className="relative flex size-7 items-center justify-center rounded-full outline-none transition-colors focus-visible:ring-2 focus-visible:ring-sidebar-ring"
          style={{ background: baseBg }}
        >
          <Icon
            size={16}
            style={{ color: item.active ? 'var(--primary)' : 'rgba(255,255,255,0.95)' }}
          />
          {item.notificationDot ? (
            <span
              aria-hidden
              className="absolute right-0 top-0 inline-flex h-2 w-2 rounded-full"
              style={{
                background: 'var(--status-error)',
                boxShadow: '0 0 0 2px var(--sidebar)',
              }}
            />
          ) : null}
        </button>
      </TooltipTrigger>
      <TooltipContent side="right">{item.label}</TooltipContent>
    </Tooltip>
  );
}

/* ════════════════════════════════════════════════════════════════════════════
   ModuleRail — production-exact (34×34 squares, blue active state)
   ════════════════════════════════════════════════════════════════════════════ */
export interface ModuleRailItem {
  id: string;
  label: string;
  icon?: LucideIcon | React.ComponentType<{ className?: string; size?: number }>;
  active?: boolean;
  badge?: number | string;
  onClick?: () => void;
}

export interface ModuleRailProps {
  appLabel?: React.ReactNode;
  items: ModuleRailItem[];
  /** When true, render icon-only (compressed). Production default is icon-only. */
  compact?: boolean;
  footer?: React.ReactNode;
  className?: string;
}

export function ModuleRail({
  appLabel,
  items,
  compact = true,
  footer,
  className,
}: ModuleRailProps) {
  return (
    <div className={cn('flex h-full flex-col', className)}>
      {appLabel && !compact ? (
        <div className="border-b border-border px-4 py-3 text-sm font-semibold text-foreground">
          {appLabel}
        </div>
      ) : null}
      <div
        className={cn(
          'flex flex-1 flex-col items-center gap-4 overflow-y-auto p-4',
          !compact && 'items-stretch'
        )}
      >
        {items.map((m) => (
          <ModuleRailItemBtn key={m.id} item={m} compact={compact} />
        ))}
      </div>
      {footer ? <div className="border-t border-border p-2">{footer}</div> : null}
    </div>
  );
}

function ModuleRailItemBtn({
  item,
  compact,
}: {
  item: ModuleRailItem;
  compact: boolean;
}) {
  const Icon = item.icon;
  if (compact) {
    return (
      <Tooltip>
        <TooltipTrigger asChild>
          <button
            type="button"
            onClick={item.onClick}
            aria-label={item.label}
            aria-current={item.active ? 'page' : undefined}
            className={cn(
              'relative flex shrink-0 items-center justify-center rounded-[4px] p-[6px] outline-none transition-colors focus-visible:ring-2 focus-visible:ring-ring',
              item.active
                ? 'bg-primary text-white'
                : 'bg-transparent text-muted-foreground hover:bg-muted'
            )}
          >
            {Icon ? <Icon size={16} /> : null}
          </button>
        </TooltipTrigger>
        <TooltipContent side="right">{item.label}</TooltipContent>
      </Tooltip>
    );
  }
  return (
    <button
      type="button"
      onClick={item.onClick}
      aria-current={item.active ? 'page' : undefined}
      className={cn(
        'flex w-full items-center gap-2.5 rounded-md px-2 py-1.5 text-sm outline-none transition-colors focus-visible:ring-2 focus-visible:ring-ring',
        item.active
          ? 'bg-primary font-medium text-white'
          : 'text-foreground hover:bg-muted'
      )}
    >
      {Icon ? <Icon size={16} className="shrink-0" /> : <span className="w-4" />}
      <span className="truncate">{item.label}</span>
      {item.badge != null ? (
        <span className="ml-auto rounded bg-muted px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground">
          {item.badge}
        </span>
      ) : null}
    </button>
  );
}

/* Back-compat — existing AppShell passes `sections`. Type only. */
export interface SideNavSection {
  id?: string;
  label?: string;
  items: SideNavItem[];
}
