---
name: team-loop
description: The FAMS autonomous-team loop engine. Use when running the design-team loop — reading the backlog/tickets/memory, dispatching persona subagents, running gates, routing defects, and writing a retro. Invoked by /conductor and the evolve-ds / product-loop commands.
---
# team-loop — the loop engine

Runs one unit of team work, gate-driven and memory-aware. Pure orchestration.

## Algorithm (one loop)
1. **Load state**: read `.claude/team/memory/` + `workspace/tickets.md` + `workspace/backlog.md`.
2. **Spec** (if new work): dispatch the PO/BA persona → acceptance criteria (gate G1).
3. **Design/Build**: dispatch ux/ui then frontend-eng (guided by tech-lead).
4. **Gates, cheap→expensive, stop on first blocker**:
   - `node scripts/team/gates/coherence.mjs .`   (G3, token-free)
   - `node scripts/team/gates/smoke.mjs .`        (G-SMOKE, token-free — every module resolves a renderer + binds data + derives a valid view-model; no browser/WebGL)
   - `node scripts/team/gates/a11y-static.mjs .`  (G-A11Y, token-free — icon-only controls w/o accessible name · <img> w/o alt · positive tabIndex; calibrate via `// a11y-allow`)
   - `node scripts/team/gates/type-scale.mjs .`   (G-TYPESCALE, token-free — components must use the DS semantic type scale, no Tailwind-default `text-xs/sm/base/…` or arbitrary `text-[Npx]`; calibrate via `// type-allow`)
   - `bash scripts/team/gates/build.sh .`         (G6, token-free)
   - dispatch `qa` for functional + parity (G4/G2); `a11y` persona only for deeper WCAG review beyond the static gate
5. **Route**: any FAIL → write ticket(s) to `workspace/tickets.md`, assign to tech-lead → eng fix → GOTO 4. Cap = 3 iterations, then escalate.
5b. **Stale-check before any fix dispatch (SI-3)**: before "fixing" an open ticket, run its cheapest reproduction (the relevant gate / a grep for the symptom / a static trace). If it can't be reproduced → close the ticket as already-fixed and log it; do NOT dispatch a build.
6. **Retro**: append new lessons via `scripts/team/memory/retro-append.sh`. **Defect→gate promotion (SI-4, automatic):** `memory/defect-log.md` is the taxonomy counter — bump `count` whenever a defect of a class is filed; when a class reaches `count >= 2` with `gate: none`, AUTO-OPEN a "promote <class> to gate" ticket this loop (don't wait for a human/writer).
7. **Log** every step to `workspace/run-log.md`.

## Rules
- **Delegate by default (autonomy):** substantial work (new component/module/feature, design
  build, multi-file change, review) runs through the persona team — dispatch specialists +
  route verdicts, or run a review-fix workflow; solo only for trivial edits. See
  `docs/AGENT-TEAM-OPERATING-CONTRACT.md`.
- **Run to completion:** once the user gives a task, work it to the finish without being told
  "go/next/continue". Decompose → execute every part → self-advance → gate + verify → iterate
  review→fix→re-verify (cap 3). Yield only when done+verified, blocked, at the cap, or a
  genuine user decision is needed. Never stop mid-task just to confirm. (`autonomy.mjs` enforces.)
- Agents never call each other — you (the loop) route their `verdict` blocks.
- Cheap deterministic gates before any model reviewer.
- Escalate, don't grind (cap + budget). Never delete; never touch prod; backport writes DS-library only.
