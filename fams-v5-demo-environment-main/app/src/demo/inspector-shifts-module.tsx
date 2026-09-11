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

/**
 * Inspector Shifts — the module BODY (`buildInspectorShiftsModule`'s
 * "Planning" + "Compliance Monitoring" tabs, taken as-is from
 * /Users/apple/Desktop/FAMS-V5-IIMS-DEMO-main/src/app/inspector-shifts.tsx,
 * plus its sibling po-modules.tsx and full vendored @ds tree) is isolated
 * behind an iframe, same isolation route as planning-v2-module.tsx and
 * operations-center-module.tsx: the copied source pins React 18.3.1 and this
 * host runs React 19, so it runs its own Vite dev server (port :6380, see
 * tenants/uccp/overrides/screens/inspector-shifts/vite.config.ts).
 *
 * CHROME ARCHITECTURE — mirrors planning-v2-module.tsx's
 * `SmartPlanningV2Page` exactly (one module, two views, one
 * `ModuleViewShell`): the view tabs live OUTSIDE the iframe, in the UCCP
 * shell's own `ModuleViewShell` from `@fams/v5-templates` — the SAME
 * saved-view shell every blueprint module renders. Rendered inside the
 * app's `V5AppShell`, `ModuleViewShell` portals its tab strip into the ONE
 * real `TopNav` the shell already owns, so the maroon active-tab underline
 * comes from the qatar-mme tenant theme (`--primary`) automatically, exactly
 * like every other module.
 *
 * Inspector Shifts has no saved-view persistence (the body is an opaque
 * embedded app), so the view list is static here. Tab selection drives the
 * embedded app's screen via a `view` query param (`planning` | `compliance`)
 * the vendored app reads on load (see the bundle's `src/App.tsx`
 * `embedViewParam()`) — switching tabs reloads the iframe `src` with the new
 * param, the smallest patch that keeps the vendored source verbatim
 * otherwise.
 *
 * `onCreateView` is wired to the strip's standard "+" affordance, opening the
 * same "Select Preferred View" takeover every blueprint module's "+" opens
 * (`ViewTypePicker`), permanently disabled (no saved-view store behind this
 * module) — same contract as planning-v2-module.tsx's `useStaticViewPicker`.
 *
 * Production note: this iframe's `src` should point at wherever this
 * screen's own `vite build` output is served from (a static bundle alongside
 * the host, at `/screens/inspector-shifts/index.html`) — not hardcoded to the dev
 * server, which is a dev-time convenience only (same caveat as the other two
 * ported bundles).
 */
function inspectorShiftsIframeSrc(view: string): string {
  const query = `embed=1&view=${view}`
  return import.meta.env.DEV
    ? `http://localhost:6380/?${query}`
    : `/screens/inspector-shifts/index.html?${query}`
}

// Leading glyph per view, same `ModuleView`/`VIEW_TAB_ICON` shape as
// planning-v2-module.tsx: calendar for the scheduling grid, clipboard-check
// for the compliance list/detail — distinct from the rail icon
// (`shield-tick`, see seams.tsx `MODULE_ICONS`).
//
// HIDDEN (2026-09-01): the "Compliance Monitoring" view is withheld from this
// list — see tenants/uccp/overrides/screens/inspector-shifts/HIDDEN.md. Its
// body, data and detail sheet all remain in the embedded bundle; re-enabling is
// re-adding the entry below AND flipping `SHOW_COMPLIANCE_MONITORING` in that
// bundle's src/app/inspector-shifts.tsx.
const INSPECTOR_SHIFTS_VIEWS: ShellView[] = [
  { id: 'planning', label: 'Planning', type: 'list', icon: () => <Icon name="calendar-check-01" /> },
]

/** The active tab's "⋮" menu — identical contract to planning-v2-module.tsx's
 *  `staticViewMenuItems`: `Copy Link to View` works with no persistence;
 *  `Rename`/`Delete View` stay present but disabled (no saved-view store). */
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

function InspectorShiftsPage() {
  const [activeViewId, setActiveViewId] = useState('planning')
  const { pickerOpen, openPicker, closePicker, pickerBody, viewMenuItems } =
    useStaticViewPicker(INSPECTOR_SHIFTS_VIEWS)
  return (
    <ModuleViewShell
      views={INSPECTOR_SHIFTS_VIEWS}
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
            title="Inspector Shifts"
            src={inspectorShiftsIframeSrc(view.id)}
            style={{ border: 'none', width: '100%', height: '100%', display: 'block' }}
          />
        )
      }
      className="h-full"
    />
  )
}

export function makeInspectorShiftsRoute(path: string): ModuleRouteLoader {
  return () => Promise.resolve(createLazyRoute(path)({ component: InspectorShiftsPage }))
}
