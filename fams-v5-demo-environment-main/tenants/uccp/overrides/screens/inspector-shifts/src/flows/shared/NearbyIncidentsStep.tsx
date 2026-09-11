/**
 * NearbyIncidentsStep — the shared "Nearby / Related Incidents" step, extracted
 * VERBATIM from ReportIncident.tsx's Step 1 render so both the Report Incident
 * wizard and the New Inspection flow show/behave identically:
 *   - split RadiusMap (left ~55%) + list (right ~45%)
 *   - list columns: KPI Category · Reported By · Reported On
 *   - each row is clickable and opens the same IncidentDetailFlow side sheet
 *     (via incidentOverride, since these are synthetic incidents not in the
 *     store) — the selected-incident state + its render live INSIDE this
 *     component so both flows get identical click→sheet behaviour.
 */
import * as React from 'react';
import * as Icons from '@ds/icons';
import { ScrollArea } from '@ds/components/primitives';
import { LeafletMap } from '@ds/components/map';
import { useIims } from '@/store/store';
import { IncidentDetailFlow } from '@/flows/IncidentDetail';
import { AvatarChip, formatDate } from '@/lib/ui';
import { ZONES, ESPS, VIOLATION_TYPES } from '@/data/catalog';
import type { GeoPoint, Incident, IncidentStatus, KpiCategory } from '@/data/types';
import { GpsDot } from '@/flows/shared/LocationStep';

/** Haversine distance in metres */
function haversineM(a: GeoPoint, b: GeoPoint): number {
  const R = 6_371_000;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.asin(Math.sqrt(h));
}

export function jitter(center: GeoPoint): GeoPoint {
  // ~50–200 m random offset so each report lands slightly off the zone centroid
  const delta = () => (Math.random() - 0.5) * 0.004;
  return { lat: center.lat + delta(), lng: center.lng + delta() };
}

export function randomAccuracy() {
  // Simulate GPS accuracy 4–28 m
  return Math.floor(4 + Math.random() * 24);
}

export const CATEGORY_LABELS: Record<KpiCategory, string> = {
  'Solid Waste': 'Solid Waste Collection & Transportation',
  'Mechanical Sweeping': 'Mechanical Sweeping / Sand Removal',
  'Manual Sweeping': 'Manual Sweeping & Cleaning Services',
  Fleet: 'Vehicles / Fleet Management',
  EHS: 'Environment, Health & Safety',
  'Resource Allocation': 'Resource Allocation',
  PCC: 'PCC (Public Cleanliness Complaints)',
};

/* ── Synthetic nearby incidents ─────────────────────────────────────────────
 * Existing reports scattered around the pin, used for the "Nearby Incidents"
 * dedup step (map pins + list). Distances chosen so 5 fall inside the default
 * 25 m radius and the rest appear as you widen it. Deterministic. */
const NEARBY_PLAN: { dist: number; ang: number; cat: KpiCategory; status: IncidentStatus; reporter: string; daysAgo: number }[] = [
  { dist: 9,  ang: 0.4, cat: 'EHS',                 status: 'escalated',              reporter: 'insp-bilal', daysAgo: 46 },
  { dist: 14, ang: 1.5, cat: 'Manual Sweeping',     status: 'awaiting_rectification', reporter: 'insp-bilal', daysAgo: 46 },
  { dist: 18, ang: 2.6, cat: 'Mechanical Sweeping', status: 'rectification_submitted',reporter: 'insp-bilal', daysAgo: 46 },
  { dist: 21, ang: 3.7, cat: 'Mechanical Sweeping', status: 'awaiting_rectification', reporter: 'insp-bilal', daysAgo: 46 },
  { dist: 24, ang: 4.8, cat: 'EHS',                 status: 'escalated',              reporter: 'insp-bilal', daysAgo: 46 },
  { dist: 34, ang: 5.6, cat: 'Solid Waste',         status: 'awaiting_rectification', reporter: 'insp-huda', daysAgo: 47 },
  { dist: 45, ang: 0.9, cat: 'Fleet',               status: 'closed',                 reporter: 'insp-huda', daysAgo: 48 },
  { dist: 56, ang: 2.1, cat: 'Manual Sweeping',     status: 'rectification_submitted',reporter: 'insp-huda', daysAgo: 49 },
];

/** Offset a point by (dist metres, ang radians). */
function offsetMeters(center: GeoPoint, dist: number, ang: number): GeoPoint {
  return {
    lat: center.lat + (dist * Math.cos(ang)) / 111_000,
    lng: center.lng + (dist * Math.sin(ang)) / (111_000 * Math.cos((center.lat * Math.PI) / 180)),
  };
}

export function syntheticNearby(center: GeoPoint, zoneId: string): Incident[] {
  const base = Date.parse('2026-06-30T09:00:00Z');
  const esp = ESPS.find((e) => e.zoneIds.includes(zoneId)) ?? ESPS[0];
  return NEARBY_PLAN.map((p, i): Incident => {
    const vt = VIOLATION_TYPES.find((v) => v.category === p.cat) ?? VIOLATION_TYPES[0];
    const at = new Date(base - p.daysAgo * 86_400_000).toISOString();
    return {
      id: `nearby-${i}`,
      title: vt.name,
      description: `${vt.name} observed near this location.`,
      violationTypeId: vt.id,
      category: p.cat,
      severity: vt.defaultSeverity,
      zeroTolerance: vt.zeroTolerance,
      status: p.status,
      espId: esp.id,
      zoneId,
      reportedByInspectorId: p.reporter,
      reportedAt: at,
      slaDueAt: at,
      location: offsetMeters(center, p.dist, p.ang),
      locationAccuracyM: 10,
      evidence: [],
      penaltyAed: 0,
      timeline: [],
    };
  });
}

/** Red GPS accuracy banner (red pill) overlaid on a map. */
function AccuracyBanner({ accuracyM }: { accuracyM: number }) {
  if (accuracyM <= 20) return null;
  return (
    <div className="pointer-events-none absolute left-1/2 top-3 z-[500] -translate-x-1/2">
      <span className="inline-flex items-center gap-1.5 rounded-full bg-[var(--status-error)] px-3 py-1 text-body-xs font-semibold text-white shadow-[var(--elevation-md)]">
        <Icons.AlertTriangle size={13} />
        Low Location Accuracy · {accuracyM} m
      </span>
    </div>
  );
}

/** Radius stepper card ("Radius" label + − / 25m / +) used in the Nearby step. */
export function RadiusStepper({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  return (
    <div className="rounded-2xl border border-border bg-card px-4 py-3 shadow-[var(--elevation-md)]">
      <div className="mb-2 text-body-sm font-semibold text-foreground">Radius</div>
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={() => onChange(Math.max(5, value - 5))}
          className="grid size-9 place-items-center rounded-full border border-border text-foreground transition hover:bg-muted disabled:opacity-40"
          disabled={value <= 5}
          aria-label="Decrease radius"
        >
          <Icons.Minus size={16} />
        </button>
        <span className="min-w-[56px] text-center text-[20px] font-bold tabular-nums text-foreground">{value}m</span>
        <button
          type="button"
          onClick={() => onChange(Math.min(200, value + 5))}
          className="grid size-9 place-items-center rounded-full bg-primary text-primary-foreground transition hover:brightness-95 disabled:opacity-40"
          disabled={value >= 200}
          aria-label="Increase radius"
        >
          <Icons.Plus size={16} />
        </button>
      </div>
    </div>
  );
}

/** Search-bubble overlay whose diameter tracks the radius value. */
function RadiusBubble({ radius }: { radius: number }) {
  // map px scale — 5 m → ~24px, clamped so it stays inside the pane
  const px = Math.min(320, Math.max(40, radius * 2.2));
  return (
    <div className="pointer-events-none absolute left-1/2 top-1/2 z-[450] -translate-x-1/2 -translate-y-1/2">
      <div
        className="rounded-full border-2 border-primary/60 bg-primary/10"
        style={{ width: px, height: px, transition: 'width .2s, height .2s' }}
      />
    </div>
  );
}

/** Shared radius map — GPS dot + radius circle + radius stepper over a Leaflet
 *  map. Used by BOTH the Nearby Incidents step and the Bin/Asset picker so the
 *  two surfaces behave and look identical. */
export function RadiusMap({
  center, pois, radius, onRadius, accuracyM,
}: {
  center: [number, number];
  pois: { id: string; position: [number, number]; color?: string; label?: string }[];
  radius: number;
  onRadius: (v: number) => void;
  accuracyM?: number;
}) {
  return (
    <div className="relative h-full w-full overflow-hidden">
      <LeafletMap center={center} zoom={17} pois={pois} className="h-full w-full" />
      {accuracyM != null && <AccuracyBanner accuracyM={accuracyM} />}
      <GpsDot />
      <RadiusBubble radius={radius} />
      <div className="absolute bottom-3 left-3 z-[500]">
        <RadiusStepper value={radius} onChange={onRadius} />
      </div>
    </div>
  );
}

export function NearbyIncidentsStep({
  center,
  zoneId,
  radius,
  onRadius,
  accuracyM,
}: {
  center: GeoPoint | null;
  zoneId: string;
  radius: number;
  onRadius: (v: number) => void;
  accuracyM?: number;
}) {
  const s = useIims();
  const [selectedNearby, setSelectedNearby] = React.useState<Incident | null>(null);

  const mapCenter: [number, number] = center
    ? [center.lat, center.lng]
    : (() => {
        const z = ZONES.find((zz) => zz.id === zoneId);
        return z ? [z.center.lat, z.center.lng] : [25.18, 55.30];
      })();

  const nearbyPool = React.useMemo(
    () => (center ? syntheticNearby(center, zoneId) : []),
    [center, zoneId],
  );
  const nearbyIncidents = React.useMemo(
    () => (center ? nearbyPool.filter((inc) => haversineM(center, inc.location) <= radius) : []),
    [nearbyPool, center, radius],
  );

  return (
    <div className="flex flex-col gap-4">
      {/* split map (~55%) + list (~45%) */}
      <div className="flex gap-4" style={{ height: 420 }}>
        {/* map pane */}
        <div className="relative basis-[55%] overflow-hidden rounded-xl border border-border">
          <RadiusMap
            center={mapCenter}
            pois={nearbyPool.map((inc) => ({ id: inc.id, position: [inc.location.lat, inc.location.lng] as [number, number], color: '#F04438', label: CATEGORY_LABELS[inc.category] }))}
            radius={radius}
            onRadius={onRadius}
            accuracyM={accuracyM}
          />
        </div>

        {/* incident list pane — KPI Category · Reported By · Reported On */}
        <div className="flex basis-[45%] flex-col overflow-hidden rounded-xl border border-border">
          {/* column header */}
          <div className="grid grid-cols-[1.4fr_1fr_auto] gap-3 border-b border-border bg-secondary/40 px-4 py-2.5 text-body-xs font-bold uppercase tracking-wide text-muted-foreground">
            <span>KPI Category</span>
            <span>Reported By</span>
            <span className="w-24 text-right">Reported On</span>
          </div>
          {nearbyIncidents.length === 0 ? (
            <div className="flex flex-1 items-center justify-center p-4 text-center text-body-sm text-muted-foreground">
              No incidents within {radius} m
            </div>
          ) : (
            <ScrollArea className="flex-1">
              <div className="divide-y divide-border">
                {nearbyIncidents.map((inc) => {
                  const insp = s.inspector(inc.reportedByInspectorId);
                  return (
                    <button
                      key={inc.id}
                      type="button"
                      onClick={() => setSelectedNearby(inc)}
                      className="grid w-full grid-cols-[1.4fr_1fr_auto] items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-secondary/40"
                    >
                      <p className="truncate text-body-sm font-medium text-foreground">
                        {CATEGORY_LABELS[inc.category]}
                      </p>
                      <div className="flex min-w-0 items-center gap-1.5">
                        {insp && <AvatarChip name={insp.name} color={insp.avatarColor} size={20} />}
                        <span className="truncate text-body-sm text-foreground">{insp?.name ?? '—'}</span>
                      </div>
                      <span className="w-24 text-right text-body-xs text-muted-foreground">
                        {formatDate(inc.reportedAt)}
                      </span>
                    </button>
                  );
                })}
              </div>
            </ScrollArea>
          )}
        </div>
      </div>

      {/* Nearby-incident detail — the same pipeline incident side sheet, over the report */}
      {selectedNearby && (
        <IncidentDetailFlow
          incidentId={selectedNearby.id}
          incidentOverride={selectedNearby}
          onClose={() => setSelectedNearby(null)}
        />
      )}
    </div>
  );
}
