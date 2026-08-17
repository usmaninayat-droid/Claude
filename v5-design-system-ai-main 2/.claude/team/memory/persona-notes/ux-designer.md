# UX designer persona notes — lessons learned

- Roles Management (settings/roles-management.tsx + role-sheet.tsx, reviewed 2026-07-09):
  the edit round-trip is broken at the wiring layer — `RoleSheet.initial` is only fed
  `{id, name}` from `blocks/settings/settings.block.tsx`, and its save handler
  (`createRole`) only writes `d.name` back on edit, silently dropping `description`,
  `appIds`, and `privileges` both on load AND on save. This is the same defect
  SHAPE already logged in `qa.md` for CategorySheet (data captured in the sheet,
  ignored by the consumer's save handler) — recurring across two Settings features.
  When reviewing any Create/Edit side-sheet, always trace: does `initial` carry
  every field the draft type declares, and does the save handler write every field
  back? Don't assume a second occurrence "can't happen again" once logged once.
- Destructive kebab actions (Delete/Disable) wired straight from a Popover menu
  item to a state mutation with zero confirmation step is an easy miss to
  ship — `RolesManagement`'s "Delete" goes row → `onRoleAction('delete')` →
  immediate array filter, no confirm dialog anywhere in the chain. Always grep
  the FULL call chain (component → consumer/block) for irreversible actions, not
  just the component's own JSX, before calling a delete flow "safe."
- Multi-step wizard sheets (RoleSheet-style: tabs unlock progressively) need two
  edge-state checks beyond the happy path: (1) final-submit re-validates the
  gating field (a user can advance past step 1, then blank the required field,
  then still submit from a later step if `canProceed` only gates step 1); (2)
  zero-item collections passed as config (`apps=[]`, `permissionAreas=[]`) render
  a blank section with no "nothing configured" message — always ask "what does
  this look like with 0 items?" for every array prop on a wizard step.
- Full-platform sweep of ifm-workforce (2026-07-13, ordered after the client caught
  3 mistakes on Workforce Pulse): a "fixed one instance" defect almost never stays
  fixed platform-wide. The SAME file that had already been hardened against
  module-switching (operations-center.tsx, with an explicit T-054 code comment
  "NEVER leave the module... sheet-over-sheet") still shipped two raw
  `actions.openModule(a.navigate)` calls two features later (Action Queue's "Open
  in Leave"/"Open worksheet" buttons) — the LAW was documented but not re-applied
  to new call sites in the same file. Grep `openModule(` across the whole product,
  not just the reported module, every time this defect class is in scope.
- The same "drill-in leaves the module" mistake recurred in two OTHER modules via
  the identical anti-pattern: a stacked detail sheet (Skill holders sheet in
  Skills Matrix; a Project's Assigned/Suggested Workers list in Projects) has a
  row `onClick={() => actions.openModule('workforce', {...})}` instead of
  `ctx.openDetail(workerDetail(...))` — confirmed on-screen: the click fully
  replaces the current sheet AND switches the rail highlight, losing the
  parent context. The tell in code review: a component that ALSO has a correct
  `ctx.openDetail(...)` row-click elsewhere in the same file (Skills Matrix's own
  table does it right) is the fastest way to spot the inconsistent sibling.
- Number formatting drifts file-by-file even when a `nf()`/`toLocaleString` helper
  already exists and is used correctly elsewhere in the SAME product (attendance.tsx,
  payroll/worksheet.tsx, operations-center.tsx's own `nf()`). Newer files
  (shifts.tsx, timesheets.tsx, skills-matrix.tsx, zones.tsx, payroll/index.tsx's
  Kanban card) skip it — always grep `Showing {` / raw `.length}` / `/1000).toFixed`
  interpolations across the WHOLE product before calling a number-formatting pass
  done; a helper existing somewhere isn't the same as it being applied everywhere.
  Same root cause produces a visible INCONSISTENCY, not just an omission: the exact
  same July payroll run showed "AED 25.6M" on one surface (Ops Center KPI, uses a
  M/k threshold formatter) and "AED 25608k" on another (Payroll Kanban card, raw
  `/1000).toFixed(0)+'k'`) — cross-surface citation is stronger evidence for a
  client report than either instance alone.
- Full-platform interaction sweep of ifm-workforce (T-065, 2026-07-13): the T-064
  sheet-over-sheet fix (Pulse Critical Incidents KPI → raw sheet → TaskDetail →
  close → re-click → full close) held completely on re-test — geometry collapsed
  correctly AND the raw sheet stayed clickable after the stacked detail closed.
  Worth re-verifying a "fixed" interaction bug ONE more time on a fresh sweep
  before trusting it's durable — this is the first ifm-workforce law that
  survived a second independent check without drifting.
- Two DIFFERENT empty-state defects share one root idea (a shared DS empty-state
  affordance not reaching every consumer): (1) hand-rolled `<DataTable>` usages
  (workforce.tsx, attendance.tsx — needed for custom pagination/groupBy) pass a
  bare string `emptyState="No matching records"` instead of the richer
  `<EmptyState query={query}/>` the generic ListView uses, silently dropping the
  "try a different search or clear filters" guidance; (2) `KanbanView` itself
  has NO all-empty check at all (unlike ListView/GroupedListView) — a zero-match
  Kanban search renders three blank pastel columns with zero messaging, a
  platform-wide gap since every pipeline module shares one KanbanView. Lesson:
  when auditing "empty states," check BOTH that a component calls the shared
  empty-state helper AND that the helper itself covers every view kind (list vs
  kanban) — a component can pass a prop-shaped emptyState and still not match
  the platform's own bar.
- A global `<Toaster position="bottom-right"/>` can collide with a form panel's
  OWN bottom-anchored footer buttons — ifm-workforce's "Create New Zone" success
  toast landed directly on top of the zone-create panel's Cancel/Create Zone
  buttons at the exact moment the flow opened (both pinned to the same screen
  corner). Whenever a product fires a toast right as a side-panel/form opens,
  check the panel's OWN button position against the app's global toast corner —
  don't assume "it auto-dismisses" makes the overlap harmless; an eager click
  right after opening the flow is swallowed by the toast, not the button.

## 2026-07-14 — typography-weight consistency (client escalation, T-086)
When reviewing flows, read each composed surface as a WHOLE: a transition action must not visually
outrank the status it belongs to; a timeline must read as one even list (actor emphasis = subtle
weight, never caps+bold). Flag any element whose type treatment has no hierarchy rationale.
