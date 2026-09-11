<!--
  Full authoring rules + rationale: root CLAUDE.md and CONTRIBUTING.md.
  This template is the checklist form of that contract, kept short —
  it does not duplicate the "why", only the "did you".
-->

## Summary

<!-- What changed and why, in a sentence or two. Link a ticket if there is one. -->

## Package(s) touched

<!-- Check all that apply. -->

- [ ] `@fams/tokens`
- [ ] `@fams/ui-kit`
- [ ] `@fams/skeleton-kit`
- [ ] `@fams/demo-kit`
- [ ] `@fams/v5-templates`
- [ ] `@fams/v5-composer`
- [ ] `@fams/v5-kit`
- [ ] `workshop/showcase`
- [ ] `workshop/skeleton-example`
- [ ] Root tooling / CI / scripts (`scripts/`, `.github/`, `turbo.json`, …)
- [ ] Docs only (`docs/`, `CLAUDE.md`, `README.md`, …)

## Definition of done

Tick only what applies — a docs-only or tooling-only PR won't hit the component rows.

- [ ] **Tokens-only.** No hardcoded hex/px/font in component source (root rule 2); `pnpm lint:tokens` passes.
- [ ] **Tests.** Vitest (render + behavior + key states) colocated with the component/change; `pnpm --filter <package> test` is green.
- [ ] **axe fixture.** New/changed interactive component has a fixture in `src/a11y.axe.test.tsx` (overlays rendered open) and it passes.
- [ ] **RTL-safe.** Logical properties only (`ms-`/`me-`/`ps-`/`pe-`, `text-start`) — never `ml-`/`mr-`/`text-left`.
- [ ] **Registry entry.** New/changed component is registered in a family in `workshop/showcase/src/registry.tsx` (never a flat entry) and exported from the package's `src/index.ts`; `pnpm build:registry` has been re-run and the diff to `registry.json`/`packages/*/llms.txt` is committed.
- [ ] **Demo.** Standard template (`DocPage` → `Playground`/`Preview` → `Gallery` → `PropsTable` → `Guidelines` → `Accessibility`) or the state-agnostic equivalent for non-visual changes.
- [ ] **Changeset.** `pnpm changeset` run and committed for any `@fams/tokens` / `@fams/ui-kit` / `@fams/v5-templates` change.
- [ ] N/A — this PR doesn't touch component code (tooling/docs/CI only).

## Screenshots / visual diff

<!--
  Required for any visual change. Before/after screenshots, or a
  `pnpm --filter @fams/showcase test:visual` diff.
  Delete this section if there is no visual change.
-->

## Gate status

<!-- Paste local results, or confirm CI is green and link the run. -->

```
pnpm typecheck   →
pnpm lint        →
pnpm test        →
pnpm build       →
```

- [ ] CI green on this PR (`.github/workflows/ci.yml`)
- [ ] Local-only gates run where relevant: `pnpm --filter @fams/showcase e2e` (route smoke) / `test:visual` (visual regression)
