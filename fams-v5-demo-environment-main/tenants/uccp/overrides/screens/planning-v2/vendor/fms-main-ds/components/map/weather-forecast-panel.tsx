import * as React from 'react';
import { cn } from '../utils/cn';
import { Sun, CloudRaining01, Play, XClose, ChevronUp, ChevronDown } from '../../icons';

/**
 * WeatherForecastPanel — verbatim port of Live Monitoring's map forecast
 * strip (fams-design-system `v5-templates/src/map/WeatherForecastPanel.tsx`)
 * into this vendored DS, so Smart Planning's maps carry the SAME weather
 * control and widget the Live Monitoring module ships:
 *
 *   Collapsed: two content-sized floating pills — the rain-intensity legend
 *   and the dark model-tab bar (Open-Meteo · QMD) with its expand chevron.
 *   Expanded: a full-width timeline card on the map's bottom edge — row-label
 *   rail left, horizontally scrolling day/hour columns, an "About Location"
 *   rail right, and a play/replay time scrubber below.
 *
 * Exactly TWO models by product decision: "Open-Meteo" (hourly timeline) and
 * "QMD" (Qatar Meteorology Department's 10-day official outlook). Purely
 * presentational over caller-supplied data; token adaptations only
 * (the source's --color-… names → this bundle's --status-… and --primary).
 * Mount inside a `relative` map container, as a sibling of the map canvas.
 */

/* ── data vocabulary (same shapes as v5-templates weather-types.ts) ──────── */

export interface WeatherForecastRow {
  time: string;
  tempC: number;
  precipitationMm: number;
  precipitationChance: number;
  windKmh: number;
}
export interface WeatherForecastDay {
  day: string;
  hours: WeatherForecastRow[];
}
export interface WeatherDailyRow {
  date: string;
  warning: string;
  minC: number;
  maxC: number;
  rainMm?: number;
}
export interface WeatherForecastLocation {
  label: string;
  coordinates?: string;
  sunrise?: string;
  sunset?: string;
  elevation?: string;
}
export interface WeatherForecastPanelData {
  location?: WeatherForecastLocation;
  openMeteo?: WeatherForecastDay[];
  qmd?: WeatherDailyRow[];
}

const WEATHER_FORECAST_MODELS = ['open-meteo', 'qmd'] as const;
type WeatherForecastModelId = (typeof WEATHER_FORECAST_MODELS)[number];
const WEATHER_FORECAST_MODEL_LABELS: Record<WeatherForecastModelId, string> = {
  'open-meteo': 'Open-Meteo',
  qmd: 'QMD',
};

export interface WeatherForecastPanelProps {
  data: WeatherForecastPanelData;
  /** Controlled expansion (LiveMapView pattern); omit to run uncontrolled. */
  expanded?: boolean;
  onExpandedChange?: (expanded: boolean) => void;
  className?: string;
}

/* ── tone helpers (data colour → status tokens, never raw hex) ───────────── */

function rainTone(mm: number): string | undefined {
  if (mm <= 0) return undefined;
  if (mm < 2) return 'var(--status-info)';
  if (mm < 8) return 'var(--status-warning)';
  return 'var(--status-error)';
}
function windTone(kmh: number): string {
  if (kmh < 12) return 'var(--status-success)';
  if (kmh < 27) return 'var(--status-warning)';
  return 'var(--status-error)';
}

/* ── rain-intensity legend (mm scale) ────────────────────────────────────── */

const LEGEND_STOPS = ['1.5', '2', '3', '7', '10', '20', '30'];

function RainLegend({ className }: { className?: string }) {
  return (
    <div
      className={cn('flex h-6 items-center overflow-hidden rounded-md text-caption font-semibold text-white', className)}
      style={{
        background:
          'linear-gradient(90deg, var(--muted-foreground) 0%, var(--status-success) 30%, var(--status-warning) 62%, var(--status-error) 88%, var(--primary) 100%)',
      }}
      aria-label="Rain intensity legend (mm)"
    >
      <span className="px-2">mm</span>
      {LEGEND_STOPS.map((s) => (
        <span key={s} className="min-w-8 px-1 text-center">{s}</span>
      ))}
      <span className="w-1.5" aria-hidden />
    </div>
  );
}

/* ── model tab bar (dark pill) ───────────────────────────────────────────── */

function ModelTabs({ model, onModel, expanded, onToggle }: {
  model: WeatherForecastModelId;
  onModel: (m: WeatherForecastModelId) => void;
  expanded: boolean;
  onToggle: () => void;
}) {
  return (
    <div className="flex items-center gap-1 rounded-lg bg-[var(--gray-900)] px-1.5 py-1 text-white shadow-md">
      {WEATHER_FORECAST_MODELS.map((id) => (
        <button
          key={id}
          type="button"
          onClick={() => onModel(id)}
          aria-pressed={model === id}
          className={cn(
            'rounded-md px-2.5 py-1 text-caption font-semibold transition-colors focus-visible:ring-2 focus-visible:ring-ring',
            model === id ? 'bg-primary text-primary-foreground' : 'text-white/80 hover:bg-white/10 hover:text-white',
          )}
        >
          {WEATHER_FORECAST_MODEL_LABELS[id]}
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
  const [cursor, setCursor] = React.useState(-1); // -1 = idle
  const [playing, setPlaying] = React.useState(false);
  const timer = React.useRef<ReturnType<typeof setInterval> | null>(null);

  const stop = React.useCallback(() => {
    if (timer.current) clearInterval(timer.current);
    timer.current = null;
    setPlaying(false);
  }, []);

  const play = React.useCallback(() => {
    stop();
    setCursor((c) => (c < 0 || c >= stepCount - 1 ? 0 : c));
    setPlaying(true);
    timer.current = setInterval(() => {
      setCursor((c) => {
        if (c >= stepCount - 1) { stop(); return c; }
        return c + 1;
      });
    }, 450);
  }, [stepCount, stop]);

  React.useEffect(() => stop, [stop]);
  React.useEffect(() => { setCursor(-1); stop(); }, [stepCount, stop]);

  return { cursor, playing, toggle: () => (playing ? stop() : play()) };
}

function ReplayBar({ cursor, playing, stepCount, onToggle }: { cursor: number; playing: boolean; stepCount: number; onToggle: () => void }) {
  const pct = stepCount <= 0 || cursor < 0 ? 0 : ((cursor + 1) / stepCount) * 100;
  return (
    <div className="flex items-center gap-3 px-4 py-2.5">
      <button
        type="button"
        onClick={onToggle}
        aria-label={playing ? 'Pause forecast replay' : 'Play forecast replay'}
        className="grid size-8 shrink-0 place-items-center rounded-full border border-border bg-card text-foreground transition-colors hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring"
      >
        {playing ? (
          <span className="flex gap-0.5" aria-hidden>
            <span className="h-3 w-1 rounded-sm bg-foreground" />
            <span className="h-3 w-1 rounded-sm bg-foreground" />
          </span>
        ) : (
          <Play size={14} />
        )}
      </button>
      <div className="relative h-1.5 flex-1 overflow-hidden rounded-full bg-muted" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(pct)} aria-label="Forecast timeline">
        <span className="absolute inset-y-0 left-0 rounded-full bg-primary motion-safe:transition-[width] motion-safe:duration-300" style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

/* ── expanded grids ──────────────────────────────────────────────────────── */

function RowLabel({ children, unit }: { children: React.ReactNode; unit?: string }) {
  return (
    <div className="flex h-8 items-center justify-between gap-2 pr-2 text-caption text-muted-foreground">
      <span className="truncate">{children}</span>
      {unit ? <span className="shrink-0 font-semibold">{unit}</span> : null}
    </div>
  );
}

function SkyGlyph({ hour }: { hour: WeatherForecastRow }) {
  if (hour.precipitationMm > 0 || hour.precipitationChance >= 40) {
    return <CloudRaining01 size={16} className="text-muted-foreground" />;
  }
  return <Sun size={16} className="text-[color:var(--status-warning)]" />;
}

function OpenMeteoGrid({ days, cursor }: { days: WeatherForecastDay[]; cursor: number }) {
  const flat = days.flatMap((d) => d.hours);
  const bounds: number[] = [];
  let acc = 0;
  for (const d of days) { acc += d.hours.length; bounds.push(acc); }
  const rows: { key: string; render: (c: WeatherForecastRow) => React.ReactNode }[] = [
    { key: 'hours', render: (c) => <span className="text-caption text-muted-foreground">{c.time}</span> },
    { key: 'sky', render: (c) => <SkyGlyph hour={c} /> },
    { key: 'temp', render: (c) => <span className="text-caption font-semibold text-foreground">{Math.round(c.tempC)}°</span> },
    { key: 'rain', render: (c) => <span className="text-caption font-semibold" style={{ color: rainTone(c.precipitationMm) ?? 'var(--muted-foreground)' }}>{c.precipitationMm > 0 ? c.precipitationMm : 0}</span> },
    { key: 'chance', render: (c) => <span className={cn('text-caption', c.precipitationChance > 0 ? 'font-semibold text-foreground' : 'text-muted-foreground')}>{c.precipitationChance}</span> },
    { key: 'wind', render: (c) => <span className="flex h-3.5 w-9 items-center justify-center rounded-sm text-caption font-semibold text-white" style={{ background: windTone(c.windKmh) }}>{Math.round(c.windKmh)}</span> },
  ];
  return (
    <div className="min-w-max" data-slot="weather-forecast-open-meteo">
      <div className="flex border-b border-border">
        {days.map((d) => (
          <div key={d.day} className="shrink-0 border-e border-border py-1.5 text-center text-caption font-semibold text-foreground" style={{ width: `${d.hours.length * 4}rem` }}>
            {d.day}
          </div>
        ))}
      </div>
      {rows.map((row) => (
        <div key={row.key} className="flex">
          {flat.map((c, i) => (
            <div key={i} className={cn('flex h-8 shrink-0 items-center justify-center', bounds.includes(i + 1) && 'border-e border-border', i === cursor && 'bg-primary/10')} style={{ width: '4rem' }}>
              {row.render(c)}
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}

const OPEN_METEO_ROWS = [
  { label: 'Hours', unit: '' },
  { label: '', unit: '' },
  { label: 'Temperature', unit: '°C' },
  { label: 'Rain', unit: 'mm' },
  { label: 'Rain Chance', unit: '%' },
  { label: 'Wind', unit: 'km/h' },
];

function QmdGrid({ days, cursor }: { days: WeatherDailyRow[]; cursor: number }) {
  const rows: { key: string; render: (d: WeatherDailyRow) => React.ReactNode }[] = [
    { key: 'outlook', render: (d) => <span className={cn('text-caption font-semibold', /rain|storm|thunder/i.test(d.warning) ? 'text-[color:var(--status-error)]' : 'text-foreground')}>{d.warning}</span> },
    { key: 'rain', render: (d) => d.rainMm === undefined ? <span className="text-caption text-muted-foreground">–</span> : <span className="text-caption font-semibold" style={{ color: rainTone(d.rainMm) ?? 'var(--muted-foreground)' }}>{d.rainMm > 0 ? d.rainMm : 0}</span> },
    { key: 'min', render: (d) => <span className="text-caption text-foreground">{d.minC.toFixed(1)}°</span> },
    { key: 'max', render: (d) => <span className="text-caption font-semibold text-foreground">{d.maxC.toFixed(1)}°</span> },
    {
      key: 'range',
      render: (d) => (
        <span aria-hidden className="relative h-1.5 w-16 overflow-hidden rounded-full bg-muted">
          <span
            className="absolute inset-y-0 rounded-full bg-primary"
            style={{
              insetInlineStart: `${Math.max(0, Math.min(100, ((d.minC - 20) / 30) * 100))}%`,
              inlineSize: `${Math.max(6, Math.min(100, ((d.maxC - d.minC) / 30) * 100))}%`,
            }}
          />
        </span>
      ),
    },
  ];
  return (
    <div className="min-w-max" data-slot="weather-forecast-qmd">
      <div className="flex border-b border-border">
        {days.map((d) => (
          <div key={d.date} className="shrink-0 border-e border-border py-1.5 text-center text-caption font-semibold text-foreground" style={{ width: '6.75rem' }}>
            {d.date}
          </div>
        ))}
      </div>
      {rows.map((row) => (
        <div key={row.key} className="flex">
          {days.map((d, i) => (
            <div key={d.date} className={cn('flex h-8 shrink-0 items-center justify-center border-e border-border', i === cursor && 'bg-primary/10')} style={{ width: '6.75rem' }}>
              {row.render(d)}
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}

const QMD_ROWS = [
  { label: 'Official Outlook', unit: '' },
  { label: 'Rain', unit: 'mm' },
  { label: 'Min Temp', unit: '°C' },
  { label: 'Max Temp', unit: '°C' },
  { label: 'Range', unit: '' },
];

/* ── About Location rail ─────────────────────────────────────────────────── */

function AboutLocation({ data }: { data: WeatherForecastPanelData }) {
  const loc = data.location;
  if (!loc) return null;
  const rows: Array<[string, string | undefined]> = [
    ['', loc.coordinates],
    ['Sunrise', loc.sunrise],
    ['Sunset', loc.sunset],
    ['Elevation', loc.elevation],
  ];
  return (
    <div className="w-44 shrink-0 border-s border-border py-3 pl-4 pr-3">
      <div className="mb-2 text-body-sm font-semibold text-foreground">About Location</div>
      <div className="flex flex-col gap-1.5">
        <div className="text-caption font-medium text-foreground">{loc.label}</div>
        {rows.map(([label, value], i) =>
          value ? (
            <div key={i} className="text-caption text-muted-foreground">
              {label ? <>{label}: <span className="font-medium text-foreground">{value}</span></> : value}
            </div>
          ) : null,
        )}
      </div>
    </div>
  );
}

/* ── the panel ───────────────────────────────────────────────────────────── */

export function WeatherForecastPanel({ data, expanded: expandedProp, onExpandedChange, className }: WeatherForecastPanelProps) {
  const [expandedState, setExpandedState] = React.useState(false);
  const expanded = expandedProp !== undefined ? expandedProp : expandedState;
  const setExpanded = (next: boolean) => {
    if (expandedProp === undefined) setExpandedState(next);
    onExpandedChange?.(next);
  };
  const [model, setModel] = React.useState<WeatherForecastModelId>('open-meteo');

  const days = data.openMeteo ?? [];
  const qmd = data.qmd ?? [];
  const isDaily = model === 'qmd';
  const stepCount = isDaily ? qmd.length : days.reduce((n, d) => n + d.hours.length, 0);
  const { cursor, playing, toggle } = useReplay(stepCount);

  const rows = isDaily ? QMD_ROWS : OPEN_METEO_ROWS;
  const empty = isDaily ? qmd.length === 0 : days.length === 0;

  if (!expanded) {
    return (
      <div data-slot="weather-forecast-panel" className={cn('pointer-events-auto flex items-center justify-end gap-2', className)}>
        <RainLegend />
        <ModelTabs model={model} onModel={setModel} expanded={false} onToggle={() => setExpanded(true)} />
      </div>
    );
  }

  return (
    <div data-slot="weather-forecast-panel" className={cn('pointer-events-auto flex w-full flex-col gap-1.5', className)}>
      <div className="flex items-end justify-end gap-2">
        <div className="w-64"><RainLegend /></div>
        <ModelTabs model={model} onModel={setModel} expanded onToggle={() => setExpanded(false)} />
      </div>

      <div className="overflow-hidden rounded-lg border border-border bg-card shadow-md">
        {empty ? (
          <p className="p-6 text-center text-body-sm text-muted-foreground">No {WEATHER_FORECAST_MODEL_LABELS[model]} forecast data for this area.</p>
        ) : (
          <div className="flex">
            <div className="relative w-40 shrink-0 border-e border-border py-1.5 pl-8 pr-1">
              <button
                type="button"
                aria-label="Close forecast panel"
                onClick={() => setExpanded(false)}
                className="absolute left-1 top-1.5 grid size-6 place-items-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring"
              >
                <XClose size={14} />
              </button>
              <div className="flex items-center py-1.5 text-caption font-semibold text-foreground" aria-hidden>
                {isDaily ? '10 Day Outlook' : ' '}
              </div>
              {rows.map((r, i) => <RowLabel key={i} unit={r.unit}>{r.label}</RowLabel>)}
            </div>

            <div className="min-w-0 flex-1 overflow-x-auto py-1.5">
              {isDaily ? <QmdGrid days={qmd} cursor={cursor} /> : <OpenMeteoGrid days={days} cursor={cursor} />}
            </div>

            <AboutLocation data={data} />
          </div>
        )}

        {!empty && (
          <div className="border-t border-border">
            <ReplayBar cursor={cursor} playing={playing} stepCount={stepCount} onToggle={toggle} />
          </div>
        )}
      </div>
    </div>
  );
}

/* ── deterministic Doha seed (same rainy-season flavour Live Monitoring's
 *    demo binds; a deployment would feed a weather API instead) ──────────── */

const DOW = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MON = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const RAIN_SEQ = [0, 0.4, 6.2, 12.5, 2.1, 0, 19, 8.1, 0.2, 1.1, 0, 7.2];

export function buildFloodForecastPanelData(from = new Date()): WeatherForecastPanelData {
  const label = (d: Date) => `${DOW[d.getDay()]} ${String(d.getDate()).padStart(2, '0')} ${MON[d.getMonth()]}`;
  const openMeteo: WeatherForecastDay[] = Array.from({ length: 10 }, (_, i) => {
    const date = new Date(from.getFullYear(), from.getMonth(), from.getDate() + i);
    return {
      day: label(date),
      hours: [8, 14, 20].map((h, k) => {
        const seed = i * 3 + k;
        const rain = RAIN_SEQ[seed % RAIN_SEQ.length];
        return {
          time: `${String(h).padStart(2, '0')}:00`,
          tempC: 24 + ((seed * 7) % 9),
          precipitationMm: rain,
          precipitationChance: rain > 8 ? 80 : rain > 0 ? 45 : (seed * 13) % 20,
          windKmh: 6 + ((seed * 5) % 26),
        };
      }),
    };
  });
  const qmd: WeatherDailyRow[] = Array.from({ length: 10 }, (_, i) => {
    const date = new Date(from.getFullYear(), from.getMonth(), from.getDate() + i);
    const rain = RAIN_SEQ[(i * 2 + 1) % RAIN_SEQ.length];
    return {
      date: label(date),
      warning: rain >= 8 ? 'Storm Warning' : rain > 0 ? 'Rain Expected' : i % 3 === 0 ? 'Hot' : 'Fine',
      minC: 24 + (i % 5),
      maxC: 33 + ((i * 3) % 7),
      rainMm: rain,
    };
  });
  return {
    location: {
      label: 'Doha, Qatar (+03:00)',
      coordinates: '25.285° N, 51.531° E',
      sunrise: '5:12 AM',
      sunset: '5:58 PM',
      elevation: '10 m (33 ft)',
    },
    openMeteo,
    qmd,
  };
}
