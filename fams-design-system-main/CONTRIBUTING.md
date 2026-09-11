# Contributing

## Prerequisites

- Node 20+
- pnpm 9+ (`corepack enable`)

## Getting started

```bash
pnpm install
pnpm --filter @fams/tokens build   # generate dist/tokens.css + dist/theme.css first
pnpm build                         # build all packages (Turborepo)

# live preview + docs
pnpm --filter @fams/showcase dev   # http://localhost:6100
```

## Authoring checklist (before opening a PR)

A component isn't done until all of these hold — the full rationale for each is in `CLAUDE.md`:

- [ ] **Tokens only.** No hardcoded hex/px/font values — use Tailwind utilities backed by `@fams/tokens`. A new visual value is a new token, not an inline value.
- [ ] **Built on Radix** (React) — accessibility is built in, not bolted on. Every interactive element passes axe.
- [ ] **RTL-safe.** Logical properties only (`ms-`/`me-`/`ps-`/`pe-`, `text-start`) — never `ml-`/`mr-`/`text-left`.
- [ ] **Prop conventions.** State: native `disabled`, `loading`, `hasError`. Sizes: `size="sm" | "md" | "lg"`, never numeric. No business vocabulary in shared props (`options`, not `vehicleType`).
- [ ] **State-agnostic.** Data + callbacks in via props — no data fetching, no global store, no routing inside a component.
- [ ] **No per-tenant forks.** One component; tenants differ only via `data-tenant` + token overrides.
- [ ] **Test** — Vitest + Testing Library, alongside the component.
- [ ] **axe fixture** — add the component to the sweep in `packages/ui-kit/src/a11y.axe.test.tsx` (render overlays open); it must pass.
- [ ] **Demo on the standard template** — `DocPage` → `Playground`/`Preview` → `Gallery` per dimension → `PropsTable` (from the TS interface) → `Guidelines` → `Accessibility`. Mirror `demos/BadgeDemo.tsx` or `pages/ButtonPage.tsx`. No per-demo `dir="rtl"` block (global switcher proves RTL).
- [ ] **Registered in a family** in `workshop/showcase/src/registry.tsx` — not a flat entry; e2e route smoke picks it up automatically.
- [ ] **Exported** from `src/index.ts`.

## Gate commands (must be green before requesting review)

```bash
pnpm --filter @fams/ui-kit typecheck
pnpm --filter @fams/ui-kit test
pnpm --filter @fams/ui-kit lint       # includes jsx-a11y
pnpm --filter @fams/showcase typecheck
pnpm --filter @fams/showcase build
pnpm --filter @fams/showcase e2e  # Playwright route smoke (if you touched the showcase)
```

For a repo-wide change, `pnpm typecheck` / `pnpm test` / `pnpm build` from root.

- `pnpm --filter <pkg> test` can hit a stale sibling `dist/` (consumers resolve packages via their built `exports`, not source) — run root `pnpm build` first, or use root `pnpm test` (Turborepo-orchestrated, `dependsOn: ["^build"]`) for guaranteed freshness.

## PR expectations

- Typecheck, test, lint, and build all green — CI enforces this, but check locally first.
- One logical change per PR; commit messages follow `<type>(<scope>)?: <message>` (e.g. `feat(showcase):`, `fix(ui-kit):`) — see `CLAUDE.md` § Commit & branch conventions.
- New/changed component → update its `@usage-v5` JSDoc block if the v5 pattern it replaces is known (feeds `docs/USAGE-INDEX.md`).
- Any change to `@fams/tokens`, `@fams/ui-kit`, or `@fams/v5-templates` → run `pnpm changeset` and commit the generated changeset file with the PR.

## Where to go next

- **Full agent-enforced ruleset** (the 11 hard rules, layer model, definition of done) → `CLAUDE.md`.
- **Doc index / reading order** → `docs/README.md`.
