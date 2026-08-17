import * as React from 'react';
import { cn } from '../utils/cn';

/**
 * CalendarHeatmap — temporal intensity (GitHub-style): one cell per day laid out
 * in week columns × weekday rows, shaded on a single-hue token ramp. Each cell
 * carries a `<title>` (date + value) for hover + a11y; a less→more legend gives
 * the scale. Token-only, responsive via SVG viewBox.
 */

export interface CalendarDay { date: string; value: number }
export interface CalendarHeatmapProps {
  days: CalendarDay[];
  /** Number of shade buckets. Default 4 (+ empty). */
  levels?: number;
  className?: string;
}

const DOW = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

// Single-hue primary ramp via color-mix over tokens (level 0 = muted).
const shade = (level: number, levels: number) =>
  level <= 0 ? 'var(--muted)' : `color-mix(in srgb, var(--primary) ${Math.round((level / levels) * 85) + 15}%, var(--muted))`;

export function CalendarHeatmap({ days, levels = 4, className }: CalendarHeatmapProps) {
  const parsed = React.useMemo(() => {
    const rows = days
      .map((d) => ({ ...d, t: new Date(`${d.date}T00:00:00`) }))
      .filter((d) => !Number.isNaN(d.t.getTime()))
      .sort((a, b) => a.t.getTime() - b.t.getTime());
    if (!rows.length) return null;
    const max = Math.max(...rows.map((r) => r.value), 1);
    const start = rows[0].t;
    const startSunday = new Date(start); startSunday.setDate(start.getDate() - start.getDay());
    const cell = (r: (typeof rows)[number]) => {
      const weeks = Math.floor((r.t.getTime() - startSunday.getTime()) / (7 * 864e5));
      const level = r.value <= 0 ? 0 : Math.max(1, Math.ceil((r.value / max) * levels));
      return { ...r, col: weeks, row: r.t.getDay(), level };
    };
    const cells = rows.map(cell);
    const cols = Math.max(...cells.map((c) => c.col)) + 1;
    return { cells, cols };
  }, [days, levels]);

  if (!parsed) return <div className="grid h-full min-h-24 place-items-center text-body-sm text-muted-foreground">No data</div>;

  const S = 15, GAP = 3, padL = 18, padT = 4;
  const vw = padL + parsed.cols * (S + GAP);
  const vh = padT + 7 * (S + GAP) + 4;

  return (
    <div className={cn('flex flex-col gap-2', className)}>
      <svg viewBox={`0 0 ${vw} ${vh}`} width="100%" role="img" aria-label="Daily activity heatmap" className="block">
        {DOW.map((d, r) => (r % 2 ? (
          <text key={r} x={0} y={padT + r * (S + GAP) + S - 3} fontSize={9} fill="var(--muted-foreground)">{d}</text>
        ) : null))}
        {parsed.cells.map((c) => (
          <rect
            key={c.date}
            x={padL + c.col * (S + GAP)} y={padT + c.row * (S + GAP)}
            width={S} height={S} rx={3}
            fill={shade(c.level, levels)}
            stroke="var(--border)" strokeWidth={0.5}
          >
            <title>{c.date}: {c.value}</title>
          </rect>
        ))}
      </svg>
      <div className="flex items-center gap-1.5 self-end text-caption text-muted-foreground">
        Less
        {Array.from({ length: levels + 1 }, (_, l) => (
          <span key={l} className="size-3 rounded-[3px]" style={{ background: shade(l, levels) }} />
        ))}
        More
      </div>
    </div>
  );
}
