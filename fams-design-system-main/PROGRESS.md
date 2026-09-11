# Phase 1 Progress — fams-design-system

Execution ledger for `plan/01-foundation.md` (workspace root). A fresh session resumes at the first task not marked complete. Orchestrated via subagent-driven development; every task is implemented by a subagent, reviewed (spec + quality), fixed if needed, and re-reviewed before being marked complete.

| # | Task (phase §) | Status | Commits | Notes |
|---|---|---|---|---|
| 1 | Repo bootstrap (§1) | ✅ complete | 3627b34..f5e172a | Seed from Ben's, Vue track deleted, ui-kit/v5-templates renames, KB → docs/knowledge-base/, workshop/ relocation, governance headers. Review: approved after 1 fix round (stale ui-vue doc mentions). |
| 2 | Build + publish pipeline (§2) | ✅ complete | 685c2a5..6f0faf6 | tsup ESM+d.ts+maps → dist for ui-kit/v5-templates; exports → dist; files/sideEffects; release script; pnpm pack verified via outside-repo import smoke test. Review: approved, 3 Minor parked. |
| 3 | Token reconciliation (§3) | ✅ complete | f3776cc..f5efeb3 | caption 12/14 (T-072), dark mode emitted under `:root[data-theme="dark"]` + media query, 4 tenant blocks verified + tests, `docs/token-reconciliation.md` maps 1:1 to the known 7 (no NEW-DIFFERENCE), workshop dark toggle (explicit light/dark after review fix). Review: approved after 1 fix round. |
| 4 | skeleton-kit v1 (§4) | ✅ complete | 21398fd..1555597 | createFamsApp returns {App, router, queryClient}; locked module contract; per-class gcTime real + tested; explicit-theme bootstrap; root+route error boundaries; workshop/skeleton-example proves 2 isolated lazy chunks. Review (opus): approved, 5 Minor parked. |
| 5 | Dependency alignment (§5) | ✅ complete | 794e2c7..daf68ff | pnpm catalog pins whole tech stack (echarts ~5.6.0; phase-2/3 deps catalog-only, never installed); licenses verified → docs/LIBRARIES.md; Kanban dnd swap TICKETED (docs/phase-2-tickets.md KANBAN-DND — keyboard/SR parity is the hard part); Radix ban eslint rule + exact 26-file grandfather allowlist, proven to fire. Review: approved, no fixes. |
| 6 | Quality gates (§6) | ✅ complete | 16d306d..14531f7 | CI gate order locked (build → typecheck → lint → test → explicit axe step); token lint (comment-aware, resolveToken-aware, 13-file/37-occurrence grandfathered baseline); boundary lint core→v5 proven; vaul Drawer + cmdk Command ported from Shaheer (tests, axe 99/99, registry, demos; divergences documented); docs/matrix-backlog.md (44 open items from research §3). Review: approved after 1 fix round. |
| — | Final whole-repo review + founder gate | ✅ READY | @1e024c7 | Final review (opus): all 6 gate items verified ✅ (tree, dist+types, token-diff=approved-7, dark toggle e2e, 2 lazy chunks, CI gate green locally incl. frozen-lockfile); 0 Critical/Important; hard rules hold. Parked minors triaged: 7 FIX-LATER, 3 DROP, 0 must-fix. Founder pre-approved overnight continuation → proceeding to Phase 2. Surface at gate: packages are private:true (registry deferred); Storybook not installed (showcase is the workshop vehicle). |

## Decisions taken during execution (present at founder gate)

- `apps/showcase` → `workshop/showcase`, package name kept `@fams/showcase` (only ui-kit/v5-templates renames are locked; architecture locks the `workshop/` folder).
- Storybook 10 (architecture.md lists it under workshop/) is NOT installed in Phase 1 — the phase checklist doesn't mandate it; Ben's showcase app remains the workshop vehicle. Flagged for founder.
- CHANGELOG.md keeps historical `@fams/ui-react` names (dated release notes; not rewritten).

## Minor findings parked for final review

- (from Task 1 review) none outstanding — all fixed in f5e172a.
- (Task 2 review, all Minor) 1. `workshop/showcase/vite.config.ts:5-10` comment still claims ui-kit is consumed as workspace source — now false (dist). 2. Task-2 report misattributes why pnpm overrides were needed in pack test (pnpm pack already rewrites workspace:*; real reason = no registry). 3. "dist always fresh before tests" only holds via turbo path — running vitest directly in a package can hit stale dist; consider a CONTRIBUTING note.
- (Task 3 review, Minor) 1. Dark-value CSS naming in `style-dictionary.config.js` is hand-matched to the light-side derivation, no completeness assertion tying them together. 2. tokens `test` doesn't depend on its own `build` (pre-existing pattern; gate order runs test before build).
- (Task 4 review, all Minor) 1. `autoCodeSplitting: true` in skeleton-example vite config is likely inert (splitting comes from dynamic import()) — README wording overstates it. 2. `navEntry.path` ↔ `createLazyRoute('/path')` coupling is convention-only, fails at navigation time if drifted — worth a build-time guard later. 3. `defaultTheme` force-overrides stored user choice (deliberate, confirm for phase 2). 4. `minimumReleaseAgeExclude` block auto-added to pnpm-workspace.yaml (benign supply-chain-gate carve-out for pinned TanStack versions — flagging to team). 5. CLAUDE.md says skeleton-kit "depends on @fams/tokens" but no declared dep exists (app imports the CSS; doc phrasing).

---

# Phase 2 Progress — composer port (plan/02-composer-port.md)

| # | Task | Status | Commits | Notes |
|---|---|---|---|---|
| 2.1 | @fams/v5-composer core port | ✅ complete | 11b4c5c..dc7c037+lockfile | Runtime ported React-free (rules verbatim, provenance comments), NO localStorage (injectable persistence), blueprint vocabulary, stable-ID validator w/ precise error paths, crm golden upgraded+validating, XOR composer entry (@ts-expect-error-tested), module-type registry. Review (opus): approved. Parked minors: validateBlueprint mis-dispatches dashboard/reports/settings kinds (fix in 2.7); store genId module-level counter; XOR-not-literal-discriminant terminology. |
| 2.2 | FieldRegistry + SchemaForm | ✅ complete | 8efc65f..223018e | compileFieldSet (Zod v4 + layout + descriptors, versioned cache w/ hash fallback), exhaustive 19-type FieldRegistry (compile-time Record), SchemaForm (rhf+zodResolver, scoped rerender proven, field arrays, headless useSchemaForm), getCellEditor, CSV record contract via shared joinRefCsv + round-trip test (after fix round). Review (opus): approved. Minor parked: compile cache no eviction (documented). |
| 2.3 | v5-templates: EntityProfile + CreationSheet | ✅ complete | 10533b1..8031a3b (merged) | 30/70 EntityProfile (blueprint tabs, visibleWhen+privilege gating, ProfileTabRegistry, headless useDetailStack, tokenized chrome), CreationSheet (decision #10 first-five grouping w/ TODO marker, per-step Zod gating, CSV submit contract), demos+registry+axe. Review (opus): approved, 5 Minor parked (vacuous un-minimize assertion; shell-bypass rationale undocumented; no multi-ref fixture in templates; inert useMemo; dangling active tab on privilege change). |
| 2.4 | v5-templates: View/ListView + Kanban + TaskDetail | ✅ complete | e4c0a43..3c7a056 (merged) | ModuleView (SavedViewsAdapter, serializable ViewState incl. controlled activeViewId after fix), ListView (FieldRegistry cells, inline edit, pagination/skeleton/empty), KanbanView on pragmatic-dnd (guarded moves + keyboard move-via-menu), HybridView, TaskDetail (rule-gated transitions). 98 tests. Review (opus): approved after 1 fix round. Minor parked: KanbanCard reconstructs record from cells; denied-move is silent no-op. |
| 2.5 | v5-templates: MapPanel | ✅ complete | 94a1982..ca9f07e (merged) | MapLibre+react-map-gl, deck.gl interleaved GPU layers (+supercluster), Terra Draw geofences, SYNCHRONOUS one-map-per-page guard (StrictMode-safe, never-mounts-second proven), separate `@fams/v5-templates/map` entry keeps main barrel heavy-lib-free (build-verified). 2 justified extra deps (@deck.gl/mapbox, terra-draw-maplibre-gl-adapter, licensed). Review: approved after 1 fix round. Minor parked: render-time claim vs concurrent-React purity (fail-safe direction, documented); heavy deps installed (not bundled) for all consumers. |
| 2.6 | @fams/v5-kit | ✅ complete | c0bde0b (merged) | bootstrapTenant (async composed seam, injectable ModulesSource/UserSource/BlueprintSource), licensed-only registration structurally enforced + spy-tested (decision #23), reactive Privileged/usePrivilege (exact v5 semantics), applyTenantTheme composes skeleton-kit, wipeTenantCache tenant-scoped, 26 tests. Review (opus): approved, no fixes. Minor parked: privilege reactivity tested grant-direction only; composer route renders null while pending. |
| 2.7 | Gate demo + spec.md→tests + cleanup | ✅ complete | 15120b6 (merged) | v5TemplateRenderers wiring (thin, correctly tiered), gate demo: identical ComposedModule call across crm-companies/crm-deals/fleet-vehicles (zero-code switch proven 3 ways), e2e+jsdom flows (list→profile→create→row; kanban→guarded move→TaskDetail), validateBlueprint kind-dispatch fixed (2.1 finding closed), docs/spec-conversion.md. Review (opus): approved — PHASE 2 GATE SATISFIED. Minor parked: h-[640px] in GateDemo (outside lint scope); pipeline-create has no default stage (phase 3). |

## Phase 2 gate — ✅ READY (autonomous run; founder pre-approved continuation)

Demo: workshop route `composer/gate-demo` — blueprint switcher (crm companies entity / crm deals pipeline / fleet vehicles entity), single identical `<ComposedModule/>` call. Full repo gate green. Proceeding to Phase 3.

---

# Phase 3 Progress — demo environment (plan/03-demo-environment.md)

| # | Task | Status | Commits | Notes |
|---|---|---|---|---|
| 3.1 | @fams/demo-kit | ✅ complete | 9f88f6f..631b5ff (merged) | Generic relational store (bidirectional ref integrity via full reindex, deep-cloned reads), session persistence + reset-reseeds, loud-failing seed loader, observable persona shim (safe userType='user' default after fix), generic MSW handler generator (tested over real fetch). Review: approved after 1 fix round. Minor parked: msw baseUrl rationale imprecise in docs. |
| 3.2 | fams-v5-demo-environment repo + tools | ✅ complete | (fams-v5-demo-environment repo, 5 commits) | Typed-ops engine (stable IDs, loud rejection), deterministic resolve + provenance, byte-compare check (adversarially verified: 4 tamper cases fail loudly), verification-gated capture (never guesses), promote MOVES (1:1 render identity proven), CI workflow, CLAUDE.md agent contract. link: consumption documented interim. Review (opus): approved. Minor parked: JSON Schema not executed by check; opId uniqueness per-file only; last-writer-wins provenance; non-hermetic link: lockfile — queue hardening. |
| 3.3 | Demo app boot + Demo Console | ✅ complete | ds:937e46d (merged) + demo:57d297c | DemoConsole (@fams/demo-kit/console: hover-reveal, keyboard path, esc, tokens-only, axe, generic props); app boots real bootstrapTenant over MSW (fetch-only adapter, frontend MSW-blind), decision #19 loop proven by boot smoke over msw/node; beta tenant + persona gating tested; URL params + reload semantics documented. Review (opus): approved, both gates independently reproduced. Minor parked: console lacks focus trap/restore (aria-modal overstates; non-Radix trap follow-up); demo-repo CI doesn't build DS/app yet; pipeline rules path unproven until 3.4 content. |
| 3.4 | Pilot content + CI + walkthrough | ✅ complete | (fams-v5-demo-environment, 6 commits) | asset (v5-faithful vehicle blueprint, ~50 seeds) + workforce + ticketing pipeline; fams (canonical) + iwmp (green/gradient, exact promised delta set) tenants w/ personas; coherence (workforce→vehicle Assignments via getReferrers over real fetch/MSW), pipeline default stage fixed, role-gated transition proven; CI builds DS+app; break-a-delta fails loudly (reviewer reproduced founder path). Review (opus): approved — PHASE 3 GATE MET. Minor parked: addField schema-only (placement ops = phase 4); theme switch manual-only; vestigial tenant.json colors; inert device MultiReference; doc drift. |

## Phase 3 gate — ✅ READY (autonomous run; founder pre-approved continuation)

Walkthrough: docs/WALKTHROUGH.md in fams-v5-demo-environment (fams↔iwmp theme+fields, admin↔dispatcher gating, workforce→vehicle coherence, reset, demo check, break-a-delta). All steps test-covered; reviewer reproduced every gate. Proceeding to Phase 4.

---

# Phase 4 Progress — agent workflow & guardrails (plan/04-agent-workflow.md)

| # | Task | Status | Commits | Notes |
|---|---|---|---|---|
| 4.A | Capture Action + ladder + debt dashboard + seed-integrity | ✅ complete | demo:67bb2c7..5cc1f41 | Decision-#17 ladder fully implemented incl. fixed override rung (committed override.json debt records, hash-pinned, check-green-with-loud-warning, dashboard-visible); seed-integrity in demo check; debt dashboard w/ staleness gate; PR template + CODEOWNERS. Review (opus): approved after 1 fix round — all 3 rungs adversarially re-verified. |
| 4.B | Agent enablement (DS) | ✅ complete | 686d8fd..017edfb (merged) | 8 per-package CLAUDE.mds (fact-checked), shadcn registry.json (114 items, staleness-tested), llms.txt 100% export coverage after fix (416/416 ui-kit) + coverage check in CI, PR template, CODEOWNERS (commented placeholder). Review: approved after 1 fix round. |
| 4.C | Visual regression | ✅ complete | ds:c30da94 + demo:e417a6c (merged) | Suite A 182 registry-derived showcase routes (Storybook→showcase divergence documented); suite B 24-cell tenant×persona matrix (4 fixme: kanban unreachable — app model.ts views hardcoded, fix queued); VRT (Apache-2.0) docker infra verified END-TO-END; dual local/VRT mode; optional visual.yml lanes. Review: approved. Minor parked: docs/LIBRARIES.md missing VRT row (queued in post-merge fix). |
| 4.D | Agent drill end-to-end | ✅ complete | demo: e877521..83598e2 (prep) + drill branch merged | Prep: placement ops (addField.placements + placeField), capture canonicalizes placement diffs, render-path verified, docs/agent-drill.md. DRILL: cold sonnet agent given only repo CLAUDE.md + ticket completed the full vibecode flow — hand-edited resolved → capture derived 2 canonical ops (reviewer re-derived them byte-identical) → all gates green → fields visible for Dispatcher@IWMP only (fams untouched). Review (opus): approved — PHASE 4 GATE MET (caveats: no real PR/VRT/browser trail — local equivalents verified). Post-review: degenerate positive test repointed (e9e5d82), branch merged. |

## Phase 4 gate — ✅ READY (autonomous run; founder pre-approved continuation)

The drill (docs/agent-drill.md in fams-v5-demo-environment) ran end-to-end with a cold agent; every gate fired; capture canonicalized the hand-edit into typed ops (independently re-derived byte-identical); the change renders for Dispatcher@IWMP only. Founder-gate caveats: PR-comment/VRT/browser trails are local-equivalent (no GitHub/live VRT in this run). All four phases complete → final all-phases review next.

---

# Final all-phases review — ✅ COMPLETE (2026-07-22)

Three parallel auditors (integration+hard-rules, adversarial correctness seams, parked-minors triage). **Zero Critical findings.** All gates reproduce green fresh in both repos (DS: 1527 tests + 99 axe; demo: 86 tools + 27 app tests + resolve/check/debt).

**Important findings — ALL FIXED:**
1. Root CLAUDE.md contradicted the Base-UI policy (still said "build on Radix") → rewritten per decision #7 (482982d).
2. Demo required CI on Node 20 vs pnpm-11's Node-22 need → bumped + pnpm setup unified (aa7c64d).
3. `promote`/`resolve` were override-blind (clobbered ladder-② debt) → override-aware skip + refusal + accurate messages (aa7c64d).
4. Override hash-skip passed forged schema-invalid content → check now validateBlueprints pinned content; docs state integrity≠authenticity (aa7c64d).
5. Logged-out privilege gating failed open (userType '') → safe 'user' default (7e1982c).

Adversarial results that HELD: licensed-only registration (decision #23) airtight; delta resolution deterministic/idempotent; store reference integrity (delete/re-link, cycles, dangling-seed rejection); capture idempotence.

Minors: cheap ones fixed (opId cross-module uniqueness, ambiguous-promote refusal, memo-key collision, CSV id guard, composer-route loading state, truthful vite comment, CONTRIBUTING stale-dist note, dead tenant colors, doc drift); the rest consolidated in `docs/BACKLOG.md`.

Audit caveats for the founder: `./v5` working tree has incidental npm lockfile churn + one pre-existing untracked doc (predates this run; no source touched). PR-comment/VRT/browser trails of the phase-4 drill are local-equivalents (no GitHub/live-VRT run here).
