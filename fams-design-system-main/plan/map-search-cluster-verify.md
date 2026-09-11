# Map search + cluster toggle — live verification notes

Branch: `feat/map-search-cluster` (worktree `wt-map-search`, off
`cycle/2026-08-30-frms-mvp`). This run could not touch the shared demo dev
server (owned by another agent), so nothing below was exercised against the
live demo — verify with Playwright (or by hand) against
`workshop/showcase` (`pnpm --filter @fams/showcase dev` → `:6100` →
"LiveMapView" demo page, which now passes `showTools`, demo `places`, and a
demo shortcut) and/or the UCCP demo environment once available.

Reference spec: `/Users/apple/.claude/jobs/bedd742f/tmp/map-features-video-analysis.md`
sections 1 (search) and 2 (cluster toggle).

## A. Map search

Files: `packages/v5-templates/src/map/chrome/MapSearchPanel.tsx`,
`packages/v5-templates/src/map/search/{search-types,search-providers,highlight-geo}.ts`,
`packages/v5-templates/src/map/SearchHighlightPin.tsx`, wiring in
`chrome/LiveMapTools.tsx` + `LiveMapView.tsx`.

1. **Collapse/expand**
   - Load the LiveMapView demo. Confirm the top-left tool stack shows a
     collapsed magnifier tile (40×40, same pitch as the other top-start
     tools).
   - Click it: it should expand in place into a ~288px-wide input with
     placeholder "Search anything location, pin, zone etc." No layout shift
     of the map canvas.
   - `prefers-reduced-motion: reduce` (macOS/Chrome DevTools rendering
     emulation → "prefers-reduced-motion") — expand/collapse should not rely
     on a CSS transition class that violates reduced motion (currently the
     panel has no transition of its own; confirm no regression if one is
     added later).

2. **Debounced live results + loading**
   - With the panel open, type a single character. Expect a spinner
     (replacing the leading magnifying-glass icon) for ~250ms
     (`debounceMs` default), then a flat list.
   - Playwright: `page.getByRole('combobox', { name: /search anything/i }).fill('a')`,
     then `await expect(page.getByRole('option').first()).toBeVisible({ timeout: 2000 })`.

3. **Mixed result types in one list**
   - Seed data with at least one place, one saved zone (with `tags`), one
     vehicle, and one shortcut (`searchShortcuts` prop) so all four row
     templates render in the demo: place (title+subtitle), zone (title +
     "Parked Zone" chip + "+N more"), asset (plate/name only), shortcut
     (title + capability chips + "+N more").
   - Confirm the "+N more" chip appears only when a result's `chips` array
     exceeds `OVERFLOW_CHIP_LIMIT` (2) — verify visually against the two
     zone/shortcut fixtures.

4. **Keyboard**
   - With results visible: `ArrowDown`/`ArrowUp` moves the highlighted row
     (`aria-selected`/`bg-muted`); `Enter` selects the active row; `Escape`
     with text clears the query (does not close); a second `Escape` (empty
     query) or the `×` button closes the panel and clears the highlight.
   - Playwright: assert `page.locator('[aria-selected="true"]')` moves
     between key presses.

5. **Selecting a result**
   - Click a place/zone/asset result. Expect: dropdown closes, the map
     flies (`easeTo`/`flyTo`, not an instant jump) to the result's position,
     and a distinct accent-colour pin + translucent circle appears at that
     point (`SearchHighlightPin` + `searchHighlightZone`).
   - Hover the pin: a dark tooltip with the result's title appears, plus a
     small truck-icon button ("Assets nearby").
   - Click "Assets nearby": the panel opens with a "Within X km" slider
     (1–50 km, default `searchNearbyDefaultRadiusKm` = 5). Drag it — the
     on-map circle should resize live and the panel's live count
     ("N assets within X km") should track it (computed via
     `vehiclesWithinRadius`, straight-line/haversine distance — not routed
     distance).
   - Escape/clear/close the search panel (not just clicking away) — the pin
     + circle should disappear (`onSearchClear` → `setSearchHighlight(null)`
     in `LiveMapView`).

6. **Pluggable providers**
   - Confirm `createDefaultSearchProviders` is the default (places/zones/
     vehicles/shortcuts, whichever are supplied) and that passing a custom
     `searchProviders` array on `LiveMapView`/`LiveMapTools` fully replaces
     it (no default gazetteer/geocoding is shipped — this is asserted by
     `search-providers.test.ts` but worth an eyeball check against a real
     geocoder integration if/when the app wires one in).

## Known, deliberate simplifications (call these out if a reviewer expects 1:1 clip fidelity)

- The reference clip's circle renders **pink/magenta**; this implementation
  uses the tokenized `--color-primary` (accent) so it re-themes per tenant —
  intentional per the design-system's "tokens only" rule, not a bug.
- The clip's radius circle turns green while the slider is actively
  dragged, reverting to pink at rest. This implementation only recolors the
  **panel's live-count text** while dragging (`text-success` vs
  `text-muted-foreground`); the on-map circle itself stays one token color
  in both states. Flag if 1:1 clip parity on the map circle itself is
  required — it's a small follow-up (thread a `dragging` boolean into
  `searchHighlightZone`'s color argument).
- "Assets Nearby" counts using straight-line distance (haversine), not a
  routed/road distance — matches the spec's apparent radius-circle
  semantics (a geofence, not an isochrone).

## B. Cluster toggle

Files: `packages/v5-templates/src/map/cluster-toggle-store.ts`, the button in
`chrome/LiveMapTools.tsx` (bottom-start stack, next to eye-off), wiring in
`LiveMapView.tsx`.

1. **Location + tooltip flip**
   - In the LiveMapView demo, the bottom-left stack should show eye-off
     then, directly below it, the cluster-toggle tile (a "grouped points"
     glyph, `Boxes` from `@fams/ui-kit/icons`).
   - Hover/inspect its accessible name: "Disable clustering" while
     clustering is on, "Enable clustering" once toggled off — the glyph
     itself never changes, only the label (matches the clip: no visible
     on/off icon variant).

2. **Instant toggle, no confirmation**
   - Click it: any cluster bubble should immediately either (a) currently:
     re-render as its constituent markers using the SAME "disable
     clustering" code path `MapPanel`/`DomMarkers` already had (`cluster`
     prop → `false` → markers render un-clustered), i.e. individual markers
     appear at their REAL geo positions rather than fanned/stacked exactly
     at the former cluster's screen position.
   - **Deviation from the reference clip, flag for design review**: the
     clip shows exploded markers staying visually stacked/fanned at the
     cluster's on-screen origin until a zoom/pan (a "freeze the explosion
     in place" treatment). This implementation reuses `MapPanel`'s existing
     generic clustered/unclustered rendering switch (`DomMarkers.tsx`'s
     `index` prop present vs. absent), which renders every marker at its
     true coordinate immediately — visually different from the clip when
     markers are geographically close but not identical, though behaviorally
     equivalent ("clustering is off, see the individual markers"). Building
     the exact "freeze at prior cluster screen position, only re-settle on
     the next pan/zoom" treatment is a larger, cluster-specific animation
     feature (would need to snapshot each cluster's last screen position and
     newly-exploded members' offsets) — flagged here rather than attempted
     under this task's scope; happy to pick up as a follow-on if the 1:1
     clip match is required.
   - Toggle back on: cluster bubbles reform.

3. **Isolated markers unaffected**
   - A vehicle far from any other marker should render identically in both
     states.

4. **Persistence**
   - Toggle clustering off, reload the page (or the showcase route):
     confirm it stays off (`localStorage['fams:map:cluster-enabled']`).
   - Open a second tab on the same origin: toggling in one tab should
     flip the other tab's button label live (the `storage` event listener
     in `cluster-toggle-store.ts` — same mechanism `global-basemap-store.ts`
     already uses for the basemap style, proven in that file's own tests).
   - Passing a controlled `cluster` prop directly on `LiveMapView` should
     override the persisted default (an explicit prop always wins, matching
     the existing `activeBasemapId` convention in the same file).

## Merge notes — files likely to conflict with concurrent marker-art work

- `packages/v5-templates/src/map/chrome/LiveMapTools.tsx` — touched
  extensively (new imports, new props, replaced the old inline place-search
  JSX block with `<MapSearchPanel>`, added the cluster-toggle button in the
  bottom-start stack). Any concurrent change to this file's icon imports,
  `ToolButton`, or the bottom-start/top-start JSX blocks will conflict.
- `packages/v5-templates/src/map/LiveMapView.tsx` — touched in several
  spots: new imports, new props (`searchableZones`/`searchShortcuts`/
  `searchProviders`/`searchNearbyDefaultRadiusKm`/`defaultClusterEnabled`),
  new internal state (`persistedClusterEnabled`/`clusterEnabled`/
  `searchHighlight`), `poiPins`/`effectiveZones` memos extended to fold in
  the search highlight, `renderPin` extended with a highlight-vs-POI branch,
  and the `<MapPanel cluster={...}>`/`<LiveMapTools ...>` prop lists grew.
  Marker-art work touching `renderMarker`, `VehicleMarker` props, or the
  `<MapPanel>` JSX block itself is the most likely overlap — the diff is
  additive (new props/branches) rather than restructuring, so conflicts
  should be line-adjacent and mechanically resolvable, but review the
  `poiPins`/`renderPin` and `cluster={clusterEnabled}` hunks by hand.
- `packages/v5-templates/src/map/DomMarkers.tsx` — **NOT touched** by this
  branch. Marker-art work is free to change this file; the cluster toggle
  reuses `MapPanel`'s existing `cluster` boolean → `DomMarkers`' existing
  `index` prop presence/absence switch (no new code path added there). If
  marker-art work changes how clustered-vs-unclustered rendering works in
  `DomMarkers.tsx`, re-read the "Known, deliberate simplifications" section
  above — the cluster toggle's behavior is entirely inherited from whatever
  that file does when `index` is undefined.
- `packages/v5-templates/src/map/index.ts` — additive export block appended
  near the end (cluster-toggle-store + search barrel exports); low conflict
  risk unless another change also appends to the same tail of the file.
- `packages/v5-templates/llms.txt` — regenerated (`pnpm build:registry`);
  will need regenerating again after any further export changes from
  concurrent work — re-run the script rather than hand-merging it.
- `workshop/showcase/src/demos/LiveMapViewDemo.tsx` — the preview section,
  props table, and guidelines/accessibility lists were extended. Low risk
  unless the same demo file is being reworked concurrently for marker art.

## Test results (this run, in the worktree)

- `pnpm --filter @fams/v5-templates typecheck` — clean.
- `pnpm --filter @fams/v5-templates lint` — clean.
- `pnpm --filter @fams/v5-templates test` — full suite green (1518 tests,
  0 failing) after fixing pre-existing `LiveMapTools`/`LiveMapView` tests
  that assumed the old synchronous inline place search, and three new axe
  violations (ARIA listbox vs. native `<ul>/<li>` list semantics — fixed by
  rendering the results row-set as a plain `<div>` list instead of
  `<ul>/<li>`, since it switches between an ARIA listbox and a plain status
  row and can't satisfy both `<ul>`'s native list rule and the listbox
  role's `aria-required-children` rule at once).
- `pnpm --filter @fams/ui-kit lint` / a quick ui-kit build — clean/passing
  (ui-kit itself was not modified by this task; only rebuilt as a dependency
  step).
- `@fams/showcase typecheck` — clean (the demo page's new prop usage
  typechecks against the updated `LiveMapViewProps`).
- NOT run in this worktree: `pnpm --filter @fams/showcase e2e` (Playwright
  route smoke) and `test:visual` — these need a real browser/dev server and
  are called out as the live-verification steps above instead.
