# Architecture Decision Records

This folder holds the major design decisions that shape the FAMS V5 kit.
Each ADR documents a decision, the context that led to it, the
consequences, and what alternatives were considered.

## Index

| # | Decision | Date |
|---|---|---|
| [001](001-tailwind-4-not-3.md) | Tailwind 4 (not 3) | 2026-06-08 |
| [002](002-theme-inline-not-js-preset.md) | `@theme inline` in CSS (not JS preset) | 2026-06-08 |
| [003](003-json-configs-not-react-modules.md) | Modules as JSON configs (not React components) | 2026-06-08 |
| [004](004-skills-not-claude-md-only.md) | Claude Code skills (not just CLAUDE.md) | 2026-06-08 |
| [005](005-production-geometry-verbatim.md) | Codify production geometry verbatim | 2026-06-08 |

## When to add an ADR

Add one when a decision:
- Has long-term architectural consequences
- Is non-obvious (anyone reading the code would ask "why this?")
- Was made over an obvious alternative (so the rejection is informative)
- Required more than 5 minutes of debate to settle

Don't add ADRs for:
- Tactical implementation choices (file naming, variable names, etc.)
- Decisions that are obvious from the docs ("we use TypeScript")
- Decisions made by upstream dependencies ("React functional components")

## Format

Each ADR uses the same structure:

1. **Status** — Proposed / Accepted / Superseded
2. **Date** — When decided
3. **Context** — What forced the decision
4. **Decision** — What we decided (one-line claim + elaboration)
5. **Consequences** — Positive + negative
6. **Alternatives considered** — At least 2
7. **See also** — Cross-references
