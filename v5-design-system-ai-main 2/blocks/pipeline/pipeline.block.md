# Pipeline block — workflow (board + detail + timeline + status rules)

**Type:** `pipeline` · **Form:** JSON config (`pipeline.block.json`) + rules (`pipeline.rules.json`)
+ seed (`pipeline.seed.json`), validated by `schemas/PipelineModuleConfig.schema.json`, run on the
sim engine (RBAC + **rule-enforced** stage moves) via a recipe.

## What it is
The reusable **staged workflow** — records that move through stages on a kanban board, each with a
rich detail sheet. Use it for incidents, deals, work orders, approvals, requests — anything with a lifecycle.

## Anatomy
- **Views** — kanban (rule-aware drag) + list (+ calendar/hybrid if the records carry dates/coords).
- **Kanban card** — `uiConfig.kanbanCard` (header/body/footer field placements; priority flag, stage progress, assignee, date).
- **Detail** — title + details grid + a **right panel** with tabs: **Timeline** (stage history) ·
  **Activity** (the comment/event feed — neutral circled icons, uppercase authors, trailing stage
  chips, your-vs-others bubbles) · **Linked** · **Files**.
- **Status changes** — driven by `pipeline.rules.json` (legal `transitions` + role-gated
  `transition_rules`). A target stage may declare a `transitionForm` to collect data before the move.

## Adapt to a use case (the knobs)
1. `code` (`blocks/items` → `iims/incidents`), `name`, `uidPrefix` (`ITM` → `INC`).
2. `uiConfig.statusList` **and** `pipeline.rules.json` `statuses`/`transitions` — the stage set must
   match in both (e.g. `reported → triaged → in-progress → resolved`). Set role gates in `transition_rules`.
3. `systemcolumns` — domain fields (severity, location, vendor…); keep `title` + `status`.
4. `kanbanCard` / `profile.details` / `listcolumns` — what shows on the card, detail, and list.
5. Right-panel tabs — keep Timeline+Activity; rename/drop others.
6. Swap `pipeline.seed.json` (include `id` + `uniqueidentifier`; `status` = a stage `key`).

## Compose
```json
{ "id": "incidents", "type": "pipeline", "label": "Incidents", "icon": "AlertTriangle",
  "views": ["kanban", "list"], "dataSource": { "code": "iims/incidents", "rulesRef": "incidents" },
  "config": "./incidents.module.json",
  "create": { "fields": [ { "id": "title", "label": "Incident", "type": "text", "required": true } ] } }
```
…register the seed under `seeds` and the rules under `rules`. Reference: `recipes/crm/deals.module.json` + `deals.rules.json`.
