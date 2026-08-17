# PipelineConfiguration — contract

Settings › Pipeline Configuration (FAMS Settings, Figma 189-17867 · card grid; 362-1623 kebab;
385-4483 delete confirm).

## Shape
`PipelineConfiguration({ title?, subtitle?, pipelines, onCreatePipeline?, onOpenPipeline?, onPipelineAction?, searchQuery?, onSearchChange?, className? })`

- `pipelines: PipelineCard[]` — `{ id, name, icon?, description?, taskTypes?: {label,icon?}[] }`.
- `onPipelineAction(pipeline, 'edit'|'delete')` — the consumer owns mutations; `onOpenPipeline`
  fires on card-body click (opens the configure sheet).

## Behaviour
- Header: title + subtitle + search (name/description/task-type) + "Create New Pipeline".
- 2-col card grid: icon-well + name + line-clamped description + outline task-type chips.
- Per-card hover affordances (revealed on hover / focus-within): kebab (Edit · Delete) + an
  open-arrow. Delete opens an `AlertDialog` confirm (does not delete without confirmation).
- Uncontrolled search unless `searchQuery`+`onSearchChange` supplied. Empty state distinguishes
  "no pipelines" from "no search matches".

## Laws
- Token-only; config-driven + domain-agnostic. a11y: every icon-only control labelled; confirm is
  a real AlertDialog; card body is a labelled button.
