import * as React from 'react';
import * as Icons from '../../icons';
import { cn } from '../utils/cn';
import { Sheet, SheetContent, SheetTitle, Popover, PopoverTrigger, PopoverContent, Textarea, Button, Checkbox } from '../primitives';
import type { EventItem } from './events-view';

/**
 * EventAssignSheet — the Events "Assign" side sheet (Figma W2z46FvC6aOdzOHDc3rqD5
 * · 259985-Assign Event / 62789-Assign N Selected Events). Opened from an
 * expanded card's Assign button (single event) or the floating bulk bar
 * (multiple events) — same sheet, the title + an extra "Selected Events" list
 * switch on `selectedEvents.length > 1`. Token-only, config-driven (assignee
 * catalogue is a prop with a `DEFAULT_ASSIGNEES` export, same pattern as
 * `DEFAULT_APPS`/`DEFAULT_CODES` elsewhere in the DS).
 */

export interface EventAssignee { id: string; name: string }

export const DEFAULT_ASSIGNEES: EventAssignee[] = [
  { id: 'usr-ahmed-ali', name: 'Ahmed Ali' },
  { id: 'usr-abubakar-r', name: 'Abubakar R.' },
  { id: 'usr-khalid-almansoori', name: 'Khalid Al-Mansoori' },
  { id: 'usr-ali-raza', name: 'Ali Raza' },
  { id: 'usr-fatima-noor', name: 'Fatima Noor' },
];

const CRIT = { critical: 'var(--status-error)', warning: 'var(--status-warning)', info: 'var(--primary)' } as const;

export interface EventAssignSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** assignee catalogue — defaults to `DEFAULT_ASSIGNEES`. */
  assignees?: EventAssignee[];
  /** the event(s) being assigned. 1 item → single-event flow; >1 → bulk flow with the "Selected Events" list. */
  selectedEvents?: EventItem[];
  onAssign: (assigneeId: string, note: string, eventIds: string[]) => void;
  className?: string;
}

export function EventAssignSheet({
  open, onOpenChange, assignees = DEFAULT_ASSIGNEES, selectedEvents = [], onAssign, className,
}: EventAssignSheetProps) {
  const [assigneeId, setAssigneeId] = React.useState('');
  const [note, setNote] = React.useState('');

  // fresh form every time the sheet is (re)opened
  React.useEffect(() => { if (open) { setAssigneeId(''); setNote(''); } }, [open]);

  const isBulk = selectedEvents.length > 1;
  const title = isBulk ? `Assign ${selectedEvents.length} Selected Events` : 'Assign Event';

  const submit = () => {
    if (!assigneeId) return;
    onAssign(assigneeId, note, selectedEvents.map((e) => e.id));
    onOpenChange(false);
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" width="min(420px, 92vw)" className={cn('flex flex-col p-0', className)}>
        <div className="border-b border-border px-6 pb-4 pt-6">
          <SheetTitle className="text-h6 font-bold text-foreground">{title}</SheetTitle>
        </div>

        <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-auto px-6 py-5">
          <AssigneeSelect assignees={assignees} value={assigneeId} onChange={setAssigneeId} />

          <Textarea
            label="Assignment note"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Assignment note (Optional)"
            className="min-h-[110px] resize-none"
          />

          {isBulk && (
            <div className="flex flex-col gap-2">
              <span className="text-body-sm font-semibold text-foreground">Selected Events</span>
              <div className="flex flex-col gap-2">
                {selectedEvents.map((e) => <SelectedEventRow key={e.id} e={e} />)}
              </div>
            </div>
          )}
        </div>

        <div className="border-t border-border p-6">
          <Button type="button" variant="primary" size="lg" onClick={submit} disabled={!assigneeId} className="w-full">
            Assign
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}

/** "Assign to *" popover select — local labeled-select pattern (events doesn't import Settings' LabeledSelect). */
function AssigneeSelect({ assignees, value, onChange }: { assignees: EventAssignee[]; value: string; onChange: (id: string) => void }) {
  const [open, setOpen] = React.useState(false);
  const selected = assignees.find((a) => a.id === value);
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          aria-haspopup="listbox"
          aria-expanded={open}
          aria-label="Assign to"
          className="flex h-11 w-full items-center justify-between gap-2 rounded-md border border-border bg-input-background px-3 text-left text-body-sm text-foreground outline-none transition-colors hover:bg-muted/40 focus-visible:ring-2 focus-visible:ring-ring"
        >
          <span className={cn('truncate', !selected && 'text-muted-foreground')}>{selected ? selected.name : 'Assign to *'}</span>
          <Icons.ChevronDown size={16} className="shrink-0 text-muted-foreground" />
        </button>
      </PopoverTrigger>
      <PopoverContent align="start" role="listbox" className="max-h-64 w-[--radix-popover-trigger-width] overflow-auto p-1">
        {assignees.map((a) => (
          <button
            key={a.id}
            type="button"
            role="option"
            aria-selected={a.id === value}
            onClick={() => { onChange(a.id); setOpen(false); }}
            className={cn('flex w-full items-center rounded-md px-2.5 py-2 text-left text-body-sm transition-colors hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring', a.id === value ? 'font-semibold text-primary' : 'text-foreground')}
          >
            {a.name}
          </button>
        ))}
        {!assignees.length && <div className="px-2.5 py-3 text-body-sm text-muted-foreground">No assignees.</div>}
      </PopoverContent>
    </Popover>
  );
}

/** Compact read-only row for the bulk "Selected Events" list. */
function SelectedEventRow({ e }: { e: EventItem }) {
  const tone = e.criticality === 'critical' ? CRIT.critical : e.criticality === 'warning' ? CRIT.warning : CRIT.info;
  return (
    <div className="flex items-center gap-2.5 rounded-lg border border-border bg-card p-2.5" style={{ borderLeft: e.criticality === 'info' ? undefined : `3px solid ${tone}` }}>
      <Checkbox checked disabled aria-hidden tabIndex={-1} className="pointer-events-none shrink-0" />
      <span className="grid size-8 shrink-0 place-items-center rounded-md" style={{ background: `color-mix(in srgb, ${tone} 12%, transparent)`, color: tone }}>
        <Icons.Flag01 size={14} />
      </span>
      <div className="flex min-w-0 flex-1 flex-col gap-0.5">
        <div className="flex items-baseline gap-2">
          <span className="truncate text-body-sm font-semibold text-foreground">{e.title}</span>
          <span className="ml-auto shrink-0 text-body-xs text-muted-foreground">{e.timeLabel}</span>
        </div>
        <span className="truncate text-body-xs text-muted-foreground">{e.subtitle} · {e.vehicle} · {e.zone}</span>
      </div>
    </div>
  );
}
