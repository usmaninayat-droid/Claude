# Component API Grammar

> Constitution: see docs/knowledge-base/ — locked decisions, naming, architecture, tech stack.

Canonical prop conventions for `@fams/ui-kit`. This is law, not prose — when a
new component's API is ambiguous, this doc decides it. Derived from `CLAUDE.md` +
`docs/BOUNDARIES.md` and cross-checked against ten representative components:
`Button`, `Input`, `Badge`, `DataTable`, `Combobox`, `Sheet`, `Dialog`, `Card`,
`Slider`, `Tabs`. Where those components disagree with the rule, that's flagged
explicitly as a legacy exception — not a second valid pattern.

---

## 1. Boolean prop naming

**Canonical: bare, non-prefixed.** `disabled`, `loading`, `hasError`, `selected`,
`active`, `checked`, `expanded`, `open`, `unread`. Never `is`-/`has`-prefix a
state or interaction boolean in new code, with one narrow exception below.

| Concept | Prop | Not |
| --- | --- | --- |
| Disabled | `disabled` (native HTML attr) | `isDisabled` |
| Async/busy | `loading` | `isLoading`, `busy` |
| Validation failure | `hasError` | `isError`, `error` (reserved for error *content*, e.g. `errorText`) |
| Selection | `selected` | `isSelected` |
| On/active | `active` | `isActive` |

**`has`- is reserved for exactly one shape:** a boolean that reports a *condition*
distinct from the component's own on/off state — `hasError` (validation failed),
not `isError`. Everything else is bare.

**Deprecated aliases policy:** when a boolean is renamed, keep the old name as an
optional prop marked `@deprecated`, resolve it via nullish-coalescing against the
new prop, and never remove it without a major version. Real examples:

```ts
// Button.tsx / Slider.tsx
/** @deprecated Alias of the native `disabled`, kept for back-compat. */
isDisabled?: boolean
// resolution: const isDisabledFinal = disabled ?? isDisabled ?? false
```

```ts
// Button.tsx
loading?: boolean
/** @deprecated Alias of `loading`, kept for back-compat. */
isLoading?: boolean
// resolution: const busy = loading ?? isLoading ?? false
```

**Known exception — do not copy:** `DataTable`'s `isSelectable`, `isSortable`
(column), `isHideable` (column), `isHiddenByDefault` (column), `isCustomizable`
predate this rule and are `is`-prefixed. They are tolerated as-is (renaming is a
breaking change not yet scheduled) but are **not** the pattern. A new composite
needing the same shape uses `selectable`, `sortable`, `hideable`, `hiddenByDefault`,
`customizable`.

**Bad**
```ts
interface FooProps {
  isOpen?: boolean
  isDisabled?: boolean   // new component — no back-compat reason to prefix
  hasSelected?: boolean  // selection is state, not a "has" condition
}
```

**Good**
```ts
interface FooProps {
  open?: boolean
  disabled?: boolean
  selected?: boolean
}
```

---

## 2. Sizes vocabulary

**Canonical: `size?: 'sm' | 'md' | 'lg'`.** Never a numeric scale, never `small`/
`medium`/`large` spelled out. `md` is the default unless the component has a good
reason otherwise (Badge defaults to `sm`).

Extra steps are permitted only when the design genuinely has one, and are always
inserted at the ends, keeping `sm|md|lg` as the spine:
- `Badge`: adds `xs` (count-pill, fully round) below `sm`.
- `Button`: adds `icon` / `iconRound` as size *values*, not a separate `iconOnly`
  boolean — an icon-only button is a size variant of the same prop, not a new axis.

**Bad**
```ts
size?: 1 | 2 | 3
size?: 'small' | 'large'
compact?: boolean   // a second, competing size axis
```

**Good**
```ts
size?: 'sm' | 'md' | 'lg'
size?: 'xs' | 'sm' | 'md'            // Badge — extra step, same spine
size?: 'sm' | 'md' | 'lg' | 'icon' | 'iconRound'  // Button
```

---

## 3. Variant patterns

Variants are always implemented via `class-variance-authority` (`cva`), never
a hand-rolled `className` ternary chain.

- Variant **names match Figma names** — `primary`/`secondary`/`tertiary`/`ghost`/
  `destructive`/`link` (Button), `default`/`secondary`/`outline`/`muted`/`success`/
  `warning`/`info`/`destructive` (Badge). Don't invent a synonym for a name Figma
  already has.
- `defaultVariants` is always set — a component never renders in an undefined
  variant state.
- The `cva()` result is exported alongside the component (`buttonVariants`,
  `badgeVariants`, `sheetVariants`, `sliderTrackVariants`) so a consumer building
  a closely-related one-off can reuse the class logic instead of re-deriving it.
- **Internal-only variants are legal but must be unreachable from the public
  type.** Badge's `category` variant is selected automatically when `colorIndex`
  is set; the public `BadgeVariant` type excludes it via `Exclude<..., 'category'>`.
  Never let an implementation-detail variant leak into the prop's public union.
- A variant axis is for **mutually exclusive visual states**. A property that
  layers on top of any variant (Badge's `dot`, `uppercase`) is its own boolean
  prop, not folded into the variant string (no `variant="success-dot-uppercase"`).

**Bad**
```tsx
className={variant === 'primary' ? 'bg-primary' : variant === 'secondary' ? 'bg-secondary' : 'bg-muted'}
```

**Good**
```ts
const fooVariants = cva('base classes', {
  variants: { variant: { primary: '...', secondary: '...' } },
  defaultVariants: { variant: 'primary' },
})
export { fooVariants }
```

---

## 4. Controlled vs. uncontrolled

Two distinct contracts exist, chosen by what kind of value the prop holds. Pick
the wrong one and the component either fights app state or forces controlled
boilerplate on every trivial use.

### 4a. Ephemeral UI state → full trio (`value` / `defaultValue` / `onXChange`)

For state that's fine to own internally most of the time, but must be
override-able by an app that syncs it (URL params, persisted view config):
sort, collapse, pagination, slider position.

```ts
// DataTable
sort?: SortState | null
onSortChange?: (sort: SortState | null) => void
defaultSort?: SortState | null

// Slider
value?: SliderValue
defaultValue?: SliderValue
onValueChange?: (value: SliderValue) => void
```

Implementation is always the same shape — internal state seeded from
`defaultValue`, controlled prop wins when defined, `onChange` fires either way:

```ts
// useDataTableSort.ts — the canonical pattern, copy this shape
const [internalSort, setInternalSort] = useState<SortState | null>(defaultSort)
const sort = sortProp !== undefined ? sortProp : internalSort
// on interaction:
if (sortProp === undefined) setInternalSort(next)
onSortChange?.(next)
```

### 4b. App-owned data → controlled-only (`value` / `onChange`, no `defaultValue`)

For a value that is meaningfully the caller's data, not transient UI state —
losing sync with app state would be a bug, not a convenience. No uncontrolled
mode is offered, because an uncontrolled mode would invite exactly that bug.

```ts
// Combobox — selection is entity data (which rows are chosen), not UI chrome
value: string | string[] | null
onChange: (value: string | string[] | null) => void
// no defaultValue

// DataTable — row selection feeds bulk-action toolbars; must not drift from app state
selectedIds?: string[]
onSelectionChange?: (ids: string[]) => void
// no defaultSelectedIds
```

**The test:** would silently losing this value on a re-render be a UX
inconvenience (4a) or a correctness bug (4b)? Bulk-selected rows and a picker's
chosen entities are 4b. Which column is sorted or whether a group is collapsed
is 4a.

**Bad** — offering `defaultValue` for app-owned data invites a caller to skip
wiring `onChange` and then wonder why selection resets on re-render.
```ts
interface ComboboxProps {
  defaultValue?: string | string[] | null   // don't add this
}
```

---

## 5. Slot / render-prop conventions

Three verb families, chosen by what varies (see `docs/BOUNDARIES.md` § L3 three
variation axes: behavior → props, content → render slot, data → app hook).

| Prefix | Use | Example |
| --- | --- | --- |
| `render<Noun>` | full content override for one item/row | `renderOption` (Combobox) |
| `<noun>Accessor` / `format<Noun>` | derive a plain value (not JSX) from data | `sortAccessor`, `formatLabel` |
| `get<Noun>` | compute a derived key/label from a row or group | `getGroupKey`, `getGroupLabel`, `getGroupSummary` |
| `render` (bare, on a column/item descriptor) | the row-level cell renderer in a descriptor object, not a top-level prop | `DataTableColumn.render` |

**No business vocabulary (rule 10).** `renderOption`, `columns`, `options` —
never `renderVehicleOption`, `vehicleColumns`. The one sanctioned exception is
the fleet-domain widget set (`domain/map/Vehicle*`); nothing else.

Every slot prop is optional with a sensible default (`renderOption` falls back
to `option.label`; `getGroupLabel` falls back to the raw key) — a slot is an
escape hatch, never a required prop.

**Bad**
```ts
renderVehiclePlate?: (v: Vehicle) => ReactNode
isVehiclePicker?: boolean
```

**Good**
```ts
renderOption?: (option: ComboOption) => ReactNode
```

---

## 6. Event-handler naming

Always `onX`, never `handleX` (that's the internal implementation's name, not
the prop's) and never a bare verb (`change`, `select`).

- **Single primary value → `onChange`.** Native-feeling controlled inputs use
  the platform convention: Radix primitives already expose `onValueChange`
  (Slider, and anything thin-wrapping a Radix primitive keeps that name rather
  than renaming it to `onChange` — don't fight the primitive you're wrapping).
- **Multiple independently-controllable concerns on one component → one
  `onXChange`/`onX` per concern**, never an overloaded single `onChange`.
  `DataTable` has seven: `onSortChange`, `onSelectionChange`, `onRowClick`,
  `onColumnOrderChange`, `onColumnConfigChange`, `onGroupToggle`,
  `onPaginationChange`. Trying to multiplex these onto one `onChange` with a
  discriminated payload is explicitly wrong — each concern gets its own prop
  and its own caller.
- Handlers for an interaction that isn't a value change use the verb, not
  `Change`: `onRowClick`, `onGroupToggle` (toggling, not setting a value),
  `onSearchChange` (the query is a value, so `Change` applies).

**Bad**
```ts
onSelect?: (ids: string[]) => void        // ambiguous verb, not onX-past-tense-of-value
handleSortChange?: (s: SortState) => void // internal name leaked into public API
onDataTableChange?: (payload: { type: string; ... }) => void  // one overloaded event
```

**Good**
```ts
onSelectionChange?: (ids: string[]) => void
onSortChange?: (sort: SortState | null) => void
onRowClick?: (row: T, index: number) => void
```

---

## 7. The `<Name>Props` interface convention

- Every component's prop type is named `<ComponentName>Props`, exported —
  `ButtonProps`, `InputProps`, `BadgeProps`, `ComboboxProps`, `SliderProps`,
  `SheetContentProps`, `DataTableProps<T>`.
- Generic components parametrize over the domain type: `DataTableProps<T>`,
  `DataTableColumn<T>`, never a hardcoded row shape.
- Always extend the native element's attributes rather than re-declaring
  `className`/`id`/ARIA props by hand: `ButtonHTMLAttributes<HTMLButtonElement>`,
  `InputHTMLAttributes<HTMLInputElement>`, `HTMLAttributes<HTMLDivElement>`. Use
  `Omit<..., 'onSelect'>` etc. when the component's own prop of the same name
  needs a different signature than the native one (`DataTableProps` omits the
  native `onSelect`).
- When the component is a cva-driven variant component, also extend
  `VariantProps<typeof xVariants>` — don't hand-duplicate the variant/size union.
- **Thin Radix wrappers that add zero props beyond `className`/children don't
  get a hand-authored interface at all** — alias the primitive's own prop type:
  `export type TabsListProps = ComponentPropsWithoutRef<typeof TabsPrimitive.List>`.
  Only write a bespoke `<Name>Props` interface once the component actually adds
  a prop (`SheetContentProps` adds `hideClose` + `side`, `DialogContent` doesn't
  bother with a named export because it adds `hideClose` inline instead — prefer
  the named-interface form for anything with more than one added prop).

**Bad**
```ts
interface ButtonProps {
  className?: string
  onClick?: () => void
  disabled?: boolean
  variant?: string   // re-typed by hand instead of VariantProps
}
```

**Good**
```ts
export interface ButtonProps
  extends ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean
  loading?: boolean
}
```

---

## 8. `className` passthrough + `data-slot`

Non-negotiable on every component that renders a DOM element:

1. **Accept `className`, merge it LAST** via `cn(...)` so the caller always
   wins over internal defaults:
   ```ts
   className={cn(buttonVariants({ variant, size }), className)}
   ```
   `cn()` = `clsx` + `tailwind-merge` (`src/lib/cn.ts`), extended with this
   repo's custom `text-h1…h6` / `text-body-*` / `text-caption` typography scale
   so a size utility and a color utility on the same element don't collide and
   drop one (`cn('text-body-sm', 'text-success')` must keep both).
2. **Every rendered root carries `data-slot="<kebab-name>"`** — a stable hook
   for styling, testing, and analytics that doesn't depend on class names or
   DOM structure: `data-slot="button"`, `data-slot="input"`,
   `data-slot="dialog-content"`.
3. **Sub-parts use compound slot names**: `<component>-<part>` —
   `combobox-trigger`, `combobox-chip`, `combobox-command`, `sheet-header`,
   `sheet-footer`, `slider-track`, `slider-thumb`. A consumer or test targeting
   "the chip inside a combobox" always has `[data-slot="combobox-chip"]`
   regardless of internal markup changes.

**Bad**
```tsx
<div className={className}>              {/* caller's className can't override defaults */}
<button data-testid="submit-button">     {/* test-only hook, not a real API surface */}
```

**Good**
```tsx
<div data-slot="card" className={cn('rounded-lg border border-border bg-card', className)}>
<button data-slot="button" className={cn(buttonVariants({ variant, size }), className)}>
```

---

## Quick reference

| Axis | Rule |
| --- | --- |
| Boolean | bare (`disabled`, `loading`, `hasError`) — no `is`/`has` prefix except `hasError`'s specific shape |
| Size | `'sm' \| 'md' \| 'lg'`, extra steps only at the ends |
| Variant | `cva`, Figma-matched names, exported `xVariants`, internal variants excluded from the public type |
| Controlled data (state) | `value` + `defaultValue` + `onXChange`, internal-state-wins-if-undefined |
| Controlled data (app-owned) | `value` + `onChange` only, no `defaultValue` |
| Slot | `render<Noun>` (content), `<x>Accessor`/`format<Noun>` (value), `get<Noun>` (derived key/label) |
| Event | always `onX`; one prop per independently-controllable concern |
| Props type | `<Name>Props`, extends native attrs + `VariantProps`, generic over row type where relevant |
| className | accepted, merged last via `cn()` |
| data-slot | present on every root and named sub-part, kebab-case, compound for sub-parts |
