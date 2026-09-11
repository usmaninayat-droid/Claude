# @fams/tokens

Design tokens transcribed from the Figma Design System V2 (file `4FS7S3tHKzZZpdFBA0aGkt`),
compiled with Style Dictionary into Tailwind v4 outputs.

## Build

```sh
pnpm --filter @fams/tokens build
```

Produces, in `dist/`:

| File | Selector / format | Purpose |
|---|---|---|
| `theme.css` | `@theme { … }` | Tailwind v4 token namespaces (`--color-*`, `--text-*`, `--leading-*`, `--font-weight-*`, `--font-*`, `--radius-*`, `--shadow-*`, `--spacing-*`, `--breakpoint-*`, `--icon-size-*`). Imported by apps. |
| `tokens.css` | `:root { --fams-* }` | Prefixed raw variables for non-Tailwind consumers. |
| `tenants.css` | `[data-tenant='<name>'] { … }` | Per-tenant semantic colour overrides — set `data-tenant` on `<html>` to re-theme `bg-primary` etc. at runtime. |

## Source

- `tokens/core.tokens.json` — the full token set (DTCG `$type`/`$value`).
- `tokens/tenants/*.tokens.json` — one file per tenant, only the overridden semantic vars.

## Decisions

- **Font: defaults to Inter, not Gilroy.** Figma uses Gilroy for headings/body, but Gilroy is
  a proprietary (paid) typeface. `font.sans` ships as `Inter, system-ui, sans-serif`. Swap to
  Gilroy in a tenant/app layer only where a license is in place.
- **Type scale modelled as three parallel groups** rather than composite typography tokens:
  `text.*` (font-size → `--text-*`), `leading.*` (line-height → `--leading-*`), and
  `font-weight.*` (→ `--font-weight-*`). This keeps every value a valid, single Tailwind v4
  namespace and avoids fighting composite `$type: typography`.
- **Status ramps** use a `-scale` suffix (`color.success-scale.500` → `--color-success-500`)
  because DTCG can't have both a leaf (`color.success`, the semantic role) and a group
  (`color.success.500`) at the same path. The bare semantic roles stay as
  `--color-success` / `--color-warning` / `--color-info`.
- **`radius.default`** collapses to the bare `--radius` (Tailwind's DEFAULT) = 6px.
- **IWMP tenant uses Tadweer's green** (`#22C882`): IWMP is the Tadweer waste-management
  product and ships under the Tadweer brand.
- **MM tenant is a placeholder** (teal `#0E7490`) until real MM Figma tokens are captured.
- **Tadweer + IWMP** also emit `--color-sidebar-gradient`, the 5-stop diagonal app-rail
  gradient captured from Figma (`AKU5PLaqjO1QBakY9pUAH1`, node `9:7006`).
