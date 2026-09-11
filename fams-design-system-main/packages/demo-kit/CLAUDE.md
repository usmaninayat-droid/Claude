# `@fams/demo-kit` — CLAUDE.md

> Pointers + deltas only. Constitution: root `CLAUDE.md`. Full contract: `README.md`.

`@fams/demo-kit` is **generic, product-agnostic demo machinery** for running a FAMS React app with no backend: a relational in-browser store (`RelationalStore`) with bidirectional referential integrity, injectable session `Persistence`, a seed loader that's loud on dangling refs, a React-free persona auth shim, and an MSW mock-API generator (`buildHandlers`/`setupDemoWorker`). The v5-specific wiring of these generic contracts onto `@fams/v5-kit`'s injectable seams lives in the demo app, never here.

## Tier + boundary rules
- **Core tier, product-agnostic.** Contains NO v5 vocabulary and imports NO `@fams/v5-*` package — `no-restricted-imports` boundary-linted (decision #13), fails the build if violated.
- Three entry points, each for a reason — don't collapse them:
  - `.` (`src/index.ts`) — the store/persistence/seeds/persona/handlers contracts. **React-free.**
  - `./react` (`src/react.ts`) — `usePersona`, the only React import in the package; kept separate so the core entry pays nothing for React.
  - `./console` (`src/console/index.ts`) — `DemoConsole` (decision #18), a real React dependency at this subpath only.

## Adding to this package
1. New store/seed/persona/handler capability → core entry (`src/index.ts`), stays React-free and v5-vocabulary-free.
2. New React-dependent surface → its own subpath barrel (follow the `./console` pattern: separate tsup entry, exported types alongside), never bolted onto the core barrel.
3. Seed/ref validation errors must stay **loud** — `DanglingSeedRefError`, not a silent skip (this is the package's core promise).
4. Axe fixtures for anything visual go in `console/DemoConsole.axe.test.tsx` — the core entry has no UI to test for a11y.

## Tests to run
- `pnpm --filter @fams/demo-kit test` · `typecheck` · `lint`.
- One handlers test opts into `// @vitest-environment node` (real-fetch-over-MSW) — follow that per-file pattern rather than changing the package default (jsdom).
- Console a11y: `DemoConsole.axe.test.tsx`.

## Definition of done
A change here is done when: it stays product-agnostic (no v5 vocabulary, no `@fams/v5-*` import), the right entry point is used (core/`./react`/`./console`), dangling refs still fail loud, and tests/typecheck/lint are green.

## Links
- `packages/demo-kit/README.md` (store/persistence/seed/persona/handlers detail) · root `CLAUDE.md` · `docs/knowledge-base/decisions.md` #13, #18, #19, #20.
