# Asset Refactor Proposal — for approval before execution

Status: **PROPOSED — not yet executed.** Source `public/` untouched; everything regenerates from `scratchpad/*.sh`.
Decision context: these are the **canonical long-term** asset set → full refactor warranted.

## Why the current layout isn't good enough
- **Two fidelity tiers are jumbled under `icons/`.** ~170 files are flat glyphs (currentColor-able); ~250 are detailed multicolor illustrations (map-marker renders, heroes). `icons/vehicle/bus.svg` (18KB illustration) sits beside `icons/event/overspeed.svg` (0.4KB flat glyph) as if they're the same kind of thing. They aren't.
- **Category leakage:** 20 bins/waste live in `icons/vehicle/`; `icons/bin/` exists separately.
- **Duplicate art:** 10 byte-identical groups (esp. file-type icons: 6 identical image-type icons).
- **Non-semantic + color-in-name + two naming schemes** (`device-1/2/3`, `poi-pin-1/2/3`, `png.svg` vs `file-png.svg`, `car-old2`).
- The platform resolver (`usePreset.resolveAppIcon` + `@manifest/icons.json`) addresses icons as **`<category>/<name>` + variant (`map`/`filled`)** per tenant. The DS structure should mirror that contract so migration = repoint the resolver + regenerate the manifest.

## Proposed target structure

```
assets/
  icons/                 # TIER 1 — flat glyphs, low-color, currentColor → @fams/icons (~170)
    ui/                  # generic (arrows, search, close…) — Lucide-first, gap-fill only
    action/  file/  view/            # actions, file-types (deduped), archetype view icons
    event/               # overspeed, geofence, fuel-theft…  (+ -solid variant)
    status/              # active/idle/stopped… (color = semantic — documented exception)
    device/  poi/  workforce/        # flat domain glyphs where they exist
  illustrations/         # TIER 2 — detailed multicolor renders, keep palette (~250)
    vehicle/             # bus, tipper, compactor…  (+ -marker variant for map pins)
    bin/                 # cbm sizes + waste-stream color (see below)
    device/  poi/
    empty-state/         # shared empty states (device, map, chart…)
    <tenant>/            # auth-hero, not-found, brand illustration
  logos/<tenant>/        # logo, logo-mark, logo-white, favicon
```
Fidelity is auto-classified (gradients present OR >3 colors OR >3KB → illustration; else glyph), then hand-checked at the boundary.

## Naming rules (strict)
- `kebab-case`, lowercase, ASCII. **Semantic, never visual/positional** — no `device-1/2/3`, no `pin-1/2/3`.
- **One scheme** for file-types: `file/pdf.svg` (drop the duplicate `pdf.svg`/`file-png.svg` twins).
- **Variants as suffix:** `-marker` (map pin), `-solid` (filled), `-white` (on-dark). Never `.map.`/`.filled.`.
- **No color in name** — EXCEPT where color is domain-semantic (waste-stream bins: keep, but rename to the stream, see confirms).
- **Drop `-legacy`/`-old2`** deprecated duplicates unless you confirm a model still uses them.
- Tenant never in an icon name (tenant = theming). Only `logos/<tenant>/` and `illustrations/<tenant>/`.

## How each audit issue is resolved
| Issue | Resolution |
|---|---|
| Tiers jumbled | Split `icons/` (flat) vs `illustrations/` (detailed) by classifier |
| 20 bins in `vehicle/` | Move to `illustrations/bin/`; dedupe `black-bin` (was in both) |
| 10 identical groups | Keep one canonical, others become manifest aliases |
| file-type dupes (6×image, 4×doc) | One icon per real type in `icons/file/`, aliases in manifest |
| `device-1/2/3`, `poi-pin-1/2/3` | **Need your meaning** (see confirms) — else keep in `illustrations/` with a TODO |
| color-in-name | Collapse pure-color; keep waste-stream as semantic name |
| `-legacy`/`-old2` | Drop unless confirmed still-used |
| provenance | Regenerate `asset-provenance.csv` + a new `icons.json` manifest (name+variant+tier→path) so the resolver repoints cleanly |

## Deliverable of the refactor
1. Re-tiered, deduped, semantically-named `assets/` tree.
2. Regenerated `asset-provenance.csv` (old public path → new DS path, with aliases) — the migration lookup.
3. A fresh `icons.json` manifest (logical name + variant + tier → file) to replace `@manifest/icons.json`, so `resolveAppIcon('asset/tanker','map')` keeps working against the DS.
4. currentColor pass applied to the flat `icons/` tier only (illustrations keep palette; `status/` documented exception).

## Confirmations needed before I execute
1. **`device-1/2/3` and `poi-pin-1/2/3`** — what are they? (device types? pin color/priority?) Needed for semantic names.
2. **Waste-stream bins** — `black`/`green` = general/recyclable? Rename to stream (`bin-1.1cbm-general`) or keep the color word?
3. **`-legacy`/`-old2` vehicles** (~20) — drop as deprecated, or are old models still referenced?
4. **Flat vs detailed for the same concept** (e.g. a flat `vehicle-bus` glyph AND a detailed `bus` render both exist) — keep both tiers, or is one redundant?


---
**STATUS: EXECUTED 2026-07-03.** See README.md + asset-provenance.csv.
