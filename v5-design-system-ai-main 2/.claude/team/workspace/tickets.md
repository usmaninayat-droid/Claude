# Tickets — the live board (message bus). Agents emit verdict blocks; the Conductor writes rows here.

<!-- Ticket schema:
  id | title | from | assignedTo | type(spec|design|defect|question|handoff|learning|backport)
  severity(blocker|major|minor|nit) | refs[] | expected | actual | status(open|in-progress|resolved|verified|wontfix)
-->

## Open
<!-- ifm-workforce → DS backport batch (analysis 2026-07-15). Top-3 (T-100/T-102/T-104) to APPLY this session; rest deferred. -->
- **T-100** SearchableSelect — add a `multiple` mode (backport). from: ifm-workforce analysis · assignedTo: frontend-eng · type: backport · severity: minor
  refs: [DS src/components/basics/searchable-select.tsx (single-select only, L36-37) · ifm MultiZoneSelect projects.tsx:868, attendance.tsx]
  fix: additive `multiple`/`values`/`onValuesChange` mode — checkbox option rows + removable-chip summary, reusing the existing trigger/search grammar. 2 product re-implementations. LOW risk. **APPLY.**
- **T-101** MapView marker perf — replace deep `JSON.stringify(markers)` effect deps (backport). from: ifm-workforce analysis · assignedTo: tech-lead · type: backport · severity: major
  refs: [DS src/components/map/map-view.tsx:417 (+ L379) · ifm monitoring.tsx:179-233 DEMO_CAP=500 sampler workaround]
  actual: O(n) re-serialize + full marker rebuild per interaction → freeze at ~5k; ifm caps 500 of 5,156. fix: stable signature (length+hash / ref-identity) + incremental diff. **HIGH-VALUE but PERF-CRITICAL/risky — gating dep for Trip Management at real scale. Ticket (verify carefully), do NOT rush into this push.**
- **T-102** StateTransitionToolbar — optional note/reason capture (backport). from: ifm-workforce analysis · assignedTo: frontend-eng · type: backport · severity: minor
  refs: [DS src/components/data-display/state-transition-toolbar.tsx (no note capture) · ifm PipelineStatusControl pipeline-controls.tsx:32-87, 8 consumers]
  fix: additive `noteLabel?`/`confirmMessage?` per transition → toolbar's own Dialog+Textarea → `onTransition(toStageId, note?)`. LOW risk, 8 consumers. **APPLY.**
- **T-103** Promote a `KpiDrillSheet` to the operations kit (backport). from: ifm-workforce analysis · type: backport · severity: minor→**major (REINFORCED 2026-07-16)**
  refs: [ifm operations-center.tsx:265-312 RawDataSheet + projects.tsx:521-565 DemandRawSheet — TWO local re-impls, both comment "not exported"] fix: packaged {title,columns,rows,onRowClick} wide right Sheet + DataTable + CSV + content-aware clamp width + sheet-over-sheet drill. Pairs with T-115 (CSV util). Confirmed repeated idiom → promote off Defer.
- **T-104** Export `MonitoringZone`/`MonitoringPoi` (+ audit sibling monitoring types) from app-shell barrel (backport). from: ifm-workforce analysis · assignedTo: frontend-eng · type: backport · severity: nit
  refs: [DS src/components/app-shell/index.ts (gap) · ifm monitoring.tsx:5 deep-import] fix: add to re-exports. TRIVIAL. **APPLY (after Trip Pass-1 build to avoid index.ts race).**
- **T-105** Read-only `RequirementChecklist` (or non-editable derived mode on MaintenanceChecklist) (backport). type: backport · severity: minor. refs: [ifm StageChecklist pipeline-controls.tsx:105-127]. **REINFORCED 2026-07-16: needs a failed/critical (red) item state + per-item detail text the DS ChecklistSection/MaintenanceChecklist don't expose. Consumed by doc-renewals + lifecycle.** Defer.
- **T-106** Broaden `DEFAULT_ENTITY_ICONS` beyond 10 keys (zones/POIs/camps/routes/kiosk/tablet/card-reader) (backport). type: backport · severity: minor. refs: [ifm settings.tsx:707-713 → Cube01 fallback]. Needs real glyph assets. Defer.
- **T-107** Trip Management module — remaining passes (feature). from: user (Americana/Berkeley/FAMS-portal frames) · assignedTo: tech-lead · type: feature · severity: major
  refs: [scratchpad/trips/SPEC.md · blocks/trip-management/* · live-monitoring-view.tsx]
  P1 (spine) building now. REMAINING: P2 trip detail (TaskDetail + summary grid + Timeline/Alarms/All-logs sub-tabs via ActivityFeed) · P3 route-replay map (actual/planned/deviation overlays + numbered stop markers/popups) + playback scrubber · P4 New-Trip 2-step wizard (StepWizardSheet) + Optimize generate-action + Send-Trip-Plan email drawer · P5 workforce-by-site/pickup grouped table w/ pickup-drop-off dots. Config-driven/domain-agnostic; blocked at real scale by T-101 (map perf).
- **T-108** [product/ifm] **RE-VENDOR the DS into ifm** — vendor/ds frozen 2026-07-10, ~6 days + missing module-toolbar.tsx (T-094), report-window.ts (T-099), Trip Mgmt block, appearance.tsx, editableReports, T-100/102/104 fixes. from: ifm-workforce analysis · type: defect · severity: **major (RAISED 2026-07-16 — this GATES the entire batch-2 adopt list T-127 and blocks T-100/102/104 already-fixed-upstream from reaching the product)**. Superset now covered by T-127 (post-vendor adoption sweep, incl. the original EmptyState dedup).
- **T-109** C1 adoption: live-monitoring list panel can't use `ModuleToolbar` as-is (geometry). from: design-qa (Trip Pass-1 review) · assignedTo: tech-lead · type: backport · severity: minor
  refs: [src/components/app-shell/live-monitoring-view.tsx:817-821 (// TODO(C1 adoption)) · src/components/app-shell/module-toolbar.tsx:217,220 (px-7 band, min-w-200/max-w-367 search, size-10 btns) · docs/contracts/list-toolbar.contract.md]
  the C1 `ModuleToolbar` is a full-bleed entity/pipeline row; the live-monitoring left panel is ≤~420px. The Pass-1 trip build kept the existing (contract-shaped) hand-rolled panel toolbar with a code TODO. This ticket = the C1 exception-of-record: add a COMPACT ModuleToolbar variant (or a shared narrow layout) so the monitoring panel can adopt it. Part of the C1 adoption sweep.
- **T-110** Consolidate the TWO TaskDetail right-panel tab mechanisms (Layer-0 dedup). from: design-qa (Trip Pass-2 gate) · assignedTo: tech-lead · type: defect · severity: major
  refs: [src/components/app-shell/task-detail.tsx:318-372 (new native `rightPanelTabs`) · src/components/app-shell/pipeline-right-panel.tsx:210-248 (RightPanelTabStrip) · src/components/app-shell/runtime-app.tsx:89-129 (PipelineDetailBody) · recipes/crm/deals.module.json (profile.rightPanel.tabs — live OLD-mechanism consumer)]
  Pass 2 added a native `rightPanelTabs` API to TaskDetail without noticing `PipelineDetailBody` already generalized the same slot via a `timelineTitle`-injection workaround (live via the CRM recipe). No regression (design-qa verified both paths clean), but two ways to do one thing. fix: make `rightPanelTabs` the ONE canonical API; migrate the CRM/pipeline detail flow onto it; retire RightPanelTabStrip/the injection workaround. The exact "improve in place, don't add a parallel path" case the contracts initiative exists to prevent.
- **T-111** Trip `Upcoming` status pill uses `--chart-3` not a `--status-*` token. from: design-qa · assignedTo: tech-lead · type: defect · severity: minor
  refs: [blocks/trip-management/trip-management.block.tsx:56 · docs/contracts/00-INDEX.md (C3 draft — status-* only)]
  `--status-info` == `--primary` (link-blue) would collide in the pill, so chart-3 (purple) was used undocumented. fix: either amend C3 to sanction a 4th status tone, or add a dedicated `--status-upcoming`/neutral token. (Feeds the C3 Status-Pill contract.)
- **T-112** Trip Pass-2 nits: spec.md still marks Pass 2 "deferred" though shipped; ad-hoc ALL-CAPS "CUSTOMER · Name" in the stop-feed body text (use the feed's labeled-value/chip idiom). from: design-qa · assignedTo: frontend-eng · type: defect · severity: nit
  refs: [blocks/trip-management/trip-management.spec.md:31-34 · blocks/trip-management/trip-management.block.tsx:246]
<!-- Dashboard/widget/chart chrome initiative (Design-System-V2 5246-10805/5235-86xx + Tadweer raw-data sheets), 2026-07-17. -->
- [RESOLVED 2026-07-17, self-verified (gates + a11y-tree parity), NOT pushed] **T-129** DS: unified widget/chart header (primary-icon + divider) + `WidgetCard` (map/hybrid variants) (feature). from: user (Figma DS-V2) · type: feature · severity: major
  refs: [src/components/data-viz/widget-card.tsx (new) · chart-card.tsx (divider default true + onViewRawData) · widget-card.spec.md]
  built: `WidgetCard` = IconBadge(**primary** default) + title/subtitle + actions + raw-data/expand affordances + **divider**, with `default`/`map`(full-bleed)/`hybrid`(left `panel` + right map, one header) variants. `ChartCard` gained `divider` (default true — line under header, platform-wide) + `onViewRawData`. KPI-vs-widget icon rule: charts/widgets → primary; KPI tiles keep varied per-tile `iconColor` (KpiTile already supports). Verified: 3 header dividers present, map/hybrid layouts render, gates green (tsc/coherence/a11y/smoke24/build). FOLLOW-UPS: (1) widen the `DashboardWidget` union (icon/iconTone + onDrill/rawData + map/hybrid kinds) so JSON-driven dashboards declare header icon + drill + layout — the "config-driven per-usecase adaptation" gap (d); (2) align map `WidgetShell` header (map-widgets.tsx) + `EntityChartCard` to the unified header; (3) consolidate the 5 overlapping KPI tiles.
- [RESOLVED 2026-07-17, self-verified, NOT pushed] **T-130** DS: `RawDataSheet` — view→download raw-data drawer (feature; resolves T-103). from: user (Tadweer 2227-79382/94303/76577) · type: feature · severity: major
  refs: [src/components/data-display/raw-data-sheet.tsx (new)] built: wide right `Sheet` — title + muted "(Raw Data)" + CSV **Download** button (`downloadCsv` T-115) + "Showing N items" + lazy `DataTable` of the source rows; CSV = exactly the shown rows (the basis). Attachable to any KPI/chart/widget via `onViewRawData`→open. Reuses Sheet + DataTable + downloadCsv (no fork). Verified end-to-end on harness (opened "Scheduled Routes (Raw Data)", 42 rows, download btn). **Supersedes T-103** (KpiDrillSheet) — packaged generically.
- [SUPERSEDED by T-130, 2026-07-17] **T-103**
- [RESOLVED 2026-07-16, self-verified (gates + a11y-tree parity), NOT pushed] **T-128** Settings › Organization Settings — org overview surface (feature). from: user (Figma FAMS-Settings 2-11415 logo-set / 2-11663 logo-empty) · assignedTo: frontend-eng · type: feature · severity: major
  refs: [src/components/settings/organization-settings.tsx (new) · organization-settings.spec.md (G1) · settings/index.ts barrel · org-settings.html + src/org-settings-demo.tsx harness]
  built: DS `OrganizationSettings` — identity header (logo + edit badge / placeholder empty-state) · KPI stat row (config-driven `OrgStat[]`: value/label/icon/subValue/trend-delta/caption/drill + `Sparkline` reuse; `wide` billing card spans 2 rows w/ taller spark) · day-grouped activity log (`OrgActivity[]`: linked actor+role · action · timestamp, first-seen dateGroup order). Config-driven + token-only; REUSES data-viz `Sparkline` (no fork). Verified: tsc + coherence + a11y-static + smoke(24) + vite build green; acceptance criteria 1-5 confirmed via a11y-tree + JS on the :5180 harness (identity/edit, 5 stat cards incl. billing span, day groups, logo empty-state toggle). CAVEAT: Sparkline CHART pixels not visually confirmable — the preview pane suspends recharts' ResponsiveContainer ResizeObserver offscreen (same flaky-heavy-preview class as screenshot timeouts); wrapper sizes verified correct (358×44 / 358×140), renders in real app envs. FOLLOW-UP: if reused, extract the KPI+sparkline `OrgStatCard` to data-viz as a general stat-spark card.
- [RESOLVED 2026-07-16, self-verified (gates + a11y-tree parity), NOT pushed] **T-113** Settings › Appearance ("Look & Feel") — super-admin theming surface (feature). from: user (Figma FAMS-Settings 2-6120 main / 2-6350 unsaved-changes dialog) · assignedTo: frontend-eng · type: feature · severity: major
  refs: [src/components/settings/appearance.tsx (new) · appearance.spec.md (G1) · settings/index.ts barrel · appearance.html + src/appearance-demo.tsx parity harness]
  built: DS `Appearance` component — org-logo (Replace/Remove + file-input) · Suggested-themes preview cards (radiogroup, mini app-mockup painted from each preset) · Select-your-own-style (REUSES `ColorPicker` swatch+custom) · On-Primary black/white radiogroup + tooltip · Save Changes + in-page Discard · **Unsaved-Changes leave-guard `Dialog`** (frame 2-6350) · super-admin `canEdit` gate (false ⇒ fieldset disabled + lock notice, Save/Discard hidden). Law-5 by construction: `onSave(next)` emits a `TenantBrand`-shaped value (`{ '--primary', '--primary-foreground' }` + logo) the shell applies at root (`AppShell.tsx:700 style={brand.theme}`) — component writes ZERO chrome hex; only selectable colour-DATA, `coherence-allow`-tagged (ColorPicker palette precedent). Verified: tsc + coherence + a11y-static + smoke(24) + vite build all green; all 5 acceptance criteria confirmed via a11y-tree + JS assertions on the :5180 harness (theme-select→dirty→Discard/Save; Back-while-dirty→dialog→Save commits+closes; canEdit=false→lock+disabled). Screenshot parity BLOCKED by the known flaky heavy-showcase preview (screenshot path times out; a11y-tree used instead, per prior run-log precedent). `canEdit` gate derived from the stated "super admin only" requirement (documented in spec, not a frame). FOLLOW-UPS: wire into a showcase settings surface; consider a `--status-*`/warning token audit on the dialog icon tint.
- [RESOLVED 2026-07-16, self-verified, NOT pushed] **T-114** Subscriptions — evolve My-Subscriptions per user intent (feature). from: user (Figma FAMS-Settings 211-10138 list / 211-10484 row-menu) · assignedTo: frontend-eng · type: feature · severity: minor
  refs: [src/components/settings/subscriptions.tsx · subscriptions.spec.md]
  finding: existing `Subscriptions` "My Subscriptions" tab ALREADY matches frames 211-10138/10484 exactly (Name·Type·Frequency·Next/Last Run·Sub-Org·Switch + kebab→Remove) — no rebuild. Additive evolve for the user's broader description ("subscriptions from any module — report/pipeline/maintenance — enable/disable, delete, go-to for editing"): (1) documented `type` as free-form source-kind DATA (Report/Pipeline/Maintenance/Event) — renderer never branches; (2) opt-in `editableReports` prop adds an **"Edit / Go to source"** kebab item → `onReportAction(sub,'edit')`, default off = frame parity preserved. Back-compat (additive prop + widened `ReportAction` union). tsc/coherence/a11y/smoke/build green.
<!-- ifm-workforce → DS refinement batch 2 (3-agent sweep 2026-07-16, all 23 modules). GATE: re-vendor first (see T-108, now RAISED). Cross-ref: T-101/103/105 reinforced; T-100/102/104 confirmed already-fixed-upstream-pending-revendor. -->
<!-- RESOLVED 2026-07-16 (gates green: tsc+coherence+a11y+smoke24+build; NOT pushed): T-115 (CSV util), T-119 (MapLegend + MARKER_STATUS_COLORS single-source), T-121 (Callout), T-122 (KanbanCard actions slot), T-125 (Facet/InboxCategory barrel), T-126 (Input numeric lang). STILL OPEN (bigger/riskier, deferred): T-116 (FacetDropdown extract), T-117 (StepWizardSheet headless), T-118 (groupBy+lazy — perf), T-120 (events de-fleet), T-123 (ZonesView), T-124 (dashboard bar bug — needs repro), T-101 (map perf — don't rush). -->
- **T-115** DS: packaged CSV-export util `downloadCsv(rows, cols, filename)` + `csvCell` escaper. from: ifm sweep · type: backport · severity: major
  refs: [ifm timesheets.tsx:464 · projects.tsx:490-508 · payroll/worksheet.tsx:218,231 · ops-center RawDataSheet CSV "re-implemented locally, not exported"] — same escape→Blob→anchor→revoke recipe copy-pasted 4×, with drifting revoke timing. New DS `data-display`/`utils` helper.
- **T-116** DS: export the toolbar filter-field trigger (the AppShell-internal `FacetDropdown` anatomy) + give `toolbarSlot` access to the render context/facet state. from: ifm sweep · type: backport · severity: major
  refs: [ifm workforce.tsx:278-314 GroupByField + 254-262 useGroupCol · skills-matrix.tsx:198-215 TradeFilterField + 177-185 useTradeFilter · DS AppShell.tsx:239 FacetDropdown (unexported), :815 toolbarSlot] — products mirror AppShell internals to make `toolbarSlot` fields match built-in facets, and hand-roll a useSyncExternalStore singleton to bridge toolbarSlot↔render subtrees.
- **T-117** DS: make `StepWizardSheet` composable inside an existing sheet (headless stepped-tab body, not its own `<Sheet>`). from: ifm sweep · type: backport · severity: major
  refs: [ifm workforce.tsx:44-57,620-876 CreateEmployeeWizard (rebuilt locally) · DS settings/step-wizard-sheet.tsx:39 owns its own Sheet · SteppedSchemaForm side-sheet.tsx:934 is schema-only] — `create.render` already lands in the shell FormSheet, so the DS wizard's own Sheet doubles the overlay/close chrome; steps need custom controls so SteppedSchemaForm doesn't fit.
- **T-118** DS: `DataTable` — allow `groupBy` + `scrollMode="lazy"` to coexist (per-group lazy windows). from: ifm sweep · type: backport · severity: major
  refs: [DS data-table.tsx:235 `lazy = scrollMode==='lazy' && !groupBy` (mutually exclusive, VERIFIED) · ifm workforce.tsx:232-462 full grouping re-implementation] — a large grouped table (560-worker site) can't lazy-load, so the product re-partitions the full set and renders its own collapsed groups each with an independent lazy table (T-065 F1 lineage).
- **T-119** DS: export the map `MarkerStatus→color` map as TOKENS + ship a `MapLegend`. from: ifm sweep · type: backport · severity: major (token-law leak)
  refs: [DS leaflet-map.tsx:153 STATUS_COLORS (module-private) · ifm events.tsx:129-132 MARKER_COLOR raw #hex mirror → legend :301-312] — a consumer needing a legend must copy the exact hex, putting raw hex in a product file ("mirrors the DS map's STATUS_COLORS exactly").
- **T-120** DS: make `events-view`/`event-detail-sheet` domain-generic (de-fleet). from: ifm sweep · type: backport · severity: major
  refs: [DS app-shell/events-view.tsx + event-detail-sheet.tsx (Vehicle/Driver/Speed hardcoded) · ifm events.tsx:24-50,339-413 rebuilt the whole list+map hybrid via entity+render override] — the `events` module type ships but its view is fleet-locked; T-096 worked around it ifm-side (never fixed in DS). Generic field mapping would make the type reusable.
- **T-121** DS: inline tinted `Callout`/`Alert` banner (tone → soft border+fill), non-modal. from: ifm sweep · type: backport · severity: minor
  refs: [ifm worker-detail.tsx:389-398,400-414 bespoke `color-mix(...25%/6%)` status banners — violates the no-one-off-color-mix law · DS has only AlertDialog (modal)]. Feeds a real coherence gap (status callouts recur).
- **T-122** DS: `KanbanCard` optional `actions`/footer slot for inline card actions. from: ifm sweep · type: backport · severity: minor
  refs: [DS data-display/kanban-card.tsx (no button slot) · ifm leave.tsx:30-37,272-296 approve/reject forced into TaskDetail header + a store-subscribed list cell].
- **T-123** DS: `ZonesView` — add `defaultHiddenColumns`; skip the 15px chevron spacer/padding when no node has children. from: ifm sweep · type: backport · severity: minor
  refs: [DS zones-view.tsx:292 always-rendered spacer, :77 hiddenCols runtime-only · ifm zones.tsx:149 rename-workaround, :161 `[&_tbody_tr…]` spacer hack].
- **T-124** DS: `DashboardWidgetGrid` `kind:'bar'` collapses to ~15% width (nested-grid ResponsiveContainer measurement race). from: ifm sweep · type: defect · severity: minor
  refs: [DS dashboard-widgets.tsx ChartCard→BarChart · ifm ops-center.tsx:1171-1198 bypasses the grid, calls BarChart directly].
- **T-125** DS: app-shell barrel — re-export types `Facet` + `InboxCategory`. from: ifm sweep · type: backport · severity: nit
  refs: [ifm skills-matrix.tsx:3 + settings.tsx:3 deep-import `@ds/components/app-shell/types` · DS app-shell/index.ts]. (Same class as the now-fixed T-104.)
- **T-126** DS: `Input` numeric mode — default `lang="en-US"` so Chromium doesn't render a locale decimal comma. from: ifm sweep · type: backport · severity: nit
  refs: [ifm payroll/worksheet.tsx:351-354 + lifecycle/onboarding.tsx:167 pin lang, "the standard fix"].
- **T-127** [product/ifm] Adoption sweep after re-vendor: swap bespoke → DS for `EmptyState` (attendance:352/workforce/zone-detail:59/events:194 — 4 dup sites, wrong-barrel comments), `StatePill` (ops-center RagDot/DocStatusBadge, events EventTypePill), `KpiMetricCard` (inventory/payroll 4 tiles), `FormSheet` (5 hand-composed 440px sheets), `Input.leadingIcon` (worker-detail:995), `text-caption` for `text-[12px]/[13px]`. Collapse `PipelineStatusControl` wrapper onto native `StateTransitionToolbar` note-capture (T-102), drop `MultiZoneSelect` for `SearchableSelect multiple` (T-100), delete the worker-detail `clamp(1320px)` tab-width hack (T-095 scrollable tablist already vendored), drop `MonitoringZone/Poi` deep-import (T-104). from: ifm sweep · type: defect(product) · severity: major (unblocks a growing adopt backlog)
- [RESOLVED 2026-07-14, conductor-verified, PUSHED] **T-099** ifm-workforce+DS: Reports punch list (client, 6 items): (1) template layout — search/toolbar
  row moves ABOVE the KPI tiles; (2) single-select dropdowns get proper RADIO affordance + missing 'All'
  options (Site dropdown lacks All); (3) FULL DYNAMISM — any historic date/entity/field selection
  re-generates rows+KPIs each time (deterministic historic materialization, shift-board T-051 precedent,
  when the window is outside the seeded period; honest counts); (4) Exception dropdown severity tags too
  big/ugly — compact soft-tint chips; (5) Subscribe Report recurrence UI/UX clear+clean (labeled fields,
  human recurrence summary); (6) sweep ALL templates + custom report for the same issues.
  status: in-progress — dispatched.
- [RESOLVED 2026-07-14, conductor-verified, PUSHED] **T-098** ifm-workforce: Violation Leaderboard reads all-RED (client: 'you added this as RAG widget
  but I only see red — adapt data properly, have amber and green sections as well so it feels more
  RAG'). Recalibrate the score→band thresholds (+ score-bar tint per band) so the visible ranked-desc
  first screen mixes red/amber and greens are reachable/visible — honest banding vs the T-055 Figma
  24337-7880 row-tint standard; status: in-progress — dispatched.
- [RESOLVED 2026-07-14, conductor-verified, PUSHED] **T-097** DS+ifm-workforce: Event Configuration ASSIGN-ENTITY step broken (client + Settings Figma
  1060-573): left rail = scope-category radios (All Entities/Sites/Trades/Camps/Bus Routes) but the
  right panel shows ALL categories' members mixed together — must show ONLY the selected category's
  members ('when I select an entity, the right side appears with all options inside that entity').
  Fix in DS settings/event-config-sheet.tsx (+ mirror + spec); category switch resets/filters the
  member list; 'All X' radio semantic = whole category (members auto-checked or list disabled — match
  the Figma); T-048 create/edit round-trip + hydration gate must stay green. status: in-progress —
  dispatched.
- [RESOLVED 2026-07-14, conductor-verified, PUSHED] **T-096** ifm-workforce: EVENTS module from the DS, HRMS-adapted (client + Launch Pad Figma refs
  5239-58111/61215/58166/58770 — 'more fleet widgets, but for workforce the events are clock in/clock
  out cause this is an HRMS app'). New rail module on the DS events-view family, HYBRID view per the
  Launch Pad standard (event list + map, like Zones/POIs/Monitoring): event instances derived from the
  REAL scan/attendance data (T-043 multi-touchpoint scans carry location+timestamp) — clock-in,
  clock-out, late, no-show, zone-out, missing-punch vocabulary (T-030 critical-events family); dynamic
  (store-live where mutations exist), deep-links to the worker, counts reconcile with Pulse/Attendance
  by construction; DS components only (events-view + event-detail-sheet; additive module-registry entry
  if 'events' isn't a registered type — DS+mirror+spec); Settings Event Configuration (T-048) = the TYPE
  catalog — the module surfaces INSTANCES; honest scale (bounded lists, lazy scroll, today default).
  status: in-progress — dispatched.
- [RESOLVED 2026-07-14, conductor-verified, PUSHED] **T-095** ifm-workforce: worker profile SHIFTS TAB (client + Figma ref 6Twj2L7KPGP5y8unBP9KS6
  node 1846-12577, the Workforce-App employee-detail shifts tab family): new tab on worker-detail
  showing the worker's shift schedule SOURCED FROM the Workforce Shifts module's Scheduling derivation
  (shifts.ts scheduleFor — same generator as the board, by-construction consistency; T-083 popup Shifts
  shape scaled up: date · window · task · site · status, this week + upcoming, week stepping if the
  frame shows it). 12th tab ⇒ tab-strip fit: probe 1600/1366/1280; if full words clip, implement the
  T-081 scrollable-tablist DS backport (EntityDetail) rather than abbreviating (no-guess-words law).
  Sidebar 'Shift Today' must equal the tab's today row. status: in-progress — dispatched.
- **T-094** ifm-workforce: PLATFORM COHERENCE CAPSTONE (client: 'make each module data rich, dynamic;
  data end-to-end mapped — a number shown at one place must reflect in its module; interactions complete;
  all issues I mentioned fixed OVERALL, not just one module'). Runs AFTER T-089/090/091/093 land, merged
  w/ the T-092c standards audit. PHASE A — 4 parallel REPORT-ONLY audits over the final tree: (1)
  ui-designer STANDARDS (every field/toolbar/chip/badge/typography/icon vs the laws); (2) qa NUMBER
  RECONCILIATION (every KPI/count/badge traced to its target module — the shown number must equal the
  module's own honest count; T-038 Part-B re-run platform-wide); (3) ux INTERACTION COMPLETENESS (every
  control wired, every flow completes + returns, every deep-link/drill-in lands, create round-trips);
  (4) DATA RICHNESS/DYNAMISM (surfaces still reading static seeds vs store-live — T-066 class incl. the
  known sitePresence remainder; thin/implausible data per module). PHASE B — triage → fix waves, disjoint
  contracts, pixel proofs. PHASE C — re-audit until clean (cap 3/finding class, then escalate) → retro →
  resolve tickets → clean the handoff doc. status: RESOLVED (2026-07-14) — Phase A 2 audits (FAIL: 1 crit+6 maj+3 min+2 nit) → Phase B 2 fix waves → Phase C re-audit PASS 9/9 + regressions clean. Run-log has the full retro. Client mandate (end-to-end mapping, dynamism, complete interactions, overall not per-module) MET and machine-verified.
- [RESOLVED 2026-07-14, conductor-verified on pixels, committed] **T-093** ifm-workforce: HIDE placeholder Settings entries (client: 'hide the settings which don't
  have UI yet like appearance, billing — don't repeat this mistake of showing empty not-added-yet
  settings from the DS; keep what is there'). Fixer AC audits every settings entry live (real vs stub),
  hides stubs config-side (DS untouched), proof = every remaining entry rendering real content. NEW
  defect class placeholder-surface-shipped (kin of decorative-unwired-control). status: in-progress.
- **T-092** CLIENT ESCALATION ('no icon in search — I don't know what you are really fixing; not happy
  with UI/UX/QA; build a proper platform with standard components/fields/structures'): (a) FIXED solo by
  conductor — Assign Workers sheet SearchMd lacked z-10 (T-062 root cause repeated in post-law surfaces);
  classwide sweep fixed 6 more (projects/leave/view-renderers×2/events-view, both trees); report-builder's
  3 routed to the in-flight reports fixer; zero remaining. (b) GATE PROMOTION in flight: search-field.mjs
  (G-SEARCHFIELD — icon-without-z10 + iconless-search-input checks, red-checked, wired) — the law becomes
  deterministic, agents can no longer ship this class. (c) PLATFORM STANDARDS AUDIT queued (runs right
  after fixers Y+AA land, over the final tree): ui-designer sweeps EVERY interactive field/control against
  the written laws (search anatomy, label-inside, toolbar grammar, badge/status treatments, empty states,
  typography scale) → enumerated violation list → one fix wave → re-audit. status: in-progress.
- [RESOLVED 2026-07-14, conductor-verified on pixels, committed] **T-091** ifm-workforce+DS: report-builder field standard + TEMPLATE FILTER PANELS (client, 2 msgs):
  (a) custom-report drawer fields → label-inside standard; EMPLOYEES external label fixed; redundant
  placeholder==label ('EXCEPTIONS/Exceptions', 'SITE/Site') → honest 'All …' defaults at the DS fallback;
  (b) the 3 SYSTEM report templates gain the same left filter panel, SCOPED per template (config-declared
  filters: period/site/facet — regenerate within scope, template identity locked; defaults == today's
  output; shared panel extracted from report-builder, DS stays generic). status: in-progress — one fixer,
  scope-add mid-flight.
- [RESOLVED 2026-07-14, conductor-verified on pixels, committed] **T-090** ifm-workforce: T-088 label-inside REMAINDER (fixer Z's sweep, files then owned by
  concurrent fixers + residuals from conductor pixel review): (a) workforce.tsx CreateEmployeeWizard —
  8 external-label fields (3 DateRangePicker + 5 SearchableSelect); (b) worker-detail.tsx Upload
  Document + Add Skill sheets — 4 fields; (c) timesheets.tsx Regularize sheet Clock In/Out — native
  time inputs → the DS TimeField idiom (shift-planner precedent), labels inside; (d) LABEL CASING
  normalization: FloatingLabelInput uppercases its label, LabeledSelect doesn't — one form mixes
  'PROJECT NAME' with 'Client'; pick ONE treatment at the DS level; (e) judge the picker/multi-picker
  external-label idiom now that siblings float (Assign-to reads odd-one-out). Dispatch after fixer Y
  lands (workforce.tsx). status: open — queued.
- [RESOLVED 2026-07-14, conductor-verified on pixels, committed] **T-089** ifm-workforce: Zone profile TAB RESTRUCTURE (client, on Atlantis Details tab: 'properly
  structure tabs like Overview, Details and so on — each tab needs to be defined; a supervisor will have
  a separate tab, documents tab — fix this profile'): (1) each tab = one coherent surface, worker-profile
  pattern; (2) Details tab = the zone's FULL field set only — kill the duplication with the sidebar's
  Site Details AND the embedded Supervisor section (own tab already exists — enrich it: lead flagged +
  all site supervisors w/ contact/trade rows); (3) NEW Documents tab — site-level documents (service
  contract, permits, insurance, HSE certs) w/ type + number + expiry + status, deterministic per site,
  mirroring the worker Documents tab anatomy; renewals-style expiry highlighting; DOCUMENT ICONS (client): rows use the real per-type file icons from assets/vectors/'file type'/File Type/ (PDF/DOCX/JPG/... + Default) — upgrade the DS FileTypeIcon to render this artwork (it currently draws a generic shape; icons must live under src/ so the vendor mirror carries them — POI-pin loader precedent, T-027) and adopt it in the WORKER profile's Documents/Renewals rows too; (4) PROJECT gets its OWN TAB (client follow-up: 'even Project will have a separate tab') — the assigned project expanded: name, client + contact, stage badge, since-date, contract window, and THIS site's per-trade allocation vs plan (the table that used to live in Overview/Details fits here); Overview keeps only the compact project name in its KPI row; (5) tags stay in Details. ALSO judge: 'Capacity
  380 vs Assigned 400' reads contradictory — if capacity = per-shift heads, label it so ('Capacity (per
  shift)'). BLOCKED behind fixer Y (owns zone-detail.tsx for pagination). status: open — queued.
- **T-088** ifm-workforce+DS: form-field labels INSIDE the field, everywhere (client, w/ Capture Project
  screenshots: Site Location + Start date carry external labels above the control while Project Name/
  Client/Duration are correct — 'use the standard field UI, labels inside the fields; UI looks broken
  with these kinds of issues, fix that everywhere'). Regression of the T-035 law. Normalize: wizard
  fields (DateRangePicker has a field/label-inside variant — use it; MultiZoneSelect gets the floating
  composition), SchemaForm-rendered sheet fields, sweep for external-label form fields platform-wide. status: RESOLVED (2026-07-14) — renderer-level fix (SchemaForm/side-sheet + record-detail + DateRangePicker field variant), Capture Project + Inventory verified w/ round-trips, conductor pixel-verified; committed. Remainder → T-090.
- **T-087** ifm-workforce+DS: KILL page controls — every list/table becomes SCROLLABLE with LAZY LOAD
  (client: 'don't add paginations like this — everything should be scrollable, lazy load'). DS DataTable
  gains a windowed infinite-scroll mode (sentinel chunk-append + sliding window so full-scroll never
  recreates the T-057 8k DOM cliff); every 'Page N of M' consumer migrates (workforce list + grouped,
  attendance logs, zone-detail tabs, payroll worksheet, cover-assign sheet, renewals list, any grep hit).
  ADD (client): Group-by toolbar control restyled to the exact sibling facet-dropdown anatomy (same file). ADD3 (client): Skills Matrix trade select moves INTO the one-row toolbar next to search, facet-dropdown anatomy (T-035/T-063 law). ADD2 (client, Skills Matrix screenshot): STICKY TABLE HEADERS must be OPAQUE — rows currently bleed through the header text when scrolling; fix in DataTable (classic + lazy modes) + sweep contract surfaces; clean cut-off at the header border.
  Honest counts stay ('Showing loaded of M'). status: in-progress — dispatched (fixer Y).
- **T-086** ifm-workforce+DS: TYPOGRAPHY WEIGHT/CASE anomalies (client, w/ screenshot; 'agents making
  dumb mistakes like this — UI/UX/QA make notice'): (a) pipeline status-control ACTION labels render
  large bold UPPERCASE tracking-wide next to a small status chip (MOVE TO APPROVAL vs REQUESTED) —
  disproportionate; (b) timeline actor prefixes (SYSTEM/PAYROLL) bold-caps jump out of the even
  clock-event rows; (c) PLATFORM SWEEP for the class: invented uppercase/bold/tracking combos where the
  DS type scale + Button/Badge/feed typography should rule. Fix at the DS/shared level; persona lenses
  (ui/ux/qa) get a typography-consistency check; defect-log new class. status: in-progress —
  dispatched (fixer X).
- **T-085** ifm-workforce+DS: Live Monitoring hybrid list — SHIFT TIME values wrap to two lines on some
  rows ("04:30 / 08:00" doubling) while others fit; client: fix + expand the side panel a bit so the
  column reads cleanly. status: RESOLVED (2026-07-14) — glyph-width variance root cause; 92px tabular-nums nowrap cell (DS+mirror) + listWidth 380→420 (config); T-083 regressions verified; committed. 3rd stale-dev-server incident (fetch-vs-disk proven) — restarted per the standing diagnostic.
- **T-084** ifm-workforce+DS: form side-sheet STEP TABS sit ON the divider line (client + Figma
  29638-14432: the active underline must be flush with the tab strip's bottom border, not floating
  above a detached line — match the EntityDetail/module tab idiom). Sweep every form-sheet wizard
  using the pattern (Add Employee, Capture Project, DS StepWizardSheet). Also: Add Employee step 1
  renamed "Identity & Employment" → "Basic Info". status: RESOLVED (2026-07-14) — fixed at the shared StepWizardSheet level (Capture Project + all Settings wizards inherit) + the local CreateEmployeeWizard strip; conductor pixel-verified both; committed. NOTE: fixer V found the shared dev server esbuild service fatally crashed (500s on every file) and restarted it — justified, no state lost.
- **T-083** ifm-workforce+DS: Live Monitoring punch list (client): (a) remove the floating "4,539 on
  shift · in zone" map badge; (b) list row click → map ZOOMS to that worker + opens their popup;
  (c) worker popups get TABS: Overview · Events · Shifts; (d) remove the "Live" chip from the list
  header (module name already says it); (e) hide the © CARTO/OSM attribution (licensing caveat logged —
  restore for anything public). status: RESOLVED (2026-07-14) — all 5 verified on pixels (zoom-to-worker + popup, 3 tabs, badge/Live-chip/attribution gone); product+DS committed.
- **T-081** DS backport batch (from the T-065 wave, all flagged in run-log 2026-07-14): EntityDetail
  scrollable/wrapping tablist; Sheet primitive maxWidth=min(width,100vw) cap; DashboardWidgetGrid
  kind:'bar' nested-grid width mismeasurement; live-monitoring/map-view per-selection full-marker rebuild
  (JSON.stringify keying) perf; ZonesView flat-list dead chevron spacer + column-omission prop;
  StateTransitionToolbar optional note field; SearchableSelect multi-select mode; workers.ts timelineFor
  single-id promotion hardcode. status: open — next evolve-ds loop.
- **T-082** ifm-workforce follow-up: reflect Leave cover assignments on the Shift board (design decision:
  reassign PlannedShift.workerId vs overlay — recurring-series linkage risk). status: open.

## RESOLVED 2026-07-13/14 (T-065 wave — all conductor pixel-verified; commits: product 90d77bf,
## vendor bfd461d, DS 5cf90ae; 2-iteration ui-designer re-review closed 8/8; details per-ticket below)
## T-065 · T-067 · T-068 · T-069 · T-070 · T-071 · T-072 · T-073(+ADD/ADD2/ADD3) · T-074 · T-075 ·
## T-076(+ADD) · T-077(+ADD) · T-078(+ADD) · T-079 · T-080 — statuses inline below.

- **T-080** ifm-workforce: CONSOLIDATE Access Cards + Devices → ONE "Inventory" module (client: "there is
  a misunderstanding for Devices/Cards — this is just 'Inventory'; Devices/Cards are just an example.
  User adds e.g. 20 cards generally; then from the detail page assigns 1 card to a workforce member with
  a date of collection (expiry date). This was in their requirements."). REVERSES T-059's rail split
  (content preserved — no-regressions law): (1) one rail module Inventory (Access Cards + Devices rail
  entries removed); (2) home = item-TYPE register (Access Card/Temp Card/Kiosk/Tablet/Card Reader…):
  KPI tiles + per-type total/assigned/available/due-back-soon; (3) "Add stock" flow: item type +
  QUANTITY (e.g. 20) → creates N units deterministically; (4) type detail page: stock stats + the T-063
  per-unit register + ASSIGN flow (unit → workforce member searchable + DATE OF COLLECTION + due-back/
  expiry) → persists, due-back reminder in Inbox, T-063 badges/toolbar standards kept; (5) re-route
  cross-refs: notification targets (PRESERVE fixer C's per-unit deep-link semantics), Pulse temp-card
  queue links, settings/RBAC refs. status: in-progress — dispatched (fixer N) after J landed/freed
  store.ts. T-075 LANDED + conductor-verified (wizard 4 steps, bus route removed/ops-derived,
  persistence + onboarding trigger + renewals feed proven; handoff routed: G prefers stored relation
  ids at profile read sites, I overlays store assignments incl. createWorker's projectId).
- **T-073-ADD3** (folded into fixer I; client): wizard Basics — Location → "Site Location" MULTI-select
  dropdown sourced from Zones (SearchableSelect grammar, chips; project.sites becomes plural — assignment
  mapping + zone-profile accessor + Review handle multi-site); REMOVE Contract Value from wizard+Review
  (keep in data; no "AED 0" rendering). Also: Assign buttons on Suggested Workers rows (existing assign
  action; live round-trip) + Skills Coverage "0 of 0" denominators fixed.
- **T-073-ADD2** (folded into fixer I; client): Staffing Gap MODEL update — columns Required (renamed) ·
  Assigned · AVAILABLE (matching-trade bench: workers not yet project-assigned, e.g. onboarding cohort —
  assign-all leaves this deterministic bench) · Gap = max(0, Required − Assigned − Available). Headline,
  Open Demand sheet, and the Pulse hiring-gap KPI ALL move to the new formula from one source (74==74 law
  under the new definition); Assign Workers flow surfaces exactly the Available bench.
- **T-073-ADD** (folded into fixer I; client: "super important"): Open Demand BREAKDOWN — the stat card
  becomes clickable → platform-standard raw-data sheet (project × trade gap rows w/ required SKILLS +
  aggregate by-trade header + CSV); project cards surface their gap composition; breakdown sums EXACTLY
  to the Open Demand total == Pulse hiring gap (one derivation source).
- **T-079** ifm-workforce: roster-conflict COVER ASSIGNMENT (client: "whenever there is a roster conflict,
  there should be a button 'assign worker' — then in the side-sheet we see those who are FREE for this
  shift — that would be cool for them"). On the Leave detail's Roster Check conflict: an "Assign cover"
  button → stacked side sheet listing workers FREE for that shift window (same site + trade, no shift at
  that time, not on leave, honest count + search), pick one → conflict row shows "Cover: {name}", persists
  (needs a store action — assignCover), reflects on the shift board if cheap. Sheet-stack law applies.
  BLOCKED: leave.tsx (fixer K) + store.ts (fixer J) both in flight — dispatch when both land.
  status: open — queued.
- **T-078-ADD** (folded into fixer M): remove the Timesheets toolbar "Submit (N open)" button (client).
  Keep Export + Draft badge + the underlying T-046 lifecycle/payroll handoff; report if any demo path
  (approval inbox notification) becomes UI-unreachable. Contract extended to timesheets.tsx if needed.
- **T-078** ifm-workforce+DS: shift edit sheet fixes (client): (a) Task select options embed the shift
  window in the name ("Security Patrol — Evening") while START/END TIME are separate fields above —
  redundant/conflicting; tasks become TIME-FREE names (window comes from the time fields; board/other
  surfaces derive "Task (start–end)" for display; sweep timesheet/attendance vocab consumers);
  (b) start/end time fields render TWO clock icons (icon-slot + external icon — same class as the T-062
  search-icon law) → one icon, fix at the DS ShiftPlanner level + vendor mirror.
  status: LANDED + conductor-verified (2026-07-13, uncommitted). 7 time-free tasks (SHIFT_TASKS; windows
  stay on slots; ids/timesheets untouched — totals byte-identical 11966:07/325:03); double clock = native
  webkit picker indicator, suppressed DS-side + mirrored; DS gates all PASS. Submit button removed
  (T-078-ADD) — REACHABILITY FLAG: with all periods seeding 'draft' and no Submit UI, approve/reopen +
  the "approved → handed to Payroll" inbox notification are UI-unreachable; submitPeriod/approvePeriod
  intact in data/timesheet.ts. WAVE-CLOSE decision: seed the PRIOR period approved/locked so the
  timesheet→payroll pre-fill demo story survives (or client reinstates submit elsewhere). Conductor
  fixed M's flagged out-of-contract leftover solo: op-center.tsx:786 stale 'Cleaning — Evening Shift'
  seed row → 'Cleaning — Detail'.
- **T-077-ADD** (folded into fixer L): Zones LIST refinement (client): drop the Description column
  (allocation/supervisor detail moves into the new entity profile anyway), tighten the eye-toggle ↔ zone
  name gap. DS-level ZonesView changes get flagged, not edited by L.
- **T-077** ifm-workforce: Zone detail → full ENTITY PROFILE (client: "Zone Details doesn't make sense —
  make this an entity profile"). Tabbed detail (worker-profile pattern): Overview (assigned project,
  worker count, present-right-now), Workforces (assigned workers list), Shift (site shift roster),
  Supervisors (assigned supervisors), Attendance Log (checked-in / expected, TODAY default), Details
  (zone fields + assigned project). Replaces the small allocation-vs-plan sheet (its table moves into
  Overview/Details). status: LANDED + conductor-verified (2026-07-13, uncommitted). All 6 tabs on DXB T3;
  counts reconcile 4 ways (2,000 assigned == Workforce site filter == roster 1,727 + 273 off ==
  attendance); cross-module worker drill-in verified w/ sheet-stack restore; width matched to the T-069
  profile target; typecheck clean. T-077-ADD done (Capacity column + spacing product-side).
  DS BACKPORT CANDIDATES flagged (wave-close): zones-view.tsx dead 15px chevron spacer on flat lists +
  no column-omission prop (ZonesView) — product carries scoped overrides until a DS pass.
- **STATUS ROLL-UP (2026-07-13, all uncommitted, conductor pixel-verified unless noted):** T-076+ADDs
  LANDED+verified (6 pipelines on StateTransitionToolbar via pipeline-controls.tsx; Offer&Docs removed,
  37→Joining=63; visual checkboxes; payroll TaskDetail re-skin + gate refusal proven; Worked/Overtime/
  Short Hours headers; comma-decimal root cause = input locale, fixed w/ lang="en-US"; promotion mix
  ~27%; Make-Permanent padding). T-080 LANDED+verified (one Inventory module; type register; batch add
  20; assign w/ date-of-collection; deep-links + persistence; access-cards.tsx/devices.tsx deleted).
  T-067 FULLY CLOSED after 3 iterations, conductor-verified (i1 semantics: avg per OT-participant;
  i2 seed: per-trade OT_PROFILE variance, WF-1005 20.8h consistent leaderboard==payroll, OT-MTD
  67,638.5h; i3 rendering: DashboardWidgetGrid kind:'bar' nested-grid width bug → direct BarChart,
  DS BACKPORT CANDIDATE flagged). Final chart: 7 full-width labeled bars 17.6/13.9/12/10.8/8.6/8.2/4.9h. T-069 FULLY CLOSED:
  fixer O landed + conductor-verified — tabs "Documents"/"Supervisor" full words, width
  clamp(1320px,72vw,1400px), zero tab clipping at 1600/1366/1280 (at 1280 the SHEET exceeds the
  viewport by 40px clipping identity-panel chars — DS BACKPORT CANDIDATES: Sheet primitive needs a
  maxWidth min(width,100vw) cap + EntityDetail tablist needs scroll/wrap fallback; acceptable interim,
  demo viewports ≥1366).
  T-071+T-079 LANDED + conductor-verified (fixer Q): audit trail threaded via ONE edit point
  (LifecycleTaskDetail timeline ← timelineFor, cap 10 + "+N earlier" marker; DESC→ASC feed bug caught;
  Leave full trail; Incidents secondary section cap 4); Assign-cover live (free = same site+trade, no
  overlapping shift incl. overnight, not on leave, live snapshot; assignCover store action in the
  custom bucket; "472 workers free" honest sheet; per-day Cover chips; "1 of 2 still need cover"
  banner; reload persistence + sheet-stack rect-identical restore). FOLLOW-UP flagged: cover not yet
  reflected on the shift BOARD (would reassign PlannedShift.workerId — recurring-series risk; needs a
  dedicated ticket + design decision). T-070 LANDED + conductor-verified (fixer P): 4 stages
  742/513/295/131, shared derivation w/ the profile tab (WF-1025 Visa consistent), live move + reload
  persistence, nt-06 deep-links to the exact card; Passport deliberately excluded (~8k-card flood —
  client call if wanted). WAVE-CLOSE (fixer R) DONE: 12px sweep finished (~102 swaps, zero-grep both
  trees), June 2026 seeded approved/locked (June punch detail empty = frozen-seed boundary), 11 bare
  toLocaleString fixed, 0 dead refs; ALL DS gates + product tsc PASS.
  POST-FIX UI RE-REVIEW: **FAIL** — 3 major / 3 minor / 2 nits (report + shots in scratchpad
  t065\REVIEW). Majors: (1) TaskInfoRow STILL clips date-range/long values (140px fixed label — the
  earlier truncate+tooltip was insufficient); (2) Doc Renewals action labels wrap 2 lines; (3) native
  <input type=date> via SchemaForm (Inventory assign + Capture Project) = ignored-existing-ds-component
  REPEAT. Minors: June zero-hours needs an honest notice; text-[9px] in check-in feed; nested <button>
  in MultiZoneSelect. Nits: "Fully staffed"/"No workers assigned" juxtaposition; decimal legibility.
  ITERATION 2 DISPATCHED: fixer S (DS: TaskInfoRow layout + SchemaForm → DS date picker) + fixer T
  (product: labels/9px/nesting/headline/June notice). Everything else passed the re-review clean. T-073/074+ALL ADDs LANDED + conductor-verified: 7,830 assigned via per-site
  deployment contracts (CT-DEP-01..12) + 210 genuine bench (new_joining/probation → Available source);
  Required/Assigned/AVAILABLE/Gap table live (Burj Khalifa Landscaper 26−19−5=2, red-highlighted);
  Open Demand raw sheet w/ by-trade header (Landscapers 3 · Laundry 2 · Supervisors 1 = 6) + required
  skills + CSV; 6==6 law under NEW formula (single source openDemandTotal in projects.tsx — derive.ts
  untouched); Suggested-Workers Assign round-trip + Skills Coverage denominators fixed; wizard: typed
  inputs, DS density, AED 100,000, MultiZoneSelect (DS gap: SearchableSelect single-only — backport
  candidate), no "AED 0". Yousef Hassan (client's example) shows real assignment. I's QA notes: 69
  residual history-before-joinDate edge cases (down from 2,353, documented); Available = global bench
  per trade (client's keep-it-simple). K flags: workers.ts timelineFor
  hardcodes promotion for one id (fix product-side landed in transfers.tsx; workers.ts cleanup =
  backport candidate); Leave moduleLabel chip wraps 2 lines (pre-existing T-044).
- **T-076-ADD** (client, folded into fixer K mid-flight): (a) side-sheet PADDING broken on the
  Make-Permanent confirm sheet (content flush to edges) — fix + sweep lifecycle sheets; (b) supervisor
  rating shows "3,5" COMMA decimal → formatting law; (c) Transfers board is ~all TRANSFER chips — seed a
  deterministic PROMOTION share (role-uplift semantics); (d) stage CHECKLISTS must be stage-specific
  (Exit "Final Settlement" showing "Training complete/Attendance ≥ 90%" is onboarding vocab — Final
  Settlement = clearance items: assets returned, final pay, visa cancellation…) AND render as a real
  VISUAL CHECKLIST (checkbox affordance, not x/✓ icon rows).
- **T-076** ifm-workforce: pipeline stage + status-update overhaul (client): (a) Onboarding: REMOVE the
  "Offer & Docs" stage (37 cards merge into Joining; entry trigger → Joining; docs-missing chips stay);
  (b) STATUS UPDATES on every pipeline TaskDetail — client: "in every pipeline we need more extensive
  fields and also status updates… this is totally pending… just add it everywhere". Config-driven stage-
  transition control (DS StateTransitionToolbar if present, else the DS TaskDetail action idiom) on ALL
  six pipelines (Onboarding/Transfers/Exits/Leave/Incidents/Payroll), rule-enforced via existing store
  actions (payroll approval gates NEVER bypassed; Probation keeps its time-based hint + manual move);
  (c) more extensive fields per pipeline TaskDetail (stage-relevant record fields from data).
  status: in-progress — dispatched (fixer K). Timeline threading into these details = T-071, after
  fixer G's timeline.ts lands.
- **T-075** ifm-workforce: Add Employee → extensive stepped creation flow (client: "why are we adding him
  to a bus route?"; "fields need to be same as in the details… extensive flow… assign his supervisors etc.,
  upload documents and against each document add the expiry"). REMOVE Bus Route from creation (transport is
  ops config, derived from camp/site — not an HR intake field). New stepped wizard (Capture Project
  precedent): 1) Identity & Employment (profile-Details-aligned fields: name, trade, site, camp, join date,
  employment type, basic salary, visa expiry); 2) Assignments (supervisor + hiring manager + trainer +
  reporting manager searchable selects, project from the site's projects); 3) Documents (repeatable rows:
  doc type + per-document EXPIRY + simulated file upload); 4) Review → Create. createWorker store action
  extended (supervisor/managers/docs); created worker appears in list + Onboarding pipeline (T-042 trigger
  intact) + docs feed Document Renewals. status: in-progress — dispatched (fixer J).
- **T-074** ifm-workforce: Capture Project wizard fixes (client screenshots): (a) Staffing Needs per-trade
  +/− steppers → numeric INPUT fields (typeable headcounts); (b) spacing fixed (rows overly tall/airy —
  DS density); (c) also spotted: Review tab "AED 100.000" uses a dot thousand-separator — violates the
  T-056 formatting law (nf) → "AED 100,000". Folded into fixer I's running contract (owns projects.tsx).
  status: in-progress — assigned to fixer I mid-flight.
- **T-072** DS+ifm-workforce: raise the minimum text size 10px → 12px (client: "text sometimes is too
  small… just a central update in the design right?"). Central token-level change in the DS type scale
  (+ vendor mirror + product css); sweep raw text-[10px]/0.625rem stragglers. Files owned by in-flight
  fixers get listed, not edited — post-wave sweep closes them. Verify dense spots (badges/chips/table
  headers/kanban meta) don't break at 12px. status: LANDED + conductor-verified (2026-07-13, uncommitted):
  --text-caption 10px→12px (+line-height 14px) central; 47 DS files + 6 product files swept + mirrored
  byte-identical; ALL DS gates PASS; dense surfaces pixel-verified clean. DEFERRED straggler list (file:line
  → text-caption swap) for fixer-owned files (app-shell/map/zones + workforce/attendance/op-center/
  worker-detail/projects) = post-wave sweep, in H's report. WAVE-CLOSE CHECK: H edited leave.tsx/
  incidents.tsx/onboarding.tsx/timesheets.tsx BEFORE fixers K/M took those files — reconcile diffs when
  K/M land (verify no lost class swaps; re-grep text-[10px]).
- **T-073** ifm-workforce: assign EVERY worker to a client project (client: "pls assign all to projects —
  but make sure all of this data is also reflected in the projects"). No more "deployed directly to
  <site>" workers: contracts.ts assignment records cover all 8,040 (deterministic, site→project mapping);
  Projects module re-derives (allocated/meters/fulfillment/workforce-deployed); COHERENCE: Pulse "Hiring
  gap across contracts" must still equal Projects openDemand (74==74 law from T-038) — open demand stays
  because REQUIRED headcount exceeds supply, not because workers sit unassigned; profile Current
  Project/Projects tab reflect automatically via data (worker-detail.tsx untouched — fixer G owns it).
  Long-tenured workers get 1–2 PRIOR assignments (history; feeds the T-069 timeline).
  status: in-progress — dispatched (fixer I).
- **T-067** ifm-workforce: Ops Center punch list (client, 2026-07-13): (a) REMOVE the Action Queue panel
  entirely; (b) "Overtime Hours by Trade" chart renders EMPTY for all trades AND its scale reads in the
  thousands — client: plausible per-trade figures ~10–20h max. Fix the empty render (suspect the same
  string-fed-math class as QA-1 or a broken data path off the leaderboard) + make the semantics honest
  (e.g. avg OT h per OT-participating worker by trade) while staying coherent with the 16,714.1h MTD total.
  status: in-progress — (a) Action Queue removal DONE + conductor-verified on pixels (layout rebalanced:
  site chart + check-in feed share the row); (b) ITERATION 2 NEEDED: fixer E's avg-per-OT-worker chart is
  honest but renders THREE IDENTICAL 2.8h bars (per-worker OT propensity is uniform in the seed, so trade
  averages converge) — reads as broken data, fails the client bar. Root fix = per-trade OT propensity
  variance in attendance.ts's otH generator (target ~8–22h/mo per participating worker, trades visibly
  different; OT-MTD KPI / payroll / timesheets re-derive from the same source so coherence holds).
  attendance.ts is fixer F's file — iteration dispatches AFTER F lands.
- **T-068** ifm-workforce: Live Monitoring stability + geo hygiene (client): (a) crashes under the full
  worker load — cap the demo surface at 500 workers with an honest "Showing 500 of N" label; (b) some
  worker positions render IN WATER — constrain position jitter to land (coastal sites: Palm/Atlantis
  class; T-031 land-parcel precedent). status: LANDED + conductor-verified (2026-07-13, uncommitted).
  Cap: Hamilton-proportional 500 across all 12 sites, "Showing 500 of 5,156 on shift" honest header
  (zero DS edits), counts stay full-population; DOM 237k→~14k nodes, heap ~380MB→~100MB, 3 fresh loads
  0 errors. Water: jitterInsideZone (deterministic rejection sampling vs zone polygon) — 0 of 8,040
  outside their polygon, coastal before/afters decisive; journey-map consumer re-verified. DS BACKPORT
  CANDIDATE flagged: live-monitoring-view + map-view rebuild the FULL marker set per selection
  (JSON.stringify keying) — O(n) per click, will bite at higher caps. OT-variance iteration (T-067 i2)
  dispatched to fixer E now that attendance.ts is free.
- **T-069** ifm-workforce: Worker profile package (client): (a) detail sheet takes too much space
  (width: min(1760px,98vw) @ worker-detail.tsx) → right-size it; (b) "Site location is where?" → Overview
  gets a MAP WIDGET showing the worker's site/current location; (c) Document Renewals tab → proper
  clickable list w/ search + filter; (d) EXTENSIVE worker timeline (requirements: audit trail): full
  history — onboarded, supervisor assigned, project assigned, clock-ins, leave, renewals — via a new
  src/data/timeline.ts derivation. status: in-progress — dispatched (fixer G).
- **T-070** ifm-workforce: Document Renewals as its OWN pipeline module (client: "should be its own
  pipeline… add a separate pipeline for it as well") — new rail pipeline (stages e.g. Upcoming → In
  Progress → Submitted → Completed) derived from doc/cert expiries; cards → TaskDetail; cross-refs
  (inbox targets). BLOCKED until fixer C lands (App.tsx contract). status: open — queued.
- **T-071** ifm-workforce: extensive timelines EVERYWHERE (client: audit trail in requirements) — thread
  the T-069 timeline derivation into the TaskDetail Timeline tabs of lifecycle/leave/incidents/projects.
  BLOCKED until fixer C lands (file contract). status: open — queued.
- **T-065** ifm-workforce: FULL platform review-fix program (client: "too many UI/UX issues as well standard
  DS component usage issues — fix everything, QA, UI/UX designer go through properly"). Three reviewers
  (ui-designer · ux-designer · qa) sweep all 17 modules with explicit lenses: bespoke compositions where a
  DS component exists (the #1 named complaint), visual polish (spacing/hierarchy/typography/token use),
  interaction correctness (incl. re-verifying the T-064 sheet-stack cycle + judging the 100vw raw-sheet
  emptiness with 3 rows), all accumulated laws. FIX AUTHORITY GRANTED — findings go straight to fixers.
  CLIENT BAR (standing): "don't give me ugly broken UIs" — the fix wave ships NOTHING unverified: every
  fixer must pixel-screenshot every surface it touched AND the conductor re-reads each before commit; any
  fix that changes layout gets a before/after pair; a post-fix RE-REVIEW pass (ui-designer) runs over the
  changed surfaces before the batch is called done. No DOM-only verification for anything visual (T-062
  lesson).
  status: in-progress — ALL THREE REVIEWS IN (UI 7 findings 4maj/3min · UX PASS w/ 4 findings 3med/1low ·
  QA FAIL 6 defects 4maj). First fix wave (4 fixers, disjoint contracts) DIED on usage limits before touching
  code (2026-07-13); working tree verified clean; wave relaunched from a fresh session. FINDINGS SNAPSHOT
  (persisted here so no session loss can drop them):
  - QA-1 (maj): Pulse stacked bars fed comma-formatted strings → NaN → T-058 zero-segment guard silently
    drops every category ≥1,000 ("Presence Right Now" 0 green despite 4,539 in-zone 88%; "Check-in Channels"
    hides Kiosk+Mobile = 74% of check-ins). operations-center.tsx.
  - QA-2 (maj): "Group by: Site" groups only the current 100-row page — Burj Khalifa 49 vs true 560, no
    page-scope hint. workforce.tsx.
  - QA-3 (maj, 2nd hit of badge-variant-collision): Contract + Permanent employment badges resolve to the
    SAME blue token — the T-061 column is unreadable.
  - QA-4 (maj): "Lost card blacklisted"/"Temp card expiring" notifications open the whole card pool, not the
    card's own detail (Devices notifications in the same file do it right).
  - QA-5 (min): long Project value overlaps the Balance label in the Leave detail sheet.
  - QA-6: intermittent "STREAM is not defined" (1/~10 sessions) — no such identifier in code; stale dev
    chunk across the T-066 edit; server restarted; confirm gone via repeated fresh sessions.
  - UI-1: raw-sheet base width content-aware (3-row sheet ≠ 8,040-row 75vw; scale to content w/ cap).
    ESCALATION DECIDED: the expand-to-100vw on drill STAYS (explicit T-054 client spec) — base width only.
  - UI-2: three sibling kanbans render the urgency chip 3 ways (Onboarding solid red vs Leave/Incidents soft
    tints) → standardize DS soft-tint. UI-3: same record CRITICAL amber on incident card vs red in Inbox →
    one severity→tone map. UI-4: hand-rolled pill where Badge exists. UI-5: two divergent tint recipes → one
    helper. UI-6 (DS gap): kanban columns render fully blank when empty → emptyState slot.
  - UX-1 (med): Workforce + Attendance custom tables drop the DS empty-state copy on zero search results
    (bare "No matching records"). UX-2 (med): all six pipeline kanbans show NOTHING on zero-result search
    (empty pastel columns, "0" counts) — same DS gap as UI-6, one fix clears both. UX-3 (med): "Create New
    Zone" toast lands on the create panel's Cancel/Create buttons. UX-4 (low): map surfaces blank gray
    1–3s while tiles load → loading overlay until first paint.
  - UX also re-verified the T-064 sheet cycle end-to-end on the live build: HOLDS.
  Fix wave contracts: A=Pulse math+sheet width (op-center) · B=group-by/badges/table empty states
  (workforce) · C=notification deep-links + unified chips · D=DS surfaces (kanban emptyState, detail
  truncation, map overlay, toast occlusion) + vendor mirror. Visual gate per T-065 header applies.
  PROGRESS: A,B,C,D ALL LANDED + conductor-verified on pixels (2026-07-13, uncommitted). D also
  recovered the vendor-mirror staleness (types.ts/AppShell.tsx synced from vendor HEAD, bogus
  app-shell$f deleted, zero pre-existing deletions, DS gates green, product tsc green).
  WAVE-CLOSE CHECKLIST: (1) post-fix ui-designer re-review over all changed surfaces; (2) commit per
  batch after re-review; (3) H's deferred 12px straggler list (owned files); (4) reconcile H's edits in
  leave/incidents/onboarding/timesheets with K/M diffs; (5) platform-wide ABBREVIATION sweep (client:
  no guess words — "OT H" also lives in the Pulse Violation Leaderboard header, op-center.tsx free);
  (6) UI re-review judges: D's zone-toast spacer workaround (clean fix = Toaster offset in App.tsx),
  From→To date-range ellipsis in detail grids (tooltip ok, maybe widen/wrap), B's solid-blue Contract
  badge weight, E's 3-bar OT chart pending variance iteration (behind F).
- **T-066** ifm-workforce: sim-engine coherence remainder (flagged in T-038 p2, deferred): Pulse's
  buildStream live-simulation STREAM + buildQueue probation/urgentDocs cards + derive.ts's shared
  violationLeaderboard/actionSignals/sitePresence still read STATIC worker arrays — store mutations
  (create worker, confirm permanent) don't reflect there. Route them through store snapshots (keep
  memoized perf: derive on snapshot identity change, not per call).
  status: **resolved** (2026-07-13) — commit pushed; live-proved in one continuous session (create worker →
  8,041 across KPI/queue/leaderboard without reload; confirm-permanent → queue 31→30); recompute ~611ms at
  8k (vs the original 17-20s regression class). derive helpers take optional workers param (WeakMap-memoized
  per array reference; callers unchanged). HONEST REMAINDER (documented in-code): sitePresence/SITE_PRESENCE
  still static — sole source TODAY_ATTENDANCE lives in attendance.ts (out of scope); needs an attendance-
  scoped follow-up, not a silent workaround.

- **T-064** ifm-workforce: Pulse raw-data sheet didn't revert after the stacked incident detail closed.
  from: client ("when i close incident side sheet the bottom raw data side sheet doesn't revert back").
  TWO root causes: (a) nothing collapsed the `expanded` flag — the shell's ModuleRenderContext gained a
  backward-compatible `detailOpenCount` (0 = closed/minimized; DS + mirror) and the Pulse collapses on 0;
  (b) Radix leaves a background modal INERT (pointer-events: none) after the modal above it closes — the
  raw sheet reasserts pointer-events: auto (safe: a stacked detail's overlay intercepts while open).
  SHEET-STACK law addendum: any module stacking its own Sheet under the shell DetailSheet must handle BOTH
  reverts — geometry AND interactivity.
  severity: major · status: **resolved** (2026-07-13) — commit pushed; verified live through the full
  open→drill→stack→close cycle (75vw + interactive restored).

- **T-063** ifm-workforce: Access Cards per-card entity + status/toolbar standards. from: client ("each
  access card could be handled as entity with columns ID, Assigned To, Assigned On… two KPI cards on top:
  Total/Assigned/Remaining; temp or permanent can just be a tag"; "devices status column should show same
  as other status columns — we are building a standard product not custom"; "group by should be in top row,
  same structured as other fields").
  Delivered: (1) Access Cards = entity register (one row per card, Type tag, standard status badges
  Assigned/Available/Lost/Expired, holder link, due-back highlighting) + 3 KPI tiles; Issue/Return on the
  card; reminders deep-link per-card. (2) Devices statuses = standard Badge chips (variant-mapped, pairwise
  distinct). (3) NEW DS ModuleConfig.toolbarSlot (mirrored) — Workforce Group-by is a toolbar field
  ('Group by: None'), extra row removed. STANDARD-PRODUCT rule reinforced: one status treatment (badges),
  one toolbar grammar, everywhere.
  severity: major · status: **resolved** (2026-07-13) — commit pushed; verified live DOM (KPI tiles +
  7-column card register w/ 45 rows + badges; group-by inside toolbar, old row gone; device chips render).

- **T-062** ifm-workforce: search-icon paint bug + three toolbar cleanups. from: client ("why is the search
  field missing search icon, feels broken"; the unclickable filter button; "unnecessary row of text inside
  Project Module"; Skills trade pills "can be added in filter or as a separate pinned field filter").
  ROOT CAUSE (not a missed icon): the DS Input primitive's POSITIONED inner wrapper paints over any
  externally-positioned icon at equal z — icons existed in the DOM everywhere but were covered wherever the
  input bg was opaque. Fixed classwide: z-10 on all 12 external search icons (mirrored); LAW ADDENDUM: new
  compositions use Input's own `leadingIcon` slot (immune by construction). Also: ShiftPlanner decorative
  Filter button deleted (decorative-unwired-control 2nd hit — lens already mandatory); Projects subtitle
  row removed; Skills trade pills → pinned SearchableSelect field filter.
  severity: major · status: **resolved** (2026-07-13) — commit pushed; pixel-verified (Shifts toolbar icon +
  no filter button; Skills pinned filter; Workforce Shifts search icon visible).

- **T-061** ifm-workforce: Workforce status model split. from: client ("active/inactive is a GENERAL entity
  status — will it share data with us; there should be another status column, e.g. workforce (permanent,
  contract, probation) — column names to the UX Designer").
  Delivered: Status = platform entity state (Active/Inactive, Inactive = exited); NEW 'Employment' column
  (UX naming: the standard HR term, keeps 'Status' unambiguous) = Probation (lifecycle override) / Contract /
  Permanent, tones pairwise-distinct and distinct from Status green. Worker.employmentType added additively
  to the spine (~18% Contract, deterministic); createWorker defaults; both list facets updated.
  DESIGN RULE captured: 'Status' on any entity register = platform liveness; domain-specific states get
  their own named column.
  severity: minor · status: **resolved** (2026-07-13) — commit pushed; verified live DOM (columns
  Status+Employment; page-1 mix 99/1 active/inactive, 77/19/4 perm/contract/probation).

- **T-060** ifm-workforce: Workforce list drops the live-status avatar dots. from: client ("remove these
  circle badges next to avatar, keep it simple — these are only relevant inside Live Monitoring").
  Design rule captured: PRESENCE state is Live Monitoring's vocabulary; the Workforce register is an HR
  identity surface — plain initials avatars only (the employment-status Badge column stays; it's a
  different, register-appropriate status). Removed the chip + tooltip + per-row live-status derivation.
  severity: minor · status: **resolved** (2026-07-13) — commit pushed; verified live DOM (100 rows,
  avatars, 0 dots).

- **T-058** ifm-workforce: OPEN — Pulse coverage semantics + searchable site selects + Reports on the DS
  reports type. from: client walkthrough (2026-07-12, NOT yet dispatched — handed off).
  (a) Site Coverage widget reads 'Fully covered 0 / Partial 12 / Coverage gap 0' with an ALL-RED bar —
  thresholds too strict at 8k (some late/absent at every site ⇒ nothing is ever "fully" covered) AND the
  bar segment tones look mis-mapped (12 partial should render WARNING, not error). Define bands off
  coverage %% (e.g. full ≥95%%, gap <85%%, partial between) in operations-center.tsx's Site Coverage panel;
  broader client mandate: "all the data should be interlinked and should make sense everywhere and nothing
  should be empty" — sweep every Pulse panel/KPI for zero/empty readings caused by over-strict thresholds.
  (b) Site (and similar location) dropdowns become SEARCHABLE selects: popover w/ the DS search pattern +
  radio options ('All' first, then options), options SOURCED from the Zones/POIs modules with the module
  icon next to each (sites = zones → Map01; POI-sourced → the POI module icon). Check DS barrels for an
  existing combobox first (LabeledSelect in settings/field-select.tsx is the closest shell); likely a new
  DS component (kit-lift + vendor mirror). Apply to: Workforce Shifts Scheduling+Timesheets site selects,
  Pulse filter-row All Sites (and All Trades if trivially reusable).
  (c) Reports module must be the DS `reports` MODULE TYPE with its ReportsHome home page — the T-053
  extraction wrongly rebuilt it as `type:'dashboard'` w/ report-pill tabs (client: "see again reports
  module in DS how it's built with proper home page"). DS contract confirmed: module-registry `reports`
  (tabKind 'instance', ctx.activeTab.render) + AppShell's full plumbing (ReportsHome cards + 'All Reports',
  ReportsTopNav open-report tabs, saved reports, + New Report via CustomReportBuilder — reports.tsx already
  imports the builder pieces). Rebuild src/modules/reports.tsx as type 'reports' with the 3 system reports
  as report tabs; keep the T-046/T-056 fixes (CSV export, date-range logic, people icons, nf formatting).
  severity: major · status: **resolved** (2026-07-13) — commits 770a82a + 170f25f (PUSHED). Verified
  v55-t058-01..11: coverage bands (12/0/0 today, 11/1/0 yesterday w/ correct green+amber bar — root cause
  was zero-value breakdown segments painting FULL WIDTH over real ones, fixed for all four Pulse panels);
  SearchableSelect (NEW DS basics component, spec'd + mirrored) live in Shifts/Timesheets/Pulse w/
  Zones-sourced options + Map01 icons; Reports = DS reports module type w/ ReportsHome. Recovered from an
  API-session-limit failure via transcript resume — no work lost.
- **T-059** ifm-workforce: OPEN — REPLACE Inventory with two modules: Access Cards + Devices. from: client
  ("Access Cards should be a separate module for better management and assigning"; "Devices as a separate
  entity can be a module with a list of all devices, so you can remove Inventory then").
  Scope: (1) NEW rail module **Access Cards** — the card stock pools (Access/Temp) + issue/return flows +
  due-back reminders + assignment history (all built in T-047 — RE-HOME per the T-053 pattern: export views
  from inventory.tsx into a thin module composition, don't rebuild). (2) NEW rail module **Devices** — an
  ENTITY module listing all serialized devices (kiosks, tablets, card readers: site, status, assignment
  trail detail — the existing device rows/detail from inventory.tsx re-homed onto the standard entity list
  chassis w/ search/facets). (3) DELETE the Inventory module from the rail (inventory.tsx stays only if it
  still owns shared logic — prefer moving ownership into the two new module files). (4) Update every
  cross-reference: inbox notification targets ('inventory-item'→ Devices, 'inventory-stock'→ Access Cards
  in App.tsx's router + data/notifications.ts), Settings permission areas + RBAC role refs, Pulse temp-card
  queue links, store actions stay as-is (createInventoryItem/issue/return — data layer unchanged). Rail
  placement: both where Inventory sat. Laws apply (entity toolbar standard, row hover/pointer, separators,
  no dead controls).
  severity: major · status: **resolved** (2026-07-13) — commit 770a82a; verified v56-t059-01..11 (rail
  Access Cards + Devices, no Inventory; issue round-trip 29→30 w/ inbox reminder + click landing + reload
  persistence; Devices entity list + trail detail). settings.tsx needed NO edit (its curated permission
  subset never listed inventory); zero 'inventory' routing refs remain (grep-verified). Recovered from an
  API-session-limit failure via transcript resume — no work lost.

- **T-057** ifm-workforce: all 4 QA-sweep findings fixed + demo insurance ("don't stop until you have fixed").
  from: the T-054-ordered analyze-first QA functional audit (4 findings; 5/5 persistence flows and all
  cross-references had PASSED).
  fixed: (F1) DS DonutChart single-100%-slice invisible ring → one datum renders a plain SVG circle
  (verified live on a fully-punctual worker: 1 stroked circle, 0 pie paths); (F2) Workforce list paginated —
  207,504 DOM nodes / ~450MB heap → 1,896 nodes, 'Showing 1–100 of 8,041 · Page 1 of 81'; (F3)
  Scheduling/Timesheets scope-mixed counts → 'Showing 200 of 200 workers at this site · 8,040
  platform-wide'; (nit) Settings permission areas reflect the 3-pipeline split. PLUS the audit's hardening
  suggestion: per-module ERROR BOUNDARY in AppShell (keyed by module id, in-place Retry) — one module's
  runtime error can never white-screen a client demo again. DS changes (donut, AppShell) mirrored.
  severity: major · status: **resolved** (2026-07-12) — commit cae6bbd (PUSHED); all verified live via DOM.

- **T-056** ifm-workforce: all 17 UX-sweep findings fixed on client approval ("fix all").
  from: the T-054-ordered analyze-first UX audit (17 findings: 13 major / 2 minor / 2 nit).
  fixed: 5 module-switching violations (skills holders, projects assigned+suggested, queue Open-in-Leave/
  Open-worksheet → all stack sheets in place); 10 formatting issues via ONE shared formatter
  (src/data/format.ts: nf + aedCompact) — incl. the 25.6M-vs-25608k same-run inconsistency and the DS
  report-table footer; Zones rows now open a persistent detail sheet (allocation-vs-plan table, clickable
  supervisor) instead of a toast; DS ContractCard truncation gains a title tooltip. DS changes mirrored.
  NOTE: the audit's 'implausible 567,599.9h OT' was 56,759.9h misread for lack of a separator — the
  formatting law prevents false data-integrity alarms too.
  severity: major · status: **resolved** (2026-07-12) — commit 6513a1c (PUSHED); verified via live DOM +
  screenshots (Reports tiles 4,303/2,439/1,968/1,846 + Showing 10,556 items; payroll cards Net AED 25.6M /
  OT 16,714.1h; queue shows Review requests/Review lines, Open-in-* gone). QA functional sweep still
  running — findings go to the client next.

- **T-055** ifm-workforce: Compliance band → standalone widgets + widget-standard leaderboard + rules strip
  removed. from: client walkthrough ("can't we make these separate widgets rather than one big section";
  leaderboard = fixed-height scrollable widget WITH search per Figma 30836-8263 (High Risk Drivers); RAG =
  subtle row-background tints per Figma 24337-7880, not a dot column; "what will user do with rules on front
  end — these are backend config things in settings").
  classes: backend-config-on-frontend (2nd — WPS & Employer page T-034 was the 1st → PROMOTE: review lens);
  oversized-section-not-widgets (1st).
  status: **resolved** (2026-07-12) — commit c376e07 (PUSHED); DS DataTable gained rowClassName (mirrored).
  Verified via live DOM (three separate widgets, search present, 100 tinted rows + severity score bars,
  'Showing 100 of 6,526 workers with violations' honest — conductor also caught+fixed the count including
  zero-violation workers; 'Rules in force' absent). Renderer-busy screenshot timeouts — visual pass rides
  with the running UX sweep.

- **T-054** ifm-workforce: Pulse UX laws (client). (1) KPI label 'Open critical incidents' → 'Critical
  Incidents' (labels read clean, not sentence-y); (2) INTERACTION LAW: dashboards never switch modules for a
  record — KPI → raw-data sheet → row click → sheet expands to FULL + the record's TaskDetail opens OVER it
  (sheet-over-sheet); the T-037 openModule deep-link from the incidents sheet REPLACED; (3) thousand
  separators on every count (5,008/5,156 · 8,040 · 2,226…); (4) client also ordered an ANALYZE-FIRST sweep:
  QA+UX agents audit the whole platform for similar mistakes and REPORT (no fixes until client approves) +
  the DS review panel (UI/UX/QA) now carries these as mandatory checklist lenses (review-fix.js updated).
  severity: major · status: **resolved** (fixes) (2026-07-12) — commit 4532864 (PUSHED); verified
  v52-pulse-commas2 + v52-sheet-stack3 (full-width raw sheet behind, incident TaskDetail stacked over it).
  Analysis sweep: in-progress (report-only, findings go to the client for approval).

- **T-053** ifm-workforce: T-046 BROKE the Reports module + three overlapping time modules → consolidate.
  from: client walkthrough ("i think you broke the reports module itself — the feedback was related to the
  report inside reports module"; "now we have attendance as well, timesheet as well, workforce shifts module —
  three things, maybe just need one with different views. Module name Workforce Shifts, views Scheduling,
  Timesheets, Attendance Logs. properly think before breaking a module").
  defect (new class: module-restructure-overreach, 1st): the T-046 agent was asked to fix a REPORT inside
  Reports ('Visual timesheet') and instead restructured the module itself — renamed it 'Timesheet & Reports'
  and demoted Reports to tab 2. Feedback about a module's CONTENT is never a mandate to restructure the module.
  fix: (a) restore **Reports** as its own rail module (keep the T-046 report fixes: CSV export, no Save,
  fixed Generate; DROP the broken 'Visual timesheet' report — the real timesheet now lives elsewhere);
  (b) NEW module **Workforce Shifts** with three views: **Scheduling** (the ShiftPlanner board),
  **Timesheets** (the TimesheetGrid + lifecycle), **Attendance Logs** (the attendance list + day-case) —
  replacing the three separate modules on the rail; cross-references (inbox targets, openModule ids) updated.
  severity: major · status: **resolved** (2026-07-12) — commit f8a8fde (PUSHED); verified v51-ws-01..07
  (rail: ...Zones → POIs → Workforce Shifts → Reports → Leave...; all three views intact w/ identical
  numbers; Reports home = Attendance Exceptions/Site Coverage/Overtime Summary/+New Report, no Visual-
  timesheet). Gotcha logged: dashboard-type tabs don't get the shell's entity toolbar (TOOLBAR_TYPES) —
  Attendance Logs owns its own law-compliant toolbar now.

- **T-051** ifm-workforce: Shifts module punch list — MISSED at intake (client walkthrough msg 2), caught in
  the coverage re-analysis. (1) shifts are pre-configured + recurring → the planner must navigate PAST and
  UPCOMING weeks, materializing recurring series across periods, not just the current week; (2) the shift
  side-sheet is not functional → must save; (3) Edit-shift shows a WORKER dropdown while editing a specific
  person's shift — remove it (edit is contextual to the row's worker); (4) edits must actually apply and
  reflect on the board (persist via T-049 store when present); (5) don't split the edit sheet into 2 tabs
  when the first tab has 2 fields — one page. DS ShiftPlanner-level work + vendor mirror.
  severity: major · status: **resolved** (2026-07-12) — commit 54bf26b; verified v21-shifts-* (past/current/
  future weeks populated, one-page contextual edit sheet, store round-trip). DS gained
  ShiftPlanner.filterSlot; two pre-existing DS O(n²) scaling bugs (shiftConflicts, per-cell grid filters)
  indexed to O(n); conductor also fixed the T-040 leftover (zones-demo onUploadKml) breaking the DS build
  gate. Site-scoped at 8k: 'Showing 200 of 8040 workers'.
- **INTAKE MISS (process defect, conductor)**: a 14-section client message produced 13 tickets — Shifts was
  dropped. New rule: on any multi-module punch list, COUNT the module sections and verify ticket coverage
  1:1 before dispatching anything. Logged in learnings.

- **T-050** ifm-workforce: Payroll module rebuilt per the R&D plan ("Payroll Module — R&D and Plan.md",
  D:\Claude Projects\Product Designer\). from: client prep. Research validated: pay-run state machine
  (Draft → Under Review → Approved/Locked → Paid), pay elements, transparent gross-to-net, variance review,
  segregation of duties, WPS SIF (SCR+EDR) — matches Workday/Rippling/Zoho/Deel practice.
  Build (on the 8k spine + T-049 store): (1) pipeline board stays (runs as cards; rename 'Reviewed' →
  'Under Review'; lock semantics from Approved); (2) create-run step: period + population (pay group:
  all/site) → pre-fills gross-to-net from Attendance/OT/Leave — never re-entered; (3) HERO worksheet detail:
  per-employee grid (worked h, OT h, leave, under h, basic, allowances, OT pay, deductions, gross, net),
  every value overridable via store `updatePayrollLine` (override marked + logged in run timeline), variance
  flags vs June run (Δ% badges on spikes), row comments, footer totals, Recalculate; paginated/searchable at
  8,040 lines; (4) payslip preview per employee (itemized earnings/deductions/net); (5) preparer ≠ approver
  control demoed on the stage transitions + audit trail on the run timeline; (6) 'Generate WPS bank file'
  action on Approved runs → structured SIF (SCR header + EDR per employee — generator exists in
  data/payroll) + a payroll-register report; (7) worker profile 'Payroll' tab gains the salary structure +
  bank/WPS identity fields (basic/allowances split, IBAN, 14-digit labour card, agent routing); (8) Settings
  gains a small Pay Elements config (typed earnings/deductions + rule strings). Calc engine deliberately
  formulaic per the plan §6. severity: major · status: **resolved** (2026-07-12) — commit 6419c2c; verified
  v29-pay-01..13 (Under Review board, create-run w/ population scoping + off-cycle types, paginated 8,040-line
  worksheet w/ June-variance badges + field-level overrides + full-run totals + audit timeline, payslip w/
  real WPS identity, preparer=approver REJECTED then locked on real approval, WPS SIF gated to Approved).
  Agent also fixed: dead-code Timeline aside, Dialog-behind-Sheet z-index (same DS layering class as T-041),
  drag-bypass of the approval gate. AUDIT items: DialogOverlay backdrop stays behind the sheet (DS primitive
  lacks overlay className); worker-detail Payroll tab still says 'Reviewed' (stale label).

- **T-048** ifm-workforce: Settings › Event Configuration must be FULLY functional and internally linked.
  from: client prep ("creating new events should be fully functional, all fields linked with each other —
  we need to show this"). Create/edit wizard: event type ↔ trigger options ↔ criticality ↔ entity scope pull
  from the REAL platform entities/rules (thresholds from RULES, sites from data, trades as scopes); a created
  event appears in the catalog, toggles, edits, persists (via T-049 store), and — demo money-shot — a
  matching signal surfaces where events surface (Pulse/inbox). severity: major · status: **resolved** (2026-07-12) — commit e33f28e; verified v28-events-01..11
  (type→trigger linkage, real scopes, full edit hydration, reload persistence, armed-event inbox item,
  Pay Elements page). DS EventConfigSheet gained eventTypes/entityScopeLabel/assetTypeLabel props
  (mirrored+spec'd). AUDIT items: armed notification doesn't survive reload while App.tsx binds Inbox to
  the static NOTIFICATIONS import (T-047 owns); 'Zone Based / Trip Location Based' flags in the sheet are
  fleet vocab.
- **T-049** ifm-workforce: central reactive data store — one dataset, cross-module writes, persistence.
  from: client prep ("all modules use the same data; when we create/update anything anywhere it should
  reflect — even in local storage — they should see a record move from one point to the other; platform
  should be data rich").
  architecture: `src/data/store.ts` — deterministic 8k seed (T-038 generators) + a persisted DELTA OVERLAY
  (user mutations only: creates/updates/deletes/stage-moves) in localStorage (versioned key; seed-version
  bump invalidates stale overlays; localStorage can't hold 8k records — the overlay stays tiny). Subscribe
  via useSyncExternalStore; ALL module reads move to store selectors; ALL mutations become store actions
  (approveLeave, addWorker, moveStage, issueCard, assignToProject…) so a change in one module reflects in
  every other + survives reload. Every queued module ticket (T-041…T-048) builds on these actions.
  severity: blocker (foundation) · status: **resolved** (2026-07-12) — commit a1bf605; verified v49-*
  (create worker → appears in Lifecycle → survives reload; leave approve persists; delta log ~1.4KB, boot
  ~2ms). 12 modules wired; also fixed an inventory id-collision + a real-clock new Date() in incidents.
  AUDIT item (flagged): Payroll worksheet renders 8,040 unpaginated input rows — T-050 fixes.

- **T-039** ifm-workforce: Live Monitoring client punch list. from: client walkthrough.
  (1) marker click keeps zoom, fly+center only; (2) worker markers get NAME LABELS like vehicle titles,
  abbreviated "Abusufean A."; (3) hybrid list first column clipped; (4) audit map positions vs location names;
  (5) POI overlay must render POI ICONS not dots; (6) zone hover shows zone name; (7) duplicate maximize
  control (top+bottom) — keep one; (8) Layers button unwired — wire or remove; (9) list redesign to the HRMS
  reference: shift elapsed/left emphasized, status via avatar tint ONLY (drop the duplicate badge), status
  explanation on HOVER (tooltip). type: defect · severity: major · status: **resolved** (2026-07-12) —
  commit 4053623; verified v19-geo-* (labels at 5,156-worker scale via MapLibre symbol layer — DOM markers
  would freeze; zoom-preserving fly-to; POI teardrops on the monitoring map). Position audit: client anchors
  match; the flagged ST-04 One&Only 'discrepancy' was against a wrong reference in the dispatch prompt —
  on-land placement verified twice (T-031, T-039), data kept as-is.
- **T-040** ifm-workforce: Zones/POIs consistency + interaction punch list. from: client walkthrough.
  Zones: whole ROW clickable (LAW: every list row everywhere gets hover + cursor-pointer), alignment/density
  fixes, remove Upload KML, remove dead hierarchy toggle, zone-create must draw on map, zone hover shows name.
  POIs: skeleton must MATCH Zones (search misplaced full-width above map), POI click + create broken, markers
  too small, drop the redundant List View tab, view-set parity between the two modules.
  type: defect · severity: major · status: **resolved** (2026-07-12) — commit 4053623; verified v19-geo-*
  (PoisView on the Zones chassis, click-to-place PoiCreate w/ new 'point' draw mode, 38×46 markers, both
  module types register hybrid-only). Zone create now fitTo's the NEW zone (fitToContent was zooming out to
  the whole dataset). New DS components: zone-create 'point' mode + poi-create.tsx.
- **T-041** ifm-workforce: Workforce module + entity profile enrichment. from: client walkthrough.
  List: avatar initials + live-status tint (monitoring-style); Group By must work (or group-by in list);
  create-employee dropdowns dead; created employee must appear in list. Profile: wider sheet (tabs wrap),
  richer Details tab, supervisor clickable in overview + OWN linked-entity tab w/ history, hiring
  manager/trainer/reporting manager fields, current Project in overview + own tab, functional document-upload
  sheet (padding too), real Add-Skills form. severity: major · status: **resolved** (2026-07-12) — commit
  2404971; verified v22-wf-01..08 (avatars+status, group-by, create round-trip, all profile tabs, functional
  upload/add-skill sheets, 11 tabs one line via new DetailDescriptor.width DS prop). DS BACKPORT NEEDED
  (T-052 candidate): SelectContent/PopoverContent z-50 renders BEHIND Sheet z-[1200] — invisible dropdowns
  inside any sheet; worked around per-instance (zIndex 1300) and DateRangePicker (no passthrough) was
  temporarily swapped for a native date input in Sheet contexts — MUST be restored to the DS picker once the
  DS layering is fixed (it's a knowing, documented deviation from the DS-component law, not an oversight).
  Also wanted: cross-module project-detail nav from a worker profile. 
- **T-042** ifm-workforce: Lifecycle → event-driven pipelines w/ TaskDetail. from: client walkthrough.
  Card click must open TASK detail (not the workforce profile): hiring manager, trainer, reporting manager,
  stage KPIs; 'Make Permanent' action opens a sheet w/ KPI/performance form upload. Redesign: don't park 8k
  workers in 'Permanent' — split into 3 event-triggered pipelines (Onboarding→Permanent · Transfer/Promotion ·
  Exit); cards enter on trigger (hire event, transfer request, resignation), completed cards leave the board
  (worker record updated). severity: major · status: **resolved** (2026-07-12) — commit f67dfb3 (+ rail wiring inadvertently swept
  into 3fc84b8; content verified). Verified v23-lc-* — three boards, TaskDetail cards w/ relations +
  data-derived checklists, Make-Permanent gated on the KPI-form upload, event-trigger proven (created worker
  auto-appears in Onboarding). AUDIT items: timelineFor pre-bakes 'confirmed permanent' for on-probation
  workers; transfer/exit REQUEST actions belong on the worker profile (contract documented in-code).
- **T-043** ifm-workforce: Attendance = multi-scan journey model + day-case detail. from: client walkthrough.
  Fix 'absent but in-zone' contradiction. Data model: face scans at MULTIPLE touchpoints/day (accommodation
  start → bus in → bus out → site in/out → bus → accommodation end) — physical verification journey, DMT
  style. Detail becomes TaskDetail: the day's shift as a CASE — scan timeline, linked incidents, journey map
  (each scan has location+timestamp). severity: major · status: **resolved** (2026-07-12) — commit 8e03bc1;
  verified v24-att-* (8-touchpoint bus-rider chain w/ linked CRITICAL incident end-to-end; absent rows no
  longer claim in-zone). ScanEvent/scansFor contract stable for T-046/T-047 consumers. AUDIT items:
  journey-map markers merge at overlapping scan locations (make numbered badges legible); Attendance list
  renders ~70-75k unfiltered rows — needs a default date filter and/or DS DataTable pagination (perf cliff
  confirmed by headless timeout).
- **T-044** ifm-workforce: Leave fixes. from: client walkthrough. Approve/Reject actions ON cards; roster
  check shows the person's shift time; REMOVE create-leave from web (mobile-app-only submission story);
  detail shows supervisor + assigned project; fix balance 'before 9 → after 9'. severity: minor ·
  status: **resolved** (2026-07-12) — commit 568914a; verified v25-leave-* incl. approve round-trip + reload
  persistence. DS gaps flagged: KanbanCard has no action slot; pipeline modules have no description/banner
  slot; Contract↔site linkage weak (project shows '—' honestly for unlinked sites).
- **T-045** ifm-workforce: Projects creation + assignment. from: client walkthrough. Client = centralized
  entity (dropdown/sheet, own data); stepped configurable creation (IWMP Contracts style); detail shows
  ACTUAL assigned workers (not 'Suggested'); an assign-workers flow; per-project skills view.
  severity: major · status: **resolved** (2026-07-12) — commit 602080b; verified v26-proj-01..11 (wizard,
  create+reload, assigned-workers-led detail, assign flow updating meters live, skills coverage). CLIENTS
  registry + assignment records added in contracts.ts; meters/stats/detail all derive from the same
  assignment data (coherence).
- **T-046** ifm-workforce: TIMESHEET MODULE (per "Timesheet Module — R&D and Plan.md") + Reports fixes.
  from: client walkthrough + R&D doc + Figma ref **6Twj2L7KPGP5y8unBP9KS6 node 2205-19382** (snapshot at
  scratchpad/figma/timesheet-2205-19382.png). Research validated: ATTENDANCE-BASED timesheet (not project
  time-tracking) — the reconciliation+approval layer between Attendance (punches) and Payroll (money):
  Roster+Attendance+Leave → grid+rules+approval → approved Regular/OT hours → payroll pre-fill.
  Build (on T-049 store):
  (a) **Timesheet grid = the Figma frame** (HERO): employees × days, per-cell actual-vs-planned pill
  (green on-plan `06:02/08:00`, red short, grey no-shift, leave text cells), OT highlighted, exception
  markers, Monthly/Weekly/Daily toggle + month/week steppers, per-worker + period totals with REGULAR vs OT
  split, search + tag filter + Export toolbar. DS GAP: no Timesheet component → kit-lift into the DS
  (zones/pois precedent) + vendor mirror; 8k-scaled via site scoping/paging.
  (b) Single-employee month view (drill into a day's punches).
  (c) **Regularization**: correct missing/incorrect punches with reason, audit-logged (store action);
  exception queue (missing punches, short hours) to clear before submit.
  (d) Lifecycle: Draft → Regularize → Submitted → Approved/LOCKED (reopen = audited); validation guardrails
  before submit.
  (e) **Handoff**: approved Regular/OT/leave totals visibly pre-fill the Payroll run (closes the
  attendance→timesheet→payroll loop with T-050 — demo money-shot).
  (f) Reports fixes: every report downloadable; remove ambiguous Save buttons; Generate flow — To ≥ From
  (DateRangePicker range), employee pickers show PEOPLE not vehicle icons, output renders real rows never
  'Item 1/2'.
  Demo assumptions (flag if wrong): monthly period matching WPS cycle; OT 1.25× via RULES thresholds;
  breaks auto-deducted; single-level supervisor approval; regularization by supervisor until lock; night
  shifts kept within one calendar day (seed already does).
  severity: major · status: **resolved** (2026-07-12) — commit 7fbed5f; verified v46-ts-01..13 (Figma-parity
  grid incl. leave cells/OT rings/exception flags, drill w/ scan journey, regularize round-trip, submit
  blocked by open exceptions, approved/locked, real date-range + people icons + real rows + CSV in Reports).
  NEW DS COMPONENT: scheduling/timesheet-grid.tsx (spec'd, mirrored). Payroll handoff exported as
  approvedTotalsFor() + approval inbox notification. AUDIT item: payroll create-run does not yet consume
  approvedTotalsFor (wire in the audit pass).
- **T-047** ifm-workforce: Skills/Inventory/Incidents/Inbox. from: client walkthrough. Skills: per-trade views,
  skills mapped per job type, skill click does nothing. Inventory: functional creation, assignment-history tab,
  REDESIGN as quantity entity + issue-flow (assign sheet: when/why/how long + auto return-reminder). Incidents:
  stage-specific fields (resolved: who/when/photos; during-shift flag; report LOCATION + map), functional
  creation. Inbox: every notification click deep-links to its record/action. severity: major ·
  status: **resolved** (2026-07-12) — commit 08f17b6; verified qa/01-13 (per-trade skills views + skill
  sheet, stock pools + issue/return w/ due-back reminder landing in Inbox end-to-end, stage-aware incident
  cases w/ report-location map + resolution fields, inbox deep-links). DS gains onNotificationClick
  (InboxRow had NO click hook — mirrored to DS source by conductor); collectiveInbox now store-reactive
  (closes T-048's armed-notification reload gap). Honest gaps documented: DS FileUpload has no real file
  input (photo attach simulated); Leave/Projects/Payroll notification targets land module-only or a minimal
  local view (frozen modules don't export detail builders).

- **T-037** ifm-workforce: Workforce Pulse client-review punch list (9 items).
  from: ifm-workforce user QA (client walkthrough): (1) critical-incident sheet rows must open the incident's
  detail page (openModule deep-link — sanctioned data-row nav); (2) Overtime-MTD sheet duplicated the
  Compliance dataset — needs its own per-worker OT rows; (3) docs-expiring sheet must list WHICH documents;
  (4) decorative panel dropdowns (All Sites/Today/Live/This week) → remove if unwired; (5) 'Between shifts'
  coverage cell unclear → remove; (6) Accommodation & Transport panel out of HRMS scope ('Buses over'
  unreadable) → replace with Leave & Absence; (7) unassigned-shift banner reads fleet-ops → replace with a
  data-derived HR/payroll alert; (8) 'Approve relief headcount' action label opaque → self-explanatory
  data-tied actions; (9) Management/Line Manager/HR tabs read GLOBAL but only lens the KPIs → visually scope
  to the KPI grid.
  assignedTo: frontend-eng · type: defect · severity: major
  classes: copy-paste-dataset (sheet reuse, 1st) · decorative-unwired-control (panel dropdowns — kin of the DS
  Filters-button gap) · unclear-domain-vocab (Between shifts / Buses over / relief headcount).
  status: **resolved** (2026-07-11) — commit 631ced8; all 9 verified via v18-pulse-* (incident row → full
  Incidents TaskDetail confirmed end-to-end). Conductor also neutralized the agent-flagged leftover
  ('Security Patrol (Night)' seed row in the Line-Manager 'Unfilled shifts' sheet → 'Cleaning — Evening
  Shift', TODO for the T-038 audit to derive from the shift board). Numbers in banner/queue re-derive
  automatically when the 8k spine lands.

- **T-038** ifm-workforce: rescale demo data to the client's real workforce scale (~8,000) + global coherence.
  from: ifm-workforce user QA ("On site right now — there will be more people per site, they have 8k
  workforce"; "make sure ALL data is really coherent — all modules, all charts, all sidesheets — client is
  expecting a real demo")
  assignedTo: frontend-eng ×2 (spine rescale, then audit+scoping) · type: feature+defect · severity: major
  class: demo-data-not-plausible-at-scale (1st) — 60 seeded workers cannot carry a 9,000-worker tagline.
  scope: deterministic lazy generators for ~8,000 workers over the 12 sites (250–1,200/site), every aggregate
  self-derived; perf budget (mount <2s, fallback ladder 8k→4k→2k); then a full-module audit: kanban/list/map
  surfaces scoped or paginated for scale, every number reconciles across modules/charts/sheets, subsets
  labeled 'Showing N of M'.
  status: **resolved** (2026-07-12) — phase 1 commit 6b85ade (8,040 workers, all aggregates coherent);
  phase 2 (final audit) commit 37f4d41: full backlog fixed (attendance TODAY-default+pagination, journey-map
  ring spread, workforce-true event flags, timeline gate, Under Review label, DS z-layer token system
  z-layers.ts w/ DateRangePicker restored = T-052 CLOSED, payroll consumes approvedTotalsFor w/ Source
  badge) + Part-B single-source reconciliation (Pulse hiring gap == Projects openDemand 74==74; KPI tiles ==
  their sheets; payroll hours == timesheet hours (break-adjusted); Pulse leave/workers/inventory store-live).
  All gates green (product tsc+build; DS coherence/vocab/a11y/build; vendor mirror byte-identical except the
  documented map-view patch). PUSHED b1308f9..37f4d41. Flagged for a future ticket: buildStream/buildQueue
  probation+doc cards and derive.ts's shared violationLeaderboard/actionSignals/sitePresence still read
  static worker arrays (deeper sim-engine rewrite).

- **T-036** ifm-workforce: 537ms INP on the Login button (event handler blocked UI updates).
  from: ifm-workforce user QA (browser INP trace on the DS Button `mt-6 w-full` = LoginScreen submit)
  assignedTo: frontend-eng · type: defect · severity: minor
  class: heavy-mount-in-event-handler (1st): the submit handler's `setAuthed(true)` mounted the ENTIRE
  AppShell (15 modules + the Pulse cockpit) as an URGENT update — React rendered it all before the click's
  next paint. Fix: `React.startTransition(() => setAuthed(true))` — the interaction paints first, the mount
  renders in the non-blocking lane. Candidate audit later: other handlers that swap in heavy surfaces
  (raw-data sheets w/ large DataTables, detail opens) if traces flag them.
  status: **resolved** (2026-07-11) — commit b1308f9 (pushed); tsc clean; login flow re-verified
  (v17-login-transition lands on a fully rendered Pulse).

- **T-035** ifm-workforce: duplicate stage colors on kanban; Projects filter row violates the DS toolbar standard.
  from: ifm-workforce user QA ("don't use same color for different statuses — remember this"; "in DS standard
  for modules search filter action are in same row and label for fields come inside the field not outside")
  assignedTo: frontend-eng · type: defect · severity: minor
  defect A (class: status-color-collision, 1st): Payroll Approved used chart-4 = the SAME green as
  status-success (Paid); sweep found the identical collision in Lifecycle (Transfer/Promotion vs Permanent).
  Both → chart-3 purple. Every stage/status SET must use pairwise-distinct colors; chart-4 ≈ status-success
  is the trap token.
  defect B (class: ignored-existing-ds-component, 7th): T-032 bolted a product filter row (external labels,
  native selects) ABOVE ContractManagement instead of the FAMS toolbar standard — search · filter fields ·
  action on ONE row, labels INSIDE the fields. Fixed DS-side (backward-compatible `filterSlot` +
  `createLabel` props on ContractManagement, DispatcherCockpit precedent; closes two T-032 DS gaps),
  product passes DS Selects ("All Client Types"/"All Stages") + "Create New Project".
  status: **resolved** (2026-07-11) — commit e171c7f; verified v16-projects-toolbar / v16-payroll-board;
  vendor/ds byte-mirrored.

- **T-034** ifm-workforce: Settings must be the DS admin Settings structure, not four bespoke pages.
  from: ifm-workforce user QA ("properly structure settings like we have in DS — this is admin access so he can
  access all of settings, add them as well"; channels/rules are "organization configuration by admin — see how
  he can manage like other settings"; WPS & Employer + Reset demo data "not required on front end in settings")
  assignedTo: frontend-eng · type: defect+feature · severity: major
  class: ignored-existing-ds-component (6th) — the DS ships blocks/settings/settings.block.tsx (Platform
  Settings: Tags & Categories · Roles · Application Mgmt · Event Config · Entity Config · Pipeline Config ·
  Preferences · Module Mgmt · Subscriptions · Appearance · Billing + Organization Settings: User Accounts ·
  Org Settings · Sub-Org) over src/components/settings/* — the product hand-rolled 4 flat pages instead.
  scope: rebuild src/modules/settings.tsx on the DS block recipe with workforce seed data; fold Clock-in
  Channels + attendance/OT rules into the DS-managed surfaces (Preferences / Event Configuration) as org
  config; DELETE WPS & Employer and Reset demo data.
  status: **resolved** (2026-07-11) — commit d8148d2; single-file rewrite of settings.tsx on the DS block recipe
  (all upsert/closeOnDone + *ToDraftSeed patterns carried); channels + RULES thresholds live in Preferences ›
  'Attendance & Clock-in'; event catalog = 9 attendance/compliance events narrating RULES via rule conditions;
  10 admin users (not field workers). Gates: tsc/coherence/build PASS; 9 v15-settings-* screenshots verified.
  DS gaps documented in-code: EntityConfigSheet's icon picker only covers 10 keys (Zones/POIs/Camps/Bus
  Routes/device-subtypes fall back to Cube01 on edit); event-icon SVG registry lacks attendance glyphs.

- **T-033** ifm-workforce: bare icon-less search input + nav-duplicating header action in Operations Center.
  from: ifm-workforce user QA ("what the hell is Search punches and why is there a search field without a search
  icon"; "why is there a live monitoring module icon inside Operation Center when I can just access it through
  module nav")
  assignedTo: frontend-eng · type: defect · severity: minor
  defect A (class: ignored-existing-ds-component, 5th): worker profile › Attendance Log search was a bare
  `<Input placeholder="Search punches…">` — the DS search field is ALWAYS SearchMd leading icon (absolute,
  pointer-events-none) + pl-8 input + placeholder "Search anything here". Fixed to the canonical composition.
  defect B (class: rail-nav-duplicated-as-action, 1st): Pulse header carried an 'Open live map' icon that only
  navigated to Live Monitoring — pure rail duplication. Removed; header actions must act in-place, the rail is
  the nav.
  status: **resolved** (2026-07-11) — commit 65569b8; verified v14-search-fix.png (icon + standard placeholder
  render in the Attendance Log tab).

- **T-031** Zones + POIs promoted to DS module types; map token-color + geometry + POI-placement defects.
  from: ifm-workforce user QA ("zones and poi module should be in ds — map the interactions properly, use the
  designs"; "pois in water"; "zones are straightforward boxes in black — use the same color as the listing")
  assignedTo: frontend-eng · type: backport+defect · severity: major
  root cause (color): map-view.tsx feeds zone/route colors into MapLibre canvas paint — `var(--chart-N)` is
  unparseable there → black polygons. SAME CLASS as T-015 (token color in a non-CSS renderer). Fix: resolveColor()
  via getComputedStyle before paint. Plus: ZonesView tag filter wired (was dead), zone rows fly-to/highlight,
  eye toggles ↔ map, PoisView lifted into the DS, 'zones'/'pois' registered as first-class module types,
  venue-scaled irregular zone polygons (insideZone still verified), water-POI coordinates fixed.
  status: **resolved** (2026-07-11) — product commit b5d8550. 'zones'/'pois' registered as DS module types
  (module-registry + types + barrels + showcase + smoke test); resolveColor() fixes black polygons (2nd
  token-color-in-non-CSS-renderer instance); BONUS root-cause: MapView camera race (loaded-transition
  clobbering imperative flyTo/fitTo) — general fix, regression-check other fitTo/flyTo consumers later.
  Zone polygons venue-scaled for all 12 sites (insideZone verified programmatically, Atlantis/One&Only
  centers corrected); water POIs moved to land parcels. Gates: coherence/build/a11y-static/smoke/vocab PASS;
  vendor mirror byte-identical except the documented cluster-handler type patch. Verified v12-zones /
  v12-pois / v12-pois-palm-zoom (+ T-033/T-035 law audit: search fields SearchMd-compliant, toolbar one-row,
  zone colors are per-zone data not statuses).

- **T-032** ifm-workforce: Contracts → Projects on the DS Contracts/Projects surface (HRMS resource delegation).
  from: ifm-workforce user QA ("use Contracts/Projects Module from DS as base — HRMS use case: delegate and
  provide resources to SMEs / Enterprises / Governments")
  assignedTo: frontend-eng · type: feature · severity: major
  scope: DS ContractManagement/ContractCard (Tadweer T-014 Pass-1 surface: KPI stat row + resource-meter cards)
  as the base; clientType (Government/Enterprise/SME) added + SME seed projects; stat row = active projects ·
  workforce deployed · open demand · fulfillment %; card meters = allocated-vs-required per trade; existing
  TaskDetail (staffing gap · suggestions · skill gaps · right timeline) kept on card click.
  status: **resolved** (2026-07-11) — commit 1349b75; verified v13-projects / v13-project-detail (DS list surface,
  stat row, per-trade meters, SME cards, TaskDetail + right Timeline intact). DS gaps found for a future DS pass:
  ContractCard status Badge has a FIXED 4-word vocab (no label override — real stage carried as leading chip);
  ContractManagement's Filters button is decorative/unwired; onCreateContract label hardcoded 'Create New
  Contract'. Kanban dropped — ContractManagement is list-only by design (Pass-1 spec).

- **T-029** ifm-workforce: Overtime & Compliance merges into Workforce Pulse; KPI cards open raw-data sheets.
  from: ifm-workforce user QA ("one dashboard, extensive, wow, interactable"; raw-data refs Tadweer June Release
  2227-79382 sheet · 2227-83215 export)
  assignedTo: frontend-eng · type: feature · severity: major
  scope: compliance gauge + OT-by-trade + RAG leaderboard + rules strip absorbed into Pulse (module deleted from
  the rail); every KPI card opens the Tadweer-standard wide '(Raw Data)' side sheet — 'Showing N items' + full
  DataTable of the underlying rows + CSV export. This is the DS T-013 P4 pattern built product-side first —
  candidate kit-lift (RawDataSheet).
  status: **resolved** (2026-07-11) — compliance band merged (leaderboard honors Site/Trade filters), module
  deleted; RawDataSheet built (75vw Sheet, Showing-N, DataTable, CSV export, seam close X) and wired to EVERY
  KPI; verified v10-rawsheet* vs the Tadweer frame. ALSO per user directive mid-loop: Work Sites module REMOVED
  — sites are geofences in Zones (rows enriched w/ client · allocation vs plan · capacity · supervisor ·
  Understaffed tag) + client-site POIs added (POI-19…30); data/sites.ts remains the shared layer.

- **T-030** ifm-workforce: Live Monitoring adapted to the Workforce-App + Launch Pad overlay standards.
  from: ifm-workforce user QA (refs 6Twj2L7KPGP5y8unBP9KS6 2073-44545/45118/45816/46562/49596 · Launch Pad
  495-32281 clusters · 495-34206 zones overlay · 495-36403 POIs overlay)
  assignedTo: frontend-eng · type: feature · severity: minor
  scope: list → Employee · Shift Time (elapsed/total) · site location; per-worker CRITICAL EVENTS popup tab
  (late / zone-out / no-show / missing punch from attendance); POIs overlay side-sheet wired from data/pois;
  clusters verified per Launch Pad.
  status: **resolved** (2026-07-11) — all adaptations landed; gates green (coherence/build PASS); verified via
  v11-monitoring* screenshots (elapsed/total shift-time column, Events(1) popup tab, POI side-sheet toggle).
  QA gotcha logged: aria-label 'Zones' collides between the map toggle and the Zones module.

- **T-028** ifm-workforce: employee profile adapted to the FAMS Workforce Management App standard.
  from: ifm-workforce user QA (inspiration frames 6Twj2L7KPGP5y8unBP9KS6: 1846-11226 list · 3386-3748 overview ·
  1846-12448/13241/13119/13411/12905 detail tabs)
  assignedTo: frontend-eng · type: feature · severity: minor
  scope (adaptation, not copy — wearable/health widgets skipped, no data): header shift line + tenure; Overview
  gains upcoming-leave banner + Annual/Sick/Emergency leave meter cards + current-location map card + Actual-vs-
  Planned hours chart; Skills → category cards with proficiency meters + cert badges; NEW Requests tab (open/closed
  leave requests) + NEW Document Renewals tab (in-progress/completed renewals derived from doc & cert expiries);
  Documents rows gain TO-BE-RENEWED tags.
  status: **resolved** (2026-07-11) — all adaptations landed (wearable/health widgets deliberately skipped, no
  data); verified across day-off / on-shift / future-leave workers (v9-* screenshots); repo tsc clean.

- **T-027** ifm-workforce: Zones + POIs modules missing; entity map/hybrid view off-standard.
  from: ifm-workforce user QA ("what are these broken hybrid views — hybrid must be same as live monitoring";
  refs: Launch Pad 2746-12870 zones hybrid · 5265-107046 tags-only filter · 2658-18262 flat list ·
  Berkeley Telematics 203-69599/203-67656 POIs)
  assignedTo: frontend-eng · type: defect+feature · severity: major
  scope: (1) Zones module on the DS ZonesView (flat list, tag-only filter, site geo-zones + camp zones);
  (2) POIs module per the Berkeley hybrid (POI teardrop pin artwork from assets/vectors/POI via the
  route-optimization poi-icons loader precedent); (3) Work Sites converted from the entity table+map hybrid
  to the live-monitoring hybrid layout. NOTE the DS-level smell: the entity 'hybrid' renderer (DataTable +
  MapWidget side by side) does not match the Launch Pad hybrid standard — candidate DS rework. Also found:
  DS ZonesView's filter icon button is UNWIRED (no tag-filter props) — DS gap for the tags-only filter frame.
  status: **resolved** (2026-07-11) — Zones (ZonesView, flat list + camp zones), POIs (teardrop pin art from
  assets/vectors/POI, Hybrid/List/Map), Work Sites converted to the live-monitoring hybrid. Gates green;
  parity screenshots v7-zones/v7-pois/v7-sites vs the Figma frames.

- **T-026** Entity-profile tabs off-standard: Timeline not the ActivityFeed, Overview was a field grid, Documents ad-hoc.
  from: ifm-workforce user QA (refs: Tadweer 3115-5732/8581 timeline · FAMS Web Portal 31695-13383/13221/13366/13243/13325/13284/13410 documents)
  assignedTo: frontend-eng · type: defect · severity: major
  status: **resolved** (2026-07-11) — Timeline now the DS ActivityFeed (date groups · system/comment entries ·
  note composer w/ mentions+attachments); Overview renamed Details and a NEW Overview mini-dashboard added
  (live punch banner + KPI metric cards + hours/punctuality charts); Documents rebuilt per the portal standard
  (Upload Document action · FileTypeIcon rows w/ kebab Edit/Delete · empty state · Upload sheet on DS FileUpload).
  DS GAP flagged: no reusable DocumentsPanel component exists (only FileUpload/FileTypeIcon primitives) — candidate
  kit-lift for a future evolve-ds loop; the ifm-workforce composition is the reference implementation.

- **T-024** Promote `ignored-existing-ds-component` to a MANDATORY review-fix checklist item (SI-4, count=3).
  from: self-improve (defect→gate) · assignedTo: tech-lead · type: defect · severity: major
  refs: [defect-log.md · T-022 (plain Select vs DateRangePicker) · T-022b (right component, WRONG VARIANT:
  single-date mode where the Figma 6649-24799 standard is the preset+range popup) · T-025 (pipelines rendered
  EntityDetail instead of the DS TaskDetail two-pane w/ right timeline panel)]
  scope: not regex-able — add to the review-fix MANDATORY checklist: "for every control/surface, name the DS
  component consumed AND its variant vs the Figma standard; EntityDetail is for entities, TaskDetail (with the
  right panel) is for pipeline cards; a 'none fits' claim must cite the barrels checked."
  status: **resolved** (2026-07-11) — checklist written into .claude/workflows/review-fix.js (qa lens), covering
  the four observed shapes (date popup variant · EntityDetail vs TaskDetail · ActivityFeed timelines · 31695-*
  documents pattern) + the cite-the-barrels rule. Count now 4 in defect-log.

- **T-023** Live-monitoring map rendered TWO control sets (zoom/fullscreen duplicated).
  from: ifm-workforce user QA · assignedTo: tech-lead · type: backport · severity: major
  refs: [src/components/map/index.ts (LeafletMap aliased to MapLibre MapView) · map-view.tsx built-in CtrlBtn
  cluster · app-shell/live-monitoring-view.tsx own toolbar]
  cause: when LeafletMap became an alias of MapView, MapView's built-in Zoom/Reset/Fullscreen cluster started
  double-rendering under LiveMonitoringView's own toolbar.
  status: **resolved** (2026-07-10) — LiveMonitoringView passes `controls={false}` (it owns the toolbar);
  mirrored in ifm-workforce vendor. Follow-up DONE (2026-07-11): audit found 4 more sites (view-renderers entity map/hybrid + pipeline hybrid, runtime-app) where MapWidget's UNWIRED zoom buttons stacked over MapView's working built-ins — MapWidget decorative controls suppressed there (DS + vendor); Work Sites hybrid verified single-cluster.

- **T-025** Pipeline card details used EntityDetail — DS standard is TaskDetail with the right timeline panel.
  from: ifm-workforce user QA ("we are missing the whole right side which had timeline in it — all pipelines")
  assignedTo: frontend-eng · type: defect · severity: major
  refs: [DS app-shell/task-detail.tsx + pipeline-right-panel.tsx · ifm-workforce leave/contracts/incidents/payroll]
  status: **resolved** (2026-07-10) — leave/contracts/incidents use TaskDetail (two-pane, right Timeline via
  ActivityFeed); payroll keeps its full-width worksheet + gains the same right Timeline panel (TaskDetail would
  compress the editable grid — documented in-file). Verified: leave card screenshot shows the right Timeline.

- **T-022** Product used a plain Select for a date filter — the DS ships the canonical date popup.
  from: ifm-workforce user QA ("don't ignore DS — always compare DS for components, functionality, structure, styling")
  assignedTo: tech-lead · type: defect · severity: minor
  refs: [DS src/components/basics/date-range-picker.tsx (DateRangePicker, Figma DS V2 6649:24799) ·
  Code/ifm-workforce/src/modules/operations-center.tsx]
  status: **resolved** (2026-07-10) — swapped to DateRangePicker mode='single' (placeholder 'Date',
  key-remount on clear). PROCESS defect: before authoring ANY control, grep the DS component barrels
  (basics · primitives · data-display · widgets) for an existing component — new defect-log class
  'ignored-existing-ds-component' opened to count recurrences toward a review-checklist promotion.

- **T-021** Product UX: two sibling dashboards fragmented the command surface (ifm-workforce).
  from: ifm-workforce user QA · assignedTo: tech-lead · type: learning · severity: minor
  refs: [Code/ifm-workforce/src/modules/operations-center.tsx · DS src/components/operations/* (DispatcherCockpit)]
  user signal: "why two dashboards … one for all data, live, interactable, users can perform proper actions,
  role-aware (HR / Line Manager / Management), no fleet vocabulary."
  status: **resolved** (2026-07-10) — Cockpit + Capacity replaced by ONE Operations Center › 'Workforce Pulse'
  built on the DS DispatcherCockpit shell: role switcher drives the KPI set + a role-filtered ACTION QUEUE
  (approve/reject leave w/ roster-conflict inline, assign cover, relief headcount, temp cards, payroll draft,
  probation, camp/bus over-capacity); a simulated clock streams punches (channel + location + zone verdict)
  so KPIs/panels/charts re-derive live. Reusable pattern for any product wanting a command surface.

- **T-018** ModuleRail showed OS scrollbar when 16+ modules overflow (bad UX at 640px viewport).
  from: ifm-workforce user QA · assignedTo: tech-lead · type: backport · severity: minor
  refs: [src/components/navigation/side-nav.tsx ModuleRail]
  expected: scrollable overflow, no visible scrollbar; actual: native OS scrollbar rendered
  fix: `[scrollbar-width:none] + [-webkit-scrollbar:none]` idiom on the overflow container
  status: **resolved** (2026-07-10) — gates green; verified at 640px viewport on ifm-workforce.

- **T-017** Live-monitoring fleet-list column labels were hardcoded (Vehicle / Activity Overview / Speed).
  from: ifm-workforce user QA · assignedTo: tech-lead · type: backport · severity: minor
  refs: [src/components/app-shell/live-monitoring-view.tsx FleetHeader · types.ts MonitoringModuleData]
  status: **resolved** (2026-07-10) — `MonitoringModuleData.listColumnLabels?: {entity, overview, metric}`
  (defaults preserve the fleet vocabulary; config popover reuses the labels). Gates green.
  Consumed by ifm-workforce (Worker · Activity · Status), whose monitoring now tracks WORKERS
  (punch-location pins + in-zone/late/out-of-zone/missing-punch/checked-out/no-show states).

- **T-016** ReportsHome landed on the FIRST category instead of the full catalog.
  from: ifm-workforce user QA · assignedTo: tech-lead · type: backport · severity: minor
  refs: [src/components/app-shell/view-renderers.tsx ReportsHome]
  expected: Home shows ALL system reports (categories are filters); actual: auto-selected first category → 1 card.
  status: **resolved** (2026-07-10) — added an 'All Reports' nav item, default active='all', cards carry their
  category chip in the all view; category items still filter. Gates green; verified in ifm-workforce (4 cards).

- **T-015** Kanban column tint derivation fails for token (var()) stage colors.
  from: ifm-workforce product QA · assignedTo: tech-lead · type: backport · severity: major
  refs: [src/components/app-shell/view-renderers.tsx rgba() ~L90 · Code/ifm-workforce/src/modules/stage-tint.ts (product workaround)]
  expected: stage.color 'var(--chart-2)' → faint column wash (as hex colors get via rgba())
  actual: non-hex passes through unchanged → column background renders FULLY SATURATED
  fix: keep hex fast-path; else `color-mix(in srgb, ${color} ${alpha*100}%, transparent)`
  status: **resolved** (2026-07-10) — rgba() in view-renderers.tsx now color-mixes non-hex colors.
  verified: red-check green (sales 'Qualified' seeded var(--chart-2) → faint wash, scratchpad/qa/redcheck-var-stage.png)
  + hex columns unregressed in the same shot; gates coherence/smoke/a11y/roundtrip/build all PASS.
  note: products no longer need explicit tint/counterBg for token stage colors (ifm-workforce keeps its
  stage-tint.ts harmlessly — explicit tint wins; drops out at next re-vendor).

- **T-014** Contract / Project Management — remaining surfaces beyond the list view.
  from: user (Tadweer contract frames) · assignedTo: tech-lead · type: feature · severity: major
  refs: [Figma lXBH6N7ZpHfBuY60tH71TD list 2111-10733, create-wizard 2111-1925 (+ steps), detail 2303-3679, KPI
  sheet 2303-4514 · src/components/contracts/* · blocks/contracts/contracts.block.tsx · scratchpad/cp/*.png]
  status: **Pass 1 DONE** (list view — KPI stat row + contract card grid w/ resource meters + status; wired into
  Smart Cities; gates green + parity-verified). REMAINING: (2) **11-step create wizard** — a FULL-PAGE LEFT-STEPPER
  (Basic Info · Zone Selection · Add Vehicles/Equipment/Workforce/Bins · Service & Frequency · KPI Targets ·
  Attachments · Summary); consider a shared `LeftStepperSheet`/page shell (distinct from the top-tab StepWizardSheet).
  (3) **Contract detail** — compliance gauge + KPI tiles + Contractor Details + Daily Plan chart + KPI Targets bars +
  Timeline panel (reuse events ActivityFeed). (4) **KPI raw-data sheet** (wide Sheet + DataTable, per detail-tile click;
  same pattern as Operations/detail). Config-driven + FAMS brand.

- **T-013** Operations Center → Dispatcher Cockpit — multi-pass build (Passes 2-5).
  from: user (dispatcher-main.zip ref) · assignedTo: tech-lead · type: feature · severity: major
  refs: [_unpacked/dispatcher/ (ground-truth) · knowledge-base/live-product-references/15-tadweer-dispatcher-cockpit.md ·
  src/components/operations/* · blocks/operations-center/operations-center.block.tsx · Figma lXBH6N7ZpHfBuY60tH71TD node 2227-76367]
  status: **Pass 1 DONE** (page shell + alert + filters/actions + 12 KPI cards + Fleet/Workforce panels; wired into
  Smart Cities; gates green + parity-verified). REMAINING passes (one verified surface-group per turn, per user):
  P2 **Live GIS Map** (DS LeafletMap + AssetMarker HTML overlay + route-card list + selection + telematics popup);
  P3 **5 analytics widgets** (Route Fulfillment DonutChart · Planned vs Actual · Hourly Trend AreaChart · Client
  Locations · Bin Repair DataTable — reuse DS data-viz); P4 **4 side-sheets** (KPI raw-data · Current Shift Issues ·
  Nearby Routes · Replace Vehicle); P5 **Manual Bin Reassignment** (full-screen drag-to-draw zones → optimize).
  Config-driven + FAMS brand; the block seeds the dispatcher/waste demo data.

- **T-012** Events (live-monitoring): the remaining net-new surfaces beyond the Hybrid spine.
  from: conductor (Events update) · assignedTo: tech-lead · type: feature · severity: major
  refs: [Figma Launch-Pad ev2/03,04,07,10,11 · src/components/events/events-view.tsx · event-detail-sheet.tsx ·
  app-shell/live-monitoring-view.tsx · reuse src/components/data-viz/KpiTile + BarChart + widgets/critical-events-list]
  scope: (1) **Dashboard View** — filter row + 12-tile KPI grid + "Critical Events Involvement" (Top Drivers
  horizontal bar) + "Hourly Events Trend" (stacked bar). Reuse KpiTile + the data-viz charts + critical-events-list.
  (2) **List / Total Events (Raw Data)** — full-width event list (no map) + export + checkboxes. (3) real **view-tab
  bar** switching Hybrid/List/Map/Dashboard (today the block's 3 tabs all render the same Hybrid module). (4) **detail
  window** Timeline redesign to match ev2/03,11 (multi-event tabs, field grid, route map, Speed Over Time, Timeline
  activity+comments) — event-detail-sheet.tsx exists; align it. The Hybrid view (search/severity-tabs/rows/bulk/assign/
  map-toggles) is DONE + parity-verified this pass; this ticket is the larger remainder. Build via evolve-ds as its own loop.

- **T-011** Preferences: per-module notification tab (pref-3062) + cross-module Mandatory→lock sync.
  from: qa (Prefs/Subs review) · assignedTo: tech-lead · type: feature · severity: major
  refs: [Figma pref-3062/3207/3210/3213/3218 · preferences.tsx · subscriptions.tsx · settings.block.tsx]
  scope: a 2nd (non-admin) Preferences view that groups notifications BY MODULE with a module master-toggle
  (indeterminate when children mixed), where any OrgSubscription an admin set to `mandatory` renders
  checked+DISABLED here. Needs a shared data contract between Preferences and Subscriptions (today they hold
  independent state). Deferred deliberately: the authoritative flat Preferences (pref-1586) is shipped + parity-verified;
  this is a materially larger coupled feature, not a tweak. Build via evolve-ds as its own loop.

- **T-010** Promote `savedraft-no-closeondone` + `drop-on-load-hydration` to gates (SI-4, watchdog: drop-on-load seen 3×).
  from: self-improve watchdog · assignedTo: tech-lead · type: defect · severity: major
  refs: [defect-log.md · roundtrip.mjs] · savedraft-no-closeondone IS cheaply greppable (scan blocks/**/*.block.tsx for
  `onSaveDraft={` whose handler lacks a `closeOnDone` param) → author as a deterministic gate like roundtrip.mjs.
  drop-on-load is NOT cheaply regex-able (row type ≠ draft type) → make it a fixed review-checklist item in review-fix,
  OR a smoke assertion that round-trips edit(seed)→save per settings block. Also due: consolidate learnings.md (>24) +
  distil persona-notes/frontend-eng (44). Do in a dedicated /conductor tick — out of scope for the design-build turn.

- **T-009** Extract a shared `LabeledSelect` (floating-label popover-select) across the settings wizards.
  from: tech-lead (Entity Config review) · assignedTo: tech-lead · type: refactor · severity: nit
  refs: [field-select.tsx `LabeledSelect` (DONE — created + used by Preferences/Subscriptions)]
  status: PARTIAL — shared `LabeledSelect` now exists (settings/field-select.tsx) and new modules use it. REMAINING:
  retrofit the local `Select` copies in event-config-sheet.tsx / entity-config-sheet.tsx / pipeline-config-sheet.tsx onto it.

- **T-008** DS-wide a11y batch — touch targets + token contrast (from Entity Config a11y review).
  from: a11y (review panel) · assignedTo: tech-lead · type: defect · severity: minor
  refs: [all settings icon-buttons size-8/6/7; --muted-foreground caption contrast ~4.26:1; --ring low visibility]
  scope: these are DS-WIDE (every Settings module renders icon buttons at size-8 and captions in --muted-foreground),
  so fixing only Entity Config would make it inconsistent. Decide once: bump icon-button hit-area to 44px (or add
  hit-slop) across Settings, and re-evaluate --muted-foreground / --ring token values for AA. Batch with T-006.

- **T-006** A11y batch for the Settings category sheet (from the review-fix loop, deferred by tech-lead).
  from: a11y (review panel) · assignedTo: tech-lead · type: defect · severity: minor
  refs: [color-picker.tsx SV-box, category-sheet.tsx] · scope: SV-box 2D keyboard control, focus-return to the
  trigger on sheet close, 44px touch targets on swatches/entity rows. Batched (don't half-do); needs its own pass.

- **T-005** Sub-organization read-only view needs a settings-level shared store (inherited tags come from the parent org).
  from: ux/qa (review panel) · assignedTo: tech-lead · type: handoff · severity: minor
  refs: [blocks/settings/settings.block.tsx TagsCategoriesPage] · note: currently the sub-org view seeds its own copy;
  real inheritance needs a shared store. Raise via evolve-ds (architecture) — a product/design decision, not a quick fix.

- **T-003** RECLASSIFIED — retire the legacy single-facet path (a REFACTOR, not dead-code deletion).
  from: conductor · assignedTo: tech-lead · type: refactor · severity: minor
  refs: [config-bridge.tsx toFilterField, AppShell.tsx getFacet, view-renderers.tsx:114-115/151 (still filter rows via `data.filterField.get`)]
  correction: `filterField`/`getFacet` are NOT dead — the row-FILTERING path in view-renderers still uses them
  (the toolbar renders multi-facet, but filtering flows through the legacy `filters`+`filterField`). So this is a
  real migration (move view-renderers filtering onto `facetFilters`, then remove the legacy), not a safe delete.
  NOT blocking; needs a proper tech-lead→eng loop with smoke coverage. Do not rush.
  note: split out of T-002 verification — the multi-facet feature itself is done; this is cleanup only.


## In progress
(none)

## Resolved / verified
- **T-019** Promote `ds-hardcoded-domain-assumption` to a gate (SI-4). — **RESOLVED (gate authored)** (2026-07-11)
  from: self-improve (defect→gate) · assignedTo: tech-lead · type: defect · severity: major
  refs: [scripts/team/gates/vocab.mjs · defect-log.md ds-hardcoded-domain-assumption (count 3)]
  delivered: `vocab.mjs` (G-VOCAB) — a static, dep-free scan (same family as coherence/a11y/roundtrip) of the SHARED
  CHROME (`src/components/app-shell/**` + `src/components/navigation/**`) for a curated fleet-vocabulary set
  [Vehicle · Vehicles · Speed · Driver · Fleet · Truck · Depot · Plate] reaching the UI in two contexts: **V1** a JSX
  TEXT NODE (`<th>Vehicle</th>`), **V2** a DEFAULT-LABEL string literal (`'Speed'`). The SANCTIONED configurable
  default — a literal that is the fallback of an overridable prop, `?? 'Vehicle'` — is detected and NOT flagged
  (T-017's fix pattern). Comments and bare identifiers (type names/variables) never reach the UI → never flagged;
  `blocks/`/showcase/`.stories`/`.test`/`.spec` trees excluded (products MAY use domain words). Opt out an intrinsic
  case with `// vocab-allow <word> — <reason>` (bare `// vocab-allow — <reason>` allows the whole line).
  RED-CHECK: seeded `const seedLabel = 'Fleet Depot'` + `<span>Plate Number</span>` into live-monitoring-view.tsx →
  **FAIL(4)** with file:line (V2 Fleet/Depot/Plate @:418, V1 Plate @:419, exit 1); reverted → **PASS** (exit 0, 8 words
  checked). The non-regex-able half (default-landing / domain-MODEL `kind`-branching assumptions) stays a review-checklist
  item in review-fix. Wired into PostToolUse + review-fix + conductor gate chain. Narrow + high-signal by design.
  note: supersedes the interrupted run's divergent `domain-vocab.mjs` (G-DOMAIN, kind-branch + array-label design) —
  removed; this directive scoped the gate to user-facing VOCABULARY (V1/V2 above), so the gate name/design follow it.
- **T-020** Promote `drop-on-load-hydration` to a gate (SI-4). — **RESOLVED (gate authored)** (2026-07-11)
  from: self-improve (defect→gate, 3rd occurrence) · assignedTo: tech-lead · type: defect · severity: major
  refs: [scripts/team/gates/hydration.mjs · defect-log.md drop-on-load-hydration (count 3) + savedraft-no-closeondone]
  delivered: `hydration.mjs` (G-HYDRATION) — the MIRROR of G-ROUNDTRIP (drop-on-save→drop-on-LOAD), a static, dep-free
  scan of `blocks/**/*.block.tsx` with two zero-false-positive checks: **(A) seed-reachability** — an edit-path
  `initial={…editingId…}` that reads a stored draft (`drafts[…]`) MUST carry a `*ToDraftSeed(` fallback, else a seeded
  row with no stored draft edits BLANK; **(B) save-draft close discriminator** — every `onSaveDraft={h}` must thread a
  `closeOnDone` discriminator (a 2-arg upsert call, inline or via a resolved bare-identifier wrapper), else repeated
  draft-save mints DUPLICATE rows. Also folds in + resolves the sibling `savedraft-no-closeondone` class (check B).
  RED-CHECK: on a copy, dropped the event `?? eventToDraftSeed(...)` fallback + rewired pipeline `onSaveDraft` to a 1-arg
  passthrough → **FAIL(2)** with file:line (@:389 seed, @:614 savedraft, exit 1); clean tree → **PASS** (exit 0).
  Opt out via `// hydration-allow <reason>`. Wired into PostToolUse + review-fix + conductor gate chain.
  hybrid (mirrors T-019): the three root causes of this class split into a DETERMINISTIC slice (A/B above) and a
  NON-regex-able remainder — a seed that silently omits a persisted ROW field (EntityConfig fieldCount→0), corrupts a
  COMPOSITE (UserAccounts phone double-prefix), or a `canProceed` step-gate that blocks a seeded edit (PipelineConfig
  stages). Because row-type ≠ draft-type, that remainder stays a MANDATORY drop-on-load-hydration QA CHECKLIST item in
  review-fix.js (qa lens) rather than being force-fit into a low-signal script gate.

- **T-007** Promote "drop-on-save round-trip" to a gate (SI-4). — **RESOLVED (gate authored)** (2026-07-09)
  from: self-improve (defect→gate) · assignedTo: tech-lead → frontend-eng · type: defect · severity: major
  refs: [scripts/team/gates/roundtrip.mjs · defect-log.md drop-on-save-round-trip (count 4)]
  delivered: `roundtrip.mjs` (G-ROUNDTRIP) — a static, dep-free scan (same spirit as coherence/a11y). It reads
    every `export interface *Draft` shape from `src/components/**` and, for each `(d: XxxDraft) =>` save handler in
    `blocks/**/*.block.tsx`, asserts every top-level Draft field is either read as `d.<field>` OR the draft is
    forwarded wholesale (`...d` / `[id]: d`). Missing field (minus `id`) → FAIL with file:line. Opt out a
    genuinely-transient field with `// roundtrip-allow <field>`.
  why-not-smoke: a vitest round-trip needs per-page harness wiring (4+ pages, growing); the static scan catches the
    exact recurrence (a forgotten `d.<field>`) deterministically, at edit-time, with zero per-page maintenance.
  scope-honesty: whole-handler scope — catches a field forgotten across ALL branches (the observed pattern); it does
    NOT diff create-vs-edit branch coverage (would need control-flow analysis). Documented in the gate header.
  proof: red-checked by dropping AppDraft `subOrgIds` from both branches → FAIL(1) at settings.block.tsx:280; PASS
    (5 draft shapes) on the clean tree. Wired into PostToolUse (Edit|Write), review-fix workflow, conductor gate chain.

- **T-004** Settings nav labels differ from Figma. — **WONTFIX** (2026-07)
  reason: per user, some Settings frames ship an OLD SettingsNav — we intentionally do NOT match the frame's nav;
  the current DS `blocks/settings` sections are the source of truth (frames drive the CONTENT panel only). See
  decisions.md "Settings model" (3).

- **T-002** Pipeline toolbar multi-facet filter (status + priority + type) next to search. — **RESOLVED (already-fixed; verified by static trace)**
  from: qa · assignedTo: tech-lead · type: defect · severity: major · status: resolved (tick 3, 2026-07-07)
  finding: the multi-facet path is fully wired end-to-end — deriveFilters (config-render.ts:166) returns all
    configured facets → config-bridge maps ALL into `facets: Facet[]` (config-bridge.tsx:502 entity, :564 pipeline)
    → AppShell passes `facets` plural (AppShell.tsx:404,745) → ModuleToolbar renders a grouped "All Filters"
    popover (:962), per-facet named dropdowns (:1009), active chips (:1033) + count badge, all next to search.
    Golden deals pipeline recipe configures 2 facets (status + systemcol2/Priority), exercising it.
  note: the ticket's "actual: single Filter popover / collapsed to one filterField" described the PRE-fix state;
    the fix had landed (shell rework) but the ticket was left open. Singular `filterField`/`getFacet` path is dead
    legacy → split to T-003 (cleanup). Live-UI confirmation was blocked this tick (preview browser returned
    chrome-error navigating to the dev server); closed on conclusive static trace, not a live screenshot.

- **T-001** Coherence gate: raw-hex violations (25) in `src/components` (token-only law). — **VERIFIED**
  from: coherence-gate · assignedTo: frontend-eng · type: defect · severity: major
  refs: [scripts/team/gates/coherence.mjs] · status: verified (tick 2, 2026-07-07)
  fix: 18 real hex→token substitutions (side-nav → --sidebar-primary/-foreground + primary-foreground;
       top-nav dots → --status-error/-warning; dashboard-widgets → --popover; state-pill/state-transition
       defaults → --primary-foreground; figma-basics → --fig-surface-primary; maintenance-checklist tints →
       color-mix(status token)). 7 legitimate lines scoped with `// coherence-allow` (live-monitoring
       map-engine STATUS_HEX+severity+fallback, side-sheet window-chrome dots, zone-create colour palette).
  gates: coherence PASS(0) · tsc PASS. Rendered colour unchanged (light-mode token values match hex 1:1).

## Escalated to human
(none)
