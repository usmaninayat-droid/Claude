# recipes/ — compose a product (loads only when working here)
A recipe = brand + modules (each names a type + a dataSource code). Validate against `../schemas/Recipe.schema.json`.
**Per-type golden recipe + when-to-use:** `../docs/MODULE-TYPE-COOKBOOK.md` — read it before adding any module.
JSON-authored types (entity/pipeline): copy `crm/crm.recipe.json` + `crm/deals.module.json`. Module config = systemcolumns + uiConfig + listcolumns (drives rendering — no React).
Config TSX types (dashboard/live-monitoring/reports/calendar/forms/settings/inbox) are authored as `ModuleConfig` objects in the product (see the cookbook + `Code/fleet-ops`), not JSON here.
Seed dummy data per entity code (`*.seed.json`). Theming = `brand.theme` token overrides only (FAMS default = none).
