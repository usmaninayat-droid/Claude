import { cn } from '@fams/design-system'
import { Check, Crosshair, MapPin, Clock, Truck } from 'lucide-react'
import type { ComplaintRow, ComplaintSeverity, ComplaintStatus } from './gisTabsData'

/* ── Incidents drawer rows — Requests & Complaints, ACTIONABLE ─────────────
 * PROVENANCE (2026-09-01): the "!" tool's right panel is the SAME drawer
 * shell Zones/POI use (`MapToolDrawer.tsx`, itself a verbatim port of
 * `ZonesDrawer.tsx`'s `MapToolDrawer`), matching Live Monitoring's own
 * `IncidentsDrawer.tsx` — which likewise reuses that shell but swaps the
 * checkbox table for a scrollable list of cards (`RecordMapCard`: stage
 * chip, reported-by / location / footer meta, leading eye toggle) rather
 * than a table of checkboxes.
 *
 * Chip colours are SOLID (not the tinted wash the Complaints TAB card uses):
 * `#F79009` (warning-500) is the Intake/Open anchor, `#F04438` error,
 * `#1570EF` info, `#12B76A` success — the same status triad the drawer's
 * zone dots and the map's incident pins are tinted from.
 *
 * ACTIONS (Product Design Lead call, rationale in
 * `Build Delegate/LOG.md` § 2026-09-01 Live GIS map tool panels): the two
 * highest-value moves a dispatcher can make on a driver-reported complaint
 * without leaving the map are
 *   1. ADVANCE THE STAGE — Acknowledge an Open complaint (take ownership,
 *      the single most valuable first move: it is what stops two dispatchers
 *      working the same report), then Resolve an Acknowledged one. One
 *      button whose label/behaviour follows the row's own stage; disabled
 *      once Resolved, so the control never lies about what it will do.
 *   2. LOCATE — fly the map to the complaint's coordinates and select its
 *      pin. Everything else a dispatcher would do (reassign a tanker, open
 *      the full record) needs context this panel does not carry; locating
 *      is the map-native action the surface exists for.
 */

const SEVERITY_SOLID: Record<ComplaintSeverity, string> = {
  Critical: '#F04438',
  High: '#F79009',
  Medium: '#1570EF',
}

/** Intake/Open anchors on warning-500 `#F79009`. */
const STATUS_SOLID: Record<ComplaintStatus, string> = {
  Open: '#F79009',
  Acknowledged: '#1570EF',
  Resolved: '#12B76A',
}

function SolidChip({ label, color }: { label: string; color: string }) {
  return (
    <span
      className="inline-flex shrink-0 items-center rounded-[4px] px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-white"
      style={{ background: color }}
    >
      {label}
    </span>
  )
}

/** The stage this row's primary action advances TO, or null when terminal. */
export function nextComplaintStage(status: ComplaintStatus): ComplaintStatus | null {
  if (status === 'Open') return 'Acknowledged'
  if (status === 'Acknowledged') return 'Resolved'
  return null
}

const ADVANCE_LABEL: Record<ComplaintStatus, string> = {
  Open: 'Acknowledge',
  Acknowledged: 'Resolve',
  Resolved: 'Resolved',
}

export function IncidentDrawerCard({
  row, selected, onSelect, onAdvance, onLocate,
}: {
  row: ComplaintRow
  selected: boolean
  onSelect: () => void
  onAdvance: () => void
  onLocate: () => void
}) {
  const next = nextComplaintStage(row.status)
  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onSelect}
      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onSelect() } }}
      className={cn(
        'flex cursor-pointer flex-col gap-2 rounded-md border bg-card p-3 outline-none transition-colors',
        selected ? 'border-primary bg-primary/5' : 'border-border hover:bg-muted/40',
      )}
    >
      <div className="flex items-center justify-between gap-2">
        <span className="truncate text-xs font-semibold text-foreground">{row.id}</span>
        <span className="flex shrink-0 items-center gap-1.5">
          <SolidChip label={row.severity} color={SEVERITY_SOLID[row.severity]} />
          <SolidChip label={row.status} color={STATUS_SOLID[row.status]} />
        </span>
      </div>

      <p className="line-clamp-2 text-xs leading-relaxed text-foreground">{row.text}</p>

      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-muted-foreground">
        <span className="inline-flex items-center gap-1"><Truck className="size-3" />{row.tanker}</span>
        <span className="inline-flex items-center gap-1"><MapPin className="size-3" />{row.zone}</span>
        <span className="inline-flex items-center gap-1"><Clock className="size-3" />{row.time}</span>
      </div>

      {/* The two dispatcher actions — see the ACTIONS note above. */}
      <div className="flex items-center gap-2 border-t border-border pt-2">
        <button
          type="button"
          disabled={next === null}
          aria-label={next === null ? `${row.id} is resolved` : `${ADVANCE_LABEL[row.status]} ${row.id}`}
          onClick={(e) => { e.stopPropagation(); onAdvance() }}
          className={cn(
            'inline-flex h-7 flex-1 items-center justify-center gap-1.5 rounded-md px-2 text-[11px] font-semibold outline-none transition-colors focus-visible:ring-2 focus-visible:ring-ring',
            next === null
              ? 'cursor-not-allowed border border-border bg-muted text-muted-foreground'
              : 'bg-primary text-primary-foreground hover:bg-primary/90',
          )}
        >
          <Check className="size-3.5" />
          {ADVANCE_LABEL[row.status]}
        </button>
        <button
          type="button"
          aria-label={`Locate ${row.id} on the map`}
          onClick={(e) => { e.stopPropagation(); onLocate() }}
          className="inline-flex h-7 flex-1 items-center justify-center gap-1.5 rounded-md border border-primary px-2 text-[11px] font-semibold text-primary outline-none transition-colors hover:bg-primary/5 focus-visible:ring-2 focus-visible:ring-ring"
        >
          <Crosshair className="size-3.5" />
          Locate
        </button>
      </div>
    </div>
  )
}
