# Shift Rostering — session handoff

Tadweer / Tajmee'e **Shift Rostering (Planning View)** prototype. Self-contained
single-file build plus its exported Figma assets and the FAMS V5 design tokens.

> **Why this folder exists.** The build previously lived in a session-scoped temp
> directory (`/private/tmp/claude-501/.../scratchpad/`) that a new session cannot
> see. Everything was copied here so it survives. All 44 asset references were
> verified present, and the folder was confirmed to serve standalone.

---

## 1. Run it

```bash
cd /Users/usmaninayat/Documents/GitHub/Claude/shift-rostering && python3 -m http.server 8797 --bind 127.0.0.1
```

Then open `http://127.0.0.1:8797/shift-rostering.html`.

**Note for a new Claude session:** the in-app preview server could not serve
from the home directory in the previous session — the sandbox returned 404 for
everything outside the scratchpad. If that recurs, copy this folder into the new
session's scratchpad and serve from there, or run the command above yourself in
a terminal. Append `?v=N` when reloading; the browser caches aggressively and I
twice nearly reported stale numbers because of it.

## 2. Files

| Path | What |
|---|---|
| `shift-rostering.html` | The whole build — markup, CSS and JS in one file |
| `fig/` | 48 SVG/PNG assets exported from Figma (they expire from Figma's CDN in ~7 days, so these local copies are the only source) |
| `v5/tokens/` | Copied from `v5-design-system-ai-main/src/tokens/` — `theme.css`, `tadweer.theme.css`, `fonts.css` + 12 Gilroy OTFs |

## 3. Design sources

| Figma file | Node | Used for |
|---|---|---|
| `bHPl5hXlBDrwgTY8ycV3IX` Tadweer Launch Pad | `6839:11041` | Main screen (side nav, header, KPIs, board) |
| ” | `6809:7115` | Status chips (Active / Resigned / Terminated / Doc Block / Cert Block) |
| ” | `6839:13169` | Cell detail popover |
| ” | `6824:11565` | Double-assignment cell (two compact cards) |
| ” | `6887:5841` | Replacement drawer |
| ” | `6891:8485` | Quick filters (4 × 200px dropdowns) |
| `lXBH6N7ZpHfBuY60tH71TD` Tadweer June Release | `2499:104333` | Replace Manually panel |
| `suo7zX7QrsiIeT57UV34yZ` FAMS Web Portal | `23846:4795` | System alert toasts |
| `W2z46FvC6aOdzOHDc3rqD5` FAMS V5 Launch Pad | `495:65817` | Action toast (with buttons) |

Requirements come from **`Tajmee'e_WFMC_BRD_v1.2`** (in `~/Downloads`), module 4
*Roster & Job Assignment* (FR-ROS). Rules referenced in code comments as ROS-02,
ROS-03, NTF-06, EMP-07, TRN-05, GEN-02.

## 4. What's built

- **Board** — 43 workforce rows × 7 days, own scroll region, sticky day header,
  frozen workforce column. Fixed capacity 6 shifts/person/week.
- **Drag and drop** reassignment using **pointer events** (not HTML5 DnD — see §6).
- **Rules engine** — hard refusals (ineligible / unavailable driver, double
  assignment, past day) vs approvals (weekly-off overtime, <11h rest, >54h week).
- **Conflicts** derived from roster state, never invented; each states its cause.
  Types: `ineligible`, `unavailable`, `fatigue`, `overlap`, `vehicle`.
- **Cell popover** with one-shared-function wording and a hover tooltip.
- **Resolve side sheet** ("Click to resolve") mirroring every flagged cell 1:1,
  per-card Approve (slides out) and Approve All (sequential, converges to 0).
- **Replacement drawer** and **Replace Manually** panel.
- **Toasts** top-right — success / warning / error / info + action variant.
- **Quick filters** (Shift / LOT / Workforce / Status) scoping board, KPIs,
  banner and panel together.
- **Week navigation**, opening on today; future weeks progressively empty
  (next ~35% drafted, then ~10%, then blank).
- **Publish** with unpublished-change counter and conflict-override toast.
- **Past days locked** — dimmed, undraggable, no conflicts, read-only popover.

## 5. Deliberate decisions (don't "fix" these unknowingly)

- **Sidebar gradient stops were measured, not copied.** Figma's export is
  non-monotonic (41.365 / 11.262 / 37.477 …) which CSS clamps into a hard band,
  and its endpoints are never reached inside the 52×1312 rail at 144.64°. The
  stops in `.rail-primary` were sampled off the rendered frame every 10% and
  match it with Δ=0. **The same bad stops are in
  `v5-design-system-ai-main/src/tokens/tadweer.theme.css` (`--sidebar-gradient`)
  and should be fixed there — still outstanding.**
- **`preserveAspectRatio="none"` stripped from every exported SVG.** Figma adds
  it; it stretches non-square art (`midday-shift` is 16×8.6, the logo 20×32.4).
- **Icons recoloured via `currentColor`**, not committed recolours — Figma bakes
  FAMS blue `#0072D6` into exports.
- **"Today" is hard-coded** `TODAY = new Date(2026, 0, 8)`. The sample roster is
  in January; the live clock would lock the entire board. **Swap for `new Date()`
  against real data.**
- **Weekday labels derive from the real date.** The Figma frame labels 6 Jan 2026
  as SUN when it's a Tuesday; that fiction breaks once the window starts mid-week.
- **`MIN_REST_HOURS = 11` is an assumption** — the BRD says "rest-hour
  violations" without a figure. 11h is the EU Working Time Directive number.
  **Confirm what UAE Labour Law / Tajmee'e manning contracts require.**
- **Relief pool of 13 standby staff** is sized against the conflict load per role
  per day so Approve All always reaches 0. Shrinking it reintroduces unresolvable
  issues.
- **Candidate tiering** in `findCandidate`: clean+free → clean → free → any.
  Approve All only auto-applies clean swaps, which is what makes it converge.
- **Avatar colours hash the name**, not the row index, so they survive re-sorting.
- **Solid avatar fills with white initials** are the user's explicit choice;
  white on the lighter accents is ~2:1 contrast (fine as an identifier beside
  the name, below WCAG for text).

## 6. Bugs found and fixed (regression risks)

1. `render()` regenerated `WEEKS` every call, silently discarding every drag.
2. Route/vehicle/sector were derived from **grid position**, so a dragged route
   renumbered itself. They now live on the assignment.
3. HTML5 drag-and-drop never worked — the cards contain `<img>`, which the
   browser hijacks into an image drag. Replaced with pointer events.
4. `issues.map(issueHTML)` passed the **array index** as `withFoot`, so the first
   panel card rendered with no footer (no Approve button).
5. Approve All churned 300 moves and left 25 issues — each move could create a
   fresh rest violation. Fixed by tiering candidates.
6. Moving a route off the double-assignment cell **destroyed the second route**.
7. Orphaned CSS from a removed rule broke the parser and silently discarded
   everything after it. There's a brace-balance check worth re-running:
   `python3 -c "..."` counting `{` vs `}` inside `<style>`.
8. `.alert`'s `display:flex` overrode the `hidden` attribute.
9. Temporal-dead-zone on `LOTS` — the whole script threw and the board rendered
   empty with placeholder KPIs, which *looked* fine.

## 7. Open items

- [ ] Fix `--sidebar-gradient` in the design system's `tadweer.theme.css` (§5).
- [ ] Confirm the **11h rest minimum** and the **54h weekly cap**.
- [ ] `HSE Cert Expired` is invented sample data — confirm the real certificate
      names, or rename to something less abbreviated.
- [ ] Plan name is still **"Dubai Mall Bin Collection Plan"** from the Figma,
      but the operation is Abu Dhabi (Musaffah / ICAD per the BRD).
- [ ] Quick filters are **44px** tall, the search box **40px** (each per its own
      node) — the row is 4px uneven. Pick one.
- [ ] Not built from FR-ROS: **daily job card** (ROS-04), **headcount planner /
      14-day coverage heat map** (ROS-06), **global search Ctrl+K** (GEN-01),
      **export set** Excel/PDF/CSV/print (GEN-02), **responsive** layout (GEN-04).
- [ ] Drag and drop is **pointer-only** — no keyboard equivalent.
- [ ] Vehicle-clash rule is implemented and unit-verified but **no data exercises
      it** (vehicle numbers never collide naturally).
- [ ] Role compatibility is coarse: any non-driver can cover any non-driver, so a
      Supervisor can be proposed for a Helper route. Needs the BRD's TRN-04
      competency matrix to do properly.
- [ ] The BRD prototype (Fig. 9) and the Tadweer Figma are **different visual
      designs**. Working assumption: Figma governs visuals, BRD governs
      behaviour. Confirm.

## 8. Vocabulary settled with the user

Unpublished (not unsaved) · Overtime (never "OT") · Fatigue / Insufficient Rest ·
Overlapping Shifts (not "double booked") · Reassign Route · Resolve Route
Coverage · Helper (there is no "Labour" role).

Badge tones: **red** = permanent exit (Resigned, Terminated) · **orange** =
recoverable (expiries, leave, rule breaches) · **green** = healthy.
