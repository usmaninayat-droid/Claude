/**
 * The only spacing vocabulary a consumer is allowed to reach for.
 * Maps 1:1 to the `--spacing-{inline,field,section}` tokens in `@fams/tokens`.
 * Shared by `Stack`, `Toolbar`, and `FormGrid` — the layout primitives that
 * take a `gap` prop. There is deliberately no numeric escape hatch — a new
 * gap size is a new token (see `docs/BOUNDARIES.md` — "layout owns spacing").
 */
export type LayoutGap = 'inline' | 'field' | 'section'

export const GAP_CLASS: Record<LayoutGap, string> = {
  inline: 'gap-inline',
  field: 'gap-field',
  section: 'gap-section',
}
