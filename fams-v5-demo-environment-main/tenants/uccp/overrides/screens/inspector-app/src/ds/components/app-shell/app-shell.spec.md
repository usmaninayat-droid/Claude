# App-Shell — behavioural spec

The composition layer that turns the component library into the FAMS V5 kit:
**App → Module → View**. `AppShell` assembles a branded app from an
`AppConfig`; the module-type registry supplies default Views and renderers.

## Concepts

- **App** (`AppConfig`) — brand (name, logo, icon, theme overrides), a chosen
  list of **modules**, an optional collective inbox, and a user.
- **Module** (`ModuleConfig`) — one of a fixed menu of **module types**. Carries
  a label, rail icon, top-nav tabs, typed `data`, and an optional custom
  `render`. When `render` is absent the module-type's built-in renderer runs.
- **View** — a visualisation of the module's data. For most modules a tab is a
  `ViewKind` (`list`/`kanban`/`map`/`hybrid`/`calendar`/`grouped-list`); for
  `dashboard`/`reports` modules a tab is a named **instance** carrying its own
  `render`.

## Module types (registry)

| Type | Default views | Tab kind | Built-in renderer |
| --- | --- | --- | --- |
| `entity` | `list` | view | DataTable / ListRow / Map / Hybrid |
| `pipeline` | `kanban`, `list` | view | KanbanBoard / DataTable |
| `dashboard` | — | instance | renders the active instance tab |
| `live-monitoring` | `map` | view | MapWidget + LeafletMap |
| `reports` | — | instance | renders the active instance tab |
| `inbox` | `list` | view | NotificationCard list |
| `settings` | — | view | placeholder |
| `calendar` | `calendar` | view | month grid |
| `forms` | — | view | placeholder |

`registerModuleType(type, partialDef)` overrides any built-in.

## Layout

- **Blue app rail** — logo, one square switch-icon per app (active = white bg +
  brand-blue icon), and a footer group: collective **Inbox** (red dot), then
  **Support**, **Settings**, and the **User** popover (`UserMenu` → profile /
  settings / log out, Google-style). Mounted via `SideNav` (`footerExtra` slot).
- **White module rail** — `ModuleRail` of the active app's modules.
- **Top nav** — `TopNavModule` in the `segment` variant (full-height 48px
  bordered tab segments, view icon + label, × close, `+` add-view). The Inbox
  view replaces the module surface while open.
- **Detail & create are right side sheets** (not a top-nav tab strip). The
  module view stays mounted behind a backdrop:
  - `DetailSheet` — wide, macOS traffic-light header + a browser-tab strip
    (one tab per open record, `+` to create). `openDetail(descriptor)` from a
    renderer (row/card click) pushes a tab; closing the last returns to the
    module. Carries a visually-hidden `SheetTitle` for a11y.
  - `FormSheet` — narrower, chrome-less, single floating close to the left.
    Hosts the module's **create** surface: a declarative `create.schema`
    rendered by `SchemaForm`, or a custom `create.render(close)`. The toolbar
    **Create New** button and the DetailSheet `+` both open it (opening Create
    dismisses any open detail — the two sheets don't stack).
- **Toolbar band** — shown for `entity` / `pipeline` modules under the top nav:
  a search field (filters the active view live), a **Filter** popover built from
  the module's `filterField` facet (with active-filter chips + Clear all), named
  facet dropdowns, an optional built-in **Group by** field (pipeline `list` tab
  only — see below), a product-supplied `ModuleConfig.toolbarSlot` (rendered
  after the facet dropdowns), then Export/Create New. Everything lives in ONE
  row — never add a second toolbar-style row below it for a per-view control.
- **Group by (pipeline List view, T-094 F2)** — for a `pipeline` module whose
  active tab is `list`, the shell auto-renders a "Group by: {value}" facet-
  dropdown-styled trigger (same box anatomy as the named facet dropdowns —
  `h-10 rounded-lg border px-3` + leading icon + `ChevronDown`, tinted once
  non-default) sourced straight from `PipelineModuleData.columns` — **zero
  product config required**, every pipeline module inherits it for free. State
  is per-tab (`groupColByModule`, mirrors sort/facetFilters) and reaches the
  view as `ModuleRenderContext.groupByCol` (a plain column id, `''`/undefined =
  no grouping) — `PipelineListView` only APPLIES it to `DataTable`'s `groupBy`,
  it never owns the control or its own state. A `ModuleConfig.render` override
  that calls `PipelineListView` directly (e.g. a shared "pipeline + banner"
  wrapper) must forward `ctx.groupByCol` itself — the shell's ctx plumbing does
  NOT reach a custom render's internals for free.

## Truemax-fidelity rendering

- **Kanban** uses `KanbanColumn variant="board"` — 4px colored top-border, tinted
  column (derived from the stage `color`), white header card, colored count
  badge — and `KanbanCard` with priority flag + type chips, icon'd metadata
  (Container/Tag/Clock/MapPin), the live `DowntimeBadge`, overdue date styling,
  and an unassigned slot. When search/filters yield **zero cards across every
  stage**, the board renders the shared DS empty state ("No matching records" +
  try-a-different-search guidance — same composition entity list views use)
  instead of blank pastel columns; a single quiet empty column while siblings
  still have cards is untouched (normal kanban). Override via
  `PipelineModuleData.emptyState` for custom copy/art (defaults cover every
  existing consumer, no prop change required).
- **Dynamic views** — the `+` opens the "Select preferred view" picker offering
  **every** `ViewKind` the module type supports (`ADDABLE_VIEWS`); picking one
  adds a **new tab instance**. A module can hold **any number of tabs, including
  several of the same kind** (auto-numbered, e.g. "Calendar View 2") — so the
  user can keep multiple views of the same data filtered differently. The ×
  closes a view (min 1). Pipelines also support a Calendar view that buckets
  cards onto a month grid by their date.
- **Per-tab toolbar state** — each view tab remembers its own search, filters,
  facet selections and sort (state is keyed `module::tabId`), so switching
  between tabs — even two tabs of the same kind — preserves each tab's filters.

## State & transitions

- Switching **app** resets the active module to the app's first, and clears
  inbox + open details.
- Switching **module** clears inbox + open details; the active tab is remembered
  per module.
- A renderer calls `openDetail(descriptor)` (e.g. on row/card click) to push a
  detail tab; clicking a `TopNavDetail` tab focuses it, the × closes it, and
  closing the last detail (or **← Back**) returns to the module view.
- **Branding** — `brand.theme` is applied as inline CSS variables on the shell
  root, so per-app theming works without touching global `:root`.

## Standalone preview

The showcase **App Architecture** page embeds `AppShell` for docs, but the side
sheets are `position: fixed` (full-viewport), so for a faithful, full-screen
view open the dedicated entry: **`/appshell.html`** (source: `src/appshell.tsx`,
a Vite MPA input alongside `index.html`). It renders only `<AppShell apps={[…]} />`
at 100vh — use this to review/screenshot the shell without the docs chrome.

## Reuse

Built on existing DS components only — `SideNav`/`ModuleRail`, `TopNavModule`/
`TopNavDetail`, `DataTable`, `ListRow`, `KanbanBoard`/`KanbanColumn`/`KanbanCard`,
`KpiTile`, charts, `NotificationCard`, `MapWidget`/`LeafletMap`, `CalendarCell`,
and primitives (`Popover`, `Avatar`, `Badge`, `Card`). No new dependencies.

## `EntityDetail` — tab-strip overflow (T-081/T-095 backport)

`EntityDetail`'s underline tab row (`role="tablist"`, full-word labels, fixed
`gap-8`) does not wrap and does not abbreviate — once a consumer's tab count
outgrows the panel's width (12 full-word tabs on ifm-workforce's worker
profile, at the panel's `clamp()` floor width), the tablist itself becomes a
horizontal scroll container: `overflow-x-auto whitespace-nowrap` + the DS's
established hidden-scrollbar idiom (`[scrollbar-width:none]
[&::-webkit-scrollbar]:hidden`, matching `live-monitoring-view.tsx`'s and
`pipeline-right-panel.tsx`'s own tab rows) + `shrink-0` on each tab button so
none of them compress. The active tab scrolls itself into view
(`scrollIntoView({block:'nearest', inline:'nearest'})`) whenever `activeTab`
changes — covers both a user click and an external `defaultTabId` change.
No visual change at tab counts that already fit (the scroll container simply
never needs to scroll). No edge-fade mask was added (kept to the
already-proven idiom rather than a novel treatment).
