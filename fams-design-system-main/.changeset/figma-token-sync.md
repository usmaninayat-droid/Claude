---
"@fams/tokens": minor
"@fams/ui-kit": patch
"@fams/v5-templates": patch
"@fams/v5-composer": patch
"@fams/demo-kit": patch
"@fams/skeleton-kit": patch
---

Sync `radius` and `shadow` tokens with Figma Design System V2.

**Breaking (radius scale rename):** `radius` is now `none` (0px), `xs` (2px), `sm` (4px), `md` (6px), `full` (999px) — replacing the old `sm` (2px), `md` (4px), `lg`/`xl` (8px), `default` (6px) scale. `lg`/`xl`/`default` no longer exist; every consumer of `rounded-lg`/`rounded-xl`/bare `rounded` has been migrated to `rounded-md` (the closest surviving step), old `rounded-sm` → `rounded-xs`, and old `rounded-md` → `rounded-sm`. `rounded-full` usages (avatars/pills/chips) are unaffected in class name but now resolve to the token-backed 999px instead of Tailwind's built-in default. Any product code outside this repo that references `--radius-lg`, `--radius-xl`, `--radius` (bare/DEFAULT), or the old `rounded-sm`/`rounded-md` pixel values must be updated to the new scale.

**Shadows:**
- `shadow-popover` updated to match Figma's Shadows/Custom/Spreaded spec: `6px 10px 23px 0px rgba(0,0,0,0.29)` (was `6px 6px 23px 0px rgba(0,0,0,0.16)`).
- `shadow-popover-sm` corrected to Figma's Shadows/Custom/Icon Shadow spec: `1px 2px 6px 0px rgba(0,0,0,0.15)` (was incorrectly offset at `-1px` on the X axis).
- Added `shadow-map` (`6px 10px 12px 0px rgba(0,0,0,0.05)`) for map surface overlays.
- Added `shadow-glow` (`0px 0px 15px 9px #e6f2fc`) for the spreaded brand glow effect.

`sm`/`md`/`lg`/`xl`/`2xl`/`3xl` shadows are unchanged (already matched Figma).

## Gilroy Pro (brand font)

Confirmed already fully shipped on this branch: 12 self-hosted `.woff` faces under `packages/tokens/fonts/` (Light/Regular/Medium/Semibold/Bold/Extrabold × normal/italic), `packages/tokens/fonts.css` with `@font-face` declarations for all 12 (`font-display: swap`), exported via `@fams/tokens/fonts.css` + `@fams/tokens/fonts/*`, and wired into `workshop/showcase`, `workshop/storybook`, `workshop/skeleton-example`, and `packages/skeleton-kit`'s theming bootstrap. `font.sans` already resolves `Gilroy, Inter, system-ui, ...`. No changes made — verified only.

## New — typography / icon / screen scale sync (Figma Design System V2)

Additive only; nothing existing renamed or removed.

- **`font-size.*`** (15 tokens, spec names verbatim: `d1`-`d4`, `h1`-`h6`, `sb-heading1`, `sb-heading2`, `body1`, `body2`, `caption`) — a new namespace alongside the pre-existing `text.*` scale that ui-kit's `Heading`/`Text` components consume. Values agree everywhere except `caption`: Figma's is 10px, `text.caption` stays 12px (Shaheer ticket T-072 accessibility floor) — **documented conflict, not resolved**; components should keep reading `text.caption`.
- **`line-height.*`** (13 tokens: `7xl`...`xs`) — new namespace alongside the pre-existing `leading.*` scale, same non-resolution rationale.
- **`screen.*`** (6 tokens: `sm-mobile` 393, `sm-tab` 786, `md` 1024, `lg` 1440, `xl-desktop` 1920, `2xl` 2560) — Figma's "Responsive" container max-widths. **Distinct from `breakpoint.*`** (640/768/1024/1280/1536, Tailwind defaults), which is NOT replaced — every `sm:`/`md:`/`lg:`/`xl:`/`2xl:` utility across ui-kit still assumes it. Documented in the showcase Typography page.
- **`font-weight.extrabold`** (800) added — Gilroy ships an Extrabold face but no weight token referenced it yet.
- **`typography.*`** — ~40 composite text styles transcribed from the Figma style-row matrix (`Headings/H1.../Regular|Medium|Semibold|Bold`, `Body | Subtitle/xl|lg|md|sm|xs/Medium|Semibold-italic`, `Caption/Medium|Bold`), modeled as grouped tokens (`typography.<style>-<property>`, one leaf per property) aliasing `font-size.*`/`line-height.*`/`font-weight.*`/`font.sans` so re-tuning a scale flows through. Rows actually visible in the sampled style-row images are transcribed exactly; a handful of pattern-consistent gaps (H3/H4 semibold+bold, H5) are filled by the same size→line-height pairing the sampled rows established and flagged `inferred` in their `$description` — verify against Figma before treating as final. `icon-size.*` was already an exact match for the Figma IconSize spec (14/16/20/24/32/40/48) under different names (`2xs`...`2xl` vs `2xSmall`...`XLarge`) — no change needed.
- `workshop/showcase`'s Typography page gained a "Screen / container max-widths" section documenting the `screen.*` vs `breakpoint.*` distinction.

## New — per-tenant color ramps + `dmt` tenant (Figma Design System V2)

Extends the existing flat per-tenant `color.*` convention in `packages/tokens/tokens/tenants/<t>.tokens.json` (each key already `$type`/`$value`, read verbatim by `buildTenantsCss()` into `[data-tenant='<t>']` blocks in `dist/tenants.css`) — no new build infrastructure, no schema change.

- **`fams`**: added full Fams primary ramp `primary-50`…`primary-900`, `surface-secondary` (Fams/50), and `transparent-brand-20/40/60` (brand-500 `#0072D6` at alpha .2/.4/.6).
- **`iwmp` (Tadweer)**: added full Tadweer Primary ramp (`primary-50`…`primary-900`), the distinct Tadweer **Secondary** blue ramp as `brand-secondary-50`…`brand-secondary-900`, `surface-secondary`, `transparent-brand-20/40/60`, and the Tadweer **Accent/Success** remap (`success`, `success-scale-50/100/500/700/800`, matching Figma's Tadweer-mode green remap including its 800-not-900 darkest step) — expressible cleanly with the existing flat-key model, so implemented rather than left as a gap.
- **`ead`**: added full EAD ramp (`primary-50`…`primary-900`, 500 = `#004B87`), `surface-secondary` using EAD's **own** 50 step, `transparent-brand-20/40/60`.
- **`uccp`** (Figma "Qatar MME" — repo key intentionally kept as `uccp`, naming-only difference): added full ramp (`primary-50`…`primary-900`, 500 = `#6E112D`), `surface-secondary` (its own 50), `transparent-brand-20/40/60`.
- **`dmt`** (NEW tenant): new `tokens/tenants/dmt.tokens.json`, modeled with the exact same key shape as the other four files (`primary`/`primary-foreground`/`secondary`/`secondary-foreground`/`accent`/`accent-foreground`/`ring`, full `primary-50`…`primary-900` ramp with 500 = `#238DC2`, `surface-secondary`, `transparent-brand-20/40/60`). Wired into the build automatically — `buildTenantsCss()` globs every `tokens/tenants/*.tokens.json`, so `dist/tenants.css` now emits a `[data-tenant='dmt']` block with no config change needed. `packages/tokens/test/build.test.js` asserts the block exists. `workshop/showcase`'s tenant switcher (`App.tsx`) and Theming page already/now list `dmt`.

**Known Figma bugs intentionally NOT propagated into code** (see `docs/figma-color-extraction.md` §4):
1. Figma mis-binds `Surface/Secondary` for the EAD and DMT modes to `Qatar MME/Primary/50` (`#F9EBEF`, a pink). Both `ead.tokens.json` and `dmt.tokens.json` instead use their **own** ramp's 50 step (`#E6EDF3` / `#F1FAFF`), documented with a `$description` on the `dmt` token and an inline comment on `ead`.
2. Figma's Tadweer Primary ramp has `300` and `400` both set to `#43D095` (duplicate/data-entry slip). `iwmp.tokens.json` keeps `primary-300 = #43D095` and deliberately **omits** `primary-400` rather than inventing an interpolated value — the flat-key schema doesn't require every step to be present, so this is the cleanest way to avoid shipping the duplicate without fabricating a number Figma never specified. Flagged here as a follow-up: if a `primary-400` is later needed, get the corrected value from design, don't interpolate blind.

**Gaps — schema could express these, so implemented (no infra gap):** ramp steps, transparent/brand alphas, and Tadweer's per-tenant secondary ramp all fit the existing flat `color.<key>` tenant-file convention without any change to `style-dictionary.config.js`.

**Gap — NOT implemented, flagged as follow-up:** Figma's `Accent/Info` remap (EAD and DMT point `Accent/Info` at their own brand ramp instead of `Support/Blue`) was not carried over — it wasn't in this task's scope (only the `Accent/Success` Tadweer remap was requested) and no `info`/`info-scale-*` tenant override exists yet in any tenant file. Add `info`/`info-scale-*` keys to `ead.tokens.json`/`dmt.tokens.json` the same way `iwmp.tokens.json` does for `success` if this is wanted — the same flat-key mechanism supports it, this is a scope decision, not a schema limitation.

## Demo environment (`fams-v5-demo-environment`)

Checked `tenants/` (fams, iwmp manifests, deltas, seeds) for hardcoded hex values or theme hooks now stale vs. the ramp/dmt changes above. No hex colors or brand/theme references found duplicated there — tenant manifests only carry `branding.logo`/`name`/`fontFamily`/licensed `modules`/`applications`, no color values. No `dmt` tenant manifest/modules/seeds were created (explicitly out of scope — `dmt` is a design-system-only tenant for now). **No changes made to that repo.**
