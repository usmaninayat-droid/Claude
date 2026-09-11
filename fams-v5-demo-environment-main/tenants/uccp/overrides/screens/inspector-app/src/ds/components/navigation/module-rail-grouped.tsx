import * as React from 'react';
import { ChevronDown } from 'lucide-react';
import { cn } from '../utils/cn';
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from '../primitives/tooltip';
import type { LucideIcon } from 'lucide-react';

/**
 * ModuleRailGrouped — an accordion (grouped) variant of the module rail, for
 * products whose module list is too deep for the flat `ModuleRail` (groups of
 * related modules interleaved with standalone items). Sits BESIDE `ModuleRail`
 * (never forked from it) — pick whichever shape a product's module list needs.
 *
 * Data model: a group `{ id, label, icon, items: ModuleRailLeaf[] }` or a
 * standalone leaf item, in the exact order they should render. Groups behave
 * as an ACCORDION (`openGroup`: at most one user-opened group at a time —
 * opening one closes whichever else the user had open); the group that owns
 * the active selection is ALWAYS open (`open = openGroup === id ||
 * hasActiveChild`), so it can't be collapsed away from its own selection.
 * Manually opening a group is EPHEMERAL — an effect clears `openGroup`
 * whenever `compact` becomes true, so a group the user opened but never
 * selected anything in doesn't stay open the next time the rail re-expands;
 * only the group owning the active selection survives that cycle.
 *
 * Collapsed (compact): every row is a fixed 32×32 icon box; a group whose
 * child is active shows ITS icon highlighted (the child row isn't visible
 * collapsed). Expanded: rows keep the SAME 32×32 leading icon box (so nothing
 * shifts horizontally across the compact/expanded swap) plus a label; the
 * group's title goes semibold when it owns the active child.
 */

export interface ModuleRailLeaf {
  id: string;
  label: string;
  icon: LucideIcon | React.ComponentType<{ className?: string; size?: number }>;
  badge?: number | string;
}

export interface ModuleRailGroup {
  type: 'group';
  id: string;
  label: string;
  icon: LucideIcon | React.ComponentType<{ className?: string; size?: number }>;
  items: ModuleRailLeaf[];
}

export interface ModuleRailStandaloneItem extends ModuleRailLeaf {
  type: 'item';
}

export type ModuleRailEntry = ModuleRailGroup | ModuleRailStandaloneItem;

export interface ModuleRailGroupedProps {
  entries: ModuleRailEntry[];
  /** When true, render icon-only (compressed) — mirrors the flat `ModuleRail`. */
  compact?: boolean;
  /** Initial active leaf id (either a standalone item or a group child). */
  defaultActive?: string;
  /** Fires whenever the active selection changes (internal state stays the source of truth). */
  onSelect?: (id: string) => void;
  footer?: React.ReactNode;
  className?: string;
}

function groupIdContaining(entries: ModuleRailEntry[], id: string | undefined): string | null {
  if (!id) return null;
  const g = entries.find((e): e is ModuleRailGroup => e.type === 'group' && e.items.some((i) => i.id === id));
  return g ? g.id : null;
}

export function ModuleRailGrouped({
  entries,
  compact = true,
  defaultActive,
  onSelect,
  footer,
  className,
}: ModuleRailGroupedProps) {
  const [activeId, setActiveId] = React.useState<string | undefined>(defaultActive);
  const [openGroup, setOpenGroup] = React.useState<string | null>(() => groupIdContaining(entries, defaultActive));

  // Manually opening a group is EPHEMERAL: clear it whenever the rail collapses
  // — the group owning the active selection is unaffected (stays open via
  // `hasActiveChild` regardless of `openGroup`).
  React.useEffect(() => {
    if (compact) setOpenGroup(null);
  }, [compact]);

  const activeGroupId = groupIdContaining(entries, activeId);

  const select = (id: string) => {
    setActiveId(id);
    onSelect?.(id);
  };

  return (
    <TooltipProvider delayDuration={120}>
      <div className={cn('flex h-full flex-col', className)}>
        <div
          className={cn(
            'flex flex-1 flex-col gap-2 overflow-y-auto overflow-x-hidden px-3.5 py-3 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden'
          )}
        >
          {entries.map((entry) => {
            if (entry.type === 'item') {
              return (
                <LeafRow
                  key={entry.id}
                  leaf={entry}
                  compact={compact}
                  active={activeId === entry.id}
                  onSelect={() => select(entry.id)}
                />
              );
            }

            const Icon = entry.icon;
            const hasActiveChild = activeGroupId === entry.id;
            const open = !compact && (openGroup === entry.id || hasActiveChild);
            return (
              <div key={entry.id} className="flex flex-col gap-1">
                <button
                  type="button"
                  onClick={() => setOpenGroup((cur) => (cur === entry.id ? null : entry.id))}
                  aria-expanded={compact ? undefined : open}
                  aria-label={entry.label}
                  className={cn(
                    'flex h-8 shrink-0 items-center rounded-md outline-none transition-colors focus-visible:ring-2 focus-visible:ring-ring',
                    compact
                      ? cn('w-8', hasActiveChild ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:bg-muted')
                      : cn('w-full text-body-sm text-foreground hover:bg-muted', hasActiveChild ? 'font-semibold' : 'font-medium')
                  )}
                >
                  <span className="flex size-8 shrink-0 items-center justify-center">
                    <Icon size={20} />
                  </span>
                  {!compact ? (
                    <>
                      <span className="flex-1 truncate text-left">{entry.label}</span>
                      <ChevronDown
                        size={16}
                        className={cn('shrink-0 text-muted-foreground transition-transform duration-200', open && 'rotate-180')}
                      />
                    </>
                  ) : null}
                </button>

                {open ? (
                  <div className="flex flex-col gap-1 pb-1">
                    {entry.items.map((child) => (
                      <LeafRow
                        key={child.id}
                        leaf={child}
                        compact={false}
                        indented
                        active={activeId === child.id}
                        onSelect={() => select(child.id)}
                      />
                    ))}
                  </div>
                ) : null}
              </div>
            );
          })}
        </div>
        {footer ? <div className="border-t border-border p-2">{footer}</div> : null}
      </div>
    </TooltipProvider>
  );
}

/** One clickable module row. Top-level (standalone or group header shares
 * this shape via LeafRow for items): a fixed 32×32 leading icon box so the
 * icon sits at the same left offset collapsed vs expanded; `text-body-sm`
 * (14px), active → `bg-primary text-primary-foreground`. Sub-items
 * (`indented`, expanded only): indented, 16px icon, `text-caption` (12px),
 * same default `text-foreground` as top-level, active → same primary tint. */
function LeafRow({
  leaf,
  compact,
  active,
  indented = false,
  onSelect,
}: {
  leaf: ModuleRailLeaf;
  compact: boolean;
  active: boolean;
  indented?: boolean;
  onSelect: () => void;
}) {
  const Icon = leaf.icon;

  if (indented) {
    return (
      <Tooltip>
        <TooltipTrigger asChild>
          <button
            type="button"
            onClick={onSelect}
            aria-current={active ? 'page' : undefined}
            aria-label={leaf.label}
            className={cn(
              'flex h-8 w-full shrink-0 items-center gap-2 rounded-md pl-7 text-caption outline-none transition-colors focus-visible:ring-2 focus-visible:ring-ring',
              active ? 'bg-primary font-semibold text-primary-foreground' : 'font-medium text-foreground hover:bg-muted'
            )}
          >
            <Icon size={16} className="shrink-0" />
            <span className="flex-1 truncate text-left">{leaf.label}</span>
            {leaf.badge != null ? (
              <span className="ml-auto shrink-0 rounded bg-muted px-1.5 py-0.5 text-caption font-medium text-muted-foreground">
                {leaf.badge}
              </span>
            ) : null}
          </button>
        </TooltipTrigger>
        <TooltipContent side="right">{leaf.label}</TooltipContent>
      </Tooltip>
    );
  }

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button
          type="button"
          onClick={onSelect}
          aria-current={active ? 'page' : undefined}
          aria-label={leaf.label}
          className={cn(
            'flex h-8 shrink-0 items-center rounded-md outline-none transition-colors focus-visible:ring-2 focus-visible:ring-ring',
            compact
              ? cn('w-8', active ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:bg-muted')
              : cn(
                  'w-full text-body-sm',
                  active ? 'bg-primary font-semibold text-primary-foreground' : 'font-medium text-foreground hover:bg-muted'
                )
          )}
        >
          <span className="flex size-8 shrink-0 items-center justify-center">
            <Icon size={20} />
          </span>
          {!compact ? <span className="flex-1 truncate text-left">{leaf.label}</span> : null}
        </button>
      </TooltipTrigger>
      <TooltipContent side="right">{leaf.label}</TooltipContent>
    </Tooltip>
  );
}
