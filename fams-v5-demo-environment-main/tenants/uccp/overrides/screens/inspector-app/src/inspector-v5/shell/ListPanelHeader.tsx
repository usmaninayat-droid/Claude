import { useState } from 'react';
import { ArrowUpDown, ChevronDown, Download, Layers, Plus, Search, SlidersHorizontal } from 'lucide-react';
import { Input } from '@ds/components/primitives/input';
import { Switch } from '@ds/components/primitives/switch';
import { cn } from '@ds/components/utils/cn';

export interface AssigneeOption {
  value: string;
  label: string;
}

export interface ListPanelHeaderProps {
  searchValue: string;
  onSearchChange: (value: string) => void;
  searchPlaceholder?: string;
  onFilterClick?: () => void;
  onDownload?: () => void;
  onCreate?: () => void;
  onSortClick?: () => void;
  onGroupClick?: () => void;
  assigneeLabel?: string;
  assigneeOptions?: AssigneeOption[];
  assigneeValue?: string | null;
  onAssigneeChange?: (value: string | null) => void;
  syncWithMap: boolean;
  onSyncWithMapChange: (checked: boolean) => void;
}

const ICON_BUTTON =
  'flex size-10 shrink-0 items-center justify-center rounded-[var(--ins-radius-sm)] border border-border bg-card text-foreground outline-none transition-colors hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring';

/**
 * ListPanelHeader — 1:1 rebuild of the FAMS V5 web hybrid list panel's
 * in-panel toolbar (RecordMapListToolbar) + "Sync With Map" row
 * (RecordMapListPane), matching the user's reference screenshot exactly:
 *
 * Row 1: search input, outlined filter-lines button, outlined maroon
 * download button, solid maroon "+" create button.
 * Row 2: outlined sort button, outlined group/layers button, outlined
 * "Assigned Inspector ▾" dropdown.
 * Row 3: right-aligned "Sync With Map" label + toggle (default OFF).
 */
export function ListPanelHeader({
  searchValue,
  onSearchChange,
  searchPlaceholder = 'Search…',
  onFilterClick,
  onDownload,
  onCreate,
  onSortClick,
  onGroupClick,
  assigneeLabel = 'Assigned Inspector',
  assigneeOptions = [],
  assigneeValue,
  onAssigneeChange,
  syncWithMap,
  onSyncWithMapChange,
}: ListPanelHeaderProps) {
  const [assigneeOpen, setAssigneeOpen] = useState(false);
  const selectedAssignee = assigneeOptions.find((o) => o.value === assigneeValue);

  return (
    <div data-slot="list-panel-header" className="flex shrink-0 flex-col gap-2 border-b border-border bg-muted/20 p-3">
      {/* Row 1 */}
      <div className="flex items-center gap-2">
        <div className="relative min-w-0 flex-1">
          <Search
            size={16}
            aria-hidden="true"
            className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
          />
          <Input
            className="h-10 rounded-full pl-9"
            placeholder={searchPlaceholder}
            value={searchValue}
            onChange={(e) => onSearchChange(e.target.value)}
            aria-label="Search"
          />
        </div>
        <button type="button" className={ICON_BUTTON} onClick={onFilterClick} aria-label="Filter">
          <SlidersHorizontal size={18} />
        </button>
        <button
          type="button"
          className={cn(ICON_BUTTON, 'border-primary text-primary')}
          onClick={onDownload}
          aria-label="Download"
        >
          <Download size={18} />
        </button>
        <button
          type="button"
          className="flex size-10 shrink-0 items-center justify-center rounded-[var(--ins-radius-sm)] bg-primary text-primary-foreground outline-none transition-colors hover:opacity-90 focus-visible:ring-2 focus-visible:ring-ring"
          onClick={onCreate}
          aria-label="Create"
        >
          <Plus size={20} />
        </button>
      </div>

      {/* Row 2 */}
      <div className="flex items-center gap-2">
        <button type="button" className={ICON_BUTTON} onClick={onSortClick} aria-label="Sort">
          <ArrowUpDown size={17} />
        </button>
        <button type="button" className={ICON_BUTTON} onClick={onGroupClick} aria-label="Group by">
          <Layers size={17} />
        </button>
        {assigneeOptions.length > 0 && onAssigneeChange ? (
          <div className="relative min-w-0 flex-1">
            <button
              type="button"
              className="flex h-10 w-full min-w-0 items-center justify-between gap-1 rounded-[var(--ins-radius-sm)] border border-border bg-card px-3 text-body-sm font-medium text-foreground outline-none transition-colors hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring"
              onClick={() => setAssigneeOpen((o) => !o)}
              aria-haspopup="listbox"
              aria-expanded={assigneeOpen}
            >
              <span className="truncate">{selectedAssignee?.label ?? assigneeLabel}</span>
              <ChevronDown size={16} className="shrink-0 opacity-60" />
            </button>
            {assigneeOpen ? (
              <div className="absolute left-0 right-0 top-full z-20 mt-1 max-h-64 overflow-auto rounded-[var(--ins-radius-md)] border border-border bg-card p-1 shadow-md">
                <button
                  type="button"
                  className="block w-full rounded-[var(--ins-radius-sm)] px-2 py-1.5 text-left text-body-sm hover:bg-muted"
                  onClick={() => {
                    onAssigneeChange(null);
                    setAssigneeOpen(false);
                  }}
                >
                  {assigneeLabel}
                </button>
                {assigneeOptions.map((option) => (
                  <button
                    key={option.value}
                    type="button"
                    className={cn(
                      'block w-full rounded-[var(--ins-radius-sm)] px-2 py-1.5 text-left text-body-sm hover:bg-muted',
                      option.value === assigneeValue && 'bg-muted font-semibold',
                    )}
                    onClick={() => {
                      onAssigneeChange(option.value);
                      setAssigneeOpen(false);
                    }}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            ) : null}
          </div>
        ) : null}
      </div>

      {/* Row 3 — Sync With Map */}
      <div data-slot="list-panel-sync" className="flex items-center justify-end gap-1.5 pt-0.5">
        <span id="list-panel-sync-label" className="whitespace-nowrap text-caption font-semibold text-muted-foreground">
          Sync With Map
        </span>
        <Switch
          checked={syncWithMap}
          onCheckedChange={onSyncWithMapChange}
          aria-labelledby="list-panel-sync-label"
        />
      </div>
    </div>
  );
}
