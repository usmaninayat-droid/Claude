import * as React from 'react';
import { cn } from '../utils/cn';
import { Popover, PopoverTrigger, PopoverContent, Badge, Checkbox } from '../primitives';
import { SearchMd, XClose } from '../../icons';
import { ChevronDown } from 'lucide-react';

/**
 * SearchableSelect (T-058b, +T-100 multi-select) — a select-like trigger
 * that opens a popover containing the DS search field (`SearchMd` + `pl-8` +
 * "Search anything here") over a scrollable list of options. Built for
 * filter rows/toolbars whose option list is long enough to need search
 * (site/zone pickers today; any "pick one of many named things" field
 * tomorrow).
 *
 * Closest existing shells: `settings/field-select.tsx` (`LabeledSelect` — a
 * floating-label popover select, no search) and `data-display/people-picker.tsx`
 * (search + avatar rows, but person-shaped). Neither fits a plain named-option
 * + icon list with an optional pinned "All" row, so this is a new component
 * rather than an extension of either.
 *
 * Token-only; the default (single-select) trigger mirrors
 * `primitives/select.tsx`'s `SelectTrigger` classes exactly so it drops in
 * wherever a `<Select>` used to sit. Popover inherits `Z_FLOATING` from the
 * shared `PopoverContent` primitive (T-052) — no z-index of its own to
 * manage.
 *
 * T-100 (backport from ifm-workforce's product-side `MultiZoneSelect`
 * workaround, `projects.tsx:868-960`): pass `multiple` + `values`/
 * `onValuesChange` to switch the SAME popover/search-field/keyboard-nav
 * machinery into a checkbox multi-select — rows show the DS `Checkbox`
 * instead of a radio dot, and the trigger becomes a removable-chip summary
 * (DS `Badge` + an `XClose` affordance) that collapses to an "N selected"
 * summary once the selection exceeds `chipSummaryMax`. Radix `PopoverTrigger
 * asChild` requires ONE child; a `<button>` can't host nested interactive
 * remove-chip buttons (invalid HTML), so the multi-select trigger renders as
 * a `role="button"` `<div>` instead of a `<button>` — bare single-select
 * trigger is untouched, still a real `<button>`.
 */

export type SearchableSelectIcon = React.ComponentType<{ size?: number; className?: string }>;

export interface SearchableSelectOption {
  value: string;
  label: string;
  /** Icon slot rendered before the label (e.g. the Zones module's `Map01`). */
  icon?: SearchableSelectIcon;
}

interface SearchableSelectSharedProps {
  options: SearchableSelectOption[];
  /**
   * A pinned "All …" row rendered first, above the search results, and never
   * filtered out by the search query. Omit for a required single-choice
   * field with no "all" concept (e.g. a scheduling board that must always
   * be scoped to exactly one site). Single-select only — no defined
   * semantic in `multiple` mode, so it's ignored there (pass plain
   * `options` and let the consumer offer its own "select all" if needed).
   */
  allOption?: { value: string; label: string; icon?: SearchableSelectIcon };
  placeholder?: string;
  searchPlaceholder?: string;
  triggerClassName?: string;
  align?: 'start' | 'end';
  disabled?: boolean;
  'aria-label'?: string;
  /**
   * T-090: render with the label INSIDE the trigger (floating-label
   * composition — caption on top, value(s) below, chevron trailing)
   * instead of the default h-9 bare trigger. Matches FloatingLabelInput/
   * LabeledSelect's h-14/rounded-md/bg-input-background geometry — this
   * component's DEFAULT trigger already shares that family's `rounded-md
   * bg-input-background` (unlike the `field`-variant family used by
   * DateRangePicker/FieldSelect, which is `rounded-lg bg-card`), so this is
   * a natural sibling variant, not a new visual language. Use whenever a
   * SearchableSelect sits in a creation wizard/sheet next to
   * FloatingLabelInput/LabeledSelect fields; omit for toolbar/filter-row use.
   */
  field?: { label: React.ReactNode };
}

export interface SearchableSelectSingleProps extends SearchableSelectSharedProps {
  multiple?: false;
  value: string;
  onChange: (value: string) => void;
}

export interface SearchableSelectMultipleProps extends SearchableSelectSharedProps {
  multiple: true;
  values: string[];
  onValuesChange: (values: string[]) => void;
  /**
   * How many removable chips the trigger renders before collapsing to an
   * "N selected" text summary (avoids an unbounded-height trigger when a lot
   * of options are picked). Default 4.
   */
  chipSummaryMax?: number;
}

/** T-100: additive discriminated union — omitting `multiple` (the existing
 *  call-site shape everywhere today) resolves to `SearchableSelectSingleProps`,
 *  identical to the props this component accepted before this ticket. */
export type SearchableSelectProps = SearchableSelectSingleProps | SearchableSelectMultipleProps;

export function SearchableSelect(props: SearchableSelectProps) {
  const {
    options,
    allOption,
    placeholder = 'Select',
    searchPlaceholder = 'Search anything here',
    triggerClassName,
    align = 'start',
    disabled,
    'aria-label': ariaLabel,
    field,
  } = props;
  const [open, setOpen] = React.useState(false);
  const [q, setQ] = React.useState('');
  const listRef = React.useRef<HTMLDivElement>(null);

  const all = allOption ? [{ value: allOption.value, label: allOption.label, icon: allOption.icon }] : [];
  const matches = options.filter((o) => !q || o.label.toLowerCase().includes(q.toLowerCase()));
  const selected = props.multiple ? undefined : [...all, ...options].find((o) => o.value === props.value);
  const selectedOptions = props.multiple ? options.filter((o) => props.values.includes(o.value)) : [];
  const chipSummaryMax = props.multiple ? (props.chipSummaryMax ?? 4) : 4;

  const isSelected = (v: string) => (props.multiple ? props.values.includes(v) : v === props.value);

  const pick = (v: string) => {
    if (props.multiple) {
      const next = props.values.includes(v) ? props.values.filter((x) => x !== v) : [...props.values, v];
      props.onValuesChange(next);
      return; // multi-select stays open — toggling is additive, not a "done" action
    }
    props.onChange(v);
    setOpen(false);
    setQ('');
  };

  const removeChip = (v: string) => {
    if (!props.multiple) return;
    props.onValuesChange(props.values.filter((x) => x !== v));
  };

  // Roving focus over the option buttons — Radix Popover already handles
  // Escape + focus-return to the trigger, so this only needs Arrow/Home/End.
  const onKeyDown = (e: React.KeyboardEvent) => {
    const items = Array.from(listRef.current?.querySelectorAll<HTMLButtonElement>('[role="option"]') ?? []);
    if (!items.length) return;
    const active = document.activeElement as HTMLElement | null;
    const idx = items.indexOf(active as HTMLButtonElement);
    if (e.key === 'ArrowDown') { e.preventDefault(); items[idx < 0 ? 0 : (idx + 1) % items.length].focus(); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); items[idx < 0 ? items.length - 1 : (idx - 1 + items.length) % items.length].focus(); }
    else if (e.key === 'Home') { e.preventDefault(); items[0].focus(); }
    else if (e.key === 'End') { e.preventDefault(); items[items.length - 1].focus(); }
  };

  return (
    <Popover open={open} onOpenChange={(o) => { if (!disabled) { setOpen(o); if (!o) setQ(''); } }}>
      <PopoverTrigger asChild>
        {props.multiple ? (
          <ChipSummaryTrigger
            field={field}
            open={open}
            disabled={disabled}
            ariaLabel={ariaLabel}
            placeholder={placeholder}
            triggerClassName={triggerClassName}
            selectedOptions={selectedOptions}
            chipSummaryMax={chipSummaryMax}
            onToggleOpen={() => setOpen((o) => !o)}
            onRemove={removeChip}
          />
        ) : field ? (
          <button
            type="button"
            disabled={disabled}
            aria-haspopup="listbox"
            aria-expanded={open}
            aria-label={ariaLabel ?? (typeof field.label === 'string' ? field.label : placeholder)}
            className={cn(
              'flex h-14 w-full flex-col justify-center gap-0.5 rounded-md border border-border bg-input-background px-3 text-left outline-none transition-colors',
              'focus-within:border-primary focus-visible:ring-2 focus-visible:ring-ring',
              disabled ? 'cursor-not-allowed opacity-50' : 'hover:bg-muted/40',
              triggerClassName,
            )}
          >
            <span className="text-caption font-medium uppercase tracking-wide text-muted-foreground" style={{ letterSpacing: '0.04em' }}>
              {field.label}
            </span>
            <span className="flex items-center justify-between gap-2">
              <span className="flex min-w-0 items-center gap-1.5 text-body-sm font-medium text-foreground">
                {selected?.icon ? <selected.icon size={15} className="shrink-0 text-muted-foreground" /> : null}
                <span className={cn('truncate', !selected && 'text-muted-foreground/70')}>{selected?.label ?? placeholder}</span>
              </span>
              <ChevronDown size={15} className="shrink-0 text-muted-foreground" aria-hidden />
            </span>
          </button>
        ) : (
          <button
            type="button"
            disabled={disabled}
            aria-haspopup="listbox"
            aria-expanded={open}
            aria-label={ariaLabel ?? placeholder}
            className={cn(
              'flex h-9 w-full items-center justify-between gap-2 rounded-md border border-border bg-input-background px-3 py-2 text-body-sm text-foreground outline-none',
              'focus:ring-2 focus:ring-ring focus:border-primary',
              'disabled:cursor-not-allowed disabled:opacity-50',
              triggerClassName,
            )}
          >
            <span className="flex min-w-0 items-center gap-1.5">
              {selected?.icon ? <selected.icon size={15} className="shrink-0 text-muted-foreground" /> : null}
              <span className={cn('truncate', !selected && 'text-muted-foreground')}>{selected?.label ?? placeholder}</span>
            </span>
            <ChevronDown size={16} className="shrink-0 opacity-60" />
          </button>
        )}
      </PopoverTrigger>
      <PopoverContent align={align} className="w-[--radix-popover-trigger-width] min-w-[220px] overflow-hidden p-0">
        <div className="border-b border-border p-2">
          <div className="relative">
            <SearchMd size={15} className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground z-10" />
            <input
              autoFocus
              data-slot="searchable-select-search"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              onKeyDown={onKeyDown}
              placeholder={searchPlaceholder}
              className="h-9 w-full rounded-md border border-border bg-input-background pl-8 pr-2.5 text-body-sm text-foreground outline-none placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:ring-ring"
            />
          </div>
        </div>
        <div ref={listRef} onKeyDown={onKeyDown} className="max-h-72 overflow-auto p-1.5">
          {!props.multiple &&
            all.map((o) => (
              <SearchableSelectRow key={o.value} option={o} selected={isSelected(o.value)} onClick={() => pick(o.value)} />
            ))}
          {matches.length ? (
            matches.map((o) => (
              <SearchableSelectRow
                key={o.value}
                option={o}
                selected={isSelected(o.value)}
                onClick={() => pick(o.value)}
                multiple={props.multiple}
              />
            ))
          ) : (
            <div className="px-2.5 py-3 text-center text-body-sm text-muted-foreground">No options found</div>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}

function SearchableSelectRow({
  option,
  selected,
  onClick,
  multiple,
}: {
  option: SearchableSelectOption;
  selected: boolean;
  onClick: () => void;
  /** T-100: swaps the radio-dot indicator for a DS `Checkbox`. Omitted (or
   *  `false`) renders the original single-select radio look, byte-identical
   *  to pre-T-100 output. */
  multiple?: boolean;
}) {
  const Icon = option.icon;
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      onClick();
    }
  };
  return (
    <div
      role="option"
      aria-selected={selected}
      tabIndex={0}
      onClick={onClick}
      onKeyDown={handleKeyDown}
      className="flex w-full items-center gap-2.5 rounded-md px-2 py-2 text-left text-body-sm outline-none transition-colors hover:bg-muted focus-visible:bg-muted cursor-pointer"
    >
      {multiple ? (
        <Checkbox checked={selected} tabIndex={-1} aria-hidden className="pointer-events-none shrink-0" />
      ) : (
        <span
          className={cn(
            'flex size-[16px] shrink-0 items-center justify-center rounded-full border',
            selected ? 'border-primary bg-primary' : 'border-border',
          )}
        >
          {selected ? <span className="size-1.5 rounded-full bg-primary-foreground" /> : null}
        </span>
      )}
      {Icon ? <Icon size={16} className="shrink-0 text-muted-foreground" /> : null}
      <span className={cn('min-w-0 flex-1 truncate', selected ? 'font-semibold text-primary' : 'text-foreground')}>{option.label}</span>
    </div>
  );
}

/**
 * T-100 — the `multiple` trigger. Radix `PopoverTrigger asChild` clones its
 * props onto exactly one child; a native `<button>` can't host nested
 * interactive "remove chip" buttons (invalid HTML — button-in-button), so
 * this renders a `role="button"` `<div>` instead, reusing the SAME
 * rounded-md/border-border/bg-input-background trigger language as the
 * bare/`field` single-select triggers above (just `min-h` + `flex-wrap`
 * instead of a fixed height, so it can grow to hold wrapped chips).
 */
const ChipSummaryTrigger = React.forwardRef<
  HTMLDivElement,
  {
    field?: { label: React.ReactNode };
    open: boolean;
    disabled?: boolean;
    ariaLabel?: string;
    placeholder: string;
    triggerClassName?: string;
    selectedOptions: SearchableSelectOption[];
    chipSummaryMax: number;
    onToggleOpen: () => void;
    onRemove: (value: string) => void;
  }
>(function ChipSummaryTrigger(
  {
    field,
    open,
    disabled,
    ariaLabel,
    placeholder,
    triggerClassName,
    selectedOptions,
    chipSummaryMax,
    onToggleOpen,
    onRemove,
  },
  ref,
) {
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (disabled) return;
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      onToggleOpen();
    }
  };

  const summary =
    selectedOptions.length === 0 ? (
      <span className={cn('truncate text-body-sm', field ? 'text-muted-foreground/70' : 'text-muted-foreground')}>{placeholder}</span>
    ) : selectedOptions.length > chipSummaryMax ? (
      <span className="truncate text-body-sm font-medium text-foreground">{selectedOptions.length} selected</span>
    ) : (
      selectedOptions.map((o) => (
        <Badge key={o.value} variant="secondary" size="sm" className="max-w-full gap-1 pr-1">
          {o.icon ? <o.icon size={12} className="shrink-0" /> : null}
          <span className="truncate">{o.label}</span>
          <button
            type="button"
            aria-label={`Remove ${o.label}`}
            onClick={(e) => {
              e.stopPropagation();
              onRemove(o.value);
            }}
            className="shrink-0 rounded-full outline-none hover:text-primary/70 focus-visible:ring-2 focus-visible:ring-ring"
          >
            <XClose size={12} />
          </button>
        </Badge>
      ))
    );

  if (field) {
    return (
      <div
        ref={ref}
        role="button"
        tabIndex={disabled ? -1 : 0}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label={ariaLabel ?? (typeof field.label === 'string' ? field.label : placeholder)}
        onClick={() => !disabled && onToggleOpen()}
        onKeyDown={handleKeyDown}
        className={cn(
          'flex min-h-14 w-full flex-col justify-center gap-1 rounded-md border border-border bg-input-background px-3 py-2 text-left outline-none transition-colors',
          'focus-within:border-primary focus-visible:ring-2 focus-visible:ring-ring',
          disabled ? 'pointer-events-none cursor-not-allowed opacity-50' : 'cursor-pointer hover:bg-muted/40',
          triggerClassName,
        )}
      >
        <span className="text-caption font-medium uppercase tracking-wide text-muted-foreground" style={{ letterSpacing: '0.04em' }}>
          {field.label}
        </span>
        <span className="flex items-center justify-between gap-2">
          <span className="flex min-w-0 flex-1 flex-wrap items-center gap-1.5">{summary}</span>
          <ChevronDown size={15} className="shrink-0 text-muted-foreground" aria-hidden />
        </span>
      </div>
    );
  }

  return (
    <div
      ref={ref}
      role="button"
      tabIndex={disabled ? -1 : 0}
      aria-haspopup="listbox"
      aria-expanded={open}
      aria-label={ariaLabel ?? placeholder}
      onClick={() => !disabled && onToggleOpen()}
      onKeyDown={handleKeyDown}
      className={cn(
        'flex min-h-9 w-full flex-wrap items-center gap-1.5 rounded-md border border-border bg-input-background px-3 py-2 text-body-sm text-foreground outline-none',
        'focus:ring-2 focus:ring-ring focus:border-primary',
        disabled ? 'pointer-events-none cursor-not-allowed opacity-50' : 'cursor-pointer',
        triggerClassName,
      )}
    >
      {summary}
      <ChevronDown size={16} className="ml-auto shrink-0 opacity-60" aria-hidden />
    </div>
  );
});
