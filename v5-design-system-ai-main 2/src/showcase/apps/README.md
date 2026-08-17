# Showcase apps — Reference Gallery (UI patterns, NOT the product template)

These six apps — `workshop`, `sales`, `ead-rms`, `cement`, `ducon`, `generator`
(+ shared `sample-data.ts`) — are the design system's **built-in showcase
demos**. They render the live AppShell preview (`/appshell.html`, Architecture
page) and exist to show *what a finished, on-brand FAMS app looks like*.

They are **hand-authored `AppConfig` TSX over static `sample-data.ts`** — the
pre-platform style. They are **reference material, not the way new products are
built.**

## Use them for (UI reference only)
- Which **components / widgets / charts** to use for a given surface.
- **Layout & density** patterns, view choices (kanban / list / hybrid / map / calendar).
- **Brand theming** — how a tenant re-skins via `brand.theme` token overrides.
- Module **mixes** per domain (what a workshop vs a CRM vs a regulator app contains).

## Do NOT
- ❌ Import these configs or `sample-data.ts` into a product.
- ❌ Copy their static data or their bespoke per-app render functions.
- ❌ Treat them as the build template.

## Build new products the platform way
- **Template:** `recipes/crm/` (a JSON recipe + module configs + its own seed data).
- **How:** a recipe (JSON) over the **sim engine** with its **own dummy data**,
  rendered by `src/runtime/config-render.ts` — config-driven, no per-product React.
- **Where:** products live in the **`Code` projects folder**, consuming this DS as
  a reference/dependency. Never write product apps inside this folder.

> In short: **reference the UI here; build the product as a recipe with its own data.**
> (Future option: port these six into recipes so the whole system is one
> config-driven model — not required for them to serve as references.)
