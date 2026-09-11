import * as React from 'react';
import * as Icons from '../../icons';
import { cn } from '../utils/cn';
import { Sheet, SheetContent, SheetTitle, Popover, PopoverTrigger, PopoverContent } from '../primitives';
import { LeafletMap } from '../map';
import type { LatLng } from '../map';
import { LineChart } from '../data-viz';
import { ActivityFeed } from '../widgets';
import type { FeedEntry } from '../widgets';
import type { EventItem } from './events-view';

/**
 * EventDetailSheet — the Events "View Details" side sheet (Figma
 * W2z46FvC6aOdzOHDc3rqD5 · 4354-14570). A wide right sheet: header (id · Event ·
 * status + Change Status), field grid, a route map (with play) and a Speed-Over-
 * Time chart in the main column, and a right-rail Timeline (DS `ActivityFeed`)
 * with a comment composer. Config-driven from the shared `EventItem`.
 */

export interface EventDetailSheetProps {
  open: boolean;
  event: EventItem | null;
  /** route polyline for the detail map (falls back to a point at the event). */
  route?: LatLng[];
  timeline?: FeedEntry[];
  statusOptions?: string[];
  onStatusChange?: (status: string) => void;
  onComment?: (text: string) => void;
  onOpenChange: (open: boolean) => void;
}

const CRIT = { critical: 'var(--status-error)', warning: 'var(--status-warning)', info: 'var(--primary)' } as const;

export function EventDetailSheet({
  open, event, route, timeline = [], statusOptions = ['Open', 'Under Inspection', 'Closed'],
  onStatusChange, onComment, onOpenChange,
}: EventDetailSheetProps) {
  if (!event) return null;
  const e = event;
  const pos = e.position;
  const routePts = route ?? [pos];

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" width="min(1080px, 96vw)" className="p-0" hideClose>
        <SheetTitle className="sr-only">{e.title} — event detail</SheetTitle>
        <div className="flex h-full min-h-0">
          {/* main column */}
          <div className="flex min-h-0 flex-1 flex-col overflow-auto">
            <div className="flex items-center gap-2 border-b border-border px-6 py-4">
              <span className="inline-flex items-center gap-1 rounded-md border border-border px-2 py-0.5 text-body-xs font-semibold text-muted-foreground"><Icons.Hash01 size={12} />{e.id}</span>
              <span className="inline-flex items-center gap-1 rounded-md border border-border px-2 py-0.5 text-body-xs font-medium text-muted-foreground"><Icons.Flag01 size={12} />Event</span>
              <div className="ml-auto flex items-center gap-2">
                <span className="inline-flex items-center rounded-md px-2 py-1 text-caption font-bold" style={{ background: `color-mix(in srgb, ${e.statusTone ?? 'var(--chart-accent-purple)'} 14%, transparent)`, color: e.statusTone ?? 'var(--chart-accent-purple)' }}>{e.status}</span>
                <Popover>
                  <PopoverTrigger asChild>
                    <button type="button" className="inline-flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-body-sm font-medium text-foreground transition-colors hover:bg-muted"><Icons.RefreshCcw01 size={14} />Change Status<Icons.ChevronDown size={14} className="text-muted-foreground" /></button>
                  </PopoverTrigger>
                  <PopoverContent align="end" className="w-48 p-1">
                    {statusOptions.map((s) => <button key={s} type="button" onClick={() => onStatusChange?.(s)} className="flex w-full rounded-md px-2.5 py-2 text-left text-body-sm text-foreground transition-colors hover:bg-muted">{s}</button>)}
                  </PopoverContent>
                </Popover>
                <button type="button" aria-label="Close" onClick={() => onOpenChange(false)} className="grid size-8 place-items-center rounded-lg text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"><Icons.XClose size={16} /></button>
              </div>
            </div>

            <div className="flex flex-col gap-5 p-6">
              <div>
                <h2 className="flex items-baseline gap-2 text-h5 font-semibold text-foreground">{e.title}<span className="text-body-sm font-normal text-muted-foreground">{e.subtitle}</span></h2>
              </div>

              {/* field grid */}
              <div className="grid grid-cols-1 gap-x-10 gap-y-3 md:grid-cols-2">
                <Field label="Criticality" value={<span className="inline-flex items-center gap-1 font-semibold" style={{ color: CRIT[e.criticality] }}><Icons.Flag01 size={13} />{e.criticality[0].toUpperCase() + e.criticality.slice(1)}</span>} />
                {e.details.map((d) => <Field key={d.label} label={d.label} value={d.value} />)}
                <Field label="Zone" value={<span className="inline-flex items-center gap-1.5"><Icons.Flag01 size={13} className="text-muted-foreground" />{e.zone}</span>} />
                <Field label="Location" value={e.location} />
                <Field label="Vehicle" value={<span className="inline-flex items-center gap-1.5"><Icons.Truck01 size={14} className="text-muted-foreground" />{e.vehicle}</span>} />
                <Field label="Driver" value={<span className="inline-flex items-center gap-1.5"><Icons.User01 size={14} className="text-muted-foreground" />{e.person}</span>} />
              </div>

              {/* route map */}
              <div className="relative h-[300px] overflow-hidden rounded-xl border border-border">
                <LeafletMap center={pos} zoom={12} zoomControl routes={routePts.length > 1 ? [{ id: 'route', points: routePts, color: 'var(--status-success)' }] : []} markers={[{ id: 'ev', position: pos, kind: 'vehicle', status: 'critical' }]} className="h-full w-full" />
              </div>

              {/* speed chart */}
              {e.speedSeries && (
                <div className="rounded-xl border border-border p-4">
                  <div className="mb-2 flex items-center gap-2 text-body font-semibold text-foreground"><Icons.TrendUp01 size={16} className="text-primary" />Speed Over Time</div>
                  <LineChart data={e.speedSeries} xKey="t" height={220} showLegend series={[{ dataKey: 'speed', name: 'Speed', color: 'var(--primary)' }]} />
                </div>
              )}
            </div>
          </div>

          {/* timeline rail */}
          <div className="flex w-[360px] shrink-0 flex-col border-l border-border">
            <div className="border-b border-border px-4 py-3"><span className="text-body font-semibold text-foreground">Timeline</span></div>
            <div className="min-h-0 flex-1 p-3">
              <ActivityFeed entries={timeline} onSubmit={(t) => onComment?.(t)} placeholder="Write comment here" className="h-full" />
            </div>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}

function Field({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-0.5">
      <span className="text-body-xs text-muted-foreground">{label}</span>
      <span className="text-body-sm font-medium text-foreground">{value}</span>
    </div>
  );
}
