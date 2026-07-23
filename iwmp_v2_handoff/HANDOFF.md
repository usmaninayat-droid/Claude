# IWMP Driver App v2 — Prototype Handoff

> Session handoff so this work can continue on a new device / new Claude session.
> Everything here reflects the state of the interactive HTML wireframes as of this session.

---

## 1. What this is

We are building **v2 of the IWMP / Tadweer–Tajmee driver tablet app** as **interactive HTML wireframes** (clickable prototypes, not production code). The work is grounded in the 12 June 2026 R&D dossier ("IWMP: Driver Application Enhancements").

**Core reframe:** turn the driver app from an *enforcement tool* into an experience drivers prefer. Two design values run through everything:
1. **Minimise driver distraction** (NHTSA / CarPlay / Android Auto rules).
2. **Never assume the driver can read** → icon-first + audio (TTS) + colour, with text as a redundant layer.

**Device target:** landscape tablet, **1280 × 666 px**.

---

## 2. Files in this handoff

```
iwmp_v2_handoff/
├── HANDOFF.md            ← this file
├── launch.json           ← drop into .claude/ to serve the screens
└── screens/
    ├── checklist.html    ← pre-shift vehicle check  (served as index.html)
    ├── nav.html          ← in-cab navigation (CANONICAL nav screen)
    ├── nav-bottom.html   ← nav with a bottom action bar (SUPERSEDED — keep for reference)
    └── recap.html        ← daily performance recap (gamification)
```

Each screen is a **self-contained HTML file** (only external dependency is the Tabler icon web-font from jsDelivr CDN — needs internet on first load). Just open in a browser, or serve the folder.

---

## 3. How to run (IMPORTANT — macOS gotcha)

The dev server must NOT run from `~/Desktop` — macOS TCC blocks Python's `http.server` there (`os.getcwd()` → `Operation not permitted`). Serve from an unrestricted dir like `/tmp`.

**Quick start (any machine):**
```bash
mkdir -p /tmp/iwmp_preview
cp iwmp_v2_handoff/screens/*.html /tmp/iwmp_preview/
cp /tmp/iwmp_preview/checklist.html /tmp/iwmp_preview/index.html   # checklist as landing page
cd /tmp/iwmp_preview && python3 -m http.server 8137 --bind 127.0.0.1
```
Then open:
- Checklist — http://localhost:8137/index.html
- Nav — http://localhost:8137/nav.html
- Recap — http://localhost:8137/recap.html

**In Claude Code (preview tool):** copy `launch.json` into your project's `.claude/` folder, then use the `iwmp-preview` server. The config already `cd`s into `/tmp/iwmp_preview` before starting Python.

---

## 4. Screen-by-screen state

### 4.1 `checklist.html` — Pre-shift vehicle check
Purpose: driver inspects the vehicle before the shift; report faults with **zero typing**.
- 12 icon-first inspection tiles (tyres, lights, mirrors, brakes, oil, coolant, battery, wipers, horn, seatbelt, AdBlue, body). **Placeholder Tabler icons — final needs custom, driver-tested pictograms.**
- Tap a tile → focused **item sheet**: choose **OK** or **Report a problem**.
- Report flow (guided, no typing): pick a **pictogram** (Damaged / Leak / Not working / Warning light) → **severity** (Safe to drive / Do not drive) → **photo auto-captured** + optional **voice note**.
- **Severity drives the tile colour**: amber = drivable fault, **red = do-not-drive**. Ring + bottom CTA escalate (CTA becomes "Vehicle not safe — notify supervisor" in red if any do-not-drive fault).
- Progress ring, reported-issues review list, EN⇄عربي with full RTL mirroring, tappable TTS labels.

### 4.2 `nav.html` — In-cab navigation (the main screen)
Purpose: Google/Apple-Maps-style turn-by-turn for bin collection. **Map is the focus; overlays are deliberately compact.**
- **Full-bleed map** (schematic SVG — roads, parks, POI labels). Production = MapLibre Native + self-hosted Valhalla/OSRM (dossier §1).
- **Turn card top-left** (arrow + distance + street) with an attached **"Then …" next-maneuver** chip.
- **Floating round controls, right edge** (no docked rail): Messages (badge), 3D, recenter, day/night, mute, **Report pill**, **SOS** (red).
- **Info card bottom-left**: next bin + big distance + **side-of-street** ("On your RIGHT/LEFT"), and a footer with Offline-ready · ETA · **collection-progress bar**.
- **Collection progress expands IN-PLACE (upward, same card width)** when tapped — shows 200/37/40 breakdown, weight, bin types, waste type, "unlocks when stopped" note, and **End collection** (→ recap). It is NOT a full-width sheet.
- **Bin markers = v1 push-pin style, colour-only**: 🟢 collected · 🟠 collected off-plan · 🔴 to-collect (next = red, larger, pulsing ring). Truck = green disc + white arrow. Small map legend under the turn card.
- **Context switcher** (En route / At stop / To discharge) — top-center. This is a **prototype-only control**; in production it's an automatic GPS/speed state machine. "At stop" shows Collected/Skip/Blocked; "To discharge" hides bin totals.
- **Admin message** (Messages button): toast reads aloud via TTS + Acknowledge + preset replies (On my way / Delay 10 min / Can't reach it). §4.4 lockout-while-moving pattern.
- **"Go collect" missed-bin reroute**: redraws the route, flips side-of-street, updates the banner.
- 2D/3D tilt (stands in for the tablet's tilt sensor), day/night theme.

### 4.3 `nav-bottom.html` — SUPERSEDED
An earlier variant with the persistent actions on a bottom taskbar. Kept only for comparison — the floating-controls approach in `nav.html` replaced it (matches how CarPlay/Maps actually work). Do not build on this one.

### 4.4 `recap.html` — Daily performance recap (gamification)
Purpose: end-of-shift recap that motivates without backfiring (dossier §2).
- **Self-comparison, not ranking** ("today vs your usual"); **max 3 positive tiles**; icon-first + **voice-over** (auto-plays); **never red**; always **ends on a win**.
- Hero completion ring, 3 tiles (bins, safe-driving streak, missed), a compare bar, and a win banner.
- **"Preview: tough day" toggle** demonstrates the never-punish behaviour (poor day = neutral grey + encouraging line, no red, streak resets kindly).
- EN⇄عربي / RTL, replay-voice button. No leaderboards, no speed rewards, no pay coupling.

---

## 5. Locked design decisions

- **Primary green `#22C882`** (brand). Darker green `#0F6E56` for text/contrast on light backgrounds.
- **Light mode is the default.** Nav has a day/night toggle; night mode = dark map (Apple-Maps style).
- **Bin markers: v1 push-pin style, colour-only** — chosen for fidelity to the existing Figma v1 over the dossier's §2.5 colour-blind-safe advice. (See open item below.)
- Accessibility scale for the cab: **primary text ≥ ~32px, secondary ~16–20px, touch targets ~60–70px** — but kept **map-forward** (overlays compact so they don't cover the map).
- Nav uses **floating controls**, not a rail or bottom bar.
- Context switcher stays visible in the prototype but ships as an automatic state machine.
- Consistent card spacing: even vertical rhythm, one text size per meta-row.

---

## 6. Known caveats (simulated vs real)

- **Map is a hand-drawn SVG**, not a real map. Real build: MapLibre Native + Valhalla/OSRM/VROOM, Protomaps tiles (dossier §1 / §5).
- **3D tilt is a button**; production driven by device orientation / camera pitch.
- **TTS** uses the browser's `speechSynthesis`; production uses the app's bundled TTS.
- **Checklist icons** are Tabler placeholders — need custom, driver-tested pictograms (§2.5).
- **Photo capture** shown as "auto-added"; production opens the camera.
- Inspection items (12) and all numbers are sample data.

---

## 7. Open items / recommended next steps

1. **RTL/Arabic on `nav.html`** — checklist & recap have it; nav does not yet.
2. **Incident pictogram picker** — the flow behind the nav "Report" button (bin blocked / vehicle over bin / overflowing / hazard / road obstruction → auto photo + GPS + optional voice). Currently a stub.
3. **Discharge station detail** — expand the "To discharge" state (weight/ticket confirm, queue, checklist; totals surfaced here where relevant).
4. **Colour-blind-safe bins (optional)** — if driver testing flags it, add a small glyph inside the pin head (✓ / ○ / ✕) while keeping the push-pin shape. Currently colour-only by decision.
5. **Validate with real UAE drivers** before committing gamification & low-literacy choices (dossier says the evidence is directional, not settled).
6. Decide left-rail vs bottom-bar is already settled → floating. `nav-bottom.html` can be deleted once confirmed.

---

## 8. Source material & references

- **Dossier:** `IWMP_Driver_App_RnD_Dossier.md` (in `IWMP_Driver_App_RnD_Handover` on the original Desktop) — full research, §1 navigation, §2 gamification, §3 offline/sync, §4 in-cab UI/comms, §5 stack/roadmap.
- **Figma v1:** file `Tadweer - Tajmee Demo`, fileKey `padKKQEeRFlTpdnhARptXf`. Board is too large for `get_metadata` (times out) — screenshot specific node URLs instead. Nodes referenced this session: `2010-12158` (v1 "Bin Collection Ongoing" — source of the push-pin markers + legend), `4991-4229` (full board).
- Recommended stack (dossier): Valhalla · OSRM · VROOM · Ferrostar + MapLibre Native · Protomaps PMTiles · SQLite/Room + WorkManager outbox · shift-assignment login.

---

## 9. Prompt to resume in a new session

> I'm continuing v2 of the IWMP / Tadweer-Tajmee driver tablet app (1280×666 landscape). I have a handoff folder `iwmp_v2_handoff/` with `HANDOFF.md` and `screens/` (checklist.html, nav.html, recap.html, nav-bottom.html [superseded]). Read HANDOFF.md, then serve the screens from /tmp (NOT ~/Desktop — macOS TCC blocks python http.server there) on port 8137 using the included launch.json. Primary green is #22C882, light mode default, bins use the v1 colour-only push-pin style. Next I want to work on: [RTL on nav / incident pictogram picker / discharge detail].
