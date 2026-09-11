import { cn } from '@fams/design-system'
import {
  MapPin, Clock, Truck, User, AlertTriangle,
} from 'lucide-react'
import type { PlanCardRow, ComplaintRow, ComplaintSeverity } from './gisTabsData'

/* ── POI marker set, extracted VERBATIM from the design system ──────────────
 * SUPERSEDES a 2026-09-01 addendum that (wrongly) concluded no DS category
 * marker library existed and shipped a 2-kind `plant`/`site` generic
 * squircle/circle stand-in — that grep missed the DS's actual asset
 * library, `fams-design-system/assets/icons/poi/*.svg`: the FAMS V5 POI
 * MARKER set (Figma "FAMS V5 Launch Pad" 555:69603 / 555:69751), a colored
 * squircle head on a teardrop pin with a white category glyph and a
 * pointed dot foot — one file per category, fill color baked into the SVG.
 * Files are copied byte-for-byte into this app's public/assets/poi/ (no
 * geometry redrawn, no colors re-picked). The SAME image is used for both
 * the full map pin (`PoiCategoryMarker`, LiveGisMap.tsx) and this list
 * row's leading chip (`PoiChip` below, cropped to just the circular glyph
 * head) — one source of truth per category, not two.
 */
export type PoiCategory = 'depot' | 'fuel' | 'service' | 'rest-stop' | 'civic'

interface PoiCategoryMeta {
  label: string
  /** DS `assets/icons/poi/*.svg` source file, copied verbatim to /assets/poi/. */
  src: string
  /** The DS marker's own fill color (read off the same SVG), used for the
   *  list row's chip background — not re-picked. */
  color: string
}

export const POI_CATEGORY_META: Record<PoiCategory, PoiCategoryMeta> = {
  depot: { label: 'Depot', src: '/assets/poi/port.svg', color: '#1EACFF' },
  fuel: { label: 'Fuel Station', src: '/assets/poi/fuel-station.svg', color: '#FF9503' },
  service: { label: 'Service Center', src: '/assets/poi/office.svg', color: '#40646C' },
  'rest-stop': { label: 'Rest Stop', src: '/assets/poi/motel.svg', color: '#941715' },
  civic: { label: 'Civic / Corniche', src: '/assets/poi/government.svg', color: 'coral' },
}

/** The list row's leading chip — the SAME marker image the map pin uses,
 *  scaled up and clipped to a circle so only its squircle glyph head shows
 *  (no hand-drawn glyph, no re-picked color — literally the DS asset,
 *  cropped, per the "markers center icons are adapted in the list" spec). */
export function PoiChip({ category }: { category: PoiCategory }) {
  const meta = POI_CATEGORY_META[category]
  return (
    <span
      aria-hidden="true"
      className="relative block size-7 shrink-0 overflow-hidden rounded-full ring-1 ring-black/5"
      style={{ backgroundColor: meta.color }}
    >
      <img
        src={meta.src}
        alt=""
        className="absolute size-[120%] max-w-none object-cover"
        style={{ left: '-10%', top: '-14%' }}
      />
    </span>
  )
}

/* ── Plans tab card ───────────────────────────────────────────────────────
 * Anatomy copied from `plan-monitoring-detail.tsx`'s `ServiceLocationCard`
 * (rounded-xl card, header row = title + status pill, wrapped info cells,
 * progress bar) — see provenance note in gisTabsData.ts.
 */
const PLAN_STATUS_TONE: Record<PlanCardRow['status'], string> = {
  Scheduled: 'var(--status-warning)',
  Executing: 'var(--status-info)',
  Completed: 'var(--status-success)',
}

function PlanStatusPill({ status }: { status: PlanCardRow['status'] }) {
  return (
    <span
      className="inline-flex items-center rounded-md px-2.5 py-1 text-[11px] font-bold uppercase tracking-wide text-white"
      style={{ background: PLAN_STATUS_TONE[status] }}
    >
      {status}
    </span>
  )
}

export function PlanCard({ row, selected, onClick }: { row: PlanCardRow; selected: boolean; onClick: () => void }) {
  const pct = row.progressTotal ? Math.round((row.progressDone / row.progressTotal) * 100) : 0
  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onClick}
      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onClick() } }}
      className={cn(
        'flex cursor-pointer flex-col gap-3 rounded-xl border bg-card p-4 outline-none transition-all',
        selected ? 'border-[color:var(--gray-400)] shadow-[0_4px_12px_rgba(0,0,0,0.10)]' : 'border-border hover:border-primary/40',
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <span className="text-sm font-semibold leading-snug text-foreground">{row.title}</span>
        <PlanStatusPill status={row.status} />
      </div>
      <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs text-muted-foreground">
        <span className="inline-flex items-center gap-1.5"><Truck className="size-3.5" />{row.tanker}</span>
        <span className="inline-flex items-center gap-1.5"><User className="size-3.5" />{row.driver}</span>
        <span className="inline-flex items-center gap-1.5"><Clock className="size-3.5" />{row.shift} · {row.windowStart}–{row.windowEnd}</span>
        <span className="inline-flex items-center gap-1.5"><MapPin className="size-3.5" />{row.zone}</span>
      </div>
      <div>
        <div className="mb-1 flex items-center justify-between text-[11px]">
          <span className="text-muted-foreground">Progress</span>
          <span className="font-medium text-foreground">{row.progressDone}/{row.progressTotal}</span>
        </div>
        <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
          <div
            className={cn('h-full rounded-full', pct >= 100 ? 'bg-success' : 'bg-info')}
            style={{ width: `${pct}%` }}
          />
        </div>
      </div>
    </div>
  )
}

/* ── Complaints tab card ──────────────────────────────────────────────────
 * No named copy-source (per spec) — modeled on the panel's existing card
 * language (rounded-md border, header + status pill, footer meta row), the
 * same visual family as `CurrentShiftIssuesSheet.tsx`'s `IssueCard`.
 */
const SEVERITY_TONE: Record<ComplaintSeverity, string> = {
  Critical: 'var(--status-error)',
  High: 'var(--status-warning)',
  Medium: 'var(--status-info)',
}

function initials(name: string) {
  return name.split(' ').map((w) => w[0]).slice(0, 2).join('').toUpperCase()
}

const AVATAR_PALETTE = ['#0E7490', '#7C3AED', '#0F766E', '#BE185D', '#1570EF', '#B45309']
function avatarColor(name: string) {
  let hash = 0
  for (let i = 0; i < name.length; i++) hash = (hash * 31 + name.charCodeAt(i)) | 0
  return AVATAR_PALETTE[Math.abs(hash) % AVATAR_PALETTE.length]
}

export function ComplaintCard({ row, selected, onClick }: { row: ComplaintRow; selected: boolean; onClick: () => void }) {
  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onClick}
      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onClick() } }}
      className={cn(
        'flex cursor-pointer flex-col gap-3 rounded-md border bg-card p-4 outline-none transition-all',
        selected ? 'border-[color:var(--gray-400)] shadow-[0_4px_12px_rgba(0,0,0,0.10)]' : 'border-border hover:border-primary/40',
      )}
    >
      <div className="flex items-center justify-between gap-2">
        <div className="flex min-w-0 items-center gap-2.5">
          <span
            className="grid size-8 shrink-0 place-items-center rounded-full text-xs font-semibold text-white"
            style={{ background: avatarColor(row.driver) }}
          >
            {initials(row.driver)}
          </span>
          <div className="flex min-w-0 flex-col">
            <span className="truncate text-sm font-semibold text-foreground">{row.driver}</span>
            <span className="truncate text-[11px] text-muted-foreground">{row.tanker} · {row.id}</span>
          </div>
        </div>
        <span
          className="shrink-0 inline-flex items-center gap-1 rounded-[4px] border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide"
          style={{ borderColor: SEVERITY_TONE[row.severity], color: SEVERITY_TONE[row.severity] }}
        >
          <AlertTriangle className="size-3" />
          {row.severity}
        </span>
      </div>

      <p className="text-xs leading-relaxed text-foreground">{row.text}</p>

      <div className="flex items-center justify-between border-t border-border pt-2.5 text-[11px] text-muted-foreground">
        <span className="inline-flex items-center gap-1.5"><MapPin className="size-3.5" />{row.zone}</span>
        <span className="inline-flex items-center gap-1.5"><Clock className="size-3.5" />{row.time}</span>
        <span
          className="rounded-[4px] px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide"
          style={{
            background: row.status === 'Resolved' ? 'color-mix(in srgb, var(--status-success) 14%, transparent)' : row.status === 'Acknowledged' ? 'color-mix(in srgb, var(--status-info) 14%, transparent)' : 'color-mix(in srgb, var(--status-warning) 14%, transparent)',
            color: row.status === 'Resolved' ? 'var(--status-success)' : row.status === 'Acknowledged' ? 'var(--status-info)' : 'var(--status-warning)',
          }}
        >
          {row.status}
        </span>
      </div>
    </div>
  )
}

/* ── Inspectors / Vehicles list rows — REMOVED (2026-09-01) ───────────────
 * These tabs now render Live Monitoring's ACTUAL list TABLES
 * (`gisTabTables.tsx`) rather than the card rows that used to live here, per
 * the user directive "i told you to use actual list/table with columns". The
 * cells they carried (workforce avatar art, the 3D tanker + status coin,
 * `FillLevelCell`, the Activity Overview triplet) moved into that module,
 * copied afresh from LM's own source. `PoiListRow`/`PoiListRowCell` went with
 * the floating POI card the LM-parity right drawer replaced; `PoiChip` above
 * stays — the drawer's NAME cell still leads with it.
 */
