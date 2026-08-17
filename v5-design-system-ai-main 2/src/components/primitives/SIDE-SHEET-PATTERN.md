# Side Sheet & Creation Form — Figma Chassis Spec

**Walked:** 2026-06-08 (Run 5 — fresh from Figma DS V2 file `4FS7S3tHKzZZpdFBA0aGkt`).
**Figma source:**
- **Side Sheet** standalone component — node `5246:10804`, page Widgets (`915:21`).
- **Creation Form** standalone component — node `5246:9822`, same page.

Both components were previously undocumented as Figma sets and treated as kit
inventions. They exist as proper components in DS V2 — this doc captures their
specs so the kit's `<Sheet>` (Radix dialog wrapper) and `<Drawer>` (vaul wrapper)
implementations stay aligned.

---

## 1. Side Sheet (entity detail) — `5246:10804`

The right-side detail panel that opens when a user clicks an entity record (Pattern #17).

### Frame
- Canvas: 1400 × 1080 (rendered full-bleed in the design — the panel takes the
  whole right area; the underlay scrim sits on the parent frame at runtime).
- Corner radius: **0** (full-height bleed against viewport edges).
- Fill: `Surface/Primary` → `#FFFFFF` (bound variable).
- Drop shadow (matches `--elevation-xl`):
  - `0 8 8 -4 rgba(16, 24, 40, 0.03)`
  - `0 20 24 -4 rgba(16, 24, 40, 0.08)`

### Layout — vertical stack, 0 padding, 0 item-spacing
```
┌───────────────────────────────────────────────┐  48px Top Navbar
│  [✕]  │  Tab pill │ View tabs │ … │   [✕]   │  (close left + secondary tabs + close right)
├───────────────────────────────────────────────┤
│ Profile │            Main Content             │
│  (320)  │  ┌───────────────────────────────┐  │
│         │  │ Switch Tabs (32 px)           │  │
│         │  ├───────────────────────────────┤  │
│         │  │ Container (vertical, gap 16)  │  │  ← 5 child slots
│         │  │   • body slots                 │  │
│         │  └───────────────────────────────┘  │
└─────────┴─────────────────────────────────────┘
```

### Top Navbar (48 px height)
- Horizontal auto-layout, no padding, no gap.
- Left cluster: 88 × 48 "Tab" frame holding the close X (16 px icon, 24 px h-padding).
- Right cluster: 508 × 48 "Row" with secondary nav tab items (`_2nd Top NavBar Tab Items`)
  and a 48 × 48 trailing button (corner radius 4).

### Profile pane (320 px fixed width)
- Vertical auto-layout, padding `16 / 16 / 16 / 16`, gap `16`.
- Content order:
  1. Avatar (288 × 288 square with 24 px inner padding).
  2. `ID Tags` slot — vertical, gap 12.
  3. `Details` slot — vertical, gap 8.

### Main Content pane (flex = remaining width)
- Vertical auto-layout, padding `24 / 24 / 24 / 24`, gap `24`.
- Top: `Switch Tabs` instance (32 px height, horizontal, gap 24).
- Body: `Container` frame — vertical, gap 16, holds 5 body slots.

### Kit mapping
- Primitive: `@fams-v5/ui/primitives/sheet.tsx` with `side="right"`.
- Chassis: `packages/modules/src/entity/EntityDetailSheet.tsx` — currently uses
  `width="900px"`. **Pattern #17 spec says 1000–1100 px; Figma renders at
  effectively 1400 px (panel-only). Kit width is below spec — modules
  subagent to reconcile.**
- Padding: matches (24 px in main, 16 px in profile).
- Top navbar height of 48 px maps to the kit's `SheetHeader` (currently
  uses 24 px inner padding; consider tightening to 16 + 48 px height to
  match Figma exactly).

---

## 2. Creation Form (right-side drawer) — `5246:9822`

The wizard-style drawer that opens when a user clicks "Add <Entity>" (Pattern #18).

### Frame
- Canvas: 1800 × 1080.
- Outer auto-layout: horizontal, no padding, item-spacing 40.
- **Two top-level children:**
  1. `Button close X` — 56 × 56 pill (corner radius 74), positioned at
     `(0, 512)` — vertically centered, sits OUTSIDE the panel.
  2. `Side Sheet` panel frame — 1704 × 1080, corner radius **8 px**.

### Panel drop shadow (same as detail Side Sheet)
- `0 8 8 -4 rgba(16, 24, 40, 0.03)`
- `0 20 24 -4 rgba(16, 24, 40, 0.08)`

### Panel layout — horizontal split
```
┌──────────────┬──────────────────────────────┐
│  Sidebar     │       Main Content           │
│  (320 wide)  │       (flex)                 │
│              │                              │
│  Title       │   Content Container          │
│  (32 high)   │   (vertical, gap 20)         │
│              │                              │
│  Stepper     │   Footer (58 high, gap 10)   │
│  (12 radius) │                              │
└──────────────┴──────────────────────────────┘
```

### Sidebar (320 px fixed)
- Vertical auto-layout, padding `24 / 24 / 24 / 24`, gap `24`.
- Fill: none on the sidebar itself; inherits from panel background.
- Children:
  - `Title` (TEXT, 32 px height) — heading like "Create Contract".
  - `Create Contract Steps` — vertical stepper card with **corner radius 12**, 4 step items.

### Main Content (flex = remaining width)
- Vertical auto-layout, padding `24 / 24 / 24 / 24`, gap `28`.
- Fill: `#FFFFFF` (the main work area), with a 1 px border (rgb(0.93, 0.93, 0.93) ≈ `#EDEDED`).
- Children:
  - `Content Container` — vertical, gap 20, holds the form fields.
  - `Footer` — horizontal, gap 10, 58 px tall (the action button row).

### Panel background
- Bound to `Surface/Minimal` → **`#F9FAFB`** (Gray Modern 50, NOT white).
- This is the most-easily-missed detail: the panel chassis itself is
  light gray; the *main content card* inside it is white. The contrast
  separates the navigation rail (steps) from the work area.

### Kit mapping
- Primitive: `@fams-v5/ui/primitives/drawer.tsx` (vaul, defaults to `direction="right"`).
- Current width: `max-w-[560px]` — **below the Figma 1704 px effective
  width**. For desktop creation drawers this should be wider (~50% of
  viewport, typically 720–960 px). Modules subagent to reconcile.
- Corner radius: kit uses none (panel is right-anchored full-height,
  shadcn convention). Figma uses 8 px on the left-edge of the panel
  only. The Drawer primitive border-left + shadow already provides the
  same visual seam; the 8 px radius is purely visual polish and worth
  adding when modules wire the production EntityCreationDrawer.
- Background: kit uses `bg-card` (= white). To match Figma exactly,
  switch to `bg-surface-minimal` (= `#F9FAFB`) and put the form area
  inside a `bg-card` Card. This is a Stage-4/5 polish item, not a
  blocking drift.

---

## 3. Side Sheet width — Pattern #17 vs Figma vs kit

| Source | Width |
|---|---|
| Pattern #17 ledger (kb) | 1000 – 1100 px |
| Figma Side Sheet panel | 1400 px (no gutter, full bleed in Figma frame) |
| Figma Creation Form panel | 1704 px (96 px left gutter) |
| Kit `Sheet` primitive default | `sm:max-w-[640px]` (shadcn default) |
| Kit `EntityDetailSheet` override | `900px` |
| Kit `Drawer` primitive default | `max-w-[560px]` |

The Figma renders the panel at design-time canvas sizes that are larger
than the production target — Figma is showing what the panel looks like
*inside the viewport* without scaling. Production widths are governed by
the kit chassis. The takeaway:

- The kit's `Sheet` primitive's `sm:max-w-[640px]` is a **shadcn default**
  that the modules layer overrides. Leave the primitive alone.
- `EntityDetailSheet` (`900px`) is 100 px below the Pattern #17 floor.
  Worth raising to `1000px` in Stage 4 modules audit.
- `Drawer` `max-w-[560px]` is fine for narrow forms but should be
  configurable per chassis. Pattern #18 doesn't specify a hard width —
  Creation Drawer can be 560 – 960 px depending on field count.

---

## 4. What this closes

| Compliance row | Before | After |
|---|---|---|
| `sheet.tsx` — "no Figma Side Sheet set" | WARN | **OK** (Figma set `5246:10804` exists). |
| `drawer.tsx` — "vaul wrapper, no Figma analog" | OK (justified) | **OK** (Figma set `5246:9822` confirms the chassis). |
| Cleanup-backlog `G-02` — "Side Sheet / Drawer with variants" | P0 GAP | **Promoted** — Side Sheet + Creation Form exist as standalone components. Remaining wish: turn them into proper component sets with `Side`/`Step Count` variants. |

## 5. Cleanup-backlog candidates (new)

- **C-29** (P3) — Side Sheet and Creation Form are **standalone components**, not component sets. They should be promoted to component sets with variant axes (`Pane=Profile/Stepper`, `Footer=On/Off`, etc.) so consumers can vary them parametrically in Figma.
- **C-30** (P3) — Main Content stroke `rgb(0.93, 0.93, 0.93)` ≈ `#EDEDED` doesn't match `Border/Lightest` (= `#EAECF0`). One-pixel hand-picked stroke; should bind to the variable.
