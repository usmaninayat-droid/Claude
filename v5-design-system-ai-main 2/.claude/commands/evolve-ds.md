---
description: Loop A — evolve/perfect the design system from an intent or Figma. Runs the full team loop with gates until green (cap 3), then retro. Hands-off capable.
argument-hint: "\"<intent>\" [figma-url]"
---
Run **Loop A (evolve the design system)** via the `team-loop` skill.

Intent: **$1**  ·  Design ref: **$2** (optional)

1. Load state (memory + tickets + backlog). If `$2` given, run `figma-to-spec`.
2. `po-analyst` → spec+acceptance (G1) → `ux-designer`(+`ui-designer`) → design.
3. `tech-lead` plan → `frontend-eng` implement.
4. Gates cheap→expensive: coherence (G3) + build (G6) scripts, then `qa` (G4/G2) + `a11y` (G5).
5. Route defects as tickets → tech-lead → eng → re-gate. Cap 3, else escalate.
6. `writer` docs (G7) + retro → memory. Log everything. Print 3-line summary.
Guardrails: token-only; never build products here; escalate don't grind.
