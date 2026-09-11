# PipelineConfigSheet — contract

Create/edit a pipeline. A 3-step wizard on the shared `StepWizardSheet`. Figma: 189-19137
(Basic Info) · 199-500 (icon picker) · 189-19721 (Task Types) · 189-20023 (Stages). Conceptual
enrichments (Features + Permissions) from Tadweer 1877-32352.

## Steps
1. **Basic Info** — searchable icon picker · Pipeline Name* · Description · **Features**
   (Activities/Subtasks, SelectableCard toggles) · **Permissions** (Enable Access to All /
   Restricted Access radio). `canProceed` = name non-empty.
2. **Task Types** — SelectableCard checklist (Leads/Deals/Contracts/Reimbursements/Leaves/
   Requests). `canProceed` = ≥1 selected.
3. **Stages** — ordered, colour-coded rows: up/down + drag-reorder · colour-swatch popover
   (chart-token palette) · name · remove; "Add Stage". `canProceed` = ≥1 named stage. Final
   button "Create Pipeline".

## Shape
`PipelineConfigSheet({ open, onOpenChange, initial?, onSubmit, onSaveDraft?, taskTypes?, features?, icons?, stageColors? })`
`PipelineDraft = { icon, name, description, features: Record<string,boolean>, access, taskTypeIds, stages: {id,name,color}[] }`

- `onSubmit(draft)` — the consumer persists the WHOLE draft (wholesale) → no drop-on-save.
- Every vocabulary is an optional prop with a `DEFAULT_*` export (Law 4): `taskTypes`, `features`,
  `icons`, `stageColors`.

## Laws
- Token-only (stage colours are chart-token DATA). Reuses StepWizardSheet + SelectableCard +
  DS primitives. a11y: icon picker announces as a listbox; stage reorder has accessible up/down
  buttons in addition to pointer drag (drag is an enhancement, not the only path).
- Deferred (conceptual, from c07 / 385-12030): the "Advanced Pipeline Settings" view — a visual
  workflow-graph stage editor + per-stage process-permission matrix + field toggles — is a
  separate larger build (tracked, not in this module).
- Known follow-up (T-009): the local icon picker is the 3rd occurrence of the settings icon
  picker (entity + pipeline); extract a shared `IconPicker` over a `{key,label,icon}[]` catalogue.
