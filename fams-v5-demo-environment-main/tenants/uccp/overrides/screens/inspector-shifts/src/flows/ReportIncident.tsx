/**
 * Report Incident Wizard — 3-step centered modal overlay (Figma: 02-report-incident).
 *
 * Step 1: Basic Info   — Incident Lot / Incident Area cascading dropdowns,
 *                        large GPS map (~80%) with blue dot + search box +
 *                        red "Low Location Accuracy" pill.
 * Step 2: Reported Incidents (Nearby) — split map (left ~55%) + list (right ~45%),
 *                        radius stepper (− / 25m / +) that adjusts a search bubble.
 * Step 3: Detail Info  — photo dropzone, Select Bin/Asset picker (map+list,
 *                        multi-select), KPI Category + Select Incident KPI picker
 *                        (bilingual), KPI info card, Notes → submit.
 *
 * Horizontal tab-stepper header (active underline, clickable once visited).
 * DS components + token-only styling. All data flows through the useIims() store.
 */
import * as React from 'react';
import {
  Button, Textarea, Select, SelectTrigger, SelectValue,
  SelectContent, SelectItem, Badge, ScrollArea, toast,
  Sheet, SheetContent, SheetTitle,
} from '@ds/components/primitives';
import * as Icons from '@ds/icons';
import { useIims } from '@/store/store';
import { EvidenceTile, formatAed, formatDate } from '@/lib/ui';
import { ZONES, ESPS, VIOLATION_TYPES } from '@/data/catalog';
import type { GeoPoint, EvidencePhoto, ViolationType, KpiCategory, Asset, AssetType } from '@/data/types';
import { LocationStep, LOTS, AREAS, nearestLot, nearestArea } from '@/flows/shared/LocationStep';
import {
  NearbyIncidentsStep, RadiusMap,
  CATEGORY_LABELS, randomAccuracy, jitter,
} from '@/flows/shared/NearbyIncidentsStep';
import { usePhotoCapture } from '@/flows/shared/PhotoCapture';

/* ─────────────────────── helpers ─────────────────────── */

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

/* jitter() / randomAccuracy() now live in the shared NearbyIncidentsStep
 * module (imported above) so both flows produce identical synthetic data. */

/** Unique KPI categories present in VIOLATION_TYPES (picker filter + grouping). */
const KPI_CATEGORIES: KpiCategory[] = [
  'Solid Waste',
  'Mechanical Sweeping',
  'Manual Sweeping',
  'Fleet',
  'EHS',
  'Resource Allocation',
  'PCC',
];

/* ── Lot / Area model + CATEGORY_LABELS now live in the shared step modules
 * (src/flows/shared/LocationStep.tsx, src/flows/shared/NearbyIncidentsStep.tsx)
 * so both Report Incident and New Inspection agree on the same data + labels. */

/** Offset a point by (dist metres, ang radians). Used locally for the bin/asset
 *  picker's synthetic pool (nearby incidents' own offset lives in the shared
 *  NearbyIncidentsStep module). */
function offsetMeters(center: GeoPoint, dist: number, ang: number): GeoPoint {
  return {
    lat: center.lat + (dist * Math.cos(ang)) / 111_000,
    lng: center.lng + (dist * Math.sin(ang)) / (111_000 * Math.cos((center.lat * Math.PI) / 180)),
  };
}

/* ── Synthetic nearby bins/assets ───────────────────────────────────────────
 * Bins scattered around the pin so the "Select Bin / Asset" picker has a real
 * radius-filterable set to search / scan / pick from. Deterministic. */
function nearbyBins(center: GeoPoint, zoneId: string, espId: string): Asset[] {
  const zcode = (ZONES.find((z) => z.id === zoneId)?.code ?? 'Z-0000').replace('Z-', '');
  const letters = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'];
  const specs: { dist: number; ang: number; type: AssetType; label: string }[] = [
    { dist: 8,  ang: 0.5, type: 'Bin',            label: '1100L Bin' },
    { dist: 13, ang: 1.6, type: 'Bin',            label: '660L Bin' },
    { dist: 17, ang: 2.7, type: 'Container',      label: 'Skip Container' },
    { dist: 22, ang: 3.8, type: 'Bin',            label: '240L Bin' },
    { dist: 24, ang: 4.9, type: 'Bin',            label: '1100L Bin' },
    { dist: 36, ang: 5.7, type: 'Container',      label: '40yd Container' },
    { dist: 48, ang: 1.0, type: 'Bin',            label: '660L Bin' },
    { dist: 60, ang: 2.3, type: 'Street Segment', label: 'Street Segment' },
  ];
  return specs.map((sp, i): Asset => ({
    id: `nbin-${i}`,
    type: sp.type,
    label: `${sp.label} · Sector ${letters[i]}`,
    rfid: `RFID-${zcode}-${1042 + i * 7}`,
    zoneId,
    espId,
    location: offsetMeters(center, sp.dist, sp.ang),
  }));
}

/** Deterministic last/upcoming collection timestamps for a bin/asset. */
function collectionDates(asset: Asset): { last: string; next: string } {
  const base = Date.parse('2026-06-30T07:00:00Z');
  const seed = asset.rfid.split('').reduce((n, c) => n + c.charCodeAt(0), 0);
  const lastAgoHrs = 8 + (seed % 40);
  const nextInHrs = 6 + (seed % 30);
  return {
    last: new Date(base - lastAgoHrs * 3600_000).toISOString(),
    next: new Date(base + nextInHrs * 3600_000).toISOString(),
  };
}

/* ─────────────────────── wizard state ─────────────────── */

type Step = 0 | 1 | 2;

interface WizardState {
  lotId: string;
  areaId: string;
  location: GeoPoint | null;
  accuracyM: number;
  locationSearch: string;
  radius: number;          // Step 2 nearby radius (m)
  photos: EvidencePhoto[];
  assetIds: string[];      // multi-select bins/assets
  violationTypeId: string;
  kpiCategory: KpiCategory | '';
  notes: string;
  kpiSearch: string;
  kpiCatFilter: KpiCategory | '';
  assetSearch: string;
}

/* ─────────────────────── sub-components ───────────────── */
/* AccuracyBanner / GpsDot / MapBtn / areaPolygons now live in the shared step
 * modules (imported above) so both flows render identical map chrome. */

/** Popup shown when sector detection fails — the inspector cannot continue the
 *  report until a valid sector is detected (or picked). */
function NoSectorDialog({ onRetry, onCloseFlow, onDismiss }: { onRetry: () => void; onCloseFlow: () => void; onDismiss: () => void }) {
  return (
    <div className="fixed inset-0 z-[820] grid place-items-center bg-black/50 p-6" onClick={onDismiss}>
      <div className="relative w-full max-w-md rounded-2xl border border-border bg-card p-8 text-center shadow-[var(--elevation-md)]" onClick={(e) => e.stopPropagation()}>
        <button type="button" aria-label="Close" onClick={onDismiss} className="absolute right-4 top-4 rounded-md p-1 text-muted-foreground transition hover:bg-muted hover:text-foreground">
          <Icons.XClose size={18} />
        </button>
        <span className="mx-auto mb-5 grid h-16 w-16 place-items-center rounded-full" style={{ background: 'color-mix(in srgb, var(--status-error) 8%, transparent)' }}>
          <span className="grid h-11 w-11 place-items-center rounded-full" style={{ background: 'color-mix(in srgb, var(--status-error) 14%, transparent)', color: 'var(--status-error)' }}>
            <Icons.AlertCircle size={24} />
          </span>
        </span>
        <h3 className="text-h5 font-bold text-foreground">No Sector Found!</h3>
        <p className="mx-auto mt-2 max-w-sm text-body-sm text-muted-foreground">
          No sector detected. Please move into a valid sector to continue.
        </p>
        <Button variant="primary" size="lg" className="mt-6 w-full" onClick={onRetry}>Retry, Sector Detection</Button>
        <button type="button" onClick={onCloseFlow} className="mt-4 w-full text-body-md font-semibold text-foreground transition hover:opacity-70">
          Close Inspection
        </button>
      </div>
    </div>
  );
}

/* RadiusStepper / RadiusMap (used here by the Bin/Asset picker) now live in
 * the shared NearbyIncidentsStep module (imported above). */

/* ─────────────────────── KPI Picker overlay ─────────────── */

function KpiPicker({
  onSelect,
  onClose,
  selectedId,
  search,
  onSearchChange,
  catFilter,
  onCatFilterChange,
  lockCategory,
}: {
  onSelect: (id: string) => void;
  onClose: () => void;
  selectedId: string;
  search: string;
  onSearchChange: (v: string) => void;
  catFilter: KpiCategory | '';
  onCatFilterChange: (v: KpiCategory | '') => void;
  /** When set, the category filter is fixed to this value (e.g. reporting from
   *  a specific KPI row in the inspection) so the result always matches. */
  lockCategory?: KpiCategory;
}) {
  const effectiveCat = lockCategory ?? catFilter;
  const filtered = VIOLATION_TYPES.filter((vt) => {
    const q = search.toLowerCase();
    const matchSearch =
      !q ||
      vt.name.toLowerCase().includes(q) ||
      vt.pmCode.toLowerCase().includes(q) ||
      (vt.nameAr ?? '').includes(search);
    const matchCat = !effectiveCat || vt.category === effectiveCat;
    return matchSearch && matchCat;
  });

  // group by category
  const grouped = KPI_CATEGORIES.map((cat) => ({
    cat,
    items: filtered.filter((vt) => vt.category === cat),
  })).filter((g) => g.items.length > 0);

  return (
    <div className="fixed inset-0 z-[840]">
      <div className="absolute inset-0 bg-foreground/30 backdrop-blur-sm" onClick={onClose} aria-hidden />
      <div role="dialog" aria-label="Select Incident KPI" className="absolute inset-0 flex flex-col bg-card duration-300 animate-in slide-in-from-right">
        {/* header */}
        <div className="flex items-start justify-between border-b border-border px-6 py-4">
          <div>
            <h2 className="text-h5 font-bold text-foreground">Select Incident KPI</h2>
            <p className="mt-0.5 text-body-sm text-muted-foreground">Search or filter the penalty matrix, then pick the matching KPI.</p>
          </div>
          <button type="button" onClick={onClose} className="rounded-lg p-1.5 hover:bg-secondary" aria-label="Close">
            <Icons.XClose size={18} />
          </button>
        </div>
        {/* filters */}
        <div className="border-b border-border px-6 py-3">
          <div className="mx-auto flex max-w-3xl gap-3">
            <div className="relative flex-1">
              <Icons.SearchMd size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <input
                type="text"
                placeholder="Search KPI, code, or arabic"
                value={search}
                onChange={(e) => onSearchChange(e.target.value)}
                className="h-10 w-full rounded-lg border border-border bg-background pl-8 pr-3 text-body-sm focus:outline-none focus:ring-1 focus:ring-primary"
              />
            </div>
            <Select
              value={effectiveCat}
              onValueChange={(v) => onCatFilterChange(v === '__all' ? '' : (v as KpiCategory))}
              disabled={!!lockCategory}
            >
              <SelectTrigger className="w-56">
                <SelectValue placeholder="Select Category" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__all">All categories</SelectItem>
                {KPI_CATEGORIES.map((c) => (
                  <SelectItem key={c} value={c}>{CATEGORY_LABELS[c]}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
        {/* list */}
        <ScrollArea className="flex-1">
          <div className="mx-auto max-w-3xl px-6 py-4">
            {grouped.length === 0 && (
              <p className="py-8 text-center text-body-sm text-muted-foreground">No KPIs match your search.</p>
            )}
            {grouped.map(({ cat, items }) => (
              <div key={cat} className="mb-4">
                <div className="mb-1.5 text-body-xs font-bold uppercase tracking-wider text-muted-foreground">
                  {CATEGORY_LABELS[cat]}
                </div>
                <div className="flex flex-col gap-1.5">
                  {items.map((vt) => {
                    const active = vt.id === selectedId;
                    return (
                      <button
                        key={vt.id}
                        type="button"
                        onClick={() => onSelect(vt.id)}
                        className={`flex w-full items-start gap-3 rounded-lg border px-3 py-2.5 text-left transition-colors ${
                          active ? 'border-primary bg-primary/5' : 'border-border bg-background hover:border-primary hover:bg-primary/5'
                        }`}
                      >
                        <span
                          className={`mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full border-2 ${
                            active ? 'border-primary' : 'border-border'
                          }`}
                        >
                          {active && <span className="h-2 w-2 rounded-full bg-primary" />}
                        </span>
                        <div className="flex-1 min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <Badge variant="outline" size="xs">{vt.pmCode}</Badge>
                            <Badge variant="secondary" size="xs">{CATEGORY_LABELS[vt.category]}</Badge>
                            {vt.zeroTolerance && <Badge variant="destructive" size="xs">Zero-Tolerance</Badge>}
                          </div>
                          <p className="mt-0.5 text-body-sm font-medium">{vt.name}</p>
                          {vt.nameAr && (
                            <p className="text-body-xs text-muted-foreground" dir="rtl">{vt.nameAr}</p>
                          )}
                          <p className="mt-0.5 text-body-xs text-muted-foreground">
                            Penalty: <span className="font-semibold text-[var(--status-error)]">{formatAed(vt.penaltyAed)}</span>
                            {' · '}Period of compliance: <span className="font-semibold">{vt.rectifyWithinHrs} hrs</span>
                          </p>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </ScrollArea>
      </div>
    </div>
  );
}

/* ─────────────────────── Bin / Asset Picker overlay ─────────────── */

function BinPicker({
  assets,
  selected,
  onToggle,
  onConfirm,
  onClose,
  onScan,
  center,
  radius,
  onRadius,
  search,
  onSearchChange,
}: {
  assets: Asset[];
  selected: string[];
  onToggle: (id: string) => void;
  onConfirm: () => void;
  onClose: () => void;
  onScan: () => void;
  center?: GeoPoint | null;
  radius: number;
  onRadius: (v: number) => void;
  search: string;
  onSearchChange: (v: string) => void;
}) {
  const rows = assets
    .map((a) => ({ a, dist: center ? haversineM(center, a.location) : 0 }))
    .filter(({ a, dist }) => {
      const q = search.trim().toLowerCase();
      const matchQ = !q || a.rfid.toLowerCase().includes(q) || a.label.toLowerCase().includes(q);
      const matchR = !center || dist <= radius;
      return matchQ && matchR;
    })
    .sort((x, y) => x.dist - y.dist);

  return (
    <div className="fixed inset-0 z-[840]">
      <div className="absolute inset-0 bg-foreground/30 backdrop-blur-sm" onClick={onClose} aria-hidden />
      <div role="dialog" aria-label="Select Bin / Asset" className="absolute inset-0 flex flex-col bg-card duration-300 animate-in slide-in-from-right">
        {/* header */}
        <div className="flex items-start justify-between border-b border-border px-6 py-4">
          <div>
            <h2 className="text-h5 font-bold text-foreground">Select Bin / Asset</h2>
            <p className="mt-0.5 text-body-sm text-muted-foreground">Search or scan an RFID, or pick a nearby bin on the map.</p>
          </div>
          <button type="button" onClick={onClose} className="rounded-lg p-1.5 hover:bg-secondary" aria-label="Close"><Icons.XClose size={18} /></button>
        </div>

        {/* toolbar: search + scan + radius */}
        <div className="flex flex-wrap items-center gap-3 border-b border-border px-6 py-3">
          <div className="relative min-w-[240px] flex-1">
            <Icons.SearchMd size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search or enter RFID…"
              value={search}
              onChange={(e) => onSearchChange(e.target.value)}
              className="h-10 w-full rounded-lg border border-border bg-background pl-9 pr-3 text-body-sm focus:outline-none focus:ring-1 focus:ring-primary"
            />
          </div>
          <Button variant="secondary" size="md" onClick={onScan} className="gap-2"><Icons.QrCode01 size={16} /> Scan RFID</Button>
        </div>

        {/* map + list */}
        <div className="flex min-h-0 flex-1 overflow-hidden">
          <div className="relative hidden w-[55%] shrink-0 overflow-hidden border-r border-border md:block">
            <RadiusMap
              center={center ? [center.lat, center.lng] : [25.18, 55.30]}
              pois={assets.map((a) => ({ id: a.id, position: [a.location.lat, a.location.lng] as [number, number], color: selected.includes(a.id) ? '#12B76A' : 'var(--primary)', label: a.label }))}
              radius={radius}
              onRadius={onRadius}
            />
          </div>

          <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
            {/* column header */}
            <div className="grid grid-cols-[1fr_auto_auto] gap-3 border-b border-border bg-secondary/40 px-4 py-2.5 text-body-xs font-bold uppercase tracking-wide text-muted-foreground">
              <span>Bin / RFID</span>
              <span className="w-20 text-right">Distance</span>
              <span className="w-28 text-right">Last Collected</span>
            </div>
            <ScrollArea className="flex-1">
              {rows.length === 0 ? (
                <p className="p-6 text-center text-body-sm text-muted-foreground">No bins within {radius} m. Widen the radius or scan an RFID.</p>
              ) : (
                <div className="divide-y divide-border">
                  {rows.map(({ a, dist }) => {
                    const checked = selected.includes(a.id);
                    const { last } = collectionDates(a);
                    return (
                      <button
                        key={a.id}
                        type="button"
                        onClick={() => onToggle(a.id)}
                        className={`grid w-full grid-cols-[1fr_auto_auto] items-center gap-3 px-4 py-2.5 text-left transition-colors ${checked ? 'bg-primary/5' : 'hover:bg-secondary/40'}`}
                      >
                        <span className="flex min-w-0 items-center gap-3">
                          <span className={`flex h-4 w-4 shrink-0 items-center justify-center rounded border ${checked ? 'border-[var(--status-success)] bg-[var(--status-success)] text-white' : 'border-border'}`}>
                            {checked && <Icons.CheckCircle size={11} />}
                          </span>
                          <span className="min-w-0">
                            <span className="block truncate text-body-sm font-medium">{a.label}</span>
                            <span className="block truncate text-body-xs text-muted-foreground tabular-nums">{a.rfid}</span>
                          </span>
                        </span>
                        <span className="w-20 text-right text-body-xs font-semibold text-foreground">{Math.round(dist)} m</span>
                        <span className="w-28 text-right text-body-xs text-muted-foreground">{formatDate(last)}</span>
                      </button>
                    );
                  })}
                </div>
              )}
            </ScrollArea>
          </div>
        </div>

        {/* footer */}
        <div className="flex items-center justify-between border-t border-border px-6 py-3">
          <span className="text-body-xs text-muted-foreground">{selected.length} {selected.length === 1 ? 'bin' : 'bins'} selected</span>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="md" onClick={onClose}>Cancel</Button>
            <Button variant="primary" size="md" onClick={onConfirm} disabled={selected.length === 0}>Confirm</Button>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ─────────────────────── Detail Info body (shared) ───────────────── */
/**
 * The "Detail Info" step body — photo evidence grid, bin/asset picker, KPI
 * picker, notes. Used both as Step 3 of the full wizard AND as the entire body
 * of the "detail-only" mode (reported from an in-progress inspection, where
 * Basic Info + Nearby Incidents were already handled by the inspection itself).
 */
function DetailInfoBody({
  photos,
  onRemovePhoto,
  onUploadClick,
  assetIds,
  selectedAssets,
  onOpenBinPicker,
  onRemoveAsset,
  selectedViolation,
  onOpenKpiPicker,
  notes,
  onNotesChange,
  kpiLocked,
}: {
  photos: EvidencePhoto[];
  onRemovePhoto: (id: string) => void;
  onUploadClick: () => void;
  assetIds: string[];
  selectedAssets: Asset[];
  onOpenBinPicker: () => void;
  onRemoveAsset: (id: string) => void;
  selectedViolation: ViolationType | null;
  onOpenKpiPicker: () => void;
  notes: string;
  onNotesChange: (v: string) => void;
  /** true when the KPI is pre-constrained (e.g. launched from a KPI row) — the
   *  picker button still opens, but a hint communicates the preset category. */
  kpiLocked?: boolean;
}) {
  return (
    <div className="flex flex-col gap-6">
      {/* Photo Evidence */}
      <section>
        <div className="mb-2 flex items-center gap-2">
          <h3 className="text-body-lg font-semibold">
            Photo Evidence <span className="text-[var(--status-error)]">*</span>
          </h3>
          <span className="text-body-xs text-muted-foreground">(at least 1 required)</span>
        </div>

        {/* dropzone → opens the upload-method dialog */}
        <button
          type="button"
          onClick={onUploadClick}
          className="flex w-full flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-border bg-background py-8 text-muted-foreground transition-colors hover:border-primary hover:bg-primary/5 hover:text-primary"
        >
          <Icons.Camera01 size={28} />
          <span className="text-body-sm font-medium">Tap here to upload image.</span>
        </button>

        {/* thumbnail grid */}
        {photos.length > 0 && (
          <div className="mt-3 grid grid-cols-4 gap-3">
            {photos.map((ph) => (
              <div key={ph.id} className="relative group">
                <EvidenceTile photo={ph} className="w-full" />
                <button
                  type="button"
                  onClick={() => onRemovePhoto(ph.id)}
                  className="absolute right-1.5 top-1.5 hidden h-5 w-5 items-center justify-center rounded-full bg-black/60 text-white group-hover:flex"
                  title="Remove photo"
                >
                  <Icons.XClose size={10} />
                </button>
              </div>
            ))}
          </div>
        )}

        {photos.length === 0 && (
          <p className="mt-1.5 text-body-xs text-[var(--status-error)]">
            At least one photo is required to submit.
          </p>
        )}
      </section>

      {/* Select Bin / Asset */}
      <section>
        <label className="mb-1.5 block text-body-sm font-medium text-foreground">
          Select Bin / Asset
          <span className="ml-1.5 text-body-xs font-normal text-muted-foreground">(Optional)</span>
        </label>
        <button
          type="button"
          onClick={onOpenBinPicker}
          className="flex w-full items-center justify-between rounded-lg border border-border bg-background px-4 py-3 text-left transition-colors hover:border-primary hover:bg-primary/5"
        >
          <span className="flex items-center gap-2 text-body-sm">
            <Icons.MarkerPin01 size={16} className="text-muted-foreground" />
            {assetIds.length > 0 ? (
              <span className="font-medium text-foreground">{assetIds.length} Items Selected</span>
            ) : (
              <span className="text-muted-foreground">Select Bin…</span>
            )}
          </span>
          <Icons.ChevronRight size={16} className="text-muted-foreground" />
        </button>

        {/* selected bin summary chips */}
        {selectedAssets.length > 0 && (
          <div className="mt-2 flex flex-wrap gap-2">
            {selectedAssets.map((a) => (
              <span
                key={a.id}
                className="inline-flex items-center gap-1.5 rounded-full border border-border bg-secondary/50 px-2.5 py-1 text-body-xs"
              >
                <span className="font-medium">{a.label}</span>
                <span className="text-muted-foreground tabular-nums">{a.rfid}</span>
                <button
                  type="button"
                  onClick={() => onRemoveAsset(a.id)}
                  className="text-muted-foreground hover:text-foreground"
                  aria-label="Remove asset"
                >
                  <Icons.XClose size={11} />
                </button>
              </span>
            ))}
          </div>
        )}
      </section>

      {/* Select Incident KPI — single field → full-screen picker.
           When selected: English title (left) · Arabic (right), nothing else. */}
      <section>
        <label className="mb-1.5 block text-body-sm font-medium text-foreground">
          Select Incident KPI <span className="text-[var(--status-error)]">*</span>
        </label>
        <button
          type="button"
          onClick={onOpenKpiPicker}
          className="flex w-full items-center justify-between gap-4 rounded-lg border border-border bg-background px-4 py-3 text-left transition-colors hover:border-primary hover:bg-primary/5"
        >
          {selectedViolation ? (
            <>
              <span className="truncate text-body-sm font-medium text-foreground">{selectedViolation.name}</span>
              {selectedViolation.nameAr && (
                <span className="shrink-0 text-body-sm font-medium text-muted-foreground" dir="rtl">{selectedViolation.nameAr}</span>
              )}
            </>
          ) : (
            <>
              <span className="text-body-sm text-muted-foreground">Select Incident KPI…</span>
              <Icons.ChevronRight size={16} className="shrink-0 text-muted-foreground" />
            </>
          )}
        </button>
        {kpiLocked && (
          <p className="mt-1.5 text-body-xs text-muted-foreground">
            Pre-filtered to the KPI category you reported this from.
          </p>
        )}
      </section>

      {/* Notes */}
      <section>
        <label className="mb-1.5 block text-body-sm font-medium text-foreground">
          Notes
          <span className="ml-1.5 text-body-xs font-normal text-muted-foreground">(Optional)</span>
        </label>
        <Textarea
          placeholder="Start writing here…."
          value={notes}
          onChange={(e) => onNotesChange(e.target.value)}
          rows={3}
          className="resize-none"
        />
      </section>
    </div>
  );
}

/* CameraCapture / UploadMethodDialog now live in the shared PhotoCapture module
 * (imported above) so Report Incident, Rectification, and Verification all
 * share one implementation — routed through usePhotoCapture(). */

/* ─────────────────────── main component ───────────────── */

export function ReportIncidentFlow({
  sourceInspectionId,
  mode = 'full',
  presetCategory,
  prefillZoneId,
  prefillEspId,
  prefillLocation,
  onClose,
}: {
  sourceInspectionId?: string;
  /** 'detail' renders ONLY the Detail-Info body (used when reporting an incident
   *  from within an in-progress inspection — Basic Info + Nearby Incidents were
   *  already covered by the inspection itself). Defaults to the full 3-tab wizard. */
  mode?: 'full' | 'detail';
  /** Constrains/preselects the KPI picker to this category (e.g. the KPI row the
   *  inspector clicked "+ Report Incident" from), so the resulting incident's
   *  category matches that row and its count increments. */
  presetCategory?: KpiCategory;
  /** Co-locates the created incident with the source inspection. */
  prefillZoneId?: string;
  /** The source inspection's ESP — used instead of guessing the first ESP that
   *  serves the zone (a zone can be served by several contractors). */
  prefillEspId?: string;
  prefillLocation?: GeoPoint;
  onClose: () => void;
}) {
  const s = useIims();
  const isDetailOnly = mode === 'detail';

  const [step, setStep] = React.useState<Step>(0);
  const [visited, setVisited] = React.useState<Set<Step>>(() => new Set<Step>([0]));
  const [showKpiPicker, setShowKpiPicker] = React.useState(false);
  const [showBinPicker, setShowBinPicker] = React.useState(false);
  const [pendingAssetIds, setPendingAssetIds] = React.useState<string[]>([]);

  const prefillLot = prefillZoneId ? LOTS.find((l) => l.zoneId === prefillZoneId) ?? null : null;

  const [state, setState] = React.useState<WizardState>(() => ({
    lotId: prefillLot?.id ?? '',
    areaId: '',
    location: prefillLocation ?? prefillLot?.center ?? null,
    accuracyM: randomAccuracy(),
    locationSearch: '',
    radius: 25,
    photos: [],
    assetIds: [],
    violationTypeId: '',
    kpiCategory: presetCategory ?? '',
    notes: '',
    kpiSearch: '',
    kpiCatFilter: presetCategory ?? '',
    assetSearch: '',
  }));

  const set = <K extends keyof WizardState>(key: K, value: WizardState[K]) =>
    setState((prev) => ({ ...prev, [key]: value }));

  /* derived */
  const selectedLot = LOTS.find((l) => l.id === state.lotId) ?? null;
  const selectedViolation = VIOLATION_TYPES.find((v) => v.id === state.violationTypeId) ?? null;

  /* Bin/Asset picker — synthetic nearby bins around the pin, radius-filterable */
  const [binRadius, setBinRadius] = React.useState(25);
  const binPool = React.useMemo(() => {
    if (!state.location) return [];
    const zoneId = LOTS.find((l) => l.id === state.lotId)?.zoneId ?? '';
    const espId = ESPS.find((e) => e.zoneIds.includes(zoneId))?.id ?? ESPS[0].id;
    return nearbyBins(state.location, zoneId, espId);
  }, [state.location, state.lotId]);
  const selectedAssets = binPool.filter((a) => state.assetIds.includes(a.id));

  /* stepper tabs */
  const TABS = ['Basic Info', 'Nearby Incidents', 'Detail Info'] as const;

  /* ── location detection (real browser geolocation → nearest lot/area) ──
     Happy-path only: always resolves to a valid lot, either from the live
     GPS fix (nearest lot/area) or — if geolocation was denied/unavailable —
     the inspector's assigned home lot. Skipped entirely in detail-only mode
     — the inspection already established the lot/location, so there's
     nothing to (re)detect. */
  const [detecting, setDetecting] = React.useState(!isDetailOnly); // auto-run on open (full mode only)
  const [willSucceed, setWillSucceed] = React.useState(true);
  const [showInvalid, setShowInvalid] = React.useState(false);

  const me = s.currentInspector();

  function runDetect(succeed: boolean) {
    setShowInvalid(false);
    setWillSucceed(succeed);
    setDetecting(true);
  }

  function onDetectComplete(ok: boolean, geo?: { location: GeoPoint; accuracyM: number }) {
    setDetecting(false);
    if (!ok) return; // happy-path only — detection never fails anymore
    if (geo) {
      // Live GPS fix granted → map it to the nearest known lot/area.
      const lot = nearestLot(geo.location);
      const area = nearestArea(lot, geo.location);
      setState((prev) => ({
        ...prev,
        lotId: lot.id,
        areaId: area.id,
        location: geo.location,
        accuracyM: geo.accuracyM,
      }));
    } else {
      // Denied/unavailable/timed out → fall back to the inspector's home lot,
      // still a success so the flow isn't blocked.
      toast('Live location unavailable — using your assigned area');
      const homeLot = LOTS.find((l) => l.zoneId === me.homeZoneId) ?? LOTS[0];
      const area = AREAS.find((a) => a.lotId === homeLot.id) ?? null;
      setState((prev) => ({
        ...prev,
        lotId: homeLot.id,
        areaId: area?.id ?? '',
        location: jitter(homeLot.center),
        accuracyM: randomAccuracy(),
      }));
    }
  }

  /* ── validation per step ── */
  function validateStep(st: Step): string | null {
    if (st === 0) {
      if (!state.lotId) return 'Please select an Incident Lot.';
      if (!state.areaId) return 'Please select an Incident Area.';
      if (!state.location) return 'Location required.';
    }
    if (st === 2) {
      if (state.photos.length === 0) return 'At least one photo is required.';
      if (!state.violationTypeId) return 'Please select an Incident KPI.';
    }
    return null;
  }

  /** Step 3 final-submit gate: ≥1 photo AND a KPI. */
  const canSubmit = state.photos.length > 0 && !!state.violationTypeId;

  function goTo(target: Step) {
    if (target === step) return;
    if (target > step) {
      const err = validateStep(step);
      if (err) { toast.error(err); return; }
    }
    setVisited((prev) => new Set(prev).add(target));
    setStep(target);
  }

  function handleContinue() {
    const err = validateStep(step);
    if (err) { toast.error(err); return; }
    if (step < 2) {
      const next = (step + 1) as Step;
      setVisited((prev) => new Set(prev).add(next));
      setStep(next);
    } else {
      handleSubmit();
    }
  }

  function handleBack() {
    if (step > 0) setStep((prev) => (prev - 1) as Step);
  }

  /* ── add photo (camera capture or gallery upload, routed through the shared
   *  UploadMethodDialog → CameraCapture/gallery → ImageAnnotator flow so report
   *  photos can be marked up like every other evidence surface). ── */
  const photoCapture = usePhotoCapture({
    getGps: () => state.location,
    caption: (i) => `Evidence photo ${i}`,
    onAdd: (photo) => setState((prev) => ({ ...prev, photos: [...prev.photos, photo] })),
  });

  /* ── submit ── */
  function handleSubmit() {
    if (!state.location || !state.violationTypeId || !selectedLot) return;

    // ESP: prefer the source inspection's ESP (a zone can be served by several
    // contractors); else fall back to one serving the zone, else the first.
    const esp = ESPS.find((e) => e.id === prefillEspId)
      ?? ESPS.find((e) => e.zoneIds.includes(selectedLot.zoneId))
      ?? ESPS[0];

    s.reportIncident({
      violationTypeId: state.violationTypeId,
      zoneId: selectedLot.zoneId,
      espId: esp.id,
      assetId: state.assetIds[0] || undefined,
      location: state.location,
      locationAccuracyM: state.accuracyM,
      evidence: state.photos,
      notes: state.notes || undefined,
      sourceInspectionId,
    });

    toast.success('Incident reported');
    onClose();
  }

  /* ── picker handlers ── */
  function handleKpiSelect(id: string) {
    const vt = VIOLATION_TYPES.find((v) => v.id === id);
    setState((prev) => ({ ...prev, violationTypeId: id, kpiCategory: vt?.category ?? prev.kpiCategory }));
    setShowKpiPicker(false);
  }

  function openBinPicker() {
    setPendingAssetIds(state.assetIds);
    setShowBinPicker(true);
  }
  function togglePendingAsset(id: string) {
    setPendingAssetIds((prev) => prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]);
  }
  function confirmBinPicker() {
    set('assetIds', pendingAssetIds);
    setShowBinPicker(false);
  }
  /* Simulate an RFID scan → select the closest nearby bin. */
  function handleBinScan() {
    if (!state.location || binPool.length === 0) return;
    const nearest = [...binPool].sort((a, b) => haversineM(state.location!, a.location) - haversineM(state.location!, b.location))[0];
    setPendingAssetIds((prev) => (prev.includes(nearest.id) ? prev : [...prev, nearest.id]));
    set('assetSearch', '');
    toast.success(`RFID scanned · ${nearest.rfid}`);
  }

  /* ───────────────────────── render ───────────────────── */
  return (
    <Sheet open onOpenChange={(o) => { if (!o) onClose(); }}>
      {/* Full-screen side sheet (slides in from the right) */}
      <SheetContent
        side="right"
        hideClose
        width="100vw"
        aria-label="Report Incident"
        className="flex flex-col gap-0 border-0 p-0"
      >
        <SheetTitle className="sr-only">Report Incident</SheetTitle>
        <div className="flex h-full flex-col overflow-hidden bg-card">

          {/* ── header ── */}
          <div className="flex items-start justify-between border-b border-border px-6 pt-5 pb-4">
            <div>
              <h2 className="text-h5 font-bold text-foreground">Report Incident</h2>
              {sourceInspectionId && (
                <span className="mt-1 inline-block rounded bg-secondary px-1.5 py-0.5 text-body-xs font-medium">
                  Linked to {sourceInspectionId}
                </span>
              )}
            </div>
            <button
              type="button"
              onClick={onClose}
              className="ml-4 rounded-lg p-1.5 hover:bg-secondary"
              aria-label="Close"
            >
              <Icons.XClose size={18} />
            </button>
          </div>

          {/* ── horizontal tabs (active = primary underline, clickable once visited) ──
               Hidden entirely in detail-only mode: Basic Info + Nearby Incidents were
               already handled by the parent inspection. */}
          {!isDetailOnly && (
            <div className="flex gap-7 border-b border-border px-6">
              {TABS.map((label, i) => {
                const idx = i as Step;
                const active = idx === step;
                const clickable = visited.has(idx) || idx <= step;
                return (
                  <button
                    key={label}
                    type="button"
                    disabled={!clickable}
                    onClick={() => clickable && goTo(idx)}
                    className={`relative py-3 text-[15px] font-semibold transition-colors ${
                      active ? 'text-primary' : clickable ? 'text-muted-foreground hover:text-foreground' : 'cursor-not-allowed text-muted-foreground/50'
                    }`}
                  >
                    {label}
                    <span className={`absolute inset-x-0 -bottom-px h-0.5 rounded-full ${active ? 'bg-primary' : 'bg-transparent'}`} />
                  </button>
                );
              })}
            </div>
          )}

          {/* ── body ── */}
          {isDetailOnly ? (
            /* ═══════════ Detail-only mode: Detail Info body ONLY ═══════════ */
            <ScrollArea className="flex-1 overflow-auto">
              <div className="px-6 py-5">
                <DetailInfoBody
                  photos={state.photos}
                  onRemovePhoto={(id) => setState((prev) => ({ ...prev, photos: prev.photos.filter((p) => p.id !== id) }))}
                  onUploadClick={() => photoCapture.start('incident')}
                  assetIds={state.assetIds}
                  selectedAssets={selectedAssets}
                  onOpenBinPicker={openBinPicker}
                  onRemoveAsset={(id) => set('assetIds', state.assetIds.filter((x) => x !== id))}
                  selectedViolation={selectedViolation}
                  onOpenKpiPicker={() => setShowKpiPicker(true)}
                  notes={state.notes}
                  onNotesChange={(v) => set('notes', v)}
                  kpiLocked={!!presetCategory}
                />
              </div>
            </ScrollArea>
          ) : step === 0 ? (
            /* ═══════════ STEP 1: Basic Info — shared LocationStep ═══════════ */
            <LocationStep
              lotId={state.lotId}
              areaId={state.areaId}
              location={state.location}
              accuracyM={state.accuracyM}
              detecting={detecting}
              willSucceed={willSucceed}
              onDetect={runDetect}
              onDetectComplete={onDetectComplete}
            />
          ) : (
          <ScrollArea className="flex-1 overflow-auto">
            <div className="px-6 py-5">

              {/* ═══════════════ STEP 2: Reported Incidents (Nearby) — shared NearbyIncidentsStep ════════ */}
              {step === 1 && (
                <NearbyIncidentsStep
                  center={state.location}
                  zoneId={selectedLot?.zoneId ?? ''}
                  radius={state.radius}
                  onRadius={(v) => set('radius', v)}
                  accuracyM={state.accuracyM}
                />
              )}

              {/* ═══════════════ STEP 3: Detail Info ══════════════ */}
              {step === 2 && (
                <DetailInfoBody
                  photos={state.photos}
                  onRemovePhoto={(id) => setState((prev) => ({ ...prev, photos: prev.photos.filter((p) => p.id !== id) }))}
                  onUploadClick={() => photoCapture.start('incident')}
                  assetIds={state.assetIds}
                  selectedAssets={selectedAssets}
                  onOpenBinPicker={openBinPicker}
                  onRemoveAsset={(id) => set('assetIds', state.assetIds.filter((x) => x !== id))}
                  selectedViolation={selectedViolation}
                  onOpenKpiPicker={() => setShowKpiPicker(true)}
                  notes={state.notes}
                  onNotesChange={(v) => set('notes', v)}
                  kpiLocked={!!presetCategory}
                />
              )}
            </div>
          </ScrollArea>
          )}

          {/* ── footer ── */}
          <div className="flex items-center justify-between border-t border-border bg-card px-6 py-4">
            <div className="flex items-center gap-3">
              {!isDetailOnly && step > 0 && (
                <Button variant="secondary" size="md" onClick={handleBack}>
                  <Icons.ChevronLeft size={15} className="mr-1" />
                  Back
                </Button>
              )}
              <Button variant="ghost" size="md" onClick={onClose} className="text-muted-foreground">
                Cancel
              </Button>
            </div>
            <div className="flex items-center gap-4">
              {!isDetailOnly && step < 2 && (
                <span className="text-body-xs text-muted-foreground">Step {step + 1} of 3</span>
              )}
              <Button
                variant="primary"
                size="md"
                onClick={isDetailOnly ? handleSubmit : handleContinue}
                disabled={
                  isDetailOnly
                    ? !canSubmit
                    : (step === 2 && !canSubmit) || (step === 0 && (detecting || showInvalid || !state.location || !state.lotId || !state.areaId))
                }
              >
                {!isDetailOnly && step < 2 ? (
                  <>
                    Save and Continue
                    <Icons.ChevronRight size={15} className="ml-1" />
                  </>
                ) : (
                  <>
                    <Icons.CheckCircle size={15} className="mr-1.5" />
                    Submit Incident
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>

      {/* KPI Picker overlay (z-800) */}
      {showKpiPicker && (
        <KpiPicker
          onSelect={handleKpiSelect}
          onClose={() => setShowKpiPicker(false)}
          selectedId={state.violationTypeId}
          search={state.kpiSearch}
          onSearchChange={(v) => set('kpiSearch', v)}
          catFilter={state.kpiCatFilter}
          onCatFilterChange={(v) => set('kpiCatFilter', v)}
          lockCategory={presetCategory}
        />
      )}

      {/* Bin / Asset Picker — full-screen side sheet over the report (z-840) */}
      {showBinPicker && (
        <BinPicker
          assets={binPool}
          selected={pendingAssetIds}
          onToggle={togglePendingAsset}
          onConfirm={confirmBinPicker}
          onClose={() => setShowBinPicker(false)}
          onScan={handleBinScan}
          center={state.location}
          radius={binRadius}
          onRadius={setBinRadius}
          search={state.assetSearch}
          onSearchChange={(v) => set('assetSearch', v)}
        />
      )}

      {/* No-sector popup (z-820) — blocks continuing until a valid sector */}
      {showInvalid && (
        <NoSectorDialog
          onRetry={() => runDetect(true)}
          onCloseFlow={onClose}
          onDismiss={() => setShowInvalid(false)}
        />
      )}

      {/* Upload-method dialog → camera/gallery → annotator (z-840/850), shared
          across Report Incident, Rectification, and Verification via usePhotoCapture(). */}
      {photoCapture.render()}

      {/* Nearby-incident detail is now rendered INSIDE <NearbyIncidentsStep> (step 1
          above) so both Report Incident and New Inspection get identical behaviour. */}
        </SheetContent>
    </Sheet>
  );
}
