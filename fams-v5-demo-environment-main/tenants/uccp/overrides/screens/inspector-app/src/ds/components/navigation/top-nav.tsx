import * as React from 'react';
import { cn } from '../utils/cn';
import {
  LayoutGrid, List, Map as MapIcon, KanbanSquare, Calendar, Plus, X, Home,
  type LucideIcon,
} from 'lucide-react';

/**
 * TOP NAV — TWO VARIANTS (Pattern #02 production layout)
 * ----------------------------------------------------------------------------
 * Variant A — TopNavModule
 *   Renders when the module is showing its primary view surface (kanban /
 *   list / map / calendar / hybrid). Layout:
 *
 *     [Module Name]   [Hybrid View] [List View] [Map View] [Kanban View] [+]
 *
 *   The view-type tabs come from the module config (`config.views`).
 *
 * Variant B — TopNavDetail
 *   Renders when one or more detail views (entity side-sheet / pipeline task /
 *   plan monitoring) are open. Behaves like a browser-tab strip — each tab
 *   represents one open detail, with an X to close. Pattern is inspired by
 *   browser tabs (mac traffic lights on the left are decorative — they
 *   indicate the strip is a "tab system", they are NOT window controls).
 *
 *     [● ● ●]   [Asset · Hybrid View] [×]  [Asset · Hybrid View] [×]  …
 *
 *   Clicking a tab switches the active detail. Clicking X closes it. The
 *   strip overlays the TopNavModule while details are open; closing the last
 *   detail returns to TopNavModule.
 * ----------------------------------------------------------------------------
 */

export type ViewKind = 'hybrid' | 'list' | 'map' | 'kanban' | 'calendar' | 'grouped-list';

const VIEW_ICON: Record<ViewKind, LucideIcon> = {
  hybrid: LayoutGrid,
  list: List,
  map: MapIcon,
  kanban: KanbanSquare,
  calendar: Calendar,
  'grouped-list': List,
};

const VIEW_LABEL: Record<ViewKind, string> = {
  hybrid: 'Hybrid View',
  list: 'List View',
  map: 'Map View',
  kanban: 'Kanban View',
  calendar: 'Calendar View',
  'grouped-list': 'Grouped List',
};

/* ──────────────────────────────────────────────────────────────────────────
   Variant A — TopNavModule
   ────────────────────────────────────────────────────────────────────────── */
export interface ModuleViewTab {
  /** Stable id, used as the route segment. */
  id: string;
  /** View kind (drives default icon + label). */
  kind: ViewKind;
  /** Override label. Defaults to the kind's standard label. */
  label?: string;
  /**
   * Override icon. Defaults to the kind's standard icon (`VIEW_ICON[kind]`).
   * Lets domain modules whose top-nav tabs are *domain surfaces* (not the
   * generic view kinds) carry their own glyphs — e.g. a Flood-Management app
   * showing Dispatching/Monitoring/Intelligence tabs. Purely additive:
   * existing callers that omit it keep the kind-derived icon.
   */
  icon?: LucideIcon | React.ComponentType<{ size?: number; className?: string }>;
  active?: boolean;
  onClick?: () => void;
  /** When set, the tab shows a × close affordance (segment variant). */
  onClose?: () => void;
}

export interface TopNavModuleProps {
  /** Module display name (left of the view tabs). */
  moduleName: React.ReactNode;
  /** View-type tabs declared by the module config. */
  views: ModuleViewTab[];
  /** Optional "add view" handler — renders a `+` button after the tabs. */
  onAddView?: () => void;
  /**
   * Optional "module home" handler — renders a Home icon left of the module
   * name (the Reports-module top-bar variant, where each view is a report and
   * Home returns to the reports landing). Figma DS V2 `7134:2199`.
   */
  onModuleHome?: () => void;
  /** Optional right-side toolbar slot (search, filter, +Create). */
  rightSlot?: React.ReactNode;
  /**
   * `pill` (default) — compact rounded tabs.
   * `segment` — Truemax production: full-height (48px) bordered tab segments.
   */
  variant?: 'pill' | 'segment';
  className?: string;
}

export function TopNavModule({
  moduleName,
  views,
  onAddView,
  onModuleHome,
  rightSlot,
  variant = 'pill',
  className,
}: TopNavModuleProps) {
  /* Segment — Figma DS V2 Top Navbar (`6995:419`, reports `7134:2199`).
   * #f9fafb bar, 24px module cell (optional Home icon), bordered view segments. */
  if (variant === 'segment') {
    return (
      <header
        className={cn('flex h-12 shrink-0 items-center border-b border-border bg-background', className)}
      >
        <div className="flex h-full shrink-0 items-center gap-2.5 px-6">
          {onModuleHome ? (
            <button
              type="button"
              onClick={onModuleHome}
              aria-label="Back to home"
              className="flex items-center justify-center text-foreground outline-none transition-opacity hover:opacity-70 focus-visible:ring-2 focus-visible:ring-ring"
            >
              <Home size={20} />
            </button>
          ) : null}
          <span className="text-body-md font-semibold text-foreground">{moduleName}</span>
        </div>

        {/* Segmented view-tab strip — each tab is bordered (l/r), overlapping.
         * `min-w-0` + `overflow-x-auto` let the strip scroll horizontally
         * within the header instead of pushing later siblings (rightSlot)
         * past the viewport edge on narrow/mobile widths; hidden scrollbar
         * keeps the desktop look unchanged when everything already fits. */}
        <div className="flex h-full min-w-0 flex-1 items-center overflow-x-auto fams-hide-scrollbar">
          {views.map((v) => {
            const Icon = v.icon ?? VIEW_ICON[v.kind] ?? LayoutGrid;
            return (
              <div
                key={v.id}
                role="tab"
                aria-selected={v.active ? 'true' : undefined}
                onClick={v.onClick}
                className={cn(
                  'group relative -mr-px flex h-full cursor-pointer items-center gap-2 border-l border-r border-border p-3 transition-colors',
                  v.active ? 'bg-card' : 'bg-background hover:bg-muted'
                )}
              >
                <Icon size={16} className={v.active ? 'text-primary' : 'text-muted-foreground'} />
                <span
                  className="max-w-[160px] truncate text-caption font-semibold"
                  style={{ color: 'var(--card-foreground)' }}
                >
                  {v.label ?? VIEW_LABEL[v.kind]}
                </span>
                {v.onClose ? (
                  <button
                    type="button"
                    aria-label="Close view"
                    onClick={(e) => { e.stopPropagation(); v.onClose!(); }}
                    className={cn(
                      'flex size-4 items-center justify-center rounded-full transition-opacity hover:bg-destructive/10',
                      v.active ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'
                    )}
                  >
                    <X size={10} className="text-muted-foreground" />
                  </button>
                ) : null}
              </div>
            );
          })}
          {onAddView ? (
            <button
              type="button"
              onClick={onAddView}
              aria-label="Add view"
              className="ml-1 flex items-center justify-center rounded-[4px] p-3.5 text-muted-foreground outline-none transition-colors hover:bg-muted hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring"
            >
              <Plus size={20} />
            </button>
          ) : null}
        </div>

        {rightSlot ? <div className="ml-auto flex shrink-0 items-center gap-2 px-4">{rightSlot}</div> : null}
      </header>
    );
  }

  /* Pill — compact rounded tabs (legacy / standalone usage). */
  return (
    <header className={cn('flex h-12 shrink-0 items-center gap-3 border-b border-border bg-background px-4', className)}>
      <div className="shrink-0 text-body-sm font-semibold text-foreground">{moduleName}</div>
      <div className="flex items-center gap-1">
        {views.map((v) => {
          const Icon = v.icon ?? VIEW_ICON[v.kind] ?? LayoutGrid;
          return (
            <button
              key={v.id}
              type="button"
              onClick={v.onClick}
              aria-current={v.active ? 'true' : undefined}
              className={cn(
                'flex h-8 items-center gap-1.5 rounded-md px-2.5 text-caption font-medium outline-none transition-colors focus-visible:ring-2 focus-visible:ring-ring',
                v.active
                  ? 'bg-secondary text-secondary-foreground'
                  : 'text-muted-foreground hover:bg-muted hover:text-foreground'
              )}
            >
              <Icon size={14} className={v.active ? 'text-primary' : ''} />
              <span>{v.label ?? VIEW_LABEL[v.kind]}</span>
            </button>
          );
        })}
        {onAddView ? (
          <button
            type="button"
            onClick={onAddView}
            aria-label="Add view"
            className="ml-1 flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground outline-none transition-colors hover:bg-muted hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring"
          >
            <Plus size={14} />
          </button>
        ) : null}
      </div>
      {rightSlot ? <div className="ml-auto flex items-center gap-2">{rightSlot}</div> : null}
    </header>
  );
}

/* ──────────────────────────────────────────────────────────────────────────
   Variant B — TopNavDetail (browser-tab pattern)
   ────────────────────────────────────────────────────────────────────────── */
export interface DetailTab {
  /** Stable id (used as the route segment for a detail). */
  id: string;
  /** Entity / record label (e.g. "Asset 4218"). */
  label: React.ReactNode;
  /** Secondary label rendered above the main label (e.g. "Asset"). */
  category?: React.ReactNode;
  active?: boolean;
  onClick?: () => void;
  onClose?: () => void;
}

export interface TopNavDetailProps {
  tabs: DetailTab[];
  /** When set, renders a "Back to module" affordance left of the tabs. */
  onBack?: () => void;
  /** When true, render the decorative traffic-light dots (default true). */
  showTrafficLights?: boolean;
  /** Right slot for toolbar items shared across all detail tabs (e.g. Save). */
  rightSlot?: React.ReactNode;
  className?: string;
}

export function TopNavDetail({
  tabs,
  onBack,
  showTrafficLights = true,
  rightSlot,
  className,
}: TopNavDetailProps) {
  return (
    <header
      className={cn(
        'flex h-12 shrink-0 items-center gap-3 border-b border-border bg-card px-3',
        className
      )}
    >
      {showTrafficLights ? (
        <div className="flex items-center gap-1.5 pl-1 pr-3" aria-hidden>
          <span className="block h-3 w-3 rounded-full" style={{ background: 'var(--status-error)' }} />
          <span className="block h-3 w-3 rounded-full" style={{ background: 'var(--status-warning)' }} />
        </div>
      ) : null}

      {onBack ? (
        <button
          type="button"
          onClick={onBack}
          className="mr-1 rounded-md px-2 py-1 text-caption font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
        >
          ← Back
        </button>
      ) : null}

      <div className="flex flex-1 items-center gap-1 overflow-x-auto">
        {tabs.map((t) => (
          <DetailTabBtn key={t.id} tab={t} />
        ))}
      </div>

      {rightSlot ? <div className="ml-2 flex items-center gap-2">{rightSlot}</div> : null}
    </header>
  );
}

function DetailTabBtn({ tab }: { tab: DetailTab }) {
  return (
    <div
      className={cn(
        'group inline-flex h-9 min-w-[160px] max-w-[260px] items-center gap-2 rounded-md border px-3 transition-colors',
        tab.active
          ? 'border-border bg-background shadow-sm'
          : 'border-transparent bg-muted/60 hover:bg-muted'
      )}
    >
      <button
        type="button"
        onClick={tab.onClick}
        className="flex flex-1 items-center justify-start gap-2 truncate text-left outline-none"
      >
        {/* The unfilled circle (matches the screenshot) */}
        <span
          aria-hidden
          className={cn(
            'inline-block h-3 w-3 shrink-0 rounded-full border-2',
            tab.active ? 'border-primary' : 'border-muted-foreground/50'
          )}
        />
        <span className="flex min-w-0 flex-col items-start leading-tight">
          {tab.category ? (
            <span className="truncate text-caption font-medium uppercase tracking-wide text-muted-foreground">
              {tab.category}
            </span>
          ) : null}
          <span className={cn('truncate text-caption', tab.active ? 'font-semibold text-foreground' : 'text-foreground/80')}>
            {tab.label}
          </span>
        </span>
      </button>
      {tab.onClose ? (
        <button
          type="button"
          onClick={tab.onClose}
          aria-label="Close tab"
          className="flex h-5 w-5 shrink-0 items-center justify-center rounded text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
        >
          <X size={12} />
        </button>
      ) : null}
    </div>
  );
}
