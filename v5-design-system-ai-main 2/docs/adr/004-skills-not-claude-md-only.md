# ADR-004 — Claude Code skills (not just CLAUDE.md)

**Status:** Accepted
**Date:** 2026-06-08

## Context

The kit's primary user is Claude Code (an AI coding agent). The original
mechanism for transferring kit knowledge to Claude Code was `CLAUDE.md` —
a ~5K-token routing brain that Claude Code would re-read every session.

In practice:
- Claude Code often skipped steps in the 8-step recipe
- The "white sidebar" failure recurred across multiple sessions
- Each session paid the 5K-token cost just to ground itself
- Recipe variations (init vs add-module vs verify vs style-fix) weren't
  cleanly separated

## Decision

**Build 5 Claude Code skills as the primary interface.** `CLAUDE.md` becomes
a fallback for users without skills installed.

The 5 skills:
1. `fams-v5` — routing brain (loads when working in FAMS workspace)
2. `fams-v5-init` — new product bootstrap
3. `fams-v5-add-module` — extend existing project
4. `fams-v5-verify` — kit-compliance checklist
5. `fams-v5-style-fix` — failure-symptom troubleshooting

Each skill has a YAML frontmatter `description` that Claude Code matches
against user intent. The skill body activates only when triggered.

## Consequences

### Positive
- **Token cost moved from O(every session) → O(when needed).** A user who
  isn't bootstrapping a project doesn't pay the `fams-v5-init` cost.
- Skills can call scripts (`init-project.mjs`, `verify.mjs`) — encoding
  WORKFLOW, not just instructions. Claude Code can't skip steps the same way.
- Skills are versioned + shareable as standalone `.skill` files
- The skill discovery mechanism is built into Claude Code — no need to
  invent a routing system

### Negative
- Requires installing the skills (`install-skills.mjs`) before use. Users
  who run Claude Code without installing get the old CLAUDE.md flow.
- Skill discovery is "best match" not perfect — ambiguous prompts may
  trigger the wrong skill. Mitigated by explicit triggers in each
  `description` field (we enumerate ~10 trigger phrases per skill).
- Drift risk: skills + CLAUDE.md + docs/ can disagree if not maintained
  together. Mitigated by CHANGELOG discipline + the `fams-v5-verify`
  skill checking against the kit's expected shape.

### Why not just delete CLAUDE.md?
Two reasons:
1. Some users will run Claude Code without skills installed (especially in
   CI environments where we don't control the runtime).
2. CLAUDE.md is human-readable in a way SKILL.md isn't — it's the canonical
   reference for "what is this kit" when reading the repo directly.

## Alternatives considered

**MCP tools instead of skills.** Considered. Rejected because MCP tools
require a running server + tool discovery + per-tool documentation. Skills
are simpler (just files).

**A single mega-skill.** Considered. Rejected because the 4 sub-skills
have very different trigger patterns — merging them would dilute the
descriptions and worsen routing.

**No skills, better CLAUDE.md.** Rejected — Claude Code kept skipping
steps. The fix needed to be enforcement, not better instructions.

## See also

- `docs/07-skills.md` — full skill catalog
- `skills-bundle/` — source files
- `scripts/install-skills.mjs` — installer
