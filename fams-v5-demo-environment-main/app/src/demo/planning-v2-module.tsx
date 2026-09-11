import { useEffect, useState } from 'react'
import { createLazyRoute } from '@tanstack/react-router'
import type { ModuleRouteLoader } from '@fams/skeleton-kit'
import { CalendarDays, List as ListIcon, Rows3 } from '@fams/ui-kit/icons'
import {
  ModuleViewShell,
  ViewTypePicker,
  type ModuleViewMenuItem,
  type ModuleViewTab as ShellView,
} from '@fams/v5-templates'

/**
 * Smart Planning + Plan Monitoring v2 — the module BODY (`InteractivePlanning`
 * / `SmartPlanningCalendar` / `PlanMonitoring`, taken as-is from
 * /Users/apple/Desktop/fms-main 2/src/ds/components/planning/) is isolated
 * behind an iframe: the copied source pins React 18.3.1 and this host runs
 * React 19, so it runs as its own Vite dev server (port :6370, see
 * tenants/uccp/overrides/screens/planning-v2/vite.config.ts) — own DOM/React
 * root/CSS cascade/hash router, zero source changes to the copied
 * components (same isolation route as operations-center-module.tsx).
 *
 * CHROME ARCHITECTURE (2026-08-31, supersedes commit e7bcf8e — rejected: that
 * attempt skinned an imitation tab strip INSIDE the iframe, which never
 * picked up the tenant's maroon active state and didn't match how Live
 * Monitoring / Requests & Complaints actually present their module chrome).
 * The view tabs now live OUTSIDE the iframe, in the UCCP shell itself, using
 * `ModuleViewShell` from `@fams/v5-templates` — the SAME saved-view shell
 * component every blueprint module renders (via `ModuleView` →
 * `ModuleViewShell`, see v5-module-renderers.tsx). Rendered inside the app's
 * `V5AppShell`, `ModuleViewShell` detects the host (`useTopNavSlots()`) and
 * portals its tab strip into the ONE real `TopNav` the shell already owns —
 * so the maroon active-tab underline comes for free from the qatar-mme
 * tenant theme (`--primary`), exactly like every other module, with no
 * scoped CSS override needed.
 *
 * Smart Planning and Plan Monitoring have no saved-view persistence (no
 * `EntityConfig`/records — the body is an opaque embedded app), so the view
 * list is defined statically here instead of coming from a blueprint's
 * `module.views`. Tab selection drives the embedded app's screen via a
 * `view` query param the vendored app reads on load (see planning-v2's
 * `src/App.tsx` `embedViewParam()`) — switching tabs reloads the iframe
 * `src` with the new param, the smallest patch that keeps the vendored
 * source verbatim otherwise.
 *
 * `onCreateView` is wired to the strip's standard "+" affordance so the
 * control exists and behaves the same as every other module's tab strip
 * (`ModuleViewTabs`' `onAddView`) — it opens the SAME "Select Preferred
 * View" takeover (`ViewTypePicker`) every blueprint module's "+" opens
 * (`ModuleView`'s `handleCreateView`/`pickerBody`), rendered here directly
 * since there is no blueprint/`useSavedViewTabs` machinery behind these two
 * modules to hand it to. Its option cards derive from the same static view
 * list (`viewTypeOptionsFromKinds`), and both action buttons render
 * permanently disabled (`creating` pinned `true`) — "Create Only"/"Create &
 * Customize" both require appending a new saved view to a blueprint's
 * `module.views`, which these two modules don't have. That is the "opens
 * the standard UI in its standard disabled/empty state rather than doing
 * nothing" directive: the picker still opens, still shows the real
 * previews, just can't complete a create.
 *
 * 2026-08-31 rich-descriptor pass (round 3 corrective): the tab objects now
 * carry the SAME shape `ModuleView` builds for a blueprint module's
 * `shellTabs` (`views/ModuleView.tsx`) — a leading `icon` per `VIEW_TAB_ICON`
 * (Hybrid → `Rows3`, matching Live Monitoring's hybrid tab; Calendar →
 * `CalendarDays`; List → `ListIcon`) and a `viewMenuItems` array for the
 * active tab's "⋮" menu, which is what makes `ModuleViewShell` render the
 * active tab in its bordered-card treatment at all (`hasViewMenu` gates
 * that — see `ModuleViewShell.tsx`). The row SET mirrors how a non-live
 * blueprint module (e.g. Requests & Complaints) degrades: `Copy Link to
 * View` is real (it only copies `window.location.href`, no persistence
 * needed); `Rename` and `Delete View` are present but disabled, same as
 * `ModuleView`'s own system-view treatment, because both genuinely need a
 * saved-view store neither module has.
 *
 * Production note: this iframe's `src` should point at wherever this
 * screen's own `vite build` output is served from (a static bundle alongside
 * the host, at `/screens/planning-v2/index.html`) — not hardcoded to the dev
 * server, which is a dev-time convenience only (same caveat as
 * operations-center-module.tsx).
 */
function planningIframeSrc(hash: '#/smart-planning' | '#/plan-monitoring', view?: string, record?: string): string {
  let query = view ? `embed=1&view=${view}` : 'embed=1'
  // Deep link into the Plan Monitoring full-screen single-plan detail (see
  // `usePlanMonitoringBridge`'s doc comment).
  if (record) query += `&record=${encodeURIComponent(record)}`
  return import.meta.env.DEV
    ? `http://localhost:6370/?${query}${hash}`
    : `/screens/planning-v2/index.html?${query}${hash}`
}

// Same `ModuleView`/`VIEW_TAB_ICON` leading glyph per kind (`views/ModuleView.tsx`):
// hybrid → Rows3 (Live Monitoring's own hybrid tab), list-shaped → ListIcon,
// and `calendar` (not a seeded kind either module's static list otherwise
// uses, but the registry's real icon for it) for the Calendar View tab.
const SMART_PLANNING_VIEWS: ShellView[] = [
  { id: 'hybrid', label: 'Hybrid View', type: 'hybrid', icon: Rows3 },
  { id: 'calendar', label: 'Calendar View', type: 'list', icon: CalendarDays },
  // 2026-08-31 scope addition: List View, built inside the vendored app by
  // reusing Plan Monitoring's own `PlanMonitoring` table component (see
  // `App.tsx`'s `SmartPlanningScreen` — `SP_LIST_ROWS`) — same table
  // anatomy/columns as PM's List View, adapted to plan (not run) data.
  { id: 'list', label: 'List View', type: 'list', icon: ListIcon },
]

const PLAN_MONITORING_VIEWS: ShellView[] = [
  { id: 'list', label: 'List View', type: 'list', icon: ListIcon },
  // 2026-08-31 scope addition: Hybrid View, built by reusing Smart
  // Planning's own `InteractivePlanning` list+map component (see
  // `App.tsx`'s `PlanMonitoringScreen` — `PM_HYBRID_ROWS`) — same
  // list↔map/eye-toggle interplay as SP's Hybrid View, adapted to run
  // (not plan) data; its own "Create New Plan" affordance is suppressed
  // (`showCreateButton={false}`) since Plan Monitoring only monitors runs.
  { id: 'hybrid', label: 'Hybrid View', type: 'hybrid', icon: Rows3 },
]

/**
 * The active tab's "⋮" menu — the standard subset a non-live blueprint
 * module (Requests & Complaints) gets: `Copy Link to View` works with no
 * persistence (it copies the current URL); `Rename` and `Delete View` are
 * kept in the row set (never silently dropped — same "disabled row states
 * why" contract as `ModuleView`'s own `drawerReason` rows) but disabled,
 * because both need a saved-view store this static tab list doesn't have.
 */
function staticViewMenuItems(copiedLink: boolean, onCopyLink: () => void): ModuleViewMenuItem[] {
  return [
    {
      id: 'rename',
      label: 'Rename',
      disabled: true,
      disabledReason: 'This view is provided by the module and cannot be renamed',
      onSelect: () => {},
    },
    {
      id: 'copy-link',
      label: copiedLink ? 'Copied!' : 'Copy Link to View',
      closeOnSelect: false,
      onSelect: onCopyLink,
    },
    { kind: 'separator', id: 'sep-1' },
    {
      id: 'delete-view',
      label: 'Delete View',
      disabled: true,
      disabledReason: 'This view is provided by the module and cannot be deleted',
      onSelect: () => {},
    },
  ]
}

/** Shared "+" takeover — every module's `+` opens this same picker (`ModuleView.pickerBody`). */
function useStaticViewPicker(views: ShellView[]) {
  const [pickerOpen, setPickerOpen] = useState(false)
  const [copiedLink, setCopiedLink] = useState(false)
  const onCopyLink = () => {
    if (typeof navigator !== 'undefined') void navigator.clipboard?.writeText(window.location.href)
    setCopiedLink(true)
    setTimeout(() => setCopiedLink(false), 2000)
  }
  // Built directly from THIS module's own tabs (not deduped-by-kind via
  // `viewTypeOptionsFromKinds`) so a "Calendar View" tab keeps its own label
  // and preview instead of collapsing onto the generic list-kind entry.
  const pickerOptions = views.map((v) => ({
    id: v.id,
    label: String(v.label),
    previewKey: v.type,
  }))
  const pickerBody = (
    <ViewTypePicker
      options={pickerOptions}
      hint="This module's views are provided by the platform and cannot be customized yet."
      // Both "Create Only" and "Create & Customize" render permanently
      // disabled — creating a view needs a saved-view store neither module
      // has (see the file-level doc comment).
      creating
      onCreate={() => {}}
      onCancel={() => setPickerOpen(false)}
    />
  )
  return {
    pickerOpen,
    openPicker: () => setPickerOpen(true),
    closePicker: () => setPickerOpen(false),
    pickerBody,
    viewMenuItems: staticViewMenuItems(copiedLink, onCopyLink),
  }
}

function SmartPlanningV2Page() {
  const [activeViewId, setActiveViewId] = useState('hybrid')
  const { pickerOpen, openPicker, closePicker, pickerBody, viewMenuItems } =
    useStaticViewPicker(SMART_PLANNING_VIEWS)
  return (
    <ModuleViewShell
      views={SMART_PLANNING_VIEWS}
      activeViewId={activeViewId}
      onViewChange={(id) => {
        closePicker()
        setActiveViewId(id)
      }}
      onActiveViewClick={pickerOpen ? closePicker : undefined}
      onCreateView={openPicker}
      viewMenuItems={viewMenuItems}
      bodyInset="flush"
      renderView={(view) =>
        pickerOpen ? (
          pickerBody
        ) : (
          <iframe
            title="Smart Planning"
            src={planningIframeSrc('#/smart-planning', view.id)}
            style={{ border: 'none', width: '100%', height: '100%', display: 'block' }}
          />
        )
      }
      className="h-full"
    />
  )
}

/*
 * Plan Monitoring embed bridge (2026-08-31 coordinator flag — "the detail
 * view must be driven by the daily-plan ENTITY MODULE's records"): this page
 * fetches the live `plan-monitoring/daily-plan` records from the same MSW
 * `/api/entity/*` plane every blueprint module reads (seeded FPL rows PLUS
 * the tasks Requests & Complaints creates at tanker assignment — an
 * in-memory store, so records created this session are included) and posts
 * them into the embed (`uccp:pm-records`, also replying to its
 * `uccp:pm-ready` handshake). A `?record=FPL-…` search param on
 * /plan-monitoring (deep link — e.g. a ticket's "Linked Schedule/Plan"
 * LinkView, redirected in boot.ts) is passed through to the embed, which
 * opens the full-screen single-plan detail directly. The embed's detail
 * posts `uccp:navigate` back up for its "Source Request" chip; handled here
 * with a history push (SPA — a hard reload would drop session-created
 * records).
 */
type PmEntityRecordMsg = Record<string, unknown>

function usePlanMonitoringBridge(iframeEl: HTMLIFrameElement | null) {
  const [records, setRecords] = useState<PmEntityRecordMsg[] | null>(null)
  const post = (win: Window | null | undefined, recs: PmEntityRecordMsg[] | null) => {
    if (win && recs) win.postMessage({ type: 'uccp:pm-records', records: recs }, '*')
  }
  useEffect(() => {
    let cancelled = false
    void fetch('/api/entity/entity_list_by_code', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code: 'plan-monitoring/daily-plan' }),
    })
      .then((r) => (r.ok ? r.json() : null))
      .then((res: { data?: PmEntityRecordMsg[] } | null) => {
        if (!cancelled && res && Array.isArray(res.data)) setRecords(res.data)
      })
      .catch(() => {})
    return () => { cancelled = true }
  }, [])
  useEffect(() => {
    const onMsg = (e: MessageEvent) => {
      const d = e.data as { type?: string; module?: string; record?: string } | null
      if (!d) return
      if (d.type === 'uccp:pm-ready') post(iframeEl?.contentWindow, records)
      if (d.type === 'uccp:navigate' && d.module === 'incidents' && typeof d.record === 'string') {
        const params = new URLSearchParams(window.location.search)
        params.set('record', d.record)
        // Root-absolute, so it must carry the deploy base (`/` on Vercel,
        // `/MME-FRMS-MVP/` on GitHub Pages project pages). BASE_URL always
        // ends in a slash, so no separator is added here.
        window.history.pushState({}, '', `${import.meta.env.BASE_URL}incidents?${params.toString()}`)
        window.dispatchEvent(new PopStateEvent('popstate'))
      }
    }
    window.addEventListener('message', onMsg)
    // Covers the fetch-lands-after-iframe-boot order too.
    post(iframeEl?.contentWindow, records)
    return () => window.removeEventListener('message', onMsg)
  }, [iframeEl, records])
}

function PlanMonitoringV2Page() {
  const [activeViewId, setActiveViewId] = useState('list')
  const [iframeEl, setIframeEl] = useState<HTMLIFrameElement | null>(null)
  usePlanMonitoringBridge(iframeEl)
  // Deep-link param (see the bridge doc comment) — read once at mount.
  const [recordParam] = useState(() =>
    typeof window === 'undefined' ? null : new URLSearchParams(window.location.search).get('record'))
  const { pickerOpen, openPicker, closePicker, pickerBody, viewMenuItems } =
    useStaticViewPicker(PLAN_MONITORING_VIEWS)
  return (
    <ModuleViewShell
      views={PLAN_MONITORING_VIEWS}
      activeViewId={activeViewId}
      onViewChange={(id) => {
        closePicker()
        setActiveViewId(id)
      }}
      onActiveViewClick={pickerOpen ? closePicker : undefined}
      onCreateView={openPicker}
      viewMenuItems={viewMenuItems}
      bodyInset="flush"
      renderView={(view) =>
        pickerOpen ? (
          pickerBody
        ) : (
          <iframe
            ref={setIframeEl}
            title="Plan Monitoring"
            src={planningIframeSrc('#/plan-monitoring', view.id, recordParam ?? undefined)}
            style={{ border: 'none', width: '100%', height: '100%', display: 'block' }}
          />
        )
      }
      className="h-full"
    />
  )
}

export function makeSmartPlanningV2Route(path: string): ModuleRouteLoader {
  return () => Promise.resolve(createLazyRoute(path)({ component: SmartPlanningV2Page }))
}

export function makePlanMonitoringV2Route(path: string): ModuleRouteLoader {
  return () => Promise.resolve(createLazyRoute(path)({ component: PlanMonitoringV2Page }))
}
