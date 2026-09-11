import * as React from 'react';
import {
  SearchMd as Search,
  Plus,
  Minus,
  Target04 as FitAllIcon,
  ChevronLeft,
  ChevronLeftDouble,
  XClose as X,
  Signal01 as SignalIcon,
  RefreshCw02 as RefreshIcon,
  Route as RouteIcon,
  AlertTriangle,
  Wifi,
  MarkerPin01 as PinIcon,
  Maximize02 as ExpandIcon,
  Minimize02 as MinimizeIcon,
  Eye,
  EyeOff,
  FilterFunnel02 as FunnelIcon,
  Check,
  TrendUp01,
  Globe02,
  Target04 as LocateIcon,
  LinkExternal01 as OpenExternalIcon,
  Speedometer04 as SpeedoIcon,
  Home01, InfoOctagon, LayersThree01, Truck01, Clock, Hash02, Droplets01,
  Thermometer01, Cloud01, CloudRaining01,
  Calendar as CalendarIcon, ChevronRight, ChevronDown,
} from '../../icons';

import { Shapes, MapPin, Pencil } from 'lucide-react';
import { cn } from '../utils/cn';
import { Popover, PopoverTrigger, PopoverContent, Skeleton, Tooltip, TooltipProvider, TooltipTrigger, TooltipContent, Checkbox, Switch } from '../primitives';
import { LeafletMap, WeatherForecastWidget, MapAnalyticsPanel, MARKER_STATUS_COLORS } from '../map';
import type { LeafletMapHandle, MapMarker, MapRoute, LatLng, MarkerStatus, AssetMarkerState } from '../map';
import { TripCard } from './trip-card';
import mapLayersThumb from '../../../assets/map-layers-thumb.png';
import basemapSatThumb from '../../../assets/basemap-sat-thumb.jpg';

/** Map the live-monitoring status enum onto the AssetMarker pin states. */
const STATUS_TO_ASSET_STATE: Record<MarkerStatus, AssetMarkerState> = {
  default: 'non-reporting',
  reporting: 'moving',
  stopped: 'stopped',
  critical: 'immobilized',
  warning: 'excess-idling',
  idle: 'idle',
};

/** Mobility label → checkbox-glyph accent for the top-bar vehicle-status
 *  row (Figma 285-37970). MUST stay in lockstep with the tanker map pin's
 *  own accent map (`src/icons/tanker-map-marker.tsx` STATUS_COLOR) so the
 *  filter chips and the pins they control read as one colour system.
 *  Labels not listed here fall back to `MARKER_STATUS_COLORS[status]`. */
const VEH_STATUS_LABEL_COLOR: Record<string, string> = {
  Moving: 'var(--status-success)',
  Stopped: 'var(--status-error)',
  Idling: 'var(--status-warning)',
  'Non-Reporting': 'var(--muted-foreground)',
};
const VEH_STATUS_ORDER = ['Moving', 'Stopped', 'Idling', 'Non-Reporting'];
const vehStatusRank = (label: string) => {
  const i = VEH_STATUS_ORDER.indexOf(label);
  return i === -1 ? VEH_STATUS_ORDER.length : i;
};

/* ── Simulated storm cells ("Rain (simulated)" weather toggle) ──────────────
 * Circles with a solid stroke + 20%-opacity fill, colour-coded by intensity,
 * each carrying a centre chip with the cell's rain level and flood-risk %. */

/** Intensity → colour: light < 10 mm/hr blue, moderate 10–19 amber, heavy ≥ 20 red. */
const rainCellColor = (mmHr: number) =>
  mmHr >= 20 ? '#F04438' : mmHr >= 10 ? '#F79009' : '#0072D6'; // coherence-allow — marker DATA colours (== status-error / status-warning / primary)

/** Circle polygon around a centre at `radiusM` metres (44 segments). */
function rainCellRing(c: LatLng, rM: number): LatLng[] {
  const [lat, lng] = c;
  const dLat = rM / 111320;
  const dLng = rM / (111320 * Math.cos((lat * Math.PI) / 180));
  return Array.from({ length: 44 }, (_, i) => {
    const a = (i / 44) * 2 * Math.PI;
    return [lat + dLat * Math.sin(a), lng + dLng * Math.cos(a)] as LatLng;
  });
}

/** Centre chip — white rounded card, intensity-coloured border: rain level on
 *  the first line, flood risk on the second. Rendered as an SVG data-uri so
 *  it rides the map as a plain marker icon. */
function rainCellChipDataUri(rainMmHr: number, floodRiskPct: number, color: string): string {
  const w = 122;
  const h = 42;
  const svg =
    `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">` +
    `<rect x="1" y="1" width="${w - 2}" height="${h - 2}" rx="8" fill="#ffffff" fill-opacity="0.95" stroke="${color}" stroke-width="1.5"/>` +
    `<text x="12" y="17" font-family="system-ui,sans-serif" font-size="11" font-weight="700" fill="#101828">⛆ ${rainMmHr} mm/hr</text>` +
    `<text x="12" y="33" font-family="system-ui,sans-serif" font-size="10" font-weight="600" fill="${color}">Flood risk ${floodRiskPct}%</text>` +
    `</svg>`;
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}

/* ── Date-range filter (Tadweer Figma 4123-32174 field · 4123-32264 picker) ──
 * Preset rail (Today / Yesterday / This week / …) + month calendar with range
 * selection, Cancel/Apply footer. Colours come from DS tokens (C&C maroon
 * primary), not the source file's green. */

export interface DateRange { from: Date; to: Date; label: string }

const DAY_MS = 86400000;
const startOfDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate());
const fmtDay = (d: Date) => d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });

/** Preset ranges, computed relative to "now" at open time. */
function dateRangePresets(now: Date): { id: string; label: string; from: Date; to: Date }[] {
  const today = startOfDay(now);
  const dow = (today.getDay() + 6) % 7; // Monday-first weekday index
  const weekStart = new Date(today.getTime() - dow * DAY_MS);
  const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);
  const yearStart = new Date(today.getFullYear(), 0, 1);
  return [
    { id: 'today', label: 'Today', from: today, to: today },
    { id: 'yesterday', label: 'Yesterday', from: new Date(today.getTime() - DAY_MS), to: new Date(today.getTime() - DAY_MS) },
    { id: 'this-week', label: 'This week', from: weekStart, to: today },
    { id: 'last-week', label: 'Last week', from: new Date(weekStart.getTime() - 7 * DAY_MS), to: new Date(weekStart.getTime() - DAY_MS) },
    { id: 'this-month', label: 'This month', from: monthStart, to: today },
    { id: 'last-month', label: 'Last month', from: new Date(today.getFullYear(), today.getMonth() - 1, 1), to: new Date(monthStart.getTime() - DAY_MS) },
    { id: 'this-year', label: 'This year', from: yearStart, to: today },
    { id: 'last-year', label: 'Last year', from: new Date(today.getFullYear() - 1, 0, 1), to: new Date(yearStart.getTime() - DAY_MS) },
  ];
}

/** The two-pane picker: preset rail · calendar · Cancel/Apply. */
function DateRangePicker({ value, onApply, onCancel }: { value: DateRange | null; onApply: (r: DateRange | null) => void; onCancel: () => void }) {
  const today = startOfDay(new Date());
  const presets = React.useMemo(() => dateRangePresets(today), []); // eslint-disable-line react-hooks/exhaustive-deps
  const [from, setFrom] = React.useState<Date | null>(value?.from ?? null);
  const [to, setTo] = React.useState<Date | null>(value?.to ?? null);
  const [preset, setPreset] = React.useState<string | null>(null);
  const [view, setView] = React.useState(() => new Date((value?.from ?? today).getFullYear(), (value?.from ?? today).getMonth(), 1));

  const pickDay = (d: Date) => {
    setPreset('custom');
    if (!from || (from && to)) { setFrom(d); setTo(null); return; }
    if (d.getTime() < from.getTime()) { setTo(from); setFrom(d); } else setTo(d);
  };
  const applyPreset = (p: { id: string; label: string; from: Date; to: Date }) => {
    setPreset(p.id); setFrom(p.from); setTo(p.to);
    setView(new Date(p.from.getFullYear(), p.from.getMonth(), 1));
  };

  // 6-week grid, Monday-first, spilling into prev/next month like the Figma.
  const monthFirst = new Date(view.getFullYear(), view.getMonth(), 1);
  const gridStart = new Date(monthFirst.getTime() - (((monthFirst.getDay() + 6) % 7)) * DAY_MS);
  const days = Array.from({ length: 42 }, (_, i) => new Date(gridStart.getTime() + i * DAY_MS));
  const inRange = (d: Date) => from && to && d.getTime() > from.getTime() && d.getTime() < to.getTime();
  const isEnd = (d: Date) => (from && d.getTime() === from.getTime()) || (to && d.getTime() === to.getTime());

  const railBtn = (id: string, label: string, onClick: () => void) => (
    <button
      key={id}
      type="button"
      onClick={onClick}
      className={cn(
        'w-full whitespace-nowrap rounded-md px-3 py-2 text-left text-body-sm transition-colors',
        preset === id ? 'bg-secondary font-semibold text-primary' : 'text-foreground hover:bg-muted',
      )}
    >
      {label}
    </button>
  );

  return (
    <div className="flex w-[400px] flex-col">
      <div className="flex min-h-0">
        {/* Preset rail */}
        <div className="flex w-[124px] shrink-0 flex-col gap-0.5 border-e border-border p-2">
          {railBtn('custom', 'Custom Date', () => setPreset('custom'))}
          {presets.map((p) => railBtn(p.id, p.label, () => applyPreset(p)))}
        </div>
        {/* Calendar */}
        <div className="flex min-w-0 flex-1 flex-col p-3">
          <div className="mb-2 flex items-center justify-between">
            <div className="flex flex-1 items-center justify-between pe-3">
              <button type="button" aria-label="Previous month" onClick={() => setView(new Date(view.getFullYear(), view.getMonth() - 1, 1))} className="grid size-6 place-items-center rounded text-muted-foreground hover:bg-muted hover:text-foreground"><ChevronLeft size={14} /></button>
              <span className="text-body-sm font-semibold text-foreground">{view.toLocaleDateString('en-GB', { month: 'long' })}</span>
              <button type="button" aria-label="Next month" onClick={() => setView(new Date(view.getFullYear(), view.getMonth() + 1, 1))} className="grid size-6 place-items-center rounded text-muted-foreground hover:bg-muted hover:text-foreground"><ChevronRight size={14} /></button>
            </div>
            <div className="flex items-center gap-1">
              <button type="button" aria-label="Previous year" onClick={() => setView(new Date(view.getFullYear() - 1, view.getMonth(), 1))} className="grid size-6 place-items-center rounded text-muted-foreground hover:bg-muted hover:text-foreground"><ChevronLeft size={14} /></button>
              <span className="text-body-sm font-semibold text-foreground">{view.getFullYear()}</span>
              <button type="button" aria-label="Next year" onClick={() => setView(new Date(view.getFullYear() + 1, view.getMonth(), 1))} className="grid size-6 place-items-center rounded text-muted-foreground hover:bg-muted hover:text-foreground"><ChevronRight size={14} /></button>
            </div>
          </div>
          <div className="grid grid-cols-7">
            {['Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa', 'Su'].map((d) => (
              <span key={d} className="grid h-8 place-items-center text-caption font-semibold text-foreground">{d}</span>
            ))}
            {days.map((d) => {
              const outside = d.getMonth() !== view.getMonth();
              const end = isEnd(d);
              const mid = inRange(d);
              return (
                <button
                  key={d.getTime()}
                  type="button"
                  onClick={() => pickDay(d)}
                  className={cn(
                    'relative grid h-8 place-items-center text-caption transition-colors',
                    mid && 'bg-muted',
                    end ? 'z-10' : 'hover:bg-muted',
                    outside ? 'text-muted-foreground/50' : 'text-foreground',
                  )}
                >
                  <span className={cn('grid size-7 place-items-center rounded-full', end && 'bg-primary font-semibold text-primary-foreground')}>
                    {d.getDate()}
                  </span>
                  {d.getTime() === today.getTime() && !end ? <span aria-hidden className="absolute bottom-0.5 size-1 rounded-full bg-primary" /> : null}
                </button>
              );
            })}
          </div>
        </div>
      </div>
      {/* Footer */}
      <div className="flex items-center justify-end gap-2 border-t border-border px-3 py-2.5">
        <button type="button" onClick={onCancel} className="rounded-md px-3 py-1.5 text-body-sm font-semibold text-foreground hover:bg-muted">Cancel</button>
        <button
          type="button"
          disabled={!from}
          onClick={() => {
            if (!from) return;
            const end = to ?? from;
            const presetDef = presets.find((p) => p.id === preset);
            const label = presetDef ? presetDef.label : from.getTime() === end.getTime() ? fmtDay(from) : `${fmtDay(from)} – ${fmtDay(end)}`;
            onApply({ from, to: end, label });
          }}
          className="rounded-md bg-primary px-4 py-1.5 text-body-sm font-semibold text-primary-foreground transition-opacity hover:opacity-90 disabled:opacity-50"
        >
          Apply
        </button>
      </div>
    </div>
  );
}

/** Deterministic per-entity "last activity" date the date filter matches
 *  against: live/reporting entities count as today; everything else is
 *  pushed 1–6 days back by an id hash (stable across renders/reloads). */
function entityActivityDate(e: MonitoringEntity, today: Date): Date {
  if (e.live) return today;
  let h = 0;
  for (let i = 0; i < e.id.length; i++) h = (h * 31 + e.id.charCodeAt(i)) | 0;
  return new Date(today.getTime() - (1 + (Math.abs(h) % 6)) * DAY_MS);
}

/** Station temperature → dot colour (demo "Stations — by temp" layer). */
const stationTempColor = (tempC: number) =>
  tempC >= 43 ? '#B42318' : tempC >= 40 ? '#F04438' : tempC >= 37 ? '#F79009' : '#12B76A'; // coherence-allow — marker DATA colours (error-700 / error / warning / success)

/** Weather-station dot marker: temp-coloured circle with the °C reading. */
function stationDotDataUri(tempC: number): string {
  const color = stationTempColor(tempC);
  const svg =
    `<svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 28 28">` +
    `<circle cx="14" cy="14" r="12" fill="${color}" stroke="#ffffff" stroke-width="2.5"/>` +
    `<text x="14" y="18" text-anchor="middle" font-family="system-ui,sans-serif" font-size="10" font-weight="700" fill="#ffffff">${tempC}°</text>` +
    `</svg>`;
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}

/** Precipitation (mm, last hour) → blue-scale fill. */
const precipColor = (mm: number) =>
  mm >= 20 ? '#1D4ED8' : mm >= 10 ? '#3B82F6' : mm >= 5 ? '#60A5FA' : '#93C5FD'; // coherence-allow — marker DATA blues (precip scale)

/** Base-map visual styles selectable from the Map Layers popover (FAMS Web
 *  Portal Figma 34235-7347: a strip of style thumbnails, selected = primary
 *  border). `style` feeds MapView's `styleUrl` (live-swappable — a Carto GL
 *  style URL, or an inline raster style for satellite); `thumb` is one fixed
 *  Qatar-area tile (z6 x41 y27) from the same cartography so each swatch
 *  previews its real look. Grey (Carto Positron) is the DS default basemap. */
const ESRI_SATELLITE_STYLE = {
  version: 8,
  // Carto-hosted glyphs so symbol layers (cluster counts) keep working on
  // the raster style, which ships none of its own.
  glyphs: 'https://tiles.basemaps.cartocdn.com/fonts/{fontstack}/{range}.pbf',
  sources: {
    sat: {
      type: 'raster',
      tiles: ['https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}'],
      tileSize: 256,
      attribution: 'Esri, Maxar, Earthstar Geographics',
    },
  },
  layers: [{ id: 'sat', type: 'raster', source: 'sat' }],
} as const;

// Thumbs are LOCAL assets (Carto's raster tile endpoints reject hotlinked
// requests with "API KEY REQUIRED" placeholder tiles): grey/colored/dark all
// derive from the committed colored map thumb via a CSS filter.
const BASEMAPS: { id: string; label: string; style: string | Record<string, unknown>; thumb: string; thumbFilter?: string }[] = [
  {
    id: 'grey',
    label: 'Grey',
    style: 'https://basemaps.cartocdn.com/gl/positron-gl-style/style.json',
    thumb: mapLayersThumb,
    thumbFilter: 'grayscale(1) brightness(1.12)',
  },
  {
    id: 'colored',
    label: 'Colored',
    style: 'https://basemaps.cartocdn.com/gl/voyager-gl-style/style.json',
    thumb: mapLayersThumb,
  },
  {
    id: 'dark',
    label: 'Dark',
    style: 'https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json',
    thumb: mapLayersThumb,
    thumbFilter: 'grayscale(1) invert(0.9) brightness(0.85)',
  },
  {
    id: 'satellite',
    label: 'Satellite',
    style: ESRI_SATELLITE_STYLE as unknown as Record<string, unknown>,
    thumb: basemapSatThumb,
  },
];
import type { MonitoringModuleData, MonitoringEntity, MonitoringZone, MonitoringPoi, DetailDescriptor } from './types';

/**
 * LiveMonitoringView — the platform's real Live Monitoring surface, adapted
 * from the EAD RMS fleet console + the Cement delivery tracker:
 *
 *   ┌───────────────────┬──────────────────────────────────────┐
 *   │ Vehicles      ⌃   │  live badge              [fit][zoom]  │
 *   │ search…           │                                       │
 *   │ ● Moving 5  …     │            M A P  (markers + route)    │
 *   │ ─────────────     │                                       │
 *   │ [pin] Z-7764  …   │        ┌─ tracking popup ─┐           │
 *   │ [pin] Z-7765  …   │        │ telemetry / events │          │
 *   │ …                 │        └────────────────────┘          │
 *   │                   │  ● legend          [+/-] zoom         │
 *   └───────────────────┴──────────────────────────────────────┘
 *
 * A searchable, status-badged fleet list on the left drives the map (click a
 * row → fly to it); clicking a marker opens a telemetry popup that drills into
 * the standard EntityDetail. Routes draw as polylines (optionally OSRM road
 * geometry). Falls back gracefully to the legacy `markers` contract.
 */

/** Semantic tone → CSS color var, for the additive `telemetry`/`devices`
 *  `tone` fields (Overview field values / Devices table VALUE column). */
const TONE_COLOR: Record<'success' | 'warning' | 'error', string> = {
  success: 'var(--status-success)',
  warning: 'var(--status-warning)',
  error: 'var(--status-error)',
};

const STATUS_HEX: Record<string, string> = {
  default: '#0072D6', // coherence-allow — map-engine status→hex bridge
  reporting: '#12B76A', // coherence-allow — map-engine status→hex bridge
  stopped: '#D92D20', // coherence-allow — map-engine status→hex bridge
  critical: '#F04438', // coherence-allow — map-engine status→hex bridge
  warning: '#F79009', // coherence-allow — map-engine status→hex bridge
  idle: '#98A2B3', // coherence-allow — map-engine status→hex bridge
};

/** Normalise legacy `markers` into entities so the view has one code path. */
function deriveEntities(data: MonitoringModuleData): MonitoringEntity[] {
  if (data.entities?.length) return data.entities;
  return (data.markers ?? []).map((m: MapMarker) => ({
    id: m.id,
    position: m.position,
    status: m.status ?? 'default',
    kind: m.kind ?? 'dot',
    live: m.live,
    title: m.tooltip ?? m.id,
    tooltip: m.tooltip,
  }));
}


/* ── Incidents-style map control tile + tooltip (dark pill, arrow, left) ── */
const LmCtlBtn = React.forwardRef<HTMLButtonElement, React.ButtonHTMLAttributes<HTMLButtonElement> & { label: string; active?: boolean }>(
  function LmCtlBtn({ label, active, children, ...rest }, ref) {
    return (
      <button
        ref={ref}
        type="button"
        aria-label={label}
        aria-pressed={active}
        className={cn(
          'grid size-9 place-items-center rounded-lg border border-border shadow-sm transition-colors focus-visible:ring-2 focus-visible:ring-ring',
          active ? 'bg-primary text-primary-foreground' : 'bg-card text-muted-foreground hover:bg-muted hover:text-foreground',
        )}
        {...rest}
      >
        {children}
      </button>
    );
  },
);
function LmTipBtn({ label, active, onClick, children }: { label: string; active?: boolean; onClick?: () => void; children: React.ReactNode }) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <LmCtlBtn label={label} active={active} onClick={onClick}>{children}</LmCtlBtn>
      </TooltipTrigger>
      <TooltipContent side="left">{label}</TooltipContent>
    </Tooltip>
  );
}

/* ── on-map telemetry popup ───────────────────────────────────────────── */

function TrackingPopup({
  entity,
  onClose,
  onOpenDetail,
  onLocate,
}: {
  entity: MonitoringEntity;
  onClose: () => void;
  onOpenDetail?: (d: DetailDescriptor) => void;
  /** Re-center the map on this entity (the popup header's locate crosshair). */
  onLocate?: () => void;
}) {
  const color = STATUS_HEX[entity.status] ?? STATUS_HEX.default;
  // Build the tab set from whatever data the entity provides (EAD's
  // Overview / Critical Events / Trips / Devices).
  const tabs = [
    { id: 'overview', label: 'Overview' },
    ...(entity.events?.length ? [{ id: 'events', label: `Critical Events (${entity.events.length})` }] : []),
    ...(entity.shifts?.length ? [{ id: 'shifts', label: 'Shifts' }] : []),
    ...(entity.trips?.length ? [{ id: 'trips', label: 'Trips' }] : []),
    ...(entity.devices?.length ? [{ id: 'devices', label: 'Devices' }] : []),
  ];
  const [tab, setTab] = React.useState('overview');
  const [latestOnly, setLatestOnly] = React.useState(false);
  const active = tabs.some((t) => t.id === tab) ? tab : 'overview';
  const canDrill = !!(entity.toDetail && onOpenDetail);
  return (
    <div className="w-[460px] overflow-hidden rounded-xl border border-border bg-card shadow-[0_16px_32px_0_rgba(16,24,40,0.14),0_4px_8px_0_rgba(16,24,40,0.06)]">
      {/* Header — reference vehicle popup (Figma FAMS V5 Launch Pad · 514-5961):
          larger thumbnail + name/identity meta + top-right action group +
          status pill. Larger padding + rounded-xl chassis so the widget
          reads as a lifted card, not a note. */}
      <div className="flex items-start gap-3 border-b border-border px-4 pb-3.5 pt-4">
        {entity.image ? (
          // Slot proportioned to the tanker artwork (~44×30 native) so
          // `object-contain` doesn't leave large empty margins that push
          // the title behind the image at popup widths — matches the
          // Figma popup thumbnail proportions.
          <img src={entity.image} alt="" loading="lazy" className="h-10 w-12 shrink-0 rounded-md object-contain" />
        ) : null}
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            {canDrill ? (
              <button
                type="button"
                onClick={() => onOpenDetail!(entity.toDetail!())}
                className="truncate text-left text-body-md font-bold leading-tight text-foreground outline-none hover:text-primary hover:underline"
              >
                {entity.title}
              </button>
            ) : (
              <div className="truncate text-body-md font-bold leading-tight text-foreground">{entity.title}</div>
            )}
            <div className="flex shrink-0 items-center gap-0.5">
              {onLocate ? (
                <button
                  type="button"
                  aria-label="Locate on map"
                  onClick={onLocate}
                  className="grid size-7 place-items-center rounded-full text-primary transition-colors hover:bg-muted"
                >
                  <LocateIcon size={15} />
                </button>
              ) : null}
              {canDrill ? (
                <button
                  type="button"
                  aria-label="Open detail view"
                  onClick={() => onOpenDetail!(entity.toDetail!())}
                  className="grid size-7 place-items-center rounded-full text-muted-foreground transition-colors hover:bg-muted hover:text-primary"
                >
                  <OpenExternalIcon size={14} />
                </button>
              ) : null}
              <button
                type="button"
                aria-label="Close"
                onClick={onClose}
                className="grid size-7 place-items-center rounded-full text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
              >
                <X size={14} />
              </button>
            </div>
          </div>
          {/* Identity meta row (plate · driver · location), or the plain subtitle. */}
          {entity.headerMeta?.length ? (
            <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-caption text-muted-foreground">
              {entity.headerMeta.map((m, i) => (
                <span key={i} className="flex min-w-0 items-center gap-1">
                  {m.icon ? <span className="shrink-0">{m.icon}</span> : null}
                  <span className="truncate">{m.text}</span>
                </span>
              ))}
            </div>
          ) : entity.subtitle ? (
            <div className="mt-1 truncate text-caption text-muted-foreground">{entity.subtitle}</div>
          ) : null}
          {/* Status pill — solid tinted background + colored dot + optional
              "since {duration}" muted suffix. Kept in the header column so
              it aligns with the identity meta above it. */}
          <div className="mt-2 inline-flex items-center gap-1.5 rounded-full px-2 py-0.5" style={{ background: `color-mix(in srgb, ${color} 12%, transparent)` }}>
            <span aria-hidden className="size-2 rounded-full" style={{ background: color }} />
            <span className="text-caption font-semibold" style={{ color }}>
              {entity.statusLabel ?? entity.status}
            </span>
            {entity.since ? <span className="text-caption font-medium text-muted-foreground">· since {entity.since}</span> : null}
          </div>
        </div>
      </div>

      {/* Tabs */}
      {tabs.length > 1 ? (
        <div className="flex gap-5 overflow-x-auto border-b border-border px-4 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden" role="tablist">
          {tabs.map((t) => (
            <button
              key={t.id}
              type="button"
              role="tab"
              aria-selected={active === t.id}
              onClick={() => setTab(t.id)}
              className={cn(
                '-mb-px whitespace-nowrap border-b-2 py-2.5 text-body-sm font-semibold outline-none transition-colors',
                active === t.id ? 'border-primary text-primary' : 'border-transparent text-muted-foreground hover:text-foreground'
              )}
            >
              {t.label}
            </button>
          ))}
        </div>
      ) : null}

      {/* Body */}
      <div className="max-h-[288px] overflow-auto px-4 py-3.5">
        {active === 'overview' ? (
          entity.telemetry?.length ? (
            // Figma 518:78773 popup Overview: 3-column icon+label+value grid.
            <div className="grid grid-cols-3 gap-x-4 gap-y-3.5">
              {entity.telemetry.map((f, i) => (
                <div key={i} className="flex min-w-0 items-start gap-2">
                  {f.icon ? <span className="mt-0.5 shrink-0 text-muted-foreground">{f.icon}</span> : null}
                  {/* `min-w-0 flex-1` lets the value expand to the full
                      grid-cell width so ReactNode values (e.g. the shared
                      `FillCell` progress bar used for Fill Level) can
                      stretch — without it a flex-based value collapses to
                      just its non-flex content (bar → 0 width). */}
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-[10px] font-bold uppercase tracking-[0.06em] text-muted-foreground">{f.label}</div>
                    <div className="mt-0.5 text-caption font-semibold leading-tight" style={{ color: f.tone ? TONE_COLOR[f.tone] : 'var(--foreground)' }}>{f.value}</div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="py-2 text-caption text-muted-foreground">No telemetry available.</div>
          )
        ) : active === 'events' ? (
          <div className="flex flex-col">
            {entity.events!.map((e, i, arr) => {
              const sc = e.severity === 'error' ? '#F04438' : e.severity === 'warning' ? '#F79009' : '#0072D6'; // coherence-allow — map-engine status→hex bridge
              return (
                <div key={e.id} className={cn('flex items-center justify-between gap-2 py-2', i < arr.length - 1 && 'border-b border-border')}>
                  <span className="flex min-w-0 items-center gap-2">
                    <span aria-hidden className="size-1.5 shrink-0 rounded-full" style={{ background: sc }} />
                    <span className="truncate text-caption font-medium text-foreground">{e.title}</span>
                  </span>
                  {e.meta ? <span className="shrink-0 text-caption text-muted-foreground">{e.meta}</span> : null}
                </div>
              );
            })}
          </div>
        ) : active === 'shifts' ? (
          <div className="flex flex-col">
            {entity.shifts!.map((s, i, arr) => (
              <div key={s.id} className={cn('flex items-center justify-between gap-2 py-2', i < arr.length - 1 && 'border-b border-border')}>
                <span className="flex min-w-0 flex-col">
                  <span className="truncate text-caption font-semibold text-foreground">
                    {s.date}
                    {s.time ? <span className="font-normal text-muted-foreground"> · {s.time}</span> : null}
                  </span>
                  {s.label ? <span className="truncate text-caption text-muted-foreground">{s.label}</span> : null}
                </span>
                {s.meta ? <span className="shrink-0 text-caption font-medium text-foreground">{s.meta}</span> : null}
              </div>
            ))}
          </div>
        ) : active === 'trips' ? (
          <div className="flex flex-col gap-2.5">
            {/* Summary metrics + show-latest toggle (EAD Trips tab) */}
            {entity.tripSummary ? (
              <div className="flex items-center gap-4 border-b border-border pb-2">
                {entity.tripSummary.distance != null ? (
                  <span className="flex flex-col">
                    <span className="text-caption uppercase tracking-wide text-muted-foreground">Distance</span>
                    <span className="text-caption font-semibold text-primary">{entity.tripSummary.distance}</span>
                  </span>
                ) : null}
                {entity.tripSummary.trips != null ? (
                  <span className="flex flex-col">
                    <span className="text-caption uppercase tracking-wide text-muted-foreground">Trips</span>
                    <span className="text-caption font-semibold text-foreground">{entity.tripSummary.trips}</span>
                  </span>
                ) : null}
                {entity.tripSummary.duration != null ? (
                  <span className="flex flex-col">
                    <span className="text-caption uppercase tracking-wide text-muted-foreground">Duration</span>
                    <span className="text-caption font-semibold text-foreground">{entity.tripSummary.duration}</span>
                  </span>
                ) : null}
              </div>
            ) : null}
            <button
              type="button"
              onClick={() => setLatestOnly((v) => !v)}
              className="flex items-center gap-1.5 text-caption font-medium text-muted-foreground outline-none hover:text-foreground"
            >
              <span className={cn('grid size-3.5 place-items-center rounded border', latestOnly ? 'border-primary bg-primary text-primary-foreground' : 'border-border')}>
                {latestOnly ? '✓' : ''}
              </span>
              Show latest trip only
            </button>
            {(latestOnly ? entity.trips!.slice(0, 1) : entity.trips!).map((t) => (
              <div key={t.id} className="border-l-2 border-primary/60 pl-2.5">
                <div className="flex items-baseline gap-2">
                  {t.time ? <span className="text-caption font-semibold text-foreground">{t.time}</span> : null}
                  <span className="truncate text-caption text-foreground">{t.destination}</span>
                </div>
                <div className="mt-0.5 flex gap-3 text-caption text-muted-foreground">
                  {t.distance ? <span>{t.distance}</span> : null}
                  {t.duration ? <span>{t.duration}</span> : null}
                </div>
              </div>
            ))}
          </div>
        ) : entity.devices!.some((d) => d.imei != null) ? (
          // Fuller EAD-style DEVICE NAME / IMEI / DATA REC / VALUE table —
          // only rendered when at least one row opts in via `imei` (additive).
          <div className="flex flex-col">
            <div className="grid grid-cols-[1.4fr_1fr_0.8fr_0.9fr] gap-2 border-b border-border pb-1.5 text-caption font-semibold uppercase tracking-wide text-muted-foreground/70">
              <span>Device Name</span>
              <span>IMEI</span>
              <span>Data Rec</span>
              <span className="text-right">Value</span>
            </div>
            {entity.devices!.map((d, i, arr) => (
              <div key={d.id} className={cn('grid grid-cols-[1.4fr_1fr_0.8fr_0.9fr] items-center gap-2 py-2', i < arr.length - 1 && 'border-b border-border')}>
                <span className="truncate text-caption font-medium text-foreground">{d.name}</span>
                <span className="truncate text-caption text-muted-foreground">{d.imei ?? '—'}</span>
                <span className="truncate text-caption text-muted-foreground">{d.dataRec ?? '—'}</span>
                <span className="truncate text-right text-caption font-semibold" style={{ color: d.tone ? TONE_COLOR[d.tone] : 'var(--foreground)' }}>
                  {d.value ?? d.meta ?? '—'}
                </span>
              </div>
            ))}
          </div>
        ) : (
          <div className="flex flex-col">
            {entity.devices!.map((d, i, arr) => (
              <div key={d.id} className={cn('flex items-center justify-between gap-2 py-2', i < arr.length - 1 && 'border-b border-border')}>
                <span className="truncate text-caption font-medium text-foreground">{d.name}</span>
                {d.meta ? <span className="shrink-0 text-caption text-muted-foreground">{d.meta}</span> : null}
              </div>
            ))}
          </div>
        )}
      </div>

    </div>
  );
}

/* ── list skeleton (loading state) ────────────────────────────────────── */

function FleetListSkeleton() {
  return (
    <div className="flex flex-col">
      {Array.from({ length: 12 }).map((_, i) => (
        <div key={i} className="flex items-center gap-2.5 border-b border-border px-3 py-2.5">
          <Skeleton className="size-9 shrink-0 rounded-full" />
          <div className="flex min-w-0 flex-1 flex-col gap-1.5">
            <Skeleton className="h-2.5 w-1/2" />
            <Skeleton className="h-2 w-2/3" />
          </div>
          <Skeleton className="h-2.5 w-10 shrink-0" />
        </div>
      ))}
    </div>
  );
}

/** Trip-card list variant's loading preview — mirrors `TripCard`'s 3-row shape
 *  (id/date/status · vehicle+driver · multi-leg progress) so the trip list
 *  doesn't jump from a generic fleet-row skeleton into a differently-shaped
 *  card once data arrives (Trip Management Pass 1 punch list #4). */
function TripCardSkeleton() {
  return (
    <div className="mx-2 my-1.5 flex flex-col gap-2 rounded-lg border border-border bg-card p-3">
      <div className="flex items-center justify-between gap-2">
        <Skeleton className="h-3 w-24" />
        <div className="flex items-center gap-2">
          <Skeleton className="h-3 w-16" />
          <Skeleton className="h-4 w-14 rounded-full" />
        </div>
      </div>
      <div className="flex items-center gap-2">
        <Skeleton className="size-6 shrink-0 rounded" />
        <Skeleton className="h-3 w-10" />
        <Skeleton className="size-6 shrink-0 rounded-full" />
        <Skeleton className="h-3 w-16" />
      </div>
      <div className="flex items-center gap-1">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-1.5 flex-1 rounded-full" />
        ))}
      </div>
    </div>
  );
}

function TripListSkeleton() {
  return (
    <div className="flex flex-col">
      {Array.from({ length: 6 }).map((_, i) => (
        <TripCardSkeleton key={i} />
      ))}
    </div>
  );
}

/* ── fleet list (flood-ops rebuild) ───────────────────────────────────
 *
 * Rebuilt for flood-management Live Monitoring where the four things the
 * C&C actually reads at a glance are:
 *
 *   1) VEHICLE      — composite thumbnail + plate + driver
 *   2) FILL LEVEL   — big threshold-coloured bar + percentage; the water
 *                     load IS the flood-ops signal (can this tanker still
 *                     make the next black spot?)
 *   3) STATUS       — mobility pill (Moving / Stopped / Idling / …)
 *   4) ASSIGNMENT   — the task/incident it's on, or "Free"
 *
 * A single CSS Grid template (`FLEET_GRID`) is shared by the header and
 * every row so columns line up column-for-column — the flex + flex-1
 * shape it replaced let per-row content drift the column edges apart.
 */

/** Which optional list columns are shown (Vehicle is always shown).
 *  Mobility status is displayed via the vehicle thumbnail's status ring,
 *  so there is no separate Status column. Column order (flood-ops
 *  adaptation of Figma 518:6970 + the FAMS Web Portal list-view table,
 *  911-19095): Vehicle · Fill Level · Activity · Speed · Timestamp ·
 *  Fuel Type · Vehicle ID · Asset Type. The Web Portal table's own
 *  columns were Title/Speed/Timestamp/Fuel Type/Vehicle ID/Asset Type —
 *  Fuel Type, Vehicle ID and Asset Type are adopted here (flood-relevant:
 *  which tankers run on what fuel, their fleet ID, and tanker/support
 *  vehicle type), Fill Level + Activity stay as the flood-ops-critical
 *  additions the Web Portal table doesn't have. */
interface FleetCols {
  fill: boolean;
  activity: boolean;
  speed: boolean;
  timestamp: boolean;
  fuelType: boolean;
  vehicleId: boolean;
  assetType: boolean;
}

/** Column keys in header/row render order (after the always-on Vehicle
 *  column, before the edit pencil). Per user feedback, the whole table
 *  (header + rows) is now ONE plain horizontally scrollable grid — no more
 *  sticky/pinned "3 main columns" or a separate panel-width "expand" mode;
 *  when the visible columns overflow the panel, the user just scrolls. */
type ColKey = 'fill' | 'activity' | 'speed' | 'timestamp' | 'fuelType' | 'vehicleId' | 'assetType';
// Fill Level leads (renders right after Vehicle — its required 2nd slot),
// then Speed · Timestamp · Activity Overview match Figma 275-97176's own
// header order exactly; Fuel Type / Vehicle ID / Asset Type are this
// module's own flood-ops additions, appended after.
const COL_ORDER: ColKey[] = ['fill', 'speed', 'timestamp', 'activity', 'fuelType', 'vehicleId', 'assetType'];
// Widths for Vehicle/Speed/Timestamp/Activity match the Flood Management
// file's own left-panel table exactly (275-97176: Name 119 · Primary User
// [Speed] 78 · Total Devices [Timestamp] 86 · Total Devices [Activity] 130).
// Fuel Type / Vehicle ID / Asset Type (this module's own flood-ops columns,
// not in that Figma frame) keep their existing widths.
// Fill Level was 96 — measured (via getBoundingClientRect in-browser, not
// just the grid math) to genuinely overflow: the cell's own content area is
// 84px (96 minus the shared `pl-3` inter-column inset), but the 64px bar +
// 8px internal gap + percentage text (up to ~28px for "100%") needs ~100px,
// so the "%" text rendered ~10px past its own cell's right edge — directly
// into Speed's leading `pl-3` padding, leaving under 2px of clear space
// before "72%" visually touched "62 km/h". 136 gives the worst-case content
// (~112px incl. its own extra `pr-3` safety pad below) a clear ≥12px margin
// before the next column, verified by re-measuring the same rects after
// the fix (see the FillCell-rendering row, below).
const COL_WIDTH: Record<ColKey, number> = { fill: 136, activity: 145, speed: 78, timestamp: 86, fuelType: 72, vehicleId: 84, assetType: 118 };
const VEHICLE_COL_WIDTH = 119;
const EDIT_COL_WIDTH = 26;

/** Build one grid-template-columns string, shared by the header and every
 *  row so labels + cells line up column-for-column as the shared scroll
 *  container (see the view body) scrolls them horizontally in sync. */
function buildFleetCols(cols: FleetCols, gate: Partial<Record<ColKey, boolean>>) {
  const visible = COL_ORDER.filter((k) => (gate[k] ?? true) && cols[k]).map((key) => ({ key, width: COL_WIDTH[key] }));
  const template = `${VEHICLE_COL_WIDTH}px ${visible.map((c) => `${c.width}px`).join(' ')} ${EDIT_COL_WIDTH}px`.trim();
  return { visible, template };
}

/** Fill-level → semantic token (>60 success, 30–60 warning, <30 error). */
function fillColor(v: number): string {
  if (v > 60) return 'var(--status-success)';
  if (v >= 30) return 'var(--status-warning)';
  return 'var(--status-error)';
}

/** Threshold-coloured bar + right-aligned bold percentage on one baseline.
 *  4 px between the bar and the number per DS spec — keeps them reading as
 *  one atom while the neighbouring ASSIGNMENT column stays visually
 *  separated (via FLEET_GRID's per-column left inset). Exported so the
 *  vehicle popup (`TrackingPopup` Overview tab) can render Fill Level with
 *  the same atom as the fleet-list row — one UI for both places, no
 *  drift. */
/** Figma 278-37413 (Flood Management, exact spec): a FIXED 64×8 px pill
 *  track (rounded-[18px], `--neutral-lighter`/#EAECF0 background) with a
 *  proportional fill, 8px gap, then a caption/medium (10px) percentage —
 *  not the bar-fills-the-column / bold-number style this replaces. Colour
 *  still follows our own flood-ops fill threshold (>60 success, 30–60
 *  warning, <30 error) rather than Figma's flat success-green sample —
 *  keeping that signal is the whole reason this column exists. */
export function FillCell({ value }: { value: number }) {
  const clamped = Math.max(0, Math.min(100, value));
  return (
    // `pr-3` is a second, independent guard against the bar+text touching
    // whatever sits to the right (the fleet-row grid's `[&>*+*]:pl-3` gives
    // the NEXT column its own leading inset, which only helps if this
    // cell's content stays inside its own track — a fixed-width column
    // alone isn't guaranteed to be wide enough for every caller, e.g. the
    // vehicle popup's 3-column telemetry grid, which doesn't use
    // `COL_WIDTH.fill` at all). This own trailing padding means the % text
    // never abuts the next thing regardless of the surrounding layout.
    <span className="flex items-center gap-2 pr-3">
      <span className="relative h-2 w-16 shrink-0 overflow-hidden rounded-[18px] bg-[color:var(--neutral-lighter,#eaecf0)]" aria-hidden>
        <span
          className="absolute inset-y-0 left-0 rounded-[18px]"
          style={{ width: `${clamped}%`, background: fillColor(value) }}
        />
      </span>
      <span className="shrink-0 text-caption font-medium tabular-nums text-foreground">
        {Math.round(value)}%
      </span>
    </span>
  );
}

/** Mobility pill — tinted background (12% of the status colour) + colored
 *  dot + colored bold label. Uses the same status→hex bridge as the pin. */
function MobilityPill({ status, label }: { status: MarkerStatus; label: string }) {
  const color = STATUS_HEX[status] ?? STATUS_HEX.default;
  return (
    <span
      className="inline-flex max-w-full items-center gap-1.5 rounded-full px-2.5 py-1"
      style={{ background: `color-mix(in srgb, ${color} 12%, transparent)` }}
    >
      <span aria-hidden className="size-1.5 shrink-0 rounded-full" style={{ background: color }} />
      <span className="truncate text-caption font-semibold" style={{ color }}>{label}</span>
    </span>
  );
}

/** Assignment cell — task count + first tag when busy, else a green "Free"
 *  chip so an unassigned tanker reads as "available to dispatch". */
function AssignmentCell({ entity }: { entity: MonitoringEntity }) {
  const busy = (entity.connections ?? 0) > 0;
  if (busy) {
    return (
      <span className="flex min-w-0 items-center gap-2 text-body-sm">
        <RouteIcon size={14} className="shrink-0 text-primary" />
        <span className="min-w-0 truncate">
          <span className="font-semibold text-foreground">{entity.connections} task{entity.connections === 1 ? '' : 's'}</span>
          {entity.tags?.length ? (
            <span className="ms-1.5 text-muted-foreground">· {entity.tags[0]}</span>
          ) : null}
        </span>
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1.5">
      <span aria-hidden className="size-1.5 rounded-full bg-[color:var(--status-success)]" />
      <span className="text-caption font-semibold text-[color:var(--status-success)]">Free</span>
    </span>
  );
}

function FleetRow({
  entity,
  selected,
  cols,
  colGate,
  hideSubtitle,
  onClick,
}: {
  entity: MonitoringEntity;
  selected: boolean;
  cols: FleetCols;
  /** Per-column data-presence gate (e.g. `fill` needs `showFillCol`,
   *  `fuelType`/`assetType` need at least one entity to carry that facet,
   *  `vehicleId` needs the module to opt in via `listColumnLabels.vehicleId`)
   *  — keeps these additive columns invisible for products that never
   *  populate them, instead of leaking placeholder "—" cells everywhere
   *  `LiveMonitoringView` is used. */
  colGate: Partial<Record<ColKey, boolean>>;
  /** `data.hideRowSubtitle` opt-in — Figma 275-97176's Vehicle cell is a
   *  single line (icon + ID only), no driver/subtitle line under it. */
  hideSubtitle?: boolean;
  onClick: () => void;
}) {
  const color = STATUS_HEX[entity.status] ?? STATUS_HEX.default;
  // Driver = the FIRST identity-meta row whose text doesn't match the
  // entity title (avoid duplicating the plate in the row's subtitle).
  const driver = entity.headerMeta?.find((m) => typeof m.text === 'string' && String(m.text).trim() !== String(entity.title).trim())?.text;
  // Speed & timestamp: parse the composite `metric` string ("48 km/h ·
  // Just now" or bare "since 2 hr"). The Speed column is the left half,
  // the Timestamp column is the right half. Falls back to `entity.since`
  // only when `metric` never had a separator to begin with.
  const rawMetric = typeof entity.metric === 'string' ? entity.metric : '';
  const [rawSpeed, rawTs] = rawMetric.includes(' · ') ? rawMetric.split(' · ', 2) : ['—', rawMetric];
  const speedText = rawSpeed || '—';
  const timestampText = rawTs || (typeof entity.since === 'string' ? entity.since : '') || '—';
  const { visible, template } = buildFleetCols(cols, colGate);
  return (
    <button
      type="button"
      onClick={onClick}
      style={{ gridTemplateColumns: template }}
      className={cn(
        'grid items-center gap-0 pl-2.5 pr-2 [&>*+*]:pl-3',
        // Figma spec (Frame 1261154684): every fleet row is exactly 48 px
        // tall — no vertical padding, columns center their content via
        // `items-center`.
        'h-12 w-max min-w-full border-b border-border text-left outline-none transition-colors',
        selected ? 'bg-secondary/60 shadow-[inset_3px_0_0_var(--primary)]' : 'hover:bg-muted/40'
      )}
    >
      {/* VEHICLE — thumbnail + plate (bold) + driver (muted). Mobility
          status is baked into the composite tanker artwork's status ring
          so it doesn't need a separate Status column. */}
      <span className="flex min-w-0 items-center gap-2">
        <Tooltip>
          <TooltipTrigger asChild>
            <span className="relative shrink-0">
              {entity.image ? (
                // Figma spec (Frame "Car (List)" = 39×29, wrapped in a
                // 43-wide group): 44 × 30 px thumbnail slot at 48 px row
                // height. `object-contain` preserves the tanker artwork
                // ratio without cropping.
                <img src={entity.image} alt="" loading="lazy" className="h-[30px] w-[44px] object-contain" />
              ) : (
                <>
                  <span className="grid size-8 place-items-center rounded-full bg-secondary text-caption font-bold text-primary">
                    {entity.avatarFallback ?? entity.title.slice(0, 2).toUpperCase()}
                  </span>
                  <span aria-hidden className="absolute -bottom-0.5 -left-0.5 size-2.5 rounded-full border-2 border-card" style={{ background: color }} />
                </>
              )}
            </span>
          </TooltipTrigger>
          {entity.statusLabel ? <TooltipContent side="top">{entity.statusLabel}</TooltipContent> : null}
        </Tooltip>
        <span className="flex min-w-0 flex-col leading-tight">
          <span className="truncate text-body-sm font-bold text-foreground">{entity.title}</span>
          {hideSubtitle ? null : driver ? (
            <span className="truncate text-caption text-muted-foreground">{driver}</span>
          ) : entity.subtitle ? (
            <span className="truncate text-caption text-muted-foreground">{entity.subtitle}</span>
          ) : null}
        </span>
      </span>

      {visible.map((c) => {
        if (c.key === 'fill') {
          return (
            <span key="fill">
              {entity.fillLevel != null ? <FillCell value={entity.fillLevel} /> : null}
            </span>
          );
        }
        if (c.key === 'activity') {
          // ACTIVITY OVERVIEW — three icon+number chips, colours matching
          // Figma 275-97176 exactly (each icon carries its own semantic
          // colour, not a shared muted grey): green tasks-count, amber
          // alert-triangle, blue distance-today.
          return (
            <span key="activity" className="flex items-center gap-1.5 whitespace-nowrap pr-1 text-caption font-medium text-foreground">
              <span className="inline-flex items-center gap-0.5">
                <RouteIcon size={11} className="text-[color:var(--status-success)]" />
                <span className="tabular-nums">{entity.connections ?? 0}</span>
              </span>
              <span className="inline-flex items-center gap-0.5">
                <AlertTriangle size={11} className="text-[color:var(--status-warning)]" />
                <span className="tabular-nums">{entity.alerts ?? 0}</span>
              </span>
              <span className="inline-flex items-center gap-0.5">
                <PinIcon size={11} className="text-[color:var(--status-info)]" />
                <span className="tabular-nums">{entity.distanceKm ?? 0}km</span>
              </span>
            </span>
          );
        }
        if (c.key === 'speed') {
          return <span key="speed" className="truncate text-body-sm font-medium text-foreground">{speedText}</span>;
        }
        if (c.key === 'timestamp') {
          return <span key="timestamp" className="truncate text-body-sm text-muted-foreground">{timestampText}</span>;
        }
        // FUEL TYPE / VEHICLE ID / ASSET TYPE — adopted from the FAMS Web
        // Portal list-view table (911-19095); all three already exist on
        // the entity (facets.fuelType / id / facets.assetType), just not
        // previously surfaced as their own list columns.
        if (c.key === 'fuelType') {
          return <span key="fuelType" className="truncate text-body-sm text-foreground">{entity.facets?.fuelType ?? '—'}</span>;
        }
        if (c.key === 'vehicleId') {
          return <span key="vehicleId" className="truncate text-body-sm font-medium tabular-nums text-foreground">{entity.id}</span>;
        }
        return <span key="assetType" className="truncate text-body-sm text-foreground">{entity.facets?.assetType ?? '—'}</span>;
      })}

      {/* Filler grid cell keeping the header pencil aligned above nothing. */}
      <span aria-hidden />
    </button>
  );
}

/** Column header row + a config pencil that toggles the optional columns.
 *  Uses the same `FLEET_GRID` template as `FleetRow` so labels + row cells
 *  line up column-for-column at every viewport width.
 *  Figma 518:6970: Vehicle · Speed · Timestamp · Activity Overview + pencil. */
function FleetHeader({
  cols,
  setCols,
  labels,
  colGate,
}: {
  cols: FleetCols;
  setCols: (c: FleetCols) => void;
  labels?: { entity?: string; fill?: string; speed?: string; metric?: string; timestamp?: string; activity?: string; overview?: string; fuelType?: string; vehicleId?: string; assetType?: string };
  colGate: Partial<Record<ColKey, boolean>>;
}) {
  const entityLabel = labels?.entity ?? 'Vehicle';
  const fillLabel = labels?.fill ?? 'Fill Level';
  // `metric` is the legacy key used by some configs for a "Speed" column —
  // honour it as a fallback so existing products keep their header text.
  const speedLabel = labels?.speed ?? labels?.metric ?? 'Speed';
  const timestampLabel = labels?.timestamp ?? 'Timestamp';
  const activityLabel = labels?.activity ?? labels?.overview ?? 'Activity Overview';
  const fuelTypeLabel = labels?.fuelType ?? 'Fuel Type';
  const vehicleIdLabel = labels?.vehicleId ?? 'Vehicle ID';
  const assetTypeLabel = labels?.assetType ?? 'Asset Type';
  const colLabel: Record<ColKey, string> = { fill: fillLabel, activity: activityLabel, speed: speedLabel, timestamp: timestampLabel, fuelType: fuelTypeLabel, vehicleId: vehicleIdLabel, assetType: assetTypeLabel };
  // Column icon per key — mirrors the row's own glyph for that data (Figma
  // 275-91160's "Columns" popup pairs every togglable field with an icon).
  const colIcon: Record<ColKey, React.ReactNode> = {
    fill: <Droplets01 size={14} />,
    activity: <RouteIcon size={14} />,
    speed: <SpeedoIcon size={14} />,
    timestamp: <Clock size={14} />,
    fuelType: <Droplets01 size={14} />,
    vehicleId: <Hash02 size={14} />,
    assetType: <Truck01 size={14} />,
  };
  const [colSearch, setColSearch] = React.useState('');
  const [colPopoverOpen, setColPopoverOpen] = React.useState(false);
  const { visible, template } = buildFleetCols(cols, colGate);
  return (
    <div
      style={{ gridTemplateColumns: template }}
      className="grid h-8 w-max min-w-full shrink-0 items-center gap-0 border-b border-border bg-card pl-2.5 pr-2 text-caption font-bold uppercase tracking-[0.06em] text-muted-foreground [&>*+*]:pl-3"
    >
      <span className="min-w-0 truncate">{entityLabel}</span>
      {visible.map((c) => (
        <span key={c.key} className="truncate">{colLabel[c.key]}</span>
      ))}
      {/* Edit pencil — primary (maroon) token, matching the C&C brand
          accent rather than a stray blue; the 26px edit column gives it
          its own track so it never collides with the last header label. */}
      <span className="flex items-center justify-end">
        <Popover open={colPopoverOpen} onOpenChange={(open) => { setColPopoverOpen(open); if (!open) setColSearch(''); }}>
          <PopoverTrigger asChild>
            <button type="button" aria-label="Configure columns" className="grid size-5 shrink-0 place-items-center rounded text-primary transition-colors hover:bg-muted">
              <Pencil size={12} />
            </button>
          </PopoverTrigger>
          {/* Figma 275-91160 ("Columns" popup, Flood Management file): white
              card, 4px radius, #D0D5DD border, soft drop shadow, 12/16px
              padding, bold title + close, a search-columns input, then a
              "Shown" section of icon + label + Switch rows — restyled onto
              this module's own flood-ops column set (not the generic
              vehicle/workforce/device field catalog the Figma popup itself
              lists, which belongs to a different product's asset admin
              screen entirely). */}
          <PopoverContent align="end" sideOffset={6} className="w-64 rounded-[4px] border-[color:var(--border)] p-0 shadow-[6px_6px_23px_0_rgba(0,0,0,0.16)]">
            <div className="flex items-center justify-between px-3 pt-3">
              <span className="text-body-md font-bold text-foreground">Columns</span>
              <button type="button" aria-label="Close" onClick={() => setColPopoverOpen(false)} className="grid size-4 place-items-center text-muted-foreground transition-colors hover:text-foreground">
                <X size={14} />
              </button>
            </div>
            <div className="px-3 pt-3">
              <div className="relative">
                <Search size={14} className="pointer-events-none absolute left-2 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <input
                  value={colSearch}
                  onChange={(e) => setColSearch(e.target.value)}
                  placeholder="Search Columns"
                  className="h-8 w-full rounded border border-border bg-card pl-7 pr-2 text-caption text-foreground outline-none placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:ring-ring"
                />
              </div>
            </div>
            <div className="max-h-80 overflow-y-auto px-3 py-3">
              <p className="mb-3 text-body-sm font-semibold text-muted-foreground">Shown</p>
              <div className="flex flex-col gap-4">
                {/* Vehicle is always on — shown for reference, not toggleable. */}
                {!colSearch.trim() || entityLabel.toLowerCase().includes(colSearch.trim().toLowerCase()) ? (
                  <div className="flex items-center justify-between">
                    <span className="flex items-center gap-2">
                      <Truck01 size={14} className="text-muted-foreground" />
                      <span className="text-body-sm text-foreground">{entityLabel}</span>
                    </span>
                    <Switch checked disabled />
                  </div>
                ) : null}
                {(
                  [
                    ...(colGate.fill ?? true ? (['fill'] as const) : []),
                    'activity', 'speed', 'timestamp',
                    ...(colGate.fuelType ?? true ? (['fuelType'] as const) : []),
                    ...(colGate.vehicleId ?? true ? (['vehicleId'] as const) : []),
                    ...(colGate.assetType ?? true ? (['assetType'] as const) : []),
                  ] as const
                )
                  .filter((key) => !colSearch.trim() || colLabel[key].toLowerCase().includes(colSearch.trim().toLowerCase()))
                  .map((key) => (
                    <div key={key} className="flex items-center justify-between">
                      <span className="flex items-center gap-2">
                        <span className="text-muted-foreground">{colIcon[key]}</span>
                        <span className="text-body-sm text-foreground">{colLabel[key]}</span>
                      </span>
                      <Switch checked={cols[key]} onCheckedChange={() => setCols({ ...cols, [key]: !cols[key] })} aria-label={colLabel[key]} />
                    </div>
                  ))}
                {colSearch.trim() && ![entityLabel, ...COL_ORDER.map((k) => colLabel[k])].some((l) => l.toLowerCase().includes(colSearch.trim().toLowerCase())) ? (
                  <p className="py-2 text-center text-caption text-muted-foreground">No matching columns.</p>
                ) : null}
              </div>
            </div>
          </PopoverContent>
        </Popover>
      </span>
    </div>
  );
}

/* ── view ─────────────────────────────────────────────────────────────── */

export function LiveMonitoringView({
  data,
  view = 'hybrid',
  onOpenDetail,
}: {
  data: MonitoringModuleData;
  /** Hybrid (list + map) · list (list only) · map (map only) — from the view tabs. */
  view?: 'hybrid' | 'list' | 'map';
  onOpenDetail?: (d: DetailDescriptor) => void;
}) {
  const entities = React.useMemo(() => deriveEntities(data), [data]);
  const [query, setQuery] = React.useState('');
  const [selectedId, setSelectedId] = React.useState<string | null>(null);
  const [collapsed, setCollapsed] = React.useState(false);
  // Hybrid panel width toggle (Figma 275-98876's 3-icon seam control):
  // normal (472px, `listWidth`) vs expanded (`EXPANDED_LIST_WIDTH`). The
  // table itself is ALWAYS one plain horizontally scrollable grid (header +
  // rows scroll in sync) regardless of this — expanding just gives more
  // columns room before that scroll kicks in. List/Map views ignore this.
  const [panelExpanded, setPanelExpanded] = React.useState(false);
  const [showRoutes, setShowRoutes] = React.useState(true);
  // One shared hidden-state for the whole analytics suite so the Hide
  // Analytics CTA clears every widget at once.
  const [analyticsHidden, setAnalyticsHidden] = React.useState(false);
  const [fullscreen, setFullscreen] = React.useState(false);
  // Incidents-style overlay controls (top bar + right column + declutter eye).
  const [overlaysHidden, setOverlaysHidden] = React.useState(false);
  const [layersOpen, setLayersOpen] = React.useState(false);
  // Base-map visual style (Colored / Grey / Dark / Satellite) — swaps the
  // tile provider live via LeafletMap's `tileUrl` prop.
  const [basemapId, setBasemapId] = React.useState(BASEMAPS[0].id);
  const basemap = BASEMAPS.find((b) => b.id === basemapId) ?? BASEMAPS[0];
  // Rain-radar overlay (RainViewer — free, key-less global radar tiles;
  // approved as the Windy-style rain visualization). The latest radar frame
  // path is fetched once on first enable, then reused for the session.
  const [rainOn, setRainOn] = React.useState(false);
  const [rainTiles, setRainTiles] = React.useState<string | null>(null);
  React.useEffect(() => {
    if (!rainOn || rainTiles) return;
    let alive = true;
    fetch('https://api.rainviewer.com/public/weather-maps.json')
      .then((r) => r.json())
      .then((j) => {
        const latest = (j?.radar?.past ?? []).slice(-1)[0];
        // Color scheme 4 (Universal Blue), smoothed, snow shown.
        if (alive && latest?.path && j?.host) setRainTiles(`${j.host}${latest.path}/256/{z}/{x}/{y}/4/1_1.png`);
      })
      .catch(() => { /* radar endpoint unreachable — checkbox simply shows no layer */ });
    return () => { alive = false; };
  }, [rainOn, rainTiles]);
  // Simulated storm-cell overlay — demo rain field over the flood zones
  // (real radar over Qatar is usually empty). Separate Weather toggle.
  const [simRainOn, setSimRainOn] = React.useState(false);
  const rainCells = data.rainCells ?? [];
  const rainCellZones = React.useMemo(
    () => (simRainOn
      ? rainCells.map((c) => ({ id: `rain-cell-${c.id}`, points: rainCellRing(c.center, c.radiusM), color: rainCellColor(c.rainMmHr), fillOpacity: 0.2 }))
      : []),
    [simRainOn, JSON.stringify(rainCells)]
  );
  const rainCellMarkers: MapMarker[] = React.useMemo(
    () => (simRainOn
      ? rainCells.map((c) => ({
          id: `rain-chip-${c.id}`,
          position: c.center,
          iconUrl: rainCellChipDataUri(c.rainMmHr, c.floodRiskPct, rainCellColor(c.rainMmHr)),
          iconSize: [122, 42] as [number, number],
          tooltip: `Storm cell ${c.id} · ${c.rainMmHr} mm/hr · flood risk ${c.floodRiskPct}%`,
        }))
      : []),
    [simRainOn, JSON.stringify(rainCells)]
  );
  // Companion demo weather layers — Stations (by temp) · Rain heatmap ·
  // Clouds (density) · Precipitation (mm). All dummy data from the config.
  const [showStations, setShowStations] = React.useState(false);
  const [showRainHeat, setShowRainHeat] = React.useState(false);
  const [showClouds, setShowClouds] = React.useState(false);
  const [showPrecip, setShowPrecip] = React.useState(false);
  const weatherStations = data.weatherStations ?? [];
  const cloudMasses = data.cloudMasses ?? [];
  const precipAreas = data.precipAreas ?? [];
  const stationMarkers: MapMarker[] = React.useMemo(
    () => (showStations
      ? weatherStations.map((s) => ({
          id: `wx-st-${s.id}`,
          position: s.position,
          iconUrl: stationDotDataUri(s.tempC),
          iconSize: [28, 28] as [number, number],
          tooltip: `Station ${s.id} · ${s.tempC}°C`,
        }))
      : []),
    [showStations, JSON.stringify(weatherStations)]
  );
  // Rain heatmap — scatter points derived from the storm cells (centre +
  // a deterministic jittered ring per cell), weighted by intensity.
  const rainHeatPoints = React.useMemo(() => {
    if (!showRainHeat) return [];
    return rainCells.flatMap((c) => {
      const i = Math.min(1, c.rainMmHr / 30);
      const [lat, lng] = c.center;
      const dLat = c.radiusM / 111320;
      const dLng = c.radiusM / (111320 * Math.cos((lat * Math.PI) / 180));
      const ring = Array.from({ length: 10 }, (_, k) => {
        const a = (k / 10) * 2 * Math.PI;
        const r = 0.35 + ((k * 37) % 10) / 18; // deterministic 0.35–0.9 spread
        return { position: [lat + dLat * r * Math.sin(a), lng + dLng * r * Math.cos(a)] as LatLng, intensity: i * (1 - r * 0.6) };
      });
      return [{ position: c.center, intensity: i }, ...ring];
    });
  }, [showRainHeat, JSON.stringify(rainCells)]);
  const cloudZones = React.useMemo(
    () => (showClouds
      ? cloudMasses.map((c) => ({
          id: `wx-cl-${c.id}`,
          points: rainCellRing(c.center, c.radiusM),
          color: '#98A2B3', // coherence-allow — cloud-mass DATA grey (== grey-400)
          fillOpacity: 0.15 + c.density * 0.25,
          label: `Clouds · ${Math.round(c.density * 100)}% density`,
        }))
      : []),
    [showClouds, JSON.stringify(cloudMasses)]
  );
  const precipZones = React.useMemo(
    () => (showPrecip
      ? precipAreas.map((p) => ({
          id: `wx-pr-${p.id}`,
          points: rainCellRing(p.center, p.radiusM),
          color: precipColor(p.mm),
          fillOpacity: 0.25,
          label: `Precipitation · ${p.mm} mm (last hour)`,
        }))
      : []),
    [showPrecip, JSON.stringify(precipAreas)]
  );
  const rasterOverlays = React.useMemo(
    // maxzoom 7: RainViewer's radar composite serves real data tiles only up
    // to z7 (beyond that it returns "Zoom Level Not Supported" text tiles —
    // verified empirically); MapLibre upscales z7 tiles at deeper zooms.
    () => (rainOn && rainTiles ? [{ id: 'rain', tiles: [rainTiles], opacity: 0.7, attribution: 'RainViewer', maxzoom: 7 }] : []),
    [rainOn, rainTiles],
  );
  const [legacyShowVehicles, setLegacyShowVehicles] = React.useState(true);
  const [showZonesLayer, setShowZonesLayer] = React.useState(false);
  const [showPoisLayer, setShowPoisLayer] = React.useState(false);
  // Auxiliary map layers — the 6-layer stack (POI / Assembly Points /
  // Vehicles / Black Spots / Nearby Inspectors / Zones) shared with the
  // Incidents Hybrid view. Each layer's initial state comes from
  // `defaultEnabled`; toggles live in one Set keyed by id. Nearby Incidents
  // lives on `data.incidents` (its own severity-checkbox row in the top bar).
  const auxLayers = data.auxLayers ?? [];
  const [auxEnabled, setAuxEnabled] = React.useState<Set<string>>(
    () => new Set(auxLayers.filter((l) => l.defaultEnabled).map((l) => l.id))
  );
  const toggleAuxLayer = (id: string) => setAuxEnabled((prev) => {
    const next = new Set(prev);
    if (next.has(id)) next.delete(id); else next.add(id);
    return next;
  });
  // When an aux "Vehicles" layer exists, its enabled state gates the ENTITY
  // vehicle pins too (otherwise the toggle only hides the aux-layer demo
  // pins while the real fleet stays visible — the "not fully functional"
  // complaint the C&C raised).
  const hasVehAuxLayer = auxLayers.some((l) => l.id === 'veh');
  const showVehicles = hasVehAuxLayer ? auxEnabled.has('veh') : legacyShowVehicles;
  const setShowVehicles = hasVehAuxLayer
    ? (fnOrValue: boolean | ((prev: boolean) => boolean)) => {
        const next = typeof fnOrValue === 'function' ? fnOrValue(showVehicles) : fnOrValue;
        setAuxEnabled((prev) => {
          const set = new Set(prev);
          if (next) set.add('veh'); else set.delete('veh');
          return set;
        });
      }
    : setLegacyShowVehicles;
  // Nearby Incidents severity filter — a distinct top-bar checkbox row.
  // Default: every severity checked (the incidents-hybrid pattern).
  const [enabledSeverities, setEnabledSeverities] = React.useState<Set<string>>(
    () => new Set((data.incidents?.severities ?? []).map((s) => s.id))
  );
  const toggleSeverity = (id: string) => setEnabledSeverities((prev) => {
    const next = new Set(prev);
    if (next.has(id)) next.delete(id); else next.add(id);
    return next;
  });
  // Vehicle mobility-status checkboxes (Figma 285-37970) — one segment per
  // status found on the vehicle entities (Moving / Stopped / Idling /
  // Non-Reporting), coloured to match the tanker map-pin accents. This row
  // REPLACES the right-column Vehicles tile: unchecking a status hides
  // exactly those pins on the map.
  const vehStatusGroups = React.useMemo(() => {
    const counts = new Map<string, { count: number; status: MarkerStatus }>();
    for (const e of entities) {
      if (!e.assetType) continue;
      const key = e.statusLabel ?? e.status;
      const cur = counts.get(key);
      if (cur) cur.count += 1;
      else counts.set(key, { count: 1, status: e.status });
    }
    return [...counts.entries()]
      .map(([label, v]) => ({ label, count: v.count, color: VEH_STATUS_LABEL_COLOR[label] ?? MARKER_STATUS_COLORS[v.status] }))
      .sort((a, b) => vehStatusRank(a.label) - vehStatusRank(b.label));
  }, [entities]);
  const [disabledVehStatuses, setDisabledVehStatuses] = React.useState<Set<string>>(() => new Set());
  const toggleVehStatus = (label: string) => setDisabledVehStatuses((prev) => {
    const next = new Set(prev);
    if (next.has(label)) next.delete(label); else next.add(label);
    return next;
  });
  // Top-bar location search popover (fly-to on select).
  const [locSearchOpen, setLocSearchOpen] = React.useState(false);
  const [locSearchQuery, setLocSearchQuery] = React.useState('');
  // Clustered "zoomed-out" overview (status-ring count badges) vs every asset
  // as its own pin. Toggled by the eye button bottom-left (canonical). Default
  // true keeps existing fleet behaviour unchanged; a product can opt every
  // entity into its own labelled pin from first paint (workforce "visualise
  // like vehicles, not dots" — T-039 #2) via `data.defaultClustered: false`.
  const [clustered, setClustered] = React.useState(data.defaultClustered ?? true);
  // Right side-sheet overlays (Zones / POIs) + which items are toggled on.
  const [overlay, setOverlay] = React.useState<null | 'zones' | 'pois'>(null);
  const [enabledZones, setEnabledZones] = React.useState<Set<string>>(new Set());
  const [enabledPois, setEnabledPois] = React.useState<Set<string>>(new Set());
  const [overlayQuery, setOverlayQuery] = React.useState('');
  // A Fill Level column is offered only when some entity carries `fillLevel`.
  const showFillCol = React.useMemo(() => entities.some((e) => e.fillLevel != null), [entities]);
  // Fuel Type / Asset Type columns (911-19095) only render for modules whose
  // entities actually carry those facets; Vehicle ID needs an explicit
  // per-module opt-in (`listColumnLabels.vehicleId`) since `entity.id` is
  // always populated everywhere `LiveMonitoringView` is used.
  const showFuelTypeCol = React.useMemo(() => entities.some((e) => e.facets?.fuelType != null), [entities]);
  const showAssetTypeCol = React.useMemo(() => entities.some((e) => e.facets?.assetType != null), [entities]);
  const showVehicleIdCol = data.listColumnLabels?.vehicleId != null;
  const colGate: Partial<Record<ColKey, boolean>> = { fill: showFillCol, fuelType: showFuelTypeCol, assetType: showAssetTypeCol, vehicleId: showVehicleIdCol };
  // Which optional fleet-list columns are shown (toggled by the header pencil).
  // Order: Fill · Activity · Speed · Timestamp — Fill Level takes the 2nd
  // slot (C&C signal-critical) with Speed/Timestamp trailing after Activity.
  // Default visible set matches the Flood Management reference table
  // (275-97176) exactly: Vehicle · Speed · Timestamp · Activity Overview.
  // Fill Level / Fuel Type / Vehicle ID / Asset Type (this module's own
  // flood-ops columns, not in that Figma frame) stay available — just off
  // by default — via the header's column-config popover; toggling Fill
  // Level back on restores it to the 2nd column slot (`COL_ORDER`).
  // Fill Level defaults ON, in its required 2nd slot (right after Vehicle —
  // `COL_ORDER` leads with `fill`); Speed/Timestamp/Activity Overview match
  // the Flood Management reference table (275-97176). Fuel Type/Vehicle
  // ID/Asset Type (this module's own flood-ops additions beyond that Figma
  // frame) stay available, off by default, via the header's column popover.
  const [listCols, setListCols] = React.useState<FleetCols>({ fill: true, activity: true, speed: true, timestamp: true, fuelType: false, vehicleId: false, assetType: false });
  const toggleId = (set: React.Dispatch<React.SetStateAction<Set<string>>>, id: string) =>
    set((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  const mapRef = React.useRef<LeafletMapHandle>(null);
  const searchRef = React.useRef<HTMLInputElement>(null);
  // Screen position of the selected marker's pin — the telemetry popup opens
  // OVER the marker (EAD behaviour), re-projected as the map pans/zooms.
  const [popupPoint, setPopupPoint] = React.useState<{ x: number; y: number } | null>(null);

  const filtered = React.useMemo(() => {
    if (!query) return entities;
    const q = query.toLowerCase();
    return entities.filter((e) => {
      let haystack = `${e.title} ${typeof e.subtitle === 'string' ? e.subtitle : ''}`;
      // Trip-card list variant doesn't populate title/subtitle for driver/plate —
      // extend the haystack with the fields TripCard actually renders (Trip
      // Management Pass 1 punch list #2). Fleet entities never set these, so
      // this is a no-op (empty string) for the unchanged fleet path.
      if (data.listVariant === 'trip') {
        haystack += ` ${typeof e.plate === 'string' ? e.plate : ''}`;
        haystack += ` ${typeof e.driver?.name === 'string' ? e.driver.name : ''}`;
        haystack += ` ${e.statusLabel ?? ''}`;
        haystack += ` ${typeof e.dateTime === 'string' ? e.dateTime : ''}`;
      }
      return haystack.toLowerCase().includes(q);
    });
  }, [entities, query, data.listVariant]);

  // Only "trackable" entities (not plant/site anchors) populate the list. Stationary plant/site
  // anchors are map overlays, not tracked rows; a config-driven per-product override (e.g.
  // site-presence products listing sites) is tracked as T-018.
  const listEntities = filtered.filter((e) => e.kind !== 'plant' && e.kind !== 'site');
  const selected = entities.find((e) => e.id === selectedId) ?? null;

  // Re-project the selected marker to a screen point so the popup sits over it.
  // A ref keeps the map's (once-attached) onViewportChange callback current.
  const selectedRef = React.useRef(selected);
  selectedRef.current = selected;
  const updatePopupPoint = React.useCallback(() => {
    const s = selectedRef.current;
    setPopupPoint(s ? mapRef.current?.project(s.position) ?? null : null);
  }, []);
  React.useEffect(() => {
    // Project after layout settles (marker added / flyTo finishes).
    const id = requestAnimationFrame(updatePopupPoint);
    return () => cancelAnimationFrame(id);
  }, [selectedId, updatePopupPoint]);

  // A route with `entityId` only draws while THAT entity's list row is selected (e.g. a trip's
  // route, drawn on select — Trip Management Pass 1); a route with no `entityId` always draws
  // (default/back-compat — existing fleet products never set it).
  const routes: MapRoute[] = React.useMemo(
    () =>
      (data.routes ?? [])
        .filter((r) => !r.entityId || r.entityId === selectedId)
        .map((r) => ({
          id: r.id,
          points: r.points,
          color: r.color,
          dashed: r.dashed,
          osrm: r.osrm,
          animateMarkerId: r.animateMarkerId,
        })),
    [data.routes, selectedId]
  );

  /* Filters — opened from the funnel (All Filters panel), multi-select by status;
     the selected values show as applied-filter chips below the search. */
  // Multi-section "All Filters": each facet has selected values; Tags filter by
  // entity.tags. Selections show as applied chips. (Falls back to one Status facet.)
  const [facetSel, setFacetSel] = React.useState<Record<string, string[]>>({});
  const [tagSel, setTagSel] = React.useState<string[]>([]);
  // Date filter (Tadweer 4123-32174/32264 pattern): a range picked from the
  // preset-rail + calendar popup, matched against each entity's activity date.
  const [dateRange, setDateRange] = React.useState<DateRange | null>(null);
  const [datePickerOpen, setDatePickerOpen] = React.useState(false);
  const [appliedHidden, setAppliedHidden] = React.useState(false);
  // Filter popup open/search state — mirrors the header's Columns popover
  // (`colPopoverOpen`/`colSearch` in `FleetHeader`) so both popups sharing
  // Figma 275-91160's "Popup" shell (search box, X-close reset) behave the
  // same way.
  const [filterPopoverOpen, setFilterPopoverOpen] = React.useState(false);
  const [filterSearch, setFilterSearch] = React.useState('');

  // Dedupe defensively by id AND label so a config can never render the same
  // filter section twice.
  const facetDefs = (data.filterFacets?.length ? data.filterFacets : [{ id: 'status', label: 'Status' }])
    .filter((def, i, all) => all.findIndex((d) => d.id === def.id || d.label === def.label) === i);
  // The categorical value of one facet for an entity (status facet → statusLabel).
  const facetValue = (e: MonitoringEntity, id: string): string | undefined =>
    id === 'status' ? (e.statusLabel ?? e.status) : e.facets?.[id];

  // Facet sections with their distinct option values + counts (status keeps colors).
  const facetSections = React.useMemo(
    () =>
      facetDefs
        .map((def) => {
          const map = new Map<string, { count: number; color?: string }>();
          for (const e of listEntities) {
            const v = facetValue(e, def.id);
            if (v == null || v === '') continue;
            const cur = map.get(v) ?? { count: 0, color: def.id === 'status' ? (STATUS_HEX[e.status] ?? STATUS_HEX.default) : undefined };
            cur.count += 1;
            map.set(v, cur);
          }
          return { id: def.id, label: def.label, options: [...map.entries()].map(([value, m]) => ({ value, ...m })) };
        })
        .filter((s) => s.options.length),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [listEntities, data.filterFacets],
  );

  const toggleFacet = (facetId: string, value: string) =>
    setFacetSel((prev) => {
      const cur = prev[facetId] ?? [];
      return { ...prev, [facetId]: cur.includes(value) ? cur.filter((x) => x !== value) : [...cur, value] };
    });
  const toggleTag = (tag: string) =>
    setTagSel((prev) => (prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]));
  const clearAllFilters = () => { setFacetSel({}); setTagSel([]); setDateRange(null); };

  const activeFacets = Object.entries(facetSel).filter(([, vals]) => vals.length);
  const selectedCount = activeFacets.reduce((n, [, v]) => n + v.length, 0) + tagSel.length + (dateRange ? 1 : 0);
  // Applied-chip list: every selected facet value + tag + the date range, with how to remove it.
  const appliedChips = [
    ...(dateRange ? [{ key: 'date', label: dateRange.label, remove: () => setDateRange(null) }] : []),
    ...activeFacets.flatMap(([fid, vals]) => vals.map((value) => ({ key: `${fid}:${value}`, label: value, remove: () => toggleFacet(fid, value) }))),
    ...tagSel.map((t) => ({ key: `tag:${t}`, label: t, remove: () => toggleTag(t) })),
  ];
  const filterToday = startOfDay(new Date());
  const visibleList = selectedCount
    ? listEntities.filter(
        (e) =>
          activeFacets.every(([fid, vals]) => { const v = facetValue(e, fid); return v != null && vals.includes(v); }) &&
          (!tagSel.length || (e.tags ?? []).some((t) => tagSel.includes(t))) &&
          (!dateRange || (() => { const d = entityActivityDate(e, filterToday).getTime(); return d >= dateRange.from.getTime() && d <= dateRange.to.getTime(); })()),
      )
    : listEntities;

  // The map's own pins stay in sync with the list's search + facet/tag
  // filters (funnel popup) — applying a filter narrows the map, not just
  // the rows below it. Plant/site anchors are map-only overlays (never in
  // `listEntities`/the list to begin with — see the `filtered.filter` above)
  // and stay visible regardless of the list's filter state.
  const visibleIds = React.useMemo(() => new Set(visibleList.map((e) => e.id)), [visibleList]);

  // Memoised so the per-second ETA tick doesn't churn the map's effects
  // (which would reset the truck-animation progress every render).
  const markers: MapMarker[] = React.useMemo(
    () =>
      entities
        // Vehicles layer master toggle (Layers popover) + per-status
        // checkboxes (top bar): vehicles carry an `assetType`; non-vehicle
        // entities (tasks) always stay visible.
        .filter((e) => !e.assetType || (showVehicles && !disabledVehStatuses.has(e.statusLabel ?? e.status)))
        .filter((e) => e.kind === 'plant' || e.kind === 'site' || visibleIds.has(e.id))
        .map((e) => ({
        id: e.id,
        position: e.position,
        status: e.status,
        // An `assetType` opts into the DS V2 AssetMarker pin (state colour +
        // dynamic glyph); otherwise the legacy vehicle/plant/site/dot pin.
        kind: e.assetType ? 'asset' : (e.kind ?? 'vehicle'),
        assetType: e.assetType,
        assetState: e.assetType ? STATUS_TO_ASSET_STATE[e.status] : undefined,
        assetActive: e.assetType ? e.id === selectedId : undefined,
        // Fully custom pin artwork (opt-in, additive) — bypasses the default
        // teardrop/AssetMarker pin entirely when set.
        iconUrl: e.iconUrl,
        iconSize: e.iconSize,
        // Entity pins fold into the status-donut clusters when zoomed out
        // (Figma 275-96858) and reappear as their custom pin when zoomed in.
        clusterable: true,
        live: e.live,
        heading: e.heading,
        // Always pass the label through — MapView renders it two different
        // (both scale-safe) ways depending on `cluster`: the clustered mode's
        // native GL symbol layer draws it for any point that isn't currently
        // folded into a cluster bubble (T-039 #2 — "visualise like vehicles,
        // not dots" — without the DOM-marker cost of one HTML pin per entity
        // at workforce scale); the unclustered mode's HTML marker path draws
        // its floating label pill as before.
        label: e.mapLabel,
        statusLabel: e.statusLabel,
        selected: e.id === selectedId,
        tooltip: e.tooltip,
      })),
    [entities, selectedId, showVehicles, disabledVehStatuses, visibleIds]
  );

  /* live ETA countdown (loops) */
  const countdownFrom = data.liveBadge?.countdownFromSec;
  const [etaSec, setEtaSec] = React.useState(countdownFrom ?? 0);
  React.useEffect(() => {
    if (!countdownFrom) return;
    setEtaSec(countdownFrom);
    const t = setInterval(() => setEtaSec((s) => (s <= 1 ? countdownFrom : s - 1)), 1000);
    return () => clearInterval(t);
  }, [countdownFrom]);
  const etaText = countdownFrom ? `${Math.max(1, Math.floor(etaSec / 60))} min` : data.liveBadge?.eta;

  // Close-in zoom for a LIST row click (T-083 #2 — "clicking a worker row
  // must zoom the map to that worker"), distinct from a marker click, which
  // keeps the T-039 zoom-preserving semantics below.
  const LIST_CLICK_ZOOM = 17;

  // Stable identity so the map's marker effect isn't torn down each render.
  // `zoom` is optional and omitted by a MARKER click (`onMarkerClick={select}`
  // passes just the id) so `flyTo` keeps whatever zoom level the map is
  // already at (T-039 #1 — "keep the zoom level as it is, but map should fly
  // to that user and center it"); `MapViewHandle.flyTo` falls back to the
  // map's CURRENT zoom when none is passed. A LIST row click passes its own
  // close-in `LIST_CLICK_ZOOM` (T-083 #2) — selecting either way also opens
  // the entity's popup (`selectedId` drives `TrackingPopup` below).
  const select = React.useCallback(
    (id: string, zoom?: number) => {
      const e = entities.find((x) => x.id === id);
      setSelectedId(id);
      if (e) mapRef.current?.flyTo(e.position, zoom);
      // Trip Management Pass 2: selecting a trip opens its detail via the shell's
      // existing mechanism (`entity.toDetail` → `DetailDescriptor` → the shell's
      // `DetailSheet`, rendering `TaskDetail` — C5). Gated on `listVariant==='trip'`
      // so every existing fleet product (which drills into the detail from an
      // explicit "Open detail view" click inside `TrackingPopup`, not on select)
      // stays byte-behaviour-unchanged.
      if (data.listVariant === 'trip' && e?.toDetail && onOpenDetail) {
        onOpenDetail(e.toDetail());
      }
    },
    [entities, data.listVariant, onOpenDetail]
  );

  // Zones/POIs overlays: only the enabled ones are drawn on the map.
  const dataZones = data.zones ?? [];
  const dataPois = data.pois ?? [];
  // A zone/POI is drawn when either its side-sheet checkbox is on OR the
  // right-column layer toggle (showZonesLayer / showPoisLayer) is on.
  const shownDataZones = dataZones.filter((z) => showZonesLayer || enabledZones.has(z.id)).map((z) => ({ id: z.id, points: z.points, color: z.color, label: z.name }));
  const shownPois = dataPois.filter((p) => showPoisLayer || enabledPois.has(p.id)).map((p) => ({ id: p.id, position: p.position, label: p.name, color: p.color, iconUrl: p.iconUrl }));
  // Aux-layer contributions (markers + zones) — each layer opts in based
  // on its toggle state (`auxEnabled`). Zones from aux layers are drawn
  // BENEATH the data zones (same LeafletMap `zones` array).
  const auxMarkers = React.useMemo(() => auxLayers.flatMap((l) => (
    auxEnabled.has(l.id) && l.buildMarkers ? l.buildMarkers() : []
  )), [auxLayers, auxEnabled]);
  const auxZones = React.useMemo(() => auxLayers.flatMap((l) => (
    auxEnabled.has(l.id) && l.buildZones ? l.buildZones() : []
  )), [auxLayers, auxEnabled]);
  // Nearby Incidents markers — from `data.incidents.buildMarkers()`, filtered
  // by the currently-checked severities in the top-bar checkbox row.
  const incidentMarkers = React.useMemo(
    // Incidents cluster together with vehicles when zoomed out (Figma
    // 275-96858) — their severity-coloured `status` feeds the donut ring.
    () => (data.incidents ? data.incidents.buildMarkers(enabledSeverities).map((mk) => ({ ...mk, clusterable: true })) : []),
    [data.incidents, enabledSeverities],
  );
  const shownZones = [...auxZones, ...shownDataZones];
  const overlayItems: (MonitoringZone | MonitoringPoi)[] = overlay === 'zones' ? dataZones : overlay === 'pois' ? dataPois : [];
  const listWidth = data.listWidth ?? 340;
  // Expanded Hybrid panel width — wide enough for Vehicle + all 7 optional
  // columns + the edit pencil without horizontal scroll.
  const EXPANDED_LIST_WIDTH = 760;
  // Narrow-viewport clamp (see the panel's `style` below): the map must
  // always keep at least this many px, plus the panel's own `m-3` margins
  // on both sides, regardless of the panel's fixed Figma width.
  const MIN_MAP_WIDTH = 240;
  const PANEL_MARGIN = 24;

  return (
    <TooltipProvider delayDuration={150}>
    <div className={cn('flex h-full min-h-0 items-stretch', fullscreen && 'fixed inset-0 z-[1500] bg-background')}>
      {/* ── Fleet list panel ──────────────────────────────────────────── */}
      <aside
        className={cn(
          'flex min-w-0 flex-col overflow-hidden bg-card transition-[width] duration-300',
          // Flush white panel per C&C — no margin/card treatment, so the
          // whole left side reads as one white surface against the map.
          // List view → full width; Map view → hidden; Hybrid → fixed (collapsible).
          view === 'list' ? 'flex-1' : view === 'map' ? 'w-0 shrink-0' : collapsed ? 'w-0 shrink-0' : 'shrink-0'
        )}
        // The panel's Figma-spec width (472 px, or 760 px expanded) is a
        // fixed target, not a floor — on a narrow window (or this view
        // embedded in a smaller pane) that fixed width can eat almost the
        // entire row and squeeze the map to a sliver, since flexbox alone
        // won't shrink a `shrink-0` item below its `style.width`. `maxWidth`
        // clamps it to "whatever's left after the map keeps its own
        // MIN_MAP_WIDTH" — calculated against the flex row's own width via
        // `%`, so the panel only gives up its Figma width once the window
        // is too narrow to fit both at spec. The fleet table already
        // scrolls horizontally within the panel, so a narrower panel just
        // means more scrolling, never clipped/overlapping content.
        style={view === 'hybrid' && !collapsed ? {
          width: panelExpanded ? EXPANDED_LIST_WIDTH : listWidth,
          maxWidth: `calc(100% - ${MIN_MAP_WIDTH + PANEL_MARGIN}px)`,
        } : undefined}
      >
        {/* Search + filter row — shown in both Hybrid and List View. Figma
            275-97177 (the Hybrid fleet panel's own header) has this exact
            search+funnel row at the top of the table, so it belongs in
            Hybrid too — an earlier pass had removed it from Hybrid only,
            that was reversed per follow-up feedback. Wired to the shared
            `query`/facet-filter state so it actually filters `listEntities`
            below (and, transitively, the map markers built from the same
            filtered set) in both views. */}
        {/* Figma spec (Frame 275-97177, same layout as 48095831): search row
            sits at y=16 inside the panel with 12px x-inset — content width
            composed of a flex-1 search input + 8px gap + 32px filter
            button, both 32px tall with 4px corner radius. The row (and its
            search-input wrapper) MUST be `min-w-0` — a plain `flex-1` flex
            item defaults to `min-width:auto`, which lets an oversized
            sibling (the now-horizontally-scrollable table below, once Fill
            Level pushes it past the panel width) set a min-content floor
            that drags this whole row wider than the panel, breaking it out
            past the panel's right edge. `min-w-0` here matches Figma's own
            `min-w-px` on this exact node and keeps the row's width strictly
            governed by the panel/aside, never by the table beneath it. */}
        <div className="flex w-full min-w-0 shrink-0 items-center gap-2 px-3 pt-4">
          <div className="relative min-w-0 flex-1">
            <Search size={16} className="pointer-events-none absolute left-2 top-1/2 z-10 -translate-y-1/2 text-muted-foreground" />
            <input
              ref={searchRef}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search"
              className="h-8 w-full rounded border border-border bg-card pl-8 pr-2 text-body-sm outline-none placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:ring-ring"
            />
          </div>
          {/* Filter funnel → filter popup: grouped facet sections + tags +
              saved filters. Same "Popup" shell as Figma 275-91160 (white
              card, 4px radius, #D0D5DD border, 6/6/23 drop shadow, bold
              title + X close, search box) as `FleetHeader`'s Columns
              popover above — 275-91160 itself is that Columns popup (a
              show/hide-column toggle list), not a facet-value filter, so
              there's no literal 1:1 Figma frame for "filter by value with a
              count" rows; this reuses that same popup chrome/search
              pattern for the facet content this module actually needs
              (status/tag/etc. multi-select, wired to `facetSel`/`tagSel`,
              which drives `listEntities` below and therefore the map
              markers built from it too). */}
          {facetSections.length || data.filterTags?.length ? (
            <Popover open={filterPopoverOpen} onOpenChange={(open) => { setFilterPopoverOpen(open); if (!open) setFilterSearch(''); }}>
              <PopoverTrigger asChild>
                <button
                  type="button"
                  aria-label="Filter"
                  className={cn(
                    'relative grid size-8 shrink-0 place-items-center rounded border transition-colors',
                    selectedCount ? 'border-primary bg-primary text-primary-foreground' : 'border-border bg-card text-foreground hover:bg-muted'
                  )}
                >
                  <FunnelIcon size={16} />
                  {selectedCount ? (
                    <span className="absolute -right-1.5 -top-1.5 inline-flex size-4 items-center justify-center rounded-full bg-primary text-caption font-bold text-primary-foreground">
                      {selectedCount}
                    </span>
                  ) : null}
                </button>
              </PopoverTrigger>
              {/* Popup chrome per Figma 275-91160: white card, grey-300 border,
                  4px radius, 6/6/23 shadow, 12px x-padding · 16px y-padding,
                  16px block gap; 16px Gilroy-Bold grey-700 title with a 16px
                  close X; 32px search field with 16px icon and 10px grey-400
                  placeholder. */}
              <PopoverContent
                align="end"
                sideOffset={6}
                className="w-72 rounded-[4px] border-[color:var(--gray-300)] p-0 shadow-[6px_6px_23px_0_rgba(0,0,0,0.16)]"
                // The nested date picker renders in its own portal, so clicks
                // inside it register as "outside" this popover — keep the
                // Filters panel open while the picker is up.
                onInteractOutside={(e) => { if (datePickerOpen) e.preventDefault(); }}
                onEscapeKeyDown={(e) => { if (datePickerOpen) { e.preventDefault(); setDatePickerOpen(false); } }}
              >
                <div className="flex items-center justify-between px-3 pt-4">
                  <span className="text-[16px] font-bold leading-none text-[color:var(--gray-700)]">Filters</span>
                  <button type="button" aria-label="Close" onClick={() => setFilterPopoverOpen(false)} className="grid size-4 place-items-center text-muted-foreground transition-colors hover:text-foreground">
                    <X size={16} />
                  </button>
                </div>
                <div className="px-3 pt-4">
                  <div className="relative">
                    <Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[color:var(--gray-400)]" />
                    <input
                      value={filterSearch}
                      onChange={(e) => setFilterSearch(e.target.value)}
                      placeholder="Search Filters"
                      className="h-8 w-full rounded-[4px] border border-[color:var(--gray-300)] bg-card pl-9 pr-2 text-[10px] font-medium text-foreground outline-none placeholder:text-[color:var(--gray-400)] focus-visible:ring-2 focus-visible:ring-ring"
                    />
                  </div>
                </div>
                {data.savedFilters?.length || selectedCount ? (
                  <div className="flex items-center justify-between gap-2 px-3 pt-2">
                    {data.savedFilters?.length ? (
                      <select
                        aria-label="Saved filters"
                        className="h-6 rounded-md border border-border bg-card px-1.5 text-caption text-foreground outline-none"
                        value=""
                        onChange={(e) => { const sf = data.savedFilters!.find((s) => s.id === e.target.value); if (sf) { setFacetSel(sf.facets ?? {}); setTagSel(sf.tags ?? []); } }}
                      >
                        <option value="">Saved Filters</option>
                        {data.savedFilters.map((s) => <option key={s.id} value={s.id}>{s.label}</option>)}
                      </select>
                    ) : <span />}
                    {selectedCount ? (
                      <button type="button" onClick={clearAllFilters} className="text-caption font-semibold text-[var(--status-error)] hover:underline">Clear all</button>
                    ) : null}
                  </div>
                ) : null}
                {/* Body per the popup anatomy: 24px between sections, 12px
                    header→rows, 16px between rows; 12px SemiBold grey-400
                    section headers; 12px Medium grey-700 row labels. */}
                <div className="max-h-80 overflow-y-auto px-3 pb-4 pt-4">
                  <div className="flex flex-col gap-6">
                    {/* Date filter (Tadweer 4123-32174): 56px dropdown field —
                        24px calendar glyph · 14px semibold placeholder ·
                        chevron — opening the preset-rail + calendar picker
                        (4123-32264). */}
                    <Popover open={datePickerOpen} onOpenChange={setDatePickerOpen}>
                      <PopoverTrigger asChild>
                        <button
                          type="button"
                          aria-label="Select date"
                          aria-expanded={datePickerOpen}
                          className={cn(
                            'flex h-14 w-full items-center gap-2 rounded-[6px] border bg-card px-3 text-left transition-colors hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring',
                            dateRange ? 'border-primary' : 'border-[color:var(--gray-300)]',
                          )}
                        >
                          <CalendarIcon size={24} className={cn(dateRange ? 'text-primary' : 'text-muted-foreground')} />
                          <span className={cn('min-w-0 flex-1 truncate text-[14px] font-semibold', dateRange ? 'text-foreground' : 'text-muted-foreground')}>
                            {dateRange ? dateRange.label : 'Select Date'}
                          </span>
                          <ChevronDown size={16} className="shrink-0 text-muted-foreground" />
                        </button>
                      </PopoverTrigger>
                      <PopoverContent side="bottom" align="center" sideOffset={8} collisionPadding={12} className="w-auto rounded-lg border-[color:var(--gray-300)] p-0 shadow-[6px_6px_23px_0_rgba(0,0,0,0.16)]">
                        <DateRangePicker
                          value={dateRange}
                          onCancel={() => setDatePickerOpen(false)}
                          onApply={(r) => { setDateRange(r); setDatePickerOpen(false); }}
                        />
                      </PopoverContent>
                    </Popover>
                    {data.filterTags?.length && (!filterSearch.trim() || 'tags'.includes(filterSearch.trim().toLowerCase()) || data.filterTags.some((t) => t.toLowerCase().includes(filterSearch.trim().toLowerCase()))) ? (
                      <div className="flex flex-col gap-3">
                        <p className="text-[12px] font-semibold leading-none text-[color:var(--gray-400)]">Tags</p>
                        <div className="flex flex-wrap gap-1.5">
                          {data.filterTags
                            .filter((t) => !filterSearch.trim() || t.toLowerCase().includes(filterSearch.trim().toLowerCase()))
                            .map((tag) => {
                              const on = tagSel.includes(tag);
                              return (
                                <button key={tag} type="button" onClick={() => toggleTag(tag)} className={cn('rounded-md border px-2 py-0.5 text-caption font-medium transition-colors', on ? 'border-primary bg-secondary text-primary' : 'border-border text-muted-foreground hover:bg-muted')}>
                                  {tag}
                                </button>
                              );
                            })}
                        </div>
                      </div>
                    ) : null}
                    {facetSections
                      .filter((section) => !filterSearch.trim() || section.label.toLowerCase().includes(filterSearch.trim().toLowerCase()) || section.options.some((o) => o.value.toLowerCase().includes(filterSearch.trim().toLowerCase())))
                      .map((section) => (
                      <div key={section.id} className="flex flex-col gap-3">
                        <p className="text-[12px] font-semibold leading-none text-[color:var(--gray-400)]">{section.label}</p>
                        <div className="flex flex-col gap-4">
                          {section.options
                            .filter((opt) => !filterSearch.trim() || section.label.toLowerCase().includes(filterSearch.trim().toLowerCase()) || opt.value.toLowerCase().includes(filterSearch.trim().toLowerCase()))
                            .map((opt) => {
                            const on = (facetSel[section.id] ?? []).includes(opt.value);
                            return (
                              <button key={opt.value} type="button" onClick={() => toggleFacet(section.id, opt.value)} className="flex items-center justify-between gap-2 text-left outline-none">
                                <span className="flex min-w-0 items-center gap-2">
                                  <span className={cn('grid size-4 shrink-0 place-items-center rounded border transition-colors', on ? 'border-primary bg-primary text-primary-foreground' : 'border-border')}>
                                    {on ? <Check size={10} /> : null}
                                  </span>
                                  {opt.color ? <span aria-hidden className="size-2 shrink-0 rounded-full" style={{ background: opt.color }} /> : null}
                                  <span className="truncate text-[12px] font-medium text-[color:var(--gray-700)]">{opt.value}</span>
                                </span>
                                <span className="shrink-0 text-[12px] font-medium tabular-nums text-[color:var(--gray-700)]">{opt.count}</span>
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    ))}
                    {filterSearch.trim() && !facetSections.some((s) => s.label.toLowerCase().includes(filterSearch.trim().toLowerCase()) || s.options.some((o) => o.value.toLowerCase().includes(filterSearch.trim().toLowerCase()))) && !(data.filterTags?.some((t) => t.toLowerCase().includes(filterSearch.trim().toLowerCase()))) ? (
                      <p className="py-2 text-center text-caption text-muted-foreground">No matching filters.</p>
                    ) : null}
                  </div>
                </div>
              </PopoverContent>
            </Popover>
          ) : null}
          {/* Optional "+" create button (mirrors ZonesModuleData.onCreateZone) — omitted entirely
              when `data.onCreate` isn't wired, so there's never an unwired decorative control
              (e.g. Trip Management Pass 1 defers the New-Trip wizard, so it doesn't set this yet). */}
          {data.onCreate ? (
            <button
              type="button"
              aria-label="Create"
              onClick={data.onCreate}
              className="grid size-8 shrink-0 place-items-center rounded-md bg-primary text-primary-foreground outline-none transition-colors hover:opacity-90"
            >
              <Plus size={15} />
            </button>
          ) : null}
        </div>
        {/* TODO(C1 adoption): this panel is a narrow (≤~420px) list-panel toolbar, not the
            full-width entity/pipeline row — the exported `ModuleToolbar` (search+pinned-facets+
            sort+create in one wide row) doesn't fit this geometry without a rewrite of both. Kept
            as the existing hand-rolled search+funnel-popover toolbar for Pass 1 (Trip Management
            spec); tracked as a later C1 sweep item, not solved here. */}
        {/* `data.hideListCount` opt-in (Flood Management, 275-97176): the
            reference table goes straight from search into the column
            header, no count line — but the "Hide/Show applied filters"
            link still needs to render whenever facets are active, so this
            row only fully disappears when there's nothing to show. */}
        {!data.hideListCount || selectedCount > 0 ? (
        <div className="flex min-w-0 shrink-0 items-center justify-between px-3 py-2">
          {data.hideListCount ? (
            <span />
          ) : data.loading ? (
            <Skeleton className="h-3 w-28" />
          ) : data.listVariant === 'trip' ? (
            // Trip Management Pass 1 punch list #6 — an equivalent "Showing N
            // trips" affordance, never nulled out like the fleet branch below.
            <span className="text-caption text-muted-foreground">
              Showing <span className="font-semibold text-foreground">{visibleList.length}</span>
              {selectedCount ? <> of {listEntities.length} trips</> : <> trips</>}
            </span>
          ) : (
          <span className="text-caption text-muted-foreground">
            Showing <span className="font-semibold text-foreground">{visibleList.length}</span>
            {selectedCount ? <> items out of {listEntities.length}</> : <> {data.listTitle ?? 'tracked'}</>}
          </span>
          )}
          {selectedCount ? (
            <button type="button" onClick={() => setAppliedHidden((v) => !v)} className="text-caption font-medium text-primary outline-none hover:underline">
              {appliedHidden ? 'Show applied filters' : 'Hide applied filters'}
            </button>
          ) : null}
        </div>
        ) : null}

        {/* Applied-filter chips — each removes on click (canonical applied-filters row). */}
        {selectedCount > 0 && !appliedHidden ? (
          <div className="flex min-w-0 shrink-0 flex-wrap gap-1.5 border-b border-border px-3 pb-2.5">
            {appliedChips.map((c) => (
              <button
                key={c.key}
                type="button"
                onClick={c.remove}
                className="inline-flex items-center gap-1 rounded-md bg-secondary px-2 py-0.5 text-caption font-medium text-secondary-foreground transition-opacity hover:opacity-80"
              >
                {c.label}
                <X size={11} />
              </button>
            ))}
          </div>
        ) : null}

        {/* Progress KPI above the list (e.g. "Fleet Utilization" used/total) — config-gated,
            independent of `listVariant` so any monitoring product can opt in. While loading,
            the trip variant reserves the SAME slot as a skeleton (Trip Management Pass 1 punch
            list #4) so the KPI card doesn't pop in and shift the list below it. */}
        {data.listKpi && data.loading && data.listVariant === 'trip' ? (
          <div className="shrink-0 border-b border-border px-3 py-2.5">
            <Skeleton className="mb-1.5 h-3 w-32" />
            <div className="flex items-center gap-2">
              <Skeleton className="h-1.5 flex-1 rounded-full" />
              <Skeleton className="h-3 w-10 shrink-0" />
            </div>
          </div>
        ) : data.listKpi && !data.loading ? (
          <div className="shrink-0 border-b border-border px-3 py-2.5">
            <div className="mb-1.5 flex items-center gap-1.5 text-caption font-semibold text-foreground">
              <TrendUp01 size={13} className="text-muted-foreground" />
              {data.listKpi.label}
            </div>
            <div className="flex items-center gap-2">
              <span className="h-1.5 flex-1 overflow-hidden rounded-full bg-muted">
                <span
                  className="block h-full rounded-full"
                  style={{
                    width: `${Math.round(Math.min(1, Math.max(0, data.listKpi.total ? data.listKpi.value / data.listKpi.total : 0)) * 100)}%`,
                    background: data.listKpi.tone ?? 'var(--status-success)',
                  }}
                />
              </span>
              <span className="shrink-0 text-caption font-semibold text-muted-foreground">
                {data.listKpi.value}/{data.listKpi.total}
              </span>
            </div>
          </div>
        ) : null}

        {/* Header + rows share ONE scroll container (both axes), so the
            sticky-top header always scrolls horizontally in sync with the
            rows — the whole table (all columns) is one plain horizontally
            scrollable grid whenever the visible columns overflow the panel
            width (e.g. Fill Level back on pushes past 472px); no separate
            x/y containers to drift apart, no pinned/"3 main columns" mode. */}
        {/* Figma spec (Frame 1261155410): 16 px gap between the search row
            and the column header, and each row uses its own inset — no
            extra outer padding on the table container. */}
        {/* The scroll affordance below matters because this container's
            native scrollbar is an invisible macOS/iOS "overlay" scrollbar
            that only appears mid-drag — with columns routinely wider than
            the 472 px panel (e.g. Activity Overview truncated at the edge),
            a first-time viewer has no visual cue there's more to the right.
            `[&::-webkit-scrollbar]:h-1.5` + `scrollbar-color` force a thin,
            always-visible track/thumb (Chrome/Edge via the pseudo-element,
            Firefox via `scrollbar-width`/`scrollbar-color`) instead of
            relying on hover-to-reveal. */}
        {/* Table boundary per C&C: 1px border, 6px corner radius, inset to
            the panel's 12px gutter (overflow-hidden clips rows/header to the
            rounded corners). */}
        <div className="relative mx-3 mb-3 mt-4 min-h-0 flex-1 overflow-hidden rounded-[6px] border border-border">
        {/* Right-edge fade — a fixed cue (not scroll-position-aware) that
            content continues past the panel edge whenever the table is
            wider than the panel. Sits OUTSIDE the scroll container (a
            sibling, not a child) so it's pinned to the panel's own edge
            instead of scrolling away with the row content. */}
        <div className="pointer-events-none absolute inset-y-0 right-0 z-20 w-6 bg-gradient-to-l from-card to-transparent" aria-hidden />
        <div
          className="h-full overflow-auto [scrollbar-width:thin] [scrollbar-color:var(--border)_transparent] [&::-webkit-scrollbar]:h-1.5 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-[color:var(--border)]"
          style={data.listMinWidth ? { minWidth: data.listMinWidth } : undefined}
        >

        {/* Column header row + config pencil — fleet variant only; the
            trip-card list variant has no fixed columns to toggle. Sticky
            to the top of the shared scroll container. */}
        {!data.loading && data.listVariant !== 'trip' ? (
          <div className="sticky top-0 z-10">
            <FleetHeader
              cols={listCols}
              setCols={setListCols}
              labels={data.listColumnLabels}
              colGate={colGate}
            />
          </div>
        ) : null}

        {data.loading ? (
          data.listVariant === 'trip' ? <TripListSkeleton /> : <FleetListSkeleton />
        ) : (
          <>
            {visibleList.map((e) =>
              data.listVariant === 'trip' ? (
                <TripCard
                  key={e.id}
                  entity={e}
                  statusColor={STATUS_HEX[e.status] ?? STATUS_HEX.default}
                  selected={e.id === selectedId}
                  onClick={() => select(e.id, LIST_CLICK_ZOOM)}
                />
              ) : (
                <FleetRow key={e.id} entity={e} selected={e.id === selectedId} cols={listCols} colGate={colGate} hideSubtitle={data.hideRowSubtitle} onClick={() => select(e.id, LIST_CLICK_ZOOM)} />
              )
            )}
            {!visibleList.length ? (
              <div className="px-3 py-6 text-center text-caption text-muted-foreground">
                {/* Trip Management Pass 1 punch list #5 — a genuinely empty trip list (no
                    entities at all, no search/filter active) reads "No Trips", distinct
                    from a search/filter that legitimately matches nothing ("No matches"). */}
                {data.listVariant === 'trip' && !query && !selectedCount
                  ? data.emptyPreview?.title ?? 'No Trips'
                  : 'No matches.'}
              </div>
            ) : null}
          </>
        )}
        </div>
        </div>
      </aside>

      {/* ── Map area (hidden in List view) ────────────────────────────── */}
      {view !== 'list' ? (
      <div className="relative min-w-0 flex-1 overflow-hidden">
        <LeafletMap
          ref={mapRef}
          center={data.center}
          zoom={data.zoom ?? 12}
          // The view owns its zoom/fullscreen toolbar — suppress the map
          // engine's built-in control cluster (was double-rendered, T-023).
          controls={false}
          styleUrl={basemap.style}
          rasterOverlays={rasterOverlays}
          markers={data.loading ? [] : [...markers, ...auxMarkers, ...incidentMarkers, ...rainCellMarkers, ...stationMarkers]}
          heat={data.loading ? [] : rainHeatPoints}
          cluster={clustered}
          zones={data.loading ? [] : [...shownZones, ...rainCellZones, ...cloudZones, ...precipZones]}
          pois={data.loading ? [] : shownPois}
          routes={showRoutes ? routes : []}
          fitToContent
          onMarkerClick={select}
          onViewportChange={updatePopupPoint}
          className="h-full w-full"
        />

        {/* Map skeleton sheen while loading (under the toolbars; tiles stay faintly visible). */}
        {data.loading ? <div className="pointer-events-none absolute inset-0 z-[800] animate-pulse bg-muted/40" /> : null}

        {/* List collapse/density control at the list↔map seam — Figma
            275-98876: a 16×57px vertical pill (white, #D0D5DD-equivalent
            border, 9px radius) stacking 3 icon buttons over 1px dividers:
            X (hide the list entirely), a single chevron (normal panel
            width), a double chevron (the wide/expanded panel width). This
            REPLACES the old lone chevron toggle, folding the header's
            former "expand columns" control into the same seam widget. */}
        {view === 'hybrid' ? (
          <div className="absolute left-0 top-1/2 z-[1000] flex w-4 -translate-y-1/2 flex-col items-center gap-0.5 rounded-[9px] border border-border bg-card py-1 shadow-sm">
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  type="button"
                  aria-label="Hide list"
                  aria-pressed={collapsed}
                  onClick={() => setCollapsed(true)}
                  className={cn('grid size-3 place-items-center transition-colors', collapsed ? 'text-primary' : 'text-muted-foreground hover:text-foreground')}
                >
                  <X size={11} />
                </button>
              </TooltipTrigger>
              <TooltipContent side="right">Hide list</TooltipContent>
            </Tooltip>
            <span aria-hidden className="h-px w-3.5 bg-[color:var(--gray-300,#d9d9d9)]" />
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  type="button"
                  aria-label="Show list (normal width)"
                  aria-pressed={!collapsed && !panelExpanded}
                  onClick={() => { setCollapsed(false); setPanelExpanded(false); }}
                  className={cn('grid size-3 place-items-center transition-colors', !collapsed && !panelExpanded ? 'text-primary' : 'text-muted-foreground hover:text-foreground')}
                >
                  <ChevronLeft size={11} />
                </button>
              </TooltipTrigger>
              <TooltipContent side="right">Show list</TooltipContent>
            </Tooltip>
            <span aria-hidden className="h-px w-3.5 bg-[color:var(--gray-300,#d9d9d9)]" />
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  type="button"
                  aria-label="Show list (expanded width)"
                  aria-pressed={!collapsed && panelExpanded}
                  onClick={() => { setCollapsed(false); setPanelExpanded(true); }}
                  className={cn('grid size-3 place-items-center transition-colors', !collapsed && panelExpanded ? 'text-primary' : 'text-muted-foreground hover:text-foreground')}
                >
                  <ChevronLeftDouble size={11} />
                </button>
              </TooltipTrigger>
              <TooltipContent side="right">Expand list</TooltipContent>
            </Tooltip>
          </div>
        ) : null}

        {/* ══ TOP CONTROL BAR — Location search · Show/Hide Analytics ·
            Incident severity checkboxes · Layers. Single row, clears the
            map body. The severity row REPLACES the "Nearby Incidents"
            aux-layer tip button. ══ */}
        {!overlaysHidden ? (
          <div className="pointer-events-none absolute inset-x-3 top-3 z-20 flex flex-wrap items-start gap-2 pe-12">
            {/* Location search — click to open a popover that searches
                zones/black-spots/POIs; picking one flies the map to it. */}
            {data.locations?.length ? (
              <Popover open={locSearchOpen} onOpenChange={setLocSearchOpen}>
                <PopoverTrigger asChild>
                  <button
                    type="button"
                    aria-label="Search location on map"
                    className="pointer-events-auto grid size-9 shrink-0 place-items-center rounded-lg border border-border bg-card text-[color:var(--status-info)] shadow-sm transition-colors hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    <Search size={16} />
                  </button>
                </PopoverTrigger>
                <PopoverContent align="start" className="w-72 p-0">
                  <div className="border-b border-border p-2">
                    <input
                      autoFocus
                      value={locSearchQuery}
                      onChange={(e) => setLocSearchQuery(e.target.value)}
                      placeholder="Search location on map"
                      className="h-9 w-full rounded-md border border-border bg-card px-3 text-body-sm outline-none placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:ring-ring"
                    />
                  </div>
                  <div className="max-h-64 overflow-y-auto p-1">
                    {data.locations
                      .filter((l) => !locSearchQuery.trim() || `${l.label} ${l.sublabel ?? ''}`.toLowerCase().includes(locSearchQuery.trim().toLowerCase()))
                      .slice(0, 40)
                      .map((l) => (
                        <button
                          key={l.id}
                          type="button"
                          onClick={() => { mapRef.current?.flyTo(l.position, l.zoom ?? 14); setLocSearchOpen(false); setLocSearchQuery(''); }}
                          className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-start transition-colors hover:bg-muted"
                        >
                          <PinIcon size={13} className="shrink-0 text-muted-foreground" />
                          <span className="flex min-w-0 flex-col">
                            <span className="truncate text-body-sm font-semibold text-foreground">{l.label}</span>
                            {l.sublabel ? <span className="truncate text-caption text-muted-foreground">{l.sublabel}</span> : null}
                          </span>
                        </button>
                      ))}
                    {data.locations.filter((l) => !locSearchQuery.trim() || `${l.label} ${l.sublabel ?? ''}`.toLowerCase().includes(locSearchQuery.trim().toLowerCase())).length === 0 ? (
                      <p className="px-2 py-3 text-center text-caption text-muted-foreground">No matches.</p>
                    ) : null}
                  </div>
                </PopoverContent>
              </Popover>
            ) : (
              <button
                type="button"
                aria-label="Search on map"
                onClick={() => searchRef.current?.focus()}
                className="pointer-events-auto grid size-9 shrink-0 place-items-center rounded-lg border border-border bg-card text-[color:var(--status-info)] shadow-sm transition-colors hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring"
              >
                <Search size={16} />
              </button>
            )}
            {data.analytics ? (
              <button
                type="button"
                onClick={() => setAnalyticsHidden((v) => !v)}
                aria-pressed={!analyticsHidden}
                className="pointer-events-auto flex shrink-0 items-center gap-2 rounded-lg bg-primary px-3 py-2 text-body-sm font-semibold text-primary-foreground shadow-sm transition-colors hover:bg-[color:var(--primary-dark)] focus-visible:ring-2 focus-visible:ring-ring"
              >
                {analyticsHidden ? <Eye size={16} /> : <EyeOff size={16} />}
                {analyticsHidden ? 'Show Analytics' : 'Hide Analytics'}
              </button>
            ) : null}
            {/* Incident severity checkboxes — replaces the Nearby Incidents
                aux-layer toggle. Each row: checkbox + label + (nn) count +
                severity-token dot. Same pattern as the incidents-hybrid
                top bar so the two surfaces stay visually consistent. */}
            {data.incidents?.severities.length ? (
              <div className="pointer-events-auto flex flex-wrap items-center gap-1.5">
                {data.incidents.severities.map((s) => {
                  const on = enabledSeverities.has(s.id);
                  return (
                    <button
                      key={s.id}
                      type="button"
                      onClick={() => toggleSeverity(s.id)}
                      aria-pressed={on}
                      className={cn(
                        'flex shrink-0 items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-caption font-semibold shadow-sm transition-colors focus-visible:ring-2 focus-visible:ring-ring',
                        on ? 'border-border bg-card text-foreground' : 'border-border bg-card/70 text-muted-foreground',
                      )}
                    >
                      <span aria-hidden className={cn('grid size-4 place-items-center rounded border', on ? 'border-primary bg-primary text-primary-foreground' : 'border-border')}>
                        {on && <Check size={11} />}
                      </span>
                      {s.label} <span className="text-muted-foreground">({String(s.count).padStart(2, '0')})</span>
                      <span className="size-2 rounded-full" style={{ background: s.color }} />
                    </button>
                  );
                })}
              </div>
            ) : null}
            {/* Vehicle mobility-status checkboxes (Figma 285-37970) — one
                card, border-divided segments: checkbox · label (count) ·
                status-tinted truck glyph. The glyph colour matches the tanker
                map-pin accent for that status; unchecking hides those pins. */}
            {vehStatusGroups.length ? (
              <div className="pointer-events-auto flex min-w-0 flex-wrap items-center rounded-lg border border-border bg-card px-1.5 shadow-sm">
                {vehStatusGroups.map((g, i) => {
                  const on = !disabledVehStatuses.has(g.label);
                  return (
                    <button
                      key={g.label}
                      type="button"
                      onClick={() => toggleVehStatus(g.label)}
                      aria-pressed={on}
                      className={cn(
                        'flex h-8 shrink-0 items-center gap-1.5 px-2.5 text-caption font-semibold capitalize transition-colors focus-visible:ring-2 focus-visible:ring-ring',
                        i > 0 && 'border-s border-border',
                        on ? 'text-foreground' : 'text-muted-foreground',
                      )}
                    >
                      <span aria-hidden className={cn('grid size-4 place-items-center rounded border transition-colors', on ? 'border-primary bg-primary text-primary-foreground' : 'border-border')}>
                        {on && <Check size={11} />}
                      </span>
                      {g.label} <span className="text-muted-foreground">({String(g.count).padStart(2, '0')})</span>
                      <Truck01 aria-hidden size={16} style={{ color: g.color }} />
                    </button>
                  );
                })}
              </div>
            ) : null}
          </div>
        ) : null}

        {/* ══ RIGHT CONTROL COLUMN — Map Layers tile (Figma 288-38032: map
            thumbnail + dark scrim + white layers glyph) on top, then one tip
            button per aux map layer (POI / Zones-Geofences), then the legacy
            Vehicles/Zones/POI/Routes/Cluster controls when the module doesn't
            opt into aux layers. ══ */}
        {!overlaysHidden ? (
          <TooltipProvider delayDuration={150}>
            {/* Anchored at top-3 so the stack's first tile sits level with
                the top bar's search icon (Figma 288-38032). */}
            <div className="pointer-events-auto absolute right-3 top-3 z-20 flex flex-col gap-2">
            <Popover open={layersOpen} onOpenChange={setLayersOpen}>
              <PopoverTrigger asChild>
                <button
                  type="button"
                  aria-label="Map layers"
                  aria-expanded={layersOpen}
                  className={cn('relative grid size-9 shrink-0 place-items-center overflow-hidden rounded-lg border shadow-sm transition-opacity hover:opacity-90 focus-visible:ring-2 focus-visible:ring-ring', layersOpen ? 'border-primary' : 'border-border')}
                >
                  <img alt="" aria-hidden src={mapLayersThumb} className="absolute inset-0 size-full object-cover" />
                  <span aria-hidden className="absolute inset-0 bg-black/30" />
                  <LayersThree01 size={16} className="relative text-white" />
                </button>
              </PopoverTrigger>
              <PopoverContent side="left" align="start" className="w-60 p-0">
                <div className="flex items-center justify-between border-b border-border px-3 py-2">
                  <span className="text-body-sm font-semibold text-foreground">Map layers</span>
                </div>
                {/* Base-map style strip (FAMS Web Portal Figma 34235-7347) —
                    one thumbnail per cartography style, selected = primary
                    ring. Swaps the tile provider without touching overlays. */}
                <div className="border-b border-border p-2">
                  <span className="mb-1.5 block px-1 text-caption font-medium text-muted-foreground">Base map</span>
                  <div className="flex gap-1.5">
                    {BASEMAPS.map((b) => (
                      <button
                        key={b.id}
                        type="button"
                        onClick={() => setBasemapId(b.id)}
                        aria-pressed={basemapId === b.id}
                        className={cn(
                          'flex min-w-0 flex-1 flex-col items-center gap-1 rounded-md p-1 transition-colors focus-visible:ring-2 focus-visible:ring-ring',
                          basemapId === b.id ? 'bg-primary/10' : 'hover:bg-muted',
                        )}
                      >
                        <img
                          alt=""
                          aria-hidden
                          src={b.thumb}
                          style={b.thumbFilter ? { filter: b.thumbFilter } : undefined}
                          className={cn(
                            'h-9 w-full rounded-[7px] border object-cover',
                            basemapId === b.id ? 'border-2 border-primary' : 'border-border',
                          )}
                        />
                        <span className={cn('text-[10px] font-medium leading-none', basemapId === b.id ? 'text-primary' : 'text-muted-foreground')}>{b.label}</span>
                      </button>
                    ))}
                  </div>
                </div>
                {/* NOTE: the aux-layer checkbox list (POI / Vehicles / Zones)
                    was removed at C&C's request — those layers are toggled
                    from the right-column tiles and the vehicle status
                    checkboxes; this popover is base map + weather only. */}
                {/* Weather overlays — RainViewer live rain-radar tiles drawn
                    semi-transparently over whichever basemap is active. */}
                <div className="border-t border-border p-2">
                  <span className="mb-0.5 block px-1 text-caption font-medium text-muted-foreground">Weather</span>
                  <label className="flex cursor-pointer items-center gap-2.5 rounded-md px-2 py-1.5 transition-colors hover:bg-muted">
                    <Checkbox checked={rainOn} onCheckedChange={() => setRainOn((v) => !v)} aria-label="Rain radar" />
                    <span className="text-muted-foreground"><Droplets01 size={16} /></span>
                    <span className="flex-1 truncate text-body-sm text-foreground">Rain radar</span>
                    <span className="text-[10px] font-medium text-muted-foreground">Live</span>
                  </label>
                  {rainCells.length ? (
                    <label className="flex cursor-pointer items-center gap-2.5 rounded-md px-2 py-1.5 transition-colors hover:bg-muted">
                      <Checkbox checked={simRainOn} onCheckedChange={() => setSimRainOn((v) => !v)} aria-label="Rain (simulated)" />
                      <span className="text-muted-foreground"><Droplets01 size={16} /></span>
                      <span className="flex-1 truncate text-body-sm text-foreground">Rain (simulated)</span>
                      <span className="text-[10px] font-medium text-muted-foreground">Demo</span>
                    </label>
                  ) : null}
                  {weatherStations.length ? (
                    <label className="flex cursor-pointer items-center gap-2.5 rounded-md px-2 py-1.5 transition-colors hover:bg-muted">
                      <Checkbox checked={showStations} onCheckedChange={() => setShowStations((v) => !v)} aria-label="Stations — by temp" />
                      <span className="text-muted-foreground"><Thermometer01 size={16} /></span>
                      <span className="flex-1 truncate text-body-sm text-foreground">Stations ({weatherStations.length}) — by temp</span>
                      <span className="text-[10px] font-medium text-muted-foreground">Demo</span>
                    </label>
                  ) : null}
                  {rainCells.length ? (
                    <label className="flex cursor-pointer items-center gap-2.5 rounded-md px-2 py-1.5 transition-colors hover:bg-muted">
                      <Checkbox checked={showRainHeat} onCheckedChange={() => setShowRainHeat((v) => !v)} aria-label="Rain heatmap" />
                      <span className="text-muted-foreground"><CloudRaining01 size={16} /></span>
                      <span className="flex-1 truncate text-body-sm text-foreground">Rain heatmap</span>
                      <span className="text-[10px] font-medium text-muted-foreground">Demo</span>
                    </label>
                  ) : null}
                  {cloudMasses.length ? (
                    <label className="flex cursor-pointer items-center gap-2.5 rounded-md px-2 py-1.5 transition-colors hover:bg-muted">
                      <Checkbox checked={showClouds} onCheckedChange={() => setShowClouds((v) => !v)} aria-label="Clouds" />
                      <span className="text-muted-foreground"><Cloud01 size={16} /></span>
                      <span className="flex-1 truncate text-body-sm text-foreground">Clouds</span>
                      <span className="text-[10px] font-medium text-muted-foreground">Demo</span>
                    </label>
                  ) : null}
                  {precipAreas.length ? (
                    <label className="flex cursor-pointer items-center gap-2.5 rounded-md px-2 py-1.5 transition-colors hover:bg-muted">
                      <Checkbox checked={showPrecip} onCheckedChange={() => setShowPrecip((v) => !v)} aria-label="Precipitation" />
                      <span className="text-muted-foreground"><Droplets01 size={16} /></span>
                      <span className="flex-1 truncate text-body-sm text-foreground">Precipitation</span>
                      <span className="text-[10px] font-medium text-muted-foreground">Demo</span>
                    </label>
                  ) : null}
                </div>
              </PopoverContent>
            </Popover>
              {auxLayers.length
                ? auxLayers
                    // The Vehicles tile is superseded by the top-bar vehicle
                    // status checkboxes (Figma 285-37970) whenever the module
                    // has vehicle entities to build that row from.
                    .filter((l) => !(l.id === 'veh' && vehStatusGroups.length))
                    .map((l) => (
                    <LmTipBtn key={l.id} label={l.label} active={auxEnabled.has(l.id)} onClick={() => toggleAuxLayer(l.id)}>
                      {l.icon}
                    </LmTipBtn>
                  ))
                : (
                  <>
                    {!vehStatusGroups.length && <LmTipBtn label="Vehicles layer" active={showVehicles} onClick={() => setShowVehicles((v) => !v)}><Truck01 size={16} /></LmTipBtn>}
                    {dataZones.length ? <LmTipBtn label="Zones" active={showZonesLayer} onClick={() => setShowZonesLayer((v) => !v)}><Shapes size={16} /></LmTipBtn> : null}
                    {dataPois.length ? <LmTipBtn label="Points of Interest" active={showPoisLayer} onClick={() => setShowPoisLayer((v) => !v)}><MapPin size={16} /></LmTipBtn> : null}
                    {routes.length ? <LmTipBtn label="Routes" active={showRoutes} onClick={() => setShowRoutes((v) => !v)}><RouteIcon size={16} /></LmTipBtn> : null}
                    <LmTipBtn label={clustered ? 'Uncluster assets' : 'Cluster assets'} active={clustered} onClick={() => setClustered((v) => !v)}><InfoOctagon size={16} /></LmTipBtn>
                  </>
                )}
            </div>
          </TooltipProvider>
        ) : null}

        {/* ══ LEFT INSIGHTS RAIL (copied from Incidents) — analytics widgets ══ */}
        {data.analytics && !overlaysHidden && !analyticsHidden ? (
          <div className="pointer-events-none absolute left-3 top-16 bottom-14 z-10 flex w-[220px] flex-col overflow-y-auto">
            <MapAnalyticsPanel
              showToggle={false}
              floodIndex={data.analytics.floodIndex}
              rainProjection={data.analytics.rainProjection}
              fleet={data.analytics.fleet}
            />
          </div>
        ) : null}

        {/* Empty preview — shown while nothing is selected. */}
        {data.emptyPreview && !selected && !data.loading ? (
          <div className="pointer-events-none absolute inset-0 z-[850] flex flex-col items-center justify-center gap-2 text-center">
            <Globe02 size={40} className="text-muted-foreground/50" />
            <div className="text-body-sm font-semibold text-foreground">{data.emptyPreview.title}</div>
            {data.emptyPreview.hint ? (
              <div className="max-w-[220px] text-caption text-muted-foreground">{data.emptyPreview.hint}</div>
            ) : null}
          </div>
        ) : null}

        {/* ══ BOTTOM-LEFT declutter eye (Figma 495-27733: 40×40, 6px radius,
            soft shadow, no border) ══ */}
        <button
          type="button"
          aria-label={overlaysHidden ? 'Show map overlays' : 'Hide map overlays'}
          aria-pressed={!overlaysHidden}
          onClick={() => setOverlaysHidden((v) => !v)}
          className={cn('absolute bottom-3 left-3 z-20 grid size-10 place-items-center rounded-[6px] bg-card shadow-[6px_10px_12px_0_rgba(0,0,0,0.05)] transition-colors hover:bg-muted', overlaysHidden ? 'text-primary' : 'text-muted-foreground hover:text-foreground')}
        >
          {overlaysHidden ? <Eye size={20} /> : <EyeOff size={20} />}
        </button>

        {/* ══ BOTTOM-RIGHT: zoom + fullscreen (Figma 495-27708/27709-27718:
            40×70 zoom pill with a 26px divider, 40×40 fullscreen tile below,
            6px radius, soft shadow, no border). The list-toggle and
            recenter/home widgets were removed at C&C's request; fullscreen
            occupies the tile where they used to sit. ══ */}
        <div className="pointer-events-auto absolute bottom-3 right-3 z-20 flex flex-col items-end gap-3">
          <div className="flex flex-col items-center overflow-hidden rounded-[6px] bg-card py-1.5 shadow-[6px_10px_12px_0_rgba(0,0,0,0.05)]">
            <button type="button" aria-label="Zoom in" onClick={() => mapRef.current?.zoomIn()} className="grid size-10 place-items-center text-foreground transition-colors hover:bg-muted"><Plus size={20} /></button>
            <span className="h-px w-[26px] bg-border" />
            <button type="button" aria-label="Zoom out" onClick={() => mapRef.current?.zoomOut()} className="grid size-10 place-items-center text-foreground transition-colors hover:bg-muted"><Minus size={20} /></button>
          </div>
          <button type="button" aria-label={fullscreen ? 'Exit fullscreen' : 'Fullscreen'} onClick={() => setFullscreen((v) => !v)} className="grid size-10 place-items-center rounded-[6px] bg-card text-muted-foreground shadow-[6px_10px_12px_0_rgba(0,0,0,0.05)] transition-colors hover:bg-muted hover:text-foreground">
            {fullscreen ? <MinimizeIcon size={20} /> : <ExpandIcon size={20} />}
          </button>
        </div>

        {/* ══ BOTTOM weather (copied from Incidents) — right-aligned, 16px gap. ══ */}
        {data.showWeather && !overlaysHidden ? (
          <div className="pointer-events-none absolute left-14 right-16 bottom-3 z-10 flex flex-col items-end">
            <WeatherForecastWidget />
          </div>
        ) : null}

        {/* Tracking popup — anchored OVER the selected marker (re-projected on
            pan/zoom); falls back to the top-right corner if not yet projected.
            Suppressed for the trip variant (Trip Management Pass 1 punch list #1):
            the generic fleet popup has no trip-shaped content (renders a near-empty
            "No telemetry available." card) — Pass 1's real detail surface is the
            (later) TaskDetail; selecting a trip should ONLY draw its route. */}
        {selected && data.listVariant !== 'trip' ? (
          <div
            className="pointer-events-none absolute z-[1000]"
            style={
              popupPoint
                /* Popup + its 12px tooltip arrow always leave an 8px gap above
                   the tanker marker. Empirically calibrated against the DS
                   map's `project(latlng)` return (which lands close to — but
                   not exactly at — the marker's bottom anchor): a 55px lift
                   places the popup bottom ~20px above the marker top, and the
                   12px arrow closes that to the target 8px gap. */
                ? { left: popupPoint.x, top: popupPoint.y, transform: 'translate(-50%, calc(-100% - 55px))' }
                : { right: 16, top: 16 }
            }
          >
            <div className="pointer-events-auto relative">
              <TrackingPopup
                entity={selected}
                onClose={() => setSelectedId(null)}
                onOpenDetail={onOpenDetail}
                onLocate={() => mapRef.current?.flyTo(selected.position, LIST_CLICK_ZOOM)}
              />
              {/* Tooltip arrow — a downward triangle centred at the card's
                  bottom edge so the popup visually connects to the pin below
                  it (matches the Figma tooltip anatomy). Border layer sits
                  1px BELOW the fill layer so the card's border stays
                  continuous through the arrow's base. */}
              {popupPoint ? (
                <>
                  <span
                    aria-hidden
                    className="absolute left-1/2 h-0 w-0 -translate-x-1/2"
                    style={{
                      top: '100%',
                      borderLeft: '12px solid transparent',
                      borderRight: '12px solid transparent',
                      borderTop: '12px solid var(--border)',
                      filter: 'drop-shadow(0 4px 6px rgba(16,24,40,0.10))',
                    }}
                  />
                  <span
                    aria-hidden
                    className="absolute left-1/2 h-0 w-0 -translate-x-1/2"
                    style={{
                      top: 'calc(100% - 1px)',
                      borderLeft: '11px solid transparent',
                      borderRight: '11px solid transparent',
                      borderTop: '11px solid var(--card)',
                    }}
                  />
                </>
              ) : null}
            </div>
          </div>
        ) : null}
      </div>
      ) : null}

      {/* ── Right side-sheet: Zones / POIs overlays ───────────────────────── */}
      {overlay ? (
        <aside className="flex w-[320px] shrink-0 flex-col overflow-hidden border-l border-border bg-card">
          <div className="flex shrink-0 items-center justify-between gap-2 border-b border-border px-3 py-3">
            <span className="text-body-sm font-semibold text-foreground">{overlay === 'zones' ? 'Zones' : 'Points of Interest'}</span>
            <button
              type="button"
              aria-label="Close"
              onClick={() => setOverlay(null)}
              className="grid size-6 place-items-center rounded-full text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            >
              <X size={13} />
            </button>
          </div>
          <div className="shrink-0 border-b border-border p-2">
            <input
              value={overlayQuery}
              onChange={(e) => setOverlayQuery(e.target.value)}
              placeholder={overlay === 'zones' ? 'Search Zones' : 'Search POIs'}
              className="h-8 w-full rounded-md border border-border bg-card px-2.5 text-body-sm outline-none placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:ring-ring"
            />
          </div>
          {(() => {
            const isZone = overlay === 'zones';
            const items = overlayItems.filter((it) => !overlayQuery || it.name.toLowerCase().includes(overlayQuery.toLowerCase()));
            return (
              <>
                {/* Column headers — zones: Color · Name · Parent / POIs: Name · Coordinates */}
                <div className="flex shrink-0 items-center gap-2.5 border-b border-border px-3 py-1.5 text-caption font-semibold uppercase tracking-wide text-muted-foreground/70">
                  <span className="w-4 shrink-0" />
                  <span className="w-[18px] shrink-0">{isZone ? 'Color' : ''}</span>
                  <span className="min-w-0 flex-1">Name</span>
                  <span className="shrink-0">{isZone ? 'Parent' : 'Coordinates'}</span>
                </div>
                <div className="min-h-0 flex-1 overflow-auto">
                  {items.map((it) => {
                    const on = (isZone ? enabledZones : enabledPois).has(it.id);
                    const color = it.color ?? (isZone ? '#12b76a' : '#7A5AF8'); // coherence-allow — map-engine status→hex bridge
                    const right = isZone
                      ? (it as MonitoringZone).parent
                      : `${(it as MonitoringPoi).position[0].toFixed(3)}, ${(it as MonitoringPoi).position[1].toFixed(3)}`;
                    return (
                      <button
                        key={it.id}
                        type="button"
                        onClick={() => toggleId(isZone ? setEnabledZones : setEnabledPois, it.id)}
                        className="flex w-full items-center gap-2.5 border-b border-border px-3 py-2 text-left outline-none transition-colors hover:bg-muted/40"
                      >
                        <span className={cn('grid size-4 shrink-0 place-items-center rounded border', on ? 'border-primary bg-primary text-primary-foreground' : 'border-border')}>
                          {on ? <Check size={10} /> : null}
                        </span>
                        {isZone ? (
                          <span aria-hidden className="size-[18px] shrink-0 rounded" style={{ background: color }} />
                        ) : (
                          <MapPin size={15} className="shrink-0" style={{ color }} aria-hidden />
                        )}
                        <span className="min-w-0 flex-1 truncate text-body-sm font-medium text-foreground">{it.name}</span>
                        {right ? <span className="shrink-0 text-caption text-muted-foreground">{right}</span> : null}
                      </button>
                    );
                  })}
                  {!items.length ? (
                    <div className="px-3 py-6 text-center text-caption text-muted-foreground">None available.</div>
                  ) : null}
                </div>
              </>
            );
          })()}
        </aside>
      ) : null}
    </div>
    </TooltipProvider>
  );
}
