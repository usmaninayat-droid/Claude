# QA persona notes — lessons learned

- When a UI wires a "select colour / select entities" control into a right-side
  Create/Edit sheet, don't just check that the sheet's own local state updates —
  trace the FULL round trip: sheet `onSubmit(draft)` → the consumer's save handler →
  the parent's persisted state shape. A field can be captured perfectly in the
  sheet (typed, shown in its own preview) and still be silently dropped by the
  save handler if the target data type has no field for it, or the handler
  destructures/ignores it. Found exactly this in FAMS Settings ▸ Tags & Categories
  (2026-07-09): CategorySheet's `color` and `entityIds` are both sent via
  `onSubmit`, but `TagCategory` has no `color`/`entityIds` field and
  `settings.block.tsx`'s `submitCategory` never reads `d.color`/`d.entityIds` —
  so the colour picker and the entity checkboxes are functionally decorative.
- A `x.length ? x : fallback` guard on an array field inside a save/merge handler
  is a common silent-revert bug: it looks like "keep old value if nothing new
  was provided," but it also fires when the user's genuine intent was to clear
  the field to empty (e.g. remove all tags from a category, then Save). Always
  test the "delete everything then submit" edge case for any list-type field
  behind this pattern.
- Two settings items that both render the "same" stateful page component (e.g.
  a normal view + a read-only/inherited view) but as separate `render()` closures
  each get their OWN `useState` — even if seeded from the same constant. If the
  read-only view is supposed to mirror live data (not just visual parity), verify
  there's a single shared source of truth; otherwise edits on one side silently
  never appear on the other. This is a step beyond the "same component TYPE bleeds
  state" bug already in learnings.md #19 — here two states DON'T share when the
  feature implies they should.
- Coherence's raw-hex gate (`coherence.mjs`) only scans `src/components` per its
  own header comment — a raw hex literal duplicated in `blocks/**.block.tsx`
  (block-composition layer) will NOT be caught even though the token-only law
  applies workspace-wide. Flag such hex to tech-lead explicitly; don't assume the
  gate has your back outside `src/components`.
- Entity Configuration QA (2026-07-10): a NEW flavor of the recurring drop-on-save
  class — not a sheet forgetting to read a draft field, but the CONSUMER never
  seeding an `EntityDraft` for pre-existing (seed/demo) rows in the first place.
  `EntityConfigPage`'s `initial` falls back to `{ title: editingNode?.name }` when
  no draft exists yet, so editing any out-of-the-box entity opens the wizard with
  Entity Fields/Features/Preview reset to blank — and Save recomputes `fieldCount`
  from that near-empty draft, silently overwriting the row's real count. Lesson:
  when auditing "edit → fields persist" round trips, don't just trace sheet→save
  handler (the G-ROUNDTRIP class) — also check whether the EDIT ENTRY POINT has
  real data to hydrate from at all. A container can pass every field through a
  save handler correctly and still destroy data if the initial hydrate is a stub.
- Tree/list components with per-row local `expanded` state (`useState(depth===0)`
  seeded once) do NOT react to an active search filter — a query that only matches
  a grandchild surfaces the ancestor chain (correct filterTree logic) but leaves
  intermediate depth>0 rows collapsed, hiding the actual match. Always test "search
  for a deeply-nested-only term" as its own case, distinct from "search matches a
  top-level row" — recursive filter correctness and auto-expand-on-match are two
  separate behaviours and the first can pass while the second silently fails.
- Figma exports can be internally inconsistent (same screen captured at different
  design passes with different column semantics — e.g. Entity Configuration list
  frames 01/15/16/17 show a "Tag" column while 11/12/13 show "Config Type"
  SYSTEM/CUSTOM for the identical screen). When frames disagree with each other,
  treat the more complete/purposeful one (here: SYSTEM/CUSTOM, matching the
  module's actual domain) as authoritative rather than filing a parity defect
  against the build — but say so explicitly rather than silently picking one.
- T-094 RE-AUDIT (iteration 2, ifm-workforce capstone fix waves A+B): all 9
  scoped findings + 2 regression spots verified PASS on live pixels
  (screenshots in scratchpad t065/REAUDIT). Reusable technique notes: (1)
  Radix popover open/close is provably testable headlessly by counting
  `[data-radix-popper-content-wrapper]` elements before/after an option
  click — 0 after = single-select closed, >=1 after = multi-select facet
  stayed open; no visual diffing needed for this class of defect. (2) A
  DS-level fix applied ONCE at the shared renderer (AppShell's
  `pipelineGroupColumns` — any `type:'pipeline'` module with a `kind:'list'`
  tab gets the Group-by facet pill for free) is provably more durable than
  N per-module toolbarSlot patches — verified across 3 previously-unshot
  modules (Transfers, Exits, Payroll) with zero extra code, because the
  fix lives in the renderer, not the consumer. (3) A wizard step's OWN
  `canProceed` gate can silently block a scripted flow — the Documents step
  requires EVERY doc row with a picked type to also carry an expiry; the
  pre-seeded Emirates ID row (type set, expiry blank) blocked Proceed even
  though the finding under test only cared about the Visa row. Always fill
  every gated field a step's canProceed checks, not just the field under
  test, or a script's "Proceed click did nothing" reads as a false failure.
  (4) A picker's "Assign to" field renders as a closed trigger button
  (placeholder text "Search employees…") that must be CLICKED OPEN before
  its own internal "Search…" input exists in the DOM — querying by
  placeholder substring against the WHOLE document before opening it
  silently matches the wrong search box (e.g. the page's global toolbar
  search) and produces a misleading full-unfiltered-list result instead of
  a true not-found. (5) Two independent KPI-reconciliation pairs (Pulse
  Renewals-due-60d = 1,547 vs Doc Renewals Upcoming+In Progress+Submitted =
  1213+262+72 = 1547; Pulse Critical Incidents = 26 vs Incidents
  Reported+Under Review = 9+17 = 26) both landed exact-match — confirms the
  T-038 "one derivation, many readers" pattern holds under a real re-audit,
  not just at fix-time.
- Trip Management Pass 1 QA (2026-07-15): a shared component reused wholesale by a new
  config-driven list variant can silently carry the OLD domain's assumptions past the new
  variant's own config. `live-monitoring-view.tsx`'s `TrackingPopup` (the on-map
  marker-click/selection card) derives its status dot color from `STATUS_HEX[entity.status]`
  (the coarse fleet-fallback `'default'/'reporting'` field) instead of `entity.statusTone`
  (the field `TripCard` itself correctly reads) — so Trip Management's Completed AND Upcoming
  trips both render a fleet-blue dot in the map popup while their list-card pills are
  correctly green/purple (screenshotted, reproducible). The SAME popup's Overview tab
  unconditionally shows "No telemetry available." for any entity with no `telemetry[]`,
  regardless of whether the domain has a telemetry concept at all — a fleet-vocab leak
  G-VOCAB's word list doesn't catch ("telemetry" isn't in [Vehicle/Speed/Driver/Fleet/
  Truck/Depot/Plate]). LESSON: when a shared surface (marker popup, tooltip, banner) is
  reused unmodified by a new `listVariant`, explicitly re-check EVERY piece of copy/color
  logic in that shared surface for domain-specific vocabulary or a status-color derivation
  that doesn't consult the SAME per-entity tone field the new card variant uses — don't just
  verify the new card component in isolation.
- Same QA pass: adding new prominent per-item fields to a list-item variant (TripCard's
  `driver.name`/`plate`) without extending the list's search predicate is a real, easily
  missed functional gap — `live-monitoring-view.tsx`'s search only matches `title`+
  `subtitle`; typing a driver's name shown verbatim on-card ("Ben") returned "No matches."
  Test rule: whenever a card gains new visible identifying fields, retest search against
  EACH of them, not just the field the card variant reuses from the old shape (title).
- Also caught: reusing a shared `avatarFallback: ReactNode` slot with a raw emoji ('🚗')
  instead of a DS icon/asset breaks the field's own established convention elsewhere in the
  same file (FleetRow uses it strictly for text initials) and is a cross-platform rendering
  risk (emoji glyphs vary by OS/browser font) — check for an existing DS icon/asset library
  (here: `src/icons/asset-vectors.tsx`'s vehicle `AssetKind`) before defaulting to emoji.
