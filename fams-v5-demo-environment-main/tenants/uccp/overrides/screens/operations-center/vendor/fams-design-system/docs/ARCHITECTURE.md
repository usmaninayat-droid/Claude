# V5 Design System — Master Plan (authoritative)

> **Supersedes** `REBUILD-ARCHITECTURE.md` and `VISION-AND-REPLAN.md`. This is
> the single plan we build to. "Design system" = **this folder**
> (`V5 Design System - Ai`). It is built **new, in React, with Claude Code**.

---

## 1. The vision (north star)

A **composition design system**: the design team, with Claude Code, can build
*any* product — new or existing modules — that **always feels like one single,
coherent product** you cannot design your way out of. Every composed app runs
**functionally on dummy data, no backend**, so business can approve real
clickable flows. Devs connect a real backend later with **zero UI change**.

The "wow": *"Claude, build a CRM with leads, deals and companies"* → in minutes,
a navigable, on-brand, interactive app with realistic dummy data — indistinguishable
in look-and-feel from every other product built on the system.

**Two payoffs from one system:** (a) the design team owns/extends the UI with
AI; (b) instant functional demos for the business team without engineering.

## 2. The thesis: coherence is the product

The hard constraint — what makes this more than a component dump — is that **you
can't break out of the design**. Five mechanisms guarantee it:

1. **One token source.** Color, type (Gilroy + Untitled UI), spacing, radius, elevation, icons — all from tokens. Components consume tokens only; no hex, no ad-hoc CSS.
2. **One shell + IA.** App rail → Module rail → View tabs → Toolbar → Content (+ detail side-sheet). Every product uses the same chrome.
3. **A fixed module-type vocabulary.** Products are assembled from a closed menu of module *types*; you don't invent screens, you configure modules.
4. **Config-driven rendering.** A module's UI is derived from its config (fields + view layout), not hand-written React — so there are no off-design one-offs.
5. **Tenant theming = tokens + logo only.** A tenant can re-skin, never restructure.

If a request can't be expressed within these, that's a signal to add a *capability
to the system*, not a one-off to a product.

## 3. Architecture — four layers (lean, React, demo-first, backend-later)

```
┌───────────────────────────────────────────────────────────────┐
│ L4  Build surface (Claude Code)  — skills + recipe schema       │  ← design team builds with AI
│     "init product" · "add module" · "theme tenant" · "seed data"│
├───────────────────────────────────────────────────────────────┤
│ L3  Composition + dummy data                                    │  ← any product, functional, no backend
│     Recipe (brand + modules) · dummy-data engine · adapter seam │
├───────────────────────────────────────────────────────────────┤
│ L2  Module system  — fixed menu of module types,                │  ← build from new/existing modules
│     config-driven renderers + default views                     │
├───────────────────────────────────────────────────────────────┤
│ L1  Design foundation  — tokens · components · AppShell chrome   │  ← the "one product" guarantee
└───────────────────────────────────────────────────────────────┘
```

**L1 — Design foundation.** Tokens (Figma-aligned), the component library
(primitives, data-display, data-viz, navigation, widgets, map, modals, tags),
the icon set, and the `AppShell` chrome. *This is the coherence layer.*

**L2 — Module system.** A closed menu of module **types**, each with a real,
**config-driven** renderer and default views:

| Module type | Default views | Used for |
|---|---|---|
| entity | list · grouped-list · map · hybrid | things (vehicles, bins, companies, contacts) |
| pipeline | kanban · list · calendar | staged work (leads, deals, incidents, job orders) |
| dashboard | instance | KPI + chart surfaces |
| live-monitoring | map | real-time assets on a map |
| reports | instance | report runner + tables |
| inbox | list | notifications feed |
| settings | sections | tenant/admin config |
| calendar | calendar | scheduled events |
| forms | form | structured data entry |

A **module** = a typed config (fields + view layout + simple rules). **New
module** = a config of an existing type (zero code), or a registered renderer
for a brand-new type (one isolated component). **Existing modules** are reused
verbatim across products. Rendering is **derived from the config** (the field
types + layout placements), so adding a module is a config act.

**L3 — Composition + dummy data.** A **Recipe** = a tenant brand + an ordered
list of module configs. The **dummy-data engine** gives every module instant
CRUD + relationships + simple stage/role rules, seeded with realistic data,
persisted to localStorage so demos survive reloads. Everything flows through a
thin **adapter** interface (`list/get/create/update/delete/move`) — dummy-data
adapter today, REST/GraphQL adapter dropped in later by devs with no UI change.

**L4 — Build surface (Claude Code).** A small set of skills + a **recipe JSON
schema** so Claude Code reliably produces *validated, on-brand* output:
`init-product`, `add-module`, `theme-tenant`, `seed-data`. The coherence rules
(§2) are encoded as agent guardrails. Keep this lean — 3–4 skills, not a maze.

## 4. What we already have, verified (reuse — don't rebuild)

The **data + composition spine is built and tested** (pure TS, ran in sandbox):
- **Dummy-data engine** — entity store (CRUD, soft-delete, UID sequences, refs, filtering) + simple rules (stage transitions, role-based row visibility) + localStorage persistence. **16/16 checks pass.**
- **Composition runtime** — `createAppRuntime(recipe)` binding modules to the engine with rule-enforced moves + RBAC lists. **8/8 checks pass.**

So **"newly in React" applies mostly to L1+L2 (the UI)**; L3's spine is done and
right-sized for demos (it is *not* the heavy faithful backend — that was learning).

## 5. What we can build (the catalog)

**Module types:** the 9 above — the building blocks.

**Products (each = a recipe):** CRM/Sales · Fleet + Live Monitoring · Waste/IWMP
(Tadweer) · Workshop Maintenance (Truemax) · Delivery Management · HRMS · Field
Service · Smart City. Same components, same shell — different module mix + theme.

**Business demos:** any of the above as a clickable prototype on dummy data —
drag a kanban card, create a record, open a detail sheet, switch tenant theme,
reload and state persists. Approval-ready with no backend.

## 6. Roadmap — built incrementally by Claude Code (each phase ships something runnable)

- **P1 — Foundation.** Tokens + core components + `AppShell` + Storybook (the design-team surface). *Fast path: adapt the proven React components/tokens we studied; keep them token-pure.*
- **P2 — Entity + Pipeline (config-driven).** The two types every product needs. Config → rendered views, derived from field metadata.
- **P3 — Dummy-data + recipe loader → CRM.** Wire L3 (already built) to L1/L2; ship the **first full clickable product** (create persists; manager closes a deal, rep can't).
- **P4 — Remaining module types.** dashboard · live-monitoring · reports · inbox · settings · calendar · forms.
- **P5 — Build surface.** `init-product` / `add-module` / `theme-tenant` / `seed-data` skills + recipe schema → *"prompt → product."* The wow.
- **P6 — Tenants + gallery + backend stub.** 3 tenant themes; a gallery of demo products; a documented REST adapter stub for devs.

## 7. Coherence guarantees (enforced, not hoped)

- Token-only styling; a lint/verify rule rejects raw hex in components.
- Single `AppShell`; products never hand-roll chrome.
- Module configs validate against JSON schemas (per type).
- Config-driven renderers — no per-product screen code.
- Tenant theming limited to a token + logo overlay.
- A `verify` step (and agent guardrails) checks all of the above before "done."

## 8. Backend-later (the dev hand-off)

Every data read/write goes through the adapter interface. Today: the dummy-data
adapter. Later: devs implement `RestAdapter` (or GraphQL) satisfying the same
interface and point a base URL at the real API. **No component, recipe, or module
config changes.** That's the clean seam that makes a design-built demo become a
real product.

## 9. How we'll verify (works around the flaky shell)

- L3 engine + composition: **pure TS, sandbox-tested** (already 24/24). Keep adding checks there.
- Recipes: **JSON-schema validated** — correctness without compiling.
- L1/L2 React + Storybook/Vite boot: **needs a stable shell** (the one recurring blocker; a session restart fixes it).

## 10. How you'll drive it with Claude Code

This plan is the build brief. In a fresh Claude Code session on this folder you
can go phase by phase ("build P1", "now P2", …), test, and we iterate/refine the
system from there — adding module types, products, and polish as the demos demand.

---

### Decisions baked in (say if you'd change any)
1. **Single React package** (not a monorepo) for the design system — simplest for the agent and for keeping it coherent.
2. **Dummy-data engine reused** as L3 (already verified) rather than rebuilt.
3. **Config-driven rendering** is the core mechanism — a module is config, not code.
4. **Recipes in JSON** (+ generic projections) so non-devs/agents compose products and the schema can validate them.
