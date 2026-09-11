# FAMS Design System — Asset Conventions

How we name, structure, format, and consume every visual asset (icons, logos, illustrations, fonts). Mandatory — hundreds of vehicle/event/POI/device icons + per-tenant brands are only usable if standardized. This is the "how to call assets" reference.

## Principles
1. **Semantic names, not visual** — `vehicle/tipper-truck`, not `green-truck-2` / `Frame 12`.
2. **kebab-case, lowercase, ASCII** — no spaces, capitals, or version suffixes (`-v2`, `(1)`).
3. **Size is never in the name** — size comes from props/CSS, not `icon-24`.
4. **Variant/state as suffixes** — `-mark`, `-white` (on-dark), `-outline`/`-solid`, `-rtl`.
5. **One source of truth per asset** — no duplicates across apps; consumed from the DS / a tenant asset map.
6. **Open-source / licensed only** — every font/icon set license recorded (Gilroy proprietary → default Inter unless licensed).

## Folder structure (authoring source — design-team-owned)
```
fams-design-system/assets/
  icons/
    ui/            # generic UI glyphs (prefer Lucide; only add what Lucide lacks)
    vehicle/       # vehicle types — tipper-truck.svg, compactor.svg, skip-loader.svg …
    event/         # alerts — overspeed.svg, geofence-exit.svg, fuel-theft.svg …
    poi/           # map POIs — depot.svg, landfill.svg, transfer-station.svg …
    device/        # hardware — gps-unit.svg, rfid-reader.svg, dashcam.svg …
    status/        # active.svg, idle.svg, non-reporting.svg …
  logos/<tenant>/  # fams|iwmp|ead|uccp → logo.svg, logo-mark.svg, logo-white.svg, favicon.svg
  illustrations/   # shared/ + <tenant>/ → auth-hero.svg, empty-bins.svg, error-404.svg …
  fonts/           # woff2 (Latin + Arabic subsets) + LICENSE per family
```
Built outputs live in `packages/` (`@fams/icons` collections, `@fams/tokens`), consumed by apps.

## Naming patterns
- **Icons:** `<category>/<name>[-<style>].svg` → `vehicle/tipper-truck.svg`, `event/overspeed-solid.svg`. No tenant in icon names (tenant = theming, not asset).
- **Logos (per tenant):** `logo.svg` (primary, on-light) · `logo-white.svg` (on-dark/hero) · `logo-mark.svg` (symbol only) · `favicon.svg`.
- **Illustrations:** `auth-hero.svg`, `empty-<context>.svg`, `error-<code>.svg`.
- **Fonts:** `<family>-<weight>[-<style>].woff2` → `inter-600.woff2`.

## File formats
- **Icons/logos/UI illustrations = SVG**, run through **SVGO** on import: strip editor metadata/namespaces, junk `id`s ("Frame 12"/"Group"), inline styles; normalize `viewBox` (UI icons 24×24); **monochrome icons use `fill="currentColor"`** so they recolor with tokens/tenant. Multicolor illustrations keep their palette.
- **No width/height baked in** — size via CSS/props.
- **Fonts = woff2**, subset to used glyphs + Latin/Arabic ranges; never link a CDN (inline/self-host).
- **Photos only (rare) = webp/avif**, optimized; never raster for icons.

## Consumption (ties to the chosen icon strategy)
- Raw `assets/icons/<category>/*.svg` → build → **IconifyJSON collections** per category (`fams-vehicle`, `fams-event`, …) + the owned `fams` UI set (migrated from v1's IcoMoon). Generic UI = **Lucide** (ISC).
- One component, both frameworks: `<Icon name="vehicle:tipper-truck" />` → resolves `tenant → fams → lucide`, `currentColor` = free theming.
- **Logos:** `<Logo tenant variant="primary|white|mark" />` reads the per-tenant logo. Favicon set per tenant at runtime.
- License **allow-list + CI check** over every icon referenced (Iconify sets carry per-set licenses).

## SVG hygiene checklist (the "thick mud" cleanup, automated on import)
- [ ] SVGO pass · [ ] semantic kebab filename · [ ] normalized `viewBox`, no fixed w/h · [ ] `currentColor` for monochrome · [ ] `<title>` for a11y · [ ] no editor cruft/ids · [ ] correct category folder.

## Migration (heavy — its own tracked phase, not now)
Hundreds of v1 (`public/presets/*`, IcoMoon set) + Shaheer assets → this structure: **inventory → rename (semantic kebab) → SVGO → categorize → build IconifyJSON collections → wire `<Icon>`/`<Logo>`**. Batched, agent-assisted, with a license audit. Runs after the login is verified (see roadmap). Until then, apps keep v1's `/presets/<tenant>/assets/*` paths so nothing breaks.
