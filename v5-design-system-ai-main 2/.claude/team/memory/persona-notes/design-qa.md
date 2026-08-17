# Design QA (Dana) persona notes — lessons learned

## 2026-07-15 — Trip Management Pass 1 review (T-107 spine)

- **Legitimate deferral vs undocumented gap — tell them apart.** The build deferred C1
  `ModuleToolbar` adoption in `live-monitoring-view.tsx` (narrow ≤420px list panel vs the
  toolbar's full-width `px-7`/`min-w-[200px] max-w-[367px]` search + `h-10` icon-button geometry)
  with an inline `// TODO(C1 adoption)` comment AND a spec.md note explaining why. That's the
  GOOD pattern: a real geometry constraint, cited, not silently skipped. Compare against the
  BAD pattern below (same build) — an undocumented gap in the reused `TrackingPopup`. Both are
  "didn't fully adopt X," but only one gets graded a pass: **cite the constraint or it's a miss**,
  even when the deferral itself is reasonable.
- **A shared floating/child component mounted unconditionally across list variants must be
  content-checked, not just reused-wholesale.** `LiveMonitoringView` reuses `TrackingPopup`
  (telemetry/events/shifts/trips/devices tabs) for ANY `selected` entity regardless of
  `data.listVariant`. Trip Management's config-gated `TripCard`/`listVariant:'trip'` entities
  never populate `telemetry`/`events`/`shifts`/`trips`/`devices` — so the "reuse wholesale, no
  fork" instinct (correct for the shell/map/routes) silently produced a near-empty floating
  popup ("No telemetry available.") on the ONE interaction every user will try first (click a
  trip row). Reuse-over-fork is right at the SURFACE level (`LiveMonitoringView`) but must be
  re-checked one level down at every sub-component the surface itself mounts unconditionally —
  "does this child render meaningfully for the NEW variant's data shape, or just quietly empty?"
  Fix pattern: gate the child on the variant (`listVariant === 'trip' ? null : <TrackingPopup/>`)
  until the real replacement (Pass 2's `TaskDetail`) lands, OR feed it variant-appropriate content
  — never leave a reachable, wired-but-empty popup as the shipped Pass-1 experience.
- **A `data.loading`/count-style affordance that exists for the base variant must carry over (or
  be deliberately replaced) for a new list variant, not just be turned off.** The fleet row's
  "Showing X of Y" counter (`data.listVariant === 'trip' ? null : …`) was suppressed for trip
  cards with nothing put in its place — a within-component half-done-adoption, the same shape as
  the cross-file version of the defect class but scoped to ONE file/ONE component's two branches.
  Check every `data.listVariant === X ? A : B` branch pair for a dropped affordance, not just a
  changed one.
- **Confirm a contract's canonical component actually exists before grading a deferral.** C1's
  `ModuleToolbar` was drafted as "to be extracted" in the contract doc, but `grep` showed it was
  ALREADY extracted + exported (`module-toolbar.tsx`, used in `AppShell.tsx`). Docs lag reality —
  always verify the canonical component's existence in the barrel before accepting "it doesn't
  exist yet" as a reason for a fork or a deferral; if it exists, the bar is "why doesn't it fit,"
  not "we haven't built it."

## 2026-07-15 — Trip Management Pass 2 review (T-107 detail)

- **A "generalize the shared component" fix must grep for a PRE-EXISTING generalization of the
  same shape before adding a second one.** `TaskDetail` already had a config-driven tabbed
  right-panel mechanism — `pipeline-right-panel.tsx`'s `RightPanelTabStrip` + `resolveRightPanelTab`,
  wired through `runtime-app.tsx`'s `PipelineDetailBody`, live today via `recipes/crm/deals.module.json`'s
  `profile.rightPanel.tabs` (Timeline/Activity/Linked/Attachments, config-driven, ships in the golden
  CRM template). Pass 2 added a SECOND, native `rightPanelTabs?: {id,label,render}[]` prop directly on
  `TaskDetail` (`task-detail.tsx:318-372`) to solve the exact same problem for the trip-management block
  — without checking whether the CRM/pipeline flow already solved it. Both are backward-compatible and
  neither broke anything (verified: no existing call-site regressed), so this isn't a "fork of a sibling
  component" in the classic sense — it's a **fork of the SOLUTION inside the one component**, which the
  reuse checklist doesn't catch if you only grep for "does a sibling component exist" and stop there. New
  checklist line: before adding a prop that generalizes a shared component's slot, also grep for any
  EXISTING caller that already achieves the same shape via a workaround (render-prop injection, header
  slot abuse, external state) — that caller is the thing that should adopt the new prop, or the new prop
  is redundant. Filed as a tracked (non-blocking) consolidation ticket rather than a blocker, since no
  visible product regression exists today — but flag it hard; a 2nd occurrence of "added capability,
  left the old workaround live" promotes this to a gate candidate per the defect-log convention.
- **A deliberate `--chart-*` token used for STATUS semantics needs an explicit rationale note, not
  silence.** Trip's "Upcoming" status draws `var(--chart-3)` (purple) instead of a `--status-*` token
  (`trip-management.block.tsx:56`) — defensible (the one alternative, `--status-info`, is IDENTICAL to
  `--primary`/link-blue, which would read as "clickable" inside the same status pill), but the C3 draft
  rule says `--status-*` only and the build doesn't say why it deviated. Same root cause family as
  `status-color-collision` (defect-log) even though no literal collision occurred this time — always
  make an intentional token exception SAY so in a comment, the same way the `--chart-3` choice implicitly
  avoided a collision but left no trace of the reasoning for the next reviewer.

## 2026-07-22 — Nav + NotificationCard backport review (independent verification)

- **"Enhanced the wrong copy" — the most expensive form of half-done adoption.** Backport 4 added
  `icon`→IconBadge, `chips`→Badge, `revealActionsOnHover`, `accentBorder` to the CANONICAL
  `widgets/notification-card.tsx` — precisely the feature set the real production consumer needs.
  But the real consumer (`app-shell/view-renderers.tsx`'s `InboxRow`, the actual cross-app Inbox
  surface) doesn't render `NotificationCard` at all — it imports it (dead import,
  `view-renderers.tsx:11`) then hand-rolls its own icon well (raw `<span>`, not `IconBadge`), its
  own chip (`InboxChip`, a hand-rolled span, not `Badge` — even drifting on tint opacity, 10% vs
  Badge's canonical 15%), its own hover-reveal Clear button (not `revealActionsOnHover`), and its
  own priority/due pills (not `accentBorder`). `app-shell.spec.md:28` already (incorrectly) claims
  "NotificationCard list" for the inbox view — docs claimed an adoption that never happened. A
  SECOND sibling fork also exists (`widgets-v2/figma-widgets.tsx`'s own `NotificationCard`, live in
  `showcase/pages/Widgets.tsx`, divergent prop names — `time`/`onClear` vs `timestamp`/`actions`).
  Net effect: the just-enhanced canonical component has ZERO showcase demo and ZERO live renderer
  anywhere in the DS. **New checklist line: when a backport enriches a shared component with props
  that map suspiciously well onto an existing hand-rolled surface's fields (compare the enriched
  props 1:1 against any sibling "Xxx extends ThatComponentProps" wrapper type + its renderer), grep
  that renderer's actual JSX for the component name — an unused import is the tell.**
- **Backward-compat claims need a diff, not a read.** The implementer's compat claim ("omit new
  props, renders exactly as before") was FALSE for `NotificationCard`'s default (read) row: title
  color silently changed `text-foreground`→`text-muted-foreground` and background `bg-card`→
  `bg-surface-minimal`, with no prop gating either change — a default-render regression hiding
  inside a "just adding optional props" commit. Reading the new file in isolation looks 100% fine
  (both are valid DS tokens, not hex/rgba); only a `git diff` against the pre-backport version
  surfaces that EXISTING behavior moved. **Always diff, never just read, when verifying a
  backward-compat claim** — a token-only, well-formed change can still be a regression.
- **Gate PASS ≠ clean.** `coherence.mjs` only regexes for raw HEX; it does not catch raw `rgba()`
  literals. `side-nav.tsx` carries two (`borderLeftColor: rgba(0,114,214,0.6/0.4)` at AppRailButton,
  `color: rgba(255,255,255,0.95)` at FooterRailButton's icon) that predate this backport but sit a
  few lines from a THIRD rgba the same backport correctly replaced with `color-mix(...)` (the
  InboxBracket divider) — the fix pattern was known and applied inconsistently within one file.
  Don't trust "gate PASS" for token-only claims without grepping for `rgba(` yourself.
- **Net-new sibling components can still legitimately avoid reuse** — `ModuleRailGrouped` declining
  to share `ModuleRail`'s `ModuleRailItemBtn` is DEFENSIBLE (documented reason: a fixed 32×32 icon
  box so nothing shifts horizontally between compact/expand, which the flat rail's structurally
  different compact/expanded layouts never needed) — don't blocker a new component for not sharing
  code with an existing one when the shape's own constraints differ; do note it as a maintainability
  nit, not a fork.
- **A net-new prop/component with no wiring into the ONE real integration point is inert, not
  shipped.** `pinnedItems`, `moduleRailExpandOnHover`, and `ModuleRailGrouped` are exported and
  type-correct, but `AppShell.tsx` — the one shell every product mounts — never passes the first
  two and never renders the third (no "grouped modules" config concept exists yet to drive it
  either). Zero showcase page exercises any of the three. A backport that only touches the
  component file and the barrel, never the integration point, is a half-done adoption by
  construction — check the REAL call site (`AppShell.tsx` for nav, not just the component + index.ts)
  before passing a nav/shell backport.
