# EntityConfiguration — contract

Settings › Entity Configuration. The data-model authoring surface: FAMS ships CORE
entities and users nest SUB-ENTITIES beneath them, each with its own fields. Figma:
398-8765 (list) · 398-9313 / 398-7931 (nested tree) · 398-8939 / 398-9116 (row actions) ·
398-9291 (delete confirm).

## Shape
`EntityConfiguration({ title?, subtitle?, entities, onCreateEntity?, onEntityAction?, searchQuery?, onSearchChange?, className? })`

- `entities: EntityNode[]` — recursive tree. `EntityNode = { id, name, icon?, configType: 'system'|'custom', fieldCount, children? }`.
- Sub-entity count is **derived** from `children.length` (never a stored field).
- `onEntityAction(node, 'edit'|'add-sub'|'delete')` — the consumer owns the mutation.
- Search is uncontrolled unless `searchQuery`+`onSearchChange` are supplied; it filters the
  tree depth-first (a node survives if it or any descendant matches).

## Behaviour
- One rounded card per top-level entity; expand chevron reveals nested sub-entities,
  indented (`padding-left` grows with depth) on a muted background. Multiple levels deep.
- Columns via the shared `Cell` caption pattern: Name (icon + name) · Sub-Entities · Fields ·
  Config Type `Badge` (SYSTEM → `--primary`, CUSTOM → `--status-success`).
- Per-row hover actions (revealed on hover / focus-within): add-sub-entity (`+`) and a kebab
  (Edit entity · Add sub-entity · Delete). Delete opens an `AlertDialog` confirm (destructive
  Confirm on `--status-error`); it does not delete without confirmation.
- Empty state distinguishes "no entities" from "no search matches".

## Laws
- Token-only (no raw hex). Config-driven + domain-agnostic — no fleet vocabulary baked in;
  entity names, icons and counts all come from `entities`.
- a11y: expand button carries `aria-expanded` + label; every icon-only control has an
  `aria-label`; the confirm is a real `AlertDialog`.
