import * as React from 'react';
import * as Icons from '../../icons';
import { EventIcon } from '../../icons';
import { cn } from '../utils/cn';
import { Button, Badge, Switch, Popover, PopoverTrigger, PopoverContent } from '../primitives';

/**
 * EventConfiguration — Settings › Event Configuration list (FAMS Settings, Figma
 * 211-9075). One row per configured event: event icon + name · type (SINGLE/DUAL) ·
 * trigger · criticality badge · config-type badge (SYSTEM/CUSTOM) · enable toggle ·
 * kebab. Header carries "Create New Event". Config-driven (`events: EventRow[]`),
 * token-only. Reuses the DS `EventIcon` registry for event glyphs.
 */

export type EventConfigCriticality = 'critical' | 'normal';
export type EventConfigType = 'system' | 'custom';
export type EventTypeKind = 'single' | 'dual';
export type EventAction = 'edit' | 'duplicate' | 'delete';

export interface EventRow {
  id: string;
  name: string;
  /** Slug/label into the DS EVENT_ICONS registry (e.g. "Overspeed"). */
  iconKey?: string;
  type: EventTypeKind;
  trigger: string;
  criticality: EventConfigCriticality;
  configType: EventConfigType;
  enabled: boolean;
}
export interface EventConfigurationProps {
  title?: string;
  subtitle?: string;
  events: EventRow[];
  onCreateEvent?: () => void;
  onToggleEvent?: (id: string, enabled: boolean) => void;
  onEventAction?: (event: EventRow, action: EventAction) => void;
  className?: string;
}

function Cell({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex min-w-0 flex-col gap-1">
      <span className="text-caption font-medium uppercase tracking-wide text-muted-foreground">{label}</span>
      <span className="truncate text-body-sm text-foreground">{children}</span>
    </div>
  );
}

export function EventConfiguration({
  title = 'Event Configuration',
  subtitle = 'Define the events FAMS watches for — their trigger, criticality and whether they are system or custom — and toggle each on or off.',
  events, onCreateEvent, onToggleEvent, onEventAction, className,
}: EventConfigurationProps) {
  return (
    <div className={cn('p-7', className)}>
      <div className="mb-6 flex items-start justify-between gap-4">
        <div>
          <h1 className="text-h5 font-semibold text-foreground">{title}</h1>
          <p className="mt-1 max-w-2xl text-body-sm text-muted-foreground">{subtitle}</p>
        </div>
        {onCreateEvent && (
          <Button variant="primary" onClick={onCreateEvent}><Icons.Plus size={16} className="mr-1.5" />Create New Event</Button>
        )}
      </div>

      {events.length ? (
        <div className="flex flex-col gap-2.5">
          {events.map((e) => (
            <div key={e.id} className="flex items-center gap-4 rounded-xl border border-border bg-card px-5 py-3.5">
              <div className="grid flex-1 grid-cols-2 items-center gap-x-6 gap-y-3 sm:grid-cols-5">
                <Cell label="Event ID">
                  <span className="flex items-center gap-2">
                    {e.iconKey ? <EventIcon name={e.iconKey} size={18} /> : null}
                    <span className="truncate font-semibold" title={e.name}>{e.name}</span>
                  </span>
                </Cell>
                <Cell label="Event Type">{e.type === 'dual' ? 'DUAL' : 'SINGLE'}</Cell>
                <Cell label="Trigger"><span className="font-medium text-[var(--status-success)]">{e.trigger}</span></Cell>
                <Cell label="Criticality">
                  <Badge color={e.criticality === 'critical' ? 'var(--status-error)' : 'var(--muted-foreground)'}>{e.criticality === 'critical' ? 'Critical' : 'Normal'}</Badge>
                </Cell>
                <Cell label="Config Type">
                  <Badge color={e.configType === 'system' ? 'var(--primary)' : 'var(--status-success)'}>{e.configType === 'system' ? 'SYSTEM' : 'CUSTOM'}</Badge>
                </Cell>
              </div>
              <Switch checked={e.enabled} onCheckedChange={(v) => onToggleEvent?.(e.id, v)} aria-label={`${e.enabled ? 'Disable' : 'Enable'} ${e.name}`} />
              {e.configType === 'custom' && onEventAction && <RowMenu event={e} onAction={(a) => onEventAction(e, a)} />}
            </div>
          ))}
        </div>
      ) : (
        <div className="rounded-xl border border-dashed border-border px-6 py-12 text-center text-body-sm text-muted-foreground">No events configured yet — create your first event.</div>
      )}
    </div>
  );
}

function RowMenu({ event, onAction }: { event: EventRow; onAction: (a: EventAction) => void }) {
  const [open, setOpen] = React.useState(false);
  const [confirmDelete, setConfirmDelete] = React.useState(false);
  const item = 'flex w-full items-center gap-2 rounded-md px-2.5 py-2 text-left text-body-sm text-foreground transition-colors hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring';
  return (
    <Popover open={open} onOpenChange={(o) => { setOpen(o); if (!o) setConfirmDelete(false); }}>
      <PopoverTrigger asChild>
        <button type="button" aria-label={`Actions for ${event.name}`} className="grid size-8 shrink-0 place-items-center rounded-md text-muted-foreground transition-colors hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring"><Icons.DotsVertical size={18} /></button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-44 p-1">
        <button type="button" className={item} onClick={() => { onAction('edit'); setOpen(false); }}><Icons.Edit01 size={15} className="text-muted-foreground" />Edit event</button>
        <button type="button" className={item} onClick={() => { onAction('duplicate'); setOpen(false); }}><Icons.Copy01 size={15} className="text-muted-foreground" />Duplicate</button>
        <button type="button" className={cn(item, 'text-[var(--status-error)]', confirmDelete && 'bg-destructive/10')} onClick={() => { if (confirmDelete) { onAction('delete'); setOpen(false); } else setConfirmDelete(true); }} onBlur={() => setConfirmDelete(false)}>
          <Icons.Trash01 size={15} />{confirmDelete ? 'Confirm delete' : 'Delete'}
        </button>
      </PopoverContent>
    </Popover>
  );
}
