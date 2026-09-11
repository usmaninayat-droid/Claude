# Session Handoff — FAMS Bulk Upload Framework

Pick up here in a new session: read this file first, then continue.

## What this is

A single self-contained prototype file: **`bulk-upload-framework.html`** (repo root).
It's the FAMS V5 "Bulk Upload Assets" end-to-end flow, built to pixel-match Figma
and the local design system. Plain HTML/CSS/JS — no build step, no framework.

## The flow (all implemented & working)

A **modal overlay** (`BUA` JS object) launched from the Settings → "Bulk Upload
Configuration" screen via the "Configure new module" or a row's "Launch" button
(`onclick="BUA.open()"`). Four steps in a left stepper:

1. **Template & Upload** (`data-panel="1a"` empty / `1b` file-uploaded)
   - **Entity** dropdown must be chosen first; template cards, Format dropdown are
     locked (`.bua-locked`) until an entity is picked, and the Download Template
     button stays disabled (`.bua-download-btn`).
   - Format dropdown = functional (Excel/CSV), `BUA.selectFormat`.
   - Entity dropdown = `BUA.selectEntity` (Vehicles/Workforce/Zones/Routes/Contractors).
   - Dashed drop-zone with the exact Figma upload illustration; "Choose files" →
     `BUA.uploadFile()` swaps to the uploaded-file state (sheet.csv row).
2. **Field Mapping** (`2a` loading spinner → `2b` table)
   - Columns: Import · CSV Columns · System Columns · Status (Entity column was
     intentionally removed — entity is chosen up front).
   - All **38 CSV columns from `~/Downloads/assets.csv`** are rendered as rows; first
     6 are unmapped for prototype testing, rest auto-mapped. Metrics 38/32/6.
   - **System Columns** is an interactive dropdown (`BUA.openSysCol` /
     `BUA.selectSysCol`, fixed-position to escape table overflow) listing all 38
     vehicle columns; selecting flips the row to Mapped + updates metrics live.
3. **Validation** (`data-panel="3"`)
   - 6 metric cards, search, **Change Type filter** dropdown (`BUA.filterChange`,
     filters grid + updates count), Highlight Conflicts toggle.
   - Wide grid of rows with change-type chips (To Update/Create/Delete/Conflict/No Change).
   - **Smart Suggestions** (renamed from "AI"): amber chips (`.bua-ai-cell`) with an
     outline stars icon; a banner (`#buaAiBanner`) "N smart suggestions available"
     with gradient "Apply all" + Dismiss; hover/click a chip → popover with
     strikethrough diff + Accept/Ignore. Orange→yellow gradient identity from Figma
     Tadweer node `2227:74183`. Accept/ApplyAll flip values + decrement count.
   - **Conflict resolver** — click any red `.bua-cell-err[data-resolve=...]` cell to
     fix it inline. Three types:
       - `text` → open input (VIN, Plate Number, Registration Date, Connected Devices)
       - `select` → constrained options only (Vehicle Type: Car/Bus/Truck/Van)
       - `driver` → rich searchable **Select Driver** picker (avatars + `#`ID chip +
         Available badge), Figma Tadweer node `6519:6055`, wired to the "Assigned
         Driver" = "Ali Ahmad already assigned" conflict.
     Resolving replaces the cell with a green ✓ value and decrements the Conflicts metric.
4. **Summary** (`data-panel="4"`) — Updated/Created/Deleted tabs, results grid, Import button.

Two confirm dialogs: **Unmapped Fields Detected** (Validate step) and **Some Rows
Are Still Unresolved** (Preview step).

## How to preview (IMPORTANT — sandbox gotchas)

- Fonts (Gilroy, self-hosted at `assets/fonts/gilroy/`, relative `@font-face`) and
  relative assets only load over **HTTP**, not `file://`. The in-app Browser pane
  also sandboxes local files as `data:` URLs which breaks relative fetches.
- The Bash-sandboxed Python http.server **cannot serve the project dir directly**
  (PermissionError / 404). Workaround used this session: serve a **copy** from the
  session scratchpad.
- `.claude/launch.json` has a `claude-project` entry, BUT its directory path is
  hardcoded to THIS session's scratchpad UUID
  (`/private/tmp/claude-501/.../scratchpad/preview`) — **a new session must update
  that path to its own scratchpad**, then `cp bulk-upload-framework.html <that dir>/`
  after every edit and `preview_start({name:"claude-project"})`, navigate to
  `http://127.0.0.1:8792/bulk-upload-framework.html?v=N` (bump N to bust cache).
- The Browser pane viewport is ~800px wide; the drawer is 1200px, so screenshots
  look cramped/clipped — verify geometry with `getBoundingClientRect` in JS, not by eye.

## Sources of truth

- Design system: **`v5-design-system-ai-main 2/`** (token-only styling; components in
  `src/components/navigation/`, `primitives/select.tsx`, `primitives/switch.tsx`).
  Tokens in `src/tokens/theme.css`. Follows FAMS primary `#0072D6`.
- Figma file key `W2z46FvC6aOdzOHDc3rqD5` (FAMS V5 Launch Pad) — flow node `6347:2291`,
  side-nav `6347:5053`, settings-nav (file `YAQKW2IeJwKiLcyftTjcNj`) node `20:625`.
- Figma file key `lXBH6N7ZpHfBuY60tH71TD` (Tadweer) — Smart Suggestion badge `2227:74183`,
  Select Driver `6519:6055`.
- Downloaded Figma icon assets live in `assets/figma-sidenav/`, `assets/figma-settingsnav/`.

## Workflow conventions used this session

- Fetch Figma with `get_design_context` (load the `figma-design-to-code` skill first).
- Download exact icon/illustration SVGs from the Figma asset URLs and inline them
  verbatim (don't approximate).
- Icons using the shared `.ic` class need `style="fill:none"` (not `fill="none"` attr)
  because the global `.ic{fill:currentColor}` overrides the attribute.
- After each edit: sync the scratchpad copy, hard-reload with a cache-bust query.

## Likely next steps (not yet done)

- Wire the remaining Summary tab data / Import success state if needed.
- Any further pixel tweaks the reviewer flags on Steps 3–4.
- Consider consolidating the repeated inline SVGs into `<symbol>` sprites.
