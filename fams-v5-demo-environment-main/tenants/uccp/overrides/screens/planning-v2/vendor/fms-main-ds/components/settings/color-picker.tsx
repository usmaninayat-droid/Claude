import * as React from 'react';
import * as Icons from '../../icons';
import { cn } from '../utils/cn';
import { Popover, PopoverTrigger, PopoverContent, Input } from '../primitives';

/**
 * ColorPicker — the DS colour control (FAMS Settings, Figma 2-8344 / 2-8363).
 * A swatch button opens a popover: a preset swatch grid + a "+" that expands to a
 * custom picker (saturation/value box · hue slider · hex input). Fully data-driven
 * — the palette is passed in (`swatches`); nothing domain-specific is hardcoded.
 * Colour VALUES are data, not chrome, so the default palette carries a reason.
 */

const DEFAULT_SWATCHES = ['#101828', '#E0A93B', '#9BBB3C', '#2FA3A3', '#4A6091', '#EE9A1F', '#B94A3F', '#4FBE6E', '#12B0F0', '#B07EA0', '#9B4FD0']; // coherence-allow — selectable colour-DATA palette

// A colour picker's own gradient stops + safe fallbacks are FUNCTIONAL values, not theme chrome.
const FALLBACK_HEX = '#000000'; // coherence-allow — invalid-input fallback
const SV_SHADE = '#000'; // coherence-allow — value gradient (→ black)
const SV_TINT = '#fff'; // coherence-allow — saturation gradient (→ white)
const HUE_GRADIENT = 'linear-gradient(to right,#f00,#ff0,#0f0,#0ff,#00f,#f0f,#f00)'; // coherence-allow — hue spectrum

export interface ColorPickerProps {
  value: string;
  onChange: (hex: string) => void;
  swatches?: string[];
  /** Size of the trigger swatch (px). Default 40. */
  size?: number;
  className?: string;
}

/* ── colour maths (hex ⇄ hsv) ───────────────────────────────────────────── */
function clamp(n: number, lo: number, hi: number) { return Math.min(hi, Math.max(lo, n)); }
function hexToRgb(hex: string): [number, number, number] {
  const h = hex.replace('#', '');
  const v = h.length === 3 ? h.split('').map((c) => c + c).join('') : h.padEnd(6, '0').slice(0, 6);
  return [parseInt(v.slice(0, 2), 16), parseInt(v.slice(2, 4), 16), parseInt(v.slice(4, 6), 16)];
}
function rgbToHex(r: number, g: number, b: number) {
  return '#' + [r, g, b].map((n) => clamp(Math.round(n), 0, 255).toString(16).padStart(2, '0')).join('').toUpperCase();
}
function rgbToHsv(r: number, g: number, b: number): [number, number, number] {
  r /= 255; g /= 255; b /= 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b), d = max - min;
  let h = 0;
  if (d) {
    if (max === r) h = ((g - b) / d) % 6;
    else if (max === g) h = (b - r) / d + 2;
    else h = (r - g) / d + 4;
    h *= 60; if (h < 0) h += 360;
  }
  return [h, max === 0 ? 0 : d / max, max];
}
function hsvToHex(h: number, s: number, v: number) {
  const c = v * s, x = c * (1 - Math.abs(((h / 60) % 2) - 1)), m = v - c;
  const [r, g, b] = h < 60 ? [c, x, 0] : h < 120 ? [x, c, 0] : h < 180 ? [0, c, x]
    : h < 240 ? [0, x, c] : h < 300 ? [x, 0, c] : [c, 0, x];
  return rgbToHex((r + m) * 255, (g + m) * 255, (b + m) * 255);
}
const isHex = (s: string) => /^#?([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/.test(s.trim());

export function ColorPicker({ value, onChange, swatches = DEFAULT_SWATCHES, size = 40, className }: ColorPickerProps) {
  const [open, setOpen] = React.useState(false);
  const [custom, setCustom] = React.useState(false);
  const [hex, setHex] = React.useState(value);
  const svRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => { setHex(value); }, [value]);
  const [h, s, v] = React.useMemo(() => { const [r, g, b] = hexToRgb(isHex(value) ? value : FALLBACK_HEX); return rgbToHsv(r, g, b); }, [value]);

  const setFromSv = (clientX: number, clientY: number) => {
    const box = svRef.current?.getBoundingClientRect(); if (!box) return;
    const ns = clamp((clientX - box.left) / box.width, 0, 1);
    const nv = 1 - clamp((clientY - box.top) / box.height, 0, 1);
    onChange(hsvToHex(h, ns, nv));
  };
  const onSvPointerDown = (e: React.PointerEvent) => {
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
    setFromSv(e.clientX, e.clientY);
  };
  const onSvPointerMove = (e: React.PointerEvent) => {
    if (e.buttons !== 1) return;
    setFromSv(e.clientX, e.clientY);
  };

  return (
    <Popover open={open} onOpenChange={(o) => { setOpen(o); if (!o) setCustom(false); }}>
      <PopoverTrigger asChild>
        <button
          type="button"
          aria-label="Pick colour"
          className={cn('shrink-0 rounded-lg border border-border focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2', className)}
          style={{ width: size, height: size, background: isHex(value) ? value : FALLBACK_HEX }}
        />
      </PopoverTrigger>
      <PopoverContent align="end" className="w-[300px] p-4">
        {!custom ? (
          <>
            <div className="mb-3 text-body-sm font-semibold text-foreground">Select your color</div>
            <div className="grid grid-cols-7 gap-2">
              {swatches.map((c) => (
                <button
                  key={c}
                  type="button"
                  aria-label={c}
                  onClick={() => { onChange(c); setOpen(false); }}
                  className={cn('grid size-8 place-items-center rounded-md border border-border/60 transition-transform hover:scale-105 focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2', value.toUpperCase() === c.toUpperCase() && 'ring-2 ring-primary ring-offset-1')}
                  style={{ background: c }}
                >
                  {value.toUpperCase() === c.toUpperCase() && <Icons.Check size={14} className="text-white" />}
                </button>
              ))}
              <button
                type="button"
                aria-label="Custom colour"
                onClick={() => setCustom(true)}
                className="grid size-8 place-items-center rounded-md border border-dashed border-border text-muted-foreground transition-colors hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              >
                <Icons.Plus size={16} />
              </button>
            </div>
          </>
        ) : (
          <div className="flex flex-col gap-3">
            <button type="button" onClick={() => setCustom(false)} className="inline-flex w-fit items-center gap-1 text-body-xs font-medium text-muted-foreground hover:text-foreground">
              <Icons.ChevronLeft size={14} /> Swatches
            </button>
            {/* saturation / value box */}
            <div
              ref={svRef}
              onPointerDown={onSvPointerDown}
              onPointerMove={onSvPointerMove}
              className="relative h-40 w-full cursor-crosshair rounded-lg"
              style={{ background: `linear-gradient(to top, ${SV_SHADE}, transparent), linear-gradient(to right, ${SV_TINT}, ${hsvToHex(h, 1, 1)})` }}
            >
              <span
                className="pointer-events-none absolute size-3 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white shadow"
                style={{ left: `${s * 100}%`, top: `${(1 - v) * 100}%`, background: isHex(value) ? value : SV_SHADE }}
              />
            </div>
            {/* hue slider */}
            <input
              type="range" min={0} max={360} value={Math.round(h)}
              aria-label="Hue"
              onChange={(e) => onChange(hsvToHex(Number(e.target.value), s || 1, v || 1))}
              className="h-3 w-full cursor-pointer appearance-none rounded-full focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              style={{ background: HUE_GRADIENT }}
            />
            {/* hex input */}
            <div className="flex items-center gap-2 rounded-lg border border-border px-3 py-2">
              <span className="size-5 shrink-0 rounded" style={{ background: isHex(hex) ? (hex.startsWith('#') ? hex : `#${hex}`) : SV_SHADE }} />
              <div className="flex flex-col">
                <span className="text-caption font-medium text-muted-foreground">Enter hex code</span>
                <Input
                  value={hex}
                  onChange={(e) => { setHex(e.target.value); if (isHex(e.target.value)) onChange(e.target.value.startsWith('#') ? e.target.value : `#${e.target.value}`); }}
                  className="h-5 border-0 p-0 text-body-sm font-semibold shadow-none focus-visible:ring-2 focus-visible:ring-ring"
                />
              </div>
            </div>
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
}
