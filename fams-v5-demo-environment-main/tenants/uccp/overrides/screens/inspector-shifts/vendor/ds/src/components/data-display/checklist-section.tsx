import * as React from 'react';
import { Check } from 'lucide-react';
import { cn } from '../utils/cn';

/**
 * ChecklistSection — the Truemax maintenance checklist / CRM sales-activity
 * checklist: interactive checkboxes driving an animated completion bar.
 * Read-only when the record's stage locks editing.
 */

export interface ChecklistSectionItem {
  id: string;
  label: React.ReactNode;
}

export interface ChecklistSectionProps {
  items: ChecklistSectionItem[];
  checkedIds: string[];
  onToggle?: (id: string) => void;
  readOnly?: boolean;
  className?: string;
}

export function ChecklistSection({ items, checkedIds, onToggle, readOnly, className }: ChecklistSectionProps) {
  const pct = items.length ? Math.round((checkedIds.length / items.length) * 100) : 0;
  return (
    <div className={cn(readOnly && 'pointer-events-none opacity-80', className)}>
      <div className="flex flex-col gap-1">
        {items.map((it) => {
          const on = checkedIds.includes(it.id);
          return (
            <button
              key={it.id}
              type="button"
              role="checkbox"
              aria-checked={on}
              onClick={() => onToggle?.(it.id)}
              className="flex items-center gap-2.5 rounded-md px-2 py-1.5 text-left text-body-sm outline-none transition-colors hover:bg-muted/50 focus-visible:ring-2 focus-visible:ring-ring"
            >
              <span
                className={cn(
                  'grid size-[18px] shrink-0 place-items-center rounded border transition-colors',
                  on ? 'border-primary bg-primary text-primary-foreground' : 'border-border bg-card'
                )}
              >
                {on ? <Check size={12} strokeWidth={3} /> : null}
              </span>
              <span className={cn(on ? 'text-muted-foreground line-through' : 'text-foreground')}>{it.label}</span>
            </button>
          );
        })}
      </div>
      <div className="mt-3 flex items-center gap-3">
        <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-muted">
          <div
            className="h-full rounded-full bg-primary transition-[width] duration-300"
            style={{ width: `${pct}%` }}
          />
        </div>
        <span className="shrink-0 text-caption font-semibold text-muted-foreground">
          {checkedIds.length}/{items.length} · {pct}%
        </span>
      </div>
    </div>
  );
}
