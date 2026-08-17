# @fams-v5/ui/map — DEFERRED

Leaflet wrappers (`MapCanvas`, `MapCluster`, `MapMarker`, `OverlayDrawer`) are
deferred to Stage 4 to keep the v1 bundle lean. The CRM example doesn't need maps.

When ready, the recommended implementation is:

- `react-leaflet@^4` as the React adapter
- `leaflet@^1.9` for the underlying engine
- `react-leaflet-cluster` for clustering
- Lazy-load via `React.lazy(() => import('./map-canvas'))` so non-map apps don't pay the ~150 kB cost.

Stub barrel exports here keep import sites compiling once the components land.
