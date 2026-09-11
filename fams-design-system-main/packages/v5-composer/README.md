# @fams/v5-composer

The v5 **low-code composer** — the brain of the metadata-driven v5 platform. It
reads **blueprints** (a tenant's module configuration) and composes **modules**
from templates + config.

Ported from Shaheer's `src/runtime/` + the runtime's own sim-engine contract,
reorganized and adapted for the monorepo (phase 2 §1).

## What's in here

| Area | Files | Notes |
| --- | --- | --- |
| Core data shapes | `src/types.ts` | EAV `EntityConfig`/`EntityRecord`, `PipelineRules`, `UserContext`. React-free. Merged with v5's real entityconfig facts (field-type set, `col` slots, column families, `refModule` domain). |
| Rules evaluator | `src/rules.ts` | Safe JSONLogic-lite interpreter (no `eval`): `allowedTransitions`, `isTaskVisible`, `resolvePermissions`. |
| Data store | `src/store.ts` | `InMemoryDataStore` — the runtime's EAV store. Persistence is **injectable and optional**; never touches `window.localStorage`. |
| Composition | `src/composition.ts` | `createAppRuntime(blueprint)` → per-module `ModuleHandle` (list/get/create/transitions/move/update) through the rule engine. |
| Config → view-model | `src/config-render.ts` | `deriveColumns/deriveCard/deriveFilters/deriveDetail` + `buildEntityModuleData`/`buildPipelineModuleData`. |
| Blueprint loader | `src/blueprint-loader.ts` | `instantiateBlueprint(bundle, opts)` → `{ blueprint, store, runtime }`. In-memory by default. |
| Module-type registry | `src/module-registry.ts` | Non-React `{ type → { defaultViews, tabKind, templateRefs } }` + `registerModuleType()`. |
| Authoring contract | `src/blueprint-schema.ts` + `schemas/*.json` | TS types (stable `id` required on every node) matching the draft-2020-12 JSON Schemas. |
| Validator | `src/validate.ts` | `validateBlueprint()` — dependency-free structural validator, precise error paths, enforces the stable-ID rule + reference integrity. |
| Composer entry | `src/composer.tsx` | `<ComposedModule>` / `composeModule()` — discriminated-union XOR props (low-code `{ blueprint, data }` XOR bespoke `{ children }`), renders via an injected renderer registry with a marked placeholder fallback. React allowed here. |
| FieldRegistry + SchemaForm | `src/fields/` | The unification of Shaheer's four field-type vocabularies (phase 2 §2). `compileFieldSet()` → cached Zod v4 schema + layout plan + descriptors; `FieldRegistry` maps every `FieldType` → `{ read, edit, cell }` (all ui-kit, no Radix); `SchemaForm` / `useSchemaForm` (react-hook-form + `zodResolver`) render from that; `getCellEditor()` feeds inline editing (ListView, task 2.4). |

## Vocabulary

Shaheer's user-facing "recipe" is renamed **blueprint** (locked): a blueprint is
what the composer reads. `Recipe → Blueprint`, `RecipeBundle → BlueprintBundle`,
`instantiateRecipe → instantiateBlueprint`, `recipe-loader → blueprint-loader`.

## Stable-ID convention

Every blueprint node carries a required, stable `id` (typed ops key on it). For
entity fields the `col` stays the storage slot; `id` is the identity. Defaults:
`field → fld_<col>`, `status → sts_<key>`, `filter → flt_<col>`,
`section → sec_<slug>`, `tab → tab_<key>`, `module → <module id>`.

## Persistence

`instantiateBlueprint`/`InMemoryDataStore` take an OPTIONAL `persistence`
adapter. Absent → pure in-memory (never browser storage). Phase 3's demo-kit
supplies persistent adapters behind the same `Persistence` interface.

## Field-set compiler cache

`compileFieldSet(moduleConfig | { fields }, opts)` compiles ONCE and caches by
`<code>@<version>` (perf rule 4). The module config carries an OPTIONAL
`version` (added to the entity/pipeline schemas); when absent, the key falls
back to a content hash of the field defs — so bump `version` (or change the
fields, under the hash fallback) to invalidate. `getCompileCacheStats()` /
`clearCompileCache()` are exported for tests. The cache is bypassed (never
stored) when `opts.flat`/`repeating`/`units` are set, since those change the
output without changing the definition identity.

## Form values ↔ record shape

`SchemaForm` keeps every multi-valued field (`MultiSelect`, `MultiReference`,
`tags`) as an array while the user is editing — react-hook-form/`useFieldArray`
need arrays to key rows. On submit, `mapSchemaFormOut` rewrites that in-form
shape into what `InMemoryDataStore` actually stores: a `MultiReference`
column's array of ids becomes a CSV string (`ids.join(',')`, via the store's
exported `joinRefCsv` — the same join `writeRefs` uses, so there is one
convention, not two). `MultiSelect` and `tags` are not reference-backed and
stay arrays end-to-end (`EntityRecord.tags` is `string[]`, not CSV). This is
what makes `store.create(code, schemaFormValues)` safe to call directly on a
`SchemaForm` submit payload with no manual reshaping.

## Golden example

`blueprints/crm/` is the primary fixture — the CRM app upgraded to the blueprint
schema (stable IDs, `$schema` refs, v5 field types). It passes `validateBlueprint`.

## Tier

v5 tier: may import the core tier (tokens/ui-kit/skeleton-kit types); the core
tier never imports this (decision #13, lint-enforced). Templates + data adapters
are injected at the app level.
