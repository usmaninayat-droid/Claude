# Team Backlog — standing goals (the brain pulls the top item each tick)

> The Conductor reads this every wake and picks the single highest-value OPEN item.
> Priority: blocker tickets > parity drift > open defects > standing sweeps > ideas.

## Standing goals (always-on)
- [ ] G-PARITY  Keep the pipeline module (kanban/list/detail) at parity with the Figma refs.
- [ ] G-DEFECTS Close every open defect ticket at severity >= major.
- [ ] G-SWEEP   Nightly QA sweep of the showcase apps against the coherence gate.
- [ ] G-BACKPORT Drain the backport queue (product fixes that belong in the DS).
- [ ] G-DOCS    Keep docs/ in sync with shipped DS changes.

## Team self-improvement — GREENLIT (do in priority order, ahead of one-offs)
> Goal: make the loop's claims executable + self-correcting before adding scope.
> Approved 2026-07-09. Do the DO-NOW block in order; then DO-NEXT; parked = don't pull.

### DO NOW (integrity — cheap, high-leverage)
- [x] **SI-1 · G-SMOKE gate (keystone).** DONE 2026-07-09. `scripts/team/gates/smoke.mjs` +
      `src/__tests__/module-smoke.spec.tsx` (22 checks): every fixed module TYPE resolves a
      renderer; every golden config-driven module (CRM + Sales seeds) binds data + derives a
      valid view-model (columns/rows or stages/cards, facets, sortFields, buildable detail) with
      no throw. Node env — no browser/WebGL. Wired into team-loop + conductor gate list.
      Verified: PASS(22) on HEAD; red-check (a columns-less config) fails as designed.
- [x] **SI-2 · Memory consolidation.** First instance DONE 2026-07-09 (fixed the false
      "filters = open gap" learning + made defect-log.md a real counter). CADENCE still to
      formalise: run `consolidate-memory` every ~5 ticks OR when learnings.md > ~25 lines.
- [x] **SI-3 · Stale-check before dispatch.** DONE 2026-07-09 — encoded as step 4b/5b in
      conductor.md + team-loop SKILL.md: cheapest reproduction before any fix dispatch; can't
      reproduce → close as already-fixed. (This is what caught T-002 in tick 3.)
- [x] **SI-4 · Defect→gate promotion as a LOOP RULE.** DONE 2026-07-09 — defect-log.md is the
      taxonomy counter (`count`/`gate`/`status`); conductor.md step 6 + team-loop step 6 now
      AUTO-OPEN a "promote <class> to gate" ticket on the 2nd occurrence of a gate-less class.

### DO NEXT (cheap win, after DO-NOW is green)
- [x] **SI-5 · G-A11Y gate (static).** DONE 2026-07-09. `scripts/team/gates/a11y-static.mjs` —
      deterministic, node-only, NO axe/DOM/WebGL (axe needs a live DOM → reintroduces the
      flakiness G-SMOKE removed; the architecture doc already anticipated `a11y-static.mjs`).
      Rules: icon-only <button>/<a> w/o accessible name (brace/quote-aware scan so arrow
      handlers don't hide them) · <img> w/o alt · positive tabIndex. Calibrate via `// a11y-allow`.
      Verified: found + fixed 4 real date-picker nav-arrow defects + 1 marker <img>; PASS on HEAD;
      red-check (seeded icon button) fails as designed. Wired into loop gate order. Gives the
      a11y persona teeth for the common cases; reserve the persona for deeper WCAG review.
      FOLLOW-UP (parked): contrast + touch-target checks need token/computed-style analysis —
      add as SI-5b when useful.

### DO NEXT (cont.)
- [x] **SI-6 · Extend coherence + a11y gate scan to `blocks/**`.** DONE 2026-07-09. a11y-static now walks
      `blocks/` too; coherence scans `blocks/` for CHROME hex only (Tailwind `-[#...]` arbitrary values) — NOT
      sample-data literals, which are legitimate DATA. Zero data-noise, real coverage for the surface fed designs
      build. Both gates PASS on HEAD.

### PARKED (do NOT pull until the loop is trustworthy)
- SI-P1 · Figma parity baseline (check refs into `.claude/team/knowledge/figma-refs/`) — right
  idea but leans on the unreliable Figma MCP; land G-SMOKE first, snapshot Figma once stable.
- SI-P2 · Fan-out cheap independent tickets via the Workflow tool.
- SI-P3 · Cost steward: log tokens/tool-calls per tick + enforce budget.

## One-off queue (FIFO, newest last)
- [ ] (none yet)

## Done (rolling, last 20)
- Team spine built: 9 personas + gates + memory + loop commands (Phases 0-3).
