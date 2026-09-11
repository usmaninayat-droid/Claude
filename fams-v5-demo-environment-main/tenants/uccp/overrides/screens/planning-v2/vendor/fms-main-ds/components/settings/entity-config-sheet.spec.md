# EntityConfigSheet — contract

Create/edit an entity or sub-entity. A WIDE 4-step wizard on the shared `StepWizardSheet`.
Figma: 398-7343 (details) · 398-7398 / 398-8320 (fields) · 398-8521 (features) ·
398-8604 / 398-8606 (preview fields).

## Steps
1. **Entity Details** — parent pill (only when `initial.parentName` set = creating a sub-entity),
   searchable icon picker, Entity Title* / Singular / Plural, Preview Template select, Description.
   `canProceed` = title non-empty.
2. **Entity Fields** — named field GROUPS (rename inline, remove when >1). Each field row: index ·
   name · type select (with a leading type glyph) · type-specific extras:
   - Single/Multi Select → value **chips** editor
   - Tags → tag-category select
   - Single Reference → target-entity select + role select
   - Multi Reference → target-entity select + display-field **chips**
   `+ Add New Field` (per group) · `+ Add New Reference Field` · `+ Add New Group`.
   `canProceed` = at least one named field.
3. **Features** — 2-col grid of capability toggles (Documents/Activity/Timesheet/Timeline/
   Linked Tasks); `recommended` ones default on. Always proceedable.
4. **Preview Fields** — a live card **preview** + three slot groups (Top/Body/Bottom). Each slot
   row: field picker (from the entity's own fields) → its type auto-fills (read-only) + reference
   display-field chips. This is the kanban/profile card the entity renders with. Final button
   "Create Entity".

## Shape
`EntityConfigSheet({ open, onOpenChange, initial?, onSubmit, onSaveDraft?, fieldTypes?, tagCategories?, previewTemplates?, referenceRoles?, referenceEntities?, features?, icons? })`

- `onSubmit(draft: EntityDraft)` — the consumer persists the WHOLE draft (wholesale, not
  field-by-field) so nothing is dropped on save/edit (G-ROUNDTRIP).
- Every vocabulary is an optional prop with a `DEFAULT_*` export (Law 4) — the wizard is
  domain-agnostic; a non-fleet recipe overrides `fieldTypes` / `tagCategories` /
  `previewTemplates` / `referenceRoles` / `referenceEntities` / `features` / `icons` rather than
  forking the component.
- Editing hydrates from `initial`; `blank()` seeds one "Pinned Fields" group with a Large-Text
  field and turns recommended features on.

## Laws
- Token-only. Reuses `StepWizardSheet` (Back on steps 2-4, Cancel on step 1) + DS primitives
  (FloatingLabelInput, Textarea, Switch, Popover, Input).
- Known follow-up: the local `Select` is the 2nd occurrence of the floating-label popover-select
  (also in event-config-sheet). Extracting a shared `LabeledSelect` is tracked as a refactor
  (deliberately not done inline to keep the just-shipped Event Config module untouched).
