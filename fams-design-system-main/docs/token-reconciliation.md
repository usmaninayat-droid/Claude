# Token reconciliation — Ben vs Shaheer (decision #2)

Constitution header: see `docs/knowledge-base/decisions.md` #2, `docs/knowledge-base/00-INDEX.md`.

`@fams/tokens` (`packages/tokens/tokens/core.tokens.json` + `tokens/tenants/*.tokens.json`) is
built from Ben's DTCG token set, ruled canonical by the founder. The full audited diff between
Ben's and Shaheer's tokens — cross-checked against the read-only source repo
`FAMS-Design-System-By-Shaheer/src/tokens/` (`theme.css` primary, plus `fams-v5.theme.css`,
`tadweer.theme.css`, `ead-rms.theme.css`) — is **exactly 7 real differences**. This document is
that list, the ruling on each, and its current status after Task 3.

| # | Difference | Shaheer | Ben (this repo) | Ruling | Status after Task 3 |
|---|---|---|---|---|---|
| ① | Popover surface | `--popover: #101828` (dark navy, even in light mode) | `color.popover: #ffffff` | **Ben wins** | Unchanged — `dist/theme.css` / `dist/tokens.css` still emit `--color-popover: #ffffff` / `--fams-color-popover: #ffffff`. |
| ② | Caption size/line-height | `--text-caption: 12px` / `--line-height-caption: 14px` (T-072) | `text.caption: 10px` / `leading.caption: 12px` (outdated) | **Shaheer wins — the only value override** | **Fixed.** `tokens/core.tokens.json`: `text.caption` → `12px`, `leading.caption` → `14px`, each with a `$description` citing "Shaheer ticket T-072, decision #2". Verified in `dist/theme.css` (`--text-caption: 12px`, `--leading-caption: 14px`) and `dist/tokens.css` (prefixed equivalents). No stray `10px` caption value remains anywhere in `tokens/` source or `dist/`. |
| ③ | Tenant secondary tints | Per-tenant tint (`tadweer` `#DCFAE6`, `ead-rms` `#EAECF0` gray, `fams-v5` `#E6F2FC`) | Flattened to gray `#667085` for iwmp/ead/uccp (fams keeps its own blue tint) | **Ben wins** | Unchanged — `tokens/tenants/{iwmp,ead,uccp}.tokens.json` still declare `secondary: #667085`. |
| ④ | EAD orange accent | `ead-rms.theme.css`: `--accent: #F79009` (diverges from primary) | `tokens/tenants/ead.tokens.json`: `accent: #004B87` (= primary, navy) | **Ben wins (stays dropped)** | Unchanged — Ben's `ead.tokens.json` still uses navy for `accent`; `#f79009` only survives as the generic `color.warning` token, not an EAD-specific accent. |
| ⑤ | Dark mode wiring | `.dark { … }` class, referenced by `@custom-variant dark (&:is(.dark *))` — live/wired | `color.dark.*` values existed in `core.tokens.json` but were emitted only as inert flat `--color-dark-*` / `--fams-color-dark-*` vars that nothing in `ui-kit`/`v5-templates`/`workshop` referenced | **Wire Ben's values under real selectors (values stay Ben's)** | **Fixed.** New `fams/dark-mode` post-build action (`packages/tokens/style-dictionary.config.js`) reads `color.dark.*` and appends `:root[data-theme="dark"] { … }` + `@media (prefers-color-scheme: dark) { :root:not([data-theme="light"]) { … } }` to both `dist/theme.css` (unprefixed `--color-*`) and `dist/tokens.css` (prefixed `--fams-color-*`), overriding the **same** variable names the light values use. The old inert flat `--color-dark-*` vars are dropped (confirmed nothing in `ui-kit`/`v5-templates`/`workshop` `dist` or `src` referenced them before removal). Workshop gets a light/dark toggle (`workshop/showcase/src/App.tsx`) that sets/removes `data-theme="dark"` on `<html>`, persisted to `localStorage`. **Finding:** every one of the 26 `color.dark.*` values is byte-identical to Shaheer's `.dark` block (background, foreground, card(-foreground), popover(-foreground), primary(-foreground), secondary(-foreground), muted(-foreground), accent(-foreground), destructive(-foreground), border, input(-background), ring, sidebar + all 7 sidebar-* fields) — there is no actual value conflict in the dark set, only the wiring gap. "Ben wins" is therefore moot for ⑤: Ben's (now-wired) values and Shaheer's agree completely. |
| ⑥ | Per-tenant sidebar states | `tadweer`/`ead-rms`/`fams-v5` `.theme.css` each override `sidebar-primary`/`-accent`/`-border`/`-ring` (+ `sidebar-gradient`) per tenant | `tokens/tenants/*.tokens.json` declare no `sidebar-*` overrides at all (simpler) | **Ben wins** | Unchanged — Ben's tenant files still carry only `primary/secondary/accent(+fg)/ring` (+ `chart-1` for ead). iwmp's gradient rail is retained, but as a build-time constant (`SIDEBAR_GRADIENT` in `style-dictionary.config.js`), not per-tenant JSON, and is unaffected by this task. |
| ⑦ | Tenant set | 3 tenants only: `fams-v5`, `tadweer` (iwmp), `ead-rms`. No maroon/UCCP anywhere in Shaheer's source tree. | 4 tenants: adds `uccp` (Qatar MM), maroon `#6E112D` | **Keep** (Ben-only addition) | Unchanged — `tokens/tenants/uccp.tokens.json` retained; `dist/tenants.css` still emits `[data-tenant='uccp'] { --color-primary: #6E112D; … }`. |

## NEW-DIFFERENCE flags

**None.** The cross-check against `theme.css` + the three tenant theme files turned up no
discrepancy outside the 7 above. Everything else that differs between the two sources
(e.g. Ben's `brand.*`/`gray.*`/`error.*`/`success-scale.*`/`warning-scale.*`/`info-scale.*` 9-step
ramps vs Shaheer's `--fams-*`/`--gray-*`/`--error-*`/`--success-*`/`--warning-*` ramps; Ben's
`accent-family.*`, `spacing.*`, `breakpoint.*`, `icon-size.*`, `duration.*`, `ease.*`, `z-index.*`
groups; Shaheer's Tailwind-default aliases `--text-xs/-sm/-base/-3xl/-lg/-xl/-2xl` and
`--text-label`) is either (a) the same value under a different variable name, or (b) present in
one source and simply absent — not contradicted — in the other. Per the founder's audited-diff
ruling this task treats as authoritative, none of that rises to a "real difference" requiring a
call; it predates this task and was not touched.

## Verification

- `packages/tokens/test/build.test.js` — extended with 2 new test cases (`caption is 12px
  font / 14px line-height…` and `dark mode is wired to real selectors…`) on top of the 3
  existing ones; the existing tenants test was extended in place with iwmp-gradient assertions.
  All 5 pass (`pnpm --filter @fams/tokens test`).
- Manual grep of `dist/tokens.css` + `dist/theme.css` after build: zero occurrences of `10px`
  outside the `$description` provenance comments; zero occurrences of `--color-dark-background` /
  `--fams-color-dark-background` (old inert namespace); `:root[data-theme="dark"]` and
  `@media (prefers-color-scheme: dark)` present in both files.
