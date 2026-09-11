import { useEffect, useState } from 'react'
import {
  Calendar, Sunrise, Route as RouteIcon, Shapes, MapPin, ChevronDown,
  Megaphone, FileDown, Truck, Users, AlertTriangle, Check, Sparkles,
} from 'lucide-react'
import { KpiMetricCard } from '../../components/KpiMetricCard'
import { StatusBreakdownCard } from '../../components/StatusBreakdownCard'
import { LiveGisMap } from './LiveGisMap'
import { RainfallTrendCard } from './RainfallTrendCard'
import { IncidentsByZoneCard } from './IncidentsByZoneCard'
import { ResponseSlaCard } from './ResponseSlaCard'
import { IntakeVsClosureCard } from './IntakeVsClosureCard'
import { ClearanceProgressCard } from './ClearanceProgressCard'
import { StationReportingCard } from './StationReportingCard'
import { BinRepairCard } from './BinRepairCard'
import { KpiDetailSheet } from './KpiDetailSheet'
import { CurrentShiftIssuesSheet } from './CurrentShiftIssuesSheet'
import { NearbyRoutesSheet } from './NearbyRoutesSheet'
import { ReplaceVehicleSheet } from './ReplaceVehicleSheet'
import { ReportBreakdownSheet, type BreakdownVehicle, type BreakdownReport } from './ReportBreakdownSheet'
import { ManualBinReassignment } from '../mbr/ManualBinReassignment'
import { cn } from '@fams/design-system'
import { kpiGroups, type KpiGroup } from './kpis'
import { fleet, workforce } from './statusBreakdowns'
import { shiftIssues, type ShiftIssue } from './currentShiftIssues'
import { routes as initialRoutes } from './routes'
import { CustomScrollbar } from '../../components/CustomScrollbar'

// The "Action Required" KPI opens the full-page current-shift-issues sheet;
// every other KPI opens the generic raw-data sheet.
const ACTION_REQUIRED = new Set(['Action Required', 'Current Shift Issues'])

// The KPI strip is one 6-column grid of GROUPS, not 12 loose cards: each
// group spans exactly as many columns as it has cards and uses the same
// gap, so every card keeps its original width and the column rhythm is
// unbroken while the clustering becomes legible. Tailwind needs the class
// names whole, hence the lookup maps.
const GROUP_SPAN: Record<KpiGroup['cols'], string> = {
  6: 'lg:col-span-6',
  3: 'lg:col-span-3',
  2: 'sm:col-span-2 lg:col-span-2',
  1: 'sm:col-span-1 lg:col-span-1',
}
const GROUP_COLS: Record<KpiGroup['cols'], string> = {
  6: 'lg:grid-cols-6',
  3: 'lg:grid-cols-3',
  2: 'grid-cols-2 sm:grid-cols-2 lg:grid-cols-2',
  1: 'grid-cols-1 sm:grid-cols-1 lg:grid-cols-1',
}

const SAVED_TOAST = { title: 'Changes Saved!', desc: 'Your updates were successfully applied.' }

/** Turn a reported breakdown into a `ShiftIssue` for the Replace Vehicle & Driver
 *  sheet: the reported truck becomes the struck-through failed assignment, reusing
 *  the standby vehicle/driver + map geometry from the breakdown template. */
function issueFromBreakdown(v: BreakdownVehicle): ShiftIssue {
  const base = shiftIssues[1]
  return {
    ...base,
    id: v.plate,
    route: v.route,
    plan: v.plan,
    reason: 'Vehicle Breakdown',
    current: {
      ...base.current,
      vehicle: {
        plate: v.plate,
        model: v.model,
        badge: { label: 'Broken Down', tone: 'warning' },
        struck: true,
      },
      driver: { code: base.current.driver?.code ?? 'D-0000', name: v.driver, struck: true },
    },
  }
}

// "Quick actions" glyph — a bolt with speed lines (matches the Figma top-bar icon).
function QuickActionIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
      <path d="M14.5 2.5 7 13h5l-1.5 8.5L18 11h-5l1.5-8.5Z" />
      <path d="M4 8.5h3.5M2.5 12.5h4M4.5 16.5h2.5" />
    </svg>
  )
}

const actionBtn = 'flex size-9 items-center justify-center rounded-[4px] border outline-none transition-colors'

const filters = [
  { icon: Calendar, label: 'Today' },
  { icon: Sunrise, label: 'Morning' },
  { icon: RouteIcon, label: 'Select Route Type', placeholder: true },
  { icon: Shapes, label: 'Select Zone', placeholder: true },
  { icon: MapPin, label: 'Select Response Base', placeholder: true },
]

export function DashboardPage() {
  const [selected, setSelected] = useState<{ label: string; value: string } | null>(null)
  const [issuesOpen, setIssuesOpen] = useState(false)
  const [nearbyIssue, setNearbyIssue] = useState<ShiftIssue | null>(null)
  const [replaceIssue, setReplaceIssue] = useState<ShiftIssue | null>(null)
  const [breakdown, setBreakdown] = useState<BreakdownReport | null>(null)
  // Live route list — a breakdown report (without replacement) flips the reported
  // route's status to "Action Required" so the Live GIS Map reflects it.
  const [routeList, setRouteList] = useState(initialRoutes)
  // Set when a breakdown report requests a replacement: shows the "finding
  // replacements" overlay, then opens the ReplaceVehicleSheet with this issue.
  const [findingReplace, setFindingReplace] = useState<ShiftIssue | null>(null)
  const [mbrOpen, setMbrOpen] = useState(false)
  const [toast, setToast] = useState<{ title: string; desc: string } | null>(null)

  // Auto-dismiss the success toast.
  useEffect(() => {
    if (!toast) return
    const t = setTimeout(() => setToast(null), 4000)
    return () => clearTimeout(t)
  }, [toast])

  // "Finding best replacements" loading step — after ~2s, open the Replace
  // Vehicle & Driver sheet with the matched standby.
  useEffect(() => {
    if (!findingReplace) return
    const t = setTimeout(() => {
      setReplaceIssue(findingReplace)
      setFindingReplace(null)
    }, 2200)
    return () => clearTimeout(t)
  }, [findingReplace])

  return (
    <CustomScrollbar className="min-h-0 flex-1">
      {/* Next-shift alert banner */}
      <div className="px-6 pt-4">
        <div className="flex items-center justify-between gap-3 rounded-md border border-[color:var(--status-error)]/20 bg-[color:var(--status-error)]/[0.06] px-3.5 py-2.5">
          <div className="flex items-center gap-2.5 text-sm text-foreground">
            <span className="flex size-6 shrink-0 items-center justify-center rounded-md bg-[color:var(--status-error)]/12 text-[color:var(--status-error)]">
              <AlertTriangle className="size-4" />
            </span>
            <span>
              <b className="font-semibold">3 routes</b> scheduled for next shift needs your attention to
              ensure smooth operations.
            </span>
          </div>
          <span className="shrink-0 text-xs font-medium text-muted-foreground">2h30m left</span>
        </div>
      </div>

      {/* Filters row */}
      <div className="flex items-center gap-3 px-6 py-4">
        <div className="flex flex-wrap items-center gap-2">
          {filters.map((f) => (
            <button
              key={f.label}
              className="inline-flex h-9 items-center gap-2 rounded-md border border-border bg-card px-3 text-sm outline-none transition-colors hover:bg-muted"
            >
              <f.icon className="size-4 text-muted-foreground" />
              <span className={f.placeholder ? 'text-muted-foreground' : 'text-foreground'}>{f.label}</span>
              <ChevronDown className="size-4 text-muted-foreground" />
            </button>
          ))}
        </div>
        <div className="ml-auto flex items-center gap-2.5">
          <button className={`${actionBtn} border-border bg-card text-muted-foreground hover:bg-muted`} aria-label="Broadcast">
            <Megaphone className="size-5" />
          </button>
          <button className={`${actionBtn} border-border bg-card text-muted-foreground hover:bg-muted`} aria-label="Quick actions">
            <QuickActionIcon className="size-5" />
          </button>
          <button className={`${actionBtn} border-[color:var(--primary)] bg-transparent text-primary hover:bg-[color:var(--primary)]/10`} aria-label="Export">
            <FileDown className="size-5" />
          </button>
        </div>
      </div>

      {/* KPI row */}
      <div className="px-6" data-slot="kpi-strip">
        <div className="grid grid-cols-2 gap-x-4 gap-y-5 sm:grid-cols-3 lg:grid-cols-6">
          {kpiGroups.map((group) => (
            <section
              key={group.id}
              data-slot="kpi-group"
              data-group={group.id}
              className={cn('col-span-full', GROUP_SPAN[group.cols])}
            >
              <h3 className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                {group.title}
              </h3>
              <div className={cn('grid grid-cols-2 gap-4 sm:grid-cols-3', GROUP_COLS[group.cols])}>
                {group.items.map(({ detailLabel, ...k }) => (
                  <KpiMetricCard
                    key={detailLabel}
                    {...k}
                    onClick={
                      ACTION_REQUIRED.has(detailLabel)
                        ? () => setIssuesOpen(true)
                        : () => setSelected({ label: detailLabel, value: k.value })
                    }
                  />
                ))}
              </div>
            </section>
          ))}
        </div>
      </div>

      {/* Fleet Availability + Workforce Readiness */}
      <div className="mt-4 grid grid-cols-1 gap-4 px-6 pb-6 lg:grid-cols-2">
        <StatusBreakdownCard
          title="Fleet Availability"
          icon={<Truck className="size-4" />}
          filterLabel="All Vehicles"
          hideFilter
          stats={fleet.stats}
          bars={fleet.bars}
        />
        <StatusBreakdownCard
          title="Workforce Readiness"
          icon={<Users className="size-4" />}
          filterLabel="All Workforce"
          hideFilter
          stats={workforce.stats}
          bars={workforce.bars}
        />
      </div>

      {/* Live GIS Map */}
      <LiveGisMap
        routes={routeList}
        onReportBreakdown={(r) => setBreakdown(r)}
        onSuggestReplacement={(r) => setReplaceIssue(issueFromBreakdown(r.vehicle))}
      />

      {/* Flood-response analytics — the section below the map, reworked
          2026-09-01. Ordered as the dispatcher's questions during an active
          rain event: what is the weather doing → where is it worst → am I
          responding fast enough → am I keeping up with the public → how far
          through the clearance work am I → what is broken. */}
      <div data-slot="analytics-section">
        {/* 1. What is the event doing, and where is it worst */}
        <div className="grid grid-cols-1 gap-4 px-6 pb-6 lg:grid-cols-2">
          <RainfallTrendCard />
          <IncidentsByZoneCard />
        </div>

        {/* 2. Am I responding fast enough, and keeping up with intake */}
        <div className="grid grid-cols-1 gap-4 px-6 pb-6 lg:grid-cols-2">
          <ResponseSlaCard />
          <IntakeVsClosureCard />
        </div>

        {/* 3. Clearance progress + sensing-network health */}
        <div className="grid grid-cols-1 gap-4 px-6 pb-6 lg:grid-cols-2">
          <ClearanceProgressCard />
          <StationReportingCard />
        </div>

        {/* 4. Tanker faults — the actionable work-order list */}
        <div className="px-6 pb-6">
          <BinRepairCard />
        </div>
      </div>

      {/* Raw-data side sheet (opens on KPI card click) */}
      <KpiDetailSheet kpi={selected} onOpenChange={(open) => !open && setSelected(null)} />

      {/* Current Shift Issues sheet (opens from the "Action Required" KPI card) */}
      <CurrentShiftIssuesSheet
        open={issuesOpen}
        onOpenChange={setIssuesOpen}
        onSuggestNearby={(issue) => { setIssuesOpen(false); setNearbyIssue(issue) }}
      />

      {/* Nearby Routes sheet (replaces the issues sheet from "Suggest Nearby Routes") */}
      <NearbyRoutesSheet
        issue={nearbyIssue}
        onOpenChange={(open) => !open && setNearbyIssue(null)}
        onAssignManually={() => { setNearbyIssue(null); setMbrOpen(true) }}
        onAssigned={() => { setNearbyIssue(null); setToast(SAVED_TOAST) }}
        onSuggestReplacement={() => { setReplaceIssue(nearbyIssue); setNearbyIssue(null) }}
      />

      {/* Replace Vehicle & Driver sheet — opens from Nearby Routes "Suggest
          Replacement", the breakdown report flow, and Current Shift Issues (Figma 2227:101360) */}
      <ReplaceVehicleSheet
        issue={replaceIssue}
        onOpenChange={(open) => !open && setReplaceIssue(null)}
        onSuggestNearby={(iss) => { setReplaceIssue(null); setNearbyIssue(iss) }}
      />

      {/* Report Vehicle Breakdown sheet — opens from the Live GIS Map telematics
          card's "Report Breakdown"; on submit, hands off to the replacement flow. */}
      <ReportBreakdownSheet
        report={breakdown}
        onOpenChange={(open) => !open && setBreakdown(null)}
        onReported={(rep, { dispatchReplacement }) => {
          setBreakdown(null)
          if (dispatchReplacement) {
            setFindingReplace(issueFromBreakdown(rep.vehicle))
          } else {
            // Simple report → flag the reported route as Action Required.
            setRouteList((prev) =>
              prev.map((r) => (r === rep.route ? { ...r, status: 'Action Required' as const, alert: true } : r)),
            )
            setToast({ title: 'Breakdown Reported', desc: `${rep.vehicle.model} has been flagged as broken down.` })
          }
        }}
      />

      {/* Manual Bin Reassignment (opens from the Nearby Routes "Assign Manually" button) */}
      <ManualBinReassignment
        open={mbrOpen}
        onClose={() => setMbrOpen(false)}
        onConfirm={() => setToast(SAVED_TOAST)}
      />

      {/* "Finding best replacements" loading overlay — shown between reporting a
          breakdown (with dispatch on) and opening the Replace Vehicle & Driver
          sheet. Mirrors the MBR / Nearby Routes optimize animation. */}
      {findingReplace ? (
        <div className="fixed inset-0 z-[940] flex items-center justify-center bg-[color:var(--muted-foreground)]/90">
          <div className="flex flex-col items-center gap-4 px-6 text-center">
            <div className="relative h-16 w-20">
              <Sparkles className="absolute left-0 top-1 size-5 text-[color:var(--status-warning)] mbr-twinkle" fill="currentColor" style={{ animationDelay: '0s' }} />
              <Sparkles className="absolute left-7 top-0 size-10 text-[color:var(--status-warning)] mbr-twinkle" fill="currentColor" style={{ animationDelay: '0.25s' }} />
              <Sparkles className="absolute left-3 top-10 size-6 text-[color:var(--status-warning)] mbr-twinkle" fill="currentColor" style={{ animationDelay: '0.5s' }} />
            </div>
            <div className="inline-flex items-center gap-1.5 rounded-full bg-white/15 px-3 py-1 text-sm font-semibold text-white">
              <Check className="size-4" />
              Breakdown Reported
            </div>
            <div className="text-lg font-semibold text-white">Finding replacements…</div>
            <div className="text-sm text-white/70">Matching the closest available standby vehicle &amp; driver to take over this route.</div>
          </div>
        </div>
      ) : null}

      {/* Success toast — shown after confirming bin assignments / reporting a
          breakdown (Figma 2533:106895) */}
      {toast ? (
        <div
          role="status"
          className="fixed right-6 top-6 z-[200] flex w-[360px] max-w-[calc(100vw-2rem)] items-center gap-3 rounded-md border border-border bg-card p-4 shadow-xl animate-in fade-in slide-in-from-top-2"
        >
          <span className="flex size-9 shrink-0 items-center justify-center rounded-md bg-[color:var(--status-success)]/12 text-[color:var(--status-success)]">
            <Check className="size-5" />
          </span>
          <div className="min-w-0">
            <div className="text-base font-bold text-foreground">{toast.title}</div>
            <div className="text-sm text-muted-foreground">{toast.desc}</div>
          </div>
        </div>
      ) : null}
    </CustomScrollbar>
  )
}
