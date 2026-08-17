# zones — service-zone hierarchy block

> **What it is.** Manage service **zones/areas as a hierarchy** (zones contain sub-zones), each a coloured
> polygon on a map. Backed by the DS `ZonesView`. Built from Figma `W2z46FvC6aOdzOHDc3rqD5` (node
> `2746-12870`); full spec in kb `02-frames-pipelines/12-zones.md`.

## Anatomy (Hybrid View) — ✅ built
- **Top-nav**: `Zones | Hybrid View | List View | Map View | +`.
- **Left tree list**: search + filter + **export** + **list/tree** view toggle. "Showing N items". Columns:
  eye (map visibility) · **Zone** (expand chevron + colour dot + name, indented by depth) · Tags · Location ·
  Description — with the standard DS `ColumnConfig` pencil in the header. Rows expand/collapse to reveal
  sub-zones; list view flattens; search filters across the tree.
- **Right map** (DS `MapView`): coloured zone polygons (hidden per the eye toggles) + **Create New Zone** +
  **Upload KML** buttons.

## Adapt (props on `ZonesView`)
- `zones: ZoneNode[]` — recursive `{ id, name, color, tags?, location?, description?, points?, children? }`.
- `center` / `zoom`, `labels`, callbacks `onCreateZone` / `onUploadKml` / `onExport` / `onZoneClick`.

Brand = FAMS blue; zone colours are data; tags use success-tinted chips.

## Compose
`type:'dashboard'`, `tabKind:'instance'` — carries Hybrid/List/Map tabs. Splice `zonesBlock` into the app;
point `zones` at the real zone hierarchy.

## Follow-ons (spec'd in kb 12)
- **Create New Zone**: draw the polygon on the map (draw tools) + a side-sheet form (name · colour · tags ·
  parent · location · description) → save.
- **Upload Zones via KML** (`2859-5635`): a side-sheet dropzone → parse `.KML` → preview → import.
