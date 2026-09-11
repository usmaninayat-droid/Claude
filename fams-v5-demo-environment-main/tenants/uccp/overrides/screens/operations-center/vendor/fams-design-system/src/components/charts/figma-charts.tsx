import * as React from 'react';
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  BarChart as RBarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  AreaChart as RAreaChart,
  Area,
} from 'recharts';
import { ArrowDown, ArrowUp } from 'lucide-react';
import { cn } from '../utils/cn';
import { heatColor, HEAT_BUCKETS } from './chart-data';

/* Dark recharts tooltip — matches the Figma chart samples (neutral/darkest surface). */
const DARK_TOOLTIP = {
  contentStyle: {
    background: 'var(--popover)',
    border: 'none',
    borderRadius: 8,
    boxShadow: 'var(--elevation-lg)',
    padding: '8px 12px',
    fontSize: 12,
  },
  labelStyle: { color: 'var(--popover-foreground)', fontWeight: 600, marginBottom: 2 },
  itemStyle: { color: 'var(--popover-foreground)' },
} as const;

/* ════════════════════════════════════════════════════════════════════
   WidgetCard — the consistent chart-widget chrome (icon chip + title).
   ════════════════════════════════════════════════════════════════════ */
export interface WidgetCardProps extends React.HTMLAttributes<HTMLDivElement> {
  title: string;
  icon?: React.ReactNode;
  actions?: React.ReactNode;
}
export function WidgetCard({ title, icon, actions, className, children, ...rest }: WidgetCardProps) {
  return (
    <div className={cn('overflow-hidden rounded-xl border border-border bg-card shadow-sm', className)} {...rest}>
      <div className="flex items-center justify-between gap-3 border-b border-border px-5 py-3.5">
        <div className="flex items-center gap-2.5">
          {icon && (
            <span className="flex size-7 items-center justify-center rounded-full bg-secondary text-primary">{icon}</span>
          )}
          <h3 className="text-body-lg font-semibold text-foreground">{title}</h3>
        </div>
        {actions}
      </div>
      <div className="p-5">{children}</div>
    </div>
  );
}

/* ════════════════════════════════════════════════════════════════════
   TrendBadge — "↓ 20% vs last month"
   ════════════════════════════════════════════════════════════════════ */
export function TrendBadge({
  value,
  direction = 'down',
  note = 'vs last month',
}: {
  value: string;
  direction?: 'up' | 'down';
  note?: string;
}) {
  const color = direction === 'down' ? 'var(--status-error)' : 'var(--status-success)';
  const Arrow = direction === 'down' ? ArrowDown : ArrowUp;
  return (
    <span className="inline-flex items-center gap-1 text-body-sm">
      <Arrow className="size-3.5" style={{ color }} />
      <span className="font-semibold" style={{ color }}>{value}</span>
      <span className="text-muted-foreground">{note}</span>
    </span>
  );
}

/* ════════════════════════════════════════════════════════════════════
   ChartLegend — orientation × background × counter (Figma _Legend).
   ════════════════════════════════════════════════════════════════════ */
export interface LegendItem {
  label: string;
  color: string;
  count?: number | string;
}
export function ChartLegend({
  items,
  orientation = 'horizontal',
  background = false,
  counter = false,
  className,
}: {
  items: LegendItem[];
  orientation?: 'horizontal' | 'vertical';
  background?: boolean;
  counter?: boolean;
  className?: string;
}) {
  return (
    <div
      className={cn(
        'flex gap-x-5 gap-y-2.5',
        orientation === 'vertical' ? 'flex-col items-start' : 'flex-wrap items-center',
        background && 'rounded-lg bg-muted px-3 py-2',
        className,
      )}
    >
      {items.map((it) => (
        <span key={it.label} className="flex items-center gap-2 text-body-sm text-foreground">
          <span className="size-2.5 shrink-0 rounded-full" style={{ background: it.color }} />
          <span className="whitespace-nowrap">{it.label}</span>
          {counter && it.count != null && (
            <span className="rounded-md bg-surface-low-contrast px-1.5 py-0.5 text-caption font-medium text-muted-foreground">
              {it.count}
            </span>
          )}
        </span>
      ))}
    </div>
  );
}

/* ════════════════════════════════════════════════════════════════════
   DonutChart — segmented ring (gaps + rounded caps) + center value.
   ════════════════════════════════════════════════════════════════════ */
export interface DonutDatum {
  name: string;
  value: number;
  color: string;
}
export function DonutChart({
  data,
  centerValue,
  centerLabel,
  trend,
  size = 280,
}: {
  data: DonutDatum[];
  centerValue: React.ReactNode;
  centerLabel?: string;
  trend?: React.ReactNode;
  size?: number;
}) {
  return (
    <div className="relative" style={{ width: size, height: size }}>
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={data}
            dataKey="value"
            innerRadius="70%"
            outerRadius="100%"
            paddingAngle={3}
            cornerRadius={8}
            stroke="none"
            startAngle={90}
            endAngle={-270}
          >
            {data.map((d) => (
              <Cell key={d.name} fill={d.color} />
            ))}
          </Pie>
          <Tooltip
            content={({ active, payload }) =>
              active && payload && payload.length ? (
                <div className="flex items-center gap-2 rounded-lg bg-popover px-3 py-2 text-caption text-popover-foreground shadow-lg">
                  <span className="size-2.5 rounded-full" style={{ background: (payload[0].payload as DonutDatum).color }} />
                  {payload[0].name}
                  <span className="rounded bg-white/15 px-1.5 py-0.5">{payload[0].value}</span>
                </div>
              ) : null
            }
          />
        </PieChart>
      </ResponsiveContainer>
      <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center text-center">
        <span className="text-h2 font-bold leading-none text-foreground">{centerValue}</span>
        {centerLabel && <span className="mt-1.5 text-body-sm text-muted-foreground">{centerLabel}</span>}
        {trend && <span className="mt-1">{trend}</span>}
      </div>
    </div>
  );
}

/* ════════════════════════════════════════════════════════════════════
   ActivityGauge — concentric progress rings (rounded caps) + center value.
   ════════════════════════════════════════════════════════════════════ */
export interface GaugeRing {
  label: string;
  value: number; // 0-100
  color: string;
}
export function ActivityGauge({
  rings,
  centerValue,
  trend,
  size = 260,
}: {
  rings: GaugeRing[];
  centerValue: React.ReactNode;
  trend?: React.ReactNode;
  size?: number;
}) {
  const stroke = 14;
  const gap = 6;
  const cx = size / 2;
  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        {rings.map((ring, i) => {
          const r = size / 2 - stroke / 2 - i * (stroke + gap);
          const c = 2 * Math.PI * r;
          const pct = Math.max(0, Math.min(100, ring.value)) / 100;
          return (
            <g key={ring.label} transform={`rotate(-90 ${cx} ${cx})`}>
              <circle cx={cx} cy={cx} r={r} fill="none" stroke="var(--fig-neutral-lighter)" strokeWidth={stroke} />
              <circle
                cx={cx}
                cy={cx}
                r={r}
                fill="none"
                stroke={ring.color}
                strokeWidth={stroke}
                strokeLinecap="round"
                strokeDasharray={c}
                strokeDashoffset={c * (1 - pct)}
              />
            </g>
          );
        })}
      </svg>
      <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center text-center">
        <span className="text-h2 font-bold leading-none text-foreground">{centerValue}</span>
        {trend && <span className="mt-1.5">{trend}</span>}
      </div>
    </div>
  );
}

/* ════════════════════════════════════════════════════════════════════
   StackedBarChart — FAMS blue series ramp.
   ════════════════════════════════════════════════════════════════════ */
export interface BarSeries {
  key: string;
  color: string;
}
export function StackedBarChart({
  data,
  xKey,
  series,
  yLabel,
  xLabel,
  height = 320,
}: {
  data: Record<string, number | string>[];
  xKey: string;
  series: BarSeries[];
  yLabel?: string;
  xLabel?: string;
  height?: number;
}) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <RBarChart data={data} margin={{ top: 8, right: 8, bottom: xLabel ? 24 : 8, left: yLabel ? 16 : 0 }} barCategoryGap="22%">
        <CartesianGrid vertical={false} stroke="var(--fig-border-lightest)" />
        <XAxis
          dataKey={xKey}
          tickLine={false}
          axisLine={{ stroke: 'var(--fig-border-light)' }}
          tick={{ fontSize: 12, fill: 'var(--muted-foreground)' }}
          label={xLabel ? { value: xLabel, position: 'bottom', fontSize: 12, fill: 'var(--muted-foreground)' } : undefined}
        />
        <YAxis
          tickLine={false}
          axisLine={false}
          tick={{ fontSize: 12, fill: 'var(--muted-foreground)' }}
          label={yLabel ? { value: yLabel, angle: -90, position: 'insideLeft', fontSize: 12, fill: 'var(--muted-foreground)' } : undefined}
        />
        <Tooltip cursor={{ fill: 'var(--fig-surface-minimal)' }} {...DARK_TOOLTIP} />
        {series.map((s, i) => (
          <Bar
            key={s.key}
            dataKey={s.key}
            stackId="a"
            fill={s.color}
            radius={i === series.length - 1 ? [4, 4, 0, 0] : 0}
          />
        ))}
      </RBarChart>
    </ResponsiveContainer>
  );
}

/* ════════════════════════════════════════════════════════════════════
   AreaTrendChart — smooth area with gradient fill.
   ════════════════════════════════════════════════════════════════════ */
export function AreaTrendChart({
  data,
  xKey,
  dataKey,
  color = 'var(--primary)',
  height = 300,
}: {
  data: Record<string, number | string>[];
  xKey: string;
  dataKey: string;
  color?: string;
  height?: number;
}) {
  const gid = `area-${dataKey}`;
  return (
    <ResponsiveContainer width="100%" height={height}>
      <RAreaChart data={data} margin={{ top: 8, right: 8, bottom: 8, left: 0 }}>
        <defs>
          <linearGradient id={gid} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity={0.25} />
            <stop offset="100%" stopColor={color} stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid vertical={false} stroke="var(--fig-border-lightest)" />
        <XAxis dataKey={xKey} tickLine={false} axisLine={{ stroke: 'var(--fig-border-light)' }} tick={{ fontSize: 12, fill: 'var(--muted-foreground)' }} />
        <YAxis tickLine={false} axisLine={false} tick={{ fontSize: 12, fill: 'var(--muted-foreground)' }} />
        <Tooltip {...DARK_TOOLTIP} />
        <Area type="monotone" dataKey={dataKey} stroke={color} strokeWidth={2.5} fill={`url(#${gid})`} />
      </RAreaChart>
    </ResponsiveContainer>
  );
}

/* ════════════════════════════════════════════════════════════════════
   HeatChart — driver/date grid with blue intensity buckets.
   ════════════════════════════════════════════════════════════════════ */
export function HeatChart({
  rows,
  cols,
  values,
  yLabel,
  xLabel,
}: {
  rows: string[];
  cols: (string | number)[];
  values: number[][];
  yLabel?: string;
  xLabel?: string;
}) {
  return (
    <div className="flex gap-2">
      {yLabel && (
        <span className="self-center text-caption text-muted-foreground" style={{ writingMode: 'vertical-rl', transform: 'rotate(180deg)' }}>
          {yLabel}
        </span>
      )}
      <div className="min-w-0 flex-1 overflow-x-auto">
        <div className="inline-flex flex-col gap-1.5">
          {rows.map((row, ri) => (
            <div key={row} className="flex items-center gap-1.5">
              <span className="w-14 shrink-0 text-right text-caption text-muted-foreground">{row}</span>
              {cols.map((_, ci) => (
                <span
                  key={ci}
                  className="size-6 shrink-0 rounded-[4px] md:size-7"
                  style={{ background: heatColor(values[ri]?.[ci] ?? 0) }}
                  title={`${row} · ${cols[ci]}: ${values[ri]?.[ci] ?? 0}`}
                />
              ))}
            </div>
          ))}
          <div className="flex items-center gap-1.5 pt-1">
            <span className="w-14 shrink-0" />
            {cols.map((c, ci) => (
              <span key={ci} className="w-6 shrink-0 text-center text-caption text-muted-foreground md:w-7">
                {c}
              </span>
            ))}
          </div>
          {xLabel && <div className="pl-16 text-center text-caption text-muted-foreground">{xLabel}</div>}
        </div>
      </div>
    </div>
  );
}

export function HeatLegend() {
  return (
    <div className="flex flex-wrap items-center gap-4">
      {HEAT_BUCKETS.map((b) => (
        <span key={b.label} className="flex items-center gap-1.5 text-caption text-muted-foreground">
          <span className="size-2.5 rounded-full" style={{ background: b.color }} />
          {b.label}
        </span>
      ))}
    </div>
  );
}
