# Map search v2 — live verification notes

Branch: `feat/map-search-v2` (worktree `wt-search`, off
`cycle/2026-08-30-frms-mvp`). This branch already carried a substantially
complete "search anything" implementation from the prior
`feat/map-search-cluster` merge (`229661c`) — this run's scope was to
reconcile that implementation against the newer, more detailed spec
(`search-video-spec.md` + `map-features-video-analysis.md` §1) and close the
one real gap: a Qatar gazetteer data source. As with the prior run, this
worktree could not touch the shared demo dev server (owned by another
agent) — verify with Playwright or by hand against `workshop/showcase`
(`pnpm --filter @fams/showcase dev` → `:6100` → "LiveMapView" demo) and/or
the UCCP demo environment once available.

Reference specs:
- `/Users/apple/.claude/jobs/bedd742f/tmp/search-video-spec.md`
- `/Users/apple/.claude/jobs/bedd742f/tmp/map-features-video-analysis.md` §1

## What was already in place (verified against the new spec, no changes needed)

Files: `packages/v5-templates/src/map/chrome/MapSearchPanel.tsx`,
`map/search/{search-types,search-providers,highlight-geo}.ts`,
`map/SearchHighlightPin.tsx`, wiring in `map/chrome/LiveMapTools.tsx` +
`map/LiveMapView.tsx`.

- **Trigger** — white 40×40 rounded tile, magnifier glyph, Figma `Shadow/Map`
  shadow, same pitch/geometry as the other top-start tools
  (`chrome/LiveMapTools.tsx` `ToolButton`/`TOOL_BUTTON`).
- **Expanded pill** — `w-80` (~320px, inside the spec's 300–330px band),
  rounded-lg, `bg-card` + the same directional shadow, placeholder
  "Search anything location, pin, zone etc." (`MapSearchPanel.tsx` default
  prop), red `×` clear icon once text is entered (`text-destructive`),
  quiet grey close icon when empty.
- **Debounce + loading** — 250ms default debounce, spinner + "Loading…" row
  rendered inside the results area, `role="status" aria-live="polite"`.
- **Flat, un-grouped result list** — one `<div role="listbox">` (conditionally
  a listbox only while results exist — see the in-file comment on why not
  `<ul>/<li>`), three-plus row templates switched on `result.kind`:
  - `place` → `MapPin` (pin-drop) icon, bold title, muted subtitle.
  - `zone` → `ZonesIcon` (geofence) icon, title, chip row (colour swatch dot
    + type pill + "+N more" overflow, `OVERFLOW_CHIP_LIMIT = 2`).
  - `poi`/`shortcut` → `Flag`/`LayoutGrid` icon, title, subtitle or chips.
  - `asset` → `Truck` icon, plate/name (not in the spec's three named
    templates, but the same row switch — retained since `LiveMapTools`
    already wires vehicles into the default provider set; drop it via a
    custom `searchProviders` list if a deployment wants search scoped to
    places/zones/POIs only).
- **Hover/active row** — flat full-width `bg-muted` band, no radius, shared
  by pointer hover and the keyboard-active row.
- **Scrollbar** — `max-h-72 overflow-y-auto` with `[scrollbar-width:thin]`.
- **Keyboard** — `ArrowDown`/`ArrowUp` move `activeIndex`; `Enter` selects;
  `Escape` clears the query first, a second `Escape` (or `×`) closes via
  `onOpenChange(false)` + `onClear`.
- **Selecting a result** — closes the dropdown; `LiveMapView` flies the
  camera (place/POI/asset: `flyTo` the position; zone: `fitBounds` to the
  zone's ring, per `MapSearchResult.bounds`); plants `SearchHighlightPin` at
  the tokenized-accent pin + `searchHighlightZone` translucent circle;
  hovering/focusing the pin opens the "Assets Nearby" panel with the
  1–50 km slider (`vehiclesWithinRadius`, haversine distance, live count).
- **Clear/close** — removes the highlight (`onSearchClear` →
  `setSearchHighlight(null)` in `LiveMapView`).
- **Empty / no-results states** — checked against `ui-ux-pro-max`'s Search /
  No Results guideline ("show suggestions, never a bare '0 results'"): the
  untouched-field state names what IS searchable (`emptyTitle`/`hint`), a
  miss echoes the query back and suggests a next move (`emptyHint`), both
  `role="status" aria-live="polite"` so a screen-reader user hears the list
  settle. No change needed.
- **Accessibility** — `role="combobox"` input, `aria-expanded`,
  `aria-controls`, `aria-autocomplete="list"`, `aria-activedescendant`;
  options carry `role="option"`/`aria-selected`; focus rings on every
  interactive element (`focus-visible:ring-2`); covered by
  `packages/v5-templates/src/map/a11y.axe.test.tsx`.

## What changed this run

1. **`packages/v5-templates/src/map/search/qatar-gazetteer.ts` (new)** — a
   static, hand-authored dataset of Qatar's 8 municipalities plus 12
   well-known districts/landmarks (`qatarGazetteer: MapGazetteerEntry[]`),
   each with a `[lng, lat]` centroid and a `"Name, Municipality, Qatar"` /
   `"Name, Qatar"` subtitle mirroring the clip's admin-region row
   ("Adam Province, Al Wusta Governorate, Oman"). Pure metadata — no
   network call, no geocoding API, no fuzzy-index service.
   `createGazetteerSearchProvider(entries)` filters it exactly like every
   other provider (`place`-kind rows, flies to the centroid at place zoom).
2. **`createDefaultSearchProviders`** (`search-providers.ts`) gained an
   optional `gazetteer?: MapGazetteerEntry[]` input. Deliberately **opt-in**
   and empty unless supplied — the design system's standing decision ("no
   gazetteer/geocoding shipped by default", documented on `MapSearchProvider`
   and `LiveMapPlace`) still holds for every non-Qatar deployment; a Qatar
   deployment passes `gazetteer: qatarGazetteer` explicitly. Not wired into
   `LiveMapTools`/`LiveMapView`'s own defaults, and NOT wired into the
   `fams-v5-demo-environment` blueprint (out of this repo's scope) — a
   follow-up in that repo should pass `qatarGazetteer` through
   `uiConfig.map` if the QATAR MME deployment wants it live by default.
3. **`map/index.ts`** — exported `qatarGazetteer`, `createGazetteerSearchProvider`,
   `MapGazetteerEntry`, and fixed a pre-existing gap where
   `createPoisSearchProvider` was implemented and tested but never exported
   from the package barrel (a caller wanting to hand-assemble a custom
   provider list — e.g. POIs without the default vehicle/asset provider —
   could not import it before this).
4. **`packages/v5-templates/src/map/search/qatar-gazetteer.test.ts` (new)** —
   unit coverage: name match, municipality-parent match, subtitle format for
   both municipality and district entries, empty-query-matches-all, no-match
   returns `[]`, and that `createDefaultSearchProviders` excludes the
   gazetteer provider unless `gazetteer` is passed.

## Playwright verification steps (delta over `map-search-cluster-verify.md`)

1. Load the LiveMapView demo (`:6100` → LiveMapView). Confirm the search
   panel's default behavior is UNCHANGED (no `gazetteer` wired into the
   demo yet — this run only adds the opt-in dataset + provider).
2. In a scratch harness (or a follow-up demo update), pass
   `searchProviders={createDefaultSearchProviders({ ...other, gazetteer: qatarGazetteer })}`
   and confirm:
   - Typing "doha" surfaces "Doha Municipality" (subtitle "Doha Municipality, Qatar")
     and any district whose name/municipality contains "doha".
   - Typing "west bay" surfaces "West Bay" with subtitle
     "West Bay, Doha Municipality, Qatar".
   - Selecting a gazetteer result flies the camera to its centroid at place
     zoom (kind `place`, same fly-to path as an app-supplied `LiveMapPlace`).
3. `page.getByRole('option')` count should grow by exactly the gazetteer
   matches for the same query once wired in — no duplicate rows, no
   double-counting against an app's own `places` list (they are separate
   provider ids, `gazetteer` vs `places`, so both can legitimately return a
   same-named row if an app's own data duplicates the gazetteer — expected,
   not a bug).

## Merge-conflict notes

- `packages/v5-templates/src/map/search/search-providers.ts` — one new
  import line + one new optional field + one new `if` branch in
  `createDefaultSearchProviders`. Low conflict risk; additive only.
- `packages/v5-templates/src/map/index.ts` — two new export lines appended
  to the existing search-barrel block, plus the `createPoisSearchProvider`
  fix inserted into the existing export list (same line group the prior
  `feat/map-search-cluster` branch's notes already flagged as
  low-conflict-but-append-prone). Re-run `pnpm build:registry` after
  resolving any conflict here rather than hand-merging `llms.txt`.
- `packages/v5-templates/src/map/search/qatar-gazetteer.ts` and
  `qatar-gazetteer.test.ts` are new files — no conflict surface.
- `MapSearchPanel.tsx`, `SearchHighlightPin.tsx`, `LiveMapTools.tsx`,
  `LiveMapView.tsx` — **untouched** this run (the prior branch's
  implementation already matched the new spec); see
  `plan/map-search-cluster-verify.md` for their existing merge-conflict
  notes, which still apply unchanged.

## Test results (this run, in the worktree)

- `pnpm --filter @fams/v5-templates typecheck` — clean.
- `pnpm --filter @fams/v5-templates lint` — clean.
- `pnpm --filter @fams/v5-templates test` (full package suite, 117 files /
  1575 tests) — full-run flagged 5 failures, all in files this branch never
  touches (`src/a11y.axe.test.tsx` DashboardView case,
  `src/creation-sheet/CreationSheet.flat.test.tsx`,
  `src/entity-profile/OverviewWidgets.test.tsx`,
  `src/entity-profile/tab-components.test.ts`, `src/views/DashboardView.test.tsx`).
  Re-running just those 5 files in isolation: 4 passed immediately and the
  5th (`tab-components.test.ts`'s "registers the two generic tab components
  on module load" case) is a known-slow dynamic-import test that timed out
  at the full suite's default 15s under this run's parallel load (11.6s in
  one run, 5.9s in isolation) — confirmed pre-existing/flaky, not caused by
  this branch's changes (which touch only `map/search/*` and `map/index.ts`).
  All map/search-specific files are green:
  `src/map/search/qatar-gazetteer.test.ts` (6/6, new),
  `src/map/search/search-providers.test.ts` (9/9),
  `src/map/chrome/MapSearchPanel.test.tsx` (14/14),
  `src/map/SearchHighlightPin.test.tsx` (6/6), `src/map/a11y.axe.test.tsx` (16/16).
- One bug found and fixed in this run's own new test (not in the shipped
  code): `qatar-gazetteer.test.ts`'s first case originally asserted
  `results` had length 1 for the query "doha municipality", not accounting
  for `matchesGazetteer` also matching every district whose `municipality`
  field is "Doha Municipality" (7 districts + the municipality itself = 8,
  which is what the provider correctly returned). Fixed the test to find
  the specific row by title instead of asserting list length.
