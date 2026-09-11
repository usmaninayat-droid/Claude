import * as React from 'react';
import { cn } from '../utils/cn';
import {
  Sun, CloudSun01, Cloud01, CloudRaining01, Play, XClose, ChevronUp, ChevronDown,
  ArrowNarrowDown, TrendUp01, TrendDown01, Minus,
} from '../../icons';

/**
 * WeatherForecastWidget — Windy-style forecast overlay for DS maps
 * (Qatar MME, Figma SfRlcF1NNPpApYDo8G4krk · 13866-8220/8222/8223 + 11577-5957).
 *
 * Collapsed: a rain-intensity legend strip above a dark model-tab bar
 * (ECMWF · GFS · ICON · WRF-CHEM · HYPE) with an expand chevron.
 * Expanded: a full-width timeline panel anchored to the map's bottom edge —
 * row-label rail on the left, scrollable day/week columns in the middle, an
 * "About Location" rail on the right, and a play/replay time scrubber below.
 * Three layouts: hourly weather (ECMWF/GFS/ICON), flood chemistry (WRF-CHEM)
 * and the 9-weeks hydrological outlook (HYPE).
 *
 * Mount inside a `relative` map container (sibling of the map canvas).
 * Purely presentational + deterministic demo data; token-only chrome.
 */

/* ── models ──────────────────────────────────────────────────────────────── */

type ModelId = 'ECMWF' | 'GFS' | 'ICON' | 'WRF-CHEM' | 'HYPE';
const MODELS: { id: ModelId; res?: string }[] = [
  { id: 'ECMWF', res: '9KM' },
  { id: 'GFS', res: '22KM' },
  { id: 'ICON', res: '13KM' },
  { id: 'WRF-CHEM' },
  { id: 'HYPE' },
];

/* ── deterministic demo series (seeded by column index, no RNG) ──────────── */

const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

interface HourCell { hour: number; temp: number; rain: number; wind: number; gust: number; windDeg: number; sky: 'sun' | 'partly' | 'cloud' | 'rain' }
interface DayCol { label: string; sub: string; hours: HourCell[] }

function buildDays(count = 10): DayCol[] {
  const start = new Date();
  return Array.from({ length: count }, (_, d) => {
    const date = new Date(start.getTime() + d * 86400000);
    const hours = [8, 16, 24].map((hour, h) => {
      const seed = d * 3 + h;
      const rain = [0, 0, 1.6, 0, 7.2, 0.4, 0, 1.1, 19, 0, 0.2, 8.1][seed % 12];
      return {
        hour,
        temp: 21 + ((seed * 7) % 6),
        rain,
        wind: 4 + ((seed * 5) % 26),
        gust: 8 + ((seed * 11) % 34),
        windDeg: (seed * 47) % 360,
        sky: (rain >= 5 ? 'rain' : rain > 0 ? 'cloud' : seed % 3 === 0 ? 'sun' : 'partly') as HourCell['sky'],
      };
    });
    return { label: `${DAY_NAMES[date.getDay()]} ${date.getDate()} ${MONTHS[date.getMonth()]}`, sub: '', hours };
  });
}

interface WeekCol { label: string; floodProb: string; discharge: string; infiltration: number; groundwater: string; trend: 'Stable' | 'Rising' | 'Falling'; evap: string }
function buildWeeks(count = 9): WeekCol[] {
  const start = new Date();
  return Array.from({ length: count }, (_, w) => {
    const a = new Date(start.getTime() + w * 7 * 86400000);
    const b = new Date(a.getTime() + 6 * 86400000);
    const fmt = (dt: Date) => `${String(dt.getDate()).padStart(2, '0')} ${MONTHS[dt.getMonth()]}`;
    return {
      label: `${fmt(a)} - ${fmt(b)}`,
      floodProb: w % 4 === 2 ? '15-25%' : '10-15%',
      discharge: '0-5',
      infiltration: 2,
      groundwater: '5-20 m',
      trend: (w === 1 ? 'Falling' : w === 2 ? 'Rising' : 'Stable') as WeekCol['trend'],
      evap: `${30 + ((w * 3) % 12)}%`,
    };
  });
}

/* ── tone helpers (rain/wind/risk → status + chart tokens) ───────────────── */

function windTone(v: number): string {
  if (v < 10) return 'var(--chart-accent-teal)';
  if (v < 20) return 'var(--status-success)';
  if (v < 28) return 'var(--status-warning)';
  return 'var(--status-error)';
}
function rainTone(v: number): string | undefined {
  if (v <= 0) return undefined;
  if (v < 2) return 'var(--status-info)';
  if (v < 8) return 'var(--status-warning)';
  return 'var(--status-error)';
}
function floodRiskOf(rain: number): { label: 'L' | 'M' | 'H'; tone: string } | null {
  if (rain <= 0) return null;
  if (rain < 2) return { label: 'L', tone: 'var(--status-info)' };
  if (rain < 8) return { label: 'M', tone: 'var(--status-warning)' };
  return { label: 'H', tone: 'var(--status-error)' };
}

const SKY_ICON = { sun: Sun, partly: CloudSun01, cloud: Cloud01, rain: CloudRaining01 } as const;

/* ── rain-intensity legend (collapsed strip + expanded header) ───────────── */

const LEGEND_STOPS = ['1.5', '2', '3', '7', '10', '20', '30'];
function RainLegend({ compact }: { compact?: boolean }) {
  return (
    <div
      className={cn('flex items-center overflow-hidden rounded-md text-caption font-semibold text-white', compact ? 'h-5' : 'h-6')}
      style={{
        background:
          'linear-gradient(90deg, var(--gray-500) 0%, var(--chart-accent-teal) 12%, var(--status-success) 34%, var(--status-warning) 58%, var(--status-error) 80%, var(--chart-accent-pink) 100%)',
      }}
      aria-label="Rain intensity legend (mm)"
    >
      <span className="px-2">mm</span>
      {LEGEND_STOPS.map((s) => <span key={s} className="flex-1 text-center">{s}</span>)}
    </div>
  );
}

/* ── model tab bar (dark pill) ───────────────────────────────────────────── */

function ModelTabs({ model, onModel, expanded, onToggle, compact }: {
  model: ModelId; onModel: (m: ModelId) => void; expanded: boolean; onToggle: () => void; compact?: boolean;
}) {
  return (
    <div className={cn('flex items-center gap-1 rounded-lg bg-[var(--gray-900)] text-white shadow-elevation', compact ? 'px-1.5 py-1' : 'px-2 py-1.5')}>
      {MODELS.map(({ id, res }) => (
        <button
          key={id}
          type="button"
          onClick={() => onModel(id)}
          aria-pressed={model === id}
          className={cn(
            'flex items-baseline gap-0.5 rounded-md px-2.5 py-1 text-caption font-semibold transition-colors focus-visible:ring-2 focus-visible:ring-ring',
            model === id ? 'bg-primary text-primary-foreground' : 'text-white/80 hover:bg-white/10 hover:text-white',
          )}
        >
          {id}
          {res && <span className="text-[length:var(--text-caption)] font-medium opacity-70">{res}</span>}
        </button>
      ))}
      <span className="mx-1 h-4 w-px bg-white/20" aria-hidden />
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={expanded}
        aria-label={expanded ? 'Collapse forecast panel' : 'Expand forecast panel'}
        className="grid size-7 place-items-center rounded-md text-white/80 transition-colors hover:bg-white/10 hover:text-white focus-visible:ring-2 focus-visible:ring-ring"
      >
        {expanded ? <ChevronDown size={16} /> : <ChevronUp size={16} />}
      </button>
    </div>
  );
}

/* ── play / replay scrubber ──────────────────────────────────────────────── */

function useReplay(stepCount: number) {
  const [cursor, setCursor] = React.useState(-1); // -1 = idle (nothing highlighted)
  const [playing, setPlaying] = React.useState(false);
  const timer = React.useRef<ReturnType<typeof setInterval> | null>(null);

  const stop = React.useCallback(() => {
    if (timer.current) clearInterval(timer.current);
    timer.current = null;
    setPlaying(false);
  }, []);

  const play = React.useCallback(() => {
    stop();
    // Replay semantics: finished (or idle) → restart from 0; paused midway → resume.
    setCursor((c) => (c < 0 || c >= stepCount - 1 ? 0 : c));
    setPlaying(true);
    timer.current = setInterval(() => {
      setCursor((c) => {
        if (c >= stepCount - 1) { stop(); return c; }
        return c + 1;
      });
    }, 450);
  }, [stepCount, stop]);

  React.useEffect(() => stop, [stop]); // cleanup on unmount
  React.useEffect(() => { setCursor(-1); stop(); }, [stepCount, stop]); // model switch resets

  return { cursor, playing, toggle: () => (playing ? stop() : play()) };
}

function ReplayBar({ cursor, playing, stepCount, onToggle }: { cursor: number; playing: boolean; stepCount: number; onToggle: () => void }) {
  const pct = cursor < 0 ? 0 : ((cursor + 1) / stepCount) * 100;
  return (
    <div className="flex items-center gap-3 px-4 py-2.5">
      <button
        type="button"
        onClick={onToggle}
        aria-label={playing ? 'Pause forecast replay' : 'Play forecast replay'}
        className="grid size-8 shrink-0 place-items-center rounded-full border border-border bg-card text-foreground transition-colors hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring"
      >
        {playing ? <span className="flex gap-0.5" aria-hidden><span className="h-3 w-1 rounded-sm bg-foreground" /><span className="h-3 w-1 rounded-sm bg-foreground" /></span> : <Play size={14} />}
      </button>
      <div className="relative h-1.5 flex-1 overflow-hidden rounded-full bg-muted" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(pct)} aria-label="Forecast timeline">
        <span className="absolute inset-y-0 left-0 rounded-full bg-primary motion-safe:transition-[width] motion-safe:duration-300" style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

/* ── shared cell bits ────────────────────────────────────────────────────── */

function RowLabel({ children, unit }: { children: React.ReactNode; unit?: string }) {
  return (
    <div className="flex h-8 items-center justify-between gap-2 pr-2 text-caption text-muted-foreground">
      <span className="truncate">{children}</span>
      {unit && <span className="shrink-0 font-semibold">{unit}</span>}
    </div>
  );
}

function AboutLocation({ rows }: { rows: { label: string; value: React.ReactNode }[] }) {
  return (
    <div className="w-44 shrink-0 border-s border-border py-3 pl-4 pr-3">
      <div className="mb-2 text-body-sm font-semibold text-foreground">About Location</div>
      <div className="flex flex-col gap-1.5">
        {rows.map((r, i) => (
          <div key={i} className="text-caption text-muted-foreground">
            {r.label ? <>{r.label}: <span className="font-medium text-foreground">{r.value}</span></> : r.value}
          </div>
        ))}
      </div>
    </div>
  );
}

/* ── expanded layouts ────────────────────────────────────────────────────── */

/** Hourly weather grid — ECMWF / GFS / ICON. */
function HourlyGrid({ days, cursor }: { days: DayCol[]; cursor: number }) {
  const flat = days.flatMap((d) => d.hours);
  return (
    <div className="min-w-max">
      {/* day headers */}
      <div className="flex border-b border-border">
        {days.map((d) => (
          <div key={d.label} className="w-[132px] shrink-0 border-e border-border py-1.5 text-center text-caption font-semibold text-foreground">{d.label}</div>
        ))}
      </div>
      {/* rows */}
      {([
        { key: 'hours', render: (c: HourCell) => <span className="text-caption text-muted-foreground">{c.hour}</span> },
        { key: 'sky', render: (c: HourCell) => { const I = SKY_ICON[c.sky]; return <I size={16} className={c.sky === 'sun' ? 'text-[color:var(--status-warning)]' : 'text-muted-foreground'} />; } },
        { key: 'temp', render: (c: HourCell) => <span className="text-caption font-semibold text-foreground">{c.temp}°</span> },
        { key: 'rain', render: (c: HourCell) => <span className="text-caption font-semibold" style={{ color: rainTone(c.rain) ?? 'var(--muted-foreground)' }}>{c.rain > 0 ? c.rain : 0}</span> },
        { key: 'wind', render: (c: HourCell) => <span className="flex h-3 w-9 items-center justify-center rounded-sm text-caption font-semibold text-white" style={{ background: windTone(c.wind) }}>{c.wind}</span> },
        { key: 'gust', render: (c: HourCell) => <span className="flex h-3 w-9 items-center justify-center rounded-sm text-caption font-semibold text-white" style={{ background: windTone(c.gust) }}>{c.gust}</span> },
        { key: 'dir', render: (c: HourCell) => <ArrowNarrowDown size={13} className="text-foreground" style={{ transform: `rotate(${c.windDeg}deg)` }} /> },
      ] as const).map((row) => (
        <div key={row.key} className="flex">
          {flat.map((c, i) => (
            <div key={i} className={cn('flex h-8 w-11 shrink-0 items-center justify-center', (i + 1) % 3 === 0 && 'border-e border-border', i === cursor && 'bg-secondary')}>
              {row.render(c)}
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}
const HOURLY_ROWS = [
  { label: 'Hours', unit: '' },
  { label: '', unit: '' },
  { label: 'Temperature', unit: '°C' },
  { label: 'Rain', unit: 'mm' },
  { label: 'Wind', unit: 'km/h' },
  { label: 'Wind Gusts', unit: 'km/h' },
  { label: 'Wind Dir', unit: '' },
];

/** Flood-chemistry grid — WRF-CHEM. */
function FloodGrid({ days, cursor }: { days: DayCol[]; cursor: number }) {
  const flat = days.flatMap((d) => d.hours);
  return (
    <div className="min-w-max">
      <div className="flex border-b border-border">
        {days.map((d) => (
          <div key={d.label} className="w-[132px] shrink-0 border-e border-border py-1.5 text-center text-caption font-semibold text-foreground">{d.label}</div>
        ))}
      </div>
      {([
        { key: 'hours', render: (c: HourCell) => <span className="text-caption text-muted-foreground">{c.hour}</span> },
        { key: 'sky', render: (c: HourCell) => { const I = SKY_ICON[c.sky]; return <I size={16} className={c.sky === 'sun' ? 'text-[color:var(--status-warning)]' : 'text-muted-foreground'} />; } },
        { key: 'accum', render: (c: HourCell) => <span className="text-caption font-semibold" style={{ color: rainTone(c.rain) ?? 'var(--muted-foreground)' }}>{c.rain}</span> },
        { key: 'risk', render: (c: HourCell) => { const r = floodRiskOf(c.rain); return r ? <span className="text-caption font-bold" style={{ color: r.tone }}>{r.label}</span> : <span className="text-caption text-muted-foreground">–</span>; } },
        { key: 'runoff', render: (c: HourCell) => <span className="text-caption text-foreground">{c.rain > 0 ? (c.rain / 6).toFixed(1) : 0}</span> },
        { key: 'soil', render: (c: HourCell) => <span className="text-caption text-foreground">{c.rain > 0 ? `${35 + Math.min(60, Math.round(c.rain * 3))}%` : ''}</span> },
        { key: 'dir', render: (c: HourCell) => <ArrowNarrowDown size={13} className="text-foreground" style={{ transform: `rotate(${c.windDeg}deg)` }} /> },
      ] as const).map((row) => (
        <div key={row.key} className="flex">
          {flat.map((c, i) => (
            <div key={i} className={cn('flex h-8 w-11 shrink-0 items-center justify-center', (i + 1) % 3 === 0 && 'border-e border-border', i === cursor && 'bg-secondary')}>
              {row.render(c)}
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}
const FLOOD_ROWS = [
  { label: 'Hours', unit: '' },
  { label: '', unit: '' },
  { label: 'Rain Accum.', unit: 'mm' },
  { label: 'Flood Risk', unit: 'L,M,H' },
  { label: 'Runoff Water', unit: 'm³s' },
  { label: 'Soil Absorption', unit: '%' },
  { label: 'Wind Dir', unit: '' },
];

/** 9-weeks hydrological outlook — HYPE. */
function WeeklyGrid({ weeks, cursor }: { weeks: WeekCol[]; cursor: number }) {
  const TREND_TONE = { Stable: 'var(--status-info)', Rising: 'var(--status-error)', Falling: 'var(--status-warning)' } as const;
  const TREND_ICON = { Stable: Minus, Rising: TrendUp01, Falling: TrendDown01 } as const;
  return (
    <div className="min-w-max">
      <div className="flex border-b border-border">
        {weeks.map((w) => (
          <div key={w.label} className="w-[108px] shrink-0 border-e border-border py-1.5 text-center text-caption font-semibold text-foreground">{w.label}</div>
        ))}
      </div>
      {([
        { key: 'prob', render: (w: WeekCol) => <span className="text-caption font-semibold text-foreground">{w.floodProb}</span> },
        { key: 'discharge', render: (w: WeekCol) => <span className="text-caption text-foreground">{w.discharge}</span> },
        { key: 'infil', render: (w: WeekCol) => <span className="text-caption text-foreground">{w.infiltration}</span> },
        { key: 'ground', render: (w: WeekCol) => <span className="text-caption font-semibold text-[color:var(--status-info)]">{w.groundwater}</span> },
        { key: 'trend', render: (w: WeekCol) => { const I = TREND_ICON[w.trend]; return <span className="flex items-center gap-1 text-caption font-semibold" style={{ color: TREND_TONE[w.trend] }}><I size={12} />{w.trend}</span>; } },
        { key: 'evap', render: (w: WeekCol) => <span className="text-caption text-foreground">{w.evap}</span> },
      ] as const).map((row) => (
        <div key={row.key} className="flex">
          {weeks.map((w, i) => (
            <div key={w.label} className={cn('flex h-8 w-[108px] shrink-0 items-center justify-center border-e border-border', i === cursor && 'bg-secondary')}>
              {row.render(w)}
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}
const WEEKLY_ROWS = [
  { label: 'Flood Probability', unit: '%' },
  { label: 'River Discharge', unit: 'm³s' },
  { label: 'Soil Infiltration Rate', unit: 'mm/h' },
  { label: 'Groundwater Level', unit: 'm' },
  { label: 'Water Level Trend', unit: '' },
  { label: 'Evapotranspiration', unit: 'mm/day' },
];

/* ── the widget ──────────────────────────────────────────────────────────── */

export interface WeatherForecastWidgetProps {
  /** location name shown in the About rail (default: Qatar/Doha). */
  locationLabel?: string;
  className?: string;
}

export function WeatherForecastWidget({ locationLabel = 'Qatar/Doha (+10:00)', className }: WeatherForecastWidgetProps) {
  const [expanded, setExpanded] = React.useState(false);
  const [model, setModel] = React.useState<ModelId>('ECMWF');

  const days = React.useMemo(() => buildDays(10), []);
  const weeks = React.useMemo(() => buildWeeks(9), []);
  const isWeekly = model === 'HYPE';
  const stepCount = isWeekly ? weeks.length : days.length * 3;
  const { cursor, playing, toggle } = useReplay(stepCount);

  const aboutRows = isWeekly
    ? [
        { label: '', value: 'S18 41′ 16″, E140 55′58″' },
        { label: '', value: locationLabel },
        { label: 'Elevation', value: '34m (111ft)' },
        { label: 'Water Depth', value: '3.2m' },
        { label: 'Storm Clouds', value: 'PM2.5' },
        { label: 'Flood Risk', value: <span className="font-semibold text-[color:var(--status-error)]">High</span> },
      ]
    : model === 'WRF-CHEM'
      ? [
          { label: '', value: 'S18 41′ 16″, E140 55′58″' },
          { label: '', value: locationLabel },
          { label: 'Elevation', value: '34m (111ft)' },
          { label: 'Water Depth', value: '3.2m' },
          { label: 'Storm Clouds', value: 'PM2.5' },
          { label: 'Flood Risk', value: <span className="font-semibold text-[color:var(--status-error)]">High</span> },
        ]
      : [
          { label: '', value: 'S18 41′ 16″, E140 55′58″' },
          { label: '', value: locationLabel },
          { label: 'Sunrise', value: '6:17 AM' },
          { label: 'Sunset', value: '6:37 PM' },
          { label: 'Elevation', value: '34m (111ft)' },
        ];

  if (!expanded) {
    return (
      <div className={cn('pointer-events-auto flex flex-col items-stretch gap-1.5', className)}>
        <RainLegend compact />
        <ModelTabs model={model} onModel={setModel} expanded={false} onToggle={() => setExpanded(true)} compact />
      </div>
    );
  }

  const rows = isWeekly ? WEEKLY_ROWS : model === 'WRF-CHEM' ? FLOOD_ROWS : HOURLY_ROWS;

  return (
    <div className={cn('pointer-events-auto flex w-full flex-col gap-1.5', className)}>
      {/* legend + tabs float above the open panel, right-aligned (Figma 13866-8222) */}
      <div className="flex items-end justify-end gap-2">
        <div className="w-64"><RainLegend compact /></div>
        <ModelTabs model={model} onModel={setModel} expanded onToggle={() => setExpanded(false)} compact />
      </div>

      <div className="overflow-hidden rounded-lg border border-border bg-card shadow-elevation">
        <div className="flex">
          {/* row-label rail — close button floats so labels align 1:1 with grid rows */}
          <div className="relative w-40 shrink-0 border-e border-border py-1.5 pl-8 pr-1">
            <button
              type="button"
              aria-label="Close forecast panel"
              onClick={() => setExpanded(false)}
              className="absolute left-1 top-1.5 grid size-6 place-items-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring"
            >
              <XClose size={14} />
            </button>
            {/* spacer matching the column-header row height */}
            <div className="flex h-[31px] items-center text-caption font-semibold text-foreground" aria-hidden>
              {isWeekly ? '9 Weeks Forecast' : ''}
            </div>
            {rows.map((r, i) => <RowLabel key={i} unit={r.unit}>{r.label}</RowLabel>)}
          </div>

          {/* timeline columns */}
          <div className="min-w-0 flex-1 overflow-x-auto py-1.5">
            {isWeekly
              ? <WeeklyGrid weeks={weeks} cursor={cursor} />
              : model === 'WRF-CHEM'
                ? <FloodGrid days={days} cursor={cursor} />
                : <HourlyGrid days={days} cursor={cursor} />}
          </div>

          <AboutLocation rows={aboutRows} />
        </div>

        <div className="border-t border-border">
          <ReplayBar cursor={cursor} playing={playing} stepCount={stepCount} onToggle={toggle} />
        </div>
      </div>
    </div>
  );
}
