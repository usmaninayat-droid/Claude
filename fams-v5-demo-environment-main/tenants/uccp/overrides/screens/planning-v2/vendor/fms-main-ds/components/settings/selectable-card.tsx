import * as React from 'react';
import * as Icons from '../../icons';
import { cn } from '../utils/cn';

/**
 * SelectableCard — the shared "checkbox option card" used across Settings
 * wizards (RoleSheet apps/roles, AppSheet modules/roles, category entities):
 * a checkbox + optional icon + title + (description and/or pills), with an
 * optional expand slot (`children`) revealed when selected — e.g. the AppSheet
 * "Configure your module" panel. Token-only; keyboard + aria wired.
 */

type IconCmp = React.ComponentType<{ size?: number; className?: string }>;

export interface SelectableCardProps {
  selected: boolean;
  onToggle: () => void;
  title: React.ReactNode;
  icon?: IconCmp;
  description?: React.ReactNode;
  /** Small outline pills under the title (e.g. entity tags). */
  pills?: string[];
  /** Extra content rendered at the end of the row (e.g. status + date). */
  trailing?: React.ReactNode;
  /** Extra content rendered inside the card below the header (e.g. a config panel). */
  children?: React.ReactNode;
  className?: string;
}

export function SelectableCard({ selected, onToggle, title, icon: Icon, description, pills, trailing, children, className }: SelectableCardProps) {
  return (
    <div className={cn('rounded-xl border transition-colors', selected ? 'border-primary bg-primary/5' : 'border-border', className)}>
      <button
        type="button"
        role="checkbox"
        aria-checked={selected}
        onClick={onToggle}
        className="flex w-full items-center gap-3 p-3.5 text-left focus-visible:ring-2 focus-visible:ring-ring"
      >
        <span className={cn('grid size-4 shrink-0 place-items-center rounded border', selected ? 'border-primary bg-primary text-primary-foreground' : 'border-muted-foreground/40')}>
          {selected && <Icons.Check size={11} />}
        </span>
        {Icon ? <Icon size={18} className={cn('shrink-0', selected ? 'text-primary' : 'text-muted-foreground')} /> : null}
        <span className="flex flex-1 flex-col gap-1">
          <span className="text-body-sm font-semibold text-foreground">{title}</span>
          {description ? <span className="text-body-xs text-muted-foreground">{description}</span> : null}
          {pills?.length ? (
            <span className="mt-0.5 flex flex-wrap gap-1.5">
              {pills.map((p) => <span key={p} className="rounded-full border border-border px-2 py-0.5 text-caption font-medium text-muted-foreground">{p}</span>)}
            </span>
          ) : null}
        </span>
        {trailing ? <span className="shrink-0">{trailing}</span> : null}
      </button>
      {selected && children ? <div className="border-t border-border/70 px-3.5 pb-3.5 pt-3">{children}</div> : null}
    </div>
  );
}
