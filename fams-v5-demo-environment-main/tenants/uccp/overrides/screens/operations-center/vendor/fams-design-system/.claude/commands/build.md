---
description: Build the V5 design system phase by phase (B1..B6) from the plan, reading only what each phase needs.
argument-hint: "[B1|B2|B3|B4|B5|B6|all]  (default: next incomplete phase)"
---
You are building/extending the V5 Design System per the in-repo docs:
`docs/BUILD-SEQUENCE.md` (the phased build B1..B6 + verify gate) and `docs/ARCHITECTURE.md`.

Phase to run: **$1** (if empty, infer the next incomplete phase from what exists in `src/`).

Rules for token efficiency (important):
- Read `CLAUDE.md` (already in context) + ONLY the one section of `docs/BUILD-SEQUENCE.md` for the current phase. Do NOT read every doc up front.
- Pull deeper detail on demand: a specific doc (`docs/MODULE-TYPE-COOKBOOK.md`, an ADR) or `src/` file only when the phase needs it.
- Never read `node_modules/`.

Per phase: do the work → run `/verify` → print a 3-line summary (what changed, verify result, next phase). Then STOP and wait for me, unless $1 is `all` (then continue to the next phase automatically).

Guardrails: obey the 6 coherence laws in `CLAUDE.md`. Modules are config, not bespoke React.
