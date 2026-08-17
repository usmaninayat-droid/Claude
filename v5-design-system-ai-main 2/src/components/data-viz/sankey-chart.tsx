import * as React from 'react';
import { cn } from '../utils/cn';
import { CHART_SERIES_DEFAULT } from './chart-tokens';

/**
 * SankeyChart — two-layer flow diagram (source → target ribbons, width ∝ value).
 * Covers the common dashboard flow case (stage → outcome, stream → destination).
 * Nodes labelled with name + total; ribbons carry a `<title>` (a11y). Ribbon
 * colour inherits its source (categorical tokens). Token-only, responsive viewBox.
 */

export interface SankeyLink { source: string; target: string; value: number }
export interface SankeyChartProps {
  links: SankeyLink[];
  colors?: string[];
  className?: string;
}

const W = 520, H = 300, NODE_W = 12, GAP = 14;

const uniq = (xs: string[]) => xs.filter((x, i) => xs.indexOf(x) === i);

export function SankeyChart({ links, colors = CHART_SERIES_DEFAULT, className }: SankeyChartProps) {
  const layout = React.useMemo(() => {
    if (!links.length) return null;
    const sources = uniq(links.map((l) => l.source));
    const targets = uniq(links.map((l) => l.target));
    const total = links.reduce((s, l) => s + l.value, 0) || 1;
    const nMax = Math.max(sources.length, targets.length);
    const scale = (H - (nMax - 1) * GAP) / total;
    const sum = (pred: (l: SankeyLink) => boolean) => links.filter(pred).reduce((s, l) => s + l.value, 0);

    const place = (names: string[], valOf: (n: string) => number, x: number) => {
      const colH = names.reduce((s, n) => s + valOf(n) * scale, 0) + (names.length - 1) * GAP;
      let y = (H - colH) / 2;
      const map = new Map<string, { x: number; y: number; h: number; cursor: number }>();
      for (const n of names) { const h = valOf(n) * scale; map.set(n, { x, y, h, cursor: y }); y += h + GAP; }
      return map;
    };
    const left = place(sources, (n) => sum((l) => l.source === n), 0);
    const right = place(targets, (n) => sum((l) => l.target === n), W - NODE_W);

    // Order links to reduce crossing: by target index within each source.
    const ordered = [...links].sort((a, b) =>
      sources.indexOf(a.source) - sources.indexOf(b.source) || targets.indexOf(a.target) - targets.indexOf(b.target));

    const ribbons = ordered.map((l) => {
      const s = left.get(l.source)!, t = right.get(l.target)!;
      const th = l.value * scale;
      const sy = s.cursor; s.cursor += th;
      const ty = t.cursor; t.cursor += th;
      const x0 = NODE_W, x1 = W - NODE_W, xm = (x0 + x1) / 2;
      const path =
        `M${x0},${sy} C${xm},${sy} ${xm},${ty} ${x1},${ty} ` +
        `L${x1},${ty + th} C${xm},${ty + th} ${xm},${sy + th} ${x0},${sy + th} Z`;
      return { path, color: colors[sources.indexOf(l.source) % colors.length], link: l };
    });

    return { sources, targets, left, right, ribbons, valSource: (n: string) => sum((l) => l.source === n), valTarget: (n: string) => sum((l) => l.target === n) };
  }, [links, colors]);

  if (!layout) return <div className="grid h-full min-h-24 place-items-center text-body-sm text-muted-foreground">No data</div>;

  return (
    <svg viewBox={`0 0 ${W} ${H}`} width="100%" role="img" aria-label="Flow diagram" className="block">
      {layout.ribbons.map((r, i) => (
        <path key={i} d={r.path} fill={r.color} opacity={0.35}>
          <title>{r.link.source} → {r.link.target}: {r.link.value.toLocaleString()}</title>
        </path>
      ))}
      {layout.sources.map((n) => {
        const node = layout.left.get(n)!;
        return (
          <g key={`s-${n}`}>
            <rect x={node.x} y={node.y} width={NODE_W} height={node.h} rx={2} fill={CHART_SERIES_DEFAULT[layout.sources.indexOf(n) % CHART_SERIES_DEFAULT.length]} />
            <text x={node.x + NODE_W + 6} y={node.y + node.h / 2 - 2} fontSize={11} fontWeight={600} fill="var(--foreground)" dominantBaseline="middle">{n}</text>
            <text x={node.x + NODE_W + 6} y={node.y + node.h / 2 + 11} fontSize={10} fill="var(--muted-foreground)" dominantBaseline="middle">{layout.valSource(n).toLocaleString()}</text>
          </g>
        );
      })}
      {layout.targets.map((n) => {
        const node = layout.right.get(n)!;
        return (
          <g key={`t-${n}`}>
            <rect x={node.x} y={node.y} width={NODE_W} height={node.h} rx={2} fill="var(--muted-foreground)" />
            <text x={node.x - 6} y={node.y + node.h / 2 - 2} textAnchor="end" fontSize={11} fontWeight={600} fill="var(--foreground)" dominantBaseline="middle">{n}</text>
            <text x={node.x - 6} y={node.y + node.h / 2 + 11} textAnchor="end" fontSize={10} fill="var(--muted-foreground)" dominantBaseline="middle">{layout.valTarget(n).toLocaleString()}</text>
          </g>
        );
      })}
    </svg>
  );
}
