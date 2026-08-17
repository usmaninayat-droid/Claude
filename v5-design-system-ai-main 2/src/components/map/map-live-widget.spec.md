# MapLiveWidget — `map-live`

**Schema type:** `map-live` (registered in `DashboardModuleConfig.schema.json` widget `type` enum and in the `DashboardWidgetGrid` renderer switch as `kind: 'map-live'`).

**What it is.** The dashboard-embedded live fleet map: the default Telematics
Overview hero widget (span 12). A composition over existing kit primitives —
`WidgetShell` (titled card + state legend) → `MapWidget` (chrome: freshness
badge, zoom controls) → `MapView` (MapLibre engine, `kind:'asset'` pins).
No new map engine, no forked chrome.

## Anatomy

```
┌ WidgetShell ──────────────────────────────────────────────┐
│ Title                    ● Moving (24) ● Idling (6) ● …    │  header + auto legend
├───────────────────────────────────────────────────────────┤
│ [LIVE · updated 8s ago]                          (map)    │  MapWidget statusBadge
│        ◔ 12   ← cluster health ring (conic by state)      │
│   ▲ pin (AssetMarker, state-coloured, heading tick,       │
│     breathing pulse when moving)               [+ / −]    │
└───────────────────────────────────────────────────────────┘
```

## Behaviours

- **Breathing pulse** — moving assets render `live: true` markers (MapView's
  pulse ring). Disabled under `prefers-reduced-motion`.
- **Position interpolation** — when the `assets` prop updates (a new ping),
  displayed positions ease from the previous position over `interpolateMs`
  (default 900ms) instead of teleporting. Disabled under reduced motion
  (positions jump; data identical).
- **Cluster health rings** — screen-space buckets (76px cells via the public
  `project()` handle). Buckets with ≥2 assets render a conic-gradient ring of
  the member states around a count. Click → `fitTo(members)`. Singletons render
  their normal pin. Recomputed on pan/zoom (`onViewportChange`, rAF-throttled)
  and on data change. `cluster={false}` disables.
- **Freshness pill** — `updatedAt` renders `LIVE · updated Ns ago` (MapWidget
  `statusBadge`), success tone while fresh, **warning tone once older than
  `staleAfterSec`** (default 120s) — the honest-data-state contract. `getNow`
  lets demo apps inject a fixed clock.
- **Click pin → `onAssetClick(id)`** — the consumer routes to the asset detail.

## Tokens & a11y

- All chrome via tokens; ring/pin colours from `ASSET_STATE_COLOR`
  (state → `var(--success-500)` etc.). No new hex.
- Legend labels carry counts (non-colour encoding); cluster buttons are real
  `<button>`s with `aria-label` and focus rings; reduced motion honoured.

## Config example

```json
{ "id": "o1", "title": "Live Fleet Map", "type": "map-live", "span": 12,
  "dataSource": { "entityId": "vehicle", "fields": ["position","heading","speed","ignition","state"] } }
```
