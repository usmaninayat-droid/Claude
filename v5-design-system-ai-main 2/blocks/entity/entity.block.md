# Entity block — register (list + detail + create)

**Type:** `entity` · **Form:** JSON module config (`entity.block.json`) + seed (`entity.seed.json`),
validated by `schemas/EntityModuleConfig.schema.json`, run on the sim engine via a recipe.

## What it is
The reusable **register** — a list of records of one kind, each with a detail view and a creation
side sheet. Use it for any "list of things": inspections, contracts, assets, drivers, zones, vendors.

## Anatomy
- **List view** — DataTable from `listcolumns` (sortable + filterable; "-" for empty cells).
- **Detail** — `EntityDetail`: identity rail (hero image + status chip + **category badge** + **tag
  pills**) + an Overview tab of declarative widgets (`profile.overview`: gauge/donut/bar) + a Details
  grid (`profile.details`). Add collapsible `sections` as needed.
- **Create** — side-sheet form (declare `create.fields` in the recipe module entry).

## Adapt to a use case (the knobs)
1. `code` (`blocks/records` → `iims/inspections`), `name`, `uidPrefix` (`REC` → `INS`).
2. `systemcolumns` — rename/add fields; pick types (`SmallText`, `SingleSelect` + `listValues`,
   `SingleReference`+`refModule`, etc.). Keep `title` + `status`.
3. `uiConfig.statusList` — the status set + colors (entity statuses stay simple, e.g. Active/Inactive;
   add one domain state only if needed, e.g. inspections `Scheduled/Passed/Failed`).
4. `profile.details` / `listcolumns` / `filters` / `search` — which fields show where.
5. `profile.overview` — the detail dashboard widgets (or remove).
6. `profile.image` / `profile.category` / `profile.tags` — opt-in identity-rail extras, each `{ "col": "<field>" }`
   (category = a chip from one field; tags = pills from a string or string[] field). Omit → nothing renders.
7. Swap `entity.seed.json` for real-shaped dummy rows (include `id` + `uniqueidentifier`).

## Compose
Add to the app recipe:
```json
{ "id": "inspections", "type": "entity", "label": "Inspections", "icon": "ClipboardCheck",
  "views": ["list"], "dataSource": { "code": "iims/inspections" }, "config": "./inspections.module.json" }
```
…and register the seed under `seeds`. Reference: `recipes/crm/companies.module.json`.
