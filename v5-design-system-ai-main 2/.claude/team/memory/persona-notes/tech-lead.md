# Tech-lead persona notes — durable calls

## Config-vs-component boundary
- DS component types are the round-trip contract. If a wizard/sheet collects a field
  (appIds, privileges, color, entityIds), the ROW type it edits MUST have a slot for it,
  and the consumer's save+`initial` must read/write all of them. Missing slot = silent
  data loss on save AND blank fields on edit. Seen twice now: CategorySheet, RoleSheet.
  → Candidate defect-class for defect-log: "drop-on-save round-trip" (count 2).
- Display data (RoleRow.access {label,icon}) should be DERIVED from ids via a single
  exported catalogue (DEFAULT_APPS/DEFAULT_AREAS), never re-derived ad-hoc in the consumer.
  Export the catalogue from the component index so there is one source of truth (law #4).

## Triage arbitration (a11y vs design parity)
- 44×44 is AAA (2.5.5), not the AA minimum (2.5.8 = 24px, with inline/spacing exceptions).
  Dense desktop DS chrome (table kebabs ~32px, matrix checkboxes) stays as designed; take
  missing-focus-ring and color-only fixes, defer target-size enlargements that break density/parity.
- Prefer on-grid consistency (size-4/16px) over an arbitrary size-[18px] when standardizing
  the same control across sibling files.

## Scope discipline (YAGNI)
- Don't add loading/error props, async-submit Promise plumbing, or a shared SHEET_WIDTH scale
  for a sim-backed, sync component "because backend later" — defer until the async wiring lands.
