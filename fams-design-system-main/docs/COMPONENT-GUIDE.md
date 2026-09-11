# Component guide — when to use what

> Constitution: see docs/knowledge-base/ — locked decisions, naming, architecture, tech stack.

The system has several components that look adjacent. This is the disambiguation so no one
picks the wrong one or forks a new one. Layer tags: L1 primitive · L2 layout · L3 composite · L4 shell.

## Messages & feedback

| Use | When | Not |
|---|---|---|
| **Toast** (L1) | transient, auto-dismissing confirmation ("Saved") | persistent info |
| **Alert** (L3) | persistent inline banner tied to a region (a warning atop a form/section) | a list of events |
| **NotificationCard** (L3) | one row in a notification list/bell dropdown (unread state, avatar, meta) | a page-level banner |
| **CriticalEventsList** (L3) | a feed of severity-ranked events (alerts panel) | a single message |

## Tabs & views

| Use | When |
|---|---|
| **Tabs** (L1) | switch content panels within a page (Radix tabs) |
| **ModuleViewTabs** (L3) | switch a module's *view kind* (List / Map / Kanban) — pill/segment strip |
| **ViewTabs** (L3) | *saved-view* strip — rename/close/add, dirty ("modified") state with Save/Revert |

## Pickers

| Use | When |
|---|---|
| **Combobox** (L3) | inline single/multi select from a dropdown; async via app hook |
| **PeoplePicker** (L3) | person-specific picker (avatars, "You" row, assignee-chip trigger) |
| **EntityPickerDrawer** (L3) | full-drawer *bulk* review-and-select of linked entities; **LinkedEntityChip** shows the result |
| **TagPicker** (L3) | tag selection specifically |

## Overlays & surfaces

| Use | When |
|---|---|
| **Dialog** (L1) | centered modal |
| **AlertDialog** (L1) | confirm/cancel; no outside-click dismiss (destructive confirms) |
| **DestructiveActionModal** (L3) | AlertDialog + typed-keyword confirmation + reason (audited deletes) |
| **Sheet** (L1) | bare side panel primitive — Radix Dialog, logical `side` (`left`/`right` auto-flip under RTL) |
| **DetailSheet** (L4) | record-detail side surface (header/body/footer chrome) built on Sheet |
| **FormSheet** (L4) | create/edit side surface with sticky save footer |
| **Drawer** (L1) | gesture-driven bottom sheet (vaul) — drag-to-dismiss, mobile quick actions. `direction` scoped to `bottom`/`top` only (vaul's `left`/`right` are physical, not RTL-safe — use **Sheet** for a side panel) |
| **Popover / FilterPopup** (L1/L3) | anchored transient content; FilterPopup adds count-badge + clear/apply chrome |
| **FilterPanel** (L3) | the full self-contained "All Filters" panel (own header, clear-all, save). Use **FilterPopup** for a lightweight popover of a few controls; use **FilterPanel** standalone (or as FilterPopup children *without* its clear/apply) for the mega-panel — never stack both chromes |
| **Command** / **CommandDialog** (L1) | cmdk-based searchable list; **Command** inline, **CommandDialog** as a "⌘K" modal palette (composes Dialog, no new Radix import) |

**Divergences from ported source (on record):** `Command` and `Drawer` were both
ported from `FAMS-Design-System-By-Shaheer`, restyled onto tokens, but each
diverges from that source in one deliberate way. `Command` adds
`CommandDialog` and `CommandShortcut` beyond what Shaheer's `command.tsx`
shipped — this is the standard shadcn/ui `Command` pattern (a modal-palette
wrapper plus a shortcut-hint span), added here for parity with upstream
shadcn rather than invented locally. `Drawer` is a bottom/top reinterpretation
of the source: Shaheer's original shipped with `direction="right"` (a
side-anchored drawer), but this design system scopes `Drawer`'s `direction`
prop to `'bottom' | 'top'` only and deliberately does not expose vaul's
`'left' | 'right'` (see the RTL rationale in `Drawer.tsx`) — the right-side
case that direction covered is served instead by **Sheet**, which uses
logical `side` and auto-flips under RTL.

## Detail / profile pages

| Use | When |
|---|---|
| **ProfileLayout** (L4) | tabbed entity profile (header + tab strip + panel) |
| **RecordLayout** (L4) | flat (non-tabbed) detail page; **DetailSection** + **FieldGrid** are its building blocks |
| **EntityProfileCard** (L3) | the identity card (hero/avatar + tags + fields) that sits in a profile's left rail |
| **DashboardLayout** (L4) | dashboard scaffold: header + KPI row + chart grid slots |

## Status / workflow

| Use | When |
|---|---|
| **Badge** (L1) | a status/label chip (tone or `colorIndex`) |
| **StateTransitionToolbar** (L3) | a *row of buttons* for few next-states (approve/reject bar) |
| **StatusTransitionDropdown** (L3) | a *dropdown* for many next-states, with guarded (reason-required) transitions |
| Both share the one **TransitionStage** type (`composites/transition-stage.ts`). |

## Progress & metrics

| Use | When |
|---|---|
| **Progress** (L1) | linear determinate bar |
| **RadialProgress** (L1) | single-value circular ring (table cells, coverage %) |
| **KpiTile** (L3) | a stat tile (value + IconBadge + TrendIndicator + description) |
| **SegmentedBar** (L3) | proportional multi-segment breakdown bar (not a chart engine) |

## Charts

Chart *chrome* — **ChartCard** (wrapper), **ChartLegend**, **ChartTooltip**, **IconBadge**, **TrendIndicator** — wraps whichever chart body is rendered inside it.

Chart *bodies* have shipped: **ChartContainer** is the one place in the system that touches ECharts directly; every renderer composes it. Pick by data shape:

| Use | When |
|---|---|
| **BarChart** / **CompareBars** | categorical comparison; CompareBars for a two-series (e.g. planned vs actual) comparison |
| **AreaChart** / **LineChart** | trend over time (area for cumulative/volume framing, line for rate/value framing) |
| **DonutChart** | part-to-whole composition |
| **Gauge** / **ComplianceGauge** | single value against a target or threshold; ComplianceGauge adds the compliance-band styling |
| **HeatmapChart** | density across two categorical axes |
| **Sparkline** | inline, axis-less micro-trend (table cells, KPI tiles) |

Compose new chart views from **ChartContainer** directly rather than forking a renderer; add chrome via ChartCard/ChartLegend/ChartTooltip around it.

## Color rule (reminder)

No component takes a raw hex. Use a closed `tone` enum (semantic status) or `colorIndex` (categorical → `--color-chart-series-N`).
Known gap: the categorical ramp is currently monochrome-blue; a multi-hue categorical token set is a pending decision.
