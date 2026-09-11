# Port Gate — every component from shaheer-ds passes ALL of this or does not enter

> **Historical note:** the `/verify` command referenced below was superseded and no longer exists. The living gates today are CI (typecheck/lint/test in `.github/workflows/ci.yml`) plus `docs/API-GRAMMAR.md`. This document is kept for provenance only — see `docs/history/` § scope.

> Source doctrine: the donor repo `mshaheer-des/v5-design-system-ai` is a **read-only design reference**, never a dependency. We port *design decisions and visuals*, rebuilt on our chassis. Charts are rebuilt on ECharts (never recharts). This gate is enforced mechanically by `/verify` (see Wave 6) — it is not advisory.

## G1 Naming & placement
- File: PascalCase (`KanbanCard.tsx`); donor is kebab (`kanban-card.tsx`).
- Layer placement per `docs/BOUNDARIES.md` L0–L4: `primitives/` | `layout/` | `composites/` | `shells/` | `domain/`.
- Colocated `<Name>.test.tsx`. Export from `src/index.ts` (alphabetical within its section).

## G2 Tokens only
- ZERO raw hex/rgb/hsl literals. Map every donor color to a token utility or `var()`.
  - Allowed exception: `var(--token, #fallback)` fallback form, and inline-SVG string contexts where CSS vars cannot resolve — each such case needs a `// token-exempt: <reason>` comment on the line.
- No magic px for spacing/radius/shadow — Tailwind utilities backed by `@fams/tokens`.
- If a donor color has no token equivalent: STOP, add it to the token-gap report, do NOT invent a value.

## G3 RTL
- Logical properties only: `ms-`/`me-`/`ps-`/`pe-`/`start-`/`end-`/`text-start`. Never `ml-`/`mr-`/`left-`/`right-`/`text-left`/`text-right`.
- Directional icons get `rtl:-scale-x-100` where they imply direction.
- At least one test renders under `dir="rtl"` if the component has horizontal layout logic.

## G4 TypeScript
- Strict; no `any` (lint enforces `no-explicit-any: error`). Donor `<T = any>` generics become `<T>`.
- Exported prop interfaces named `<Name>Props`; JSDoc on every public prop.

## G5 API conventions
- Booleans: `loading` / `disabled` (native) per `CLAUDE.md`; sizes `sm|md|lg`; variant via CVA.
- Stateful behavior controllable: controlled (`value`/`onChange`) AND uncontrolled (`defaultValue`) where donor had internal-only `useState` (e.g. donor DataTable sort — do NOT regress our controlled sort).
- No business vocabulary in props (rule 10): `options`/`columns`/`items` — never `vehicleType`/`binStatus`.
- Data in via props/callbacks only. Strip ALL donor `sim/` imports; no `fetch`, no stores inside components.

## G6 Size & decomposition
- ≤ ~300 lines per file. Donor files >300 lines are ported only per an APPROVED decomposition spec (one parent + named children with one-line responsibilities each + a showcase composition).

## G7 Accessibility
- Radix primitive underneath where one exists. `aria-*` preserved/added; keyboard path testable.
- Every component test includes an axe assertion: `expect(await axe(container)).toHaveNoViolations()`.

## G8 Definition of done (all green locally before commit)
1. `pnpm --filter @fams/ui-react typecheck`
2. `pnpm --filter @fams/ui-react lint`
3. `pnpm --filter @fams/ui-react test -- --run <Name>`
4. grep gates (run from `packages/ui-react`):
   - `grep -rnE '#[0-9a-fA-F]{3,8}' src/**/<Name>*.tsx` → only `token-exempt` lines
   - `grep -rnE '\b(ml-|mr-|pl-|pr-|left-|right-|text-left|text-right)' src/**/<Name>*.tsx` → zero hits
   - `grep -rn '\bany\b' src/**/<Name>*.tsx` → zero hits outside comments
5. Demo section added to `apps/showcase` (registered in its nav) showing all variants/states.
6. Export added to `src/index.ts`.

## Roles
- **Analyzer** (read-only): emits the spec-sheet JSON per component; never writes code.
- **Migrator** (worktree): implements one component from its spec, TDD, runs all G8, commits. Stops (returns `{blocked}`) on token gaps or impossible gates — never improvises.
- **Verifier** (independent, adversarial): re-runs every G8 command itself, hunts violations, defaults to fail when uncertain. One retry loop, then `needs-human`.
