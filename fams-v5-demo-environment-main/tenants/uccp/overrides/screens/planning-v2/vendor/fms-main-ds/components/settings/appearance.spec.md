# Appearance — contract (spec / gate G1)

Settings › Appearance — **"Look & Feel"** (FAMS Settings, Figma `2-6120` main /
`2-6350` unsaved-changes dialog). The **super-admin** theming surface: re-skin the tenant
via **tokens + logo only** (coherence Law 5 — a tenant re-skins, never restructures). The
component NEVER writes bespoke colour into chrome; its output is a `TenantBrand`-shaped value
the shell applies as CSS-var overrides at the root (`AppShell.tsx` — `style={brand.theme}`).

## Shape
`Appearance({ title?, subtitle?, value, suggestedThemes, swatches?, onPrimaryOptions?, canEdit?, logoHint?, onSave?, onBack?, className })`

```ts
type OnPrimary = 'light' | 'dark';               // text/icon colour shown ON --primary
interface AppearanceValue { logo?: string; primary: string; onPrimary: OnPrimary }
interface ThemePreset { id: string; name?: string; primary: string; onPrimary?: OnPrimary }
```

- **`value`** — the committed brand (baseline). The component holds an internal *draft*; `dirty`
  = draft ≠ baseline.
- **`onSave(next: AppearanceValue)`** — commit; the component resets its baseline to `next`.
  Product maps `next` → `brand.theme = { '--primary': next.primary, '--primary-foreground':
  next.onPrimary === 'light' ? '#FFFFFF' : '#101828' }` + `brand.logo = next.logo`.
- **`onBack()`** — fired after the leave-guard resolves (Discard reverts; Save commits then leaves).
- **`canEdit`** (default `true`) — super-admin gate. Derived from the stated requirement
  ("only manageable by super admin level users"), not a frame. `false` ⇒ every control disabled +
  a read-only lock notice; Save/Discard hidden.

## Regions (frame `2-6120`, top→bottom)
1. **Header** — breadcrumb `Settings › Appearance`; `h5` "Look & Feel" + muted subtitle; right:
   **Save Changes** (primary `Button`) — enabled only when `dirty`; a ghost **Discard** appears
   beside it when `dirty` (reverts draft to baseline, in-page, no dialog).
2. **Organization Logo** — logo thumbnail (or placeholder) · **Replace** (primary link → file
   input, `.png,.jpeg,.jpg`) · **Remove** (`--status-error` link) · hint text
   (`logoHint`, default "Suggested Size: 512 × 512  ·  Accepted Format: .png, .jpeg, .jpg").
3. **Suggested themes** — "Here are some default color pallet we have selected for you." A row of
   `ThemePreset` **preview cards**: each a mini app-mockup (sidebar + header + rows + a "Proceed"
   button) painted from that preset's `primary`; radio-select; selected = `--primary` ring + check
   badge. Selecting sets `draft.primary` (+ `onPrimary` if the preset carries one).
4. **Select your own style** — a swatch grid (`swatches`, default = the DS `ColorPicker` palette) +
   a custom **"+"** tile that opens the DS `ColorPicker` (hue/sat/value + hex). Sets `draft.primary`;
   the swatch matching `draft.primary` shows the selected ring/check.
5. **On Primary** — label + tooltip ("Color that will be shown on the primary i.e Button text,
   Icons, Fields etc."). Two swatches from `onPrimaryOptions` (default **dark `#101828`** / **light
   `#FFFFFF`**); radio-select; sets `draft.onPrimary`.

## Unsaved-changes leave-guard (frame `2-6350`)
Clicking **breadcrumb "Settings ‹"** / back **while `dirty`** opens a `Dialog`: save-icon, title
**"Unsaved Changes"**, body, **Discard** (ghost — revert + `onBack`) · **Save Changes** (primary —
`onSave(draft)` + `onBack`). Not dirty ⇒ Back calls `onBack` directly.

## Laws / a11y
- **Token-only.** Chrome uses tokens; the only literal colours are **selectable colour DATA** (theme
  presets, swatch palette, on-primary black/white) — tag with `// coherence-allow`, same class as
  `ColorPicker`'s palette. No raw hex in chrome.
- **Config-driven.** Presets/swatches/on-primary options all passed in; nothing domain-specific
  hardcoded. Reuses `ColorPicker`, `Dialog`, `Button`, `Tooltip`, `RadioGroup` primitives — no fork.
- **a11y.** Theme presets = `role="radiogroup"` of `aria-checked` cards; on-primary = labelled
  `radiogroup`; Replace/Remove are real `<button>`s with text; file input has an accessible label;
  dialog is a focus-trapped `Dialog` with title/description; disabled state sets `aria-disabled`.

## Acceptance criteria (checkable)
1. Renders logo (or placeholder), Suggested-themes cards, swatch grid + custom "+", On-Primary pair,
   from props only — no hardcoded domain data.
2. Selecting a suggested theme, a swatch, or a custom colour updates the draft **and** the live
   preview (selected ring/check moves; preview cards reflect their own preset colour).
3. `dirty` toggles the Save/Discard affordances; **Discard** reverts to baseline; **Save Changes**
   fires `onSave(draft)` exactly once with the current draft and resets baseline (Save disabled again).
4. Back/breadcrumb while `dirty` opens the "Unsaved Changes" dialog; **Discard** reverts + `onBack`;
   **Save Changes** commits + `onBack`. Not dirty ⇒ Back calls `onBack` with no dialog.
5. `canEdit={false}` disables every control, hides Save/Discard, and shows the super-admin lock notice.
6. Coherence gate green (no chrome hex; DATA colours `coherence-allow`-tagged); a11y-static green; tsc/build green.
