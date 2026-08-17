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
  /**
   * Extra items rendered inside the SAME divider bracket as the Inbox, directly
   * below it (e.g. a Home / Launch Pad item). Each renders with the inbox
   * button style and supports its own `notificationDot`/`active` state.
   * Optional — when omitted the bracket holds just `inboxItem`, unchanged.
   */
  pinnedItems?: SideNavItem[];
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
  /**
   * When true, the module rail (whatever node is passed to `moduleRail`) rests
   * icon-only (~60px) and expands to a labelled panel (~288px) on hover/focus,
   * floating OVER page content instead of pushing it over. Drives the rail
   * node's own `compact` prop via `React.cloneElement` — works with both
   * `ModuleRail` and `ModuleRailGrouped`. Default `false` — identical to today.
   */
  moduleRailExpandOnHover?: boolean;
  className?: string;
}

/** Matches the hover-expand rail's `duration-200`: on collapse the icon-only
 * swap waits this long so it happens only after the width shrink finishes —
 * otherwise the icon re-centres mid-shrink and visibly drags. */
const MODULE_RAIL_COLLAPSE_MS = 200;

export function SideNav({
  logo,
  inboxItem,
  pinnedItems,
  apps,
  footerItems,
  footerExtra,
  moduleRail,
  moduleRailExpandOnHover = false,
  className,
}: SideNavProps) {
  // Inbox + any pinned items share ONE divider bracket.
  const bracketItems = [inboxItem, ...(pinnedItems ?? [])].filter(Boolean) as SideNavItem[];

  const navRef = React.useRef<HTMLElement>(null);
  const [hoverOpen, setHoverOpen] = React.useState(false);
  const [hoverCompact, setHoverCompact] = React.useState(true);

  // Hover/focus-to-expand: wire mouseenter/leave + focusin/focusout directly on
  // the <nav> this component already owns (no ancestor-hunting needed). Only
  // active when `moduleRailExpandOnHover` is set.
  React.useEffect(() => {
    if (!moduleRailExpandOnHover) return;
    const nav = navRef.current;
    if (!nav) return;
    let hovered = false;
    let focused = false;
    const sync = () => setHoverOpen(hovered || focused);
    const onEnter = () => {
      hovered = true;
      sync();
    };
    const onLeave = () => {
      hovered = false;
      sync();
    };
    const onFocusIn = (e: FocusEvent) => {
      const t = e.target as HTMLElement | null;
      if (t && typeof t.matches === 'function' && t.matches(':focus-visible')) {
        focused = true;
        sync();
      }
    };
    const onFocusOut = (e: FocusEvent) => {
      if (!nav.contains(e.relatedTarget as Node | null)) {
        focused = false;
        sync();
      }
    };
    nav.addEventListener('mouseenter', onEnter);
    nav.addEventListener('mouseleave', onLeave);
    nav.addEventListener('focusin', onFocusIn);
    nav.addEventListener('focusout', onFocusOut);
    return () => {
      nav.removeEventListener('mouseenter', onEnter);
      nav.removeEventListener('mouseleave', onLeave);
      nav.removeEventListener('focusin', onFocusIn);
      nav.removeEventListener('focusout', onFocusOut);
    };
  }, [moduleRailExpandOnHover]);

  // Asymmetric `compact` swap — false immediately on open (icon already
  // left-pinned, sits still as the box widens); true only after the shrink
  // finishes on collapse, so the icon doesn't re-centre mid-shrink and drag.
  React.useEffect(() => {
    if (!moduleRailExpandOnHover) return;
    if (hoverOpen) {
      setHoverCompact(false);
      return;
    }
    const id = setTimeout(() => setHoverCompact(true), MODULE_RAIL_COLLAPSE_MS);
    return () => clearTimeout(id);
  }, [hoverOpen, moduleRailExpandOnHover]);

  const moduleRailNode =
    moduleRailExpandOnHover && React.isValidElement(moduleRail)
      ? React.cloneElement(moduleRail as React.ReactElement<{ compact?: boolean }>, { compact: hoverCompact })
      : moduleRail;

  return (
    <TooltipProvider delayDuration={120}>
      <nav ref={navRef} aria-label="Primary" className={cn('flex h-full', className)}>
        {/* App rail (blue, 52px wide = 12px padding + 28px content + 12px padding) */}
        <aside
          className="flex w-11 shrink-0 flex-col items-center justify-between overflow-hidden px-2 py-4"
          // Solid sidebar colour as the base; a tenant gradient (when set to a
          // value other than `none`) layers on top. Setting them separately
          // avoids `background: none` blanking the rail when no gradient exists.
          style={{ backgroundColor: 'var(--sidebar)', backgroundImage: 'var(--sidebar-gradient, none)' }}
        >
          {/* Top group: logo + (Inbox bracket, then app icons) — Figma 7134:2063 */}
          <div className="flex flex-col items-center gap-3.5">
            {logo ? (
              <div className="relative size-7 shrink-0" aria-label="Tenant logo">
                {logo}
              </div>
            ) : null}

            {(bracketItems.length > 0 || apps.length > 0) ? (
              <div className="flex flex-col items-center gap-4">
                {bracketItems.length > 0 ? <InboxBracket items={bracketItems} /> : null}
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
          moduleRailExpandOnHover ? (
            <aside className="relative h-full w-[60px] shrink-0">
              <div
                className={cn(
                  'absolute inset-y-0 left-0 flex h-full flex-col overflow-hidden border-r border-border bg-card transition-[width] duration-200 ease-out',
                  hoverOpen ? 'z-30 w-72 shadow-lg' : 'w-[60px]'
                )}
              >
                {moduleRailNode}
              </div>
            </aside>
          ) : (
            <aside className="relative flex h-full shrink-0 flex-col bg-card">
              {moduleRail}
              <div
                aria-hidden
                className="pointer-events-none absolute inset-0 border-r border-border"
              />
            </aside>
          )
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
            background: item.active ? 'var(--sidebar-primary)' : 'color-mix(in srgb, var(--primary-foreground) 20%, transparent)',
            borderLeftColor: item.active ? 'rgba(0,114,214,0.6)' : 'rgba(0,114,214,0.4)',
          }}
        >
          <Icon size={16} style={{ color: item.active ? 'var(--sidebar-primary-foreground)' : 'var(--primary-foreground)' }} />
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

/* Inbox bracket — top of the app group, bracketed by 40px hairline dividers
   (Figma 7134:2068 / 5442:2372). Holds the Inbox plus any `pinnedItems` (e.g.
   Home) stacked below it, all inside the SAME divider pair. When only the
   inbox is present this renders identically to the pre-`pinnedItems` markup. */
function InboxBracket({ items }: { items: SideNavItem[] }) {
  const divider = <span aria-hidden className="h-px w-10 shrink-0" style={{ background: 'color-mix(in srgb, var(--primary-foreground) 20%, transparent)' }} />;
  return (
    <div className="flex flex-col items-center gap-2.5">
      {divider}
      {items.map((item) => (
        <InboxRailButton key={item.id} item={item} />
      ))}
      {divider}
    </div>
  );
}

/* One bracketed rail button — square rounded-[4px], white/20 (active → white),
   with an optional red indicator dot. */
function InboxRailButton({ item }: { item: SideNavItem }) {
  const Icon = item.icon;
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button
          type="button"
          onClick={item.onClick}
          aria-label={item.label}
          aria-current={item.active ? 'page' : undefined}
          className="relative flex items-center justify-center rounded-[4px] p-[5px] outline-none transition-colors focus-visible:ring-2 focus-visible:ring-sidebar-ring"
          style={{ background: item.active ? 'var(--sidebar-primary)' : 'color-mix(in srgb, var(--primary-foreground) 20%, transparent)' }}
        >
          <Icon size={16} style={{ color: item.active ? 'var(--sidebar-primary-foreground)' : 'var(--primary-foreground)' }} />
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

/* Footer rail item — 28×28 CIRCULAR with permanent translucent bg */
function FooterRailButton({ item }: { item: SideNavItem }) {
  const Icon = item.icon;
  const baseBg = item.active ? 'var(--sidebar-primary)' : 'color-mix(in srgb, var(--primary-foreground) 20%, transparent)';
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
        <div className="border-b border-border px-4 py-3 text-body-sm font-semibold text-foreground">
          {appLabel}
        </div>
      ) : null}
      <div
        className={cn(
          // Module-heavy apps overflow the rail — keep it scrollable but hide the
          // OS scrollbar (same idiom as the monitoring/pipeline tab strips).
          'flex flex-1 flex-col items-center gap-4 overflow-y-auto p-4 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden',
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
        'flex w-full items-center gap-2.5 rounded-md px-2 py-1.5 text-body-sm outline-none transition-colors focus-visible:ring-2 focus-visible:ring-ring',
        item.active
          ? 'bg-primary font-medium text-white'
          : 'text-foreground hover:bg-muted'
      )}
    >
      {Icon ? <Icon size={16} className="shrink-0" /> : <span className="w-4" />}
      <span className="truncate">{item.label}</span>
      {item.badge != null ? (
        <span className="ml-auto rounded bg-muted px-1.5 py-0.5 text-caption font-medium text-muted-foreground">
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
