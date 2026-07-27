import * as React from 'react';
import { X } from 'lucide-react';
import { cn } from '../utils/cn';
import { Popover, PopoverContent, PopoverTrigger } from '../primitives/popover';
import { Button } from '../primitives/button';
import { Badge } from '../primitives/badge';

/**
 * FilterPopup — Pattern #08.
 * Anchored popup for adding/removing/editing filters on a list/kanban view.
 * Consumer renders FilterControl children; this provides the popover chrome.
 */

export interface FilterPopupProps {
  trigger: React.ReactNode;
  /** Header label — defaults to "Filters". Set this when the popup covers a
   * single facet (e.g. "Module", "Assignee") so it isn't mislabeled. */
  title?: string;
  open?: boolean;
  onOpenChange?: (o: boolean) => void;
  activeCount?: number;
  onClearAll?: () => void;
  onApply?: () => void;
  children: React.ReactNode;
  className?: string;
}

export function FilterPopup({ trigger, title = 'Filters', open, onOpenChange, activeCount, onClearAll, onApply, children, className }: FilterPopupProps) {
  return (
    <Popover open={open} onOpenChange={onOpenChange}>
      <PopoverTrigger asChild>
        {trigger}
      </PopoverTrigger>
      <PopoverContent align="start" className={cn('w-80 p-0', className)}>
        <div className="flex items-center justify-between border-b border-border p-3">
          <div className="flex items-center gap-2">
            <span className="text-body-sm font-semibold text-foreground">{title}</span>
            {activeCount ? <Badge variant="muted" size="xs">{activeCount}</Badge> : null}
          </div>
          {onClearAll ? (
            <Button variant="ghost" size="sm" onClick={onClearAll}>
              <X className="mr-1 size-3.5" /> Clear all
            </Button>
          ) : null}
        </div>
        <div className="max-h-80 space-y-3 overflow-y-auto p-3">
          {children}
        </div>
        {onApply ? (
          <div className="flex justify-end border-t border-border p-3">
            <Button variant="primary" size="sm" onClick={onApply}>Apply</Button>
          </div>
        ) : null}
      </PopoverContent>
    </Popover>
  );
}
