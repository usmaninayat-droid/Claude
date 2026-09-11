import * as React from 'react';
import * as Icons from '../../icons';
import { cn } from '../utils/cn';
import { Button, Input, Popover, PopoverTrigger, PopoverContent } from '../primitives';
import { MapView } from '../map';
import type { LatLng, MapDrawMode } from '../map';

/**
 * ZoneCreate — the Zones "Create a new Zone" mode (Flood Management, Figma
 * 233-181044): a full-bleed map with a compact draw toolbar down the right
 * edge (polygon · rectangle · circle) and a small FLOATING form card over the
 * map's top-left — NOT a side-sheet. The user draws the real zone shape on the
 * map, then fills the card (title + colour swatch · parent · tags) and hits
 * Create Zone. Config-driven; brand FAMS blue.
 */

export interface NewZone {
  name: string;
  color: string;
  tags: string[];
  parentId?: string;
  points: LatLng[];
}
export interface ZoneCreateProps {
  parentOptions?: { id: string; name: string }[];
  tagOptions?: string[];
  colors?: string[];
  center?: LatLng;
  zoom?: number;
  onCancel: () => void;
  onCreate: (zone: NewZone) => void;
}

const DEFAULT_COLORS = ['#0072D6', '#F04438', '#12B76A', '#F79009', '#06AED4', '#3538CD', '#7A5AF8', '#2E90FA', '#EE46BC', '#F63D68', '#EAAA08', '#854D0E']; // coherence-allow — selectable zone-colour data palette
const DEFAULT_TAGS = ['Residential', 'Commercial', 'Industrial', 'Priority', 'Restricted', 'High-density'];

const TOOLS: { mode: MapDrawMode; label: string; icon: React.ReactNode }[] = [
  { mode: 'polygon', label: 'Draw polygon', icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinejoin="round"><path d="M12 3l8 6-3 10H7L4 9z" /></svg> },
  { mode: 'rectangle', label: 'Draw rectangle', icon: <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="4" y="6" width="16" height="12" rx="1" /></svg> },
  { mode: 'circle', label: 'Draw circle', icon: <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="8" /></svg> },
];

function FieldSelect({ label, value, options, placeholder, onChange }: { label: string; value?: string; options: { id: string; name: string }[]; placeholder: string; onChange: (id: string) => void }) {
  const [open, setOpen] = React.useState(false);
  const sel = options.find((o) => o.id === value);
  return (
    <label className="flex flex-col gap-1">
      <span className="text-body-xs font-medium text-muted-foreground">{label}</span>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <button type="button" className="flex items-center justify-between gap-2 rounded-lg border border-border bg-card px-3 py-2.5 text-left text-body-sm outline-none transition-colors hover:bg-muted/40">
            <span className={cn('truncate', sel ? 'text-foreground' : 'text-muted-foreground')}>{sel?.name ?? placeholder}</span>
            <Icons.ChevronDown size={16} className="shrink-0 text-muted-foreground" />
          </button>
        </PopoverTrigger>
        <PopoverContent align="start" className="max-h-64 w-[--radix-popover-trigger-width] overflow-auto p-1">
          {options.map((o) => <button key={o.id} type="button" onClick={() => { onChange(o.id); setOpen(false); }} className="flex w-full rounded-md px-2.5 py-2 text-left text-body-sm text-foreground transition-colors hover:bg-muted">{o.name}</button>)}
          {!options.length && <div className="px-2.5 py-2 text-body-sm text-muted-foreground">None</div>}
        </PopoverContent>
      </Popover>
    </label>
  );
}

export function ZoneCreate({
  parentOptions = [], tagOptions = DEFAULT_TAGS, colors = DEFAULT_COLORS,
  center = [25.18, 55.28], zoom = 12, onCancel, onCreate,
}: ZoneCreateProps) {
  const [mode, setMode] = React.useState<MapDrawMode | null>('polygon');
  const [points, setPoints] = React.useState<LatLng[]>([]);
  const [name, setName] = React.useState('');
  const [color, setColor] = React.useState(colors[3] ?? colors[0]);
  const [colorOpen, setColorOpen] = React.useState(false);
  const [parentId, setParentId] = React.useState<string>();
  const [tags, setTags] = React.useState<string[]>([]);
  const [tagsOpen, setTagsOpen] = React.useState(false);

  const drawnZones = points.length >= 3 ? [{ id: 'draft', points, color, fillOpacity: 0.18 }] : [];
  const valid = name.trim() && points.length >= 3;

  return (
    <div className="relative flex h-full min-h-0">
      {/* full-bleed map + draw capability */}
      <MapView
        center={center}
        zoom={zoom}
        zones={drawnZones}
        draw={{ mode, color, onComplete: (pts) => { setPoints(pts); setMode(null); } }}
        className="h-full w-full"
      />

      {/* right-edge draw toolbar (Figma 233-181044) */}
      <div className="absolute right-4 top-4 z-[400] flex flex-col gap-1.5">
        <div className="flex flex-col gap-1 rounded-lg border border-border bg-card p-1 shadow-sm">
          {TOOLS.map((t) => (
            <button key={t.mode} type="button" aria-label={t.label} title={t.label} aria-pressed={mode === t.mode}
              onClick={() => { setMode(t.mode); setPoints([]); }}
              className={cn('grid size-9 place-items-center rounded-md transition-colors', mode === t.mode ? 'bg-primary text-primary-foreground' : 'text-foreground hover:bg-muted')}>
              {t.icon}
            </button>
          ))}
          {points.length >= 3 && (
            <button type="button" aria-label="Clear drawing" title="Clear" onClick={() => { setPoints([]); setMode('polygon'); }} className="grid size-9 place-items-center rounded-md text-[var(--status-error)] transition-colors hover:bg-muted"><Icons.Trash01 size={16} /></button>
          )}
        </div>
      </div>

      {/* floating "Create a new Zone" card */}
      <div className="absolute left-4 top-4 z-[400] w-[360px] max-w-[calc(100%-2rem)] rounded-xl border border-border bg-card p-5 shadow-[0_12px_32px_0_rgba(16,24,40,0.16)]">
        <div className="mb-4 flex items-center justify-between gap-2">
          <h2 className="text-h6 font-semibold text-foreground">Create a new Zone</h2>
          <button type="button" aria-label="Close" onClick={onCancel} className="grid size-6 place-items-center rounded-md text-[var(--status-error)] transition-colors hover:bg-muted">
            <Icons.XClose size={18} />
          </button>
        </div>

        <div className="flex flex-col gap-3">
          {/* Title + colour swatch */}
          <div className="flex items-end gap-2.5">
            <label className="flex min-w-0 flex-1 flex-col gap-1">
              <span className="text-body-xs font-medium text-muted-foreground">Title <span className="text-[var(--status-error)]">*</span></span>
              <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Z-12445" />
            </label>
            <Popover open={colorOpen} onOpenChange={setColorOpen}>
              <PopoverTrigger asChild>
                <button type="button" aria-label="Zone colour" className="size-[42px] shrink-0 rounded-lg border border-border transition-transform hover:scale-105" style={{ background: color }} />
              </PopoverTrigger>
              <PopoverContent align="end" className="w-auto p-2">
                <div className="grid grid-cols-6 gap-2">
                  {colors.map((c) => (
                    <button key={c} type="button" aria-label={`Colour ${c}`} onClick={() => { setColor(c); setColorOpen(false); }} className={cn('grid size-7 place-items-center rounded-md transition-transform', color === c && 'ring-2 ring-primary ring-offset-1')} style={{ background: c }}>
                      {color === c && <Icons.Check size={14} className="text-white" />}
                    </button>
                  ))}
                </div>
              </PopoverContent>
            </Popover>
          </div>

          {/* Parent */}
          <FieldSelect label="Parent" value={parentId} options={parentOptions} placeholder="Select parent" onChange={setParentId} />

          {/* Tags */}
          <Popover open={tagsOpen} onOpenChange={setTagsOpen}>
            <PopoverTrigger asChild>
              <button type="button" className="flex items-center gap-2 rounded-lg border border-border bg-card px-3 py-2.5 text-left text-body-sm outline-none transition-colors hover:bg-muted/40">
                <Icons.Tag01 size={16} className="shrink-0 text-muted-foreground" />
                <span className={cn('flex flex-1 flex-wrap gap-1', !tags.length && 'text-muted-foreground')}>
                  {tags.length ? tags.map((t) => <span key={t} className="rounded bg-primary/10 px-1.5 py-0.5 text-caption font-medium text-primary">{t}</span>) : 'Tags'}
                </span>
              </button>
            </PopoverTrigger>
            <PopoverContent align="start" className="w-[--radix-popover-trigger-width] p-1">
              {tagOptions.map((t) => {
                const on = tags.includes(t);
                return (
                  <button key={t} type="button" onClick={() => setTags((cur) => on ? cur.filter((x) => x !== t) : [...cur, t])} className="flex w-full items-center gap-2 rounded-md px-2.5 py-2 text-left text-body-sm text-foreground transition-colors hover:bg-muted">
                    <span className={cn('grid size-4 place-items-center rounded border', on ? 'border-primary bg-primary text-white' : 'border-border')}>{on && <Icons.Check size={11} />}</span>{t}
                  </button>
                );
              })}
            </PopoverContent>
          </Popover>

          {/* Draw hint — only until a shape exists */}
          {points.length < 3 ? (
            <p className="text-body-xs text-muted-foreground">
              {mode === 'polygon' ? 'Draw the zone on the map: click to add points, click the first point (or double-click) to finish.'
                : mode === 'rectangle' ? 'Draw the zone: click two opposite corners on the map.'
                  : mode === 'circle' ? 'Draw the zone: click the centre, then the edge.'
                    : 'Pick a draw tool (right) to outline the zone on the map.'}
            </p>
          ) : null}

          <Button variant="primary" disabled={!valid} onClick={() => onCreate({ name: name.trim(), color, tags, parentId, points })} className="mt-1 w-full justify-center">
            Create Zone
          </Button>
        </div>
      </div>
    </div>
  );
}
