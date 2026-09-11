# Provenance

This repo (`fams-design-system`) was bootstrapped in two steps, per the locked
decisions in `docs/knowledge-base/decisions.md` (the constitution — see
`docs/knowledge-base/00-INDEX.md`).

## 1. Seeded from FAMS-Design-System-By-Ben

The engineering skeleton: the pnpm + turbo + changesets monorepo layout,
DTCG design tokens (Style Dictionary v5 pipeline), ~110 tested React
components (`packages/ui-react`, now renamed `packages/ui-kit`), the v5
product-patterns package (`packages/v5-patterns`, now renamed
`packages/v5-templates`), the showcase app, and the governance docs
(`CLAUDE.md`, `docs/API-GRAMMAR.md`, `docs/BOUNDARIES.md`,
`docs/USAGE-INDEX.md`, `docs/COMPONENT-GUIDE.md`). Credit: Ben.

This bootstrap (Task 1) took Ben's repo as the base with fresh git history,
removed the frozen Vue track, applied the two locked package renames
(`@fams/ui-react` → `@fams/ui-kit`, `@fams/v5-patterns` → `@fams/v5-templates`),
and relocated the showcase app from `apps/` to `workshop/` to match the
locked repo architecture (`packages/` + `workshop/`). See decision #1
(merge Ben + Shaheer, greenfield rebuild) and decision #12 (naming).

## 2. Merges in FAMS-Design-System-By-Shaheer

The design truth: Figma-faithful visuals and the low-code runtime patterns
that inform the v5 tier. Shaheer's work is **ported in during later phases**
— it is not part of this bootstrap. Per decision #1, Ben's DTCG tokens are
canonical, with token values reconciled against Shaheer's per decision #2
(single override: caption size). Credit: Shaheer.

## Read-only sources

`FAMS-Design-System-By-Ben/`, `FAMS-Design-System-By-Shaheer/`, and `v5/`
are read-only reference material for this initiative and are never modified
in place — all engineering happens in this repo.
