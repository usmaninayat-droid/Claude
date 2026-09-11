# Adoption from `mshaheer-des/v5-design-system-ai`

> Historical working document from the initial port project (June–July 2026). Kept for provenance — not part of the living documentation.

Analysis date: 2026-06-30. Their repo is ~90% the same architecture we scaffolded (Tailwind v4 + `@theme inline` + shadcn/Radix/CVA) — it **validates** our approach and is a **values + patterns + knowledge donor, not a dependency**. We feed THEIR Figma-verified token values into OUR Style Dictionary pipeline; we regenerate components via our own shadcn (React) + shadcn-vue (Vue).

## ADOPT (lift directly)
- **Token VALUES** (Figma-sourced, in their `src/tokens/figma-tokens.ts` + `theme.css`): brand ramp 50–900 (primary `#0072D6`), 16 accent families, gray ramp, status (error/warning/success/info 50–900), surfaces/semantic roles, overlays, sidebar tokens, **chart palette** (5 categorical + 10-step blue ramp + heatmap), **type scale** (H1–H6, Body XL–XS, Caption: size/line/weight), **radius** (2/4/6/8, default 6), **6-step elevation/shadow ladder**, **icon sizes** (7 steps). → transcribe into our `packages/tokens/tokens/core.tokens.json` (DTCG).
- **Tenant brand values + logos**: Tadweer (green `#22C882` + 5-stop gradient sidebar), EAD-RMS (navy `#004B87` + orange), FAMS-v5 (default). Logos in their `public/logos/` (default/white/icon variants).
- **`@theme inline` bridge pattern** — confirms our Style Dictionary `@theme` output shape; use their `theme.css` as the reference template.
- **ADRs + pattern ledger** (`docs/adr/*`, `docs/learnings/04-pattern-ledger.md`) — captured rationale; read into our DS docs.

## ADAPT (reshape onto our architecture)
- **Tenant override model**: their per-tenant `*.theme.css` (small var subset) + `BrandConfig { name, logo: node, theme }` applied inline-on-shell-root → reshape into our DTCG `tokens/<tenant>.tokens.json` → Style Dictionary → `[data-tenant]` blocks. Keep the gradient-sidebar + logo-as-node ideas. **Add IWMP + MM tenants** (they only have FAMS/Tadweer/EAD).
- **Component variant taxonomies**: their Button (6 variants, asChild, loading), Badge (status via `color-mix`, `color` override), DataTable (generic, sortable/group/select/sticky), side-nav (active = white pill) → port the *design decisions* onto our shadcn (React) + shadcn-vue (Vue) primitives. Don't fork their package.

## SKIP
- **Gilroy font binaries** (`Font/*.otf`) — **commercial/proprietary**, no license. Keep the `--font-sans` token but default to an OSS face (Inter) unless a Gilroy license is confirmed.
- **Config-driven runtime + sim + recipes + schemas** (`src/runtime`, `src/sim`) — a product-composition layer, out of scope for the design system. Revisit separately if we want a low-code layer.
- **Hand-maintained CSS-var token build** — we keep Style Dictionary v5 as the source of truth.

## Gaps in their system (author fresh in ours)
- **No spacing scale**, **no breakpoint tokens** — add to `core.tokens.json`.

## Open license flags (decide before shipping)
1. **Gilroy font** — proprietary. Decision needed: license it, or default to Inter/OSS face? (Default: Inter.)
2. **Icon set** — 1,231 Untitled-UI-style generated icons. Verify the Untitled UI icon license before adopting; **Lucide (MIT, ISC) is the safe fallback** + migrate v1's IcoMoon glyphs into our owned `fams` IconifyJSON set.

## Clone location (read-only, for value extraction)
`…/scratchpad/shaheer-ds`
