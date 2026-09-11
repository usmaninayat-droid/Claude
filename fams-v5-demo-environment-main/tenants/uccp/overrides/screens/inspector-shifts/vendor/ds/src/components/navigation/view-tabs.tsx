import * as React from 'react';
import { Plus, X, Pencil, MoreHorizontal } from 'lucide-react';
import { cn } from '../utils/cn';
import { Button } from '../primitives/button';
import {
  DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator
} from '../primitives/dropdown-menu';

/**
 * ViewTabs — Pattern #02 (saved-view tabs).
 * Renders an inline tab strip with rename/close/+ controls and a
 * "Modified" strip surface when the current view has unsaved filter changes.
 */

export interface ViewTab {
  id: string;
  label: string;
  closable?: boolean;
}

export interface ViewTabsProps {
  tabs: ViewTab[];
  activeId: string;
  modified?: boolean;
  onSelect?: (id: string) => void;
  onClose?: (id: string) => void;
  onRename?: (id: string, label: string) => void;
  onAdd?: () => void;
  onSaveView?: () => void;
  onSaveAsNew?: () => void;
  onRevert?: () => void;
  className?: string;
}

export function ViewTabs({
  tabs, activeId, modified, onSelect, onClose, onRename, onAdd,
  onSaveView, onSaveAsNew, onRevert, className,
}: ViewTabsProps) {
  return (
    <div className={cn('flex items-center gap-1 border-b border-border bg-card pl-2', className)}>
      <div className="flex flex-1 items-center gap-1 overflow-x-auto">
        {tabs.map((t) => {
          const active = t.id === activeId;
          return (
            <div
              key={t.id}
              className={cn(
                'group inline-flex items-center gap-1 rounded-t-md px-3 py-2 text-sm transition-colors cursor-pointer',
                active
                  ? 'border-b-2 border-primary text-primary font-medium -mb-px'
                  : 'text-muted-foreground hover:text-foreground'
              )}
              onClick={() => onSelect?.(t.id)}
            >
              <span>{t.label}</span>
              {active && onRename ? (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <button
                      className="size-4 rounded text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100 hover:text-foreground"
                      aria-label="View actions"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <MoreHorizontal className="size-4" />
                    </button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="start">
                    <DropdownMenuItem onSelect={() => {
                      const next = prompt('Rename view', t.label);
                      if (next && next !== t.label) onRename(t.id, next);
                    }}>
                      <Pencil className="size-3.5 mr-2" /> Rename
                    </DropdownMenuItem>
                    {t.closable && onClose ? (
                      <>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem destructive onSelect={() => onClose(t.id)}>
                          <X className="size-3.5 mr-2" /> Close tab
                        </DropdownMenuItem>
                      </>
                    ) : null}
                  </DropdownMenuContent>
                </DropdownMenu>
              ) : t.closable && onClose ? (
                <button
                  className="ml-1 rounded text-muted-foreground opacity-0 hover:text-foreground group-hover:opacity-100"
                  aria-label={`Close ${t.label}`}
                  onClick={(e) => { e.stopPropagation(); onClose(t.id); }}
                >
                  <X className="size-3" />
                </button>
              ) : null}
            </div>
          );
        })}
        {onAdd ? (
          <button
            type="button"
            onClick={onAdd}
            className="ml-1 inline-flex size-7 items-center justify-center rounded text-muted-foreground hover:bg-muted hover:text-foreground"
            aria-label="Add view"
          >
            <Plus className="size-4" />
          </button>
        ) : null}
      </div>

      {modified ? (
        <div className="flex items-center gap-2 pr-2 text-xs">
          <span className="font-medium text-[color:var(--status-warning)]">Modified</span>
          {onRevert ? <Button variant="ghost" size="sm" onClick={onRevert}>Revert</Button> : null}
          {onSaveAsNew ? <Button variant="tertiary" size="sm" onClick={onSaveAsNew}>Save as new</Button> : null}
          {onSaveView ? <Button variant="primary" size="sm" onClick={onSaveView}>Save</Button> : null}
        </div>
      ) : null}
    </div>
  );
}
