# Preferences — contract

Settings › Preferences (FAMS Settings, Figma 350-1586; per-module notification variant 176-3062).
A sectioned settings form — not a wizard.

## Shape
`Preferences({ title?, subtitle?, sections?, values, onChange, className })`
- `sections?: PreferenceSection[]` — each `{ id, title, description?, icon?, fields }`. Defaults to
  `DEFAULT_PREFERENCE_SECTIONS` (Region&Language / Date&Time / Measurement Units / Fuel Costs /
  Notifications&Alerts) — a recipe overrides (Law 4).
- `PreferenceField = { key, label, type: 'select'|'text'|'toggle', options?, suffix?, placeholder?, description? }`.
- `values: Record<string, string|boolean>` + `onChange(key, value)` — controlled; the consumer owns state.

## Behaviour
- Each section is a card (icon-well + title + description). Non-toggle fields render in a 2-col grid
  (`select` → `LabeledSelect`; `text` → input with optional trailing `suffix` e.g. "AED"). Toggle
  fields render as a divided list of Switch rows.
- No draft / no save button — it's a live preference form (edits apply through `onChange`).

## Laws
- Token-only; the component is config-driven + domain-agnostic (renders whatever `sections` it's
  given) — but `DEFAULT_PREFERENCE_SECTIONS` itself is fleet-flavored (map region, fuel cost/liter);
  a non-fleet product overrides via `sections` (Law 4) rather than relying on the default being
  neutral. Reuses the shared `LabeledSelect` + `Switch`. a11y: each toggle Switch is labelled;
  selects announce as listboxes.
