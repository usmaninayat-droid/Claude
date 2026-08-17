# ADR-003 — Modules as JSON configs (not React components)

**Status:** Accepted
**Date:** 2026-06-08

## Context

In a typical React design system, each module (Leads, Vehicles, Reports) is
a React component the user writes:

```tsx
function LeadsModule() {
  return (
    <KanbanBoard columns={…}>
      {leads.map(lead => <KanbanCard {…} />)}
    </KanbanBoard>
  );
}
```

This puts the chrome assembly in user space. Per-tenant variations require
either prop drilling or fork-and-edit.

FAMS V5's white-label model needs the OPPOSITE: identical chrome across
tenants, varying only data + branding. We need a way for a tenant to author
"Leads with these stages + this kanban card layout" without writing React.

## Decision

**Modules are declared as JSON config files.** The kit ships 7 React
CHASSIS components — one per module kind (entity, pipeline, reports, inbox,
dashboards, live-monitoring, settings). Each chassis is a polymorphic
interpreter of its config.

```json
{
  "kind": "pipeline",
  "displayName": { "singular": "Lead", "plural": "Leads" },
  "stages": [
    { "id": "new", "label": "New", "color": "#F79009" },
    …
  ],
  "kanbanCardConfig": {
    "idField": "id",
    "titleField": "title",
    "metadataFields": [{ "field": "company", "icon": "Building" }],
    "topBadges": [{ "kind": "priority", "field": "priority" }],
    "footerLeft": { "kind": "avatar", "field": "assignedTo" },
    "footerRight": { "kind": "date", "field": "dueDate" }
  }
}
```

Users author this JSON. The `PipelineModule` chassis interprets it.

## Consequences

### Positive
- Multi-tenant variations are JSON diffs, not code forks
- Schema validation catches mistakes before they hit production
- AI agents (Claude Code) can generate + edit configs more reliably than
  React components
- Configs can live OUTSIDE the project (in `use-cases/<slug>/`), so multiple
  tenants can share a config when behavior is identical
- A future GUI configurator could read/write the same JSONs

### Negative
- Chassis components carry interpretive complexity (each chassis ~500-1000
  lines of "if config.X then render Y" logic)
- Adding novel behaviors requires schema evolution + chassis updates
- Escape hatch: when a tenant needs a truly unique behavior, they can pass
  a render override prop — but this re-introduces React-component-per-tenant
  shape. Use sparingly.
- Less discoverable in IDE — JSON doesn't give type hints by default
  (mitigated by JSON Schemas in `schemas/`)

### What chassis components do
1. Accept `config` (validated JSON) + `adapter` (data plumbing)
2. Render primitives based on config branches
3. NEVER own state — state lives in the adapter

### What chassis components don't do
- Don't render fixed JSX outside the config
- Don't reach into other modules' state
- Don't make assumptions about which tenant they're running in

## Alternatives considered

**Pure React modules with prop-drilling.** Rejected: doesn't scale to N
tenants × M modules.

**Headless module library + per-tenant React wrappers.** Rejected: same
shape as above; doesn't reduce the per-tenant authoring burden.

**Visual builder (Webflow-style GUI).** Deferred. The JSON config is the
foundation; a GUI can come later, reading/writing the same JSON.

## See also

- `docs/04-chassis.md` — the 7 chassis + their JSON shapes
- `schemas/` — JSON Schemas per kind
- `use-cases/crm/` — example configs (working CRM)
