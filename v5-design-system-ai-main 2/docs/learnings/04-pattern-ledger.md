# Pattern Ledger — Index (69 patterns)

Short form. Each pattern is the **canonical solution** for a recurring problem across the platform. Full details live in `knowledge-base/product-context/30-pattern-ledger.md` and the per-module specs it links to.

**Rule of use:** if your build needs one of these shapes, use the pattern as-is. Don't reinvent. Pattern numbers are stable.

---

## Shell & navigation

| # | Name | Where |
|---|---|---|
| 01 | Global Shell / Side Navigation — two-rail (App + Module) + bottom utilities | Platform-wide |
| 02 | Module Top Nav / View Switcher — saved-view tabs + `+` | Inside any module |
| 14 | View Template Chooser (empty state) — first time user adds a view | All modules |
| 65 | Cross-app × Cross-module Source Filter | Inbox, future global search |
| 66 | App Provenance Badge — `🛡 CCMS` pill | Notification cards, cross-app artifacts |
| 68 | First-Time Feature Coachmark | New nav elements |
| 69 | Fixed-Taxonomy Tab Strip (vs Saved Views) | Inbox sub-tabs |

## Entities (base module)

| # | Name | Where |
|---|---|---|
| 16 | Entity List Chassis — configurable-columns data table | Every entity module's default view |
| 17 | Entity Detail Chassis — side sheet w/ identity card + tabbed widgets | Every entity's detail view |
| 18 | Entity Creation Drawer — multi-step right drawer, inline-add linked entities | "+ Add" on any entity list |
| 19 | Linked-Entity Tab Pattern — list of linked entities on detail | Entity detail tabs |
| 20 | Overview Widget Grid — multi-widget Overview tab | Entity detail Overview |
| 21 | Feature-Locked Empty State — tab visible but unlicensed | Any unlicensed tab |
| 22 | Multi-Source Device Health Strip | Entity Overview top |
| 44 | Derived Health Status Pill | Entity identity card |

## Pipelines (base module)

| # | Name | Where |
|---|---|---|
| 25 | Pipeline-to-Entity Linking (creation + inline) | Pipeline create drawer + identity grid |
| 26 | Kanban Card configurable template (4 sizes) | Every pipeline's Kanban view |
| 27 | Pipeline Record Detail Chassis — accordion body + right-rail tabs | Every pipeline record's detail |
| 28 | Pin Column (Kanban) | Kanban view header |
| 29 | Right-rail Tabbed Activity Panel | Pipeline detail (always) |
| 30 | `@`-Mention Comment Composer | Pipeline detail comments |
| 31 | Multi-tab Record Window — Chrome-style tab bar of open records | Pipeline detail |
| 32 | List/Image View Toggle (Kanban) | Kanban toolbar |
| 33 | Aggregate Stage Metric (Kanban) — `Completed (9) · AED 54,650` | Kanban column header |
| 34 | Structured Sub-Document (Checklist + Photo Grid + Signature) | Inspection-style records |
| 35 | Right-rail Widgets Shelf (list view) | Some pipeline list views (e.g., Leads V1.0) |
| 36 | Secondary Consequence Drawer | Pipeline detail secondary actions |
| 37 | Inline Cycle Stacking — repeating cycles as stacked accordions | IWMP rectification, multi-round interviews |
| 40 | Multi-Trigger Progress Row (Grouped List) — N parallel progress bars per row | Preventive Maintenance grouped list |
| 41 | Left-Rail Stepped Wizard | PM New / Edit |
| 42 | Rule Preview Table (Generated Triggers) | PM Trigger Rule step |
| 43 | Per-Status Action Button (Detail Header) | Maintenance Job Order detail |
| 46 | Nested Picker Modal-over-Wizard | PM Add Asset Types sub-modal |

## Live Monitoring

| # | Name | Where |
|---|---|---|
| 03 | Live Monitoring base pattern — hybrid two-pane + status glyphs + cluster ring | Real-time IoT modules |
| 10 | Asset State Vocabulary — 5 states (Moving/Idling/Stopped/Stationary/Immobilized) | Live Monitoring + everywhere asset-state shows |
| 11 | Status Glyph component | Lists, map pins, cards |
| 12 | Universal "Restricted State" Glyph Family | Any restricted/locked entity |

## Spatial (Zones / POIs)

| # | Name | Where |
|---|---|---|
| 05 | Spatial Overlay Drawer | Map canvas + togglable layers |
| 06 | Bulk Import / Review Modal | Zones (KML), POIs (CSV/KML/GeoJSON), any bulk-import |
| 13 | POI Authoring — icon derived from primary Tag | POI module |
| 15 | Platform Tag Model | Platform-wide |

## Destructive / alert actions

| # | Name | Where |
|---|---|---|
| 04 | Destructive / Critical Action Pattern | Immobilize, Suspend, Cancel, Revoke, Delete, Force Logout |
| 53 | Bulk Reassignment Modal | Dispatcher reassign |
| 54 | Justification-Required Dismissal | Real-time alerts |
| 67 | Bulk Action with Undo Toast — commit-then-recover | Inbox Clear All, cheap-to-undo bulk |

## Dashboards

| # | Name | Where |
|---|---|---|
| 23 | Dashboards Module Chassis — KPI strip + filter pills + widget grid | Dashboards module |
| 24 | Tenant-Level Calculation Constants | Settings → Preferences (Fuel Costs) |
| 48 | Compliance Gauge (semi-circle thermometer) | Operational / Driver Behaviour / Workforce Readiness dashboards |
| 49 | Stacked Operational KPI (actual-vs-target) — `3,780 tons /4,032 tons` | Operational Dashboard KPI strip |
| 50 | Heatmap Calendar — day × week/month grid | Bin Profile, Driver Behaviour |
| 51 | Geospatial Heatmap — translucent density overlay on map | Driver Behaviour, Hotspot Events |
| 52 | Leaderboard with Podium + Delta Arrows | Driver Behaviour |
| 55 | Inline Sparkline-in-Row | Inspector Performance leaderboard |

## Reports

| # | Name | Where |
|---|---|---|
| 56 | Composite Multi-Template Report | Asset Lifecycle Report (Fuel + Maintenance + Spare + TCO) |
| 57 | Reports Filter Rail (persistent 280px) | Every Report builder |
| 58 | Report Output Mode Toggle (List ↔ Hybrid) | Report builder toolbar |
| 59 | Report Subscription Flow (multi-step modal) | Schedule / Subscribe |
| 60 | Report Card (Home grid) | Reports Home landing |
| 61 | Drill-down Result Row | Reports tabular output |
| 45 | Branded Transactional Email Template | Email-channel reminders + report deliveries |

## Filters

| # | Name | Where |
|---|---|---|
| 08 | Advanced Filters — popover, saved per user | Every module |
| 09 | Modified-View State | Any saved view that has unsaved filter changes |

## Inbox / Notifications

| # | Name | Where |
|---|---|---|
| 62 | Real-Time Toast Stack (≤3) | Pipeline pages, platform-wide |
| 63 | Inbox Notification Card | Inbox feed + toasts |
| 64 | Browser-Push Pre-Prompt Modal | First entry into a realtime-notifying module |

## Tenant / brand

| # | Name | Where |
|---|---|---|
| 47 | Multi-stop Gradient App Rail (Pattern #47) | Tadweer-style brand rail |

## Other / future

| # | Name | Where |
|---|---|---|
| 07 | Settings IA chassis (proposed, TBD) | Platform Settings |

---

## How to add a new pattern

1. Confirm it doesn't already exist (search this file by problem name, not your label).
2. Add an entry to `knowledge-base/product-context/30-pattern-ledger.md` (the long-form ledger) with the next integer.
3. Mirror the one-liner here in the right section.
4. Cross-reference the relevant module spec MD.
5. Once it's used in 2+ builds, lift the implementation into `packages/ui/` so future builds inherit it automatically.

## Source of truth

Long-form ledger: `knowledge-base/product-context/30-pattern-ledger.md`. Always defer to it on the substance; this file is index-only.
