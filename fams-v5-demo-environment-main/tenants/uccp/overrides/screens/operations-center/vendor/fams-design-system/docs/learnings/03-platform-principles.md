# Platform Principles

Cross-cutting design rules. Apply to every module and every component. Ported from `knowledge-base/product-context/02-platform-principles.md`.

---

## P1 — Base modules are configuration UX, not fixed UI

The Vehicle Management "screen" isn't a screen — it's an *Entity* module instance with a config that renders fields, actions, filters, and permissions.

**Implication:** components must be slot-rich (headers, toolbars, detail panels, bulk-action bars) accepting config rather than hardcoded content. The kit's library wins or loses on whether the component slots are deep enough to render every production variant from JSON.

---

## P2 — View Surface Is Module-Declared

Modules declare which of {Kanban, List, Map, Hybrid, Calendar, Grouped List} they expose. Not every module needs all view types.

**Implications:**
- Engineering doesn't scaffold unused tabs.
- Users don't see empty tabs.
- The top-nav tab row always reflects real affordances.
- View governance lives at module-definition time, not per-tenant.

The schemas reflect this — `EntityModuleConfig.views` and `PipelineModuleConfig.views` are arrays the module authors populate.

---

## P3 — Shared Spatial Reference Contract

Zones, POIs, and any future spatial entity remain **separate modules** but implement a **shared contract**:

- Stable IDs (don't change on shape edits)
- Tenant-scoped, tenant-global (not app-scoped)
- RBAC flows through one user-scope model
- Cross-module consumption: Events, Reports, Alerts, Live Monitoring reference them through one interface
- Tag-derived visual identity (see Tag Model below)
- Bulk-import UX reuses the Review Imported Items modal pattern (Pattern #06)

Keeps the two modules independent products while letting the rest of the platform stay agnostic.

---

## P4 — Entities are tenant-configured, not platform-hardcoded

The Asset / Device / Workforce / Product / Service distinction is **not hardcoded**. Each tenant defines:

- Which entity types exist (and what they're called)
- Which fields each type has (and which appear in identity card vs Details tab)
- Which tabs each type exposes (Overview, Details, Trips, Events, Job Orders, …)
- Which widgets fill the Overview tab
- Which other entity types this one can link to

**Implication:** the Entity module is the single highest-leverage surface in the platform. Every other module (Live Monitoring, Reports, Events, Pipelines) consumes Entities.

The chassis is universal:
- List view with configurable columns (Pattern #16)
- Side-sheet detail with identity card + tabbed widget area (Pattern #17)
- Multi-step creation drawer with linked-entity inline-add (Pattern #18)
- Saved-view system (per P2)
- Tag, RBAC, audit trail

Full spec: `knowledge-base/product-context/12-base-module-entities.md`.

---

## P5 — Pipelines are tenant-configured workflow primitives

The Lead / Incident / Inspection / Application / Reservation / Invoice / Handover distinction is **not hardcoded**. Each tenant configures pipeline TYPES as separate modules, and within each:

- Stages (name, color, order, optional AI prefix, terminal flag, aggregate metric)
- Stage-transition graph
- Identity-grid field list
- Accordion sections (Lead Info, KPI, Asset Details, Checklist, Inspection Report, …)
- Right-rail tabs (Activity / Timeline / Messaging / Penalties / Related / Reported Incidents)
- Linked entity TYPES
- Linked pipeline TYPES
- Declared views (Kanban / List / Hybrid / Calendar / Grouped List)
- Kanban Card template
- Automation rules

**Implication:** Pipelines are the second-highest-leverage surface after Entities. A CRM, an IWMP, a Fleet — each ships as a bundle of Entity-modules + Pipeline-modules sharing the same chassis.

Full spec: `knowledge-base/product-context/14-base-module-pipelines.md`.

---

## P6 — (reserved)

When the platform surfaces a new cross-cutting principle (e.g., realtime contract, AI assistant contract), it gets the next P-number here.

---

## Cross-cutting patterns (apply across all modules)

### Tag Model

Tag = `(name, color, icon, ?description)`. Platform-wide grouping primitive.

- Icon is a property of the Tag definition, not of the tagged entity.
- When a POI is tagged "Bus Stop," it inherits that tag's icon automatically.
- If a POI has multiple tags, the primary tag (first or pinned) supplies the icon.
- Every module that uses tags gets iconography for free.
- Filter chips, list cells, cluster labels, and map pins draw from the same source of truth.

Governance: hybrid model — admin curates "official" tags with icons/colors; users add personal text-only tags to their own content.

### Destructive Actions Pattern

For any irreversible / high-impact action (Immobilize, Suspend driver, Cancel trip, Force logout, Revoke access, Delete tenant):

1. **Trigger** — red button (NOT toggle) positioned in the detail popup/page. Color-coded by severity (red = irreversible, amber = reversible).
2. **Confirmation flow** — modal with:
   - Summary of consequences + current asset context
   - Reason selector (dropdown of platform-defined categories) + optional free-text
   - Intent-proof step — `type-to-confirm` default (user types entity ID); MFA option for admin tenants
   - Pre-flight safety checks surfaced inline
3. **State machine impact** — entity transitions to a distinctly-visualized state (lock glyph, color-coded ring, status-strip accent). Use a universal "restricted state" glyph family.
4. **Audit trail** — structured record (actor, target, action, reason, timestamp, device-state-at-time, notifications-sent, reversed-at) surfaced in Critical Events tab + dedicated Audit tab.
5. **Permissioning** — role-gated at UI layer; documented as first-class RBAC atom.
6. **Notification** — modal explicitly states who will be notified by what channel.
7. **Reversal** — symmetric flow, same rigor, same audit trail.
8. **Out-of-band states** — device-offline queuing ("Command queues and executes when device reconnects"), rate-limiting, error recovery as first-class paths.

Reference: Pattern #04.

### Filter & View State Semantics

When a user switches view (List → Map → Hybrid):

- **Persist:** filters + search
- **Local to the view:** sort, density, column choices

Make this explicit per module spec — engineers will otherwise improvise.

### Modified-View Pattern

When a user applies filters on a saved view without saving:

- Persist as unsaved modification in local state.
- Surface a "Modified — Save?" strip at top of canvas.
- Options: `Save / Save as new view / Revert`.

Prevents the common failure mode: user thinks they saved and didn't. Reference: Pattern #09.

---

## What "principles" means in practice

You don't get to override these per build. If a recipe or a prompt would violate one, that's a kit-level conversation — open a ledger entry, propose, get sign-off. The principles are the substrate that makes "build a CRM" and "build a Workshop Maintenance app" consistent with each other.
