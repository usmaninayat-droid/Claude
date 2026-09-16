# Run: Contract Management — pixel-perfect rebuild to Figma (2026-09-16)

## Mission
Rebuild the IWMP **Contract Management** flow so it is pixel-identical to Figma
"Tadweer — June Release" section `3215:4609` (file `lXBH6N7ZpHfBuY60tH71TD`),
fully functional, using DS assets (tokens/theme/utilities CSS, Gilroy, Figma-exact
icon glyphs). Designer's words: "components, icons and fonts are not same … copy
figma pixel perfectly and use component from DS where needed … fully functional".

## Architecture decision (stated to designer, not objected)
Contract Management is wired as a **bespoke iframe screen**
(`fams-v5-demo-environment-main/app/public/screens/contract-management/index.html`,
swapped in by `app/src/demo/seams.tsx` → `contract-management-module.tsx`).
We rebuild THAT screen — keep its JS data + state machine (list · 10-step wizard ·
pickers · KPI editor · summary · detail), rewrite markup/CSS to Figma measurements,
replace FontAwesome with an inline SVG sprite of Figma-exported glyphs, consume DS
CSS via the `/fams-design-system/` symlink: `packages/tokens/fonts.css`,
`dist/theme.css` (+ `dist/tenants.css` for `data-tenant=iwmp` primary green),
`dist/utilities.css` (exact DS Tailwind classes), `dist/tokens.css`.
NOT doing the parity-loop's metadata re-architecture (30-screen bespoke wizard →
generalized DS components would be a multi-day rewrite fighting pixel-perfect).
Workspace differs from the skill's canonical layout: single git repo mirror, dirs
suffixed `-main`, no `design-master` branch → commits land on `main` (per handoffs).

## Figma inventory (canvas order) — file lXBH6N7ZpHfBuY60tH71TD
| Screen | Node | Size | Notes |
|---|---|---|---|
| List | 2111:10733 | 1920×1080 | card grid + 5 KPI tiles + toolbar |
| Wizard · Basic Info | 2111:1925 | 1920×1080 | overlay: rail 325w + content |
| Wizard · Zone Selection | 2111:2185 | 1920×1080 | map + zone chips |
| Wizard · Add Vehicle | 2111:2302 · 2111:2867 | 1920×1080 | empty state · picker/config |
| Wizard · Add Equipment | 2111:2980 · 2111:3157 | | |
| Wizard · Add Workforce | 2111:3261 · 2111:3440 | | |
| Wizard · Add Bins | 2111:3537 · 2111:3690 | | |
| Wizard · Services & Freq. | 2111:3933 · 2111:3808 | | |
| Wizard · KPI Targets | 2111:4159 (1920×1377) · 2111:4565 | | Fixed/Yearly/Manual |
| Wizard · Attachments | 2111:4484 | | |
| Wizard · Summary | 2111:4992 | 1920×2472 | long scroll |
| "Create New Field" sub-section | 2738:6142 | 8633×2074 | picker/config/error sub-states |
| Contract Details | 2303:2988 V5 (1440×3231) · 2303:3679 V6 · 2303:4514 V7 (1440×1024) | | pick version w/ designer |

## Design language (from Basic Info spec 2111:1925)
Gilroy — Bold 24 (rail title) · SemiBold 18 (section title) · SemiBold 16/14 ·
Medium 14 (body/inputs) · Bold 10 tracking .5 (STEP labels). Borders #d0d5dd
(neutral-300), required * #f04438, muted #98a2b3 (neutral-400). Radii: 4 (inputs/
buttons), 2, 8 (overlay), full (step markers). Inputs 56h, buttons 48h, form gap 24.
Icons (Untitled UI names): truck-02 tool-02 users-02 trash-03 target-04 user-03
marker-pin-04 attachment-01 calendar list align-left coins-hand x chevron-down.
Assets downloaded → `assets/icons/`. Spec code → `specs/basic-info/figma-code.tsx`.

## Waves
1. Foundation: run folder ✔ · icon sprite from Figma assets · DS CSS links · base
   typography/colour classes mapped to DS utilities.
2. List screen (2111:10733): toolbar · KPI tiles · card anatomy · grid.
3. Wizard shell: overlay, rail/stepper, header, footer, close ×.
4. Wizard steps 1–2 (Basic Info form, Zone map).
5. Picker steps 3–7 (empty state · picker sheet · config cards) + "Create New Field".
6. Services & Frequencies · KPI Targets · Attachments · Summary.
7. Contract Details (confirm version) — hand-drawn SVG charts to match Figma.
8. Gates per screen: visual (side-by-side vs specs/*.png) + interaction (every
   affordance clicked in the live app at :6300) → commit per green wave.

## State log (append-only, newest last)
- 2026-09-16 · Phase 0: read Figma section inventory (34 nodes), current index.html
  (1003 lines, JS 309–1001), DS asset paths; anchors list + basic-info specs pulled;
  icon assets + reference shots downloaded. Next: list sub-node specs (card/KPI/
  toolbar), then Wave 1–2.
- 2026-09-16 · Specs complete for list (toolbar 2111:10812, KPI tile 2111:10846, card 2111:10888 → specs/list/SPEC.md) + basic-info. 29 Figma glyphs downloaded → assets/icons, normalized to currentColor → assets/sprite.html. Gate note: `scripts/require-link-mode.mjs` absent in this mirror; link mode confirmed via app/public/fams-design-system symlink + `ds-consumption --status`. Iframe constraint: wizard overlay can only cover the iframe (content) area, not the app's nav rails — known deviation from Figma's full-screen overlay. Next: KPI-row + Zone specs, then write new index.html (waves 1–4a).
- 2026-09-16 · KPI-row + Zone specs done (→ specs/wizard/SPEC.md); zone map/polygon/layers assets + 11 more glyphs downloaded; sprite rebuilt. Next: read old CSS (carry-forward for un-rebuilt steps) → write new screen as index.html + cm.css + cm.js (waves 1–4a).
- 2026-09-16 · WAVES 1–4a WRITTEN: screen split into index.html + cm.css + cm.js + assets/{icons.svg,zone-map.png,zone-polygon.svg,layers-thumb.png}. List, wizard shell/stepper, Basic Info, Zone rebuilt to Figma; pickers/service/KPI/attachments/summary/detail carried forward with sprite icons (re-skin waves 5–7). FontAwesome removed. Next: visual + interaction gate in the live app (:6300/contract-management?tenant=iwmp&persona=u_admin) vs specs/list.png, basic-info.png, zone.png.
- 2026-09-16 · Gate 1 (list, 1920 viewport): fonts/sizes/colours on spec; kpi/card 2px tall → inset ring fix applied. Console: stale Vite HMR chunk errors from earlier DS rebuilds → .vite cleared, dev server restarting. shoot.mjs (Playwright, 1920×1080, wizard walk + errors) written. App rail here is 46px (no secondary tab rail) vs Figma 118 — shell difference, screen fills its container correctly.
- 2026-09-16 · Gate 2 (Playwright 1920×1080, fresh server): 0 console errors; search→1 card; 10 step labels OK; picker→2 cfg cards. 14 shots in qa/. Reviewing list/basic/zone vs Figma next.
- 2026-09-16 · Gate 2 visual review: list/basic/zone match Figma on layout/type/colour/spacing. DEFECT: all glyphs rendered as solid black (fill=none was on the dropped root <svg>) → symbols now carry fill="none"; icons.svg regenerated. App-shell deviations (not the screen): primary rail 46px vs Figma 118 (no secondary tab rail); top bar lacks the 'List View | +' tab strip (composer ModuleView bypassed by the iframe route).
- 2026-09-16 · Icon fix re-shot: 0 errors. Wave 5 specs: header row 2111:2381 · empty state 2111:2388 · picker 2111:2451 (saved) · config card 2111:2952; empty-state art + vehicle mini-icons to be captured as PNG (multi-fragment vectors).
- 2026-09-16 · Waves 1–4 visually green (icons outline OK). Art captured → assets/art (empty-vehicles 242×193, veh-* 30×16). Wave 5a (vehicles picker/empty/config) re-skin applied next; commit after its gate.
- 2026-09-16 · Wave 5a (vehicles) re-skinned + art published; shoot 0 errors. Equipment 2111:2980: art node 2111:3060 (208×193), row icons 2111:3116/3122/3128 (20×20 raster). Popup 356×432 @(1026,69). Labels: 'Ride-On Precinct Vacuum Sweeping Machines'.
- 2026-09-16 · Wave 5a review: empty block must centre in Figma's fixed 774 body; bold tick for checkbox (check-bold symbol); popup right 30. Equipment art + 3 row icons published. Workforce: art 2111:3336, person icon 2111:3399 (26×20), popup has search. Bins: art 2111:3604, popup no search/no icons, title only.
- 2026-09-16 · All picker-step art published (vehicles/equipment/workforce/bins + row icons). Empty art now natural size. Next: extended shoot (all pickers) → review → commit waves 1–5 → Wave 6 (services/KPI/attachments/summary).
- 2026-09-16 · Wave 5b shot clean (0 errors). Wave 6 geometry captured → specs/wizard/wave6.md; fetching card/pill design_context + services art. Then: commit waves 1–5, build wave 6.
- 2026-09-16 · COMMIT waves 1–5. Wave 6 glyphs (plus-square, clock-fast-forward, chevron-selector-vertical, clock, tag-01, target-03, trend-up-01, sparkle) + services art published. Applying Wave 6 re-skin (service cards, KPI cards, hint pill).
- 2026-09-16 · Sprite: generic g-ids now fall back to filename (i-sparkle, i-group1000002614). Attachments/Summary references saved. Wave 6a code applied (svc cards, kpi cards, hint). Next: extended shoot → review → wave 6b (attachments, summary).
- 2026-09-16 · Summary metadata saved → specs/wizard/summary-metadata.xml; outline extracted. Attachments 2111:4484 measured (header 40h, dropzone 54h, rows 80h p20, PDF glyph 40×40 node 2111:4532).
- 2026-09-16 · Attachments assets (upload-cloud-01, pdf.png) published; wave 6b (attachments) re-skin applied. Shoot failed at services picker → wrapping in try/catch to surface the console error.
- 2026-09-16 · Summary outline: header 42h; sections label 14 @y16 + content @y36/46, block gap 20; tables p16, header 32h, rows 58h; services rows 40h w/ tag chips; attachments 2×659×80 gap 40; footer Create 232×48.
- 2026-09-16 · Wave 6 (services cards, KPI cards + hint pill, attachments) and Wave 6c (Summary 2111:4992: bordered sections, kv grid, 400h map, `.stbl` tables, tag chips, attachment cards) verified at 1920 — gate green, 0 console errors. Root cause of the earlier picker timeout: `openPicker` read `draft[key]` but the services draft lives at `draft.services` → TypeError; fixed via `draftItems()`. Next: Wave 7 Contract Details (version TBC with user).
- 2026-09-16 · Wave 7 — Contract Details rebuilt to Figma 2303:2988 (V5 dashboard) + 2303:3679 (Timeline drawer, opened from the activity button) + 2303:4514 (Raw Data drawer, opened from the vehicle/workforce/equipment/plans tiles). Chart.js removed; all charts are hand-drawn SVG (gauge, daily line+area, target-vs-achieved bars, stacked service bars, 5-series line, donuts). Gate green at 1920: 0 console errors, timeline comment posting + raw-data search verified. Specs in specs/detail/ (v5/v6/v7 metadata xml + chart reference PNGs). Run complete — see MORNING-REPORT.md.
- 2026-09-16 · Wizard steps "Add Bins" + "Service & Frequency Selection" replaced by one "Service Lines" step (Launch Pad 7205:11761): card per service line — Bin Type / Required Quantity / Waste Type · Action / Frequency / Collection-days pills; header "Add Service" opens the existing service picker; Summary now has a single Service Lines table. Rail keeps Figma numbering (STEP 8, no 7). Gate green. Spec: specs/service-lines.png + specs/wizard/service-lines-figma-code.tsx.
