# ADR-005 — Codify production geometry verbatim (not abstract)

**Status:** Accepted
**Date:** 2026-06-08

## Context

When building primitives (SideNav, KanbanCard, etc.), there are two
philosophies:

1. **Abstract:** use design-token-driven sizes (e.g. `size-10`, `rounded-lg`,
   `text-base`) that depend on the token system; expect tokens to drive the
   visual result.
2. **Verbatim:** hardcode the exact production values (e.g. `size-7`,
   `rounded-[4px]`, `text-[16px] font-bold`) that match the live shipping
   apps.

The kit was initially built on the abstract philosophy. Discovery from
reading Truemax + Ducon production code showed deviations:

| Element | Abstract spec | Production reality |
|---|---|---|
| App rail item size | 40×40 | 28×28 |
| App rail item radius | `rounded-lg` (8px) | `rounded-[4px]` |
| App rail inactive bg | transparent | `rgba(255,255,255,0.4)` |
| Footer items | square | CIRCULAR (`rounded-full`) |
| Kanban card radius | `rounded-lg` (8px) | `rounded-[6px]` |
| Kanban card title | 14px medium | 16px BOLD 700 |
| KanbanCard avatar | initials (e.g. "JD") | single letter (e.g. "J") |

Each abstract value was "reasonable" by design-token standards but produced
output that didn't match the Figma source or the shipping apps. Users
correctly identified these as "doesn't look like FAMS."

## Decision

**Codify production geometry verbatim.** When Truemax / Ducon production
ships a specific px value or hex color, the kit MIRRORS it — even if it
violates an abstract scale.

This includes:
- 28×28 (`size-7`) on app rail items — not `size-10` even though that's the
  standard "icon button" size in our scale
- `rounded-[4px]` on app rail items — not `rounded-md` (which is also 4px
  but reads as abstract)
- `bg-[rgba(255,255,255,0.4)]` for inactive items — not `bg-white/40` (which
  computes the same but is harder to grep for)
- 24×24 SINGLE-LETTER avatar — not `<Avatar fallback={initials} />`

Where tokens DO exist for the production value, use the token. Where they
don't, use the literal (with a comment naming the source frame in Figma /
production file).

## Consequences

### Positive
- Output matches production verbatim — users don't say "doesn't look right"
- The kit can be diffed against production to verify alignment
- Future production changes are easy to track (one place to update per
  primitive)
- Reading the TSX, you can SEE the design — not infer it from token names

### Negative
- Looks "magic-number-y" to reviewers used to clean abstract scales
- Tokenizing later requires going back through every primitive
- New designers might create new primitives following the abstract pattern,
  causing inconsistency
- Mitigated by: per-primitive `.spec.md` files that document the source
  (Figma frame, production file, line number)

### What this is NOT
- NOT a blanket ban on tokens. Tokens drive colors + fonts + radii at the
  app level (gray ramps, primary, etc.).
- NOT "abstraction is bad." Abstraction is great for cross-cutting concerns
  like color ramps. It's NOT great for per-primitive geometry where the
  Figma source has specific px values.

### The escape hatch
If a primitive needs to vary per tenant (e.g. different button size in a
mobile breakpoint), prefer adding a `size` prop with named values
(`'sm' | 'md' | 'lg'`) rather than re-tokenizing the geometry.

## Alternatives considered

**Add tokens for every production value.** Rejected: would explode the
token surface (~500 tokens) and not add semantic value (a token called
`--app-rail-item-size` is just a verbose `28px`).

**Accept abstract values; fix per-project.** Rejected: defeats the purpose
of the kit (consistent output across tenants).

**Two parallel primitives — abstract + verbatim.** Rejected: doubles
maintenance.

## See also

- `knowledge-base/live-product-references/11-truemax-production-shell-and-kanban.md`
  — verbatim geometry capture
- `packages/ui/src/navigation/side-nav.spec.md` — production geometry
  encoded in spec
