# @fams/v5-templates — v5-family product patterns (tier 2)

The **opt-in pattern layer** for products in the v5 family. It composes `@fams/ui-kit` into the v5-signature shapes — the multi-tab pinned profile drawer, the v5 side-sheet behavior, asset/task detail scaffolds — so the **core stays strictly product-agnostic** and new tools are never forced into v5's patterns.

Industry precedent: this is the "Carbon model" — IBM ships `@carbon/react` (product-agnostic core) and `@carbon/ibm-products` (the product-family patterns) as separate packages. Same idea here.

## The three tiers

| Tier | Package | Who consumes it |
| --- | --- | --- |
| Core | `@fams/tokens` + `@fams/ui-kit` | **Every** FAMS product — new tools use ONLY this |
| Patterns | `@fams/v5-templates` (this) | v5-family products opt in; others never need it |
| App | product repos | manifests, data wiring, feature screens |

## Membership — the 4-question cascade

1. Does it fetch, store, or route? → **application**
2. Would a second FAMS *product family* use it unchanged? → **core (`@fams/ui-kit`)**
3. Would a second *v5-family* module/product use it unchanged? → **here**
4. Otherwise → **app code** (rule of three may promote it later)

## Laws

- **Dependency direction is absolute:** `v5-templates → ui-kit → tokens`. The core never imports this package and must build without it.
- **Compose, never fork.** Patterns assemble core components. Needing to fork a core component means the core has an API gap — fix it in core.
- **Business vocabulary allowed here, banned in core.** `AssetProfileShell` is a fine name in this package.
- **Same quality gates as core:** tokens-only styling, RTL logical properties, axe test per component, `docs/API-GRAMMAR.md` prop conventions.
- **Promotion/demotion:** adopted by a second product family → generalize + promote to core. Turns out single-module → demote to app code.

## MapPanel — a second, heavy entry point (phase 2 §3)

`MapPanel` (the Leaflet→MapLibre GL port, `src/map/`) is not exported from this package's main barrel. It has its **own package entry**:

```ts
import { MapPanel } from '@fams/v5-templates/map'
```

**Why a separate entry, not just a lazy `import()` inside the main barrel:** `maplibre-gl` + `react-map-gl` + `deck.gl` + `terra-draw` + `supercluster` are real, substantial dependencies (a WebGL engine, a GPU layer framework, a geometry-draw library). Most consumers of this package never render a map and must not pay for any of it — but `tsup.config.ts` builds this package with `splitting: false` and a single entry, and under that configuration esbuild inlines a dynamically-`import()`ed module's code into the SAME output file (the `import()` stays lazy at *execution* time, but the *bytes* ship either way). A real second build entry is the only one of the two mechanisms that's actually verifiable at the output level.

`tsup.config.ts` lists two entries — `index` (`src/index.ts`) and `map/index` (`src/map/index.ts`) — each with its own reachable-module graph, so `dist/index.js` never resolves the map stack and `dist/map/index.js` carries it (externalized, same as `react`, so the consumer's bundler resolves it from `node_modules` rather than tsup inlining it). Verify: `pnpm --filter @fams/v5-templates build`, then `grep -c "maplibre\|deck.gl\|terra-draw" dist/index.js` (0) vs `dist/map/index.js` (non-zero).

See `src/map/index.ts` and `src/map/MapPanel.tsx`'s file-header comments for the full reasoning, and `docs/LIBRARIES.md` for the map stack's license verdicts (`maplibre-gl`, `react-map-gl`, `deck.gl`, `@deck.gl/mapbox`, `terra-draw`, `terra-draw-maplibre-gl-adapter`, `supercluster`).

## Status

Scaffolded 2026-07-06; **intentionally empty**. First candidates (multi-tab ProfileDrawer, v5 side-sheet pattern, saved-view module shell assembly — see the v5 functional analysis) enter after the design-team review adjudicates each against the cascade.
