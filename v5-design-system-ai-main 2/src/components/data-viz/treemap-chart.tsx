import * as React from 'react';
import { cn } from '../utils/cn';
import { CHART_SERIES_DEFAULT } from './chart-tokens';

/**
 * TreemapChart — proportional nested rectangles (hierarchical / part-to-whole).
 * Squarified layout keeps tiles near-square for readability. Each tile shows its
 * label + value as text (a11y: not area-alone). Token-only, responsive viewBox.
 */

export interface TreemapDatum { label: string; value: number; color?: string }
export interface TreemapChartProps {
  data: TreemapDatum[];
  colors?: string[];
  className?: string;
}

interface Rect { x: number; y: number; w: number; h: number; i: number }

const W = 320, H = 200;

function worst(row: number[], side: number): number {
  const s = row.reduce((a, b) => a + b, 0);
  const max = Math.max(...row), min = Math.min(...row);
  return Math.max((side * side * max) / (s * s), (s * s) / (side * side * min));
}

function squarify(areas: { a: number; i: number }[]): Rect[] {
  const out: Rect[] = [];
  let x = 0, y = 0, w = W, h = H;
  let idx = 0;
  while (idx < areas.length) {
    const side = Math.min(w, h);
    let row = [areas[idx]];
    let best = worst(row.map((r) => r.a), side);
    let j = idx + 1;
    while (j < areas.length) {
      const test = [...row, areas[j]];
      const wst = worst(test.map((r) => r.a), side);
      if (wst > best) break;
      row = test; best = wst; j++;
    }
    const rowSum = row.reduce((s, r) => s + r.a, 0);
    if (w <= h) {
      const rh = rowSum / w; let rx = x;
      for (const r of row) { const rw = r.a / rh; out.push({ x: rx, y, w: rw, h: rh, i: r.i }); rx += rw; }
      y += rh; h -= rh;
    } else {
      const rw = rowSum / h; let ry = y;
      for (const r of row) { const rh2 = r.a / rw; out.push({ x, y: ry, w: rw, h: rh2, i: r.i }); ry += rh2; }
      x += rw; w -= rw;
    }
    idx = j;
  }
  return out;
}

export function TreemapChart({ data, colors = CHART_SERIES_DEFAULT, className }: TreemapChartProps) {
  if (!data.length) return <div className="grid h-full min-h-24 place-items-center text-body-sm text-muted-foreground">No data</div>;
  const sorted = data.map((d, i) => ({ d, i })).sort((a, b) => b.d.value - a.d.value);
  const total = sorted.reduce((s, r) => s + r.d.value, 0) || 1;
  const areas = sorted.map((r) => ({ a: (r.d.value / total) * (W * H), i: r.i }));
  const rects = squarify(areas);

  return (
    <svg viewBox={`0 0 ${W} ${H}`} width="100%" role="img" aria-label="Treemap" className="block" preserveAspectRatio="none">
      {rects.map((r) => {
        const d = data[r.i];
        const color = d.color ?? colors[r.i % colors.length];
        const showText = r.w > 46 && r.h > 26;
        return (
          <g key={r.i}>
            <rect x={r.x + 1} y={r.y + 1} width={Math.max(0, r.w - 2)} height={Math.max(0, r.h - 2)} rx={4} fill={color}>
              <title>{d.label}: {d.value.toLocaleString()}</title>
            </rect>
            {showText ? (
              <>
                <text x={r.x + 8} y={r.y + 18} fontSize={11} fontWeight={600} fill="var(--primary-foreground)">
                  {d.label.length > r.w / 7 ? d.label.slice(0, Math.floor(r.w / 7)) + '…' : d.label}
                </text>
                <text x={r.x + 8} y={r.y + 33} fontSize={11} fill="var(--primary-foreground)" opacity={0.85}>
                  {d.value.toLocaleString()}
                </text>
              </>
            ) : null}
          </g>
        );
      })}
    </svg>
  );
}
