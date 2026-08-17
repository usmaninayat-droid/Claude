# SearchableSelect — behavioral spec

## Source of truth

- Ticket: T-058b (ifm-workforce client walkthrough, 2026-07-12) — site/location
  dropdowns needed to become searchable.
- Ticket: T-100 (backport) — added an optional `multiple` (multi-select) mode,
  backported from ifm-workforce's product-side `MultiZoneSelect` workaround
  (`src/modules/projects.tsx:868-960`, also duplicated in `attendance.tsx`) —
  written product-side because the DS component was single-select only. This
  ticket folds that pattern into the DS component itself so no product has to
  re-fork it again.
- Closest existing shells (neither fits, hence a new component):
  `settings/field-select.tsx` (`LabeledSelect` — floating-label popover select,
  no search) and `data-display/people-picker.tsx` (search + avatar rows,
  person-shaped, not a plain named-option list).

## Purpose

A select-like trigger for a long, named-option list (sites, zones, POI
categories, anything sourced from a reference-data module) that needs
in-popover search rather than scrolling a long native `<select>`/`SelectContent`
list. Composes the DS search-field idiom (T-033a law: `SearchMd` absolutely
positioned + `pl-8` input + placeholder **"Search anything here"**) over a
scrollable RADIO-style option list, each option with an optional leading ICON
slot (e.g. the Zones module's `Map01` for a site/location option).

## Props

```ts
interface SearchableSelectOption {
  value: string;
  label: string;
  icon?: React.ComponentType<{ size?: number; className?: string }>;
}

interface SearchableSelectSharedProps {
  options: SearchableSelectOption[];
  /** Pinned "All …" row, first, never filtered by the search query. Omit for
   *  a required single-choice field with no "all" concept. Single-select
   *  only — ignored in `multiple` mode (no defined "all" semantic there). */
  allOption?: { value: string; label: string; icon?: SearchableSelectIcon };
  placeholder?: string;              // default 'Select'
  searchPlaceholder?: string;        // default 'Search anything here'
  triggerClassName?: string;
  align?: 'start' | 'end';
  disabled?: boolean;
  /** T-090: render the label INSIDE the trigger (floating-label composition)
   *  instead of the default bare h-9 trigger — see "Field (floating-label)
   *  variant" below. */
  field?: { label: React.ReactNode };
}

// Single-select (default) — UNCHANGED shape from before T-100.
interface SearchableSelectSingleProps extends SearchableSelectSharedProps {
  multiple?: false;
  value: string;
  onChange: (value: string) => void;
}

// T-100: multi-select mode.
interface SearchableSelectMultipleProps extends SearchableSelectSharedProps {
  multiple: true;
  values: string[];
  onValuesChange: (values: string[]) => void;
  /** Chips render below `chipSummaryMax` selections; beyond it the trigger
   *  collapses to an "N selected" text summary. Default 4. */
  chipSummaryMax?: number;
}

type SearchableSelectProps = SearchableSelectSingleProps | SearchableSelectMultipleProps;
```

Additive discriminated union — every existing call site omits `multiple`
entirely, which resolves to `SearchableSelectSingleProps`, byte-identical to
the props/behavior this component had before T-100. No consumer changes
required.

## Field (floating-label) variant (T-090)

Passing `field={{ label }}` swaps the default bare `h-9` trigger for a
floating-label composition matching `FloatingLabelInput`/`LabeledSelect`
(`h-14`, `rounded-md`, `bg-input-background`, caption label on top —
uppercase/tracked, `0.04em` — value + optional icon below, trailing
`ChevronDown`). This component's *default* trigger already shares that
family's `rounded-md bg-input-background` (unlike the `field`-variant family
`DateRangePicker`/`FieldSelect` use, which is `rounded-lg bg-card`), so the
floating variant is a natural sibling addition, not a new visual language —
no existing consumer is affected (opt-in prop, default trigger unchanged).

Use `field` whenever a `SearchableSelect` sits inside a creation
wizard/sheet next to `FloatingLabelInput`/`LabeledSelect` siblings (e.g.
`CreateEmployeeWizard`'s Supervisor/Hiring Manager/Trainer/Reporting
Manager/Project fields — previously each carried a plain external
`<label>` above the bare trigger, the exact "label reads oddly beside a
floated sibling" defect class this ticket fixes). Omit for toolbar/filter-row
use (Shifts/Timesheets/Pulse site selects stay on the bare default trigger —
a filter field's value lives INSIDE the field per the T-035b toolbar law,
which the bare trigger already satisfies; no floating label needed there).

## Structure

1. **Trigger** — mirrors `primitives/select.tsx`'s `SelectTrigger` classes
   verbatim (`h-9 w-full … border-border bg-input-background`, `ChevronDown`
   at the right) so it drops in wherever a `<Select>` used to sit with no
   layout shift. Shows the selected option's icon + label, or `placeholder`
   muted when nothing (allowed only when `allOption` is omitted and `value`
   doesn't match).
2. **Popover** (Radix `Popover`, inherits `Z_FLOATING` from `PopoverContent` —
   no z-index of its own) — a search row (`border-b` + the search-field
   idiom), then a `max-h-72 overflow-auto` list: the pinned `allOption` first
   (if provided, always visible regardless of query), then every `options`
   entry whose `label` matches the query (case-insensitive substring).
3. **Option row** — a radio-look circle (`border-primary bg-primary` +
   inner dot when selected, `border-border` otherwise), the option's `icon`
   (if any), then the label (bold + `text-primary` when selected).

## Multiple mode (T-100)

Pass `multiple` + `values`/`onValuesChange` to switch the SAME popover,
search field, and keyboard-nav machinery into a checkbox multi-select. Only
two things change:

1. **Option row** — the radio-look circle is replaced by a DS `Checkbox`
   (`primitives/checkbox.tsx`, `checked={selected}`, visually driven —
   `tabIndex={-1} aria-hidden`, the row `<button>` itself owns the click/
   keyboard interaction exactly like single-select). Clicking a row **toggles**
   membership in `values` and does **not** close the popover (multi-select is
   additive; the user closes it themselves — click outside or Escape, both
   already owned by Radix `Popover`).
2. **Trigger** — a removable-chip summary using the DS `Badge`
   (`variant="secondary" size="sm"`) + an `XClose` icon-button per chip, OR
   an `"N selected"` text summary once `values.length > chipSummaryMax`
   (default 4). Clicking a chip's `XClose` removes just that value
   (`e.stopPropagation()` so it doesn't also toggle the popover open/closed).
   **Element type differs from single-select**: Radix `PopoverTrigger asChild`
   clones its props onto exactly one child, and a native `<button>` cannot
   host nested interactive "remove" buttons (invalid HTML — button-in-button,
   also breaks browser event semantics). So the `multiple` trigger renders as
   a `role="button"` `<div tabIndex={0}>` (`ChipSummaryTrigger`, forwards its
   ref so Radix's Slot ref-merge still works) instead of a `<button>` — same
   `rounded-md border-border bg-input-background` visual language as the
   single-select trigger, just `min-h-*` + `flex-wrap` instead of a fixed
   height so it can grow to hold wrapped chips. The `field` (floating-label)
   variant gets the same treatment (`min-h-14` instead of `h-14`).
   `allOption` has no rendering in this mode (see props table above).

`chipSummaryMax` only affects the trigger's visual summary, never the
popover's checkbox list — every option is always toggleable regardless of
how many are already selected.

## Keyboard / a11y

- Trigger: `aria-haspopup="listbox"`, `aria-expanded`, `aria-label` (defaults
  to `placeholder`).
- Rows: `role="option"` + `aria-selected` (matches the `LabeledSelect`
  idiom already established in this codebase for single-choice popovers).
- Arrow Up/Down roves focus across `[role="option"]` buttons (wraps); Home/End
  jump to the first/last. Radix `Popover` already owns Escape + focus-return
  to the trigger, so only Arrow/Home/End are wired here.
- Selecting an option (click or Enter/Space on a focused row) calls `onChange`
  and closes the popover; the search query resets on close.

## Anti-patterns

- ❌ A bare `<Input>` with an ad-hoc placeholder ("Search sites…") instead of
  the fixed "Search anything here" copy — T-033a is a pattern law, not just a
  component law.
- ❌ Wiring `allOption` for a consumer whose data model can't actually show
  "all" results at once (e.g. a single-site scheduling board) — omit it
  instead of adding a no-op "All" row.
- ❌ Reusing `PeoplePicker` for a non-person option list just because both are
  "searchable popovers" — `PeoplePicker` is avatar/email-shaped and multi-mode;
  this component is plain option + icon list, single- **or** multi-select
  (T-100) via the `multiple` prop.
- ❌ (T-100) Forking a second component/popover for multi-select, product-side
  or DS-side — this is exactly the ifm-workforce `MultiZoneSelect` mistake
  this ticket backports away. Pass `multiple` instead.
- ❌ (T-100) Nesting the remove-chip `<button>` inside a `<button>` trigger —
  invalid HTML. The `multiple` trigger is a `role="button"` `<div>` for
  exactly this reason; don't "fix" it back to a `<button>`.

## Cross-references

- Used by: `ifm-workforce/src/modules/shifts.tsx` (Scheduling site select),
  `timesheets.tsx` (Timesheets site select), `operations-center.tsx` (Pulse
  filter-row "All Sites").
- T-100 backport source (product-side workaround this DS change replaces):
  `ifm-workforce/src/modules/projects.tsx:868-960` (`MultiZoneSelect`),
  `attendance.tsx` (same pattern duplicated).
- Z-layer: `utils/z-layers.ts` (`Z_FLOATING`, via `PopoverContent`).
