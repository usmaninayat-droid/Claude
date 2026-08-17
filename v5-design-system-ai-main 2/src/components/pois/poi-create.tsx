import * as React from 'react';
import * as Icons from '../../icons';
import { cn } from '../utils/cn';
import { Button, Input, Popover, PopoverTrigger, PopoverContent } from '../primitives';
import { MapView } from '../map';
import type { LatLng } from '../map';

/**
 * PoiCreate — the POIs "Create New" mode (mirrors `ZoneCreate`'s map + form
 * split): click once on the map to place the pin, then fill name / type /
 * tags / description. Single-point placement uses `MapView`'s `draw` mode
 * `'point'` (completes on the very first click — no multi-vertex preview).
 */

export interface NewPoi {
  name: string;
  type: string;
  tags: string[];
  description?: string;
  position: LatLng;
}
export interface PoiCreateProps {
  /** Pin artwork, keyed by type slug (same map the consumer passes to `PoisView`). */
  icons: Record<string, string>;
  tagOptions?: string[];
  center?: LatLng;
  zoom?: number;
  onCancel: () => void;
  onCreate: (poi: NewPoi) => void;
}

const DEFAULT_TAGS = ['Client Site', 'Staff Transport', 'Welfare', 'Office', 'Accommodation'];

export function PoiCreate({
  icons, tagOptions = DEFAULT_TAGS, center = [25.18, 55.28], zoom = 11, onCancel, onCreate,
}: PoiCreateProps) {
  const typeOptions = React.useMemo(() => Object.keys(icons).filter((k) => k !== 'default'), [icons]);
  const [point, setPoint] = React.useState<LatLng | null>(null);
  const [name, setName] = React.useState('');
  const [type, setType] = React.useState<string>(typeOptions[0] ?? 'default');
  const [tags, setTags] = React.useState<string[]>([]);
  const [description, setDescription] = React.useState('');
  const [tagsOpen, setTagsOpen] = React.useState(false);
  const [typeOpen, setTypeOpen] = React.useState(false);

  const valid = !!(name.trim() && point);
  const previewMarkers = point ? [{ id: 'draft', position: point, iconUrl: icons[type] ?? icons.default, iconSize: [30, 36] as [number, number] }] : [];

  return (
    <div className="flex h-full min-h-0">
      {/* map + placement */}
      <div className="relative min-h-0 flex-1">
        <MapView
          center={point ?? center}
          zoom={point ? 14 : zoom}
          markers={previewMarkers}
          draw={{ mode: point ? null : 'point', onComplete: (pts) => setPoint(pts[0]) }}
          className="h-full w-full"
        />
        <div className="absolute left-4 top-4 z-[400] rounded-lg border border-border bg-card/95 px-3 py-2 text-body-xs text-muted-foreground shadow-sm backdrop-blur">
          {point ? 'Location set — fill the details, or redo the placement.' : 'Click the map to place the POI.'}
        </div>
        {point ? (
          <button
            type="button"
            onClick={() => setPoint(null)}
            className="absolute left-4 top-16 z-[400] inline-flex items-center gap-1.5 rounded-lg border border-border bg-card px-3 py-2 text-body-xs font-medium text-foreground shadow-sm transition-colors hover:bg-muted"
          >
            <Icons.RefreshCw02 size={13} />Redo placement
          </button>
        ) : null}
      </div>

      {/* form panel */}
      <div className="flex w-[380px] shrink-0 flex-col border-l border-border">
        <div className="flex items-center justify-between gap-2 border-b border-border px-5 py-4">
          <h2 className="text-h6 font-semibold text-foreground">Create New POI</h2>
        </div>

        <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-auto p-5">
          <label className="flex flex-col gap-1">
            <span className="text-body-xs font-medium text-muted-foreground">POI Name <span className="text-[var(--status-error)]">*</span></span>
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Enter name" />
          </label>

          <div className="flex flex-col gap-1">
            <span className="text-body-xs font-medium text-muted-foreground">Type</span>
            <Popover open={typeOpen} onOpenChange={setTypeOpen}>
              <PopoverTrigger asChild>
                <button type="button" className="flex items-center justify-between gap-2 rounded-lg border border-border bg-card px-3 py-2.5 text-left text-body-sm outline-none transition-colors hover:bg-muted/40">
                  <span className="flex items-center gap-2">
                    {icons[type] ? <img src={icons[type]} alt="" className="h-[20px] w-[17px] object-contain" /> : null}
                    <span className="capitalize text-foreground">{type.replace(/-/g, ' ')}</span>
                  </span>
                  <Icons.ChevronDown size={16} className="shrink-0 text-muted-foreground" />
                </button>
              </PopoverTrigger>
              <PopoverContent align="start" className="max-h-64 w-[--radix-popover-trigger-width] overflow-auto p-1">
                {typeOptions.map((k) => (
                  <button key={k} type="button" onClick={() => { setType(k); setTypeOpen(false); }} className="flex w-full items-center gap-2 rounded-md px-2.5 py-2 text-left text-body-sm text-foreground transition-colors hover:bg-muted">
                    <img src={icons[k]} alt="" className="h-[20px] w-[17px] object-contain" /><span className="capitalize">{k.replace(/-/g, ' ')}</span>
                  </button>
                ))}
                {!typeOptions.length && <div className="px-2.5 py-2 text-body-sm text-muted-foreground">No types available</div>}
              </PopoverContent>
            </Popover>
          </div>

          <div className="flex flex-col gap-1">
            <span className="text-body-xs font-medium text-muted-foreground">Tags</span>
            <Popover open={tagsOpen} onOpenChange={setTagsOpen}>
              <PopoverTrigger asChild>
                <button type="button" className="flex items-center justify-between gap-2 rounded-lg border border-border bg-card px-3 py-2.5 text-left text-body-sm outline-none transition-colors hover:bg-muted/40">
                  <span className={cn('flex flex-wrap gap-1', !tags.length && 'text-muted-foreground')}>
                    {tags.length ? tags.map((t) => <span key={t} className="rounded bg-primary/10 px-1.5 py-0.5 text-caption font-medium text-primary">{t}</span>) : 'Select tags'}
                  </span>
                  <Icons.ChevronDown size={16} className="shrink-0 text-muted-foreground" />
                </button>
              </PopoverTrigger>
              <PopoverContent align="start" className="w-[--radix-popover-trigger-width] p-1">
                {tagOptions.map((t) => {
                  const on = tags.includes(t);
                  return (
                    <button key={t} type="button" onClick={() => setTags((cur) => (on ? cur.filter((x) => x !== t) : [...cur, t]))} className="flex w-full items-center gap-2 rounded-md px-2.5 py-2 text-left text-body-sm text-foreground transition-colors hover:bg-muted">
                      <span className={cn('grid size-4 place-items-center rounded border', on ? 'border-primary bg-primary text-white' : 'border-border')}>{on && <Icons.Check size={11} />}</span>{t}
                    </button>
                  );
                })}
              </PopoverContent>
            </Popover>
          </div>

          <label className="flex flex-col gap-1">
            <span className="text-body-xs font-medium text-muted-foreground">Description</span>
            <Input value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Optional" />
          </label>
        </div>

        <div className="flex items-center justify-between gap-3 border-t border-border p-4">
          <Button variant="secondary" onClick={onCancel}>Cancel</Button>
          <Button
            variant="primary"
            disabled={!valid}
            onClick={() => onCreate({ name: name.trim(), type, tags, description: description.trim() || undefined, position: point! })}
          >
            Create POI
          </Button>
        </div>
      </div>
    </div>
  );
}
