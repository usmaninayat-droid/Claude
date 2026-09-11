# Inspector Shifts · "Compliance Monitoring" view — hidden (2026-09-01)

The Inspector Shifts module now ships ONE view, **Planning**. The
**Compliance Monitoring** view is hidden from the module's view-tab strip and
from the embedded bundle's tab registration, but every line of its code stays
in the codebase, self-contained and untouched:

- `src/app/inspector-shifts.tsx` — `ComplianceMonitoringView`,
  `complianceEntries()` / `ComplianceEntry`, the wide compliance `DetailSheet`,
  the `RouteMap` shift-replay map, `buildPlanLogEvents`, the OSRM snapping
  helpers and the compliance empty-state illustration.
- `src/app/po-modules.tsx` — `ComplianceGaugeChart` (also used elsewhere).
- `src/assets/empty-compliance.svg`.

Nothing leaks: with the view unregistered, none of that tree is mounted, and
the embed's `?view=compliance` query param falls back to Planning
(`src/App.tsx` → `module.tabs?.find(...) ?? module.tabs?.[0]`).

## Re-enable (two edits)

1. `src/app/inspector-shifts.tsx` — set

   ```ts
   const SHOW_COMPLIANCE_MONITORING = true
   ```

   (just above `buildInspectorShiftsModule`). The tab entry is already written
   out in the spread below it.

2. `<repo>/app/src/demo/inspector-shifts-module.tsx` — add the view back to
   `INSPECTOR_SHIFTS_VIEWS`:

   ```tsx
   { id: 'compliance', label: 'Compliance Monitoring', type: 'list', icon: () => <Icon name="clipboard-check" /> },
   ```

That is the whole re-enable. Both edits are needed: the host `ModuleViewShell`
renders the tab strip OUTSIDE the iframe (step 2) and drives the embedded
bundle's body through `?view=` (step 1).

## Why nothing else needed patching

Same precedent as the hidden Weather Stations module
(`tenants/uccp/modules/rain-sensors/HIDDEN.md`): the view strip is built purely
from a static array, so an id absent from that array never gets a tab, a route,
or a render call. There is no saved-view persistence behind this module, so
there is no stored state pointing at the removed view either.

## Test note

`app/e2e/inspector-shifts-verify.spec.ts` still asserts the Compliance
Monitoring tab (it predates this change) and will fail until it is updated or
the view is re-enabled. `app/e2e/inspector-shifts-qatar-verify.spec.ts` covers
the current, hidden-view state.
