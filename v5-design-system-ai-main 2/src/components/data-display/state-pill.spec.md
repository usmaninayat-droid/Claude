# StatePill — behavioral spec

## Source of truth

- Production code: `_unpacked/truemax/src/app/components/ticket-detail.tsx` STAGE_CONFIG
- Walkthrough: `knowledge-base/product-context/24-state-transition-toolbar.md`

## Purpose

A small uppercase tracked chip that represents a workflow state. Used in:

- **Pipeline Detail body**, top-right of the title band (the current stage)
- **List view "Status" column** cells
- **Timeline events** showing state transitions
- **Kanban card type/priority badges** (via the same chip pattern)

## Styling

```css
.state-pill {
  font: 700 11px/1 'Gilroy', sans-serif;     /* bold */
  letter-spacing: 0.05em;                     /* uppercase tracking */
  text-transform: uppercase;
  padding: 6px 14px;
  border-radius: 6px;
  background: var(--stage-bg);                /* from props */
  color: var(--stage-text);                   /* default white */
}
```

`sm` variant uses `h-6 px-2.5 text-caption` for tighter contexts (table cells, timeline events).

## Color mapping (Truemax production stages)

| Stage | bg | text |
|---|---|---|
| New Requests | `#F79009` (orange-500) | `#FFFFFF` |
| Scheduled | `#F12CC6` (magenta) | `#FFFFFF` |
| In Progress | `#0072D6` (brand blue) | `#FFFFFF` |
| Under Inspection | `#AB47BC` (purple) | `#FFFFFF` |
| Closed | `#12B76A` (green-500) | `#FFFFFF` |

For lighter pill variants (used in list rows + status chips), tenants may
pass `bg` as a 50-level shade with `text` as a 700-level shade of the same
ramp (e.g. green-50 bg with green-700 text).

## Props

```ts
interface StatePillProps {
  label: string;        // Rendered UPPERCASE with tracking
  bg: string;           // Background color (from pipeline.stages[i].color)
  text?: string;        // Default '#FFFFFF'
  size?: 'sm' | 'md';   // Default 'md'
  className?: string;
}
```

## Hard constraints

1. **Always rendered UPPERCASE with tracking** — the visual identity. Don't
   pass lowercase labels expecting CSS to transform them; the CSS will
   transform regardless but the data should be normalized.
2. **Background MUST come from stage config**, never hardcoded inline.
3. **Padding is 6px×14px (md) or 4px×10px (sm)** — not the default Button
   padding.
4. **Font weight is 700 (bold)**, not 600 (semibold). Production uses bold.

## Anti-patterns

- ❌ Wrapping a `<Badge>` with custom styling instead of using StatePill
  (Badge has different padding + weight)
- ❌ Passing color names like `'red'` — must be hex/rgb
- ❌ Mixing case in the label (use ALL CAPS in data or rely on the CSS
  transform consistently)

## Cross-references

- Used by: `StateTransitionToolbar`, `PipelineDetail`, list views
- Related: `state-transition-toolbar.spec.md`, `kanban-card.spec.md` (the
  badge slots use similar styling)
