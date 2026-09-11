/**
 * LocationStep — the shared "Basic Info" map-first location step, extracted
 * VERBATIM from ReportIncident.tsx's Step 0 render so both the Report Incident
 * wizard and the New Inspection flow show/behave identically:
 *   - map-first LeafletMap (ref, pois for the location pin, zones for the
 *     sector-area overlay when toggled on)
 *   - two read-only "Incident Lot" / "Incident Area" overlay cards (top)
 *   - top-right MapBtn cluster: detect (NavigationPointer01) + show-areas (Pentagon)
 *   - bottom-right MapBtn cluster: zoom +/-, recenter (Target04), fullscreen
 *   - GPS accuracy pill (bottom-left)
 *   - SectorDetectOverlay while `detecting`
 *
 * The parent owns the wizard/inspection state (lot/area/location/accuracy,
 * detecting/willSucceed) and passes it down; this component owns only its own
 * local map-UI state (mapRef, mapFull, showAreas).
 */
import * as React from 'react';
import * as Icons from '@ds/icons';
import { LeafletMap } from '@ds/components/map';
import type { LeafletMapHandle, MapZone } from '@ds/components/map';
import { SectorDetectOverlay } from '@/flows/SectorDetectOverlay';
import { ZONES } from '@/data/catalog';
import type { GeoPoint } from '@/data/types';

/* ── Lot / Area model — derived deterministically from the zone catalogue.
 * Shared shape so both flows agree on the same "Lot N" naming. ── */
export interface Lot { id: string; name: string; zoneId: string; center: GeoPoint }
export interface Area { id: string; lotId: string; name: string; center: GeoPoint }

export const LOTS: Lot[] = ZONES.map((z, i) => ({
  id: z.id,
  name: `Lot ${i + 1} · ${z.name}`,
  zoneId: z.id,
  center: z.center,
}));

export const AREAS: Area[] = LOTS.flatMap((lot) =>
  Array.from({ length: 3 }, (_, a) => ({
    id: `${lot.id}-area-${a + 1}`,
    lotId: lot.id,
    name: `Area ${a + 1}`,
    // small deterministic offset per area so the pin shifts when area changes
    center: {
      lat: lot.center.lat + (a - 1) * 0.0025,
      lng: lot.center.lng + (a - 1) * 0.0025,
    },
  })),
);

/** Haversine distance in metres. */
export function haversineM(a: GeoPoint, b: GeoPoint): number {
  const R = 6_371_000;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.asin(Math.sqrt(h));
}

/** Nearest lot to a live GPS point (min haversine distance over LOTS). */
export function nearestLot(p: GeoPoint): Lot {
  return [...LOTS].sort((a, b) => haversineM(p, a.center) - haversineM(p, b.center))[0];
}

/** Nearest area within a given lot to a live GPS point. */
export function nearestArea(lot: Lot, p: GeoPoint): Area {
  const areas = AREAS.filter((a) => a.lotId === lot.id);
  return [...areas].sort((a, b) => haversineM(p, a.center) - haversineM(p, b.center))[0];
}

/** Filled polygons for a lot's areas — the orange sector overlay on the map. */
export function areaPolygons(lotId: string): MapZone[] {
  return AREAS.filter((a) => a.lotId === lotId).map((a, i) => {
    const pts: [number, number][] = [];
    for (let k = 0; k < 5; k++) {
      const ang = (k / 5) * Math.PI * 2 + i;
      const r = 0.006 + ((i + k) % 3) * 0.0015;
      pts.push([a.center.lat + Math.sin(ang) * r, a.center.lng + Math.cos(ang) * r * 1.2]);
    }
    return { id: a.id, points: pts, color: '#F79009', fillOpacity: 0.35, label: a.name };
  });
}

/** GPS blue dot overlaid at the centre of a map pane. */
export function GpsDot() {
  return (
    <div className="pointer-events-none absolute left-1/2 top-1/2 z-[500] -translate-x-1/2 -translate-y-1/2">
      <span className="block h-3.5 w-3.5 rounded-full border-2 border-white bg-primary shadow-[0_0_0_4px_rgba(0,114,214,0.25)]" />
    </div>
  );
}

/** Square map-control button (zoom / locate / draw / fullscreen). */
export function MapBtn({ label, onClick, active, children }: { label: string; onClick: () => void; active?: boolean; children: React.ReactNode }) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      onClick={onClick}
      className={`flex size-10 items-center justify-center rounded-lg border shadow-[var(--elevation-md)] transition ${
        active ? 'border-primary bg-primary text-primary-foreground' : 'border-border bg-card text-foreground hover:bg-muted'
      }`}
    >
      {children}
    </button>
  );
}

export function LocationStep({
  lotId,
  areaId,
  location,
  accuracyM,
  detecting,
  willSucceed,
  onDetect,
  onDetectComplete,
}: {
  lotId: string;
  areaId: string;
  location: GeoPoint | null;
  accuracyM: number;
  detecting: boolean;
  willSucceed: boolean;
  /** Re-run detection (top-right "Detect my location" button). Always
   *  succeeds (happy path) — re-requests the browser's live location. */
  onDetect: (succeed: boolean) => void;
  /** Fired when the AI sector-detect animation completes. `geo` carries the
   *  live browser-geolocation fix (when the user granted permission and it
   *  resolved in time); it's undefined on denial/timeout/unsupported, in
   *  which case the parent falls back to the assigned/home lot. */
  onDetectComplete: (ok: boolean, geo?: { location: GeoPoint; accuracyM: number }) => void;
}) {
  const mapRef = React.useRef<LeafletMapHandle>(null);
  const [mapFull, setMapFull] = React.useState(false);
  const [showAreas, setShowAreas] = React.useState(false);

  /** Holds the outcome of the real navigator.geolocation call while the
   *  SectorDetectOverlay animation plays. Null until/unless a fix resolves. */
  const geoRef = React.useRef<{ location: GeoPoint; accuracyM: number } | null>(null);
  const wasDetecting = React.useRef(false);

  // Rising edge of `detecting` → kick off the real browser geolocation
  // request (triggers the permission prompt). Never blocks or throws — on
  // denial/timeout/unsupported, geoRef simply stays null and the overlay's
  // own timer still carries the flow to completion.
  React.useEffect(() => {
    if (detecting && !wasDetecting.current) {
      geoRef.current = null;
      if (typeof navigator !== 'undefined' && navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
          (pos) => {
            geoRef.current = {
              location: { lat: pos.coords.latitude, lng: pos.coords.longitude },
              accuracyM: Math.round(pos.coords.accuracy),
            };
          },
          () => {
            geoRef.current = null;
          },
          { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 },
        );
      }
    }
    wasDetecting.current = detecting;
  }, [detecting]);

  const handleOverlayComplete = React.useCallback(
    (ok: boolean) => {
      onDetectComplete(ok, geoRef.current ?? undefined);
    },
    [onDetectComplete],
  );

  const selectedLot = LOTS.find((l) => l.id === lotId) ?? null;

  const mapCenter: [number, number] = location
    ? [location.lat, location.lng]
    : selectedLot ? [selectedLot.center.lat, selectedLot.center.lng] : [25.18, 55.30];

  return (
    <div className={mapFull ? 'fixed inset-0 z-[760] bg-card' : 'relative flex-1'}>
      <div className="relative h-full w-full overflow-hidden isolate">
        <LeafletMap
          ref={mapRef}
          center={mapCenter}
          zoom={location ? 14 : 12}
          zones={showAreas && lotId ? areaPolygons(lotId) : []}
          pois={location ? [{ id: 'loc', position: [location.lat, location.lng], color: 'var(--primary)', label: 'Incident location' }] : []}
          className="h-full w-full"
        />

        {/* Incident Lot / Area — read-only, auto-filled by sector detection.
           While detecting, the fields read empty; the system fills them from the
           detected location once the animation completes. */}
        <div className="absolute left-4 right-16 top-4 z-[500] grid grid-cols-2 gap-3">
          <div className="rounded-xl border border-border bg-card/95 px-3.5 py-2 shadow-[var(--elevation-md)] backdrop-blur">
            <div className="text-[11px] font-medium text-muted-foreground">Incident Lot</div>
            <div className="truncate text-[15px] font-semibold text-foreground">{detecting ? '—' : (selectedLot?.name ?? '—')}</div>
          </div>
          <div className="rounded-xl border border-border bg-card/95 px-3.5 py-2 shadow-[var(--elevation-md)] backdrop-blur">
            <div className="text-[11px] font-medium text-muted-foreground">Incident Area</div>
            <div className="truncate text-[15px] font-semibold text-foreground">{detecting ? '—' : (AREAS.find((a) => a.id === areaId)?.name ?? '—')}</div>
          </div>
        </div>

        {/* draw tools (top-right) */}
        <div className="absolute right-4 top-4 z-[500] flex flex-col gap-2">
          <MapBtn label="Detect my location" onClick={() => onDetect(true)}><Icons.NavigationPointer01 size={17} /></MapBtn>
          <MapBtn label="Show sector areas" active={showAreas} onClick={() => setShowAreas((v) => !v)}><Icons.Pentagon size={17} /></MapBtn>
        </div>

        {/* zoom / locate / fullscreen (bottom-right) */}
        <div className="absolute bottom-4 right-4 z-[500] flex flex-col gap-2">
          <MapBtn label="Zoom in" onClick={() => mapRef.current?.zoomIn()}><Icons.Plus size={17} /></MapBtn>
          <MapBtn label="Zoom out" onClick={() => mapRef.current?.zoomOut()}><Icons.Minus size={17} /></MapBtn>
          <MapBtn label="Re-centre on location" onClick={() => location && mapRef.current?.flyTo([location.lat, location.lng], 15)}><Icons.Target04 size={17} /></MapBtn>
          <MapBtn label={mapFull ? 'Exit fullscreen' : 'Fullscreen'} onClick={() => setMapFull((v) => !v)}>{mapFull ? <Icons.Minimize01 size={17} /> : <Icons.Maximize01 size={17} />}</MapBtn>
        </div>

        {/* GPS accuracy pill + coords (bottom-left) */}
        {location && !detecting && (
          <div className="absolute bottom-4 left-4 z-[500] flex items-center gap-2.5 rounded-lg border border-border bg-card/95 px-3 py-2 shadow-[var(--elevation-md)] backdrop-blur">
            <Icons.MarkerPin01 size={14} className="shrink-0 text-muted-foreground" />
            <span className="text-body-xs tabular-nums text-muted-foreground">{location.lat.toFixed(5)}, {location.lng.toFixed(5)}</span>
            <span className={`text-body-xs font-semibold ${accuracyM > 20 ? 'text-[var(--status-error)]' : 'text-[var(--status-success)]'}`}>± {accuracyM} m</span>
          </div>
        )}

        {/* AI sector-detection animation overlay */}
        {detecting && <SectorDetectOverlay willSucceed={willSucceed} onComplete={handleOverlayComplete} />}
      </div>
    </div>
  );
}
