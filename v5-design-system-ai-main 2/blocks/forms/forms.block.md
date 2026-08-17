# Forms block — standalone multi-step form

**Type:** `forms` · **Form:** TSX `ModuleConfig` (`forms.block.tsx` — to author).

## What it is
A standalone form surface (the exception to "a module = view + detail + create"): a single or
**multi-step** form for capture/submission, not backed by a list. Use it for intake, registration,
survey/checklist submission.

## Anatomy
- DS `SteppedSchemaForm` (or `SchemaForm`): field groups → steps, Save & Next, validation, summary/confirm.
- Floating-label inputs, selects, date pickers, file upload (DS basics/primitives).

## Adapt
Field schema + step grouping, validation rules, the submit action (toast via `SystemAlert`).

## Compose
Splice the TSX `ModuleConfig` into the app. Reference: the DS `SteppedSchemaForm` (used by pipeline
stepped-create) + facilities-ops creation flows.
