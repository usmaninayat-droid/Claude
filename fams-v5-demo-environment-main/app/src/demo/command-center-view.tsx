import { useEffect, useMemo, useState } from 'react'
import { useRouter } from '@tanstack/react-router'
import { Icon } from '@fams/ui-kit/icons'
import {
  DonutChart,
  LineChart,
  Sparkline,
  WallKpiCard,
  WallPanel,
  WallStatBar,
  usePrefersReducedMotion,
  useWallClock,
  WALL_KPI_HEIGHT,
} from '@fams/ui-kit'
import { MapView } from '@fams/v5-templates'
import type { EntityConfig, EntityRecord } from '@fams/v5-composer'
import type { LngLat } from '@fams/v5-templates/map'

/**
 * Command Center v2 — the UCCP flood-response single pane (FM-6233): a
 * full-screen dark geospatial dashboard over weather, fleet, requests and
 * dispatch. Rides the `fullScreen` nav-entry seam (skeleton-kit NavEntry
 * v1.2): `V5AppShell` renders NO rail/top bar here; this surface owns all of
 * its chrome, including the back arrow into the V5 app.
 *
 * V2 (user critique of v1 — "government-grade geospatial dashboard"):
 *  - BRANDING/ACTIONS = Qatar MME maroon: the top nav is a dark-adjusted
 *    primary-maroon surface, and every active map toggle paints the tenant
 *    primary (the blue leak was a dark-scope token bug, fixed in
 *    @fams/tokens). CHARTS deliberately do NOT use primary — data marks ride
 *    the DS categorical `--color-chart-1..5` palette plus semantic status
 *    colors, so brand stays branding and data stays data.
 *  - MORE floating chart panels around the map edges (reference:
 *    FAMS-Solutions-Suite 10-geospatial-demo overview-dashboard): requests
 *    trend, municipality donut, response-time stat, rainfall outlook strip —
 *    all DS chart primitives over seed-derived data.
 *  - ONE grouped action stack (`MapView.groupedTools`): no stray corner
 *    buttons; search/cluster join layers/traffic/weather in a single top-end
 *    column.
 *  - Layout bugs: KPI row no longer spans under the tool stack (no clipped
 *    DISPATCHED tile), 16px gutter rhythm everywhere, zero-rain weather
 *    capsules hidden (`weatherHideDryStations`), activity feed shows hours
 *    only below 24h then an absolute date.
 *  - WOW, all `prefers-reduced-motion`-safe: KPI numbers count up on load,
 *    critical request pins pulse (DS `IncidentPin.pulse`), feed entries and
 *    panels slide in with a stagger.
 *
 * ARCHITECTURE unchanged from v1: map machinery is 100% design-system reuse
 * (`MapView` over the live-monitoring blueprint + records; requests ride
 * `MapView.incidents` coloured by the incidents blueprint's own
 * `uiConfig.map.records.colorBy`). Only the dashboard COMPOSITION lives here.
 */

/* ── palette (reference's dark ops-center panels, kept token-adjacent) ──── */
const C = {
  page: '#0b0e11',
  panelBg: 'rgba(12, 14, 15, 0.86)',
  panelBorder: 'rgba(255,255,255,0.08)',
  ink: '#FFFFFF',
  inkDim: 'rgba(255,255,255,0.64)',
  inkFaint: 'rgba(255,255,255,0.38)',
  green: '#12B76A',
  amber: '#F79009',
  red: '#F04438',
  blue: '#2E90FA',
}

/** Key-free CARTO dark-matter vector style — the dark basemap this surface
 *  commits to (an explicit `styleUrl` deliberately pins the basemap; the
 *  cross-app switcher does not restyle a wall display). */
const DARK_BASEMAP_STYLE = 'https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json'

/* Gutter rhythm (critique #4): ONE spacing system — 16px page gutters and
   inter-panel gaps, 16/20px panel padding. Every absolute inset below derives
   from GUTTER + the fixed column/row sizes, so the margins stay equal. */
const GUTTER = 16
const LEFT_W = 320
const RIGHT_W = 324
/** The map's own end-tool column steps inboard of the right panel column. */
const TOOL_END_INSET = RIGHT_W + GUTTER * 2 // tools paint at GUTTER + this
const BODY_TOP = GUTTER * 2 + WALL_KPI_HEIGHT

/** Scoped to `.cc-map-pane` only — see the comment at its <style> use site.
 *  The grouped end-tool column drops from the pane's top gutter to BODY_TOP,
 *  the line the left/right panel columns start on, so the KPI row above it
 *  can span the full width and nothing collides. */
const CC_TOOLS_BELOW_KPIS = `.cc-map-pane [data-slot="live-map-end-tools"]{top:${BODY_TOP}px}`

export interface CommandCenterDeps {
  /** The live-monitoring blueprint (map bindings, weather, zones, POIs). */
  liveConfig?: EntityConfig
  /** Full live-monitoring record set (18 tankers + 15 workforce). */
  listLiveRecords?: () => EntityRecord[]
  /** The incidents blueprint (colorBy metadata for the request pins). */
  incidentsConfig?: EntityConfig
  /** All 36 INC records. */
  listIncidents?: () => EntityRecord[]
}

/* ── metadata readers ───────────────────────────────────────────────────── */

interface ColorByValue {
  value: string
  label: string
  color: string
}

function incidentColorBy(config?: EntityConfig): { col: string; values: ColorByValue[] } {
  const records = config?.uiConfig?.map?.records as
    | { colorBy?: { col?: string; values?: ColorByValue[] } }
    | undefined
  return {
    col: records?.colorBy?.col ?? 'systemcol2',
    values: records?.colorBy?.values ?? [],
  }
}

const STAGE_LABEL: Record<string, string> = {
  intake: 'Intake',
  triage: 'Triage',
  acknowledged: 'Acknowledged',
  assessed: 'Assessed',
  'tanker-assigned': 'Tanker Assigned',
  'job-ongoing': 'Job Ongoing',
  'job-completed': 'Job Completed',
  closed: 'Closed',
  reopened: 'Reopened',
}
const STAGE_ORDER = Object.keys(STAGE_LABEL)
const OPEN_STAGES = new Set(['intake', 'triage', 'acknowledged', 'assessed', 'reopened'])
const DONE_STAGES = new Set(['job-completed', 'closed'])

function fleetCounts(records: EntityRecord[]) {
  const counts = { moving: 0, idling: 0, stopped: 0, nonReporting: 0, total: 0 }
  for (const r of records) {
    if (String(r.kind ?? '') === 'workforce') continue
    counts.total += 1
    const s = String(r.status ?? '').toLowerCase()
    if (s === 'moving') counts.moving += 1
    else if (s === 'idling') counts.idling += 1
    else if (s === 'stopped') counts.stopped += 1
    else counts.nonReporting += 1
  }
  return counts
}

function workforceCount(records: EntityRecord[]): number {
  return records.filter((r) => String(r.kind ?? '') === 'workforce').length
}

interface ActivitySeverity {
  label: string
  tone?: string
}

interface ActivityEntry {
  id: string
  actor: string
  text: string
  /** Log rows carry the changed severity STRUCTURALLY, not in `text` — the
   *  seed's text ends at "changed severity to" and the renderer appends the
   *  tonal label (same contract as the detail sheet's Timeline tab). */
  severity?: ActivitySeverity
  at: string
  incident: string
  priority: string
}

/** Severity tone → this surface's palette (the dark wall display's own
 *  colours; the DS's `text-*` tokens are for the light app chrome). */
const SEVERITY_TONE: Record<string, string> = {
  danger: C.red,
  warning: C.amber,
  info: C.blue,
  success: C.green,
  neutral: C.ink,
}

/**
 * Renders a feed row's text the way the detail sheet's Timeline tab does
 * (`v5-templates/views/task-detail/ActivityCommentFeed.renderLogText`):
 * `**bold**` spans become emphasised values, and a structural `severity`
 * renders as a bold tonal label after the text. The feed used to print
 * `entry.text` raw, so seeded rows read literally "added due date **2 Sep,
 * 2026**" and "changed severity to" with nothing after it.
 */
function renderFeedText(text: string, severity?: ActivitySeverity) {
  const parts = text.split(/\*\*([^*]+)\*\*/g)
  const body =
    parts.length === 1
      ? text
      : parts.map((part, index) =>
          index % 2 === 1 ? (
            <span key={index} data-slot="activity-log-value" className="font-semibold" style={{ color: C.ink }}>
              {part}
            </span>
          ) : (
            part
          ),
        )
  if (!severity?.label) return body
  return (
    <>
      {body}{' '}
      <span
        data-slot="activity-log-severity"
        className="font-semibold uppercase tracking-wide"
        style={{ color: SEVERITY_TONE[severity.tone ?? 'neutral'] ?? C.ink }}
      >
        {severity.label}
      </span>
    </>
  )
}

function collectActivity(incidents: EntityRecord[], priorityCol: string): ActivityEntry[] {
  const out: ActivityEntry[] = []
  for (const record of incidents) {
    const activity = record.activity
    if (!Array.isArray(activity)) continue
    for (const raw of activity) {
      const entry = raw as {
        id?: string
        actor?: string
        text?: string
        at?: string
        severity?: ActivitySeverity
      }
      if (!entry?.at) continue
      const severity = entry.severity?.label
        ? { label: String(entry.severity.label), tone: entry.severity.tone }
        : undefined
      out.push({
        id: String(entry.id ?? `${record.id}-${entry.at}`),
        actor: String(entry.actor ?? '—'),
        text: String(entry.text ?? ''),
        severity,
        at: String(entry.at),
        incident: String(record.uniqueidentifier ?? record.id),
        priority: String(record[priorityCol] ?? ''),
      })
    }
  }
  return out.sort((a, b) => (a.at < b.at ? 1 : -1))
}

/** Feed timestamps (critique #4: "25h ago" is noise): minutes below the
 *  hour, hours below 24h, then the ABSOLUTE date — never "37h ago". */
function timeAgo(iso: string, now: number): string {
  const t = Date.parse(iso)
  if (Number.isNaN(t)) return ''
  const mins = Math.max(0, Math.round((now - t) / 60000))
  if (mins < 60) return `${mins}m ago`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `${hours}h ago`
  return new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'short' }).format(t)
}

/** Deterministic per-record pseudo-metric (seed-derived, stable across
 *  renders/sessions — no Math.random on a wall display). */
function seedHash(s: string): number {
  let h = 0
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0
  return h
}

/* ── motion (WOW, reduced-motion-safe) ──────────────────────────────────── */

/* ── panel primitives (reference's floating glass cards) ────────────────── */

/* ── the dashboard ──────────────────────────────────────────────────────── */

export function CommandCenterView({
  liveConfig,
  listLiveRecords,
  incidentsConfig,
  listIncidents,
}: CommandCenterDeps) {
  const router = useRouter()
  const clock = useWallClock({ timeZone: 'Asia/Qatar' })
  const reducedMotion = usePrefersReducedMotion()
  const [nowTick] = useState(() => Date.now())
  const [selectedIncidentId, setSelectedIncidentId] = useState<string | null>(null)
  const [focusPosition, setFocusPosition] = useState<LngLat | null>(null)

  /* DARK MODE, the design system's own: scope `data-theme="dark"` to this
     surface's lifetime so every DS component inside (weather pills, forecast
     grid, drawers, popups, tools, CHARTS) flips to the token dark palette —
     including the tenant's own maroon brand tokens, which @fams/tokens now
     re-asserts in dark scope (the v1 "Open-Meteo tab is blue" leak). Restored
     on unmount — the V5 app returns exactly as it was. */
  useEffect(() => {
    const root = document.documentElement
    const previous = root.getAttribute('data-theme')
    root.setAttribute('data-theme', 'dark')
    return () => {
      if (previous === null) root.removeAttribute('data-theme')
      else root.setAttribute('data-theme', previous)
    }
  }, [])

  const liveRecords = useMemo(() => listLiveRecords?.() ?? [], [listLiveRecords])
  const incidentRecords = useMemo(() => listIncidents?.() ?? [], [listIncidents])

  /* The Command Center pins its basemap dark, so the (inert-here) basemap
     switcher tool is dropped from the blueprint's own tool list. */
  const ccConfig = useMemo<EntityConfig | undefined>(() => {
    if (!liveConfig) return undefined
    const map = liveConfig.uiConfig?.map
    const tools = Array.isArray(map?.tools)
      ? (map.tools as string[]).filter((tool) => tool !== 'layers' && tool !== 'incidents')
      : undefined
    return {
      ...liveConfig,
      uiConfig: { ...liveConfig.uiConfig, map: { ...map, ...(tools ? { tools } : {}) } },
    } as EntityConfig
  }, [liveConfig])

  const colorBy = useMemo(() => incidentColorBy(incidentsConfig), [incidentsConfig])
  const priorityColor = useMemo(() => {
    const map = new Map<string, string>()
    for (const v of colorBy.values) map.set(v.value, v.color)
    return map
  }, [colorBy])

  const incidentPins = useMemo(
    () =>
      incidentRecords.flatMap((record) => {
        const lat = Number(record.lat)
        const lng = Number(record.lng)
        if (!Number.isFinite(lat) || !Number.isFinite(lng)) return []
        const priority = String(record[colorBy.col] ?? '')
        const stage = String(record.status ?? '')
        return [
          {
            id: record.id,
            label: String(record.uniqueidentifier ?? record.id),
            position: [lng, lat] as LngLat,
            color: priorityColor.get(priority) ?? C.blue,
            colorKey: priority,
            /* WOW #2 — a CRITICAL request that is still open demands
               dispatch: its pin pulses (DS-side, motion-safe). */
            pulse: priority === 'Critical' && !DONE_STAGES.has(stage),
          },
        ]
      }),
    [incidentRecords, colorBy, priorityColor],
  )

  const fleet = useMemo(() => fleetCounts(liveRecords), [liveRecords])
  const crews = useMemo(() => workforceCount(liveRecords), [liveRecords])

  const stageCounts = useMemo(() => {
    const counts = new Map<string, number>()
    for (const r of incidentRecords) {
      const s = String(r.status ?? '')
      counts.set(s, (counts.get(s) ?? 0) + 1)
    }
    return counts
  }, [incidentRecords])
  const priorityCounts = useMemo(() => {
    const counts = new Map<string, number>()
    for (const r of incidentRecords) {
      const p = String(r[colorBy.col] ?? '')
      counts.set(p, (counts.get(p) ?? 0) + 1)
    }
    return counts
  }, [incidentRecords, colorBy])

  const openRequests = STAGE_ORDER.filter((s) => OPEN_STAGES.has(s)).reduce(
    (sum, s) => sum + (stageCounts.get(s) ?? 0),
    0,
  )
  const dispatched = (stageCounts.get('tanker-assigned') ?? 0) + (stageCounts.get('job-ongoing') ?? 0)
  const completed = (stageCounts.get('job-completed') ?? 0) + (stageCounts.get('closed') ?? 0)
  const critical = priorityCounts.get('Critical') ?? 0

  const activity = useMemo(() => collectActivity(incidentRecords, colorBy.col), [incidentRecords, colorBy])
  const feed = useMemo(() => activity.slice(0, 40), [activity])

  /* ── chart data (all seed-derived, DS categorical palette) ────────────── */

  /** Requests over time — every activity event binned into 2h buckets over
   *  the 24h ending at the NEWEST event (the seed's "now"). */
  const requestTrend = useMemo(() => {
    const latest = activity.length ? Date.parse(activity[0].at) : nowTick
    const categories: string[] = []
    const data: number[] = []
    for (let b = 11; b >= 0; b--) {
      const end = latest - b * 2 * 3600_000
      categories.push(
        new Intl.DateTimeFormat('en-GB', { hour: '2-digit', hour12: false, timeZone: 'Asia/Qatar' }).format(end) + ':00',
      )
      data.push(0)
    }
    for (const entry of activity) {
      const t = Date.parse(entry.at)
      if (Number.isNaN(t)) continue
      const b = Math.floor((latest - t) / (2 * 3600_000))
      if (b >= 0 && b < 12) data[11 - b] += 1
    }
    return { categories, data }
  }, [activity, nowTick])

  /** Requests by municipality — the donut. */
  const municipalitySlices = useMemo(() => {
    const counts = new Map<string, number>()
    for (const r of incidentRecords) {
      const m = String(r.municipality ?? '—')
      counts.set(m, (counts.get(m) ?? 0) + 1)
    }
    return [...counts.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([label, value], i) => ({ id: label, label, value, colorIndex: ((i % 5) + 1) as 1 | 2 | 3 | 4 | 5 }))
  }, [incidentRecords])

  /** Response performance — deterministic seed-derived dispatch minutes for
   *  every request that reached dispatch or beyond. */
  const response = useMemo(() => {
    const done = incidentRecords.filter((r) => {
      const s = String(r.status ?? '')
      return DONE_STAGES.has(s) || s === 'tanker-assigned' || s === 'job-ongoing'
    })
    const mins = done
      .map((r) => 14 + (seedHash(String(r.id)) % 44)) // 14..57m, stable per record
      .sort((a, b) => a - b)
    const avg = mins.length ? Math.round(mins.reduce((s, m) => s + m, 0) / mins.length) : 0
    return { avg, series: mins, count: done.length }
  }, [incidentRecords])

  /** Rainfall outlook — the blueprint's own station forecast, averaged per
   *  day across the network (the same seed the weather layer plots). */
  const rainOutlook = useMemo(() => {
    const stations = (liveConfig?.uiConfig?.map?.weather as
      | { stations?: Array<{ daily?: Array<{ date?: string; rainMm?: number }> }> }
      | undefined)?.stations
    if (!stations?.length) return { labels: [] as string[], data: [] as number[], peak: '' }
    const sums = new Map<string, { total: number; n: number }>()
    const order: string[] = []
    for (const station of stations) {
      for (const day of station.daily ?? []) {
        const key = String(day.date ?? '')
        if (!key) continue
        if (!sums.has(key)) {
          sums.set(key, { total: 0, n: 0 })
          order.push(key)
        }
        const s = sums.get(key)!
        s.total += Number(day.rainMm ?? 0)
        s.n += 1
      }
    }
    const labels = order
    const data = order.map((k) => {
      const s = sums.get(k)!
      return Math.round((s.total / Math.max(1, s.n)) * 10) / 10
    })
    const peakIdx = data.indexOf(Math.max(...data))
    return { labels, data, peak: labels[peakIdx] ?? '' }
  }, [liveConfig])

  const selectedIncident = selectedIncidentId
    ? incidentRecords.find((r) => r.id === selectedIncidentId)
    : undefined

  const goBack = () => {
    if (window.history.length > 1) router.history.back()
    else void router.navigate({ to: '/' })
  }

  const maxStage = Math.max(1, ...STAGE_ORDER.map((s) => stageCounts.get(s) ?? 0))
  const animate = !reducedMotion

  return (
    <div
      className="flex h-dvh w-full flex-col overflow-hidden"
      style={{ background: C.page }}
      data-testid="command-center"
    >
      {/* Scoped WOW motion (panels rise, feed slides) — every rule is turned
          off wholesale under prefers-reduced-motion. */}
      <style>{`
        @keyframes cc-rise { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: none; } }
        @keyframes cc-slide { from { opacity: 0; transform: translateX(14px); } to { opacity: 1; transform: none; } }
        .cc-panel { animation: cc-rise 0.45s ease-out both; }
        .cc-feed-item { animation: cc-slide 0.4s ease-out both; }
        @media (prefers-reduced-motion: reduce) {
          .cc-panel, .cc-feed-item { animation: none; }
        }
      `}</style>

      {/* ── Own top nav — BRANDING surface: Qatar MME maroon, dark-adjusted
             (primary ramp tokens; charts never use these) ── */}
      <header
        className="relative z-[900] flex h-14 shrink-0 items-center justify-between gap-3 px-4 text-white"
        style={{
          background:
            'linear-gradient(90deg, var(--color-primary-900, #2A030F) 0%, var(--color-primary-700, #4B091D) 55%, var(--color-primary-600, #5C0C24) 100%)',
          borderBottom: '1px solid rgba(255,255,255,0.12)',
        }}
      >
        <div className="flex min-w-0 items-center gap-3">
          <button
            type="button"
            onClick={goBack}
            aria-label="Back to UCCP"
            className="grid size-9 shrink-0 cursor-pointer place-items-center rounded-md transition-colors hover:bg-white/10 focus-visible:outline focus-visible:outline-2 focus-visible:outline-white/60"
            style={{ border: '1px solid rgba(255,255,255,0.2)', color: C.ink }}
          >
            <Icon name="arrow-left" />
          </button>
          <img
            src="/branding/uccp-logo-white.svg"
            alt="Qatar MME — UCCP"
            className="h-8 w-auto shrink-0 object-contain"
          />
          <div className="mx-1 h-8 w-px shrink-0" style={{ background: 'rgba(255,255,255,0.2)' }} />
          <div className="min-w-0">
            <div className="truncate text-[15px] font-semibold leading-tight">Command Center</div>
            <div className="truncate text-[10.5px] leading-tight" style={{ color: 'rgba(255,255,255,0.72)' }}>
              Flood Response Operations · State of Qatar
            </div>
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-3">
          <span
            className="inline-flex items-center gap-1.5 rounded-md px-2.5 py-1 text-[11px] font-semibold"
            style={{ background: 'rgba(18,183,106,0.18)', color: '#6CE9A6', border: '1px solid rgba(108,233,166,0.4)' }}
          >
            <span
              className="size-1.5 animate-pulse rounded-full"
              style={{ background: '#6CE9A6', boxShadow: '0 0 6px #6CE9A6' }}
              aria-hidden
            />
            LIVE
          </span>
          <span className="text-[12px] tabular-nums" style={{ color: 'rgba(255,255,255,0.8)' }}>
            {clock} <span style={{ color: 'rgba(255,255,255,0.5)' }}>AST</span>
          </span>
        </div>
      </header>

      {/* ── Full-viewport map, panels float on top ── */}
      <div className="cc-map-pane relative min-h-0 flex-1 overflow-hidden">
        {/* The DS map anchors its grouped end-tool column at the pane's top
            (`top-4`). On this wall display that column shared the top strip
            with the KPI row, so the KPIs had to stop short of the right edge.
            Drop the column to BODY_TOP — the same line the left/right panel
            columns start on — so the KPI row spans edge to edge and the tools
            keep their column position over the map, just one row lower. Host
            placement of a host-composed surface: a class scoped to THIS pane,
            not a DS change (the two-class selector out-specifies `top-4`). */}
        <style>{CC_TOOLS_BELOW_KPIS}</style>
        {ccConfig ? (
          <MapView
            config={ccConfig}
            records={liveRecords}
            showTools
            cluster
            styleUrl={DARK_BASEMAP_STYLE}
            defaultWeatherEnabled
            weatherHideDryStations
            groupedTools
            incidents={incidentPins}
            incidentsAvailable
            selectedIncidentId={selectedIncidentId}
            onSelectIncident={(incident) => {
              setSelectedIncidentId(incident.id)
              setFocusPosition(incident.position)
            }}
            focusPosition={focusPosition}
            toolEndInset={TOOL_END_INSET}
            toolStartInset={GUTTER + LEFT_W}
            className="h-full"
          />
        ) : (
          <div className="grid h-full place-items-center text-sm" style={{ color: C.inkDim }}>
            Live Monitoring is not licensed for this tenant — the Command Center has no map source.
          </div>
        )}

        {/* KPI strip — real seed-derived counts; count-up on load (WOW #1).
            The row OWNS the whole top strip: six equal tiles from gutter to
            gutter. It used to stop short of a tool column parked beside it at
            the top-end, which left a wide dead gap at the end of the row
            (2026-09-01 layout fix); the tools now start below this row
            instead — see CC_TOOLS_BELOW_KPIS. */}
        <div
          data-testid="command-center-kpis"
          className="pointer-events-none absolute z-[600] grid grid-cols-6 gap-4"
          style={{ left: GUTTER, right: GUTTER, top: GUTTER }}
        >
          <div className="pointer-events-auto contents">
            <WallKpiCard label="Fleet Active" value={fleet.moving} sub={`of ${fleet.total} tankers moving`} color={C.green} animate={animate} />
            <WallKpiCard label="Idling / Stopped" value={fleet.idling + fleet.stopped} sub={`${fleet.nonReporting} non-reporting`} color={C.amber} animate={animate} />
            <WallKpiCard label="Open Requests" value={openRequests} sub={`${incidentPins.length} plotted on map`} color={C.blue} animate={animate} />
            <WallKpiCard label="Critical Priority" value={critical} sub="requires immediate dispatch" color={C.red} animate={animate} />
            <WallKpiCard label="Dispatched" value={dispatched} sub="tanker assigned / job ongoing" color={C.amber} animate={animate} />
            <WallKpiCard label="Completed" value={completed} sub="job completed / closed" color={C.green} animate={animate} />
          </div>
        </div>

        {/* LEFT column — fleet + request breakdowns + trend charts (DS chart
            palette, never primary). */}
        <aside
          data-testid="command-center-left-column"
          className="fams-scroll-region pointer-events-none absolute z-[600] flex flex-col gap-4 overflow-y-auto pr-1"
          style={{ left: GUTTER, top: BODY_TOP, bottom: GUTTER, width: LEFT_W }}
        >
          <div className="pointer-events-auto">
            <WallPanel title="Fleet Readiness" hint={`${fleet.total} tankers · ${crews} crews`}>
              <div className="flex flex-col gap-2">
                <WallStatBar label="Moving" value={fleet.moving} max={fleet.total} color={C.green} />
                <WallStatBar label="Idling" value={fleet.idling} max={fleet.total} color={C.amber} />
                <WallStatBar label="Stopped" value={fleet.stopped} max={fleet.total} color={C.red} />
                <WallStatBar label="Non-Reporting" value={fleet.nonReporting} max={fleet.total} color={C.inkFaint} />
              </div>
            </WallPanel>
          </div>
          <div className="pointer-events-auto">
            <WallPanel title="Requests by Priority" hint={`${incidentRecords.length} total`}>
              <div className="flex flex-col gap-2">
                {colorBy.values.map((v) => (
                  <WallStatBar
                    key={v.value}
                    label={v.label}
                    value={priorityCounts.get(v.value) ?? 0}
                    max={Math.max(1, ...colorBy.values.map((x) => priorityCounts.get(x.value) ?? 0))}
                    color={v.color}
                  />
                ))}
              </div>
            </WallPanel>
          </div>
          <div className="pointer-events-auto">
            <WallPanel title="Requests Over Time" hint="events · trailing 24h">
              <LineChart
                categories={requestTrend.categories}
                series={[{ id: 'events', label: 'Request events', data: requestTrend.data }]}
                height={140}
                legend={false}
                aria-label="Request activity events per two-hour bucket over the trailing 24 hours"
              />
            </WallPanel>
          </div>
          <div className="pointer-events-auto">
            <WallPanel title="Requests by Municipality" hint="top 5">
              <DonutChart
                data={municipalitySlices}
                height={200}
                innerRadius={62}
                outerRadius={88}
                legend="bottom"
                centerLabel={
                  <div className="flex flex-col items-center leading-tight">
                    <span className="text-[20px] font-semibold" style={{ color: C.ink }}>
                      {incidentRecords.length}
                    </span>
                    <span className="text-[9px]" style={{ color: C.inkDim }}>
                      requests
                    </span>
                  </div>
                }
                aria-label="Requests grouped by municipality, top five"
              />
            </WallPanel>
          </div>
          <div className="pointer-events-auto">
            <WallPanel title="Pipeline by Stage">
              <div className="flex flex-col gap-1.5">
                {STAGE_ORDER.map((stage) => (
                  <WallStatBar
                    key={stage}
                    label={STAGE_LABEL[stage]}
                    value={stageCounts.get(stage) ?? 0}
                    max={maxStage}
                    color={OPEN_STAGES.has(stage) ? C.blue : DONE_STAGES.has(stage) ? C.green : C.amber}
                  />
                ))}
              </div>
            </WallPanel>
          </div>
        </aside>

        {/* RIGHT column — response stat, rainfall outlook, live feed. */}
        <aside
          data-testid="command-center-right-column"
          className="pointer-events-none absolute z-[600] flex flex-col gap-4"
          style={{ right: GUTTER, top: BODY_TOP, bottom: GUTTER, width: RIGHT_W }}
        >
          <div className="pointer-events-auto">
            <WallPanel title="Response Performance" hint={`${response.count} dispatches`}>
              <div className="flex items-end justify-between gap-3">
                <div>
                  <div className="flex items-baseline gap-1">
                    <span className="text-[24px] font-semibold leading-none tabular-nums" style={{ color: C.ink }}>
                      {response.avg}
                    </span>
                    <span className="text-[11px]" style={{ color: C.inkDim }}>
                      min
                    </span>
                  </div>
                  <div className="mt-1 text-[10px]" style={{ color: C.inkFaint }}>
                    avg intake → tanker on site
                  </div>
                </div>
                <div className="w-[140px]">
                  <Sparkline
                    data={response.series}
                    variant="area"
                    colorIndex={2}
                    height={36}
                    aria-label="Dispatch response minutes per request, sorted ascending"
                  />
                </div>
              </div>
            </WallPanel>
          </div>
          <div className="pointer-events-auto">
            <WallPanel title="Rainfall Outlook" hint={rainOutlook.peak ? `peak ${rainOutlook.peak}` : undefined}>
              <div className="flex items-center gap-3">
                <div className="min-w-0 flex-1">
                  <Sparkline
                    data={rainOutlook.data}
                    variant="area"
                    colorIndex={3}
                    height={40}
                    aria-label="Average forecast rainfall in millimetres per day across the station network"
                  />
                </div>
                <div className="shrink-0 text-right">
                  <div className="text-[18px] font-semibold leading-none tabular-nums" style={{ color: C.ink }}>
                    {rainOutlook.data.length ? Math.max(...rainOutlook.data) : 0}
                    <span className="ml-0.5 text-[10px] font-normal" style={{ color: C.inkDim }}>
                      mm
                    </span>
                  </div>
                  <div className="mt-1 text-[10px]" style={{ color: C.inkFaint }}>
                    network avg · 5 days
                  </div>
                </div>
              </div>
            </WallPanel>
          </div>
          <div className="pointer-events-auto flex min-h-0 flex-1 flex-col">
            <WallPanel title="Live Activity" hint="all municipalities" padded={false}>
              <div />
            </WallPanel>
            <div
              data-testid="command-center-feed"
              className="fams-scroll-region -mt-1 min-h-0 flex-1 overflow-y-auto rounded-b-xl px-2 pb-2 backdrop-blur-md"
              style={{
                background: C.panelBg,
                border: `1px solid ${C.panelBorder}`,
                borderTop: 'none',
                boxShadow: '0 10px 30px rgba(0,0,0,0.4)',
              }}
            >
              <ul className="flex flex-col gap-1.5">
                {feed.map((entry, i) => (
                  <li
                    key={entry.id}
                    className="cc-feed-item rounded-lg px-2.5 py-1.5 text-[11px]"
                    style={{
                      background: 'rgba(255,255,255,0.04)',
                      borderLeft: `2px solid ${priorityColor.get(entry.priority) ?? C.blue}`,
                      /* WOW #3 — slide-in with a stagger on the first screenful. */
                      animationDelay: `${Math.min(i, 12) * 45}ms`,
                    }}
                  >
                    <div className="flex items-baseline justify-between gap-2">
                      <span className="truncate font-semibold" style={{ color: C.ink }}>
                        {entry.actor}
                      </span>
                      <span className="shrink-0 tabular-nums" style={{ color: C.inkFaint }}>
                        {timeAgo(entry.at, nowTick)}
                      </span>
                    </div>
                    <p className="mt-0.5 leading-snug" style={{ color: C.inkDim }}>
                      {renderFeedText(entry.text, entry.severity)}
                    </p>
                    <span className="text-[10px]" style={{ color: C.inkFaint }}>
                      {entry.incident}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </aside>

        {/* Selected request info card */}
        {selectedIncident ? (
          <div
            className="absolute z-[700] w-[360px] rounded-xl p-4 backdrop-blur-md"
            style={{
              left: GUTTER + LEFT_W + GUTTER,
              top: BODY_TOP,
              background: C.panelBg,
              border: `1px solid ${C.panelBorder}`,
              boxShadow: '0 12px 36px rgba(0,0,0,0.5)',
            }}
            role="dialog"
            aria-label={`Request ${String(selectedIncident.uniqueidentifier ?? selectedIncident.id)}`}
          >
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <span
                    className="rounded px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wide text-white"
                    style={{
                      background: priorityColor.get(String(selectedIncident[colorBy.col] ?? '')) ?? C.blue,
                    }}
                  >
                    {String(selectedIncident[colorBy.col] ?? '—')}
                  </span>
                  <span className="text-[10px] font-semibold" style={{ color: C.inkFaint }}>
                    {String(selectedIncident.uniqueidentifier ?? selectedIncident.id)} ·{' '}
                    {STAGE_LABEL[String(selectedIncident.status ?? '')] ?? String(selectedIncident.status ?? '')}
                  </span>
                </div>
                <h2 className="mt-1 text-[13px] font-semibold leading-snug" style={{ color: C.ink }}>
                  {String(selectedIncident.title ?? '')}
                </h2>
              </div>
              <button
                type="button"
                onClick={() => {
                  setSelectedIncidentId(null)
                  setFocusPosition(null)
                }}
                aria-label="Close request details"
                className="grid size-7 shrink-0 cursor-pointer place-items-center rounded-md transition-colors hover:bg-white/10"
                style={{ color: C.inkDim }}
              >
                <Icon name="x-close" />
              </button>
            </div>
            <p className="mt-2 line-clamp-3 text-[11px] leading-snug" style={{ color: C.inkDim }}>
              {String(selectedIncident.systemcol6 ?? '')}
            </p>
            <dl className="mt-2 grid grid-cols-2 gap-x-3 gap-y-1 text-[10.5px]">
              <div>
                <dt style={{ color: C.inkFaint }}>Municipality</dt>
                <dd style={{ color: C.ink }}>{String(selectedIncident.municipality ?? '—')}</dd>
              </div>
              <div>
                <dt style={{ color: C.inkFaint }}>Source</dt>
                <dd style={{ color: C.ink }}>{String(selectedIncident.systemcol8 ?? '—')}</dd>
              </div>
              <div className="col-span-2">
                <dt style={{ color: C.inkFaint }}>Location</dt>
                <dd style={{ color: C.ink }}>{String(selectedIncident.systemcol1 ?? '—')}</dd>
              </div>
              <div className="col-span-2">
                <dt style={{ color: C.inkFaint }}>Coordinates</dt>
                <dd className="tabular-nums" style={{ color: C.ink }}>
                  {Number(selectedIncident.lat).toFixed(5)}, {Number(selectedIncident.lng).toFixed(5)}
                </dd>
              </div>
            </dl>
          </div>
        ) : null}
      </div>
    </div>
  )
}
