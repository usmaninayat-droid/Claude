import * as React from 'react';
import * as Icons from '../../icons';
import { cn } from '../utils/cn';
import { Popover, PopoverTrigger, PopoverContent } from '../primitives';

/**
 * LabeledSelect — the shared floating-label popover select used across Settings
 * forms/wizards (Preferences, Subscriptions, and — via the T-009 migration — the
 * event/entity/pipeline wizards). A caption label sits above the current value; the
 * trigger opens a token-only popover list. Token-only; announces as a listbox.
 */
export type SelectLeadingIcon = React.ComponentType<{ size?: number; className?: string }>;

export interface LabeledSelectProps {
  label: string;
  value: string;
  options: string[];
  onChange: (v: string) => void;
  placeholder?: string;
  disabled?: boolean;
  leading?: SelectLeadingIcon;
  className?: string;
}

export function LabeledSelect({ label, value, options, onChange, placeholder = 'Select', disabled, leading: Leading, className }: LabeledSelectProps) {
  const [open, setOpen] = React.useState(false);
  const listRef = React.useRef<HTMLDivElement>(null);

  // Roving focus over the option buttons — Radix Popover already handles Escape + focus
  // return to the trigger, so this only needs Arrow/Home/End/Enter/Space.
  const onListKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    const items = Array.from(listRef.current?.querySelectorAll<HTMLButtonElement>('[role="option"]') ?? []);
    if (!items.length) return;
    const active = document.activeElement as HTMLElement | null;
    const idx = items.indexOf(active as HTMLButtonElement);
    if (e.key === 'ArrowDown') { e.preventDefault(); items[idx < 0 ? 0 : (idx + 1) % items.length].focus(); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); items[idx < 0 ? items.length - 1 : (idx - 1 + items.length) % items.length].focus(); }
    else if (e.key === 'Home') { e.preventDefault(); items[0].focus(); }
    else if (e.key === 'End') { e.preventDefault(); items[items.length - 1].focus(); }
    else if ((e.key === 'Enter' || e.key === ' ') && idx >= 0) { e.preventDefault(); items[idx].click(); }
  };

  return (
    <Popover open={open} onOpenChange={(o) => !disabled && setOpen(o)}>
      <PopoverTrigger asChild>
        <button
          type="button"
          disabled={disabled}
          aria-haspopup="listbox"
          aria-expanded={open}
          aria-label={label}
          className={cn('flex h-14 w-full flex-col justify-center rounded-md border border-border bg-input-background px-3 text-left outline-none transition-colors focus-visible:ring-2 focus-visible:ring-ring', disabled ? 'cursor-default opacity-90' : 'hover:bg-muted/40', className)}
        >
          {/* T-090: uppercase/tracked to match FloatingLabelInput's Figma-verified
              caption idiom (floating-label-input.spec.md hard constraint #3) —
              LabeledSelect was the one outlier rendering its caption in plain
              sentence case ('Client' next to 'PROJECT NAME' in the same form). */}
          <span className="text-caption font-medium uppercase tracking-wide text-muted-foreground" style={{ letterSpacing: '0.04em' }}>{label}</span>
          <span className="flex items-center justify-between gap-2 text-body-sm text-foreground">
            <span className="flex min-w-0 items-center gap-2">{Leading ? <Leading size={16} className="shrink-0 text-muted-foreground" /> : null}<span className={cn('truncate', !value && 'text-muted-foreground')}>{value || placeholder}</span></span>
            {!disabled && <Icons.ChevronDown size={16} className="shrink-0 text-muted-foreground" />}
          </span>
        </button>
      </PopoverTrigger>
      <PopoverContent align="start" className="max-h-64 w-[--radix-popover-trigger-width] overflow-auto p-1">
        <div ref={listRef} onKeyDown={onListKeyDown}>
          {options.length ? options.map((o) => (
            <button key={o} type="button" role="option" aria-selected={o === value} onClick={() => { onChange(o); setOpen(false); }} className={cn('flex w-full rounded-md px-2.5 py-2 text-left text-body-sm transition-colors hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring', o === value ? 'font-semibold text-primary' : 'text-foreground')}>{o}</button>
          )) : <div className="px-2.5 py-3 text-body-sm text-muted-foreground">No options.</div>}
        </div>
      </PopoverContent>
    </Popover>
  );
}
