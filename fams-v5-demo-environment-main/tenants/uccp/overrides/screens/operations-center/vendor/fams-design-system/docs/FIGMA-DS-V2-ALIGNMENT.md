# Figma ↔ Kit alignment — Design System V2

> Source of truth: **Figma "Design System V2"**
> `https://www.figma.com/design/4FS7S3tHKzZZpdFBA0aGkt/Design-System-V2`
> Last reconciled: 2026-06-19.

The kit's tokens, type scale, icons, and foundation components are generated from
and kept consistent with this Figma file. This doc records what was verified and
the open items, so the DS stays aligned as the Figma evolves.

## Verified aligned (no change needed)

- **Color tokens** — sampled against `src/tokens/theme.css` + `figma-palette.css`:
  `Brand/Primary/Normal #0072d6`, `Brand/Primary/Lightest #e6f2fc`,
  `Default Text Darkest #101828 / Normal #475467 / Dark #344054`,
  `Neutral #667085`, `Surface Primary #fff / Minimal #f9fafb`, `Border/Lightest #eaecf0`.
- **Type scale** — Gilroy; `H5 24 / H6 20 / heading2 16 / Body1 14 / Body2 12`,
  line-heights `sm 18 / normal 20 / md 24 / lg 26 / xl 32` → matches `--text-*`.
- **Icons** — the Figma "Vectors" board (V5/Tadweer/EAD asset icons, empty-state,
  flags, reports, device/facility/workforce/POI/vehicle-class, event icons) matches
  `assets/icons/fams` (6 families).
- **Foundation components** — Badges (Tag/Status), Task Card, breadcrumbs, skeleton
  loader, date-picker, calendar cell, dev-note callouts all present in the kit.

## Applied fixes

- **Badge primitive** (`src/components/primitives/badge.tsx`) — radius `rounded-md` →
  `rounded-sm` (2px) + `min-h-[22px] py-1` + 14px icon slots, to match the Figma
  "Basics → Badges" spec (sharp 2px chips, 8/4px padding). Count pills (`xs`) opt into
  `rounded-full`.

## Open items (asset-dependent — deliberate follow-up)

- **Logo variant matrix.** `src/components/basics/figma-basics.tsx` `Logo` supports
  `brand {fams|tadweer} × variant {full|icon} × tone {default|white}`. The Figma also
  defines **`White_Text` tone** and a **`vertical` orientation** for both brands.
  Completing these needs the SVG/PNG exports from Figma (Basics → FAMS Logo / Tadweer
  Logo) dropped into `public/logos/`, then a `tone: 'white-text'` + `orientation:
  'horizontal'|'vertical'` prop. Until then AppShell renders the white logo via a
  `brightness-0 invert` filter on the default icon.

## Tooling note

The Figma MCP page-list returns only the first 2 top-level entries (Cover, Basics) and
`get_metadata` times out on the large section nodes, so a full per-page crawl of any
Colors / Typography / Components / Examples sections isn't possible from a single file
link. To analyze a specific frame at full fidelity, open it in Figma and paste a
node-specific link (`?node-id=…`).
