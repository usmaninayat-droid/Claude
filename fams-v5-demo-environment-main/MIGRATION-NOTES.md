# Migration notes — MME-FRMS-MVP content merge

Tracking doc for content identified in `MME-FRMS-MVP` (the standalone Qatar
MME FRMS demo fork, `tenants/frms`) during the `merge/frms-mvp-modules`
merge pass, that was either ported into this repo under the `uccp` tenant or
deliberately deferred. Canonical already imported most of the MVP's base
tenant content earlier (see the `import(designer): MME-FRMS-MVP …` commits
and the subsequent `tenant: rename frms -> uccp` commit) — this pass targets
the increment the MVP gained *after* that snapshot.

## Ported in this pass

- **Truncation/interaction-audit fixes** (`tenants/uccp/overrides/screens/operations-center`):
  `ZoneTable.tsx` (zone id wraps to 2 lines instead of ellipsis; Location/
  Description get a hover+focus tooltip), `FleetTable.tsx` (plate/IMEI switch
  from `truncate` to `whitespace-nowrap` — fixed-length identifiers never
  truncate), and the missing `.npmrc` (`ignore-workspace-root-check=true`)
  that keeps this vendored screen's `pnpm install` local instead of being
  absorbed into the demo-environment root workspace. Matches the MVP's
  `fix/ds-truncation-interaction-audit` branch (commit `7de4fa8`) and the
  same rule set now formalized in `fams-design-system/docs/guidelines/
  text-truncation.md`.
- **Incidents blueprint field-level UX refinements** (`tenants/uccp/modules/
  incidents/blueprint.json`): IconSelect/IconTextView glyphs on Type/
  Category/Source/Source Reference/Customer Name, several fields hidden from
  the creation sheet (Municipality, Onwani Number, Area, before-images — now
  populated by other flows instead of typed directly), label polish ("Request
  Type", "Complaint Description", "Source Reference / External ID",
  "Municipality (Zone)"), the `status` list reordered so `reopened` sits
  right after `assessed` instead of trailing after `closed` (matches an
  active-workflow reading better for kanban), and two new — currently
  **inert/unplaced**, matching their state in the MVP source — systemcolumns
  (`fld_inc_subtype`, `fld_inc_reported_photos`) added for schema parity. A
  follow-up should place these two in the creation sheet / list columns if
  the product wants them live.
- **`OnwaniLocationPicker` widget** (`fams-design-system`, `packages/
  v5-templates/src/creation-sheet/OnwaniLocationPickerWidget.tsx` +
  `MapSearchOverlay.tsx`): the consolidated "Onwani Number OR pin a location
  on the map" composite that replaces three separate fields (Location,
  Municipality, Area) with one multi-column edit widget. Wired into
  `fld_inc_loc_pin`'s `component` in the incidents blueprint. Required a
  small, additive `@fams/v5-composer` change — `EditWidgetProps.control`
  (the react-hook-form `Control`, typed `unknown` to avoid a hard RHF
  dependency in the contract) threaded through `SchemaForm.tsx`'s
  `FieldControl` — so a widget can read/write sibling columns instead of
  just its own value. Existing single-column widgets are unaffected (they
  simply don't destructure the new prop). Also added `react-hook-form` as a
  direct dependency of `@fams/v5-templates` (was previously only transitive
  via `@fams/v5-composer`). Verified live in the browser: `Requests &
  Complaints` → `New Request/Complaint` → Location Details section renders
  the mode toggle, Zone/Street/Bldg fields, map + search overlay, and
  Municipality/Area on-map selects; switching to "Add Location" correctly
  swaps in the Coordinates field. Zero console/page errors.

## Deliberately NOT ported — pending

- ~~**`planning-v2`'s flood-planning feature`** (~2,200 LOC)~~ → ported,
  `a7fe669`/`745ec01` (see "Ported in follow-up pass (2026-09-04)" below).
  Original entry, kept for history: `flood-plan-
  detail-sheet.tsx`, `flood-plan-hybrid.tsx`, `flood-plan-list.tsx`,
  `flood-plan-wizard.tsx`, `flood-planning-mode.tsx`, `flood-plan-types.ts`,
  plus new POI-pin SVGs, all under the MVP's vendored `planning-v2` override
  screen (`vendor/fms-main-ds/components/planning/`). All three override
  screens (`operations-center`, `planning-v2`, `inspector-shifts`) are
  standalone Vite apps pinned to **React 18.3.1** against this repo's
  React 19 — a known, pre-existing constraint, not something this merge
  introduces. Porting this feature means either backporting ~2,200 LOC of
  React-18 code as-is (perpetuating the version split) or migrating the
  screen to React 19 first. Source: MVP `fams-v5-demo-environment/tenants/
  frms/overrides/screens/planning-v2`, commit range `84712c4..45c67cd`
  ("FRMS flood planning + incidents rework").
- ~~**Wider DS diff surface** flagged during investigation but not
  reviewed/ported~~ → `Combobox`/`IconSelect` `popoverAnchorRef`, `Stepper`
  tabs variant, `RadioGroup`/`FileUploader`/`ImageGallery`/`ActivityFeed`
  cosmetics → ported, `7887906`. `ProfileSection.visibleWhen`,
  `basicCount` → ported, `7d65bad`. `onRecordSave` threading,
  `NotesProofsSection`/`FieldTilesSection` config → ported, `7d243d0`.
  `LocationMap`/`LocationPickerMap` camera-follow + opacity wiring was
  **not** in scope of the second pass and remains unported. Original
  entry, kept for history: each would need its own scoped review.
  Two items were flagged as live conflicts, not gaps, and were **not**
  ported (still true — no later commit has touched them):
  `CreationSheet.tsx`'s wizard-branch close-button
  behavior (canonical has a deliberate later a11y fix) and `ProfileStack.tsx`
  traffic-light-dot glyphs (canonical deliberately removed them after a
  Figma QA pass).
- **`incidents.seed.json` reseed** (MVP's is +5,172 lines over canonical's):
  not hand-copied — regenerate via this repo's own seed generators
  (`tools/seeds/gen-uccp-*.mjs`) if the two new inert fields above get
  placed and need seed coverage, rather than importing MVP's raw JSON
  (risk of dangling refs against this repo's newer schema).
- ~~**`live-monitoring` blueprint wording`**~~ → resolved, `52f7349`
  ("Last Discharged On", `uccp`-only — `fams`/`iwmp` untouched). Original
  entry, kept for history: canonical's field said "Last Collection On"
  (waste-collection wording); the MVP line has "Last Discharged On"
  (flood/drainage-correct for FRMS). Left as-is at the time — a product
  call, not a clear bug — flagged for a follow-up decision rather than
  silently renaming a shared field.
- ~~**`app/src/demo/*` wiring`** the MVP grew (composer-data/incidents-
  assignment/profile-tabs helpers)~~ → ported, `4fe5c48` — still pending
  `@fams/platform-team` review (this seam is human-gated per this
  repo's `CLAUDE.md`, `@fams/platform-team` owns `app/src/demo/`).

## Ported in follow-up pass (2026-09-04)

- **`planning-v2`'s flood-planning feature** (the item flagged above under
  "Deliberately NOT ported") is now ported as-is into the canonical
  `tenants/uccp/overrides/screens/planning-v2` vendored screen (React 18,
  same as the rest of that screen — the deferral reason no longer applied
  since the screen was already React-18-vendored, so no version migration
  was needed): `flood-plan-detail-sheet.tsx`, `flood-plan-hybrid.tsx`,
  `flood-plan-list.tsx`, `flood-plan-wizard.tsx`, `flood-planning-mode.tsx`,
  `flood-plan-types.ts`, `flood-planning-globe.svg`, and
  `components/map/poi-pins/` (new files, copied as-is — no `frms` identifiers
  in them); `App.tsx`, `package.json`, `compliance-gauge.tsx`,
  `leaflet-map.tsx`, `map-view.tsx`, `map/types.ts`, `planning/index.ts`,
  `interactive-planning.tsx`, `plan-monitoring-detail.tsx` (changed files —
  ported hunk-by-hunk, `frms`/`FRMS` identifiers adapted to `uccp`/`UCCP`,
  Qatar MME flood-response copy kept as-is). Also fixed a non-existent
  `var(--status-success-dark, ...)` reference (introduced by the source
  branch) to the real token `var(--success-700, ...)`, and mapped several
  new hardcoded gray hex literals in the new flood-planning files to their
  exact `var(--gray-N)` token equivalents (a few non-exact-match colors —
  a `#279aff` map-selection blue, an `#ededed` border, and SVG marker-glyph
  fill/stroke — were left as literals; no exact token exists for them and
  they follow this vendored screen's pre-existing convention of hardcoding
  status/glyph colors). `app/src/demo/planning-v2-module.tsx` needed **no
  changes** — its postMessage bridge is generic and already used the
  correct `uccp:*` message types on both sides. Gates: `tsc -b && vite
  build` green in the screen; `pnpm demo check` clean for this lane (one
  unrelated pre-existing failure — see below).

  **Classification / reachability** (per the `new-module` skill): this is
  not a new module — it's new content inside the EXISTING `smart-planning`
  module's `hybrid` view (plus `list`/`calendar`), already licensed for
  `uccp` in `tenants/uccp/tenant.json` (`modules[]` + an `applications[]`
  entry) and already routed to this vendored screen via the existing
  `app/src/demo/planning-v2-module.tsx` iframe embed. No `navEntry`, module
  manifest, or tenant.json change was needed or made — the feature is
  reachable through the pre-existing Smart Planning nav path.

- **`app/src/demo/*` host wiring/UX fixes** (the item flagged above under
  "Deliberately NOT ported", now ported — still flagged for
  `@fams/platform-team` review per this repo's CLAUDE.md, which gates
  `app/src/demo/`): `boot.ts` now seeds each incident's related-by-area
  siblings onto `related_pins` (`seedRelatedIncidentPins`, guarded on the
  tenant licensing `incidents/incident`) and threads the booted persona's
  display name into `createComposerDataFactory` as `actorName`.
  `composer-data.ts` gained a runtime audit trail: any `update`/`transition`
  on a record carrying an `activity` array appends a system-log entry
  (`describePatch`/`contentOfPatch`/`appendActivity`) describing the field
  change or status transition, so the Timeline tab reflects real session
  edits, not just seed history. `profile-tabs.tsx`'s Related Incidents tab
  now renders the SAME `RecordMapCard` the Kanban/Hybrid lenses use (via
  `compileFieldSet`), replacing a bespoke row, and exports
  `seedRelatedIncidentPins` for `boot.ts`. `incidents-assignment.tsx` grew
  the FM-6273 field-editability matrix: enum intake fields (Type/Category/
  Sub-type/Source/Priority) and text intake fields (Source Ref/Customer
  Name/Phone/Description) are now inline-editable in any non-final status,
  Assigned Inspector's editable range widened from INTAKE/TRIAGE-only to
  any non-final status, and a new Location group (Municipality via
  `InsetField`+`IconSelect`, Zone/Area + free-text Location, and an Onwani-
  Number-or-Location radio toggle via `RadioGroup`+`InsetField`+`Input bare`)
  is editable through ACKNOWLEDGED only. Renamed the source branch's
  `UCCP_*`/`INSPECTOR_STAGES` constant names to `OFFICE_*` to avoid reading
  as the `uccp` tenant id. Composed entirely from existing `@fams/ui-kit`/
  `@fams/v5-templates` exports — no hand-rolled markup — dropping the source
  branch's local re-implementations of `InlineEditField`/`PickerList` (both
  already promoted to `@fams/ui-kit` on this branch) in favor of the real
  ones; the canonical `PickerList` has no `selected` prop yet (no
  checkmark-highlight on the current value in the enum-field picker —
  flagged with a `TODO(@fams/ui-kit PickerList)` comment at the call site).
  Kept as canonical-only (NOT overwritten by the source branch's older
  state): the `inspector` role + landing-module privilege-gating fix in
  `model.ts`, all `frms`→`uccp` naming, `inspector-app` wiring in `seams.tsx`/
  `model.ts`, and the Operations Center Triage Console view + `WallKpiCard`/
  `WallPanel`/`WallStatBar`/`useWallClock`/`hideSwitcher` DS composites in
  `operations-center-module.tsx`/`command-center-view.tsx`/`content.ts`/
  `triage-console-view.tsx` — the source branch predates all of these on
  canonical, so its diff there is a regression, not an improvement. Gates:
  `tsc --noEmit` and `vite build` green; `pnpm --filter app test` has 9
  pre-existing timeout failures (`Test timed out in 5000ms`) in
  `ApiDataAdapter.test.ts`/`pilot.integration.test.ts`/`boot.test.ts` —
  confirmed environmental (machine under heavy concurrent-agent load; an A/B
  check with these 4 files stashed back to canonical reproduced the same
  timeouts, worse, on unmodified code) rather than a regression from this
  pass; `composer-data.test.ts`, the file that directly exercises the
  `composer-data.ts` change, is 4/4 green.

- **Incidents blueprint — placed the two inert fields + creation-sheet
  redesign** (`tenants/uccp/modules/incidents/blueprint.json`), resolving the
  "Ported in this pass" deferral above: `fld_inc_subtype` and
  `fld_inc_reported_photos` are no longer inert — `computeCreationGroups`
  (`@fams/v5-templates/src/creation-sheet/grouping.ts`) derives the wizard's
  first "Basic Info" step from the **array order** of non-`Auto`, non-
  `creation.hidden` `systemcolumns`, so surfacing them required adopting the
  MVP's reordered `systemcolumns` array (content identical to canonical's
  except this order and the field-level tweaks below — verified with a
  by-id structural diff, not a blind overwrite). Creation sheet is now
  `layout: "wizard"` (`basicCount: 5` → Type/Category/Sub-type/Description/
  Upload-Images as step 1), label "Create New Complaint/Request", with new
  wizard-only steps `sec_create_source_customer` (Source/Source Ref/Customer
  Name/Customer Phone) and `sec_create_location` (the Onwani/map picker).
  Hid Title/Location/Priority/Assigned Inspector/Before-Images from create
  (`creation.hidden: true` — same "load-bearing in detail, not in create"
  pattern already used elsewhere in this file); dropped `required` off
  Category/Source (both have defaults). Detail-page `profile.details`/
  `profile.sections` restructured to match: Customer Name/Phone promoted to
  the top strip, Category/Inspector promoted higher, Municipality/Onwani
  moved into the `sec_inc_address` map section (`FieldTilesMapSection`'s
  `tileRows`/`bareCols`, plus `markerCenter`/`relatedPinsField`/
  `relatedToggleLabel` — all pre-existing `LocationMapSection` props, nothing
  new needed DS-side), and three new sections: `sec_inc_reported_details`
  (`NotesProofsSection` `editable: true` — the always-on `FileUploader`/
  `Textarea` mode, also pre-existing), `sec_inc_driver_photos` (Before/After
  via `NotesProofsSection`'s `imagesField2`/`imagesLabel2`, pre-existing),
  and `sec_inc_reopened` (`ProfileSection.visibleWhen: { "$.task.status":
  { "$eq": "reopened" } }`, pre-existing). Kanban `statusList` reordered so
  `sts_reopened` sits right after `sts_assessed` (an active-triage read, not
  after `sts_closed`). `listcolumns`: Municipality relabeled "Municipality
  (Zone)", new Source column. Dropped the unused `"hybrid"` view kind (no
  `uiConfig.hybrid` block exists for this module). Two branding values kept
  canonical (NOT ported): `fld_inc_reported_by.default` stays "UCCP Admin"
  and the Activity feed's `currentUser` stays "UCCP Admin" (source has
  "FRMS Admin" — this tenant is `uccp`). No DS gaps: `wizard`/`basicCount`,
  `NotesProofsSection.editable`/`imagesField2`, and every
  `FieldTilesMapSection`/`LocationMapSection` prop used here already exist in
  this design-system checkout — confirmed by source read, nothing to flag.
- **`incidents.seed.json` reseed — done via targeted merge, not import**
  (resolving the "Deliberately NOT ported" deferral above): canonical has no
  `gen-incidents-*.mjs` generator to regenerate from (only `gen-uccp-detail-
  fields.mjs`/`gen-uccp-profile-parity.mjs`, both scoped to `live-monitoring.
  seed.json`), so per the fallback in that deferral, the MVP seed was
  reconciled field-by-field rather than imported wholesale. All 36 records
  match canonical 1:1 by `id` AND `status` (verified, zero mismatches) — the
  MVP's +5,172 lines are entirely the 6 new keys the fields above need
  (`reported_notes`/`reported_photos`/`driver_before_photos`/
  `driver_after_photos`/`reopened_notes`/`reopened_photos`), present with
  status-appropriate coverage (reported_* from `intake` on; driver_* from
  `job-ongoing` on; reopened_* only on the 2 `reopened` rows). Merged only
  those 6 keys onto canonical's existing 36 records by matching `id`; every
  other field (activity logs, report_proofs, etc.) is untouched canonical
  content, so this carries zero dangling-ref risk and zero re-authoring of
  already-reviewed seed data.
- **`live-monitoring` blueprint wording** (the deferred product call above):
  resolved to the MVP's "Last Discharged On" for `fld_lastcollection`/its
  `uiConfig` label — this tenant IS the flood-response product, so
  "Discharged" is correct; "Last Collection On" was leftover waste-collection
  wording. (Landed via a concurrent pass on this same file during this
  session; confirmed correct and included here rather than re-done.)
- Gates: `pnpm demo resolve --all` → `pnpm demo check` clean (byte-exact
  `resolved/uccp/incidents.*`, no dangling/new seed-integrity failures);
  `pnpm --filter app build` (`tsc --noEmit && vite build`) green. Note for
  future passes on this repo: this session hit a live multi-agent race on
  these exact files — a concurrent session's `git checkout`/reset briefly
  reverted this work mid-task after the first resolve/check pass; redone
  from the fork source and re-verified byte-for-byte before committing. If
  re-touching `tenants/uccp/modules/incidents/` or its seed, `git status`
  and re-diff against the MVP source before trusting the working tree.

## Inspector App merge (`merge/inspector-app`, 2026-09-03)

Separate pass, branched from `merge/frms-mvp-modules` in both this repo and
`fams-design-system`: merges the standalone **QATAR MME Inspector App**
(`/Users/apple/Desktop/New DS Projects/QATAR MME - Inspector App`, repo
`mshaheer-des/MME-FRMS-INSPECTOR-MVP`) into the canonical demo environment as
the UCCP tenant's Inspector-role content. Inventory first: canonical already
had an `inspector-shifts` override screen (a different, older "IIMS"
Incidents/Inspections/Penalty app — distinct data model and codebase), so
this is genuinely new content, not a re-import.

**App/module mapping.** One dedicated application in `tenants/uccp/tenant.json`'s
`applications[]` — `{ id: "inspector", name: "Inspector", modules:
["inspector-app"], hideSwitcher: true }` — containing ONE bespoke platform
module, `inspector-app`. The Inspector app's own three sections (Dashboard,
Requests & Complaints, Plan Monitoring) are NOT split into three separate
platform modules: the vendored bundle already owns a complete internal
navigation grammar for them (tablet `InspectorRail`, phone `BottomNav`), so
splitting would duplicate that, not compose with it. `inspector-app`'s
`navEntry` declares `fullScreen: true` (the same seam `command-center`
uses), which makes `V5AppShell` suppress the rail/top bar — and with them
the app switcher — for this route entirely. `applications[].hideSwitcher`
(new: `@fams/v5-kit`'s `AppDefinition.hideSwitcher`, `fams-design-system`
commits `468b5dc`/`3fc852c` on its own `merge/inspector-app` branch) is set
too, defensively, in case `fullScreen` is ever lifted for this route — the
"an inspector never navigates across apps" decision is meant to hold even
then. This is the ONE genuinely-missing DS capability this pass needed;
everything else (the vendored bundle's own Tooltip/44px idioms) already
existed. New role `inspector` (`app/src/demo/model.ts`'s `ROLE_PRIVILEGES`)
scoped to exactly `inspector-app.view` — no access to any other uccp module,
matching the persona's real-world scope. New persona `u_uccp_inspector` /
"Field Inspector" in `tenants/uccp/seeds/users.json`.

**Ported.** The whole `src/inspector-v5` tree + its vendored `@ds` subset
into a NEW override screen, `tenants/uccp/overrides/screens/inspector-app`
(own `package.json`/`.npmrc`/`vite.config.ts`, React 18.3.1 pinned, own dev
port `:6390`, `--ignore-workspace` install) — same isolation route as
operations-center/planning-v2/inspector-shifts, wired the same way
(`app/src/demo/inspector-app-module.tsx`, iframe, `import.meta.env.DEV`
switch). `scripts/vercel-build.sh` extended to a fourth screen. The
`fix/ds-parity-truncation-touch-targets` branch's intent (commit `5d66b8a`
in the source repo) is carried over but NOT copied verbatim: its bespoke
`.ins-hit-44::after` CSS class is replaced by the canonical Tailwind
pseudo-element hit-area idiom already established in `fams-design-system`
(`packages/ui-kit/src/composites/DataTableColumnControls.tsx`'s
`before:absolute before:-inset-*` pattern) — sized per element (`-inset-2.5`
for the 24px eye/attach buttons, `-inset-1.5` for the 32px chrome buttons) —
applied inline on the 6 touched buttons across `ActivityFeed.tsx`,
`RecordWorkspace.tsx`, `PlanCard.tsx`, `IncidentCard.tsx`,
`IncidentDetailSheet.tsx`, `DetailSheet.tsx`; the CSS class definition itself
was dropped from `src/styles/index.css`. `TruncatedText.tsx` (the
tooltip-on-hover/focus truncation wrapper) was kept as-is — it already
composes the vendored `@ds/components/primitives/tooltip`, which is
API-identical to `fams-design-system`'s own `Tooltip`/`TooltipContent`
primitive, so it was already "canonical primitives," not a workaround.
Trimmed the vendored surface to what's actually imported: dropped
`src/assets` except the two files `inspector-v5` really references
(`mm-logo.svg`, `tanker-3d.svg`) and dropped unused `package.json`
dependencies confirmed by grep to have zero imports anywhere in
`src/inspector-v5`/`src/ds` (MUI, Emotion, `react-dnd`, `embla-carousel`,
`react-day-picker`, `input-otp`, `next-themes`, `react-popper`,
`react-resizable-panels`, `react-responsive-masonry`, `react-slick`,
`react-router`, `date-fns`, `@popperjs`, `motion`, `react-hook-form`,
`vite-plugin-singlefile`) — `@dnd-kit`/`leaflet`/`maplibre-gl`/`recharts`/
`sonner`/`cmdk`/`vaul` etc. are genuinely used and kept.

**Skipped.** `mockup.html`/`preview.html`/`frms-prototype.html`/
`frms-platform-guide.html` and `scripts/snapshot.mjs`/`scripts/
preview-server.mjs` (the standalone repo's own device-mockup presenter and
dev tooling — dev-time-only, not part of the shipped app). The device-mockup
Tablet/Mobile toggle it provided is superseded here by the host's real
tenant/persona/viewport matrix.

**Verified.** `pnpm demo resolve --all` / `pnpm demo check` clean (byte-exact
`resolved/`, schema-valid `tenant.json` incl. the new `applications[].
hideSwitcher` field, no dangling seed refs). `pnpm --filter app test` — 40/40
passing. `vite build` green for the inspector-app screen, the main `app`,
and `fams-design-system`. Browser-verified at `:6350` (a free port, not
6100/6300/6400/6210) with `?tenant=uccp&persona=u_uccp_inspector`: renders
under uccp maroon branding with zero console errors at tablet-landscape
(1024×768, fine pointer — desktop-style left-panel/map hybrid view, matching
the locked "tablet landscape keeps desktop-style layout" rule), tablet-
portrait (768×1024, **coarse pointer/touch emulated** — the app's own
`useIsMobile` rule requires a coarse pointer for the 768–1024 portrait
range to flip to the mobile shell, so a plain fine-pointer 768px window
correctly stays desktop-style; a real tablet does not), and phone (390×844
— mobile shell, 4-item BottomNav, unconditional at this width). No app
switcher visible in any of the three. Clicked into Requests & Complaints on
tablet-landscape: toolbar, status-grouped list, and the MapLibre canvas all
rendered live with zero console errors.

**Open items.** (1) `landingModule` in `tenant.json` is tenant-wide
(`"first"`), not persona-aware — the Field Inspector persona does not land
directly on `/inspector-app` from `/`; verification navigated there
directly. A persona-scoped landing route is a `@fams/v5-kit` capability this
pass did not need to build. (2) The detail-sheet open flow (eye icon → full-
screen record detail) was smoke-tested via the rail/list/map render path,
not click-verified pixel-for-pixel against the source app's `RecordWorkspace`
in this pass. (3) `app/src/demo/*` is human-gated per this repo's `CLAUDE.md`
(`@fams/platform-team`) — this pass DID touch it (unlike the FRMS pass),
since wiring a new escape-valve module requires it; flagging for that
team's review before merge, same as `scripts/vercel-build.sh`.

## Second pass — remaining MME-FRMS-MVP refinements (2026-09-04)

Follow-up sweep across both repos on `merge/inspector-app`, split by lane
(ui-kit/tokens/v5-kit/showcase, v5-composer, v5-templates, demo screens,
demo planning content) and reconciled 3-way (canonical vs MVP fork vs
in-flight sibling agents sharing the same working tree).

### Ported — `fams-design-system`

- **`52ead56`** — `feat(ui-kit): DataTable/TableCell Figma parity` —
  contentType-driven truncation, column expansion, responsive column
  hiding, and the new `text-truncation.md` guideline doc. Reworked the
  `<th>`/checkbox `aria-label` wiring on `DataTable` (`Select row` /
  `Select all rows` now flow through an `ariaLabel` prop instead of a
  hardcoded string). This is canonical-only work, landed ahead of the MVP
  merge below — not a port from the MVP fork.
- **`7887906`** — `merge(uccp-ds): port MVP ui-kit refinements` — ported,
  taking only MVP-ahead behaviour: `Combobox`/`IconSelect`
  `popoverAnchorRef` (anchors a bare trigger's dropdown to its outer
  `InsetField` shell, DS V2 node 4834:5573) plus the twin-chevron →
  single rotating `ChevronDown` cleanup; `RadioGroup` bigger dot/2px
  checked border/softer focus ring; `Stepper` `variant="tabs"` +
  `onStepSelect` (with an axe fixture and a Showcase `StepperDemo`
  Variant gallery authored fresh here, since the MVP shipped the variant
  with no test/showcase coverage of its own); `FileUploader`
  `tileSize`/`onPreview`; `ImageGallery` `thumbnails`/controlled
  `open`/`onOpenChange` + capture-stamp overlay; `ActivityFeed.body`;
  `KanbanColumn` hover-only scrollbar. Canonical-ahead surface was left
  untouched and not overwritten: `DataTableColumnContentType`, the whole
  `wall-display` scope, `PickerList`, `InlineEditField`, the `frms`→`uccp`
  rename (incl. `qatar-mme.tokens.json` folded into `uccp.tokens.json`),
  the DataTable `PointerEvent` jsdom polyfill, and `v5-kit`'s
  `hideSwitcher`. Two of `@fams/ui-kit`'s own tests needed hand-fixing
  after this pass, because the `52ead56` `<th>`/checkbox `aria-label`
  rework landed in the same shared working tree as the MVP port and the
  two changes briefly disagreed on `Select row`/`Select all rows`
  selector text; both are green again as of `7887906` (158 files,
  2167/2167 on `pnpm --filter @fams/ui-kit test`, 159/159 on `test:axe`).
- **`7d65bad`** — `feat(v5-composer): port blueprint + field-widget
  improvements` — `ProfileSection.visibleWhen` (schema + config-render +
  types, documented in `EntityModuleConfig.schema.json`),
  `uiConfig.creation.basicCount` (decision #10's locked `5` stays the
  default), `SchemaFormField.reserveError`, and inset-label dropdowns
  anchoring to the whole `InsetField` box.
- **`7d243d0`** — `feat(v5-templates): port task-detail, section-renderer
  and map improvements` — `TaskDetailProps.onRecordSave` threaded to
  section renderers (`SectionComponentProps.onSave`) and registered tab
  components (`onRecordChange`); `NotesProofsSection` proofs-before-notes
  order, optional second gallery group, `divider`, always-on in-place
  editing (split out into a new `views/section-editors.tsx` to keep
  `section-renderers.tsx` near its ~300-line budget, rule 12);
  `FieldTilesSection` `tileRows`/`exclusiveCols`/`bareCols` layout config.
  The section-editors' `PickerList` call site still carries a
  `TODO(@fams/ui-kit PickerList)` — canonical's `PickerList` has no
  `selected` prop yet, so the enum-field picker has no checkmark
  highlight on the current value; no later commit on this branch (up to
  and including `7d243d0`) has added it, so this follow-up is still open
  (see "Open items" below).

### Ported — `fams-v5-demo-environment`

- **`a7fe669`** / **`745ec01`** — the flood-planning feature (previously
  flagged "Deliberately NOT ported") is ported into
  `tenants/uccp/overrides/screens/planning-v2`. The version-split concern
  that justified the original deferral no longer applied: both the
  canonical and MVP `planning-v2` screens are already the **same**
  isolated React 18.3.1 Vite app, pinned below the main repo's React 19 —
  porting the feature in does not create a new version split, it just
  adds content to an existing isolated screen. Ported effectively as-is
  (`frms`→`uccp` renamed, no `qatar-mme` theme reintroduced); `745ec01`
  follow-up fixed a bogus `var(--status-success-dark)` reference in
  `plan-monitoring-detail.tsx` to the real token `var(--success-700)`.
  `app/src/demo/planning-v2-module.tsx` needed no change — its
  postMessage bridge already speaks `uccp:pm-records`/`uccp:pm-ready`/
  `uccp:navigate` on both sides.
- **`4fe5c48`** — `app/src/demo/*` host-wiring/UX fixes (also previously
  "Deliberately NOT ported"): a runtime audit trail on composer
  updates/transitions (`composer-data.ts`), related-by-area incident pins
  fed into the Location map overlay (`boot.ts`/`profile-tabs.tsx`), and
  the FM-6273 inline field-editability matrix on
  `incidents-assignment.tsx` (intake enum/text fields, Assigned
  Inspector, and the Location group), composed entirely from existing
  `@fams/ui-kit`/`@fams/v5-templates` exports. Canonical-only work predating
  this source branch was kept as-is and NOT overwritten: the `inspector`
  role/landing-privilege gating fix in `model.ts`, all `frms`→`uccp`
  naming, `inspector-app` wiring, and the Operations Center Triage
  Console + `Wall*` composites. **This touches `app/src/demo/`, which is
  human-gated to `@fams/platform-team` per this repo's `CLAUDE.md` — it
  still needs that team's review before merge**, same as the Inspector
  App's `app/src/demo/inspector-app-module.tsx` wiring and
  `scripts/vercel-build.sh` change above.
- **`52f7349`** — incidents blueprint field refinements (places the two
  previously-inert `fld_inc_subtype`/`fld_inc_reported_photos`
  systemcolumns live, wizard creation sheet with new Source & Customer /
  Location steps, detail-page restructuring, kanban `Reopened` reordered
  next to `Assessed`) and the live-monitoring wording call: resolved to
  the MVP's "Last Discharged On" — but **only for the `uccp` tenant's**
  `live-monitoring` blueprint (`fld_lastcollection`). This is a
  flood-response-specific label; it was not applied to any other
  tenant's collection/discharge wording, and `fams` (Telematics) /
  `iwmp` (Tadweer waste, where "Last Collection On" is the correct
  waste-collection term) are untouched.

### Verified

- **Operations Center / Inspector Shifts** (`notes-demo-screens.md`
  investigation): every diff across both override screens between
  canonical and the MVP fork (20 files total) is a pure `uccp`→`frms` /
  `UCCP`→`FRMS` textual rename in comments, doc-strings,
  `package.json` metadata, and one `<title>` tag — confirmed
  rename-only, zero behavioral/data/KPI/chart/map/CSS difference. No
  code changes were made and nothing was ported; canonical's two chip/
  transporter-label data values (`'UCCP'`, `'UCCP Ops'`) were kept as-is
  per the "never rename back to frms" rule. Both screens' `pnpm build`
  gates green.
- **Inspector App source** (`fams-v5-demo-environment`'s new
  `inspector-app` override screen): beyond the deliberate hit-area
  rewrite (the MVP's bespoke `.ins-hit-44::after` CSS class replaced with
  the canonical Tailwind pseudo-element hit-area idiom already
  established in `DataTableColumnControls.tsx`, applied inline on the 6
  touched buttons), there are no residual diffs against the MVP source —
  everything else in the ported `src/inspector-v5`/vendored `@ds` tree is
  a straight, unmodified port.

### Open items

- `packages/v5-templates/src/views/section-editors.tsx`'s `PickerList`
  call site still has no `selected`-prop checkmark highlight — blocked
  on `@fams/ui-kit`'s `PickerList` gaining a `selected` prop. Still open
  as of `7d243d0`; no follow-up commit has landed it.
- `app/src/demo/*` changes from `4fe5c48` (composer-data audit trail,
  related-pin seeding, incidents-assignment field-editability matrix) are
  human-gated per this repo's `CLAUDE.md` and still need
  `@fams/platform-team` review before merge — same standing flag as the
  Inspector App's own `app/src/demo/` wiring and `scripts/vercel-build.sh`.
- Two `@fams/ui-kit` tests needed a hand-fix where the `52ead56`
  DataTable `<th>`/checkbox `aria-label` rework collided with the
  `7887906` MVP-refinements port in the shared working tree; both are
  green again, but any later branch that rebases past `52ead56` without
  also picking up `7887906`'s fix should re-check
  `DataTable.test.tsx`'s `Select row`/`Select all rows` assertions.
- `LocationMap`/`LocationPickerMap` camera-follow + opacity wiring (part
  of the original "Wider DS diff surface" deferral) was **not** in scope
  of this second pass and remains unported.
- The updated "Deliberately NOT ported — pending" list above now marks
  every item resolved in this pass with a strike-through and a pointer
  to the landing commit; `CreationSheet.tsx`'s wizard-branch close-button
  behavior and `ProfileStack.tsx` traffic-light-dot glyphs remain
  deliberate non-ports (live conflicts, not gaps).

### Second-pass follow-ups (2026-09-04, later)

- `fams-design-system`: `8ed4f32` (fix the two v5-templates tests broken by the
  DataTable `th` aria-label), `ea1a303` (Stepper tabs 44px hit-area), `ca3fc8d`
  (map toggle hit-area, corner-label contrast, `section-renderers` split under
  300 lines), `6ffceb1` (PickerList `selected`/`ariaLabel`).
- this repo: `c3d1450` (`incidents-assignment.tsx` adopts `PickerList.selected`,
  TODO closed), `572a4c6` (flood-planning a11y: keyboard-operable rows, 44px
  targets, focus rings, gray-400→500 text).
- Both trees clean. Still NOTHING pushed — awaiting the user's approval for
  branches + PRs; `app/src/demo/*` commits (`4fe5c48`, `c3d1450`) remain
  `@fams/platform-team`-gated.

## Dispatcher updates (2026-09-04) — operations-center override screen

The source `dispatcher` repo (`/Users/apple/Desktop/The Lab/dispatcher`) advanced
46 files past `56e26d8` — the commit the `operations-center` override screen
was originally ported from (`86d6b25`, then rebranded Tadweer→Qatar MME/FRMS
at `c0e4327`, then waste→flood at `384757b`). Brought `56e26d8..HEAD`
(`b220ef4`) into `tenants/uccp/overrides/screens/operations-center/` as a
3-way merge (`git merge-file` per touched file — dispatcher's base blob as the
ancestor, dispatcher's HEAD blob as theirs, the vendored file as ours),
resolving conflicts by keeping the Qatar MME/UCCP rebrand and taking
dispatcher's structural/UX changes. `app/src/demo/operations-center-module.tsx`
was **not** touched — the merge stayed entirely inside the override screen's
own lane.

**Two-state primary rail** (decisions #14–#17): `TadweerNavbar.tsx` dropped the
old three-mode hover-expand + edge-pill affordance entirely (the `#99CDF3`
pill, `sidebarMode`/`edgeButtonRef`/drag-to-resize code, all removed) for the
canonical **Collapsed (46px) / Expanded (276px)** two states. Collapsed, the
rail mark (`qatar-mme-rail-mark.svg`, substituted for dispatcher's new
`tadweer-group-logo-color.svg`/`tadweer-logo-mark.svg` — this screen has no
Qatar MME wordmark asset, only the rail mark, already used elsewhere in this
file) is the sole expand affordance and swaps for a `PanelLeftOpen` glyph on
hover; expanded, the mark + FAMS wordmark are inert branding (`onGoHome` no
longer wired to the logo) and `PanelLeftClose` is the sole collapse
affordance. `UserRow`'s "Tadweer Admin" naming comment was rebranded to this
screen's established "FAMS Admin" identity (kept from the earlier rebrand
pass) rather than reintroducing Tadweer.

**App-switcher preference + Launch Pad minimize** (decision #16–#17): new
`layout/appSwitcherPreference.ts` / `layout/activeAppPreference.ts` ported
in as-is except their `localStorage` keys, which follow this repo's
`tadweer.*`→`uccp.*` convention: `uccp.app-switcher-mode`, `uccp.active-app`,
`uccp.last-app-modules`. Same rename applied to a pre-existing, previously
unrebranded leftover — `HomeDashboard.tsx`'s pin-storage `PIN_KEY` was still
`tadweer.home.pinned`; now `uccp.home.pinned` (dispatcher's own key is
unrenamed by design — `DECISIONS.md`'s "the internal `pins`/`PIN_KEY`
identifiers are kept" note is about *dispatcher's* storage compat, not a
reason to leave this vendored copy mis-branded). `App.tsx`/`AppLayout.tsx`
gained `moduleId`/`autoOpenSwitcher`/`onSwitcherAutoOpened` threading
alongside this screen's existing `embed` prop (both conflicted on the same
prop lists; merged to carry both sets, not one replacing the other).

**"No module is a dead click"**: new `components/ComingSoonState.tsx` +
`features/module/ModuleComingSoonPage.tsx` ported verbatim (no domain
vocabulary in either). `homeData.ts`'s IIMS-PO suite and `moduleNavData.ts`'s
`FLAT_MODULES` had their remaining `page: null` entries flipped to
`'module'`; this screen's already-rebranded labels for those ids (Requests &
Complaints, Monitoring Stations Management, Deep Maintenance Sites
Management, Stations Management, Job Orders, Preventive Maintainance) were
kept, dispatcher's reordering/expansion of `FLAT_MODULES` to mirror
`MODULE_ENTRIES` was taken. One duplicate `incidents`/`inspections` pair
(created because dispatcher moved those two entries earlier in the list
while this screen's copy still carried its own rebranded copy at the old
position) was collapsed back to one entry, carrying the Qatar MME label
forward.

**Telematics Features Config** (`docs/DECISIONS.md`'s "Critical settings
saves" section): `features/settings/device-config/{DeviceConfigPage,
DeviceConfigTable,VerifyIdentityDialog,deviceConfigData}.{ts,tsx}` ported in.
Kept as designed — immobilizer/CAN Bus/iButton per-vehicle toggles are staged
(save bar with pending count) and step-up verified (6-digit emailed code,
prototype-only, any complete code passes) before commit, which is exactly
right for an FRMS tanker fleet where Immobilizer is a physically consequential
grant. `deviceConfigData.ts`'s seed data was rewritten off dispatcher's
waste vocabulary (`RCV`/`SWP`/`HKL`/`TNK`, `TWR-nnnn` plates) onto this
screen's flood vocabulary: `VehicleType` is now `TNK`/`PMP`/`RES`/`SUP`
(Water tanker / Pump truck / Rescue vehicle / Support vehicle, weighted
toward `TNK` since the fleet is tanker-led), plates follow live-monitoring's
`LMV-QA01`..`18` convention (the first 12 seed rows reuse those exact plate
numbers; the 90 generated rows continue the sequence from `19`). `SettingsPage.tsx`'s
vehicle-type filter select needed no changes — it derives its options from
`VEHICLE_TYPE_LABEL` rather than hardcoding the old waste types.

**New assets**: `fams-logo-white.svg`, `fams-wordmark-white.svg`,
`fams-logo-color.svg`, `home-wave-pattern.svg` copied in as-is (FAMS-brand,
tenant-neutral — used by the rail's "Powered By" strip, the mobile sheet
header's credit, and the Launch Pad's wave background mask).
`tadweer-group-logo-color.svg` was **not** copied in; every place dispatcher
introduced it (the mobile sheet header lockup) was substituted with
`qatar-mme-rail-mark.svg`, the only Qatar MME asset already present in this
screen.

**Deleted**: `src/hooks/useIsMobile 2.ts` (stray duplicate the dispatcher
patch removes; `AppSwitcherDropdown 2.tsx`/`MobileNavbar 2.tsx`/
`TadweerNavbar 2.tsx` were never present in this vendored copy, so there was
nothing to delete for those three).

**`MobileNavbar.tsx`** — the biggest structural conflict: dispatcher's
`b220ef4` replaced the old fixed 56px top app bar entirely with bottom-only
chrome (tab bar + a bottom sheet carrying an Account row group for Home /
Inbox / Help / user, per its "no top bar" redesign). This screen's copy still
had the old top-bar code (referencing `ArrowLeft`/`inboxHasIndicator`, neither
still imported after the merge took dispatcher's new import list), so it was
dropped in favor of the new bottom-sheet design outright — this is exactly
the "dispatcher's structural/UX change" the merge is supposed to take, not a
rebrand-vs-canonical tradeoff. The sheet's own "Tadweer Admin" text and its
"Tadweer group lockup" header image were rebranded the same way as the rail
(`qatar-mme-rail-mark.svg`, "FAMS Admin").

**Gates**: `npx tsc -b` and `npx vite build` (this screen) both green; root
`pnpm --filter app build` green; no `node_modules` changes, so no reinstall
was needed. Live smoke via `vite preview --port 6361`: HTTP 200, zero
`pageerror`s at 1440×900 and 390×844 (Playwright); the one `console.error` at
each size is `_vercel/insights/script.js` 404ing outside a real Vercel
deploy — pre-existing, unrelated to this merge. Screenshots:
`~/.claude/jobs/c46222d0/tmp/opscenter-{desktop,mobile}.png`.

**Not touched**: `app/src/demo/operations-center-module.tsx` — this pass
found no wiring reason to touch it (nothing in the dispatcher diff changes
the iframe contract), so it stays out of scope and out of the
`@fams/platform-team` gate for this change. Committed only this lane's files.

## Dispatcher updates (2026-09-04)

- workforce: added a "Tablet Activity" driver-profile tab, core-first
  (`core/modules/workforce/blueprint.json`, all tenants inherit via
  `pnpm demo resolve --all`), sourced from `dispatcher/designs/driver-tablet-activity/`.
  Composed from `@fams/v5-templates` `OverviewWidgets` widget types (three
  pre-existing, plus `dailyTimeline` added to the DS for it — see RESOLVED
  below): `filterBar` (decorative "Last 7
  Days" chip), `kpiTiles` (Total Active Time / Total Inactive Time / App
  Usage %), `eventList` with `layout: "columns"` (severity chip + Date/
  Start/End/Duration columns) standing in for the design's inactive-events
  table. **RESOLVED (2026-09-04, later the same day)**: the design's daily
  active-vs-inactive Gantt-style timeline — which had no equivalent in the
  `OverviewWidgets` union (`barChart`/`lineChart`/`levelSummary`/`eventList`
  all don't fit) — was built in the design system as a new `dailyTimeline`
  widget type (`fams-design-system` `feat(v5-templates): dailyTimeline
  profile widget`, per that repo's demo carve-out, root CLAUDE.md rule 11)
  and is now the middle widget of this tab, between the KPI tiles and the
  events list: `{type: "dailyTimeline", rowsField: "tabletDailyActivity",
  windowStart: "05:00", windowEnd: "19:00"}` (+ `title`/`subtitle`/`icon`).
  It renders one row per day over the fixed clock window with tick labels, a
  legend, per-block tooltips, and a muted "No planned shift" track for off
  days; every day's active/inactive/usage figures are also stated in words
  (it is a real `<table>`, never colour-only). The already-seeded per-day
  shape needs no change — the widget derives the two proportional
  active/inactive blocks and the `"13h 23m"` readings from the minute totals;
  an OPTIONAL `segments[]` (`{state, start, end}` clock times) per row is the
  preferred shape when a source system has the real intra-day pattern, and
  the seed may gain it later without a blueprint change.
  Seed data: `core/modules/workforce/seeds/workforce.seed.json` gained
  `tabletActiveTimeTotal`/`tabletInactiveTimeTotal`/`tabletAppUsagePct`/
  `tabletInactiveEvents`/`tabletDailyActivity` for 3 core drivers (WF-01,
  WF-07, WF-13) covering 2026-08-29→09-04 (Friday 09-04 = no shift),
  severity buckets Brief/Minor/Major. `tenants/iwmp/seeds/workforce.seed.json`
  fully overrides the core seed for iwmp (tenant seeds win over core), so
  iwmp drivers currently render the tab's empty state (verified: renders
  clean, zero page errors) — populating a few iwmp drivers is a follow-up
  seed-data task, out of this change's lane (`tenants/*/seeds/**` wasn't
  in scope, only `tenants/*/deltas/workforce*`).
- branding: copied 3 of the 4 new FAMS lockup assets from
  `dispatcher/app/public/assets/` into `app/public/branding/`:
  `fams-wordmark-white.svg`, `fams-logo-color.svg`, and
  `home-wave-pattern.svg` → renamed `fams-home-wave-pattern.svg` (tenant-
  prefixed, matching this dir's naming convention). Skipped
  `fams-logo-white.svg` — byte-identical (sha256
  `cb52ecd15828af752f1c8d9e24416c1e9d6758d90e26f34347d937192e61ad07`) to
  both already-present `fams-poweredby-wordmark.svg` and
  `fams-rail-wordmark.svg`; not duplicated.

## MME-FRMS-MVP main catch-up (2026-09-05)

Fourth pass. Fork `MME-FRMS-MVP` main moved from `7de4fa8` to `7be998c`
(30 files under `fams-v5-demo-environment/`). This pass audited **every**
differing or fork-only file across `tenants/frms` ↔ `tenants/uccp`, plus
`core/`, `app/src/`, `app/public/` and `tools/`, and ported everything
that carried real work forward. Method: normalise the fork side
(`frms`→`uccp`) and 3-way merge with `git merge-file`, using
fork@`7de4fa8` as the base and this repo's current file as *ours*, so
canonical's rebrand, gray-token pass and a11y fixes are the side that
survives a token/structure collision.

### The audit — how the divergence splits

Of the ~110 files that differ between the two trees, only the 30 in
`7de4fa8..7be998c` are new; everything else was adjudicated in the three
earlier passes above. Mechanically confirmed: for every file in the
increment, `fork@7de4fa8` normalised is byte-identical to this repo's
copy **except** the six planning components canonical had tokenised /
made keyboard-operable in the meantime, which is exactly the set that
needed a real merge.

| Area | Verdict |
| --- | --- |
| `tenants/*/modules/incidents/blueprint.json` | **PORT** (tenant-native, see below) |
| `tenants/*/overrides/screens/planning-v2/**` (28 files) | **PORT** (3-way merged, see below) |
| `tenants/*/overrides/screens/operations-center/src/features/live-monitoring/FleetTable.tsx` | **KEEP-CANONICAL** — the fork increment *reverts* the text-truncation guideline work: plates and IMEI go back to `truncate` from `whitespace-nowrap`. §1 fixed-length identifiers must never ellipsise. Almost certainly an automerge clobber (`ci: auto-merge new-frms-branch into main on push`) rather than a decision. |
| `…/operations-center/src/features/zones/ZoneTable.tsx` | **KEEP-CANONICAL** — same revert: `line-clamp-2` zone names and the hover/focus tooltips on Location and Description (§2/§3/§6, the one-gesture path to the full value) all removed. Not taken. |
| `…/operations-center/.npmrc` (deleted in fork) | **KEEP-CANONICAL** — `ignore-workspace-root-check=true` is what lets this screen install standalone; `planning-v2` and `inspector-shifts` both still carry it. A fork-local build workaround, not a change to port. |
| `…/screens/inspector-shifts/**` (7 files) | **NAMING-ONLY** — identical under `frms`→`uccp`. No increment. |
| `…/screens/operations-center/**` (rest, ~40 files) | **KEEP-CANONICAL** — canonical is *ahead* here (dispatcher two-state rail, app-switcher preference, telematics device-config, ComingSoonState, `features/module/`); see the two 2026-09-04 sections above. Untouched by the increment. |
| `tenants/*/modules/live-monitoring/blueprint.json`, `core/modules/**` (10 files), `tools/**`, `app/src/demo/**`, `app/public/branding/**`, `seeds/**` | **KEEP-CANONICAL** / pre-existing — none appear in the increment. Canonical-only features that must stay: the live-monitoring workforce feature, the inspector persona and its `applications[]` entry, iwmp tablet-activity + the `dailyTimeline` widget. `app/src/demo/profile-tabs.tsx` (the boot-seeded `related_pins`) is byte-identical in both trees, so the Linked Complaints toggle needed no wiring. |
| `tenants/uccp/overrides/screens/inspector-app/**`, `app/src/demo/inspector-app-module.tsx` | **KEEP-CANONICAL** — canonical-only, fork has no equivalent. |
| `MIGRATION-NOTES.md`, `.gitignore`, `README.md`, `docs/debt-dashboard.md`, `scripts/vercel-build.sh` | **OBSOLETE** for porting — fork-side drift from its own standalone-deploy setup (`.github/workflows/automerge.yml`, its own Vercel wiring). Not applicable here. |

No `app/src/demo/**` hunks in the increment, so nothing was flagged for
`@fams/platform-team` this pass.

### planning-v2 — what was merged

Six files needed a real 3-way merge; the other 22 were byte-clean
against the base and were taken as-is. Conflicts were resolved by taking
the fork's structure and re-applying canonical's conventions on top:

- **`plan-monitoring-detail.tsx`** — took the fork's Row-2 rework (four
  cards: Service Type / Distance / Water Extracted / Shift, with `title`
  tooltips and the one-line tabular shift reading), which drops the
  Fuel Cost and Idle/Waiting Time cards and sets Service Type to "Flood
  Water Extraction". Canonical's `--success-700` token was kept over the
  fork's `--status-success-dark`, and the `data.statsRow` escape hatch
  survives in the fork's version too.
- **`flood-planning-mode.tsx`** (9 conflicts) — took the fork's FM-6353
  redesign wholesale. This is a deliberate feature *replacement*: the
  rain auto-suggest (`Stars01`), circle/polygon/rectangle draw tools,
  existing-plans overlay, layers popover, forecast date strip and the
  inspector list panel are all gone, because they exist to select
  *many* zones and FM-6353's AC is one zone per plan. Rationale logged
  here rather than asked: the AC is explicit, and the removed
  affordances are demo-only surfaces with no seed or blueprint contract
  behind them. Route optimisation is depot→assembly **only** (driver
  navigation is Google Maps).
- **`flood-plan-detail-sheet.tsx`** (4 conflicts) — took the fork's
  rewritten `FloodRosterSheet` (880px sheet, floating close, Schedule ·
  Resources · Inspector tabs, recurrence rule + conflict preview
  `DataTable`) and the optimised depot→assembly route line in the map
  header. Conflict 2 was merged rather than chosen: canonical's
  keyboard-operable `<tr role="button">` roster row kept, with the
  fork's shift start/end time span added inside it.
- **`flood-plan-hybrid.tsx`** (1 conflict) — took the fork's
  roster-state zone tinting (no plan / rostered / not rostered);
  canonical's `--gray-400` line lived in the `layers.coverage` branch
  the fork deleted. Canonical's `EyeToggle` 44px `before:-inset-3` hit
  area and the keyboard-operable plan rows merged cleanly and are
  intact.
- **`flood-plan-wizard.tsx`**, **`components/planning/index.ts`** —
  merged clean.
- New files: `flood-plan-grid.tsx`, `flood-route.ts`,
  `map/live-map-tools.tsx`, `map/basemap-thumbnails.ts`,
  `map/weather-forecast-panel.tsx`, `map/poi-pins/vehicle.svg`,
  `icons/v5/zones.tsx`, `scripts/build-routes.mjs`,
  `src/data/{routes.json,stop-plan.ts}`.

**Token pass on ported markup.** Every hex the fork introduced was
mapped onto this copy's tokens using canonical's own substitutions
(`#101828`→`--gray-900`, `#344054`→`--gray-700`,
`#667085`/`text-[#98a2b3]`→`--gray-500`, `bg`/`border-[#98a2b3]`→
`--gray-400`, `#d0d5dd`→`--gray-300`, `#eaecf0`→`--gray-200`,
`#f2f4f7`→`--gray-100`, `#f9fafb`→`--gray-50`). Raw hex was left in
exactly two places, both correct: `flood-plan-hybrid`'s `countBadge`
fill and `zoneToneHex`, which feed generated SVG data-URI markers where
a CSS variable cannot resolve. The one sub-44px button the fork added
("Close zones") got canonical's `relative … before:absolute
before:-inset-2 before:content-['']` hit-area expander.

### incidents blueprint — one deferred DS export

Ported tenant-native into `tenants/uccp/modules/incidents/blueprint.json`
(ids immutable; three footer *placements* removed, no id reused):
kanban card footer = inspector avatar + Onwani (`IconTextView`,
`marker-pin-05`); related tab → "Linked Incidents"; related-pins toggle
→ "Linked Complaints".

**RESOLVED (2026-09-05) — `OnwaniLocationSection`.** `fams-design-system`
(dist rebuilt, commit `3b77961`) now exports `OnwaniLocationSection`
(registered by name; config type `OnwaniLocationSectionConfig` from
`@fams/v5-templates/map`) — the creation form's location picker mounted
in the detail side sheet: text location field with two-way marker sync,
draggable pin, on-map "Incident Location" card, `editableStages`.
`sec_inc_address` in `tenants/uccp/modules/incidents/blueprint.json` was
flipped from `FieldTilesMapSection` to `OnwaniLocationSection` with the
fork's props (`locationField: systemcol1`, `onwaniField: systemcol12`,
`municipalityField: municipality`, `areaField: addr_area`,
`locationCardLabel: "Incident Location"`, `editableStages: [intake,
triage, acknowledged]`), keeping canonical's `relatedPinsField:
related_pins` / `relatedPinsLabel: "Linked Complaints"`. Section id and
both field ids (`fld_inc_municipality`, `fld_inc_onwani`) are unchanged;
the section's `fields` placement array is now empty (`[]`) since the
component renders those columns internally, matching the fork.
`pnpm demo resolve --all` → `pnpm demo check` → `pnpm --filter app
build` all green; live-verified on a bounded `vite preview --port 6306`
(`?tenant=uccp`, incident detail): the Location section renders the
Onwani picker, the map, the "Incident Location" readout card ("Zone 90,
Street 200, Bldg 4"), and the "Linked Complaints" toggle, zero
pageerrors.

### Gates

- `pnpm demo resolve --all` → 48 files; `pnpm demo check` → OK, 48
  resolved files match, ops/manifests/JSON/seed refs all valid (4
  pre-existing INERT-entityType warnings, unrelated).
- `pnpm --filter app build` → green.
- planning-v2 (the only touched override screen): `npx tsc -b --force`
  clean, `npx vite build` green.
- Live smoke, Playwright 1.61.1 on a bounded `vite preview` at 6399
  (planning-v2 staged into `app/dist/screens/planning-v2/` with
  `--base=/screens/planning-v2/`, which is how `scripts/vercel-build.sh`
  serves it), `?tenant=uccp`, admin.uccp@fams.com, 1600×1000:
  **zero `pageerror`s and zero `console.error`s** across all three
  surfaces.
  - incidents kanban → card footer renders the inspector-initial avatar
    and the Onwani number behind a map pin, with no reporter avatar and
    no zone chip (`mvp-gap-incidents-kanban.png`).
  - plan-monitoring detail → opens from the list iframe; Service Type
    "Flood Water Extraction", Distance, Water Extracted, Total Pump
    Cycles present; Fuel Cost and Idle/Waiting Time absent; 8 route
    markers including the tanker pin at the route end
    (`mvp-gap-plan-monitoring-{list,detail}.png`).
  - live-monitoring vehicle popup → opens on marker click and its
    bottom tab bar renders Overview · Critical Events · Workforce, so
    canonical's workforce feature is not regressed
    (`mvp-gap-live-monitoring-{map,popup}.png`).
  - Screenshots in `~/.claude/jobs/c46222d0/tmp/mvp-gap-*.png`.

`tenants/uccp/tenant.json` gained `branding.poweredBy: true` — manifest
normalisation emitted by `pnpm demo resolve --all`, not a hand edit.
