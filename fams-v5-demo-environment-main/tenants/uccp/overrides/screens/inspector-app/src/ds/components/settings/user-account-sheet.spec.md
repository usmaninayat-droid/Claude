# UserAccountSheet + UserSuccessDialog — contract

Create/edit a user account (FAMS Launch Pad, Figma 5189-52627 / 5191-57285 / 5189-57158 /
5189-55233 / 5222-58206 / 5222-59285 / 5232-56708).

## UserAccountSheet
A right side-sheet with two tabs and a single Continue/Save footer.

- **Basic Information**: Full Name* · Phone (country-code popover + number) · Email* OR
  Username + Password (toggle via "Doesn't have an email? Use a username instead" / "Use an
  email instead"). Password shows a live rule checklist (≥8 chars · 1 upper+1 lower · 1 number+1
  special) + a Weak/Medium/Strong meter + show/hide. Assign Role(s) and Assign Organization(s)
  open a searchable **picker sub-sheet** (checkbox list); once chosen they render as an assigned
  list with an Update link.
- **Workforce Profile**: optional org-profile fields (config-driven via `workforceFields`; the
  Figma leaves this tab unspecified, so it defaults to a small generic set).
- `canSubmit` = full name + a valid identity (email valid, or username + all password rules).
- `onSubmit(draft: UserDraft)` — the consumer persists the WHOLE draft (wholesale) → no drop-on-save.
- Every vocabulary is an optional prop with a `DEFAULT_*` export (Law 4): `roles`, `organizations`,
  `countryCodes`, `workforceFields`.

## UserSuccessDialog
Post-create confirmation (a `Dialog`), three variants:
- `invite` — share the invite link (email user).
- `credentials` — username + password ("won't be shown again"), with Copy All.
- `resent` — invitation resent, share link.
Each field has copy-to-clipboard; Done closes.

## Laws
- Token-only; reuses DS primitives (Sheet, Dialog, FloatingLabelInput, Input, Checkbox, Popover,
  Button). a11y: country-code + pickers announce as listboxes; password toggle labelled; picker
  rows are `role="checkbox" aria-checked`.
- Known follow-up (T-009): the picker + country selects are bespoke; the shared `LabeledSelect`
  extraction still applies to the floating-label selects in the entity/event wizards.
