# Agent-Team Operating Contract — "working as planned"

> The plan is a **hub-routed, delegating, self-verifying team that runs each user
> task to completion.** This file is the contract that makes that real, plus the
> honest limits. If behaviour drifts from this, that is the bug — fix it here.

## The gap this closes
The machinery (personas · gates · board · memory · hooks) exists and is correct to
plan, but the driver kept **building solo** in the main thread instead of running the
team. "Working as planned" = the loop is the **default** path for substantial work,
not the exception.

## The 4 operating rules (enforced, not aspirational)
1. **Delegate by default.** Substantial work — a new component/module/feature, a design
   build, a multi-file change, or a review — runs through the **persona team**: dispatch
   the specialists (po-analyst · ux/ui-designer · a11y · tech-lead · frontend-eng · qa ·
   writer) and route their verdicts, or run `/conductor` / a review-fix workflow. Build
   **solo only** for trivial edits or direct answers. *(autonomy.mjs hook nudges this.)*
2. **Run to completion.** Once the user gives a task, carry it to the finish without being
   told "go/next/continue". Decompose → execute every part → self-advance → gate + verify.
   Yield only when done+verified, blocked, at the cap, or a genuine user decision is needed.
3. **Collaborate via routed verdicts (not chat).** Agents don't talk peer-to-peer — the
   **Conductor routes**: each persona emits a `verdict`, the orchestrator hands it to the
   next (QA files a defect → tech-lead plans → frontend-eng fixes → QA re-verifies). This is
   the real shape of "collaboration"; maximise it with panels (parallel reviewers),
   adversarial verification, and **multi-round** review→fix→**re-review** (cap 3).
4. **Verify for real, then learn.** Deterministic gates (coherence → smoke → a11y → build)
   every loop; **visual proof** via `scripts/team/parity/shoot.mjs` for anything on screen;
   append a retro learning + run-log entry. Trust-but-verify the team's own output.
5. **Ship the artifacts, write the architecture dynamically.** Every deliverable is **code + docs**:
   a new component ships its `.spec.md` contract next to the `.tsx`; a new module ships its
   `.block.md` (or a self-describing recipe JSON); and any touched behaviour updates the relevant
   `docs/` architecture (ARCHITECTURE · MODULE-TYPE-COOKBOOK · FAMS-PLATFORM-MODEL · ADRs). The
   **writer** persona owns this — the architecture is kept current as we build, not written after.

## Definition of "working as planned" (checklist)
- [ ] A substantial task spawns ≥2 personas and at least one **delegation** (reviewer → lead → eng).
- [ ] Findings are **routed** (verdict → ticket/plan → fix → re-verify), not hand-waved.
- [ ] All 4 gates run + a parity screenshot when visual; failures fixed (cap 3) or escalated.
- [ ] The task reaches its acceptance criteria **without** a "go/next" nudge per step.
- [ ] New component/module ships its `.spec.md`/`.block.md`; touched `docs/` architecture is updated.
- [ ] A learning + run-log entry land at the end.

## Honest limits (unchanged, by design)
- **No peer-to-peer agent chat** — collaboration is hub-routed via the Conductor + the board.
- **No self-waking daemon in-session** — a scheduler (`/conductor tick` on cron) is what makes
  it run with *no* human turn; that's opt-in infra, separate from in-session run-to-completion.

## Where the loop lives
`/conductor tick` (brain) · `team-loop` skill (engine) · `.claude/agents/*` (personas) ·
`scripts/team/gates/*` (gates) · `scripts/team/parity/shoot.mjs` (visual proof) ·
`scripts/team/hooks/*` (autonomy + design triggers) · reusable review-fix workflow
(`.claude/workflows/review-fix.js`).
