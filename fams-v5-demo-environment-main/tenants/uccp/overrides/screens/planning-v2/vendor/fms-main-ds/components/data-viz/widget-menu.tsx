import * as React from 'react';
import * as Icons from '../../icons';
import { cn } from '../utils/cn';
import { Popover, PopoverTrigger, PopoverContent } from '../primitives';

/**
 * WidgetMenu — the ⋮ (kebab) overflow menu in a chart/widget header. Opens a
 * popover of actions (e.g. "View raw data", "Export chart"). Replaces one-off
 * header icon-buttons with a single consistent overflow affordance.
 */

export interface WidgetMenuItem {
  id: string;
  label: React.ReactNode;
  icon?: React.ReactNode;
  onClick: () => void;
  tone?: 'default' | 'danger';
}

export interface WidgetMenuProps {
  items: WidgetMenuItem[];
  ariaLabel?: string;
  align?: 'start' | 'center' | 'end';
  className?: string;
}

export function WidgetMenu({ items, ariaLabel = 'Widget options', align = 'end', className }: WidgetMenuProps) {
  const [open, setOpen] = React.useState(false);
  if (!items.length) return null;
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          aria-label={ariaLabel}
          className={cn(
            'flex size-7 shrink-0 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring',
            className,
          )}
        >
          <Icons.DotsVertical size={18} />
        </button>
      </PopoverTrigger>
      <PopoverContent align={align} className="w-48 p-1">
        {items.map((it) => (
          <button
            key={it.id}
            type="button"
            onClick={() => { it.onClick(); setOpen(false); }}
            className={cn(
              'flex w-full items-center gap-2.5 rounded-md px-2.5 py-2 text-left text-body-sm transition-colors hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring [&>svg]:size-4 [&>svg]:shrink-0',
              it.tone === 'danger' ? 'text-[var(--status-error)]' : 'text-foreground',
            )}
          >
            {it.icon}
            {it.label}
          </button>
        ))}
      </PopoverContent>
    </Popover>
  );
}
