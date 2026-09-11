# Icon & Vector Verification — `icons.zip` vs `assets/`

> Verified 2026-06-11. Uploaded set: **83 SVGs** under `icons/fams/`.
> Existing library: **1,338 SVGs** under `assets/icons/**` + `assets/vectors/**`.

## Verdict

The uploaded **FAMS domain icon set is valid and well-organized** — all 83 parse,
clean naming, sensible per-family taxonomy. It fills the empty
`packages/icons/fams/` placeholder in the kit. **One material caveat:** like the
entire existing asset library, these icons are **hardcoded-color, not
`currentColor`** — they will not recolor via CSS or per-tenant theming. That's a
library-wide property, not a defect in this upload, but it matters for the
white-label model. Three filename spelling fixes and a delimiter inconsistency
are the only cleanups needed.

## What the upload contains

83 new "FAMS domain" icons in six prefix families (none of which existed in
`assets/icons/` before — this is a net-new set):

| Family | Count | What they are | Canvas (viewBox) |
|---|---|---|---|
| `event-` | 30 | Telematics/state events (idle, overspeed, fuel_drop, zone_in…) | mostly 14×14 |
| `poi-` | 22 | Map point-of-interest pins (hospital, mosque, fuel-station…) | 48×69 (tall marker) |
| `file-` | 11 | File-type badges (pdf, docx, xlsx, mp4…) | 30×28 |
| `vehicle-` | 10 | Vehicle illustrations (car, bus, tanker, scooter…) | varied ~30–70 wide |
| `device-` | 6 | IoT device illustrations (tracker, temperature_sensor…) | large, each unique |
| `status-` | 4 | Map state markers (moving, idle, stopped, default) | 141×140, drop-shadow |

These map directly onto the business logic in the core docs — `event-*` mirrors
the Events engine, `status-*` mirrors Live Monitoring states, `vehicle-/device-`
mirror the telematics asset/device model.

## Verification results

**Validity — PASS.** All 83 uploaded SVGs are well-formed XML, all have a
`viewBox`, no duplicate basenames. (Also re-checked the existing library: all
1,338 parse OK — an earlier "malformed" sweep was a false alarm from spaces in
folder names.)

**Naming — GOOD, 4 small issues.**
- Clean, no spaces/uppercase/parentheses (much better hygiene than the existing
  library — see below).
- *Spelling:* `event-harsh_breaking` → should be **braking**; `poi-resturant` →
  **restaurant**; `poi-firestation` → **fire_station** (consistency).
- *Delimiter drift:* `poi-` uses hyphens inside the descriptor (`poi-bus-stop`)
  while `event-/file-` use underscores (`event-bin_collection`). Pick one.

**Geometry — per-family, not a unified grid.** Each family is internally
consistent but canvases differ widely (14×14 events vs 141×140 status markers vs
48×69 pins). Reasonable for mixed illustrations + markers, but means you can't
assume a single box size — size each via its own intrinsic `width/height` or set
explicit dimensions per family when rendering inline.

**Color / theming — the headline finding.**
- **0 of 83 use `currentColor`.** 82 use hardcoded hex; the last
  (`event-black_spot`) uses `fill="black"` — still hardcoded.
- Color complexity by family: `vehicle-` ~181 distinct colors (detailed
  illustrations), `event-` 28, `device-` 24, `poi-` 22, `file-` 8, `status-` 4.
- Implication: these are **illustrative/semantic colored assets**, not monochrome
  UI glyphs. `status-`/`event-` icons carry meaning in their color (idle = amber
  `#9B7200`, etc.), but because color is baked in, recoloring for a tenant means
  editing the SVG, not setting a CSS variable.
- **This is consistent with the whole library** — sampled existing icons are also
  hardcoded (e.g. arrows use `fill="#101828"`), 0% `currentColor`. So the upload
  doesn't introduce a new problem; it inherits the existing one.

**Figma export artifacts.** 32/83 carry `clipPath` wrappers and 26/83 carry
`<filter>` drop-shadows with Figma-generated IDs (e.g. `clip0_1064_1581`). Not
broken, but un-optimized — a pass through SVGO would shrink them and de-risk
duplicate-ID collisions if multiple icons are inlined into one DOM.

## Relationship to existing assets & the kit

- **Fills a known gap:** `packages/icons/fams/index.ts` is currently an empty
  placeholder (`export {}`, comment "populated by the asset-extraction
  subagent"). This upload is exactly that content.
- **Overlaps existing vectors:** `assets/vectors/vehicle/` (62 files) and
  `assets/vectors/file type/` (43) already cover vehicles and file types in a
  nested `Asset Icons/List|Map/` structure with spaces + Capitalized names. The
  uploaded `vehicle-*`/`file-*` are a flatter, cleaner-named, smaller curated
  subset — decide whether they supersede or supplement the nested vectors.

## Existing-library naming hygiene (flagged for cleanup)

The current `assets/` tree is import-hostile: **374 paths contain spaces**,
**109 contain uppercase**, **4 contain `&`** (e.g. `alerts and feedback/`,
`vehicle/.../Asset Icons/Map/Car.svg`, `custom/bulky & green-waste...`). These
must be slugified before they can be referenced from code/import paths. The new
`fams/` set is the model to follow.

## Recommended next steps

1. Fix the 3 spellings + standardize the descriptor delimiter (suggest hyphens throughout).
2. Decide on theming: keep multi-color illustrations as-is for `vehicle/device/poi/file/status`, but consider a **`currentColor` monochrome variant** for the small `event-*` state glyphs so they can tint per context.
3. Run SVGO on all 83 (strip Figma clip/filter IDs, round coordinates) before committing.
4. Place under `assets/icons/fams/` and generate the `packages/icons/fams/index.ts` barrel.
5. Separately, slugify the 374 space/uppercase/`&` paths in the existing library.
