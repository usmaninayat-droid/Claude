# `@fams/v5-composer` — CLAUDE.md

> Pointers + deltas only. Constitution: root `CLAUDE.md`. Full file table + vocabulary: `README.md`.

`@fams/v5-composer` is the **low-code composer**: it turns a per-tenant **blueprint** (Shaheer's "recipe", renamed and locked, README § vocabulary) + `EntityConfig`/`EntityRecord` data into a rendered module surface — `composeModule`/`ComposedModule` — via `v5-templates`' default renderer registry. This is what makes v5 low-code (decision #4): screens render from metadata at runtime, not per-tenant code forks.

## Tier + boundary rules
- **v5 tier.** MAY import the core tier (`@fams/tokens`/`@fams/ui-kit` types); the core tier NEVER imports this (decision #13, lint-enforced). Its `eslint.config.js` deliberately drops the core-tier `@fams/v5-*` ban that `@fams/ui-kit`'s base config carries — it IS the v5 tier — while keeping the decision #7 Radix ban.
- Business vocabulary (blueprints, entities, pipelines) is expected and correct here — this package's whole job is product-aware low-code plumbing.

## Key entry points
- `store.ts`/`rules.ts`/`composition.ts` — `InMemoryDataStore`, condition/permission/transition evaluation (`evalCondition`, `resolvePermissions`, `isTaskVisible`, `allowedTransitions`), `createAppRuntime`.
- `config-render.ts` — blueprint → view-config derivation: `deriveColumns`/`deriveCard`/`deriveFilters`/`deriveDetail`, `buildEntityModuleData`/`buildPipelineModuleData`.
- `blueprint-loader.ts`/`blueprint-schema.ts`/`validate.ts` — `instantiateBlueprint`, `toEntityConfig`, `validateBlueprint`, JSON Schemas in `schemas/*.json`.
- `module-registry.ts` — `getModuleType`/`registerModuleType`/`resolveModuleViews`.
- `composer.tsx` — `composeModule`/`ComposedModule`, the one call that renders any blueprint.
- `fields/` (secondary barrel `src/fields/index.ts`) — `compileFieldSet`, `SchemaForm`/`SchemaFormField`/`useSchemaForm`, the field-type compiler + registry.

## Adding a field type here
1. Add the type to the field compiler/registry in `fields/` (`compiler.ts`, `registry.tsx`) and its cell editor in `cell-editors.tsx` — never inline a one-off field type in a consuming app.
2. Wire rendering through `renderers.tsx`/`widgets.tsx`; keep the compiled field shape consistent with the existing `types.ts` contract.
3. Add a fixture to `fields/a11y.axe.test.tsx` if the field renders an interactive control.
4. Export from `fields/index.ts` (and from the main barrel if it needs to be reachable without importing `fields` directly).

## Adding/extending a blueprint contract
- Update `schemas/*.json` (JSON Schema) + `blueprint-schema.ts` types together; add a fixture under `blueprints/{crm,fleet}/`; extend `validate.ts` coverage.

## Tests to run
- `pnpm --filter @fams/v5-composer test` (`--passWithNoTests` while sparse) · `typecheck` · `lint`.
- `fields/a11y.axe.test.tsx` for any new interactive field.
- vitest.setup.ts stubs `ResizeObserver`/`scrollIntoView`/`matchMedia` (Radix Popper + cmdk) — reuse, don't re-stub per test.

## Definition of done
A blueprint/field/rule change is done when: it validates against the JSON Schema, has a test + (for fields) an axe fixture, and — if it changes rendered output — the `Composer` group's `gate-demo` in `workshop/showcase` still renders all three demo blueprints (CRM companies, CRM deals, fleet vehicles) without a visual difference beyond the intended one.

## Links
- `packages/v5-composer/README.md` (full file table, vocabulary) · root `CLAUDE.md` · `docs/knowledge-base/decisions.md` #4, #10, #12, #13.
