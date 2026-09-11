import { useMemo } from 'react';
import tanker3dRaw from '../../../assets/tanker-3d.svg?raw';
import type { LatLng, MapMarker, MapRoute, MapZone } from '@ds/components/map/types';
import type { DailyPlan, Incident } from '../../data/types';
import { DISCHARGE_STATIONS, nearestDischargeStation, type DischargeStation } from '../../data/dischargeStations';

/**
 * PlanMapScene — builds the "watch this plan on the map" overlay (tanker +
 * incident + affected zone + discharge route), replicating the old
 * flood-management demo's task-monitoring map UX
 * (MM-flood-management-main/src/app/components/MonitoringMapView.tsx +
 * mapPins.tsx + mapClusterIcon.tsx) on top of the DS `MapView`.
 *
 * The DS `MapView` only supports ONE mechanism for rich custom marker art —
 * `MapMarker.iconUrl` (a data-URI image, see `map-view.tsx`'s `markerEl`) — it
 * has no multi-chip "capsule label" primitive and we can't edit `src/ds`. So,
 * exactly like the old demo's `tankerFillPinDataUrl`/`badgeParts` (which
 * baked a white badge + coloured ring + 3D glyph + chip row directly into an
 * SVG string), the tanker marker here is ONE composited svg data-URI: the
 * old demo's real `tanker-3d.svg` illustration (copied into `src/assets`,
 * same file the old repo's `truck3dSvg` nests) sits inside a white badge
 * circle with a fixed orange ring, a stem + anchor dot, and orange "drip"
 * droplets below it — under two rows of id/fill/eta/status capsule chips.
 *
 * Shared by BOTH the Plan Monitoring module (`buildPlanMapScene` — one
 * watched plan) and the Requests & Complaints module (`buildIncidentMapScene`
 * — one watched incident's linked plan(s), sharing a single incident dot +
 * red zone). Both builders take the raw records + the discharge-station
 * fixture directly (no store lookups) so they stay easy to call from either
 * module or from `MobileShell`.
 */

/* ── deterministic "random" from a plan id — no Math.random at module scope,
 * and no real per-frame randomness: every value below is a pure function of
 * plan.id + plan progress, so a re-render / re-select always reproduces the
 * exact same scene. */
function hashStr(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0;
  return h;
}

const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

/** Approximate a geographic circle as a polygon ring — ported from the old
 *  demo's `circlePolygon` (mapClusterIcon.tsx). Used for the translucent red
 *  affected-area zone around the incident. */
function circlePolygon(lat: number, lng: number, radiusKm: number, segments = 32): LatLng[] {
  const latRad = (lat * Math.PI) / 180;
  const dLat = radiusKm / 110.574;
  const dLng = radiusKm / (111.32 * Math.cos(latRad));
  const ring: LatLng[] = [];
  for (let i = 0; i <= segments; i++) {
    const a = (i / segments) * 2 * Math.PI;
    ring.push([lat + dLat * Math.sin(a), lng + dLng * Math.cos(a)]);
  }
  return ring;
}

/** A gentle curved fallback line between two points (no OSRM/network call —
 *  the old demo's `roadRoute.ts` hits the public OSRM demo server with a
 *  straight-line fallback on any failure/offline/timeout; we skip the network
 *  round-trip entirely here and always draw the offline-safe curve so the
 *  route never depends on connectivity). Bows the midpoint perpendicular to
 *  the segment so it reads as a road, not a ruler line. */
function curvedLine(a: LatLng, b: LatLng, bow = 0.18): LatLng[] {
  const midLat = (a[0] + b[0]) / 2;
  const midLng = (a[1] + b[1]) / 2;
  const dLat = b[0] - a[0];
  const dLng = b[1] - a[1];
  // perpendicular offset
  const offLat = -dLng * bow;
  const offLng = dLat * bow;
  const ctrl: LatLng = [midLat + offLat, midLng + offLng];
  const pts: LatLng[] = [];
  const steps = 24;
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    const lat = (1 - t) * (1 - t) * a[0] + 2 * (1 - t) * t * ctrl[0] + t * t * b[0];
    const lng = (1 - t) * (1 - t) * a[1] + 2 * (1 - t) * t * ctrl[1] + t * t * b[1];
    pts.push([lat, lng]);
  }
  return pts;
}

/** Fixed badge-ring / drip colour — the user's reference screenshot always
 *  shows an ORANGE ring on the tanker badge (not fill-level-coded like the
 *  old demo's `fillColor`); the fill% CAPSULE still shows the actual number. */
const BADGE_RING = '#F79009';

const TANKER_3D_INNER = tanker3dRaw.replace(/^<svg[^>]*>/, '').replace(/<\/svg>\s*$/, '');
const TANKER_3D_ASPECT = 20.9996 / 31.3914;

/** Nests the old demo's real tanker-3d.svg illustration at any size —
 *  ported verbatim from `mapPins.tsx`'s `truck3dSvg`. */
function truck3dSvg(x: number, y: number, w: number): string {
  const h = w * TANKER_3D_ASPECT;
  return `<svg x="${x.toFixed(1)}" y="${y.toFixed(1)}" width="${w}" height="${h.toFixed(1)}" viewBox="0 0 31.3914 20.9996">${TANKER_3D_INNER}</svg>`;
}

/** White badge circle + fixed-orange ring + stem + anchor dot — ported from
 *  `mapPins.tsx`'s `badgeParts` (drop-shadow filter must be defined once per
 *  SVG document by the caller, id `bs`). */
function badgeCircle(cx: number, cy: number, r: number, h: number): string {
  const dotY = h - 3.5;
  return `
    <line x1="${cx}" y1="${cy + r}" x2="${cx}" y2="${dotY - 5}" stroke="${BADGE_RING}" stroke-width="2"/>
    <circle cx="${cx}" cy="${dotY}" r="3.5" fill="${BADGE_RING}" stroke="#ffffff" stroke-width="1.5"/>
    <circle cx="${cx}" cy="${cy}" r="${r}" fill="#ffffff" stroke="${BADGE_RING}" stroke-width="3" filter="url(#bs)"/>`;
}

/** Orange "drip" droplets hanging below the badge's anchor dot — the visual
 *  detail called out in the reference screenshot (not literally in the old
 *  repo's markup, which has no drip glyph; designed to read as water
 *  dripping from the tanker while parked/discharging). */
function dripLines(cx: number, dotY: number): string {
  const drop = (dx: number, dy: number, s: number) =>
    `<path d="M${cx + dx} ${dotY + dy}c0-1.4 1-3 2-4.2 1 1.2 2 2.8 2 4.2a2 2 0 1 1-4 0Z" fill="${BADGE_RING}" fill-opacity="0.85" transform="scale(${s})" transform-origin="${cx + dx}px ${dotY + dy}px"/>`;
  return `${drop(-4, 6, 0.85)}${drop(3, 9, 1)}`;
}

function chip(x: number, y: number, w: number, h: number, bg: string, text: string, fontSize = 10): string {
  return `
    <rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${h / 2}" fill="${bg}" stroke="#ffffff" stroke-width="1.5"/>
    <text x="${x + w / 2}" y="${y + h / 2 + fontSize / 2 - 1}" text-anchor="middle" font-family="Arial, sans-serif" font-size="${fontSize}" font-weight="700" fill="#ffffff">${text}</text>`;
}

const BADGE_R = 22;
const BADGE_SHADOW_DEF =
  '<defs><filter id="bs" x="-40%" y="-40%" width="180%" height="180%"><feDropShadow dx="0" dy="1.5" stdDeviation="1.6" flood-color="#101828" flood-opacity="0.28"/></filter></defs>';

const PIN_W = 120;
const CHIP_AREA_H = 56;
const BADGE_AREA_H = BADGE_R * 2 + 22; // circle + stem + anchor dot + drip room
const PIN_H = CHIP_AREA_H + BADGE_AREA_H;

/** Builds the composite tanker marker: id + status capsules (row 1), fill% +
 *  ETA capsules (row 2), then the white/orange badge with the real 3D tanker
 *  illustration and drip droplets below. */
function buildTankerPinDataUrl(opts: {
  idLabel: string;
  fillPct: number;
  etaLabel: string;
  statusLabel: string;
}): string {
  const { idLabel, fillPct, etaLabel, statusLabel } = opts;
  const cx = PIN_W / 2;
  const cy = CHIP_AREA_H + BADGE_R;
  const dotY = PIN_H - 3.5;

  const rowH = 18;
  const gap = 4;
  const row1Y = 2;
  const row2Y = row1Y + rowH + gap;

  const idW = 40;
  const statusW = 62;
  const row1TotalW = idW + gap + statusW;
  const row1X = (PIN_W - row1TotalW) / 2;

  const fillW = 40;
  const etaW = 48;
  const row2TotalW = fillW + gap + etaW;
  const row2X = (PIN_W - row2TotalW) / 2;

  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="${PIN_W}" height="${PIN_H}" viewBox="0 0 ${PIN_W} ${PIN_H}">
      ${BADGE_SHADOW_DEF}
      ${chip(row1X, row1Y, idW, rowH, '#344054', idLabel)}
      ${chip(row1X + idW + gap, row1Y, statusW, rowH, '#475467', statusLabel, 9)}
      ${chip(row2X, row2Y, fillW, rowH, '#F79009', `${fillPct}%`)}
      ${chip(row2X + fillW + gap, row2Y, etaW, rowH, '#7A271A', etaLabel, 9)}
      ${badgeCircle(cx, cy, BADGE_R, PIN_H)}
      ${truck3dSvg(cx - BADGE_R * 0.62, cy - BADGE_R * 0.5, BADGE_R * 1.24)}
      ${dripLines(cx, dotY)}
    </svg>`.trim();
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}

const DISCHARGE_PIN_W = 96;
const DISCHARGE_PIN_H = 46;

function buildDischargePinDataUrl(label: string): string {
  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="${DISCHARGE_PIN_W}" height="${DISCHARGE_PIN_H}" viewBox="0 0 ${DISCHARGE_PIN_W} ${DISCHARGE_PIN_H}">
      <rect x="2" y="2" width="${DISCHARGE_PIN_W - 4}" height="18" rx="9" fill="#ffffff" stroke="#eaecf0" stroke-width="1" />
      <text x="${DISCHARGE_PIN_W / 2}" y="15" text-anchor="middle" font-family="Arial, sans-serif" font-size="10" font-weight="700" fill="#101828">${label}</text>
      <circle cx="${DISCHARGE_PIN_W / 2}" cy="34" r="10" fill="#0072D6" stroke="#ffffff" stroke-width="2.5"/>
      <path d="M${DISCHARGE_PIN_W / 2 - 3} 31.5c0-2 1.5-4.5 3-6 1.5 1.5 3 4 3 6a3 3 0 1 1-6 0Z" fill="#ffffff"/>
    </svg>`.trim();
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}

export interface PlanMapScene {
  markers: MapMarker[];
  zones: MapZone[];
  routes: MapRoute[];
  /** Points to fit/fly the camera to (tanker(s) + incident + discharge(s)). */
  fitPoints: LatLng[];
}

interface PlanMarkerSet {
  tanker: MapMarker;
  discharge: MapMarker;
  route: MapRoute;
  tankerPos: LatLng;
  dischargePos: LatLng;
}

/** Builds ONE plan's tanker + discharge markers + route (no incident dot, no
 *  zone — those are shared/deduped by the two scene builders below, since an
 *  incident with multiple linked plans has only ONE incident dot and ONE red
 *  zone, not one per plan). */
function buildPlanMarkerSet(plan: DailyPlan, incidentPos: LatLng, dischargeStations: DischargeStation[]): PlanMarkerSet {
  const discharge = nearestDischargeStation(incidentPos[0], incidentPos[1], dischargeStations);
  const dischargePos: LatLng = [discharge.lat, discharge.lng];

  const h = hashStr(plan.id);
  const progress = plan.stopsTotal > 0 ? plan.stopsCompleted / plan.stopsTotal : 0;
  // Keep the tanker visually between the two endpoints — never exactly on
  // top of either pin, even for a 0%/100% plan.
  const t = Math.min(0.92, Math.max(0.08, progress));
  const tankerPos: LatLng = [lerp(incidentPos[0], dischargePos[0], t), lerp(incidentPos[1], dischargePos[1], t)];

  // Deterministic fill-level: seeded by id, biased up as the plan collects
  // more water (waterCollectedL against an 8,000L reference tank).
  const seedFill = 30 + (h % 40); // 30–69
  const collectedFill = Math.min(95, Math.round((plan.waterCollectedL / 8000) * 100));
  const fillPct = plan.status === 'Completed' ? Math.max(collectedFill, 60) : Math.max(seedFill, collectedFill);

  const remainingStops = Math.max(0, plan.stopsTotal - plan.stopsCompleted);
  const onSite = remainingStops === 0 || plan.status === 'Completed';
  const etaMin = 2 + ((h >> 3) % 12); // 2–13, deterministic
  const etaLabel = onSite ? 'On site' : `${etaMin} min`;
  const statusLabel = plan.status === 'Completed' ? 'Completed' : onSite ? 'On site —' : 'En route';

  const tankerIdLabel = plan.tanker.length > 8 ? plan.tanker.split(' ').pop() ?? plan.tanker : plan.tanker;

  return {
    discharge: {
      id: `${plan.id}-discharge`,
      position: dischargePos,
      iconUrl: buildDischargePinDataUrl(discharge.label),
      iconSize: [DISCHARGE_PIN_W, DISCHARGE_PIN_H],
      tooltip: discharge.label,
    },
    tanker: {
      id: `${plan.id}-tanker`,
      position: tankerPos,
      iconUrl: buildTankerPinDataUrl({ idLabel: tankerIdLabel, fillPct, etaLabel, statusLabel }),
      iconSize: [PIN_W, PIN_H],
      tooltip: `${plan.tanker} — ${statusLabel}`,
    },
    route: {
      id: `${plan.id}-route`,
      points: curvedLine(tankerPos, dischargePos),
      color: '#344054',
      weight: 3,
      dashed: true,
    },
    tankerPos,
    dischargePos,
  };
}

/** Derives the full "watch on map" scene for one selected DailyPlan (tanker
 *  + incident dot + red zone + discharge route) — used by the Plan
 *  Monitoring module/shell. `incident` is the plan's source request, if any
 *  (falls back to the plan's own lat/lng when it has none). */
export function buildPlanMapScene(
  plan: DailyPlan,
  incident: Incident | undefined,
  dischargeStations: DischargeStation[] = DISCHARGE_STATIONS,
): PlanMapScene {
  const incidentPos: LatLng = incident ? [incident.lat, incident.lng] : [plan.lat, plan.lng];
  const set = buildPlanMarkerSet(plan, incidentPos, dischargeStations);

  const markers: MapMarker[] = [
    {
      id: `${plan.id}-incident`,
      position: incidentPos,
      kind: 'dot',
      status: 'critical',
      tooltip: incident ? incident.title : plan.blackSpotZone,
    },
    set.discharge,
    set.tanker,
  ];

  const zones: MapZone[] = [
    { id: `${plan.id}-zone`, points: circlePolygon(incidentPos[0], incidentPos[1], 0.9), color: '#F04438', fillOpacity: 0.14 },
  ];

  return { markers, zones, routes: [set.route], fitPoints: [incidentPos, set.tankerPos, set.dischargePos] };
}

/** Derives the "watch on map" scene for one selected Incident's linked daily
 *  plan(s) — used by the Requests & Complaints module/shell. One shared
 *  incident dot + red zone (centered on the incident, not per-plan), one
 *  tanker + discharge + route PER linked plan. Returns null when the
 *  incident has no `linkedDailyPlanIds` (caller falls back to the plain
 *  dot-marker + flyTo behaviour). */
export function buildIncidentMapScene(
  incident: Incident,
  plans: DailyPlan[],
  dischargeStations: DischargeStation[] = DISCHARGE_STATIONS,
): PlanMapScene | null {
  const linkedPlans = incident.linkedDailyPlanIds
    .map((id) => plans.find((p) => p.id === id))
    .filter((p): p is DailyPlan => !!p);
  if (linkedPlans.length === 0) return null;

  const incidentPos: LatLng = [incident.lat, incident.lng];
  const sets = linkedPlans.map((plan) => buildPlanMarkerSet(plan, incidentPos, dischargeStations));

  const markers: MapMarker[] = [
    { id: `${incident.id}-incident`, position: incidentPos, kind: 'dot', status: 'critical', tooltip: incident.title },
    ...sets.flatMap((s) => [s.discharge, s.tanker]),
  ];

  const zones: MapZone[] = [
    { id: `${incident.id}-zone`, points: circlePolygon(incidentPos[0], incidentPos[1], 0.9), color: '#F04438', fillOpacity: 0.14 },
  ];

  const routes: MapRoute[] = sets.map((s) => s.route);
  const fitPoints: LatLng[] = [incidentPos, ...sets.flatMap((s) => [s.tankerPos, s.dischargePos])];

  return { markers, zones, routes, fitPoints };
}

/** Memoised hook wrapper — recomputes only when the selected plan or the
 *  incidents list identity changes. Used by PlansModule + MobileShell. */
export function usePlanMapScene(plan: DailyPlan | null, incidents: Incident[]): PlanMapScene | null {
  return useMemo(() => {
    if (!plan) return null;
    const incident = plan.sourceRequestId ? incidents.find((i) => i.id === plan.sourceRequestId) : undefined;
    return buildPlanMapScene(plan, incident);
  }, [plan, incidents]);
}

/** Memoised hook wrapper — recomputes only when the selected incident or the
 *  plans list identity changes. Used by RequestsModule + MobileShell. */
export function useIncidentMapScene(incident: Incident | null, plans: DailyPlan[]): PlanMapScene | null {
  return useMemo(() => (incident ? buildIncidentMapScene(incident, plans) : null), [incident, plans]);
}
