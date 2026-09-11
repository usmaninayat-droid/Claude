import * as React from 'react';
import * as Icons from '../../icons';
import { cn } from '../utils/cn';
import { Button, Input, Popover, PopoverTrigger, PopoverContent } from '../primitives';
import { MapView } from '../map';
import type { LatLng, MapDrawMode } from '../map';

/**
 * ZoneCreate — the Zones "Create New Zone" mode (FAMS V5 Launch Pad, Figma
 * 2615-22876): a full-screen map with draw tools (polygon · rectangle · circle)
 * beside a right form panel (name · parent · colour · tags). The user draws the
 * real zone shape on the map (via the DS MapView `draw` capability) — no floating
 * squares — then fills the form and creates. Config-driven; brand FAMS blue.
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
  { mode: 'polygon', label: 'Draw polygon', icon: <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinejoin="round"><path d="M12 3l8 6-3 10H7L4 9z" /></svg> },
  { mode: 'rectangle', label: 'Draw rectangle', icon: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="4" y="6" width="16" height="12" rx="1" /></svg> },
  { mode: 'circle', label: 'Draw circle', icon: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="8" /></svg> },
];

function FieldSelect({ label, required, value, options, placeholder, onChange }: { label: string; required?: boolean; value?: string; options: { id: string; name: string }[]; placeholder: string; onChange: (id: string) => void }) {
  const [open, setOpen] = React.useState(false);
  const sel = options.find((o) => o.id === value);
  return (
    <label className="flex flex-col gap-1">
      <span className="text-body-xs font-medium text-muted-foreground">{label}{required && <span className="text-[var(--status-error)]"> *</span>}</span>
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
  const [color, setColor] = React.useState(colors[0]);
  const [parentId, setParentId] = React.useState<string>();
  const [tags, setTags] = React.useState<string[]>([]);
  const [tagsOpen, setTagsOpen] = React.useState(false);

  const drawnZones = points.length >= 3 ? [{ id: 'draft', points, color, fillOpacity: 0.18 }] : [];
  const valid = name.trim() && points.length >= 3;

  /**
   * T-065 finding 3 — the host app's Toaster is a single global instance
   * (mounted once at the app root, position set by the product) that this
   * DS component can't reposition or intercept: a toast fired from the
   * consumer's `onCreateZone`/`onCreate` handlers renders wherever that
   * Toaster is anchored, which for a bottom-right app lands squarely on top
   * of this panel's Cancel/Create row. Rather than reach into app-level
   * config, this surface makes itself toast-aware: it watches the DOM for a
   * live `[data-sonner-toast]` node and reserves clearance BELOW the action
   * row (pushing Cancel/Create up, clear of the toast's footprint) only
   * while one is actually on screen — zero layout change the rest of the
   * time. ~120px covers a single title+description toast at sonner's
   * default 32px viewport offset (measured).
   */
  const [toastClearance, setToastClearance] = React.useState(false);
  React.useEffect(() => {
    const check = () => setToastClearance(Boolean(document.querySelector('[data-sonner-toast]')));
    check();
    const observer = new MutationObserver(check);
    observer.observe(document.body, { childList: true, subtree: true });
    return () => observer.disconnect();
  }, []);

  return (
    <div className="flex h-full min-h-0">
      {/* map + draw tools */}
      <div className="relative min-h-0 flex-1">
        <MapView
          center={center}
          zoom={zoom}
          zones={drawnZones}
          draw={{ mode, color, onComplete: (pts) => { setPoints(pts); setMode(null); } }}
          className="h-full w-full"
        />
        {/* draw toolbar */}
        <div className="absolute left-4 top-4 z-[400] flex flex-col gap-1 rounded-lg border border-border bg-card p-1 shadow-sm">
          {TOOLS.map((t) => (
            <button key={t.mode} type="button" aria-label={t.label} title={t.label} aria-pressed={mode === t.mode}
              onClick={() => { setMode(t.mode); setPoints([]); }}
              className={cn('grid size-9 place-items-center rounded-md transition-colors', mode === t.mode ? 'bg-primary text-primary-foreground' : 'text-foreground hover:bg-muted')}>
              {t.icon}
            </button>
          ))}
          {points.length >= 3 && (
            <button type="button" aria-label="Clear drawing" title="Clear" onClick={() => { setPoints([]); setMode('polygon'); }} className="grid size-9 place-items-center rounded-md text-[var(--status-error)] transition-colors hover:bg-muted"><Icons.Trash01 size={15} /></button>
          )}
        </div>
        {/* hint */}
        <div className="absolute left-16 top-4 z-[400] rounded-lg border border-border bg-card/95 px-3 py-2 text-body-xs text-muted-foreground shadow-sm backdrop-blur">
          {mode === 'polygon' ? 'Click to add points; click the first point (or double-click) to finish.'
            : mode === 'rectangle' ? 'Click two opposite corners.'
              : mode === 'circle' ? 'Click the centre, then click the edge.'
                : points.length >= 3 ? 'Zone drawn — fill the details, or pick a tool to redraw.' : 'Pick a draw tool to start.'}
        </div>
      </div>

      {/* form panel */}
      <div className="flex w-[380px] shrink-0 flex-col border-l border-border">
        <div className="flex items-center justify-between gap-2 border-b border-border px-5 py-4">
          <h2 className="text-h6 font-semibold text-foreground">Create New Zone</h2>
        </div>

        <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-auto p-5">
          <label className="flex flex-col gap-1">
            <span className="text-body-xs font-medium text-muted-foreground">Zone Name <span className="text-[var(--status-error)]">*</span></span>
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Enter name" />
          </label>

          <FieldSelect label="Parent Zone" value={parentId} options={parentOptions} placeholder="Select zone" onChange={setParentId} />

          <div className="flex flex-col gap-1.5">
            <span className="text-body-xs font-medium text-muted-foreground">Zone Color <span className="text-[var(--status-error)]">*</span></span>
            <div className="flex flex-wrap items-center gap-2">
              {colors.map((c) => (
                <button key={c} type="button" aria-label={`Colour ${c}`} onClick={() => setColor(c)} className={cn('grid size-7 place-items-center rounded-md transition-transform', color === c && 'ring-2 ring-primary ring-offset-1')} style={{ background: c }}>
                  {color === c && <Icons.Check size={14} className="text-white" />}
                </button>
              ))}
            </div>
          </div>

          <div className="flex flex-col gap-1">
            <span className="text-body-xs font-medium text-muted-foreground">Tags <span className="text-[var(--status-error)]">*</span></span>
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
                    <button key={t} type="button" onClick={() => setTags((cur) => on ? cur.filter((x) => x !== t) : [...cur, t])} className="flex w-full items-center gap-2 rounded-md px-2.5 py-2 text-left text-body-sm text-foreground transition-colors hover:bg-muted">
                      <span className={cn('grid size-4 place-items-center rounded border', on ? 'border-primary bg-primary text-white' : 'border-border')}>{on && <Icons.Check size={11} />}</span>{t}
                    </button>
                  );
                })}
              </PopoverContent>
            </Popover>
          </div>
        </div>

        <div className="flex shrink-0 flex-col border-t border-border">
          <div className="flex items-center justify-between gap-3 p-4">
            <Button variant="secondary" onClick={onCancel}>Cancel</Button>
            <Button variant="primary" disabled={!valid} onClick={() => onCreate({ name: name.trim(), color, tags, parentId, points })}>Create Zone</Button>
          </div>
          {/* Toast-safe reserve — see `toastClearance` above. Empty/decorative,
              so no aria role; height-only so the border/background above never move. */}
          <div aria-hidden className="transition-[height] duration-300 ease-out" style={{ height: toastClearance ? 120 : 0 }} />
        </div>
      </div>
    </div>
  );
}
