# Live-monitoring block — map + live status

**Type:** `live-monitoring` · **Renderer:** `src/components/app-shell/live-monitoring-view.tsx` (exists:
list + map + tracking popup + legend). **Canonical frames + gap analysis + slice plan:** brain
`02-frames-pipelines/08-live-monitoring.md` (Launch-Pad `W2z46FvC6aOdzOHDc3rqD5`).

**Canonical features still to build (slices):** (1) **clustering + status-proportion ring + eye
cluster/uncluster toggle** [headline]; (2) list **column enable/disable**; (3) **filters + applied chips
+ advanced filters** (reusable, FM-4651); (4) **Zones + POIs side sheets** (from left); (5) **skeleton
loaders** (map + list). Each lands in the renderer + is demonstrated here.

## What it is
A map-first surface: a Leaflet map (the DS `@ds/components/map` — never mock it) with markers,
routes, and zones, plus a live status strip/list. Use it for fleet tracking, route planning, zone
overlays, asset maps.

## Anatomy
- **Top controls band** — view switch + layer/tag filter (`L.layerGroup` toggles).
- **Map** — OSM tiles; markers = token-styled `L.divIcon`; routes = `L.polyline` (`--primary` + dark
  casing); zones = `L.polygon` (no-go = red dashed + hatch + legend). Popups = DS card, `autoPanPaddingTopLeft`
  so they clear the controls band.
- Optional side list / status strip bound to the same records.

## Adapt
Marker/route/zone sources (lat/lng fields), layer taxonomy, popup field sets, map center/zoom.

## Compose
Splice the TSX `ModuleConfig` into the app. Reference: facilities-ops `tracking.tsx` + DS map widgets;
the pipeline `hybrid`/`map` views also use `uiConfig.map`.
