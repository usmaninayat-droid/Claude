# Interaction QA contract

**Rule: every visible affordance must do its self-explanatory thing.** The interaction-gate agent drives the LIVE app with Playwright — it never judges from screenshots.

## Per-screen checklist

For each affordance enumerated in the screen's SPEC.md interaction section:

| Affordance | Must verify |
|---|---|
| Button (incl. header pencil, "+", Create) | Click → observable state change (dialog, drawer, edit mode, navigation). Silent no-op = P0. |
| Dropdown / select / group-by / status change | Opens on click, options render, selecting an option updates the UI, closes on outside-click and Escape. |
| Edit affordance | Enters an editing state (input/inline editor appears), a change can be made and persisted or cancelled. |
| Tabs (view tabs, record tabs, detail tabs) | Each tab switches content; active styling moves; no console errors on any tab. |
| Search box | Typing filters/updates results (or visibly triggers search); placeholder matches spec. |
| Checkbox / row select | Toggles; header checkbox selects all. |
| Drawer / side sheet / modal | Opens, scrolls internally if content overflows, closes via X, scrim click, and Escape. |
| Kanban card / list row | Click opens the record; drag between columns updates status (if spec'd). |
| Scroll regions | See scroll assertions below. |
| Form (create sheet) | Fill required fields → submit → record appears in list/board; validation on empty submit. |
| **Detail side sheet (any flavor)** | See the side-sheet contract below — mandatory for every screen whose records open a detail sheet. |

## Side-sheet contract (PLATFORM-MODEL.md doctrine — mandatory for any detail screen)

One `DetailSheet` serves every detail flavor, so these are engine behaviours, not
per-module styling. For any screen whose records open a detail sheet, verify:

1. **The CORRECT flavor opens.** A pipeline record opens **Task Detail**; an entity
   record opens **Entity Detail**. A wrong flavor is a *classification* bug — the
   module is wired to the wrong engine — not a styling nit. Report it as P0.
2. **It opens over the side**, and **expands from the bottom to full height** when
   the expand affordance is used.
3. **Linked-record navigation STACKS.** Open a linked record from *inside* an open
   sheet: a **new sheet must stack on top** (top comes over). It must NOT replace
   the current sheet's content, and must NOT navigate the page away. Verify this
   **across modules** (e.g. an entity linked from a pipeline record), since the
   whole point of the contract is that any linked record is reachable from any
   other.
4. **Minimize and close-all behave identically everywhere** — the same gestures,
   the same result, regardless of which module or flavor the stack was opened from.
   Closing the top sheet returns to the one beneath it, not to the bare page.

Assert on the *stack*, not just on "a sheet is open": count the mounted sheet
layers before and after opening a linked record. A gate that only checks a sheet
exists will pass a sheet that silently replaced its parent — which is the exact
failure this contract exists to catch.

## Scroll assertions (the class of bug that keeps recurring)

For every container that CAN overflow (tables, kanban lanes, drawers, detail panes):

```js
const el = page.locator('[data-slot="…"]'); // or role/table selector
const m = await el.evaluate(e => ({
  sw: e.scrollWidth, cw: e.clientWidth, sh: e.scrollHeight, ch: e.clientHeight,
  ox: getComputedStyle(e).overflowX, oy: getComputedStyle(e).overflowY,
}));
// If content exceeds the box, the box itself must scroll:
// m.sw > m.cw  ⇒ m.ox must be 'auto'|'scroll'  (inner horizontal scroll — NEVER crushed columns, NEVER body-level x-scroll)
// m.sh > m.ch  ⇒ m.oy must be 'auto'|'scroll'
// Then actually scroll and assert scrollLeft/scrollTop changed:
await el.evaluate(e => { e.scrollLeft = 500; });
```

Also assert `document.documentElement.scrollWidth <= window.innerWidth` — the page body must never scroll horizontally.

## Global assertions per screen

- Zero console errors/warnings-as-errors across the whole interaction pass (attach `page.on('console')` / `page.on('pageerror')` from the start).
- Repeat the full pass at 1440×900 and 1280×800 (density changes expose overflow bugs the design width hides).
- After every interaction, screenshot on failure only (keep artifacts small): `qa/artifacts/<screen>-<affordance>.png`.

## Report format (`qa/<screen>-round<N>-interaction.md`)

One line per affordance: `PASS`/`FAIL` + selector + what happened. FAILs carry severity (P0 = affordance does nothing / crashes; P1 = wrong behavior; P2 = nit) and a repro snippet. End with the console-error count and the two viewport results. No prose beyond that.
