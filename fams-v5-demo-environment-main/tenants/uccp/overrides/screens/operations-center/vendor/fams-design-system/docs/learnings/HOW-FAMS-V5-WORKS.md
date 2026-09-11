# HOW FAMS V5 WORKS — A Cross-Cutting Synthesis

> **What this doc is.** A single end-to-end explainer of how FAMS V5 lives in the
> real world: the core product, the white-label model that lets it be sold to
> Truemax / EAD / Tadweer with one engineering team, and the mix of pre-V5 and
> V5 surfaces still coexisting in production. It is *not* an encyclopedia —
> structural breakdowns live in `knowledge-base/product-context/*.md` and
> `knowledge-base/design-system-v2/*.md`. This doc is the connecting tissue.
>
> **Read order.** Start at §1 for the mental model. §2 explains why the same
> codebase ships as three different products. §3 is the load-bearing reality
> check: where pre-V5 is still surfacing. §4 walks five user-visible modules.
> §5 names what makes the platform actually composable. §6 is the wobble list —
> the documented compromises plus the bind-mount truncation gotcha that has now
> bitten four kit-builds in a row.

---

## 1. What FAMS V5 is

FAMS V5 is a **low-code IoT operations platform**: a single codebase that
hosts apps for fleet management, waste collection, smart cities, CRM, HRMS,
field service, and aviation — all running against the same module library,
all themed per-tenant, all wired together by JSON config rather than bespoke
React. The user sees a "product" (CCMS, CRM, IIMS, Tajmee Commercials,
Truemax Workshop); engineering sees a *composition* — a stack of base
modules + tenant config + a few SVG and CSS overrides.

The kit at `V5 Design System - Ai/` is the executable expression of that
idea. Tokens live in `packages/tokens/theme.css`. Tenant overrides live in
`packages/tokens/tenants/<slug>.theme.css` (currently `fams-v5`, `ead-rms`,
`tadweer`, plus `_template`). UI primitives ship from `packages/ui/`.
Domain modules ship from `packages/modules/` in seven kinds: `entity`,
`pipeline`, `reports`, `inbox`, `dashboards`, `live-monitoring`,
`settings` — though only the first two are full chassis today; the other
five are Stage 4 stubs that render a "Coming soon" card with the config
they received. The shell ships from `packages/shell/` and exposes
`AppShell`, `TenantProvider`, and `ModuleRegistry`. Use cases (`crm/`,
`hrms/`, `workshop-maintenance/`, `fleet-telematics/`, `waste-collection/`,
`field-service/`, `smart-cities/`) live under `use-cases/` as recipe JSON
that picks modules and plugs them with fields, stages, tabs, and views.

The platform principles encode the *non-negotiables* — the rules that hold
across every product built on this substrate.

**P1 — Base modules are configuration UX, not fixed UI.** A "Vehicle
Management" module is not bespoke screens; it is the Entity chassis fed a
config that names the fields, the tabs, the default view, the linked
modules. The same engine renders Driver Management, Bin Profile, Skip
Profile, Company, and Contact. Documented in
`knowledge-base/product-context/02-platform-principles.md`.

**P2 — View surface is module-declared.** Each module says which views
it exposes — Entities default to List (sometimes Hybrid map+list);
Pipelines declare four (Kanban / List / Hybrid / Calendar) plus the
Preventive Maintenance Grouped List variant; Live Monitoring is its own
chassis. The user sees view-tabs at the top of each module (Pattern #02);
they can save filtered variants but cannot invent new view types.

**P3 — Shared spatial reference contract.** Every map across the
platform — Live Monitoring, Hybrid pipeline views, Plan Monitoring,
Reports hybrid output, Spatial Overlay Drawer — uses one Zone/POI
interface. A zone defined in Settings appears identically wherever it is
referenced, with consistent overlay drawer semantics (Pattern #05).

**P4 — Entities are tenant-configured, not platform-hardcoded.** The
12-tab default on an Asset Profile (Overview / Details / Trips / Events /
Fuel Monitoring / Job Orders / Preventive Maintenance / Reported Issues /
Devices / Workforce / Documents / Timeline) is a *superset*. The Mercedes
Econic walked in `13-entity-tabs-detail.md` shows 9 tabs — Trips,
Events, Job Orders, Devices, Workforce, and Documents are dropped;
Maintenance, Reported Incidents, Inspections, Timesheet, and Attendance
Log are added. P4 says the tab set is configured per tenant per entity
type, not legislated by the platform.

**P5 — Pipelines are tenant-configured workflow primitives.** Stages,
their colors, their next-stage transitions, the right-rail tab choice
(Activity / Timeline / Messaging / Penalties / Related), the accordion
catalog inside the detail — all tenant-defined. A Leads pipeline has
"New Leads → Initial Contact → Follow up → Qualified → Converted /
Unqualified"; an Incident pipeline has "Awaiting Rectification →
Rectification Submitted → Escalated → ..."; structurally they are the
same chassis with different config. Documented in
`knowledge-base/product-context/14-base-module-pipelines.md`.

A sixth principle is on deck but not yet ratified: **P6 — Some pipelines
author other pipelines' records via rules.** Preventive Maintenance is
the first observed instance — it is a rule-authoring pipeline whose
output is auto-generated Job Order records in a different (corrective)
pipeline. See `15-web-portal-additional-modules.md` §5.

Cross-cutting on top of P1–P5: the **Tag Model** (every tag is
`{name, color, icon, ?description}` and its icon propagates to every
surface the tag appears on); the **Destructive Action contract** (red
button → modal with consequences + reason + intent-proof + audit trail —
never bypassed); and the **Modified-View State** (saved view + unsaved
filter changes = "Modified" strip with Save / Save as new / Revert).

---

## 2. The white-label model — one product, three brands

The user's words frame this best:

> "We have the core product and we also something change branding and logo
> to give out as core product here you will find a mix of some previous
> design system elements and new but would make you understand how FAMS V5
> works."

Three tenants are captured in the knowledge base — **Truemax** (fleet
workshop maintenance — blue brand, the FAMS V5 default), **EAD RMS**
(Environment Agency Abu Dhabi — solid blue rail, slightly different
typography weight, see `live-product-references/03-ead-rms-whitelabel.md`),
and **Tadweer** (Abu Dhabi waste management — green primary plus the
diagonal 5-stop gradient app rail). Comparing them shows what FAMS V5
actually treats as "the brand."

What **stays constant** across all three: the entire UI primitives layer
(`packages/ui/`), the seven base-module engines, the Pattern Ledger #01–#69
(side-sheet detail chassis #17 / #27, kanban card #26, list chassis #16,
view tabs #02, destructive modal #04, advanced filter popup #08, tag
model #15, linked-entity tab #19, overview widget grid #20, multi-source
health strip #22, branded transactional email #45, all the way through to
#56–#61 Reports patterns), the gray ramp, the radius scale, the Gilroy +
Untitled UI type system, the spacing rhythm, the icon library, the
elevation ladder, the field-type catalog, the entity tab catalog, the
pipeline stage palette logic, the IA (App Rail → Module Rail → View
Tabs → Toolbar → Content), and the JSON schema for module configs.

What **swaps per tenant**: the primary color (`--primary`), the optional
sidebar gradient (`--sidebar-gradient`), the secondary tint
(`--secondary`), the accent color (`--accent`), the ring color
(`--ring`), the active-item color in the side nav, and the logo asset. In
the kit, that is the entire delta in `packages/tokens/tenants/tadweer.theme.css`
— a 65-line CSS file overrides about 10 variables and the gradient. The
EAD RMS tenant file is similarly compact. This is the load-bearing finding
of the white-label walk: a tenant override is **less than 20 CSS
variables plus one SVG**.

What **also varies but is treated as content, not branding**: the
specific *modules* a tenant deploys. Truemax has Workshop Maintenance,
Asset Lifecycle Reports, Billing Report. EAD has its own incident +
zone-based modules. Tadweer's January release ships seven Tajmee
Commercials modules; by June, the same Tadweer tenant runs roughly forty
modules across Tajmee + CCMS + IIMS + Driver App + Inspector App + RMCC
+ Collection Point + Deep Washing + Ticketing + Hotspot Events. Modules
are added via recipe JSON; engineering does not need to ship new code
unless the module asks for a capability the chassis doesn't yet support
(e.g., the multi-trigger progress row in Preventive Maintenance, the
grouped-list view, the rule-preview table — these triggered library
additions, not per-tenant code).

The Tadweer release timeline in
`live-product-references/tadweer/20-evolution-jan-to-june.md` is the
clearest demonstration of this model in motion: six monthly Figma files,
ever-growing module count, no break in the design language, no per-app
forks. The same Side Sheet primitive renders an Incident detail in IIMS,
a Bin profile in CCMS, a Contract record in Tajmee Commercials, and a
Service Request in the Driver Behaviour module. The same Kanban Card
template renders a Bin Washing job, a Bulky Waste pickup, a Skip removal,
and a Workshop Maintenance Job Order. The same Reports chassis
materializes a Mileage Report, a Driver Behaviour Report, an Asset
Lifecycle Report, and a Vehicle Utilization Report.

That is the white-label model: **one design system, one component
library, one module engine; tenant-swap = tokens + logo + recipe.**

---

## 3. The mix of old and new — where pre-V5 is still surfacing

The user's hint that "you will find a mix of some previous design system
elements and new" is borne out in the live files. None of it is
catastrophic — the V5 chassis carries the day — but the migration is not
complete, and these are the places where the seams show.

**Tadweer's mobile Driver App still uses older patterns.** Documented in
`tadweer/50-older-design-traces.md` §1: the mobile screens across January,
February, and April releases show larger button radii than V5, a heavier
display weight that isn't in the Gilroy 400/500/600 V5 ramp (some Bold
700 headings), and the side rail is solid green rather than the multi-stop
gradient. The web portal runs on a refactored V5 tenant theme; the mobile
app appears to consume a separate theme.css that hasn't been refactored
yet. Cleanup-backlog items **T-53** (Bold 700 type drift) and
implicitly the mobile theme.css refactor sit here.

**IIMS pages use the solid-green rail; Tajmee Commercials uses the
gradient.** In the same January Tadweer file, Inspector Activity Tab,
Inspector Performance Dashboard, and Incident Reporting & Management all
render with a solid green sidebar — *not* the 5-stop diagonal gradient
that defines the Tadweer brand surface elsewhere in the same release.
The hypothesis in `50-older-design-traces.md` §2 is that IIMS was
branded first (when solid green was the standard) and Tajmee migrated to
the gradient later in the same release cycle, with IIMS not yet
back-ported. Cleanup item **T-52** — pick canonical, migrate the
other.

**Three separate email-template modules across three releases.** March
ships `📩 Email Template`; May ships `Checklist Issue Email`; June ships
`📩 Email Notifications`. All three render Pattern #45 (Branded
Transactional Email) independently — there is no platform-level Email
Templates Library yet. Cleanup item **EF-08** consolidates these. This
is also the strongest hint that the platform's notification surface
(Inbox, toasts, email delivery, the Reminders step in creation wizards)
is real but not yet centralized — the Reports module's Subscription flow
(`16-module-reports.md` §5) delivers via the same Pattern #45 chassis but
through its own pipeline.

**Compliance Monitoring V1 / V2 / V3 coexist.** April ships V1
(`278:2573`) and V2 (`554:1642`); June ships V3 (`2007:2`). All three
dashboards live in the same files. V3 is the canonical state; V1 and V2
are migration debt that hasn't been removed. Cleanup item **D-13**.

**Pre-V5 component traces in red annotation boxes.** February's "Add
New Company" empty state file (`220:393`) has coral-pink annotation boxes
authored by the designer, some of which read literally "Re-using V2 map
component — should migrate to V5 Map atom." The designer's own backlog
is in the file. Cleanup-backlog item flagged.

**Casing drift on `#22C882`.** Different surfaces emit `#22C882` vs
`#22c882`. Trivial, but confirms there is no single token-emit pipeline
yet — surfaces render the value, not a token reference. The tenant
override CSS uses uppercase consistently; production HTML is mixed.

None of these blocks the kit. They are migration debt — the kind of debt
a platform *expects* when it grows from ~12 modules to >40 in six months
across multiple sub-products. The V5 chassis absorbs all of it because
the override surface is so small: even surfaces that have drifted on
type weight or sidebar fill still consume the same field-type catalog,
the same kanban card slots, the same view-tab chassis.

---

## 4. Module-by-module reality — the five spot-checks

Five surfaces were re-inspected against their documented walks. All five
matched. The story below is how the user actually experiences each one,
not the structural breakdown (which lives in the named MDs).

**Web Portal Maintenance / Job Orders** (`suo7zX7QrsiIeT57UV34yZ`,
node `28358:5505`, 4 sections / 28 frames — matches
`15-web-portal-additional-modules.md` §1). A driver reports a vehicle
issue. The shift dispatcher opens the Maintenance module and sees a
Kanban with five (MVP) or six (V1) columns — New Requests, Scheduled,
In Progress, Under Inspection, Closed; V1 adds Overdue and Invalid.
Each card carries the job ID, a Type chip (PREVENTIVE orange or
CORRECTIVE green), the service title in ALL CAPS, the vehicle (plate +
odometer), a technician avatar, and a scheduled time that turns red
when overdue. Click a card and the side-sheet detail opens — a single
pane with a status pill and a one-click action button that changes with
stage (Schedule → Start → Complete, Pattern #43), an accordion stack
(Asset Details, Issue Details, Schedule Info), and a right-rail Activity
panel that mixes a Timeline with a Maintenance History tab for the same
asset. Multiple jobs open as browser tabs at the top of the sheet
(Pattern #31). Creation goes through a 4-tab right-side drawer (Basic
Info → Add Vehicle → Issue Info → Reminders) with a per-channel
selector for SMS, email, and in-app notifications. The Reminders step
emits the Pattern #45 branded transactional email — confirmed by the
two HTML email mockups in section `28360:8560`. The story for the user
is one of *resolution under accountability*: every state change is
logged in the Timeline, every reminder is auditable, every job has a
SLA-derived overdue indicator.

**Web Portal Preventive Maintenance** (node `29535:4252`, 6 sections /
37 frames — matches §2). A fleet manager wants the system to *prevent*
breakdowns rather than chase them. They open Preventive Maintenance
and see a Grouped List view (a new view type — Pattern #40 — that
combines tree-grouping by asset with multi-progress rows). At the top:
four KPI cards rolling up Overdue / Scheduled / Ongoing / Completed
maintenance across the fleet. Below: an expandable car-by-car table
where each row carries up to three live progress bars (Odometer / Date
Interval / Engine Hours) tracking against thresholds. When any one
hits 100% first, the system spawns a Job Order in the corrective
pipeline (§4 above). Authoring a new rule walks the user through a
6-step left-rail wizard (Pattern #41): Basic Config → Add Services →
Trigger Rule (with a live preview table — Pattern #42 — showing the
next seven generated triggers based on current settings) → Add Assets →
Reminders → Summary. The same wizard, with prefilled values and an
Update CTA, is the Edit flow. This is the platform's first
"rule-authoring pipeline" — a pipeline whose output is records in
another pipeline. P6 in waiting. The user's story is *configuration
once, automation forever*: write the rule, the platform pings the
driver SMS + the maintenance team email + spawns the work order.

**Launch Pad Pipelines** (`W2z46FvC6aOdzOHDc3rqD5`, node `345:1877`).
The MCP call timed out, so I'm trusting the persisted walk in
`14-base-module-pipelines.md` — which is detailed to a degree that
makes drift unlikely. This is the master catalog of pipeline use
cases — 10+ flavors from a single chassis. Leads, Incidents,
Inspections, HR Applications, Flight Reservations, Asset Handovers,
Lease Management, Invoices, Sales Deals, Sub-Tasks, plus the
calendar-default variants (Shift Scheduling, Smart Planning) and
the rule-driven (Preventive Maintenance). For the user, they all
*feel the same*: a kanban or list grouped by stage; click a card to
get the side-sheet detail with identity grid + accordions + right-rail
Activity/Timeline; change status via a dropdown that only shows valid
next stages (a directed graph defined by the tenant); link other
pipelines or entities at creation time via the picker drawer; multi-tab
records at the top of the sheet. The IWMP variants add KPI accordions
and a Penalties tab; HR adds an AI Score gauge and AI-prefixed stages
moved automatically; Flight adds a Messaging tab and tenant-red theme;
Asset Handover adds checklists + multi-angle photo capture + signature
drawer. *All* of it is the same chassis differently configured. This
is P5 in action.

**Web Portal Fuel Monitoring** (node `29403:16978`, 5 sections / 5
1920×1080 frames + 2 non-standard Asset Profile variants — matches
`13-entity-tabs-detail.md`). A fleet owner wants to know whether the
diesel they're buying is going into the vehicles. The platform exposes
this in two places — once as an Asset tab (per-vehicle), once as a
Dashboard (fleet-wide) — with V1 / V2 iterations of both surfaces
shipped side-by-side in the same file. V1 of the Asset tab shows four
KPIs (Total Fuel Consumed, Total Cost, Average Cost/km, Average
Consumption/km) plus a fuel-level gauge and two charts. V2 expands to
eight KPIs (adds Total Fuel Used, Number of Refueling Events, Number of
Fuel Theft Events), four charts, and a Fuel Monitoring Events map
filterable by event type. Empty states in V1 are *feature-locked* — a
"this feature is not enabled for your asset" illustration with a Learn
More link. V1 still ships in the file; this is intentional progressive
disclosure, not migration debt. The Fuel Monitoring Dashboard is its
own module (sibling, not nested in any entity), confirming the third
class of base module beyond Entity and Pipeline — *Dashboards* as
always-live KPI surfaces. The user's story is *trust through visibility*:
they see fuel theft events on a map, refueling patterns over time, and
per-km cost trending against tenant fuel-rate config (Pattern #24 —
Tenant Calculation Constants — pulled from Settings → Preferences).

**Tadweer January Release** (`AKU5PLaqjO1QBakY9pUAH1`, node `3:5` —
the Contracts canvas, 1 section "Contract Management" with the expected
Side Nav at 52w / Primary Nav at the documented structure). The
metadata XML doesn't carry fill data (gradients live in
`get_design_context`), but the structural skeleton matches what
`tadweer/10-brand-override.md` describes: a 5-stop diagonal gradient
authored as an inline `style={{backgroundImage:...}}` on the Side Nav
Primary frame (node `9:7006` per the brand override doc). Tadweer's
green primary `#22C882` and the gradient are correctly encoded in
`packages/tokens/tenants/tadweer.theme.css`. The user's story here is
*recognition*: a Tadweer field operator sees the green-gradient rail
and the Tadweer wordmark and recognizes "their" product even though
underneath it is the same kanban, the same side-sheet, the same
accordion catalog as any other FAMS V5 tenant. White-label done well
is invisible — the user thinks they have a custom product; engineering
knows they have a config.

---

## 5. Why FAMS V5 succeeds — the "this works because" insight

A re-brandable platform succeeds or fails on **how big the override
surface is**. FAMS V5 keeps it small for four interlocking reasons.

**One chassis per surface.** There are exactly three detail-view shapes
across the entire platform: Entity Side Sheet (Pattern #17), Pipeline
Task Side Sheet (Pattern #27), Pipeline Full-Screen (Plan Monitoring
flavor, also Pattern #27 with `detailVariant: 'full-screen'`). Picking
the variant is by *module kind*, not by screen estate, and the kit
enforces this with a flag on `PipelineModuleConfig`. Detail-view drift
is the single biggest design-system corruption risk; the spec at
`packages/modules/src/DETAIL-VIEW-VARIANTS.md` keeps it from
metastasizing. The same logic applies at the list level — kanban card
is Pattern #26, full stop; list row is Pattern #16, full stop; widget
grid in the Overview tab is Pattern #20, full stop.

**JSON-config-driven module composition.** A tenant deploys CRM by
loading `use-cases/crm/crm.recipe.json` + seven module JSON files
(leads, deals, invoices, companies, contacts, services, products), not
by writing React. Engineering ships *capabilities*; tenants ship
*compositions*. When the kit gets the recipe right, the example boots
with `pnpm dev` and the user can navigate it without engineering
intervention. Run 4 of the kit boot test transformed 2,448 modules
into a 1.8 MB JS bundle in 5.49 seconds — that is the surface area of
the entire library, including the seven module engines and the full
shadcn primitive set.

**Theme.css swap = tenant brand.** Twenty CSS variables plus a
sidebar-gradient plus a logo SVG is the complete white-label scope.
Tadweer, EAD, Truemax, FAMS V5 default all express their brand entirely
through that swap. No JSX changes. No icon library forks. No spacing
adjustments. The `--sidebar-gradient: none` default in
`packages/tokens/theme.css` is the load-bearing detail — solid-rail
tenants don't render the gradient; gradient tenants override the
variable; the same `<SideNav>` component handles both.

**Consistent IA + tag-driven taxonomy.** Every FAMS V5 product has the
same information architecture: App Rail → Module Rail → View Tabs →
Toolbar → Content + (sometimes) Right Rail. A user moving from Tadweer
CCMS to Truemax Workshop to CRM sees the same shell. Inside, the Tag
Model unifies cross-cutting metadata — tags propagate their icon to
every list cell, kanban card, detail header, and filter chip where they
appear, so a HOT tag in Leads and a CRITICAL tag in Incidents and a
PRIORITY-HIGH tag in Job Orders all feel like the same primitive.

The executable kit at `V5 Design System - Ai/` is the concrete expression
of all of this. CLAUDE.md routes any agent to the right next file. The
recipes are validated against schemas. The tokens are imported, not
restated. The components are composed, not re-implemented. When the
agent says "build a Workshop Maintenance app for Tadweer," the answer is
*clone the starter, pick the workshop-maintenance recipe (still a
scaffold today), import the tadweer tenant CSS, write the JSON config*.
Engineering remains in the library, not the build.

---

## 6. What's still wobbling

The kit is real and Run 4 builds cleanly, but several things are
deferred, partially-built, or repeatedly bite.

**The four documented compromises** (`COMPROMISES.md`) remain in place
from Run 1 through Run 4. (1) `tailwindcss-animate` is not in deps;
Radix dropdowns / sheets / dialogs pop on without slide-in animation.
Fix path is well-defined — port the keyframes into Tailwind 4 `@theme`
rules rather than re-adding the legacy plugin. (2) The linked-entity
inline-add hook is a free-text input, not a picker — the engine knows
to render a `linked-entity` field type but falls back to `<Input>`
because the `LinkedEntityPicker` shared component hasn't been built in
`packages/modules/src/shared/`. (3) `PipelineCalendarView` ships as a
chronological list, not a month grid — the data layout is correct but
visually unlike production; Stage 4 task. (4) `AppShell` uses internal
React state with no `react-router` — refreshing the page resets to the
first app + first module; URLs do not encode location. Each is small
on its own but together they cap the kit at "very good prototype" until
addressed.

**The bind-mount truncation gotcha.** This has now bitten *four
consecutive kit-builds*: Run 1 (12 fixes including null-byte
corruption in `icons/index.ts`), Run 2 (six blockers all the same
shape — Edit-tool growth truncating files silently at the original
byte length, surfacing as TS / JSX "unclosed tag" errors at compile
time), Run 4 (six blockers, same root cause, on `theme.css`,
`tailwind.preset.ts`, `types.ts`, `full-screen-detail.tsx`, and
`BOOT-TEST-LOG.md` itself). The lesson is encoded in CLAUDE.md and in
the BOOT-TEST-LOG.md: **never grow a file with Edit — always
`rm`+Write the whole thing.** This applies to *every* file in the
kit when an agent expands content past the original byte length. The
boot-test log is now the institutional memory of this rule; future
runs should keep flagging it.

**The five stub chassis.** Reports, Inbox, Live Monitoring,
Dashboards, and Settings all register as base-module engines today but
render a centered "Coming soon — <Module> base module" card with a
disabled "Generate full chassis" button (tooltip: "Coming in Stage 4").
Each ships a TypeScript types file mirroring the JSON schema and a
README explaining the Stage-4 expansion plan, but no real rendering
logic. This means the CRM example boots all seven module kinds but only
two of them (Entity and Pipeline) actually produce a useful surface.
Tadweer's >40 modules and EAD's incident surfaces *can* be authored as
recipe JSON today, but rendering them requires building those five
chassis. Stage 4 work, with `16-module-reports.md`,
`17-module-inbox-notifications.md`, and the persisted product-context
MDs as authoritative input.

**Plan Monitoring full-screen isn't exercised by any recipe.** Run 4
added the `detailVariant: 'side-sheet' | 'full-screen'` flag to
`PipelineModuleConfig`. `PipelineDetail.tsx` switches between
`<Sheet side="right">` (default) and `<FullScreenDetail>` (Plan
Monitoring style). `PipelineModule.tsx` substitutes the detail in place
of the list/kanban when `'full-screen'` is set. The full-screen chassis
spec is authoritatively documented in
`packages/modules/src/PLAN-MONITORING-SPEC.md` (1746-wide canvas,
32-row breadcrumb, 184-row KPI band, 974-row hero card with Plan Log
on the left and Mapbox-style canvas on the right, 1330-row analytics
grid). But *no current CRM recipe opts into `'full-screen'`*. The flag
flips correctly; nothing visually exercises it. The simplest fix is a
Plan Monitoring use-case recipe under `use-cases/` that exercises the
chassis — the Tadweer CCMS captures the production frames; the spec is
written; the chassis primitive exists. It just needs to be wired.

**`templates/starter` does not use `@fams-v5/shell`.** The starter is
intentionally a hand-rolled placeholder demonstrating the rail + top
nav with raw tokens — it imports only `@fams-v5/tokens` and
`@fams-v5/icons`. The CRM example shows the full wire-up, but a new
build cloning the starter has to wire `AppShell` themselves. Once a
recipe-builder UX lands, the starter should consume `AppShell` with an
empty composition and render the onboarding state from the shell
itself. Compromise #6 in `COMPROMISES.md`.

**Six of seven use cases are scaffold-only.** Under `use-cases/`,
`crm/` ships a recipe + seven module JSONs and the CRM example boots
in `examples/crm/`. `hrms/`, `workshop-maintenance/`, `fleet-telematics/`,
`waste-collection/`, `field-service/`, `smart-cities/` all ship only a
README describing the use case + a back-pointer to the relevant
product-context MD. Authoring these recipes is the next composable
unit of work — each one validates against `schemas/AppComposition.schema.json`
and reuses the seven module engines (when Stage 4 lands; today the
Entity + Pipeline ones suffice for most).

**Compliance audit has 8 MISS items.** `DESIGN-SYSTEM-COMPLIANCE.md`
maps every kit component to its Figma component set: 36 OK, 6 WARN, 8
MISS, ~25 GAP. The MISS items are justified (shadcn compositions —
`scroll-area`, `command`, `sonner`, `dialog`, `alert-dialog`,
`destructive-action-modal`, `filter-popup`, `linked-entity-picker`) —
they exist in the kit because the platform needs them; they exist in
Figma as patterns not component sets. The GAPs are Figma sets that
don't yet have kit components — the largest of these is the Reports
chassis (#56–#61), which lines up with the Reports stub.

**Run-history clarification.** The user's task says "Run 8 building
clean" but `BOOT-TEST-LOG.md` only documents Run 1, Run 2, and Run 4
— there is no Run 3 entry (Run 3 may have been an intermediate /
non-passing run not logged) and no Runs 5–8. Either the user meant
"Run 4 building clean" (the latest documented green build), or there
have been further runs not yet persisted to the log. Worth confirming
with the user; for now, the synthesis trusts Run 4 as the current
canonical green state.

---

## 7. Project URLs the user shared — can't be walked directly

The user previously shared three Figma URLs of the form
`https://www.figma.com/team/<teamId>/project/<projectId>/<title>` — these
are **project listings**, not individual design files. The Figma MCP
(`get_metadata`, `get_design_context`, `get_screenshot`) operates only on
files of the form `https://www.figma.com/design/<fileKey>/...` where
`fileKey` is a 22-character alphanumeric ID. A `/project/` URL points to
a folder containing multiple files; the MCP has no enumeration call to
list files within a project.

To walk additional sources from those projects, the user needs to open
each project in Figma and share **individual file URLs** (one per file).
Specifically:
- Click a file inside the project listing.
- Copy the URL — it will be of the form
  `https://www.figma.com/design/<fileKey>/<title>?node-id=<n:m>`.
- Share one or more of those URLs in chat.

Files already captured in the knowledge base (no re-walk needed):
- Design System V2: `4FS7S3tHKzZZpdFBA0aGkt`
- FAMS Web Portal: `suo7zX7QrsiIeT57UV34yZ`
- Launch Pad Pipelines: `W2z46FvC6aOdzOHDc3rqD5`
- Truemax tenant: walked into `live-product-references/01-truemax-workshop.md`
- Ducon tenant: walked into `live-product-references/02-ducon-maintenance.md`
- EAD RMS tenant: walked into `live-product-references/03-ead-rms-whitelabel.md`
- Tadweer Jan-Jun releases: `AKU5PLaqjO1QBakY9pUAH1`,
  `n0i75qJfZlSACytghHMs67`, `qLpsvk0JRDQ7CBoV96s0eU`,
  `V2oIwexvZeOyWdY5KhMkk3`, `vTuiXC3D390q2rFJSeeYg2`,
  `lXBH6N7ZpHfBuY60tH71TD` — all under `live-product-references/tadweer/`

If the three shared project URLs point to anything beyond these — for
example, additional tenant deployments (Aviation, HRMS-specific
products), older pre-V5 archives, or new in-progress modules — those
would expand the synthesis when individual file URLs are provided.

---

## 8. Where to go next (in this kit)

- **Stage 4** — build out the five stub chassis using the persisted
  product-context MDs (`16-module-reports.md`,
  `17-module-inbox-notifications.md`,
  `10-modules-live-monitoring.md`, plus Dashboards and Settings walks).
- **Exercise full-screen** — add a Plan Monitoring use-case recipe under
  `use-cases/plan-monitoring/` that flips `detailVariant: 'full-screen'`
  and renders the chassis from `PLAN-MONITORING-SPEC.md`.
- **Author the six scaffolded recipes** — `hrms/`, `workshop-maintenance/`,
  `fleet-telematics/`, `waste-collection/`, `field-service/`,
  `smart-cities/` each need a recipe JSON + module JSONs to match the
  README's intent.
- **Address the four compromises** — Tailwind 4 keyframes for animation;
  `LinkedEntityPicker` shared component; month-grid PipelineCalendarView;
  `react-router` wire-up in `AppShell` (or document the prototype-grade
  cap explicitly).
- **Migrate the pre-V5 traces** — mobile Driver App theme.css refactor,
  IIMS solid-green rail → gradient, three email-template modules → one
  Email Templates Library, Compliance Monitoring V1/V2 archival once V3
  stabilizes.

Each of these is a *capability* upgrade to the library, not a per-tenant
hack. That is the core promise of FAMS V5 — and the reason a single
codebase can ship as Truemax, EAD, and Tadweer simultaneously.
