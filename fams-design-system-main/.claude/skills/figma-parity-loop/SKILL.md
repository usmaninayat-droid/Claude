---
name: figma-parity-loop
description: Use when given Figma URLs to bring the FAMS demo environment / design system to parity with designs — "match this screen to Figma", overnight design-improvement runs, or when screens look right but basic interactions (scrolling, edit buttons, dropdowns, tabs) are broken. Designed so non-coders (designers) can invoke it with just Figma links.
---

# Figma Parity Loop

## Overview

Autonomous loop: Figma URL(s) in → extracted specs → generalized design-system components → metadata-only consumption in the demo env → verified screens out.

**Core principle: a screen is DONE only when it passes THREE gates — it LOOKS like Figma, it BEHAVES like a real product, and it is built centrally (schema-first).** Static screenshot parity alone is a failed run; that is exactly how past runs shipped broken dropdowns, dead edit buttons, and unscrollable lists.

**Violating the letter of the gates is violating the spirit of the run.**

## Inputs (designer-friendly)

The invoker provides only:
- `resume plan/run-<date>-<slug>` — continue an existing run (used by the skill's own loop; also valid manually). If the named folder doesn't exist, say so and stop — never guess a different run.
- One or more Figma URLs (any form — `figma.com/design/<fileKey>/...?node-id=309-15094` — parse fileKey + node-id yourself; convert `309-15094` → `309:15094` for MCP).
- Optionally: target route/module (e.g. `/ticketing`), tenant (e.g. `iwmp`), and free-text feedback ("the list feels congested", "edit doesn't work").

If the target module is not stated, infer it from the Figma frame names and the app's nav; if the invoker's casual screen name matches no frame or nav label, use the closest match by content (compare the Figma screenshot against the app's screens), state the inference in the run log, and proceed. Tenant, if unstated: infer from branding in the Figma file/frame name (e.g. a "Tadweer" file → the tenant themed as Tadweer, currently `iwmp`), falling back to the demo default tenant — always recorded as an assumption in the run log. Any free-text bug report from the invoker ("edit doesn't work") is a P0-suspect: put it in the interaction spec AND have the Phase 2 inventory root-cause it up front — don't wait for round 1 to rediscover it. Never block waiting for a human overnight.

## Environment facts

**Workspace layout & path rule:** sessions run at a workspace root containing both repos as siblings — `./fams-design-system` (this skill's home) and `./fams-v5-demo-environment` — plus `./plan/` for run docs. **Use ONLY relative paths from that workspace root** in run docs, scripts, state logs, and commands — never absolute paths, never user-/machine-specific paths (they break for every other designer's machine and for resumed sessions). If the CWD is one of the repos instead of the root, `cd` up to the root first and note it in the state log.

| Thing | Fact |
|---|---|
| Figma access | Dev Mode MCP, HTTP streamable at `http://127.0.0.1:3845/mcp` (initialize → notifications/initialized → tools/call). Tools: `get_design_context`, `get_variable_defs`, `get_screenshot`, `get_metadata`. If a node won't resolve: `open 'figma://file/<key>?node-id=...'` to focus the file on the desktop first. If :3845 doesn't respond at all, the Figma desktop app isn't running or Dev Mode MCP is off — open the app, enable it (Preferences → Enable Dev Mode MCP Server), retry; raw curl protocol recipe in memory `figma-devmode-mcp-http`. |
| Demo app | `http://localhost:6300` — repo `./fams-v5-demo-environment` (**metadata only**: blueprints, tenant deltas, seeds; `pnpm demo resolve --all && pnpm demo check`; app tests `pnpm --filter app test`). QA with `?tenant=<t>&persona=u_admin`. |
| Design system | repo `./fams-design-system` (tokens, ui-kit, v5-composer, v5-kit, v5-templates…). After DS changes: `pnpm build` (no cross-repo hot reload) → clear `app/node_modules/.vite` → restart demo dev server (`pnpm --filter app dev`). |
| Screenshots | Playwright scripts using the demo app's own `@playwright/test` dep — if a previous run left a `shoot*.mjs` under `./plan/*/`, reuse/extend it (dpr 2, element-scroll shots, close popovers before shots); otherwise write one into the run folder. |
| Hard rules | No paid libraries (Gilroy font is paid — keep token stack). Demo env gets zero bespoke UI code. New Figma components → GENERALIZED DS components (generic props/variants, never module-specific), consumed by name via metadata. |
| Run docs | Everything under `./plan/run-<YYYY-MM-DD>-<slug>/` (workspace root, outside both repos so it never pollutes their git state). `INSTRUCTIONS.md` there is the single source of truth with an append-only state log — context gets compacted, the file survives. |

## Bootstrap — self-healing, runs on EVERY invocation

Designers type `/figma-parity-loop <url>` and nothing else — including in a fresh workspace where the slash command doesn't exist yet. If a user message contains `/figma-parity-loop` (even flagged as "Unknown command" by the harness), treat it as a full invocation of this skill.

Before anything else, check `<workspace-root>/.claude/skills/figma-parity-loop` exists. If not: run `bash fams-design-system/scripts/setup-workspace.sh` yourself (idempotent; installs all skill symlinks + workspace CLAUDE.md), note it in one sentence to the user, and **continue their actual request in THIS session** — the skill content works for you immediately; only slash autocomplete needs a future session. Never tell the user to run anything, never make setup their problem.

## HARD STOP — link mode + sibling checkout, or do not run

**Run this before Phase 0, on every invocation, and obey it:**

```bash
node fams-v5-demo-environment/scripts/require-link-mode.mjs "/figma-parity-loop"
```

**Exit 1 means STOP.** Print the script's message to the user verbatim and end the
run. Do not start Phase 0, do not extract Figma nodes, do not create a run
folder, do not "do the demo-environment half only", and do not work around it by
editing files under `node_modules`.

Why this gate exists: parity work changes components and tokens, and those live
in `./fams-design-system`. The demo environment can now be installed WITHOUT
that sibling checkout (`ds.config.json` mode `registry`), and in that mode the
components are read-only copies inside `node_modules` — edits there are
discarded by the next `pnpm install`. A run in that state would pass its own
screenshots and report success while changing nothing that survives. Refusing is
the correct outcome; a false green is worse than no run.

The script exits 0 only when the sibling `./fams-design-system` exists AND the
resolved mode is `link`. Everything else in the demo repo — running the app,
blueprints, seeds, resolve/check/capture — works fine without the design system;
only design-system-editing workflows are gated.

## Protocol

**Phase 0 — Setup.** Verify MCP :3845 and app :6300 respond. Create the run folder with `mkdir -p ./plan/run-<YYYY-MM-DD>-<slug>` — this creates `./plan/` itself on a fresh workspace (teammates' checkouts won't have it; nothing about this skill requires prior runs to exist). Then write `INSTRUCTIONS.md` (mission, targets table, state log). **Create the cycle branch in BOTH repos** (see Branching model); if the tree already has uncommitted prior work, commit it to the cycle branch as `wip: pre-cycle snapshot` first so it's separable from this cycle's changes. Take baseline app screenshots.

**Phase 1 — Extract.** Per node: design context + variables + screenshot → `specs/<screen>/`. Then a condenser subagent per screen writes `SPEC.md` covering BOTH:
- **Visual spec**: layout, exact tokens/colors (pixel-sample + match to variables when context is sparse), spacing, chips/pills anatomy.
- **Interaction spec**: enumerate EVERY visible affordance (button, dropdown, tab, checkbox, pencil/edit icon, search box, scroll region, drawer, "+" control) and its self-explanatory expected behavior. Figma is static — the expected behavior is what any modern SaaS user would expect. This section is mandatory; a SPEC.md without it is incomplete.

**Phase 2 — Inventory.** One subagent maps existing DS/demo code relevant to the targets → `codebase-inventory.md`. Read it before implementing; past runs found root causes here (e.g. rails-in-sync = one `deriveNavEntries()`).

**Phase 3 — UX judgment pass.** Invoke `ui-ux-pro-max:ui-ux-pro-max` against each SPEC.md + baseline shot. Ask it the modern-platform questions Figma can't answer: congested table → inner horizontal scroll (never crush columns), content touching container borders → padding rhythm, overflow behavior, empty/loading states, touch targets, hierarchy. Output `qa/UX-NOTES.md`; merge its verdicts into each screen's acceptance criteria alongside the Figma spec. When Figma and UX heuristics conflict, Figma wins on look, heuristics win on behavior (scroll, overflow, resize).

**Phase 4 — Plan waves.** Work packages with disjoint file sets (isolation makes each package independently committable and resumable); DS components first, metadata last. Sequence: shared primitives/chips → screen composites → blueprint/deltas/seeds → verify.

**Phase 5 — Implement.** One subagent at a time (see Execution discipline). Each ends with its package's typecheck/tests green and reports the API contract it created for later packages.

**Phase 6 — Verify loop (the triple gate).** Each round: DS `pnpm build` → clear .vite → restart app → screenshot. Then three QA subagents per screen, run one after another, each writing `qa/<screen>-round<N>-<gate>.md`:
1. **Visual gate** — region-by-region diff vs `specs/<screen>/figma.png`.
2. **Interaction gate** — a Playwright agent that ACTS on the live app: clicks every affordance from the interaction spec, opens every dropdown and selects an option, activates edit affordances and confirms an editing state appears, scrolls every overflow container (assert `scrollWidth/scrollHeight > client*` regions actually scroll), switches tabs, submits the create form, closes drawers, checks zero console errors, and re-checks at 1440px and 1280px widths. See [references/interaction-qa.md](references/interaction-qa.md) for the contract + probe patterns. A control that looks right but does nothing is a P0.
3. **UX gate** — re-run the ui-ux-pro-max heuristic check on the new shots.

Diffs → fix wave → repeat. A screen passes only when all three gates report clean **in the same round**.

**Phase 7 — Code review gate.** Subagent reviews for centralization, generic-only DS components, low-code compliance, no new/paid deps. Violations loop back to Phase 5.

**Phase 8 — Close.** All root gates green in both repos (DS typecheck/lint/test/build + showcase demo-coverage; demo resolve/check + app tests). Final commit on the cycle branch in both repos. Write `MORNING-REPORT.md`: result first, feedback→done mapping, real bugs found, gates, deviations, ops notes — **ending with a "Review & merge" section**: both cycle branch names, the exact `git log --oneline design-master..cycle/<...>` and `git diff design-master...cycle/<...>` commands per repo, and what to eyeball before merging. Update the state log throughout, newest last.

## Execution discipline — strictly SEQUENTIAL, never parallel

**Run exactly ONE subagent at a time, everywhere** — extraction condensers, implementation packages, QA gates, code review. Never dispatch agents in parallel, regardless of how independent the work looks. Rationale: these runs go overnight; parallel fan-out is what hit rate/spend limits in past runs and killed agents mid-task. Sequential runs slower but finishes. Wall-clock time is free overnight; limits are not.

- Dispatch the next subagent only after the previous one has returned and its result is logged in the state log.
- "These two packages touch disjoint files, so parallel is safe" — irrelevant; the constraint is API limits, not file conflicts. Still sequential.
- Under the dispatch model, total concurrency is: the run agent + at most ONE worker it has in flight. The run agent's workers follow the same one-at-a-time rule.

## Dispatch model & self-driving loop (built in — the invoker never types /loop)

**The main session never executes the run itself — it ALWAYS dispatches the run to a background subagent and acts only as watchdog + relay.** One invocation must still carry the run to completion.

1. Main session does Bootstrap + Phase 0 (cheap, fast), then dispatches ONE background general-purpose subagent — the **run agent** — whose prompt says: read `fams-design-system/.claude/skills/figma-parity-loop/SKILL.md` (+ its references/), execute Phases 1–8 for run folder `plan/run-<date>-<slug>`, obeying the sequential rule and the state-log discipline.
2. Main session then starts a self-paced recurring loop (invoke the `loop` skill, **no interval**) with prompt `/figma-parity-loop resume plan/run-<date>-<slug>`, and tells the designer in plain words: the run is underway in the background, a report will follow.
3. **Each watchdog wakeup / `resume` entry:** read the run folder's `INSTRUCTIONS.md` state log and check the run agent. Alive and progressing → `noop: true`, long wakeup (1800s+). Dead or stalled with the run incomplete → dispatch a FRESH run agent whose prompt carries `resume plan/run-<...>` (it picks up mid-wave from the state log alone — that is what the log is for). Phase 8 complete → relay `MORNING-REPORT.md` to the user in plain words, then stop.
4. **Stop the loop (`stop: true`) ONLY when:** Phase 8 is fully complete (all gates green, cycle branches committed, `MORNING-REPORT.md` written), or the run is hard-blocked on something only a human can do. Spend limit specifically: first cut screen count and finish dead agents' work inline (see Checkpointing); stop only when even single-agent progress is impossible — with work committed to the cycle branch — in both cases write the reason as the state log's final entry first. "The remaining diffs are minor" is not a stop condition; the triple gate is.

## Branching model — one cycle branch, manual merge only

Every invocation = one **cycle**. In BOTH repos, at Phase 0, create `cycle/<YYYY-MM-DD>-<slug>` (same name in both) **off `design-master`** — the design team's build, never `main` — and do ALL work there. If `design-master` doesn't exist in a repo, create it from `main` first and say so.

- **One commit per green wave/package** on the cycle branch, message prefixed by phase (`extract:`, `wp1:`, `fix2:`, `qa:`, `close:`) — the commit history IS the run's reviewable story. No sub-branches; a linear chain of small commits on one branch reviews better and resumes simpler.
- **The loop NEVER touches `main` or `design-master` directly**: no merge, no rebase of them, no push to them, no `git checkout` of them followed by edits. Folding the cycle branch into `design-master` is ALWAYS a decision someone makes out loud the next morning (`bash scripts/fams-done.sh` from each repo), and reaching `main` is a separate promotion after looking at the build, guided by the MORNING-REPORT's "Review & merge" section. This holds even if every gate is green and the diff looks trivial — green gates earn a merge *recommendation*, never a merge.
- If a new cycle starts while a previous cycle branch is unmerged, branch the new cycle from the previous cycle's tip (state this in the run log + report) so nothing is lost; the human can merge cycles in order.

## Checkpointing & budget resilience

- **Commit to the cycle branch after every green wave.** Patch files are backup-of-last-resort only. A past run lost the DS tree to a PC restart and another was killed by the org monthly spend limit — branch commits make both non-events.
- After each wave, append to the state log: what landed, what's dispatched, exact resume point. Any fresh session must be able to resume from `INSTRUCTIONS.md` alone.
- If agents die mid-task (spend limit, crash): finish their remaining work inline, note it, keep gates intact — never skip the interaction gate to save budget. If budget forces triage, cut screen COUNT, not gate DEPTH.

## Red flags — STOP, you are about to ship a broken screen

- "The screenshot matches, marking done" — did the interaction gate run **this round**?
- "The dropdown/edit button is out of scope for parity" — it's visible in Figma, so its self-explanatory behavior is in scope.
- "I'll test interactions at the end for all screens" — interaction bugs found late invalidate visual QA; run gates together per round.
- "Columns are squeezed to fit the frame width" — modern lists scroll horizontally inside the table region; never crush columns to avoid overflow.
- "I'll commit everything at the end" — commit the cycle branch after every green wave.
- "All gates are green, so I'll merge to master to save the human a step" — never; merge is manual, always.
- "The demo env needs just one small component here" — no bespoke UI in the demo repo, ever; generalize into the DS.

| Excuse | Reality |
|---|---|
| "Interaction testing is expensive; visuals prove it works" | Three past runs proved the opposite: pixel-parity screens shipped with dead controls. The gate exists because visuals DON'T prove it. |
| "Figma doesn't show the behavior, so there's nothing to verify" | Phase 1 requires deriving expected behavior from affordances. Static design ≠ static product. |
| "Gates were green last round; the fix was tiny" | Tiny fixes broke maps and dropped exports in past runs. Re-run all three gates on any touched screen. |

## Known pitfalls (all hit in real runs)

- Blueprint fields must be in `systemcolumns` AND the layout arrays; renderer override goes on the systemcolumn — otherwise bare text renders.
- `tsup` multi-entry dts race made builds non-deterministic — keep the split/chained configs; build DS from clean when output looks stale.
- Stale UI after DS build = Vite cache — `rm -rf app/node_modules/.vite`, restart.
- Named-component registrations can be tree-shaken — keep explicit top-level `registerComponent` calls.
- Dev Mode context falls back to sparse geometry on huge files — pixel-sample colors and exact-match to `variables.json`; treat radii/shadows as estimates and verify against shots.
- Turbo self-dependency cycles → package-scoped `turbo.json`.
