import * as React from 'react';
import { Search, X } from 'lucide-react';
import { cn } from '../utils/cn';
import {
  Drawer, DrawerContent, DrawerHeader, DrawerTitle, DrawerDescription, DrawerFooter,
} from '../primitives/drawer';
import { Input } from '../primitives/input';
import { Button } from '../primitives/button';
import { Checkbox } from '../primitives/checkbox';
import { Avatar } from '../primitives/avatar';
import { Badge } from '../primitives/badge';

/**
 * LinkedEntityPicker — Pattern #18 + #19.
 *
 * Right-slide drawer with a header (title + search), a body listing
 * candidate entities (one row per entity, with checkbox + Avatar + name + type + tags),
 * and a footer with a primary "Add N selected" CTA + a tertiary Cancel.
 *
 * Used by EntityCreationDrawer (and elsewhere) to populate `linked-entity` and
 * `linked-entity-list` fields without forcing the user to type IDs by hand.
 *
 * Theme-token only — no hardcoded colors.
 */

export interface LinkedEntityOption {
  id: string;
  label: string;
  avatarSrc?: string;
  /** Short type label, e.g. "Company", "Contact". */
  type?: string;
  tags?: string[];
  /** Optional secondary line under the label (email, role, etc). */
  secondary?: string;
}

export interface LinkedEntityPickerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Display label for the target entity type, e.g. "Contact". */
  entityTypeLabel: string;
  availableEntities: LinkedEntityOption[];
  /** Pre-selected IDs (used to render checked state on open). */
  initialSelectedIds?: string[];
  /** When true, only one entity can be picked at a time. Defaults to multi. */
  multiSelect?: boolean;
  /** Called when the user confirms the selection. */
  onConfirm: (selectedIds: string[]) => void;
  /** Optional override of the primary CTA prefix. Defaults to "Add". */
  confirmLabelPrefix?: string;
}

export function LinkedEntityPicker({
  open,
  onOpenChange,
  entityTypeLabel,
  availableEntities,
  initialSelectedIds = [],
  multiSelect = true,
  onConfirm,
  confirmLabelPrefix = 'Add',
}: LinkedEntityPickerProps) {
  const [query, setQuery] = React.useState('');
  const [selected, setSelected] = React.useState<Set<string>>(new Set(initialSelectedIds));

  React.useEffect(() => {
    if (open) {
      setSelected(new Set(initialSelectedIds));
      setQuery('');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const filtered = React.useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return availableEntities;
    return availableEntities.filter((e) => {
      if (e.label.toLowerCase().includes(q)) return true;
      if (e.secondary?.toLowerCase().includes(q)) return true;
      if (e.type?.toLowerCase().includes(q)) return true;
      if (e.tags?.some((t) => t.toLowerCase().includes(q))) return true;
      return false;
    });
  }, [availableEntities, query]);

  const toggle = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (multiSelect) {
        if (next.has(id)) next.delete(id);
        else next.add(id);
      } else {
        next.clear();
        next.add(id);
      }
      return next;
    });
  };

  const count = selected.size;

  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent className="max-w-[520px]">
        <DrawerHeader>
          <DrawerTitle>Select {entityTypeLabel}</DrawerTitle>
          <DrawerDescription>
            {multiSelect
              ? `Pick one or more ${entityTypeLabel.toLowerCase()} records to link.`
              : `Pick a ${entityTypeLabel.toLowerCase()} to link.`}
          </DrawerDescription>
          <div className="relative mt-2">
            <Search aria-hidden className="pointer-events-none absolute left-3 top-1/2 z-10 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={`Search ${entityTypeLabel.toLowerCase()}…`}
              className="pl-9"
              aria-label="Search"
            />
          </div>
        </DrawerHeader>

        <div className="flex-1 overflow-y-auto">
          {filtered.length === 0 ? (
            <div className="flex h-full min-h-[160px] items-center justify-center px-6 py-12 text-center text-body-sm text-muted-foreground">
              No {entityTypeLabel.toLowerCase()} match "{query}".
            </div>
          ) : (
            <ul className="divide-y divide-border">
              {filtered.map((e) => {
                const checked = selected.has(e.id);
                return (
                  <li key={e.id}>
                    <label
                      className={cn(
                        'flex cursor-pointer items-center gap-3 px-6 py-3 transition-colors hover:bg-muted',
                        checked && 'bg-secondary/40'
                      )}
                    >
                      <Checkbox
                        checked={checked}
                        onCheckedChange={() => toggle(e.id)}
                        aria-label={`Select ${e.label}`}
                      />
                      <Avatar
                        size="sm"
                        src={e.avatarSrc}
                        fallback={e.label.slice(0, 2).toUpperCase()}
                      />
                      <div className="min-w-0 flex-1">
                        <div className="truncate text-body-sm font-medium text-foreground">{e.label}</div>
                        {e.secondary ? (
                          <div className="truncate text-caption text-muted-foreground">{e.secondary}</div>
                        ) : null}
                      </div>
                      <div className="flex shrink-0 items-center gap-1.5">
                        {e.type ? (
                          <Badge variant="muted" size="xs">{e.type}</Badge>
                        ) : null}
                        {e.tags?.slice(0, 2).map((t) => (
                          <Badge key={t} variant="secondary" size="xs">{t}</Badge>
                        ))}
                      </div>
                    </label>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        <DrawerFooter>
          <Button variant="tertiary" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            variant="primary"
            disabled={count === 0}
            onClick={() => {
              onConfirm(Array.from(selected));
              onOpenChange(false);
            }}
          >
            {confirmLabelPrefix} {count > 0 ? count : ''}{count > 0 ? ' selected' : `${entityTypeLabel}`}
          </Button>
        </DrawerFooter>
      </DrawerContent>
    </Drawer>
  );
}

/**
 * LinkedEntityTile — small chip representing one already-linked entity
 * shown above the "Add {entity}" button inside a creation/edit form.
 */
export interface LinkedEntityTileProps {
  label: string;
  avatarSrc?: string;
  onRemove?: () => void;
  className?: string;
}

export function LinkedEntityTile({ label, avatarSrc, onRemove, className }: LinkedEntityTileProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-2 rounded-full border border-border bg-card py-1 pl-1 pr-2 text-caption text-foreground shadow-sm',
        className
      )}
    >
      <Avatar size="xs" src={avatarSrc} fallback={label.slice(0, 2).toUpperCase()} />
      <span className="truncate max-w-[180px]">{label}</span>
      {onRemove ? (
        <button
          type="button"
          aria-label={`Remove ${label}`}
          onClick={onRemove}
          className="ml-0.5 rounded-full p-0.5 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
        >
          <X className="size-3" />
        </button>
      ) : null}
    </span>
  );
}
