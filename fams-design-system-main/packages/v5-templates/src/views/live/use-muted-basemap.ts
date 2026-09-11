/**
 * `views/live/use-muted-basemap.ts` — the light-barrel path to
 * `useMutedBasemapStyle` (SPEC v2 §1's muted-but-COLOURED Figma basemap:
 * land `#F9F5ED`, water `#AEE0F4`, white roads with a grey casing, grey
 * labels).
 *
 * It used to hold a byte-for-byte COPY of the hook that also lives in the
 * heavy map entry (`map/muted-basemap.ts`) — the two were kept in sync by
 * hand because the light barrel must not import the map entry. It doesn't
 * have to: the hook's only dependency is `map/constants.ts`, which is
 * dependency-free (no maplibre, no deck.gl — `views/live/ZonesDrawer.tsx`
 * already imports from it for `MAP_TOOL_DRAWER_WIDTH`). So this module is
 * now a plain re-export and there is ONE implementation, not two that can
 * drift. The export itself is unchanged public API (`src/index.ts`).
 */
export { useMutedBasemapStyle } from '../../map/muted-basemap'
