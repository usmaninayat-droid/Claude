# FAMS V5 — The Platform Model

> How the whole system fits together, top to bottom:
> **FAMS → App → Module → View**, all driven by config over one shared engine.
> This is the conceptual map; the contracts live in `src/runtime/composition.ts`
> (Recipe/Module/View vocabulary), `src/sim/engine/types.ts` (Entity), and
> `src/runtime/config-render.ts` (config → UI).

---

## 1. FAMS V5 — what it is

FAMS V5 is a **dynamic composition design system**: a single React kit from
which the team composes *any* product by choosing from a fixed menu of building
blocks — and every product still looks and behaves like **one coherent FAMS
product**, not a pile of bespoke screens.

Three properties define it:

1. **Composed, not coded.** A product is assembled from configuration, not
   hand-built screens. You pick modules, bind them to data, and the engine
   renders them. "You can't design your way out of the system."
2. **Runs on dummy data, backend-swappable later.** Every product is fully
   clickable on an in-browser data engine (create, move, edit, persist) with no
   backend — perfect for stakeholder demos and approval. A developer later swaps
   the data adapter for a real API with **no UI change**.
3. **Coherent by construction.** One app shell, one set of design tokens, one
   fixed module-type menu, one rendering path. Re-skinning is tokens + logo only,
   never structure. Default brand is **FAMS** (primary blue `#0072D6` + FAMS
   logo) unless a custom brand is explicitly requested.

The "wow": a designer + an AI assistant can stand up an on-brand, interactive
product in minutes.

The model has four levels. Each one *contains* the next:

```
FAMS V5  (the platform / design system)
   └── App            a product  =  brand + a chosen set of modules   (a "Recipe")
         └── Module   one capability  =  a module-type bound to data  (Deals, Vehicles, Trips…)
               └── View   a lens on that module's data  (list, kanban, calendar, map…)
                     └── Record detail   one item, opened from any view
```

---

## 2. App — a product (the "Recipe")

An **App** is one product: a Sales CRM, a Fleet Ops tool, a Waste-Manifest
regulator app. In the kit an app is expressed as a **Recipe** — a small config
object:

```
Recipe = {
  id, tenant,
  brand,            // name + logo + optional token theme (FAMS default if omitted)
  modules: [ … ],   // the ordered list of modules that make up this product
  rules,            // pipeline rules (RBAC + allowed stage transitions)
  seeds,            // dummy data for each module's entity
  user              // the current user (drives RBAC)
}
```

That's the entire definition of a product. The brand paints the app rail and
tokens; the `modules` array becomes the left-nav and the screens. Swap the
modules → a different product. Swap the brand theme → a different tenant. Same
kit underneath.

Apps live **outside** the design system, in the products folder
(`Code\<slug>\`), and consume the kit read-only.

---

## 3. Module — one capability

A **Module** is one capability in an app — what shows up as an item in the left
nav: *Deals, Vehicles, Work Orders, Trips, Reports, Calendar, Settings.* Every
module is one entry in the recipe:

```
ModuleSpec = {
  id, label, icon,
  type,             // WHICH kind of module (the fixed menu, below)
  dataSource,       // WHERE its data comes from (an entity code + optional rules)
  views,            // which Views to expose as tabs
  config,           // per-type configuration
  create            // optional "create new" form
}
```

The key idea: **a module is a *module-type* + *data* + *config*.** The type is
the rendering behavior (the kit knows how to draw it); the data and config make
it *your* module.

### 3a. The fixed module-type menu

The platform renders a **closed set of module types**. A new product is new
*config*; a brand-new *type* is the only thing that requires engineering (a new
registered renderer). The types:

| Module type | What it's for | Backed by an entity? |
|---|---|---|
| **entity** | A set of records you browse + edit (Vehicles, Companies, Contacts, Assets). | Yes |
| **pipeline** | An entity *with a lifecycle* — records move through stages on a board (Deals, Work Orders, Support tickets, Manifests). | Yes |
| **dashboard** | KPIs + charts summarizing data. | No (reads others) |
| **live-monitoring** | Real-time things on a map + a fleet/asset list (vehicles, trips, gensets). | Yes (geo records) |
| **reports** | Tabbed report surfaces — tables, KPI grids, charts, export. | No (reads others) |
| **inbox** | Notifications / items needing attention. | Yes (events) |
| **calendar** | Records or events on a month grid (bookings, training, events). | Yes |
| **forms** | A full-page structured data-entry form (log a reading, file a request). | Writes an entity |
| **settings** | Admin configuration sections (thresholds, toggles, actions). | No (config) |

### 3b. The data primitive: the **Entity**

Most modules sit on an **entity** — the core data object. An entity is defined
by an `EntityConfig` (config, not code):

- `code` (`crm/deals`, `fleet/vehicles`), `name`, `uidPrefix`;
- `systemcolumns` — the **fields**, each typed: `SmallText`, `LongText`, `Date`,
  `Currency`, `Number`, `Boolean`, `SingleSelect`, `MultiSelect`,
  `SingleReference` / `MultiReference` (link to another entity), `tags`;
- `uiConfig` — stages (`statusList`), the kanban card, the detail `profile`,
  filters, search;
- `listcolumns` — the table columns.

Its instances are **records** in the engine's EAV store (`{ id,
uniqueidentifier, title, status, systemcol1…N }`), reached through the adapter
(sim now, REST later). **References** between entities (Work Order → Vehicle,
Deal → Company) form the relational graph.

> **Entity vs Pipeline:** both are backed by an `EntityConfig`. The difference is
> *lifecycle*. An **entity module** shows records as a list/table you browse and
> edit. A **pipeline module** is an entity that *also* declares `statusList`
> stages + transition rules, so its records move across a board with
> RBAC-enforced moves. A pipeline is just an entity with stages.

### 3c. Domain modules are configurations of these types

The business names a lot of "modules" — **Trips, Events, Trip Management,
Reports, Bookings, Manifests.** These aren't new engine primitives; each maps
onto the type menu:

- **Reports** → the `reports` type (tabbed charts/tables).
- **Events** → typically a `calendar` module (events on a grid) or an `entity`
  of type Event shown as a list/calendar.
- **Trip Management** → a *domain area* composed of several modules: a
  **`live-monitoring`** module (trips moving on the map, with telemetry popups),
  a **`pipeline`** module for the trip lifecycle (Scheduled → En route →
  Delivered), and/or an **`entity`** module for the trip log. One business
  capability, assembled from the fixed types.
- **Bookings / Training / Maintenance / Deals / Manifests** → `pipeline` or
  `entity` modules with their own fields, stages, and cards.

So "what modules do we have?" has two answers: the **nine engine types** (fixed),
and the **domain modules** a product composes from them (open-ended).

---

## 4. View — a lens on a module

A **View** is *how* a module's data is presented. One module can offer several
views as tabs; the user switches between them. Crucially, **all views read the
same config** — columns, cards, and detail are *derived* from the entity's field
metadata (`config-render.ts`), so the views stay consistent automatically.

The view kinds:

| View | What it shows | Typical module |
|---|---|---|
| **List view** | A dense table — `listcolumns`, sortable, searchable, filterable. | entity, pipeline |
| **Grouped-list** | The list, grouped under headers (e.g. by stage or owner). | entity, pipeline |
| **Kanban view** | Stage columns of cards; drag a card to move stages (rule-enforced). | pipeline |
| **Hybrid view** | Two panes — e.g. a list beside a map or a detail. | entity, live-monitoring |
| **Map view** | Records as markers on a map. | entity (geo), live-monitoring |
| **Calendar view** | Records/events on a month grid. | calendar, entity |
| **Dashboard view** | KPI tiles + charts (a summarizing surface). | dashboard, reports |
| **Detail view** | One record opened from any view — see below. | entity, pipeline |

> **Note on overlap:** *calendar* and *dashboard* are both **module types** *and*
> **view kinds**. That's intentional — a module type sets the *default* views,
> and view kinds are the lenses available. A pipeline defaults to kanban + list;
> an entity to list (+ optionally map/calendar/hybrid); a dashboard *is* the
> dashboard view.

### 4a. The card (kanban + list) is dynamic

A pipeline/entity **card** is one component rendered across every use-case. A
card config places fields into slots — header (id + status/priority), title,
body, footer (people + date) — and the **field's type picks the renderer**:
status → stage pill, priority → flag, `Currency` → money, `Boolean` → Yes/No
chip, `Reference` → avatar/link, number/stage → progress. The same field
placements drive both the **Kanban card** and the compact **List card** — one
config, every density.

### 4b. The detail view

Opening any record (from list, kanban, map…) shows the **detail view** — the
Jira/ClickUp-style record panel, in FAMS:

- **left/right data** — the record's fields (the `profile`), some inline-editable;
- a **header** — id pills, title, and the **status / stage control**;
- a **tabbed right panel** driven by config: **Timeline** (stage history),
  **Activity** (events + comments), **Linked** (related records via reference
  fields), **Files** (notes + attachments).

The detail is the same for every pipeline/entity, derived from config.

---

## 5. How a request flows (data path)

```
Recipe (App)
  → createAppRuntime()          bind modules to the sim store + rules (RBAC)
    → runtime.list()            records for a module (RBAC-filtered)
      → buildEntity/PipelineModuleData  +  config-render.ts
        → columns / cards / filters / detail  (derived from field metadata)
          → AppShell renderer for the view (list / kanban / map / calendar…)

create / move / edit  →  back through the runtime  →  rule-enforced + persisted
```

Swap the store's adapter (sim → REST) and **nothing above the data layer
changes** — same recipe, same views, same screens.

---

## 6. Why it always feels like one product (the coherence laws)

1. **Token-only styling** — no hex in components; colors come from tokens.
2. **One shell + IA** — every app renders the same `AppShell` (rail, nav,
   board, detail, drawers). Never hand-rolled.
3. **Fixed module-type menu** — new product = config; new *type* = a registered
   renderer (rare, deliberate).
4. **Config-driven rendering** — a module is config; its UI is derived. No
   per-product screen React.
5. **Theming = tokens + logo only** — a tenant re-skins, never restructures.
6. **Default brand = FAMS** — FAMS blue + logo unless a custom brand is asked for.

---

## 7. One-paragraph summary

**FAMS V5** is the platform. An **App** is a product you compose — a brand plus a
chosen set of **Modules**. Each module is one of a fixed set of **module types**
(entity, pipeline, dashboard, live-monitoring, reports, inbox, calendar, forms,
settings), bound to an **Entity** (the typed data primitive) or reading from
others. Each module offers **Views** — list, grouped-list, kanban, hybrid, map,
calendar, dashboard — that are all *derived from the same config*, plus a shared
**detail view** for any record. Domain capabilities like **Trips, Trip
Management, Events, Reports** are simply configurations of those types. Pick the
modules, bind the data, choose the views — and the engine renders one coherent,
clickable, on-brand FAMS product.
