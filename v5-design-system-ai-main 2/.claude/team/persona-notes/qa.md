# QA persona notes (Maya)

## Lessons from User Accounts QA (2026-07-10)
- **New defect subclass found: "corrupt-on-save" (worse than drop-on-save).** T-007's
  round-trip gate (G-ROUNDTRIP) only proves every Draft field is *read* somewhere in the save
  handler — it does not prove the value read is *correct*. `UserAccountSheet`'s phone field is
  split (`countryCode` + `phone`) but `UserAccountSheet`'s seed reverse-mapper
  (`userToDraftSeed` in `blocks/settings/settings.block.tsx`) stuffed the **whole** stored phone
  string into the `phone` sub-field without stripping the code, while `countryCode` silently
  defaulted. Save then does `${countryCode} ${phone}` and **prepends a duplicate country code**
  onto every seeded row the first time it's edited-and-saved untouched. G-ROUNDTRIP is green on
  this file (both sub-fields ARE read) yet the bug is real — the gate cannot catch a
  reconstruction/parse bug, only a dropped field. When a Draft field is a *composite* that a row
  stores as a single flattened string (phone, address, name-parts…), manually re-derive/parse it
  in the `*ToDraftSeed` and treat that as a distinct review-checklist item, same class as
  drop-on-load-hydration (defect-log.md) — candidate to add to that entry's prevention rule
  rather than open a brand new row, since the root cause (seed-mapper doesn't reconstruct a
  composite field faithfully) is the same shape as the existing "drop-on-load" class, just
  producing corruption instead of blanking.
- **Figma frames can be internally inconsistent (placeholder data) — don't over-trust literal
  numbers/strings that clearly are dummy content.** All 5 stat cards showed "113" in one frame,
  and a password-rule checklist showed states that didn't match the literal password text drawn
  next to it (both in the frame itself). Treated as Figma-authoring artifacts, not testable
  requirements — verify logic against the *component's own rules*, not one static frame number.
  But real STYLE differences (icon color treatment, uppercase transform, badge fill vs tint,
  chip outline vs fill, layout row-grouping, sortable-column set) are NOT artifacts — those
  repeat identically across every row/card in a frame and are real parity signal.
- **Sortable-column *set* is real parity surface, not just sort mechanics.** The frame marked
  Status/Last Login/Last Activity as sortable (chevron affordance) and left User/Roles alone;
  the build sorted User/Last Login/Last Activity and left Status alone. Both "sorting works" but
  the wrong columns advertise sortability — a silent parity miss that functional testing alone
  (does sort work?) won't catch; you have to diff *which* header shows the chevron.
- **Badge `color` prop only ever renders a 15%-tint chip** (`src/components/primitives/badge.tsx`)
  — there is no solid-fill variant reachable via the `color` override. Any frame that shows a
  solid/filled status pill (common for "Active"-style badges) cannot be matched by passing
  `color` alone; flag it as a primitive gap, not just a call-site style bug, if it recurs on a
  3rd module.

## Lessons from Pipeline Configuration QA (2026-07-10)
- **The mandatory `upsert(d, closeOnDone)` pattern (learnings.md #37) got skipped, and the
  regression it prevents came straight back.** `PipelineConfigPage.submitPipeline` is wired to
  BOTH `onSubmit` and `onSaveDraft`, and unconditionally does `setEditingId(null)` — unlike
  `EventConfigPage`'s `upsertEvent(d, closeOnDone)`, which captures the new row's id into
  `editingId` when the sheet stays open (`closeOnDone=false`). Net effect: click "Save as draft"
  while CREATING a new pipeline → a real card is added but `editingId` stays `null` → the sheet
  is still open in "create" mode → the next Save/"Save as draft" click creates ANOTHER new card
  instead of updating the first. This is the exact duplicate-row class already fixed once in
  EventConfig ("Save-as-draft dup-row fix") — proof that a fix for one wizard-backed module does
  not automatically propagate to the next; the checklist item needs to be verified per-module,
  not assumed inherited.
- **Step-gating can turn "drop-on-load" into a hard save-blocking dead end, which is worse than
  silent data loss.** `pipelineToDraftSeed` (settings.block.tsx) never seeds `stages` for seeded
  pipelines (matches the known ACTIVE `drop-on-load-hydration` class in defect-log.md), but here
  the Stages step also has `canProceed: d.stages.some(s => s.name.trim())` — so editing ANY
  out-of-the-box pipeline for the first time makes the Stages tab open empty AND makes the
  submit button permanently disabled until the user invents brand-new stage data, even for a
  trivial name/description-only edit. Lesson: when a wizard step is both (a) fed by a possibly-
  empty seed hydration and (b) gates the submit button on that same step's data being non-empty,
  test "open a seeded row and try to save without touching the gated step" as its own case —
  it's a distinct failure mode from silent overwrite and deserves its own severity read (BLOCKER,
  not just "review checklist").
- **A bare `d.field || x.field` fallback is only safe if a step-gate makes `d.field` always
  truthy on submit — audit EVERY field the pattern is applied to, not just the obviously-required
  ones.** `submitPipeline` uses this guard for `name` (safe: Basic Info gates on it) and
  `taskTypes` (safe: Task Types step gates on `taskTypeIds.length > 0`) but ALSO for
  `description` (settings.block.tsx:547) — and description has NO step gate. Clearing the
  Description textarea to empty and saving silently reverts to the old description instead of
  clearing it, reproducing the exact anti-pattern already logged above (2026-07-09 note). Also
  confirms the G-ROUNDTRIP blind spot again in a NEW shape: the gate sees `d.description` being
  *read* and passes green, but the value it computes is wrong — same family as the User Accounts
  "corrupt-on-save" phone bug, just via a fallback operator instead of a composite-field parse.
- **G-ROUNDTRIP can be satisfied by an ephemeral `drafts` map even when the actual read-model
  type never gets a field.** `PipelineCard` has no `stages` field at all — `stages` only exists
  inside the `drafts[id]` side-channel, which the gate accepts because `[editingId]: d` is a
  wholesale-forward. That's structurally fine for THIS build (stages survive across re-edits as
  long as `editingId` stays stable), but it means the gate proves "nothing was read-and-dropped
  from the save handler," not "the product's actual data model can represent everything the
  wizard collects." Worth remembering when a future module's wizard captures more than its
  summary card type has fields for.

## Lessons from Preferences & Subscriptions QA (2026-07-10)
- **A Figma frame labeled "variant" can secretly be the spec for a required cross-module
  feature, not an optional alternate.** `pref-3062` (per-module notifications) looked like a
  stylistic variant of the authoritative `pref-1586` admin form, and `preferences.spec.md` even
  calls it "per-module notification variant" — but its companion dev-note frames (pref-3207/
  3210/3213/3218) spell out real, unimplemented behaviour: a SECOND "Preference" tab shown only
  to non-Admin users, notifications grouped by module, an indeterminate/dash master-toggle when
  a module's notifications are mixed on/off, and rows the admin marked "Mandatory" (in
  Subscriptions › Organization Subscriptions) must render checked-but-DISABLED here. Zero of this
  is built; Preferences and Subscriptions hold fully independent state with no data contract
  between them. Lesson: when a frame set includes small pink/red "Dev Note" cards, ALWAYS read
  every one before triaging a companion frame as "just a variant" — they often carry the actual
  acceptance criteria the visual frame alone doesn't show, and can reveal a cross-module
  integration requirement invisible from either module's screenshot in isolation.
- **A filter control's *interaction pattern* (single-select vs multi-select) is real parity
  surface, same class as the "sortable-column set" lesson from User Accounts QA — diff the
  control TYPE, not just whether "filtering works."** The Severity filter functionally filters
  correctly (single value, exact match), so a behavior-only check would pass it — but the Figma
  frame (org-3560) shows Severity as the SAME multi-select checkbox popover as the adjacent Role
  filter (org-3532), not a single-select dropdown. The build's `LabeledSelect`-based single-select
  is a materially different, more limited interaction the frame doesn't show. Always open the
  filter's OWN dropdown-state frame, not just the closed control, to catch this class.
- **When two sibling modules in the same Settings surface solve the same UI problem
  differently, that's a signal, not a coincidence — check for DS-primitive non-reuse.**
  Event Configuration's list already renders its criticality/config-type chips via the shared
  `<Badge color={...}>` (tinted pill, token-only). Subscriptions' Organization tab needed the
  identical shape (colored severity chip) but was hand-rolled as a bare `<span>` with icon+text
  and no background at all — diverging from BOTH the Figma frame (which shows a tinted pill in
  every row of both reference frames) and the sibling module's own already-correct pattern.
  Cross-reference a new module's visual primitives against modules built earlier in the SAME
  package before accepting "it's technically token-only" as sufficient — token-only doesn't mean
  parity-correct if the component shape itself (pill vs bare text) is wrong.
- **A native `title=` attribute is an easy, easy-to-miss regression when the DS already ships a
  purpose-built Tooltip matching the exact frame.** `tooltip.tsx`'s own doc-comment says it
  matches Figma "Tooltips" (dark surface + arrow) — yet `LevelToggle`'s Mandatory button used
  bare `title="Mandatory means users cannot opt-out"` instead of `<Tooltip>`/`<TooltipContent>`.
  Grep for `title=` in new Settings components as a quick smell-test whenever a frame shows a
  custom-styled tooltip bubble — native title is functionally present (won't fail a "does hover
  help exist" check) but fails both parity (unstyled) and a11y (WCAG 1.4.13: not dismissible/
  hoverable/persistent) simultaneously.

## Lessons from ifm-workforce T-065 full-platform regression sweep (2026-07-13)
- **A "zero-value segment" fix can introduce a "≥1000-value segment" bug if it reuses a
  display-formatted string as numeric input.** `operations-center.tsx`'s `cum()` helper
  (added for T-058) does `Number(p.value)` where `p.value` was `nf(count)` — a thousand-separator
  STRING like `"4,539"`. `Number("4,539")` is `NaN`, and the helper's own zero-guard
  (`parts.filter(p => p.v > 0)`) silently DROPS it (`NaN > 0` is `false`). Net effect: the
  Presence/Check-in-Channels stacked bars on the Pulse dashboard omit every category ≥1,000 —
  at 8k-worker scale that's the majority of the real total, producing a wildly misleading bar
  (two small categories filling 100% of the visual). Lesson: any helper that does `Number(x)`
  on a value that ALSO gets displayed via a formatter (`nf`/`aedCompact`) must consume the RAW
  number, never the formatted string — grep every `cum(...map(p => ({ v: Number(p.value) `
  pattern site-wide once one instance is found, since the same array literal is usually reused
  across sibling panels (this one hit 2 of 4 panels; only the two whose max category happened to
  be <1000 stayed invisemlessly correct).
- **Same-hue Badge variants are a real "status-color-collision" recurrence even when the variant
  NAMES differ.** Workforce's Employment column used `variant="info"` (Contract) vs
  `variant="secondary"` (Permanent) expecting two distinct colors — but `--status-info` (`info`'s
  fg/tint source) and `--secondary-foreground` are BOTH the primary blue `#0072D6` in
  `fams-v5.theme.css`, so the two badges render literally the same text color, differing only in
  a barely-perceptible background tint. Lesson: never trust that two different Badge `variant`
  NAMEs are visually distinct — resolve the actual token chain (or screenshot + zoom) before
  signing off a "make these pairwise distinct" ticket as fixed.
- **Client-side pagination + DataTable `groupBy` is a silent scale trap.** Workforce's list
  paginates in the PRODUCT module (`workforce.tsx`: `pageRows = rows.slice(page*100, ...)`) and
  passes only `pageRows` into `<DataTable data={pageRows} groupBy={...}>` — the DS DataTable
  computes its groups from whatever `data` it's given (`data-table.tsx` line ~150), with no
  awareness of the true filtered total. Result: "Group by: Site" on an 8,041-row dataset shows a
  group like "Burj Khalifa (49)" when the real Site-wide total (verified via the Site FACET
  filter) is 560 — the group only reflects whatever fraction of that site landed on page 1, with
  zero indication to the user that grouping is page-scoped. RULE: before approving any
  "Group by" control on a paginated list, verify the group counts against an equivalent facet
  filter's true total — a group-by that quietly operates on `pageRows` instead of `rows` will
  pass every "does clicking the dropdown do something" check while being factually wrong.
- **A notification whose COPY names a specific record must deep-link to that record's own
  detail, not its parent pool/kind.** ifm-workforce's "Lost card blacklisted" (names AC-3303
  explicitly) and "Temporary card expiring" (names TMP-119) both used
  `target: { kind: 'inventory-stock', recordId: 'Access Card' }` — a KIND-level target that lands
  on the generic 32-row stock list, not the specific card's own detail sheet (which exists,
  `cardDetail(id)`, and is rich — assignment history included). The sibling Devices notifications
  in the SAME file correctly use `kind: 'inventory-item', recordId: 'DV-206'` and land precisely.
  Lesson: when auditing notification deep-links, read the notification's own COPY first — if it
  names an ID, the target must resolve to THAT id's own detail, not a same-shaped but coarser
  target that happens to share a `kind` union member.
- **`truncate` classes don't guarantee no overflow — screenshot the actual pixels, don't just
  grep for the class (T-062's lesson, confirmed again in a new shape).** The DS `TaskDetail`
  two-column `InfoRow` grid (`task-detail.tsx` ~L340-354) DOES apply `truncate` to values, yet a
  long concatenated string (Leave's `project.name + ' — ' + stageLabel`, e.g. "DXB T3 Landside
  Support — Active") visibly overlapped into the ADJACENT column's label ("Balance") in a real
  screenshot, in BOTH the Manager-Review and Approved states of the same record — a DOM/class
  check would have passed. Root-cause hypothesis logged for the tech lead (flex-basis/min-width
  interaction under `flex-wrap`), but the finding stands on the pixel evidence regardless of the
  eventual CSS explanation.
- **An error boundary catching a crash is still a bug, and it can be genuinely intermittent.**
  Hit `ReferenceError: STREAM is not defined` from `<WorkforcePulse>` exactly once in ~10 fresh
  full-page-navigation attempts (login → wait → navigate to Live Monitoring) — never on initial
  Pulse load alone, and unreproducible on 6 further identical retries. Grepped the entire `src/`
  tree for a bare `STREAM` identifier and found none (only a comment referencing the OLD,
  already-removed `const STREAM = buildStream()` pattern) — the live file is textually clean, so
  this reads as a genuine RACE (interval tick vs. unmount, or a stale closure from the T-066
  live-refactor-in-progress) rather than a simple typo a static grep would catch. Lesson: when a
  pageerror fires once and a source grep finds nothing, don't dismiss it as a fluke — log it with
  full repro conditions + stack trace and flag the exact in-flight ticket most likely to have
  introduced the race (T-066 here), so the tech lead reproduces with DevTools open instead of
  re-running a static scan that will stay green.

## 2026-07-14 — typography-weight consistency (client escalation, T-086)
Add to every visual pass: zoom the status-chip+action pair and any feed/timeline with mixed row kinds;
uneven weight/case between adjacent same-rank elements is a defect (class typography-weight-anomaly in
the defect log). The client catches these instantly — "some font sizes are more bolder which looks weird."

## 2026-07-14 — T-094 platform capstone (number-reconciliation + interaction + dynamism audit, ifm-workforce)
- **Test-methodology gotcha (own mistake, corrected mid-audit): a puppeteer `newSession()` with no
  `userDataDir` spins up a BRAND NEW ephemeral Chrome profile every launch — localStorage/sessionStorage
  are wiped between script runs even though the PRODUCT correctly persists via a `localStorage` delta-log
  overlay.** My first "does the created worker survive reload?" check used two different anonymous
  sessions and produced a false "worker vanished" result — the product was never at fault, my harness
  cleared its own browser storage. Fix: pass a FIXED `userDataDir` (persistent Chrome profile dir) across
  every script in a mutation chain, and use `page.reload()` WITHIN one script/session for the real
  same-tab persistence proof; only use a fresh `userDataDir` reopen to prove genuine cross-session (closed
  tab, reopened) durability. Same lesson applies to any live-mutation QA pass with scripted puppeteer:
  one browser context per test *chain*, not per test *step*.
- **A live create→search round-trip is the fastest way to catch a frozen-import-snapshot class.** Creating
  a real worker via the Add Employee wizard and then searching for that EXACT name in a sibling module's
  picker (Inventory "Assign to") is more convincing than any source read — "No matches" on the new hire
  vs normal results for a seeded name in the identical field proves the picker's candidate list is a
  stale, import-time-frozen array, not the reactive store — even before grepping for `ACTIVE_WORKERS`.
  Always sanity-check the negative result on the SAME browser profile where the record was created (see
  gotcha above) before filing it as a defect — a picker returning "no matches" for a record that was
  itself never created in that profile is not a bug, it's a test-setup error.
- **A same-card, same-tab-switch number mismatch is the cheapest, highest-confidence reconciliation
  defect to prove.** The new worker's profile "Visa Expiry" (Overview/Details left rail: 10 Jul 2027)
  vs its own Documents tab's Visa record (20 Jul 2026) for the SAME worker in the SAME session needed
  zero cross-module navigation to catch — just switching tabs on one detail sheet. Prioritize this class
  of check (does a record's own summary panel agree with its own detail tabs?) before chasing cross-module
  KPI-to-raw-sheet traces; it's cheaper to prove and just as damning against the "numbers must reflect"
  mandate.
- **A dashboard card that visually caps its breakdown rows (Projects' `topTrades.slice(0,4)`) can make an
  adjacent computed callout (the "Gap N: Trade M" chip) reference a trade that's invisible anywhere else
  on the same card.** Traced via source (`projects.tsx` `toCardData`) after noticing the gap chip named
  "Landscapers"/"Supervisors" on cards whose visible 4-trade meter list didn't include those trades at
  all — confirmed the site's real trade plan (`sites.ts`) DOES include them, they're just sorted out of
  the top-4-by-`needed` cut. Same root shape as "the number is real but the user can't verify it on-card."
- **KPI tiles that don't sum to the record's own "Total" are a real defect even when each individual
  tile's own math is internally correct.** Inventory's Total(55) ≠ Assigned(40)+Available(5); the missing
  10 are items in `'In Service'/'Faulty'/'Lost'/'Expired'` status — real statuses in the data model with
  NO corresponding KPI tile, so ~18% of inventory has no visible home in the summary strip even though
  the per-row Status column shows it correctly. Always sum the visible breakdown tiles against the
  record's own headline Total before accepting a KPI row as complete.
- **Before flagging a number mismatch, verify it isn't actually a documented, deliberate design choice.**
  Two near-misses this session: (1) the Incidents "3 Critical Incidents" KPI turned out to literally
  count ALL non-resolved incidents regardless of severity (`i.stage !== 'resolved'`), which only reads as
  "critical" because every seeded incident happens to be Critical/Emergency severity — a LATENT fragility
  worth a code-quality note, not a live mismatch (3 open incidents in the data == 3 shown). (2) Workforce's
  "Employment" column showing "Probation" for a worker whose `employmentType` is actually "Permanent" is
  a documented override (`r.stage === 'probation' ? 'Probation' : r.employmentType` — comment explicitly
  calls this a UX naming decision), not a save bug. Always grep the derivation before filing — a plausible
  mismatch hypothesis that turns out to be intentional wastes the tech lead's time and erodes trust in the
  next real ticket.
