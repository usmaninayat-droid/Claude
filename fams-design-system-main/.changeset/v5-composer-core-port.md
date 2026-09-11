---
'@fams/v5-composer': minor
---

Add `@fams/v5-composer` — the v5 low-code composer (phase 2 §1). Ports Shaheer's
runtime core (composition, config→view-model bridge, blueprint loader) plus the
runtime's own sim-engine contract (types, safe rules evaluator, in-memory data
store) into a new v5-tier package. Renames the "recipe" vocabulary to
**blueprint**, makes persistence injectable with no browser default, ships the
blueprint JSON Schemas + a dependency-free `validateBlueprint` enforcing stable
IDs and reference integrity, a non-React module-type registry, and the
discriminated-union composer entry (`ComposedModule`). The CRM golden example is
ported to `blueprints/crm/` on the new schema.
