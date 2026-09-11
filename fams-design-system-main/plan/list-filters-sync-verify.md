# Live Monitoring — list panel / sync-with-map / filters — Playwright verification

Branch: `feat/list-filters-sync` (worktree `wt-list-filters`, base `cycle/2026-08-30-frms-mvp`).
No live dev-server verification was possible from this worktree (the shared UCCP dev
server on :6310 is owned by another agent). This is the exact Playwright script to run
once a dev server / showcase build is available, against the UCCP Live Monitoring
Hybrid View (or the `@fams/showcase` LiveHybridView story if the UCCP app isn't up).

Target selectors used below are the real `data-slot` / role/name hooks already in the
component tree — see `packages/v5-templates/src/views/LiveHybridView.tsx`,
`views/live/LiveListPanel.tsx`, `views/live/LiveFiltersPopover.tsx`,
`views/live/LivePanelDivider.tsx`, `views/live/CustomizeViewDrawer.tsx`.

## 0. Setup

```
pnpm --filter @fams/showcase dev   # :6100, or the UCCP demo app on its own port
```

Navigate to the Live Monitoring module's Hybrid View tab.

## 1. Header count — "Showing N items out of M"

1. Load the view with no search/filters active. Assert
   `[data-slot="live-list-count"]` reads `Showing {total} items` (no "out of" when
   unfiltered) — total should equal the seed's full vehicle count.
2. Type a query into the search field that matches a strict subset. Assert the text
   becomes `Showing {N} items out of {M}` with N < M, and N updates on every keystroke.
3. Clear the search. Assert the count returns to the unfiltered `Showing {M} items`
   string.
4. Open **All Filters** (funnel icon) and check one Status option. Assert the count
   line narrows to the AND of search + filters and never shows a plain unfiltered
   string while any filter/search is active.
5. With **Sync With Map** ON, pan/zoom the map (drag + wheel + zoom buttons). Assert
   the count line switches to the `{N} of {M} in view` phrasing (see step 3 below) and
   ticks live as the viewport changes, with no stale value after the gesture ends.

## 2. Sync With Map (bidirectional)

1. Fresh view, first load, **no prior toggle interaction on this browser profile**
   (clear `localStorage['fams.liveMonitoring.syncListWithMap']` first). Assert the
   "Sync With Map" switch (`role=switch`, accessible name "Sync With Map" inline /
   "Sync list with Map" in the Customize View drawer) renders **checked (ON)** by
   default.
2. Click a list row. Assert the map pans/zooms (camera moves) to center that
   vehicle's marker — check the map's center coordinates changed to within a few
   hundred meters of the row's lat/lng.
3. Click a marker on the map (a different vehicle than the currently selected row).
   Assert: (a) the corresponding list row becomes selected/highlighted and scrolls
   into view; (b) with Sync ON, the list narrows to show only that vehicle — count
   line reads `Showing 1 items out of {M}` (or the viewport-synced phrasing, per
   which of "selection" vs "viewport" narrowing rule 18/spec §3.22 is in effect —
   confirm against the shipped behavior, not assumed).
4. Click empty map space (deselect). Assert the list count restores to the full
   set.
5. Pan/zoom the map with no explicit row/marker selection, Sync ON. Assert the list
   re-scopes continuously to the vehicles inside the current viewport bounds (count
   ticks up/down live during a drag-zoom, no debounce lag beyond ~1 frame).
6. Toggle Sync OFF. Assert: list stops re-scoping on pan/zoom (stays at whatever
   count it last had); the map keeps functioning independently (row click still
   pans the map — that seam is independent of the toggle, per the shipped
   implementation's `focusPosition` derivation).
7. Toggle Sync back ON. Assert it immediately re-applies to the map's *current*
   viewport (no need to pan again) — the list should re-narrow right away if the
   map is not showing the full fleet.
8. Reload the page / open a new view tab. Assert the toggle's default reflects the
   **last explicit choice** (persisted via `localStorage`), not always ON — i.e. if
   you turned it OFF in step 6 and never turned it back on before reloading, a
   *new* view should still open with it OFF (persisted override wins); if you
   clear that localStorage key entirely, a fresh view opens with it ON.
9. Empty-state: pan the map to an area with zero vehicles, Sync ON, no search
   text. Assert the list shows the "No vehicles in the current map area" copy
   (`LiveListNoResults` with the pan/zoom hint), not the generic "No results
   found!" search-empty-state.

## 3. All Filters panel (funnel icon)

1. Click the funnel icon next to search. Assert the "All Filters" popover opens,
   anchored near the funnel, and does NOT cover the list rows it filters (it
   overlays the map side, per spec).
2. Assert the panel's checkbox groups are driven by the bound module's filter
   facets (UCCP: Tanker Status / Tanker Type / Zone-style groups — verify the
   actual bound facet labels rather than hardcoded FAMS-vehicle wording), each
   showing a live per-option count that reflects the CURRENT unfiltered dataset
   (or the correctly-scoped dataset per `buildLiveFilterGroups`).
3. Open one group's dropdown/expand (e.g. the first checkbox group). Assert
   opening it does NOT close the parent "All Filters" popover. Open a second
   group — assert the first stays exactly as it was (independent open/close
   state, no forced-closing accordion behavior) if the bound config renders
   multiple independently-collapsible groups.
4. Tab through the popover with keyboard only. Assert every checkbox, the
   funnel trigger, "Clear all filters", and any group header show a visible
   focus ring (`focus-visible:ring-2`) and are reachable in a sane order.
5. Check 2+ options across 2+ different groups. Assert: (a) list narrows to the
   intersection (AND across groups, OR within a group — confirm against
   `applyLiveFilters`); (b) the map's rendered marker set narrows to the SAME
   set (no marker for a filtered-out vehicle) — list count and visible marker
   count must never disagree.
6. Click "Clear all filters". Assert every checkbox unchecks, tag chips clear,
   and the list/map immediately return to the unfiltered (but still
   search/sync-scoped) set.
7. With filters applied, click OUTSIDE the popover (on the map or list, not on
   "Clear all"). Assert the popover closes AND the applied selections remain
   active (list/map still filtered) — filters must not be silently discarded by
   an outside-click dismiss.
8. Re-open the popover after the outside-click dismiss in step 7. Assert the
   previously-checked options are still shown as checked (state survived the
   close/reopen).

## 4. Search field

1. Type a partial vehicle plate/name. Assert the list narrows live per
   keystroke (no submit needed) and matched substrings are highlighted in the
   VEHICLE cell.
2. With filters AND Sync With Map both active, add a search query. Assert the
   result is the full three-way intersection (search ∩ filters ∩ viewport) —
   count line reflects exactly that set.
3. Clear the search (via the field's own "×" or by deleting all text). Assert
   the list restores to whatever the filters/sync state alone would show (not
   the full unfiltered set if filters/sync are still active).
4. Search for a query matching zero rows. Assert the "No results found!" empty
   state renders with a "Clear search" affordance, and clicking it clears the
   field and hands focus back to the search input.

## 5. Panel-collapse chevrons

1. Note the panel's current width state (`data-width-state` on
   `[data-slot="live-list-panel"]`: `collapsed` / `expanded` / `fully-expanded`).
   Click the divider's chevron control. Assert the state advances
   Collapsed → Expanded → Fully Expanded → Collapsed (cyclic) and the chevron's
   rotation (`rotate-180` class presence) flips appropriately at the "at max /
   stepping back" boundary (see `cycleWidthState`/`LivePanelDivider`).
2. At the Figma 7:5700 collapsed width, measure the rendered panel width in
   pixels (via `getBoundingClientRect`) and assert it matches the design's
   collapsed-width token (`LIVE_LIST_WIDTH_CLASS.collapsed` / `LIVE_LIST_WIDTH_PX`
   in `live-list-model.ts` — read the exact value from that file at review time
   and assert equality, not a hardcoded guess here).
3. Click the "✕" control. Assert the list panel fully hides, the map goes
   full-bleed, and a re-open affordance (`[data-slot="live-panel-reopen"]`)
   appears at the panel's former edge. Click it — assert the panel returns at
   its last non-hidden width state.
4. Resize the browser viewport down to ~1280px width while the panel is at
   "Fully Expanded". Assert the divider correctly reports/handles the
   `atMaxWidth` clamp (chevron should now step BACK to collapsed rather than
   offering an invisible no-op widen), per `LivePanelDivider`'s `atMaxWidth`
   prop.

## 6. Regression checks (do not skip)

- Re-run the existing Vitest a11y sweep (`packages/v5-templates/src/a11y.axe.test.tsx`)
  against a live browser via `pnpm --filter @fams/showcase e2e` if the harness
  supports axe-in-Playwright; otherwise confirm via `pnpm --filter @fams/v5-templates test:axe`.
- Confirm the marker-click ↔ row-select sync from `map/DomMarkers.tsx` /
  `map/LiveMapView.tsx` (owned by another agent) still round-trips correctly
  against this branch's list-panel changes — this branch did NOT touch those
  files, so a green run here is a real signal, but re-verify after that other
  branch's changes land and are merged together.
