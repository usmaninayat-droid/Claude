import { useState } from 'react'
import { createLazyRoute } from '@tanstack/react-router'
import type { ModuleRouteLoader } from '@fams/skeleton-kit'
import { Icon } from '@fams/ui-kit/icons'
import {
  ModuleViewShell,
  ViewTypePicker,
  type ModuleViewMenuItem,
  type ModuleViewTab as ShellView,
} from '@fams/v5-templates'
import type { DataAdapter, EntityConfig, EntityRecord } from '@fams/v5-composer'
import { TriageConsoleView } from './triage-console-view'

/**
 * Operations Center — TWO views behind the standard shell chrome (2026-08-31
 * task brief): the existing ported Dispatcher Cockpit (iframe, unchanged)
 * with a single "Triage Cockpit" view (the ported cockpit iframe).
 * architecture mirrors `planning-v2-module.tsx`/`inspector-shifts-module.tsx`
 * EXACTLY — per-tab icons, the active-tab card + "⋮" menu, the "+" standard
 * `ViewTypePicker` — the SAME `ModuleViewShell` every blueprint module
 * renders, so the maroon active-tab underline comes from the qatar-mme
 * tenant theme automatically.
 *
 * Phase A's file header (below) still documents WHY the Dispatcher Cockpit
 * view is an iframe (React-18-vendored bundle vs this host's React 19); the
 * Triage Console view needs no such isolation — it is native FAMS
 * composition, wired straight to the SAME `incidents/incident` `DataAdapter`
 * the Incidents module itself reads/writes (see `boot.ts`'s
 * `incidentsData`/`incidentsConfig`, threaded through `seams.tsx`'s
 * `makeImplementations` → here).
 *
 * ---- Phase A dispatcher-cockpit port doc (unchanged) ----
 * Exact-copy port of the dispatcher cockpit (Tadweer), byte-for-byte
 * unmodified, mounted as a tenant-native bespoke "override screen"
 * (`tenants/uccp/overrides/screens/operations-center/`), per
 * `plan/run-2026-08-31-dispatcher-cockpit/PLAN.md`'s decision. It is NOT a
 * blueprint-driven module — it is a builtin, same escape-valve pattern as
 * `settings-module.tsx` (see `demo/model.ts`'s `buildBootstrapModules`, which
 * grants it only to the `uccp` tenant).
 *
 * INTEGRATION ROUTE CHOSEN: isolated bundle + iframe, not a React-19
 * compatibility pass. The copied dispatcher app + its vendored
 * `@fams/design-system` pin React 18.3.1; this host app runs React 19 — two
 * major React versions cannot share one bundle/module tree. The copied app
 * runs its own Vite dev server (port :6360, see
 * `tenants/uccp/overrides/screens/operations-center/vite.config.ts`) and is
 * embedded here via a plain `<iframe>`, which gives full DOM isolation (own
 * React root, own CSS cascade, own hash router) with zero source changes to
 * the copied app. In production this iframe's `src` should point at wherever
 * that screen's own `vite build` output is served from (a static bundle
 * alongside the host, at `/screens/operations-center/index.html`) — not hardcoded
 * to the dev server, which is a Phase A dev-time convenience only.
 */
function dispatcherCockpitSrc(): string {
  return import.meta.env.DEV
    ? 'http://localhost:6360/?embed=1#/dashboard'
    : '/screens/operations-center/index.html?embed=1#/dashboard'
}

const OPERATIONS_CENTER_VIEWS: ShellView[] = [
  { id: 'dispatcher-cockpit', label: 'Dispatcher Cockpit', type: 'grid', icon: () => <Icon name="layout-grid-01" /> },
  { id: 'triage-console', label: 'Triage Console', type: 'list', icon: () => <Icon name="list" /> },
]

/** Identical "⋮" menu contract to `inspector-shifts-module.tsx`'s
 *  `staticViewMenuItems`: no saved-view store behind either of this module's
 *  views, so `Copy Link to View` is the only live affordance. */
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

function useStaticViewPicker(views: ShellView[]) {
  const [pickerOpen, setPickerOpen] = useState(false)
  const [copiedLink, setCopiedLink] = useState(false)
  const onCopyLink = () => {
    if (typeof navigator !== 'undefined') void navigator.clipboard?.writeText(window.location.href)
    setCopiedLink(true)
    setTimeout(() => setCopiedLink(false), 2000)
  }
  const pickerOptions = views.map((v) => ({ id: v.id, label: String(v.label), previewKey: v.type }))
  const pickerBody = (
    <ViewTypePicker
      options={pickerOptions}
      hint="This module's views are provided by the platform and cannot be customized yet."
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

export interface OperationsCenterDeps {
  /** The `incidents/incident` `DataAdapter` — same instance the Incidents
   *  module's own composer surface reads/writes (see `boot.ts`). Undefined
   *  only if the tenant somehow doesn't license Incidents; the Triage
   *  Console view degrades to an explicit "unavailable" state rather than
   *  a crash. */
  incidentsData?: DataAdapter
  incidentsConfig?: EntityConfig
  listVehicles?: () => EntityRecord[]
}

function OperationsCenterPage({ incidentsData, incidentsConfig, listVehicles }: OperationsCenterDeps) {
  const [activeViewId, setActiveViewId] = useState('dispatcher-cockpit')
  const { pickerOpen, openPicker, closePicker, pickerBody, viewMenuItems } =
    useStaticViewPicker(OPERATIONS_CENTER_VIEWS)

  return (
    <ModuleViewShell
      views={OPERATIONS_CENTER_VIEWS}
      activeViewId={activeViewId}
      onViewChange={(id) => {
        closePicker()
        setActiveViewId(id)
      }}
      onActiveViewClick={pickerOpen ? closePicker : undefined}
      onCreateView={openPicker}
      viewMenuItems={viewMenuItems}
      bodyInset="flush"
      renderView={() => {
        if (pickerOpen) return pickerBody
        if (activeViewId === 'triage-console') {
          // Native FAMS composition on the SAME `incidents/incident` adapter the
          // Incidents module reads/writes — no iframe isolation needed. Degrades
          // to an explicit unavailable state (never a crash) when the tenant
          // doesn't license Incidents, per this module's docblock.
          if (!incidentsConfig || !incidentsData) {
            return (
              <div className="flex h-full items-center justify-center p-section">
                <p className="text-body-sm text-muted-foreground">
                  Triage Console is unavailable — this tenant does not license the Incidents module.
                </p>
              </div>
            )
          }
          return (
            <TriageConsoleView
              config={incidentsConfig}
              data={incidentsData}
              listVehicles={listVehicles}
            />
          )
        }
        return (
          <iframe
            title="Operations Center (Dispatcher Cockpit)"
            src={dispatcherCockpitSrc()}
            style={{ border: 'none', width: '100%', height: '100%', display: 'block' }}
          />
        )
      }}
      className="h-full"
    />
  )
}

export function makeOperationsCenterRoute(path: string, deps: OperationsCenterDeps = {}): ModuleRouteLoader {
  return () =>
    Promise.resolve(
      createLazyRoute(path)({ component: () => <OperationsCenterPage {...deps} /> }),
    )
}
