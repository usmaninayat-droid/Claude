# UX Guideline: Text Truncation in Tables & Lists

**Status:** Draft — reconciled from stakeholder discussion, four items pending sign-off (see § Open items).
**Scope:** Any `@fams/ui-kit` composite rendering tabular or list data with fixed-width or width-constrained cells — `DataTable`, `TableCell`, list views, narrow list-beside-map panels.
**Source:** Synthesized 2026-09-03 from a discussion between Muhammad Shaheer (product, original guidance), Stakeholder 1, and Stakeholder 2. Visual companion: see the published Artifact linked from the PR/ticket that adds this doc.
**Implementation note:** `DataTable`/`TableCell` implement this rule set via per-column content types (fixed-length identifier / variable-length identifier / descriptive text) rather than a single generic "truncate" flag — each content type carries its own width, wrap, and truncation behavior per §1–§3 below. This doc and the component implementation are being kept in lockstep against the same reconciled rule set; treat a divergence between them as a bug in whichever side is stale.

**Implementation status (2026-09-03):** `column.contentType` (§1–§3), `layout="stacked"` (§5), column expansion (§7), and viewport-driven column hide order (§8) are all **implemented** in `packages/ui-kit/src/composites/DataTable.tsx`/`DataTable.types.ts` and demoed live in the showcase (`workshop/showcase/src/demos/DataTableDemo.tsx`, "Column content types" / "Column expansion" / "Responsive column behavior" / "Narrow layout" sections). See §7/§8 below for the exact API and the one deliberate scope cut (no automatic `layout="table"` → `"stacked"` handoff at a width threshold — see those sections).

---

## Headline principle

> A user must always be able to tell rows apart. A value may be shown incomplete, but the part of it that makes the row unique must stay visible.

Every rule below exists to protect this one property. When a rule and this principle conflict, the principle wins.

---

## The reconciled rule set

### 1. Fixed-length identifiers — never truncate

Plates, IMEI, VIN, device serials, and any other identifier with a known maximum length.

- Show the full value, always. No ellipsis, no wrap, no exceptions.
- Column width = the maximum code length for that field (measured in a tabular/monospace-safe way), plus standard cell padding.
- If the column doesn't fit, that is a layout problem to fix via § 4 (width priority) — it is never a truncation candidate.

*Unchanged from the original guidance — nobody proposed relaxing this, and no stakeholder pushed back.*

### 2. Variable-length identifiers — wrap first, middle-truncate only as a fallback

Asset names, driver names, and composite names some tenants build from both (e.g. `"Ahmed Al-Mansouri - Toyota Hilux 2023 - Fleet 7"`), where length isn't bounded.

- **Preferred treatment (adopted from Stakeholder 2):** wrap to a maximum of **2 lines** at a fixed max column width. This is now the primary treatment for this category — it directly answers the "vehicle name = identifier gets super long" problem without forcing columns to grow to accommodate the longest possible name.
- **Fallback, beyond 2 lines only:** middle-truncation — keep the start and the end, ellipsis in the middle. Never end-truncation for this category: the distinguishing part of an identifier-like name (a trailing fleet/unit suffix, a driver's surname) is as likely to live at the end as the start, so only middle-truncation reliably preserves uniqueness at both ends.
- A minimum column width still applies underneath the wrap, so two lines never degrades into one word per line.
- This still counts as "never truncate" in spirit for the common case — 2-line wrap covers the large majority of real names; middle-truncation is the rare escape hatch, not the default.

### 3. Descriptive text — end-truncation allowed, only with guaranteed full-value access

Addresses, notes, free-text fields — content with no uniqueness obligation.

- End-truncation (ellipsis) is allowed here, and only here.
- **Never truncate without access to the full value.** One gesture always resolves to the complete text:
  - **Desktop / pointer input:** hover tooltip. Also triggered on keyboard focus (tab to the cell) — this is an accessibility requirement, not optional polish.
  - **Touch:** tap to reveal.
- **Resolved open question:** full-value access is **not** mobile-only. The original guidance's "double-tap to expand on mobile" is preserved as the touch interaction, but desktop now gets equivalent, always-on access via tooltip/focus — every truncated value, on every platform, is one gesture away from its full text.

See § Tooltip spec below for the exact visual spec.

### 4. Width allocation priority

When a row's columns compete for space, allocate in this order:

1. **Fixed-content columns first** — status pills, speed, timestamps, counts — sized to their (bounded) content. Non-negotiable; these never truncate and never wrap.
2. **Identifier columns next** — fixed-length identifiers get their full required width (§1); variable-length identifiers get their wrap-capable width (§2).
3. **Descriptive-text columns absorb whatever remains.** They are the *only* column type allowed to truncate when space runs out — which is exactly when § 3 applies.

This directly answers Stakeholder 1's "vehicle name = identifier gets super long — just increase col width?" question: no — don't grow the column unboundedly. Give identifier columns priority over descriptive-text columns, but let them wrap (§2) rather than claim arbitrary width at the expense of everything else in the row.

### 5. Narrow panels (e.g., a list rendered beside a map)

**Recommended resolution:** below a defined width threshold, switch the row to a **stacked two-line layout** — identifier on line 1, secondary/descriptive fields on line 2 — rather than truncating harder to fit columns that no longer make sense side by side.

**⚠️ Open disagreement — not yet locked in.** Stakeholder 2 dissents: their position is that narrow panels should not get a special-cased row shape at all — apply the same rules uniformly (wrap identifiers per §2, truncate descriptive text with guaranteed access per §3) at any width, rather than switching to a different layout below a threshold. This document records stacked-rows as the current recommendation because it best protects the headline principle at very narrow widths (a single-line row with 3+ squeezed columns is where row-differentiation typically breaks first), but it is explicitly flagged for stakeholder sign-off, not silently decided. See § Open items.

### 6. Full-value access — one gesture, every truncated or wrapped-and-clipped value

Restated as a standalone rule because it's load-bearing for §3 and the middle-truncation fallback in §2: **no value is ever truncated without a one-gesture path to its full form.**

| Input | Gesture | Surface |
| --- | --- | --- |
| Pointer (desktop/web) | Hover | Tooltip |
| Keyboard | Focus | Same tooltip, triggered on focus (a11y) |
| Touch | Tap | Tap-to-reveal (inline expand or equivalent) |

### 7. Column expansion — implemented

The original guidance: on mobile, double-tap a column to expand it and see full values. Reconciled with Stakeholder 1's question ("why is this mobile-only?") by specifying an equivalent web interaction, not just carrying the mobile gesture forward as-is.

**Touch — double-tap:**
- Double-tap a column (header or cells) to expand it to its full-content width.
- Every other visible column compresses to its minimum width, in the same left-to-right order, to make room — none are hidden, only compressed (and still subject to its own §1–§3 `contentType` rule at that compressed width).
- Double-tap the expanded column again, or tap any other column, to collapse it back and restore the rest.
- Only one column is expanded at a time.

**Web — click-to-expand / drag-resize:**
- A small expand affordance at the column header edge (alongside the existing `ColumnCustomizer` "Columns" control) toggles the same expand/collapse behavior on click.
- Pointer users additionally get the standard drag-to-resize column border — expand-to-full-content is the one-click shortcut, drag is the fine-grained version.
- Same collapse rule as touch: expanding one column compresses the others rather than triggering the table's own horizontal scroll first.

**Implementation status:** both the double-tap gesture and the web expand/resize control are implemented in `DataTable` (`packages/ui-kit/src/composites/DataTable.tsx`/`DataTable.types.ts`), via a controlled `expandedColumnKey`/`onExpandedColumnChange` pair mirroring the existing controlled-prop pattern `selectionMode`/`selectedIds`/`onSelectionChange` already uses on the same component — omitting both props makes expansion a no-op, exactly like an unwired `selectedIds`. Touch double-tap detection (`useDataTableColumnExpansion.ts`) reads `PointerEvent.pointerType`, so it only ever fires for touch input — a mouse double-click on an arbitrary cell never expands anything; web/pointer users get a dedicated small header-edge toggle button (`DataTableColumnControls.tsx`'s `ExpandColumnToggle`, revealed on hover/focus like the existing sort-hint arrow) plus a drag-resize column-border handle (`ColumnResizeHandle`, following the APG "Window Splitter" pattern — `role="separator"`, keyboard-operable via arrow keys, not drag-only). Compression to each sibling column's floor width is driven by `contentType` (falling back to `column.minWidth`, then a generic floor) via `table-layout: fixed` — the EXPANDED column deliberately gets no explicit width so the fixed-layout algorithm hands it 100% of whatever the explicit-width siblings leave over, which is what avoids the table's own horizontal scroll. Drag-resize is local, uncontrolled UI state (no public resize callback — §7 only specifies the expansion pair) and is hidden while a column is expanded (a deliberate scope cut: combining live drag-resize with the "compress everyone else" state was out of scope for this pass — collapse first to fine-tune widths).

### 8. Mobile responsive column behavior — implemented

Below a defined viewport width, columns don't all fit — even before per-cell truncation kicks in. Which columns give way first follows the same priority as § 4 (width allocation), tied to `contentType`:

1. **Stays visible longest — `fixed-content` / `fixed-id`.** Status, speed, timestamps, plates, IMEI. Bounded width, carries the row's identity — hidden last, if ever.
2. **Hides next — `variable-id`.** Names, including long composites. Wraps to 2 lines (§2) as long as there's room; collapses/hides only once the fixed columns alone can't fit.
3. **Hides first — `descriptive`.** Addresses, notes. Already the only content type allowed to lose information (via truncation) at full width (§3), so it is also the first dropped from the column set entirely on a narrow viewport — its content is never load-bearing for telling rows apart (the headline principle).

A hidden column stays reachable through the existing `ColumnCustomizer` panel (`hiddenColumnKeys`/`onColumnConfigChange`) — narrowing the viewport changes the *defaults*, not what's possible to show. Below the width where even the surviving columns can't read as a row (e.g. a list beside a map), switch to `layout="stacked"` (§5) yourself at that breakpoint — see the Implementation status note below for why this handoff is deliberately caller-driven rather than automatic.

**How this interacts with § 7 (column expansion):** expanding a column draws from the same width budget responsive hiding manages — `useDataTableResponsiveColumns` computes its hide set from whatever is currently visible, so expanding one column and letting the rest compress to their floor (§7) is orthogonal to, and composes safely with, which columns are already auto-hidden at that width.

**Implementation status:** automatic viewport-driven hide order (steps 1–3 above) is implemented (`packages/ui-kit/src/composites/useDataTableResponsiveColumns.ts`) — it measures the table's own scroll container via `ResizeObserver` (not the raw window viewport, so it composes correctly inside a fixed-width card or split panel) and hides columns by `contentType` tier, never touching `fixed-id`/`fixed-content` or a column with `isHideable={false}`, and always leaving at least one column visible. It is a DISPLAY-ONLY filter layered ON TOP of the existing explicit `hiddenColumnKeys`/`ColumnCustomizer` model rather than folded into it — a column this hook hides is still "visible" in that model, so an existing consumer's explicit hide/show state is never mutated by viewport width, and hiding a lower-priority column explicitly via the customizer is what frees space for an auto-hidden one to reappear. Defensive under environments with no real layout (SSR, `jsdom` in unit tests): an unmeasured (`0`) container width hides nothing, matching the same "not yet measured" convention `dataTableCellText.tsx`'s `VariableIdentifierText` already uses.

One piece is a deliberate scope cut, not an oversight: the automatic `layout="table"` → `layout="stacked"` handoff described above is **not wired**. `layout="stacked"` itself is still an open stakeholder disagreement (§5, Open item 1) — auto-switching INTO a still-disputed layout, and doing so by overriding a caller's own explicit `layout` prop, would both prejudge that open question and violate the state-agnostic/no-surprise-behavior contract every `@fams/ui-kit` composite follows (a component reacting to viewport width by silently ignoring an explicit prop is exactly the kind of behavior the DS asks callers to opt into, not have chosen for them). A caller can already flip `layout` at any breakpoint of their choosing today — that remains the supported path until §5 is resolved.

---

## Tooltip spec (desktop / pointer + keyboard focus)

Uses the existing `@fams/ui-kit` `Tooltip` / `TooltipContent` primitive (`packages/ui-kit/src/primitives/Tooltip.tsx`) as-is — no new component or token is needed.

- **Surface:** `bg-foreground` fill, `text-background` text (inverted pill relative to the page) — light theme: `#101828` fill / `#f9fafb` text; dark theme: `#f9fafb` fill / `#101828` text.
- **Shape:** `rounded-sm` (4px), pointing arrow (12×8) toward the trigger cell, `sideOffset` 6px.
- **Type:** `text-xs` / `font-medium`; a secondary line (`TooltipSupport`) at reduced emphasis is available for a two-part hint if ever needed (e.g. full address + a distance/geofence note), but the default case is a single line of full text.
- **Padding:** `px-2.5 py-1.5` (10px / 6px).
- **Elevation:** `shadow-elevation`.
- **Stacking:** `z-tooltip`.
- **Timing:** 200ms hover delay (`delayDuration`) before showing; fade + zoom in/out on enter/exit (~150–200ms, `duration-fast`/`duration-normal`).
- **Touch equivalent:** the same visual surface, tap-triggered instead of hover-triggered, dismissed on tap-away or a second tap.

## Mobile/touch spec

- Tap the truncated cell to reveal the full value (inline expand within the row, or the tooltip surface above rendered as tap-triggered). Tap away or tap again to collapse.
- This preserves the original guidance's mobile interaction; it is additive to, not a replacement for, desktop hover/focus access (§3, §6).

---

## Open items — need explicit stakeholder sign-off

1. **Narrow-panel row shape (§5).** Stacked two-line rows (recommended, and implemented behind `layout="stacked"`) vs. Stakeholder 2's "no special case, apply the same column rules everywhere." Needs a decision — the component itself flags this in code as still under stakeholder debate.
2. **Wrap/truncation threshold.** The original draft used a 24-character trigger for variable-length identifiers. Character count is font- and script-dependent (Arabic/Latin mix, Gilroy metrics) — recommend re-specifying the threshold as a pixel max-width at the relevant type scale rather than a character count, validated in a design QA pass.
3. **Does middle-truncation ever actually fire?** Needs a quick audit of production vehicle/driver-name lengths to confirm 2-line wrap covers the large majority of real data, so the middle-truncation fallback in §2 stays a rare escape hatch rather than a frequently-hit path.
4. ~~Column expansion (§7) and viewport-driven column hide order (§8).~~ **Resolved — implemented** as the controlled `expandedColumnKey`/`onExpandedColumnChange` pair (§7) and `useDataTableResponsiveColumns` (§8). Two narrower follow-ups remain open, tracked here rather than as new top-level items: (a) the automatic `layout="table"` → `layout="stacked"` handoff at a width threshold is intentionally NOT wired — see §8's Implementation status note for why; and (b) there is no dedicated "force-show below floor width" override for a column `useDataTableResponsiveColumns` has auto-hidden (freeing space by explicitly hiding a lower-priority column via the customizer is today's only way to bring it back).

---

## Summary table

| Content type | Treatment | Full-value access required? |
| --- | --- | --- |
| Fixed-length identifier (plate, IMEI, VIN) | Never truncate; column = max code length | N/A — always shown in full |
| Variable-length identifier (vehicle/driver name) | Wrap to max 2 lines; middle-truncate only beyond that | Yes, if middle-truncated |
| Descriptive text (address, notes) | End-truncate allowed | Yes, always — hover/focus (desktop), tap (touch) |
